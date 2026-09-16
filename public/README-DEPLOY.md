# Deploying this build

This folder (`clean-convictions-business-manager`) is the real version of
your business tool — same live Firebase backend (real team logins, live
multi-device sync) as the old Case File site, with the fuller feature set:
pricing estimator (now with solo + 2-person crew time estimates), route &
schedule, on-site checklists, client CRM, invoices, and the referral
program.

## Deploy it (replaces the old site)

1. Go to the Cloudflare dashboard → **Workers & Pages** → your existing
   `casefile` project (the one live at `casefile.shiann.workers.dev`).
2. Click **Create deployment**.
3. Drag in every file from *this* folder (`index.html`, `manifest.json`,
   `sw.js`, the two icon PNGs, and the `assets` folder).
4. Deploy. The same URL now serves this new app.

No Firebase console changes are needed — same project (`casefilescc`), same
team logins, same security rules.
