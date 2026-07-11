// Service worker (Phase 5). Precaches the app shell and every menu so
// the whole site works in flight mode after one visit.
//
// VERSION is the cache-buster: bump it whenever anything in site/
// changes — menu data especially. See README "Editing menu data".
const VERSION = "2026-07-12.52";

const CACHE = `faves-${VERSION}`;
const IMG_CACHE = "faves-img-v1";
const IMG_LIMIT = 60;

const SHELL = [
  "./",
  "index.html",
  "restaurant.html",
  "recipe.html",
  "css/app.css",
  "js/app.js",
  "js/cart.js",
  "js/cart-ui.js",
  "js/data.js",
  "js/disclosure.js",
  "js/distance.js",
  "js/favourites.js",
  "js/favourites-ui.js",
  "js/filters.js",
  "js/geo.js",
  "js/hours.js",
  "js/menu.js",
  "js/picker.js",
  "js/price.js",
  "js/qr.js",
  "js/ranking.js",
  "js/recipe.js",
  "js/reo.js",
  "js/results-view.js",
  "js/overflow-ui.js",
  "js/search.js",
  "js/settings.js",
  "js/settings-ui.js",
  "js/share-codec.js",
  "js/share-ui.js",
  "js/slug.js",
  "js/store.js",
  "js/sw-register.js",
  "data/index.json",
  "site.webmanifest",
  "favicon.ico",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// Cloudflare Pages 308-redirects /foo.html → /foo (and /index.html → /), so a
// naive fetch of a shell page yields a *redirected* response. The browser
// refuses to return a redirected response to a navigation (net::ERR_FAILED),
// and cache.match would hand one straight back — so copy the body into a fresh,
// non-redirected Response before it ever reaches the cache or a navigation.
async function fetchClean(url) {
  const res = await fetch(url);
  return res.redirected ? new Response(res.body, res) : res;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(SHELL.map(async (u) => cache.put(u, await fetchClean(u))));
      // Every menu listed in the index, so offline covers all data.
      const ids = await (await cache.match("data/index.json")).json();
      await cache.addAll(ids.map((id) => `data/restaurants/${id}.json`));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n !== CACHE && n !== IMG_CACHE)
          .map((n) => caches.delete(n))
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
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  // Cache miss (e.g. a fresh deep link): the network copy of a shell page may be
  // redirected by Cloudflare — strip that so a navigation doesn't fail.
  const res = await fetch(req);
  return res.redirected ? new Response(res.body, res) : res;
}

// Data: menu edits should appear promptly when online, but the cache
// answers offline (or on dodgy reception outside the takeaway).
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
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
