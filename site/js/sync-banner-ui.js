// The banner itself (roadmap 510/430). Imported by sw-register.js, which every
// page loads, so it is on the home screen, a menu and a recipe alike.
//
// IN FLOW, NOT FIXED. A fixed bar has eaten taps in this app before (see
// to_top_check): the update notice and the back-to-top button already own the
// bottom edge. This sits at the top of <body>, above everything, and pushes
// the page down instead of covering any of it. The cost is that a reader
// scrolled deep into a menu will not see it until they scroll up — accepted:
// it is on every screen they open, which is what "cannot sit unnoticed" needs.
// Cook mode is a modal over the recipe page and is deliberately left alone;
// the banner is there the moment they close it.
//
// HOW OTHER TABS LEARN. They do not get a second mechanism: sync.subscribe()
// already repaints from the shared config on every `storage` event, so
// answering anywhere changes the status here and the banner follows.
//
// ANNOUNCING. Present at load, it is a labelled region read in page order and
// says nothing aloud — a banner that speaks on every page load is noise. Only
// one that APPEARS while the page is open (another tab asked) is announced,
// politely, via a live region that starts empty so there is something to
// announce into.

import { el } from "./dom.js";
import { sync } from "./sync.js";
import { BANNER_ACTION, BANNER_LABEL, BANNER_MESSAGE, OPEN_SYNC_QUESTION, shouldShowSyncBanner } from "./sync-banner.js";

let node = null;

function build(announce) {
  const text = el("p", { className: "sync-banner-text" });
  if (announce) {
    text.setAttribute("role", "status");
    text.setAttribute("aria-live", "polite");
  } else {
    text.textContent = BANNER_MESSAGE;
  }
  const go = el("button", { type: "button", className: "sync-banner-btn", textContent: BANNER_ACTION });
  go.addEventListener("click", () => document.dispatchEvent(new CustomEvent(OPEN_SYNC_QUESTION, { cancelable: true })));
  const box = el("div", { className: "sync-banner", role: "region", "aria-label": BANNER_LABEL }, [text, go]);
  if (announce) setTimeout(() => (text.textContent = BANNER_MESSAGE), 0);
  return box;
}

function paint(st, announce) {
  const want = shouldShowSyncBanner(st);
  if (want && !node && document.body) {
    node = build(announce);
    document.body.prepend(node);
  } else if (!want && node) {
    node.remove();
    node = null;
  }
}

try {
  paint(sync.status(), false);
  sync.subscribe((st) => paint(st, true));
} catch (err) {
  // The question is still answerable in Settings; a broken banner must not
  // take the page down.
  console.error("Faves: could not show the sync banner.", err);
}
