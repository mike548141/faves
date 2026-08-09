// Service worker (Phase 5). Precaches the app shell and every menu so
// the whole site works in flight mode after one visit.
//
// Split versioning (ADR 0015): the precache is two caches, each with its own
// version constant, so a change to one refetches only that cache and leaves the
// other untouched on installed phones.
//   - SHELL_VERSION → html/css/js/icons/webmanifest — bump on any non-data
//     change under site/.
//   - DATA_VERSION  → data/index.json + every restaurant JSON — bump on a
//     data-only menu edit.
//   - Change both? bump both.
// Any byte change to *this file* is what makes the browser re-run the SW update
// cycle at all; the version constants then decide which cache(s) get rebuilt.
const SHELL_VERSION = "2026-08-09.10";
const DATA_VERSION = "2026-08-09.6";

const SHELL_CACHE = `faves-shell-${SHELL_VERSION}`;
const DATA_CACHE = `faves-data-${DATA_VERSION}`;
const IMG_CACHE = "faves-img-v1";
const IMG_LIMIT = 60;

// A cache is only trusted as fully built once this sentinel lands in it — it's
// written last, after every asset is in. An install interrupted midway leaves
// the named cache present but *without* the sentinel, so the next install
// rebuilds it rather than skipping a half-filled cache (which would strand
// offline visitors on missing assets). The URL is synthetic — never fetched.
const READY = "./__cache_ready__";

// Shell: everything but the menu data. data/index.json is *data* (it lists
// which restaurants exist), so it lives in the data cache with the menus.
const SHELL = [
  "./",
  "index.html",
  "restaurant.html",
  "recipe.html",
  "css/app.css",
  "js/about-ui.js",
  "js/app.js",
  "js/cache-refresh.js",
  "js/cart.js",
  "js/cart-ui.js",
  "js/closure-ui.js",
  "js/data.js",
  "js/dialog.js",
  "js/dietary.js",
  "js/disclosure.js",
  "js/distance.js",
  "js/dom.js",
  "js/favourites.js",
  "js/favourites-ui.js",
  "js/filters.js",
  "js/geo.js",
  "js/hours.js",
  "js/locations.js",
  "js/menu.js",
  "js/personal-data.js",
  "js/personal-io-ui.js",
  "js/picker.js",
  "js/price.js",
  "js/profiles.js",
  "js/qr.js",
  "js/ranking.js",
  "js/ratings.js",
  "js/ratings-ui.js",
  "js/recipe.js",
  "js/report.js",
  "js/report-ui.js",
  "js/reo.js",
  "js/results-view.js",
  "js/route.js",
  "js/overflow-ui.js",
  "js/search.js",
  "js/search-clear.js",
  "js/settings.js",
  "js/settings-ui.js",
  "js/share-app.js",
  "js/share-codec.js",
  "js/share-core.js",
  "js/share-ui.js",
  "js/slug.js",
  "js/store.js",
  "js/sw-register.js",
  "js/sw-update.js",
  "js/temporal.js",
  "js/to-top.js",
  "js/toast.js",
  "js/ui-state.js",
  "js/units.js",
  "js/update-notice.js",
  "js/versions.js",
  "site.webmanifest",
  "favicon.ico",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// The one data file known ahead of time; the rest are read from it at install.
const DATA_INDEX = "data/index.json";

// Cloudflare Pages 308-redirects /foo.html → /foo (and /index.html → /), so a
// naive fetch of a shell page yields a *redirected* response. The browser
// refuses to return a redirected response to a navigation (net::ERR_FAILED),
// and cache.match would hand one straight back — so copy the body into a fresh,
// non-redirected Response before it ever reaches the cache or a navigation.
async function fetchClean(url) {
  const res = await fetch(url);
  return res.redirected ? new Response(res.body, res) : res;
}

// Build `name` only if it isn't already fully populated. Because each cache
// name carries its own version, bumping only one constant renames only that
// cache: the unchanged cache keeps its READY sentinel and is skipped here —
// that's exactly what lets a data-only edit refetch just the data and leave the
// shell alone (and vice-versa). A present-but-unsentinelled cache is the debris
// of an interrupted install; it's deleted and rebuilt.
async function ensureCache(name, populate) {
  if (await caches.has(name)) {
    const existing = await caches.open(name);
    if (await existing.match(READY)) return;
    await caches.delete(name);
  }
  const cache = await caches.open(name);
  await populate(cache);
  await cache.put(READY, new Response("ok"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await ensureCache(SHELL_CACHE, async (cache) => {
        // Per-URL put (not cache.addAll) so redirected shell pages get cleaned
        // first — but keep addAll's response.ok guard by hand: a 404/500 during
        // a deploy race must reject the install, not silently cache a broken
        // asset that offline visitors then serve until the next version bump.
        await Promise.all(
          SHELL.map(async (u) => {
            const res = await fetchClean(u);
            if (!res.ok) throw new Error(`SW install: ${u} → ${res.status}`);
            await cache.put(u, res);
          })
        );
      });
      await ensureCache(DATA_CACHE, async (cache) => {
        const res = await fetchClean(DATA_INDEX);
        if (!res.ok) throw new Error(`SW install: ${DATA_INDEX} → ${res.status}`);
        await cache.put(DATA_INDEX, res);
        // Every menu listed in the index, so offline covers all data.
        const ids = await (await cache.match(DATA_INDEX)).json();
        await cache.addAll(ids.map((id) => `data/restaurants/${id}.json`));
      });
      // NO unconditional skipWaiting (ADR 0027). A new worker that takes over
      // immediately serves new assets to a page still running the old HTML and
      // modules — a version skew we can't see and can't test. Instead it holds
      // in `waiting`: the page offers a "newer version is ready" notice, the
      // tap posts SKIP_WAITING below, and the reload lands on the new worker
      // together. Ignore the notice and the phone still gets the new version on
      // the next cold start, when the last client closes — exactly the
      // kill-and-relaunch behaviour that already worked, never worse.
    })()
  );
});

// The one way out of `waiting`: the page asking, on the user's tap
// (js/sw-register.js). Anything else is ignored — this is a message port any
// same-origin script can reach.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Activation now arrives one of two ways (ADR 0027): the page asked
      // (SKIP_WAITING), or every client closed and the waiting worker took over
      // on its own. Cleanup is identical either way, and clients.claim() below
      // still matters for the first-ever install, where claiming is what gives
      // the very first visit its offline copy without a reload.
      //
      // Keep the current shell, data and image caches; delete everything else —
      // old shell/data versions and the pre-split single `faves-<VERSION>`
      // cache. The new caches were fully built during install (old caches were
      // still serving), so there's no window where offline breaks.
      const keep = new Set([SHELL_CACHE, DATA_CACHE, IMG_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/data/")) {
    event.respondWith(networkFirst(req));
  } else if (url.pathname.includes("/img/")) {
    event.respondWith(imageCache(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

// Shell: precached, so serve instantly; ignoreSearch lets the one
// restaurant.html entry answer every ?id=… deep link.
async function cacheFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  // Cache miss (e.g. a fresh deep link): the network copy of a shell page may be
  // redirected by Cloudflare — fetchClean strips that so a navigation doesn't fail.
  return fetchClean(req);
}

// Data: menu edits should appear promptly when online, but the cache
// answers offline (or on dodgy reception outside the takeaway).
async function networkFirst(req) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

// Photos: cache-on-demand with a simple size cap (oldest evicted first).
async function imageCache(req) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - IMG_LIMIT))) {
      await cache.delete(key);
    }
  }
  return res;
}
