/**
 * Clean Convictions Marketing AI + Zoho Email Worker
 * ---------------------------------------------------
 * A serverless endpoint with two jobs:
 *   1. Draft marketing replies/posts using Cloudflare Workers AI (unchanged
 *      from before — never sends or posts anything, just returns text).
 *   2. Actually send and read email through Zoho Mail's real API, so the
 *      app can auto-send messages and show a live inbox.
 *
 * Deploy this as one Worker (same one you already have: "casefiles-ai" /
 * casefiles.shiann.workers.dev). No CLI needed — paste over the existing
 * code in the Cloudflare dashboard's online editor and click Deploy.
 *
 * ── Routes ──────────────────────────────────────────────────────────────
 *   POST /                → AI draft generation (unchanged)
 *   POST /email/send      → { to, subject, body, cc? } sends a real email
 *   GET  /email/inbox     → recent inbox messages (poll this to show a live inbox)
 *   GET  /email/message?id=<messageId> → full body of one message
 *
 * All routes require the same X-App-Secret header as before.
 *
 * ── One-time Zoho setup (do this once in the Zoho API Console) ─────────
 *   1. Go to https://api-console.zoho.com/ → Add Client → Self Client.
 *   2. Go to the "Generate Code" tab on that self client. For Scope, paste:
 *        ZohoMail.accounts.READ,ZohoMail.messages.ALL,ZohoMail.folders.READ
 *      Set the expiry to 10 minutes, add any description, click CREATE.
 *   3. Copy the generated authorization code immediately (it expires fast)
 *      and give it to Claude along with the Client ID and Client Secret
 *      shown on the self client's page — Claude will exchange it for a
 *      refresh token right away (the code itself is one-time-use and dies
 *      in minutes, so it can't be reused later; the refresh token is the
 *      long-lived credential that matters).
 *   4. Claude will give you back four values to paste into this Worker's
 *      Settings → Variables and Secrets (in addition to the APP_SECRET and
 *      AI binding you already set up):
 *        ZOHO_CLIENT_ID
 *        ZOHO_CLIENT_SECRET
 *        ZOHO_REFRESH_TOKEN
 *        ZOHO_API_DOMAIN      (e.g. https://mail.zoho.com — Zoho tells us
 *                               this exact value when we mint the refresh
 *                               token, based on which datacenter your Zoho
 *                               account lives in)
 *        ZOHO_FROM_ADDRESS    hello@cleanconvictions.com
 */

const SYSTEM_PROMPTS = {
  reply_email:
    "You are a friendly, professional assistant for Clean Convictions, a residential/office cleaning business in Yuma, AZ. Draft a short, warm, professional email reply to the message the user gives you. Keep it concise (under 150 words), solve or address what the customer raised, and sign off as 'Clean Convictions'. Do not invent facts, prices, or promises not present in the instructions given.",
  reply_post:
    "You are a friendly, professional assistant for Clean Convictions, a residential/office cleaning business in Yuma, AZ, replying publicly to a comment or review online (Facebook, Instagram, Google, Nextdoor, etc). Keep the reply short (2-4 sentences), warm, on-brand, and appropriate for a public audience. If it's a complaint, acknowledge it and invite them to message directly to resolve it. If it's positive, thank them genuinely without sounding generic.",
  create_post:
    "You are a friendly, professional social media assistant for Clean Convictions, a residential/office cleaning business in Yuma, AZ (24-Hour Free Re-Clean Guarantee, flat-rate pricing, serves Yuma/Foothills/Somerton). Write an engaging, on-brand social media post based on the user's brief. Keep it under 100 words, include relevant emoji sparingly (0-3), and end with a soft call to action.",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Zoho auth/account caching (module scope — lives as long as this Worker
// isolate stays warm; refetched automatically once expired or on cold start) ──
let zohoTokenCache = { accessToken: null, expiresAt: 0 };
let zohoAccountCache = { accountId: null };
let zohoInboxFolderCache = { folderId: null };

async function getZohoAccessToken(env) {
  const now = Date.now();
  if (zohoTokenCache.accessToken && zohoTokenCache.expiresAt > now + 60_000) {
    return zohoTokenCache.accessToken;
  }
  const accountsDomain = (env.ZOHO_API_DOMAIN || "https://mail.zoho.com").includes("mail.zoho")
    ? (env.ZOHO_API_DOMAIN || "https://mail.zoho.com").replace("mail.zoho", "accounts.zoho")
    : "https://accounts.zoho.com";
  const params = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN || "",
    client_id: env.ZOHO_CLIENT_ID || "",
    client_secret: env.ZOHO_CLIENT_SECRET || "",
    grant_type: "refresh_token",
  });
  const res = await fetch(`${accountsDomain}/oauth/v2/token?${params.toString()}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error("Zoho token refresh failed: " + (data.error || res.status));
  }
  zohoTokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000),
  };
  return zohoTokenCache.accessToken;
}

function zohoApiBase(env) {
  return (env.ZOHO_API_DOMAIN || "https://mail.zoho.com").replace(/\/$/, "") + "/api";
}

async function zohoFetch(env, path, opts = {}) {
  const accessToken = await getZohoAccessToken(env);
  const res = await fetch(`${zohoApiBase(env)}${path}`, {
    ...opts,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data && data.status && data.status.description) || `Zoho API request failed (${res.status})`
    );
  }
  return data;
}

async function getZohoAccountId(env) {
  if (zohoAccountCache.accountId) return zohoAccountCache.accountId;
  const data = await zohoFetch(env, "/accounts");
  const account = (data.data || [])[0];
  if (!account) throw new Error("No Zoho Mail account found for this token");
  zohoAccountCache.accountId = account.accountId;
  return account.accountId;
}

async function getZohoInboxFolderId(env, accountId) {
  if (zohoInboxFolderCache.folderId) return zohoInboxFolderCache.folderId;
  const data = await zohoFetch(env, `/accounts/${accountId}/folders`);
  const inbox = (data.data || []).find((f) => f.folderType === "Inbox") || (data.data || [])[0];
  if (!inbox) throw new Error("Could not find an Inbox folder in this Zoho Mail account");
  zohoInboxFolderCache.folderId = inbox.folderId;
  return inbox.folderId;
}

function requireSecret(request, env) {
  const providedSecret = request.headers.get("X-App-Secret") || "";
  return !!env.APP_SECRET && providedSecret === env.APP_SECRET;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (!requireSecret(request, env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── Send a real email via Zoho Mail ──────────────────────────────────
    if (url.pathname === "/email/send" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
      const { to, subject, body: content, cc } = body || {};
      if (!to || !subject || !content) {
        return json({ error: "to, subject, and body are required" }, 400);
      }
      if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_FROM_ADDRESS) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      try {
        const accountId = await getZohoAccountId(env);
        await zohoFetch(env, `/accounts/${accountId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            fromAddress: env.ZOHO_FROM_ADDRESS,
            toAddress: to,
            ccAddress: cc || undefined,
            subject,
            content,
            mailFormat: "html",
          }),
        });
        return json({ sent: true });
      } catch (err) {
        return json({ error: "Send failed: " + (err && err.message) }, 500);
      }
    }

    // ── List recent inbox messages ───────────────────────────────────────
    if (url.pathname === "/email/inbox" && request.method === "GET") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      try {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);
        const accountId = await getZohoAccountId(env);
        const folderId = await getZohoInboxFolderId(env, accountId);
        const data = await zohoFetch(
          env,
          `/accounts/${accountId}/messages/view?folderId=${folderId}&limit=${limit}&start=1&sortBy=date&sortorder=false`
        );
        const messages = (data.data || []).map((m) => ({
          id: m.messageId,
          from: m.fromAddress,
          sender: m.sender,
          subject: m.subject,
          snippet: m.summary,
          receivedTime: m.receivedTime,
          isUnread: m.status === "0",
        }));
        return json({ messages });
      } catch (err) {
        return json({ error: "Inbox fetch failed: " + (err && err.message) }, 500);
      }
    }

    // ── Full content of one message ──────────────────────────────────────
    if (url.pathname === "/email/message" && request.method === "GET") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id is required" }, 400);
      try {
        const accountId = await getZohoAccountId(env);
        const folderId = await getZohoInboxFolderId(env, accountId);
        const data = await zohoFetch(
          env,
          `/accounts/${accountId}/folders/${folderId}/messages/${id}/content`
        );
        return json({ content: (data.data && data.data.content) || "" });
      } catch (err) {
        return json({ error: "Message fetch failed: " + (err && err.message) }, 500);
      }
    }

    // ── Default: AI draft generation (unchanged behavior) ────────────────
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { mode, context, tone, platform } = body || {};

    if (!mode || !SYSTEM_PROMPTS[mode]) {
      return json({ error: "mode must be one of: reply_email, reply_post, create_post" }, 400);
    }

    if (!context || typeof context !== "string" || !context.trim()) {
      return json({ error: "context is required" }, 400);
    }

    const userParts = [];
    if (platform) userParts.push(`Platform: ${platform}`);
    if (tone) userParts.push(`Desired tone: ${tone}`);
    userParts.push(
      mode === "create_post"
        ? `Brief for the new post: ${context.trim()}`
        : `Here is what you're replying to:\n"""${context.trim()}"""`
    );

    try {
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[mode] },
          { role: "user", content: userParts.join("\n\n") },
        ],
        max_tokens: 400,
      });

      const draftText =
        (aiResponse && (aiResponse.response || aiResponse.result || "")) || "";

      return json({ draft: draftText.trim() });
    } catch (err) {
      return json({ error: "AI generation failed: " + (err && err.message) }, 500);
    }
  },
};
