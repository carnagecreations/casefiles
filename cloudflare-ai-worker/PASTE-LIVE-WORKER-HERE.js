/*
  Paste the LIVE Worker code into this file, replacing everything below.

  Why: the deployed Worker at casefiles.shiann.workers.dev serves
  /leads/submit and /leads/other — the website's quote form posts there and
  it works. But worker.js in this repo has no /leads routes at all. The live
  version has code that was never committed.

  That means worker.js here is NOT safe to paste over the live Worker. Doing
  that would delete lead capture, and quote forms would start failing
  silently.

  How to get the live code:
    1. dash.cloudflare.com -> Workers & Pages -> casefiles-ai
    2. Edit code (the online editor)
    3. Select all, copy
    4. Paste it here, save, and tell Claude

  Once Claude has the real code it can add the referral status route
  (GET /referrals/:code) without breaking anything, and reconcile this repo
  with what's actually deployed.
*/
/**
 * Clean Convictions Marketing AI + Zoho Email + Website Lead Intake Worker
 * -------------------------------------------------------------------------
 * A serverless endpoint with three jobs:
 *   1. Draft marketing replies/posts using Cloudflare Workers AI (unchanged).
 *   2. Send and read email through Zoho Mail's real API (unchanged).
 *   3. Receive quote-form submissions directly from the public website
 *      (cleanconvictions.com/book) and create them straight into the
 *      business-manager app as a Client record with status "lead" — no
 *      retyping, they just show up in the Clients tab with their own
 *      referral code already attached — AND email you a notification via
 *      Zoho, same as you're used to.
 *
 * Deploy this as the SAME Worker you already have ("casefiles-ai" /
 * casefiles.shiann.workers.dev). No CLI needed — paste over the existing
 * code in the Cloudflare dashboard's online editor and click Deploy.
 *
 * Formspree is NOT used for this form anymore — QuoteForm.tsx posts
 * straight here instead. (An earlier version of this Worker relied on a
 * Formspree webhook, but Formspree's webhook plugin turned out to need a
 * paid plan, so this cuts it out entirely — one less moving part, and one
 * less thing to pay for.)
 *
 * ── Routes ──────────────────────────────────────────────────────────────
 *   POST /                → AI draft generation (unchanged, needs X-App-Secret)
 *   POST /email/send      → send real email via Zoho (unchanged, needs X-App-Secret)
 *   GET  /email/folders   → mailbox folders (unchanged, needs X-App-Secret)
 *   GET  /email/messages  → messages in a folder (unchanged, needs X-App-Secret)
 *   GET  /email/message   → one message's content (unchanged, needs X-App-Secret)
 *   DELETE /email/message → delete one message (unchanged, needs X-App-Secret)
 *   POST /leads/submit    → Public — the website's quote form calls this
 *        directly from the visitor's browser, so it deliberately does NOT
 *        require X-App-Secret (that secret lives only in the app, and
 *        anything sent to a public page is visible to anyone). Spam is
 *        filtered with a honeypot field instead (see below).
 *   POST /leads/other     → NEW. Same public/honeypot treatment, for every
 *        other lead source on the site: the partner-program pages (property
 *        managers, realtors, movers, vacation rentals, and the "don't see
 *        your business type" catch-all) and the free-checklist email
 *        signup. Tagged "Partner Inquiry" or "Checklist Download" in the
 *        Clients tab so they're easy to tell apart from quote-form leads.
 *        Partner inquiries also get the text alert; checklist downloads
 *        don't (email only — see setup below for why).
 *
 *   Referral tracking (NEW): if a quote-form submitter enters a referral
 *   code ("Referred by a friend?" field), /leads/submit now looks that code
 *   up against existing clients' referralCode. A match stamps the new lead
 *   with referredByCode/referredByClientId/referredByName AND creates a
 *   "pending" record in the referrals collection automatically — no manual
 *   matching needed. The app awards the referrer's $25 credit on its own,
 *   the moment this new client's FIRST job is marked completed (see
 *   App.tsx's awardReferralCreditForFirstClean) — never at booking time.
 *   An unrecognized/typo'd code still saves on the lead (visible in the
 *   Clients tab) so nothing is silently lost, it just won't auto-link to a
 *   referrer or create a trackable referral. No new secrets needed for
 *   this — same Firebase login already set up above.
 *
 *   The quote form now also has an optional email field, which gets saved
 *   on the new client record (previously always blank for website leads).
 *   This is what lets the app email a referrer their $25 confirmation the
 *   moment their credit posts — see App.tsx's awardReferralCreditForFirstClean,
 *   which calls this Worker's existing /email/send route (same Zoho setup,
 *   no new secrets). If a referrer has no email on file, that step is
 *   silently skipped — they still see the credit in the app either way.
 *
 * ── One-time setup for the lead intake route ───────────────────────────
 * (An earlier version of this needed a downloadable Firebase service-
 * account key, but this Firebase project has "key creation" blocked by an
 * org policy. This version signs the Worker in as a normal Firebase Auth
 * user instead — the exact same way your team members' accounts already
 * work — which the app's existing Firestore rules already trust. No
 * service-account key, no Google Cloud Console, no org policy needed.)
 *
 *   1. Create a "robot" login for this Worker:
 *        a. console.firebase.google.com → open the "casefilescc" project
 *           → Build → Authentication → Users tab → "Add user".
 *        b. Email: something like leads-bot@cleanconvictions.com (doesn't
 *           need to be a real inbox — it's just a login, never emailed).
 *        c. Password: generate a strong one and write it down.
 *   2. Add two new Worker secrets (same place as APP_SECRET/ZOHO_* — this
 *      Worker's Settings → Variables and Secrets → Add):
 *        FIREBASE_BOT_EMAIL     = the email from step 1b
 *        FIREBASE_BOT_PASSWORD  = the password from step 1c
 *      Save / redeploy if prompted. (Zoho is already configured on this
 *      Worker from before — nothing to add there.)
 *   3. Deploy this file (paste over the existing code, Deploy) and deploy
 *      the matching QuoteForm.tsx update on the website. That's the whole
 *      setup — no Formspree, no Zapier, no webhook URL to configure.
 *
 *   From then on, every "Get a quote" submission shows up in the app's
 *   Clients tab within a couple seconds, status "Lead", with their name,
 *   phone, requested service, rough size, availability, notes, and their
 *   own referral code already filled in — and you get an email the same
 *   as before. Open it and fill in the rest (address, exact sqft, etc.)
 *   once you've called to confirm, then flip status to "Active" same as
 *   any client.
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
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
};

// This is Firebase's public Web API key for the casefilescc project (the
// same one already baked into the app's own bundled JS in src/firebase.ts)
// — it identifies which Firebase project to talk to, it is not a secret,
// and it cannot by itself read or write anything. Actual access still
// requires signing in as a real user below.
const FIREBASE_WEB_API_KEY = "AIzaSyDM5TXFcaVruAiJp8gryJFCjKAhPoXCIHU";
const FIREBASE_PROJECT_ID = "casefilescc";

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
let zohoFoldersCache = { folders: null };

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

async function getZohoFolders(env, accountId) {
  if (zohoFoldersCache.folders) return zohoFoldersCache.folders;
  const data = await zohoFetch(env, `/accounts/${accountId}/folders`);
  const folders = (data.data || []).map((f) => ({
    folderId: f.folderId,
    folderName: f.folderName,
    folderType: f.folderType,
  }));
  if (!folders.length) throw new Error("No folders found in this Zoho Mail account");
  zohoFoldersCache.folders = folders;
  return folders;
}

function requireSecret(request, env) {
  const providedSecret = request.headers.get("X-App-Secret") || "";
  return !!env.APP_SECRET && providedSecret === env.APP_SECRET;
}

// ── Firebase Auth sign-in (module scope, same warm-isolate caching pattern
// as the Zoho token above) — signs this Worker in as a real Firebase Auth
// user (see setup step 1) so it can write to Firestore under the exact
// same "any signed-in user" rule your team already relies on. No service-
// account key, no Google Cloud IAM, nothing an org policy can block. ─────
let firebaseTokenCache = { idToken: null, expiresAt: 0 };

async function getFirebaseIdToken(env) {
  const now = Date.now();
  if (firebaseTokenCache.idToken && firebaseTokenCache.expiresAt > now + 60_000) {
    return firebaseTokenCache.idToken;
  }
  if (!env.FIREBASE_BOT_EMAIL || !env.FIREBASE_BOT_PASSWORD) {
    throw new Error("FIREBASE_BOT_EMAIL / FIREBASE_BOT_PASSWORD aren't set on this Worker yet");
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.FIREBASE_BOT_EMAIL,
        password: env.FIREBASE_BOT_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.idToken) {
    throw new Error(
      "Firebase sign-in failed: " + ((data.error && data.error.message) || res.status) +
        " — check FIREBASE_BOT_EMAIL/FIREBASE_BOT_PASSWORD match a user in Firebase Authentication"
    );
  }
  firebaseTokenCache = {
    idToken: data.idToken,
    expiresAt: now + (data.expiresIn ? Number(data.expiresIn) * 1000 : 3600 * 1000),
  };
  return firebaseTokenCache.idToken;
}

async function createFirestoreDoc(env, collectionId, documentId, fields) {
  const idToken = await getFirebaseIdToken(env);
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}` +
    `?documentId=${encodeURIComponent(documentId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data.error && data.error.message) || `Firestore write failed (${res.status})`);
  }
  return data;
}

// Looks up the client whose referralCode matches (case-insensitive — codes
// are always stored uppercase by both the app and the site, so this just
// normalizes input). Used to resolve a "referred by" code entered on the
// website into the actual referrer, so the new lead's referredByClientId
// and a pending Referral record can be created automatically instead of
// Riot having to match it up by hand.
async function findClientByReferralCode(env, code) {
  const clean = (code || "").toString().trim().toUpperCase();
  if (!clean) return null;
  const idToken = await getFirebaseIdToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "clients" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "referralCode" },
            op: "EQUAL",
            value: { stringValue: clean },
          },
        },
        limit: 1,
      },
    }),
  });
  const rows = await res.json().catch(() => []);
  if (!res.ok || !Array.isArray(rows)) return null;
  const hit = rows.find((r) => r.document);
  if (!hit) return null;
  const f = hit.document.fields || {};
  const docId = hit.document.name.split("/").pop();
  return { id: docId, name: (f.name && f.name.stringValue) || "", referralCode: clean };
}

// ── Website lead -> Client (status "lead") mapping ─────────────────────
const PROGRAM_MAP = {
  "Recurring home cleaning": "regular",
  "Deep clean": "deep",
  "Move-in / move-out": "move",
  "Office / commercial": "office",
};

const SIZE_SQFT_MAP = {
  "Under 1,500 sq ft": 1200,
  "1,500 – 2,500 sq ft": 2000,
  "Over 2,500 sq ft": 3000,
  "Commercial space": 2500,
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function createLeadClient(env, form) {
  const name = (form.name || "").toString().trim();
  const phone = (form.phone || "").toString().trim();
  if (!name || !phone) throw new Error("name and phone are required");

  const service = (form.service || "").toString();
  const size = (form.size || "").toString();
  const email = (form.email || "").toString().trim();

  // If they said they were referred by someone, try to resolve that code to
  // an actual referrer client. Best-effort — a typo'd or unrecognized code
  // still gets saved on the lead (so it's visible in the app either way),
  // it just won't auto-link to a referrer or create a trackable referral.
  const referredByCodeRaw = (form.referredByCode || "").toString().trim();
  let referrer = null;
  if (referredByCodeRaw) {
    try {
      referrer = await findClientByReferralCode(env, referredByCodeRaw);
    } catch {
      /* best-effort — proceed without a matched referrer */
    }
  }

  const notesParts = [];
  const availability = [form.availDays, form.availTime].filter(Boolean).join(" / ");
  if (availability) notesParts.push(`Availability: ${availability}`);
  if (form.details) notesParts.push(String(form.details));
  if (form.partnerCode) notesParts.push(`Partner ref: ${form.partnerCode}`);
  if (referredByCodeRaw) {
    notesParts.push(
      referrer
        ? `Referred by ${referrer.name} (code ${referredByCodeRaw.toUpperCase()})`
        : `Referred by code ${referredByCodeRaw.toUpperCase()} (not matched to a client — check by hand)`
    );
  }
  notesParts.push("Submitted via cleanconvictions.com quote form");

  const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const referralCode = (form.referralCode || "").toString();

  const fields = {
    name: { stringValue: name },
    phone: { stringValue: phone },
    email: { stringValue: email },
    address: { stringValue: "" },
    city: { stringValue: "" },
    preferredFrequency: { stringValue: "one-time" },
    defaultProgram: { stringValue: PROGRAM_MAP[service] || "regular" },
    sqft: { integerValue: String(SIZE_SQFT_MAP[size] || 1500) },
    bedrooms: { integerValue: "3" },
    bathrooms: { integerValue: "2" },
    condition: { stringValue: "normal" },
    isMilitary: { booleanValue: false },
    defaultAddOns: { arrayValue: { values: [] } },
    agreedRate: { integerValue: "0" },
    status: { stringValue: "lead" },
    createdAt: { stringValue: now },
    specialInstructions: { stringValue: notesParts.join(" — ") },
    referralCode: { stringValue: referralCode },
    leadSource: {
      stringValue: form.partnerCode
        ? `Website quote form (partner: ${form.partnerCode})`
        : "Website quote form",
    },
    followUpDate: { stringValue: todayStr() },
  };
  if (referredByCodeRaw) {
    fields.referredByCode = { stringValue: referredByCodeRaw.toUpperCase() };
    if (referrer) {
      fields.referredByClientId = { stringValue: referrer.id };
      fields.referredByName = { stringValue: referrer.name };
    }
  }

  await createFirestoreDoc(env, "clients", id, fields);

  // A matched referrer means we can create a trackable, pending referral
  // record right now — it'll show up in the app's Referrals tab immediately
  // (status "pending"), and the $25 credit is awarded automatically once
  // this new lead's first clean is marked complete.
  if (referrer) {
    const refId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createFirestoreDoc(env, "referrals", refId, {
      referrerClientId: { stringValue: referrer.id },
      referrerName: { stringValue: referrer.name },
      referrerCode: { stringValue: referredByCodeRaw.toUpperCase() },
      refereeName: { stringValue: name },
      refereePhone: { stringValue: phone },
      refereeClientId: { stringValue: id },
      status: { stringValue: "pending" },
      dateReferred: { stringValue: todayStr() },
      refereeDiscount: { integerValue: "25" },
      rewardAmount: { integerValue: "25" },
      notes: { stringValue: "Submitted via cleanconvictions.com quote form. Credit awards automatically once their first clean is complete." },
    }).catch(() => {
      /* best-effort — the lead itself is already saved either way */
    });
  }

  return { id, name, phone, service, size, availability, details: form.details, referralCode, referredByCode: referredByCodeRaw };
}

// ── Every other lead source on the site -> Client (status "lead") ───────
// Covers the partner-program pages (property managers, realtors, movers,
// vacation rentals, plus the "don't see your business type" catch-all) and
// the free-checklist email signup. One shared shape instead of a route per
// source: { source: "partner" | "checklist", sourceLabel, businessName,
// contactName, phone, email, message }.
async function createOtherLeadClient(env, form) {
  const source = (form.source || "").toString();
  const sourceLabel = (form.sourceLabel || "").toString().trim();
  const businessName = (form.businessName || "").toString().trim();
  const contactName = (form.contactName || "").toString().trim();
  const phone = (form.phone || "").toString().trim();
  const email = (form.email || "").toString().trim();
  const message = (form.message || "").toString().trim();

  const name = businessName || contactName || email || "Website visitor";
  if (!phone && !email) throw new Error("phone or email is required");

  const notesParts = [];
  if (businessName && contactName) notesParts.push(`Contact: ${contactName}`);
  if (message) notesParts.push(message);
  notesParts.push(
    source === "partner"
      ? `Submitted via cleanconvictions.com partner program (${sourceLabel || "general inquiry"})`
      : "Submitted via cleanconvictions.com free checklist download"
  );

  const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const fields = {
    name: { stringValue: name },
    phone: { stringValue: phone },
    email: { stringValue: email },
    address: { stringValue: "" },
    city: { stringValue: "" },
    preferredFrequency: { stringValue: "one-time" },
    defaultProgram: { stringValue: "regular" },
    sqft: { integerValue: "0" },
    bedrooms: { integerValue: "0" },
    bathrooms: { integerValue: "0" },
    condition: { stringValue: "normal" },
    isMilitary: { booleanValue: false },
    defaultAddOns: { arrayValue: { values: [] } },
    agreedRate: { integerValue: "0" },
    status: { stringValue: "lead" },
    createdAt: { stringValue: now },
    specialInstructions: { stringValue: notesParts.join(" — ") },
    leadSource: {
      stringValue:
        source === "partner"
          ? `Partner inquiry — ${sourceLabel || "General"}`
          : "Free checklist download",
    },
    tags: {
      arrayValue: {
        values:
          source === "partner"
            ? [{ stringValue: "Partner Inquiry" }]
            : [{ stringValue: "Checklist Download" }, { stringValue: "Newsletter" }],
      },
    },
  };
  // Partner inquiries want a callback soon; checklist signups don't — leave
  // followUpDate unset for those so they don't clutter a "needs follow-up" view.
  if (source === "partner") fields.followUpDate = { stringValue: todayStr() };

  await createFirestoreDoc(env, "clients", id, fields);
  return { id, source, sourceLabel, businessName, contactName, name, phone, email, message };
}

// Best-effort — a lead is already saved by the time this runs, so a Zoho
// hiccup here never loses the lead itself, it just means you find out
// from the Clients tab instead of your inbox this one time.
async function sendLeadNotificationEmail(env, lead) {
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_FROM_ADDRESS) return;
  const lines = [
    `<p><strong>${escapeHtml(lead.name)}</strong> just requested a quote on cleanconvictions.com.</p>`,
    "<ul>",
    `<li>Phone: ${escapeHtml(lead.phone)}</li>`,
    `<li>Service: ${escapeHtml(lead.service || "—")}</li>`,
    `<li>Size: ${escapeHtml(lead.size || "—")}</li>`,
    `<li>Availability: ${escapeHtml(lead.availability || "—")}</li>`,
    lead.details ? `<li>Notes: ${escapeHtml(lead.details)}</li>` : "",
    lead.referralCode ? `<li>Their referral code: ${escapeHtml(lead.referralCode)}</li>` : "",
    lead.referredByCode ? `<li>Referred by code: ${escapeHtml(lead.referredByCode)} (see Referrals tab)</li>` : "",
    "</ul>",
    "<p>Already added to the app's Clients tab as a Lead.</p>",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const accountId = await getZohoAccountId(env);
    await zohoFetch(env, `/accounts/${accountId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        fromAddress: env.ZOHO_FROM_ADDRESS,
        toAddress: env.ZOHO_FROM_ADDRESS,
        subject: `New quote request — ${lead.name}`,
        content: lines,
        mailFormat: "html",
      }),
    });
  } catch {
    /* non-fatal, see comment above */
  }
}

// Best-effort text alert — sent as a plain-text email to a carrier's
// email-to-SMS gateway address (e.g. 9285551234@tmomail.net for T-Mobile /
// T-Mobile-network MVNOs like Helium Mobile). No new account or API needed
// — it rides on the same Zoho send you already have configured. Set the
// gateway address in the SMS_ALERT_ADDRESS secret; leave it unset to skip
// texting (email notification above still goes out either way). Kept very
// short — most gateways truncate long messages or mangle formatting.
async function sendLeadTextAlert(env, lead) {
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_FROM_ADDRESS || !env.SMS_ALERT_ADDRESS) return;
  const body = `New lead: ${lead.name}, ${lead.phone} - ${lead.service || "quote request"}. Check Clients tab.`;
  try {
    const accountId = await getZohoAccountId(env);
    await zohoFetch(env, `/accounts/${accountId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        fromAddress: env.ZOHO_FROM_ADDRESS,
        toAddress: env.SMS_ALERT_ADDRESS,
        subject: "", // most carrier gateways drop the subject anyway
        content: body,
        mailFormat: "plaintext",
      }),
    });
  } catch {
    /* non-fatal, see comment on sendLeadNotificationEmail above */
  }
}

// Same idea as sendLeadNotificationEmail/sendLeadTextAlert above, but for
// partner-program and checklist-download leads (createOtherLeadClient) —
// kept separate so the subject/wording is honest about what kind of lead
// it is instead of calling everything a "quote request".
async function sendOtherLeadNotificationEmail(env, lead) {
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_FROM_ADDRESS) return;
  const isPartner = lead.source === "partner";
  const lines = [
    `<p><strong>${escapeHtml(lead.name)}</strong> just ${
      isPartner ? `reached out about the ${escapeHtml(lead.sourceLabel || "partner")} program` : "downloaded the free cleaning checklist"
    } on cleanconvictions.com.</p>`,
    "<ul>",
    lead.businessName && lead.contactName ? `<li>Contact: ${escapeHtml(lead.contactName)}</li>` : "",
    lead.phone ? `<li>Phone: ${escapeHtml(lead.phone)}</li>` : "",
    lead.email ? `<li>Email: ${escapeHtml(lead.email)}</li>` : "",
    lead.message ? `<li>Message: ${escapeHtml(lead.message)}</li>` : "",
    "</ul>",
    `<p>Already added to the app's Clients tab as a Lead${isPartner ? " (tagged Partner Inquiry)" : " (tagged Checklist Download)"}.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const accountId = await getZohoAccountId(env);
    await zohoFetch(env, `/accounts/${accountId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        fromAddress: env.ZOHO_FROM_ADDRESS,
        toAddress: env.ZOHO_FROM_ADDRESS,
        subject: isPartner
          ? `New partner inquiry — ${lead.name}`
          : `New checklist download — ${lead.name}`,
        content: lines,
        mailFormat: "html",
      }),
    });
  } catch {
    /* non-fatal */
  }
}

async function sendOtherLeadTextAlert(env, lead) {
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_FROM_ADDRESS || !env.SMS_ALERT_ADDRESS) return;
  // Only text for partner inquiries — those want a timely callback. A
  // checklist download doesn't need to interrupt your phone.
  if (lead.source !== "partner") return;
  const body = `New partner inquiry: ${lead.name} (${lead.sourceLabel || "General"}), ${lead.phone || lead.email}. Check Clients tab.`;
  try {
    const accountId = await getZohoAccountId(env);
    await zohoFetch(env, `/accounts/${accountId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        fromAddress: env.ZOHO_FROM_ADDRESS,
        toAddress: env.SMS_ALERT_ADDRESS,
        subject: "",
        content: body,
        mailFormat: "plaintext",
      }),
    });
  } catch {
    /* non-fatal */
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // ── Website lead intake — public on purpose (the visitor's own browser
    // calls this directly), so it's NOT behind the X-App-Secret gate below.
    // Spam protection is a honeypot field instead: real visitors never
    // fill in `_gotcha` (it's hidden from them), bots that blindly fill
    // every field do — matches the same trick Formspree was doing before.
    if (url.pathname === "/leads/submit" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
      if (body && body._gotcha) {
        // Silently pretend success so a bot doesn't learn its trap was hit.
        return json({ created: true });
      }
      try {
        const lead = await createLeadClient(env, body || {});
        await sendLeadNotificationEmail(env, lead);
        await sendLeadTextAlert(env, lead);
        return json({ created: true, id: lead.id });
      } catch (err) {
        return json({ error: "Lead intake failed: " + (err && err.message) }, 500);
      }
    }

    // ── Every other lead source (partner program pages + the free-checklist
    // signup) — same public/honeypot treatment as /leads/submit above.
    if (url.pathname === "/leads/other" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
      if (body && body._gotcha) {
        return json({ created: true });
      }
      try {
        const lead = await createOtherLeadClient(env, body || {});
        await sendOtherLeadNotificationEmail(env, lead);
        await sendOtherLeadTextAlert(env, lead);
        return json({ created: true, id: lead.id });
      } catch (err) {
        return json({ error: "Lead intake failed: " + (err && err.message) }, 500);
      }
    }

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

    // ── List every folder in the mailbox (Inbox, Drafts, Sent, Trash, ...) ─
    if (url.pathname === "/email/folders" && request.method === "GET") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      try {
        const accountId = await getZohoAccountId(env);
        const folders = await getZohoFolders(env, accountId);
        return json({ folders });
      } catch (err) {
        return json({ error: "Folder list failed: " + (err && err.message) }, 500);
      }
    }

    // ── List messages in a given folder ──────────────────────────────────
    if (url.pathname === "/email/messages" && request.method === "GET") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      const folderId = url.searchParams.get("folderId");
      if (!folderId) return json({ error: "folderId is required" }, 400);
      try {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);
        const accountId = await getZohoAccountId(env);
        const data = await zohoFetch(
          env,
          `/accounts/${accountId}/messages/view?folderId=${folderId}&limit=${limit}&start=1&sortBy=date&sortorder=false`
        );
        const messages = (data.data || []).map((m) => ({
          id: m.messageId,
          from: m.fromAddress,
          to: m.toAddress,
          sender: m.sender,
          subject: m.subject,
          snippet: m.summary,
          receivedTime: m.receivedTime,
          isUnread: m.status === "0",
        }));
        return json({ messages });
      } catch (err) {
        return json({ error: "Message list failed: " + (err && err.message) }, 500);
      }
    }

    // ── Full content of one message ──────────────────────────────────────
    if (url.pathname === "/email/message" && request.method === "GET") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      const id = url.searchParams.get("id");
      const folderId = url.searchParams.get("folderId");
      if (!id || !folderId) return json({ error: "id and folderId are required" }, 400);
      try {
        const accountId = await getZohoAccountId(env);
        const data = await zohoFetch(
          env,
          `/accounts/${accountId}/folders/${folderId}/messages/${id}/content`
        );
        return json({ content: (data.data && data.data.content) || "" });
      } catch (err) {
        return json({ error: "Message fetch failed: " + (err && err.message) }, 500);
      }
    }

    // ── Delete one message (moves to Trash unless ?permanent=true) ───────
    if (url.pathname === "/email/message" && request.method === "DELETE") {
      if (!env.ZOHO_REFRESH_TOKEN) {
        return json({ error: "Zoho email isn't configured yet on this Worker" }, 400);
      }
      const id = url.searchParams.get("id");
      const folderId = url.searchParams.get("folderId");
      if (!id || !folderId) return json({ error: "id and folderId are required" }, 400);
      const permanent = url.searchParams.get("permanent") === "true";
      try {
        const accountId = await getZohoAccountId(env);
        await zohoFetch(
          env,
          `/accounts/${accountId}/folders/${folderId}/messages/${id}?expunge=${permanent ? "true" : "false"}`,
          { method: "DELETE" }
        );
        return json({ deleted: true });
      } catch (err) {
        return json({ error: "Delete failed: " + (err && err.message) }, 500);
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