// Shared primitives for the two share entry points — share-app.js (hands off the
// app's own URL) and share-ui.js (hands off an order/shortlist token). The two
// give different feedback (a toast vs inline status + a reveal-to-copy field),
// but the underlying "did the OS sheet take it / did the clipboard work" logic
// is identical and easy to get subtly wrong (AbortError is *not* a failure), so
// it lives here once.

// Attempt the OS share sheet. Returns one of:
//   "shared"      — handed off successfully, nothing more to do
//   "dismissed"   — the user closed the sheet themselves (AbortError); stay quiet
//   "unavailable" — no navigator.share, or it failed for a real reason ⇒ fall back
export async function tryNativeShare(data) {
  if (!(typeof navigator !== "undefined" && navigator.share)) return "unavailable";
  try {
    await navigator.share(data);
    return "shared";
  } catch (err) {
    return err && err.name === "AbortError" ? "dismissed" : "unavailable";
  }
}

// Whether the OS share sheet exists at all (callers hide their Share button when
// it doesn't, so Copy link stands alone).
export function canNativeShare() {
  return typeof navigator !== "undefined" && !!navigator.share;
}

// Copy text to the clipboard. Returns true on success, false if blocked (e.g. a
// non-secure origin) so the caller can reveal the text to copy by hand.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
