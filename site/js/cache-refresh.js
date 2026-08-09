// "Refresh menus and app" — the escape hatch behind Settings → Your data
// (ROADMAP Theme 16c). Throws away what this device has stored of the site and
// fetches the lot again.
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
