// "A newer version is ready" — the notice half of the PWA update flow
// (ROADMAP Theme 16b, ADR 0027).
//
// Deliberately NOT an auto-reload. Favourites, ratings and the order tally live
// in localStorage and would survive one, but the search query, the scroll
// position and the dietary chips do not — reloading the page under someone
// halfway through reading a menu to their table is a worse bug than being one
// version behind. So: a small banner, two buttons, and nothing happens until
// they say so.
//
// It does not take focus either, for the same reason. It sits above the bottom
// bar (where the toast sits) and stays until acted on — unlike the toast, it
// carries actions, so it must never time out under a reaching thumb.

import { el } from "./dom.js";
import { t, translate } from "./reo.js";

let node = null;

/**
 * Show the update notice. `onRefresh` runs when the person taps Refresh.
 * Idempotent: a second update arriving while the notice is up changes nothing
 * (the same one tap still fetches whatever is newest).
 */
export function showUpdateNotice(onRefresh) {
  if (node) return node;

  // The message element starts empty and carries no i18n key: a live region
  // only announces content that arrives *after* the region exists, so the text
  // (and its key) land on the next task. Built in, it would be a silent banner.
  const text = el("p", { className: "update-notice-text", role: "status", "aria-live": "polite" });

  const refresh = el("button", {
    type: "button",
    className: "update-notice-btn",
    textContent: "Refresh",
  });
  refresh.dataset.i18n = "update.refresh";
  const later = el("button", {
    type: "button",
    className: "update-notice-dismiss",
    textContent: "Not now",
  });
  later.dataset.i18n = "update.later";

  node = el(
    "div",
    { className: "update-notice", role: "region", "aria-label": "App update" },
    [text, el("div", { className: "update-notice-actions" }, [refresh, later])]
  );

  refresh.addEventListener("click", () => {
    // Say something immediately: activating the waiting worker and reloading
    // takes a beat, and a button that looks ignored gets tapped again.
    refresh.disabled = true;
    delete text.dataset.i18n;
    text.textContent = t("update.refreshing", "Refreshing…");
    onRefresh();
  });
  // Dismiss is not "never": the waiting worker stays waiting, so the new
  // version lands by itself on the next cold start.
  later.addEventListener("click", dismissUpdateNotice);

  document.body.append(node);
  translate(node); // te reo on the buttons of this freshly built subtree
  setTimeout(() => {
    if (refresh.disabled) return; // already tapped; leave "Refreshing…" alone
    text.dataset.i18n = "update.ready";
    // Faves is about food, so the one prompt that interrupts you sounds like
    // it (owner's wording, 2026-08-16). It still says what the reader *gets* —
    // "a newer version is ready" named the mechanism and left them to infer
    // the benefit. Kept to one short line because it sits beside two buttons
    // at 390 px.
    text.textContent = "Get it while it’s hot! Update for the latest menus and prices.";
    translate(node);
  }, 0);
  return node;
}

export function dismissUpdateNotice() {
  if (!node) return;
  node.remove();
  node = null;
}
