# Marketing AI Worker — setup (5 minutes, no coding tools needed)

This is a small, separate Cloudflare Worker that powers the app's
**Marketing** tab: drafting replies to online comments/reviews, replies to
emails, and new social posts. It uses **Cloudflare Workers AI** — free tier
included on every Cloudflare account, no OpenAI/Anthropic/Google key
needed.

It never posts or sends anything on its own. It only returns drafted text
for you to review, copy, and send yourself.

## 1. Create the Worker

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Workers** tab
   → **Create Worker**.
2. Name it something like `casefiles-ai`. Deploy the placeholder (you'll
   replace the code next).
3. Click **Edit code** (opens the online editor).
4. Select all the placeholder code and delete it, then paste in the full
   contents of `worker.js` from this folder.
5. Click **Deploy**.

## 2. Turn on Workers AI

1. On the Worker's page, go to **Settings** → **Bindings** → **Add**.
2. Choose **Workers AI**.
3. Set the **Variable name** to exactly `AI` (capital letters).
4. Save.

## 3. Set the shared secret

This stops random internet traffic from using your AI Worker.

1. Still in **Settings** → **Variables and Secrets** → **Add**.
2. Type: **Secret**. Name: `APP_SECRET`. Value: make up any password (e.g.
   a random phrase) and **write it down** — you'll paste this exact value
   into the app in a moment.
3. Save and re-deploy if prompted.

## 4. Copy the Worker's URL

At the top of the Worker's dashboard page you'll see its URL, something
like:

```
https://casefiles-ai.<your-subdomain>.workers.dev
```

## 5. Connect it in the app

1. Open Case File / Clean Convictions Business Manager, sign in, go to
   **Rates Config** (Settings) tab.
2. Scroll to **Marketing AI** section.
3. Paste the Worker URL from step 4 into **AI Endpoint URL**.
4. Paste the password you made up in step 3 into **Shared Secret**.
5. Save Changes.

That's it — the **Marketing** tab will now generate real drafts. If you
ever see "AI isn't set up yet" in that tab, it means one of these two
fields is empty or wrong.
