/**
 * Clean Convictions Marketing AI Worker
 * ---------------------------------------
 * A tiny serverless endpoint that drafts marketing replies/posts using
 * Cloudflare Workers AI. Deploy this as its own Cloudflare Worker (separate
 * from the casefiles static site) with a Workers AI binding named "AI".
 *
 * It never posts or sends anything itself — it only returns drafted text
 * for a human to review, copy, and send. No third-party accounts are
 * connected.
 *
 * Setup (Cloudflare dashboard, no CLI needed):
 *   1. Workers & Pages -> Create -> Worker. Name it e.g. "casefiles-ai".
 *   2. Open the online editor, delete the placeholder code, paste this
 *      entire file, and click Deploy.
 *   3. Go to the Worker's Settings -> Bindings -> Add -> Workers AI.
 *      Set the binding name to exactly: AI
 *   4. Settings -> Variables and Secrets -> Add secret.
 *      Name: APP_SECRET   Value: any password you make up (write it down —
 *      you'll paste this same value into the app's Settings tab).
 *   5. Copy the Worker's URL (shown at the top of its dashboard page, looks
 *      like https://casefiles-ai.<your-subdomain>.workers.dev) and paste it
 *      into the app's Settings -> Marketing AI section, along with the
 *      APP_SECRET value from step 4.
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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    // Shared-secret check so random internet traffic can't run up AI usage.
    const providedSecret = request.headers.get("X-App-Secret") || "";
    if (!env.APP_SECRET || providedSecret !== env.APP_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { mode, context, tone, platform } = body || {};

    if (!mode || !SYSTEM_PROMPTS[mode]) {
      return new Response(
        JSON.stringify({ error: "mode must be one of: reply_email, reply_post, create_post" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!context || typeof context !== "string" || !context.trim()) {
      return new Response(JSON.stringify({ error: "context is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
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
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[mode] },
          { role: "user", content: userParts.join("\n\n") },
        ],
        max_tokens: 400,
      });

      const draftText =
        (aiResponse && (aiResponse.response || aiResponse.result || "")) || "";

      return new Response(JSON.stringify({ draft: draftText.trim() }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "AI generation failed: " + (err && err.message) }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  },
};
