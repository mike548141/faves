// "This tab is out of date — reload it" (roadmap 510/110, owner-ruled "Old tab
// stops writing"). The notice half of store.js's refusal: once another tab has
// moved storage to a newer schema, nothing this tab changes is saved, and the
// person has to be told before they spend a minute on a note that will not
// keep.
//
// ONE ACTION, AND IT IS THEIRS. The owner rejected the tab reloading itself,
// which could happen mid-note. So: a banner in the update notice's place, one
// Reload button, no dismiss — dismissing it would leave a tab that silently
// throws away every change, which is the one state this exists to prevent.
// It does not take focus (the person may be mid-sentence), but its message is
// an alert: it is news that changes what their next tap does.
//
// Imported by sw-register.js, which every page loads.

import { el } from "./dom.js";
import { onTabStale } from "./store.js";
import { dismissUpdateNotice } from "./update-notice.js";

let node = null;

/** The words, in one place so the test and the page cannot drift. */
export const STALE_MESSAGE =
  "Faves was updated in another tab. Reload to keep saving — changes made here won’t be kept until you do.";

/**
 * Get this tab onto the newest build. A newer service worker may still be
 * WAITING (ADR 0027: it takes over only when asked), and a plain reload would
 * then fetch the same old build again — so it is asked first, and the reload
 * rides its take-over. A short timer covers a worker that never answers.
 */
export async function reloadToNewest({ nav = globalThis.navigator, loc = globalThis.location, wait = 3000 } = {}) {
  try {
    const reg = await nav?.serviceWorker?.getRegistration?.();
    if (reg?.waiting) {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        loc.reload();
      };
      nav.serviceWorker.addEventListener("controllerchange", go, { once: true });
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      setTimeout(go, wait);
      return;
    }
  } catch {
    /* no worker, or it went away: a plain reload is still right */
  }
  loc.reload();
}

export function showStaleNotice(doc = globalThis.document) {
  if (node || !doc?.body) return node;
  // Its Refresh does what Reload does; two banners would be two answers to
  // one question. sw-register.js does not offer it again while this is up.
  dismissUpdateNotice();
  // Starts empty: a live region only announces what arrives AFTER it exists.
  const text = el("p", { className: "update-notice-text", role: "alert" });
  const reload = el("button", { type: "button", className: "update-notice-btn", textContent: "Reload" });
  reload.addEventListener("click", () => {
    reload.disabled = true;
    text.textContent = "Reloading…";
    reloadToNewest();
  });
  node = el(
    "div",
    { className: "update-notice stale-notice", role: "region", "aria-label": "Faves was updated" },
    [text, el("div", { className: "update-notice-actions" }, [reload])]
  );
  doc.body.append(node);
  setTimeout(() => {
    if (!reload.disabled) text.textContent = STALE_MESSAGE;
  }, 0);
  return node;
}

onTabStale(() => {
  try {
    showStaleNotice();
  } catch (err) {
    // The refusal already holds without the notice; a broken banner must not
    // take the page down with it.
    console.error("Faves: could not show the reload notice.", err);
  }
});
