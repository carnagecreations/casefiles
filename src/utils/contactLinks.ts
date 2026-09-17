// Click-to-text and click-to-email helpers.
//
// Neither Google Voice nor Zoho Mail exposes a public API for a small business
// to send messages programmatically without paid setup (Twilio-style access
// for Google Voice doesn't exist at all; Zoho Mail's send API needs an OAuth
// app + refresh token in its API console). Instead, these build links that
// open the phone's default messaging app (Google Voice, if set as default)
// or Zoho Mail's own webmail compose window, pre-filled — so sending is still
// one tap/click, just done by a person, matching the app's existing
// "draft-only, you send it" approach in the Marketing Hub.

/** sms: link that pre-fills the body. Works with Google Voice when it's the
 * device's default SMS handler (Android: Voice app settings > "Make default
 * SMS app"; iOS: Voice doesn't support being the default SMS app system-wide,
 * so this opens Messages there — Voice's own app has to be used directly for
 * iOS texting from the GV number). */
export function buildSmsLink(phone: string, body: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  return `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
}

/** Opens Zoho Mail's webmail compose window pre-filled, if the user is logged
 * into mail.zoho.com in their browser. Falls back to nothing special if not —
 * it'll just prompt Zoho sign-in. */
export function buildZohoComposeLink(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ to, subject, body });
  return `https://mail.zoho.com/zm/#mail/compose?${params.toString()}`;
}

/** Plain mailto: fallback — opens whatever mail client the device/browser has
 * set as default, which may or may not be Zoho. */
export function buildMailtoLink(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to}?${params.toString()}`;
}
