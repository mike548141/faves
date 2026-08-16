// Refreshing what this device holds of the site — two escape hatches from a
// stale copy, at opposite scales, kept together because they answer the same
// worry ("what I'm looking at may not be what's published any more"):
//
//   • forceRefresh() — "Refresh menus and app", behind Settings → Your data
//     (ROADMAP Theme 16c). Throws away what this device has stored of the site
//     and fetches the lot again.
//   • mountNotFound() — the menu screen's honest not-found screen (ADR 0020
//     invariant 4). Re-checks ONE venue against the network and says only what
//     that check proved.
//
// The second is deliberately not built on the first: a full reset re-downloads
// the whole site to answer a question about one venue, and a page reload cannot
// return an answer to the code that asked for it. Both hard rules below cover
// both functions.
//
// TWO HARD RULES, both about not making things worse than doing nothing:
//
//   1. NEVER TOUCH THE PERSONAL LAYER. Favourites, ratings, settings, profiles
//      and the order tally live in localStorage and are the user's, not cache.
//      This module never reads or writes storage — only CacheStorage entries
//      the service worker built. A test asserts that literally, over the source.
//   2. REFUSE WHEN OFFLINE. Clearing the caches with no network strands the app
//      with nothing to serve: no menus, no shell, nothing. That is the one way
//      this feature can leave someone worse off, so it is a refusal, not a
//      warning.
//
// Photos (`faves-img-*`) survive: they are a capped runtime cache, they are not
// what goes stale, and re-downloading them is the expensive part of a refresh
// on mobile data.

import { el } from "./dom.js";
import { REFERENCE_COPY, recheckReferences, referenceWhyFor } from "./data.js";

const REFRESHABLE = /^faves-(shell|data)-/;

/** Which cache names a refresh clears. Pure, so the "photos survive" rule is
 *  testable without a browser. */
export function refreshableCaches(names) {
  return (names || []).filter((n) => REFRESHABLE.test(n));
}

/**
 * Clear the shell + data caches, drop the service worker, and reload. The fresh
 * page load re-registers the worker (js/sw-register.js runs on every shell), so
 * the caches rebuild from the network on the way back in.
 *
 * Order matters: unregister first, so the reload's navigation can't be answered
 * by a worker whose caches we are about to delete out from under it.
 *
 * Every dependency is injected, which is what makes this testable — and what
 * keeps the offline check honest (`navigator.onLine` is only trustworthy in the
 * negative, so we treat "unknown" as online rather than blocking a refresh on a
 * browser that doesn't report it).
 *
 * @returns {Promise<{ok: boolean, reason?: string, cleared?: number}>}
 */
export async function forceRefresh({
  cacheStorage = globalThis.caches,
  serviceWorker = globalThis.navigator?.serviceWorker,
  isOnline = () => globalThis.navigator?.onLine !== false,
  reload = () => globalThis.location.reload(),
} = {}) {
  if (!isOnline()) return { ok: false, reason: "offline" };
  if (!cacheStorage?.keys) return { ok: false, reason: "unsupported" };
  try {
    if (serviceWorker?.getRegistrations) {
      const regs = await serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    const targets = refreshableCaches(await cacheStorage.keys());
    await Promise.all(targets.map((n) => cacheStorage.delete(n)));
    reload();
    return { ok: true, cleared: targets.length };
  } catch {
    // Storage denied, or a browser that refuses cache deletion in a private
    // window. Report it rather than reloading into the same stale copy.
    return { ok: false, reason: "failed" };
  }
}

/**
 * The menu screen's honest not-found screen (ADR 0020 invariant 4), replacing
 * the dead generic "couldn't load this menu" with what is actually known.
 *
 * The screen a reader lands on today says nothing about WHY, and there are two
 * very different whys behind the same 404: the venue was removed, or this
 * device's copy of the data simply hasn't caught up (the routine case once a
 * favourite or a link arrives from another device or another person). Nothing
 * here can tell them apart, so nothing here says which — until [Refresh] runs
 * a fetch that provably reached the network:
 *
 *   still there → it was staleness; reload straight into the menu.
 *   not there   → NOW it may be called removed, and only now.
 *   no answer   → say the check didn't happen. Never guess.
 *
 * @param {HTMLElement} host  the element to fill (e.g. #menu-error)
 * @param {string} o.venueId  the id from the URL
 * @param {string} [o.backHref]
 * @returns {HTMLElement} host
 */
export function mountNotFound(host, { venueId, backHref = "index.html", recheck = recheckReferences, reload = () => globalThis.location.reload() } = {}) {
  if (!host) return host;
  // Every node here is inline-level (span/button/a) and blocked out by CSS, so
  // the screen is valid inside the `<p id="menu-error">` the menu page already
  // has as well as inside a <div> — a <p> nested in a <p> would be neither.
  const why = el("span", { className: "notfound-why", textContent: REFERENCE_COPY.unresolvedWhy });
  // Polite, not assertive: the reader asked for this by pressing a button, so
  // it needs to be announced, but it isn't an interruption.
  why.setAttribute("role", "status");
  why.setAttribute("aria-live", "polite");

  const refresh = el("button", {
    type: "button",
    className: "fav-action fav-recheck",
    textContent: "Refresh",
  });
  refresh.setAttribute("aria-label", "Check online whether this place is still listed");

  const back = el("a", {
    className: "fav-action fav-back",
    href: backHref,
    textContent: "Back to all places",
  });

  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    refresh.textContent = "Checking…";
    why.textContent = REFERENCE_COPY.checking;
    const [result] = await recheck([{ type: "venue", venueId }]);
    const state = result?.state || "unreachable";
    if (state === "present") {
      // It was staleness. The data cache has just been re-primed by that very
      // fetch, so a reload lands on the real menu rather than back here.
      why.textContent = REFERENCE_COPY.restored;
      reload();
      return;
    }
    refresh.disabled = false;
    refresh.textContent = "Refresh";
    host.dataset.refState = state;
    if (state === "absent") {
      host.querySelector(".notfound-title").textContent = REFERENCE_COPY.removedVenue;
    }
    why.textContent = referenceWhyFor(state);
  });

  host.replaceChildren(
    el("span", { className: "notfound-title", textContent: REFERENCE_COPY.notFoundTitle }),
    why,
    el("span", { className: "fav-unresolved-actions notfound-actions" }, [refresh, back])
  );
  host.dataset.refState = "unresolved";
  return host;
}
