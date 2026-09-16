// Minimal service worker, present only so the browser offers "Install".
// It intentionally does NOT cache or intercept anything — a broader
// fetch handler here previously broke Firestore's realtime sync
// (its long-polling Listen/channel requests got swallowed by the SW).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", () => {
  // No-op: let every request — same-origin or not — go straight to the
  // network/browser cache, untouched.
});
