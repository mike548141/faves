// "Share this app" — the ⋯ menu item that hands the app's own URL to the OS
// share sheet (AirDrop / Messages / etc.), so someone can pass Faves on to a
// friend. Distinct from share-ui.js, which shares a *shortlist* of favourites.
//
// Native navigator.share is the mobile path; where it's absent (most desktops)
// we copy the link and toast a confirmation. The menu closes on click (see
// overflow-ui.js), so feedback is a toast rather than anything inline.

import { toast } from "./toast.js";

const SHARE_TITLE = "Faves";
const SHARE_TEXT = "Faves — menus for our favourite Wellington places to eat.";

// The branded public URL (the <link rel=canonical>), falling back to wherever
// we're actually served so a preview/pages.dev origin still shares something live.
function appUrl() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  return canonical || location.origin + "/";
}

export function initShareApp() {
  const btn = document.getElementById("share-app-btn");
  if (!btn) return;
  btn.hidden = false;

  btn.addEventListener("click", async () => {
    const url = appUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch (err) {
        // AbortError = the user dismissed the sheet themselves; stay quiet.
        if (err && err.name !== "AbortError") await copyLink(url);
      }
      return;
    }
    await copyLink(url);
  });
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied — paste it to a friend.");
  } catch {
    // Clipboard blocked (or a non-secure origin): surface the URL to copy by hand.
    toast(url);
  }
}
