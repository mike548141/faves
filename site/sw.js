// Service worker (Phase 5). Precaches the app shell and every menu so
// the whole site works in flight mode after one visit.
//
// TWO KINDS OF STORE, versioned two different ways.
//   - The SHELL (html/css/js/icons/webmanifest) is one versioned cache,
//     `faves-shell-<SHELL_VERSION>` (ADR 0015). Bump SHELL_VERSION on any
//     change under site/ outside site/data/. Any byte change to *this file* is
//     what makes the browser re-run the update cycle at all.
//   - The DATA (site/data/) lives in ONE PERMANENT STORE, `faves-data`, named
//     by content fingerprint rather than by a version (roadmap 510/030, ADR
//     0145 as revised by ADR 0146). There is no DATA_VERSION any more: a menu
//     edit changes no byte of this file, and the phone learns of it from
//     data/catalogue.json instead — see "The data store" below.
const SHELL_VERSION = "2026-10-02.3";

const SHELL_CACHE = `faves-shell-${SHELL_VERSION}`;
const DATA_STORE = "faves-data";
const IMG_CACHE = "faves-img-v1";
// Raised 60 → 240 on 2026-08-16, when dish photos went from a schema field
// nobody had ever set to 41 images on one venue (ADR 0053). At 60 a single
// browse of McDonald's consumed 41 slots and evicted almost every other
// venue's photos, so the cache was answering for roughly one venue at a time —
// which is the opposite of what a cache is for. 240 holds several venues'
// worth at the ~29 KB an image actually costs (about 7 MB at full), still far
// inside any browser's storage budget, and eviction is still oldest-first.
// This is a runtime cache, so it never touches the first-visit transfer budget.
const IMG_LIMIT = 240;

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
  "js/alarm.js",
  "js/app.js",
  "js/cache-refresh.js",
  "js/checklist.js",
  "js/checklist-ui.js",
  "js/ingredients.js",
  "js/cart.js",
  "js/cart-ui.js",
  "js/closure-ui.js",
  "js/cook.js",
  "js/cook-ui.js",
  "js/cookbook-menu.js",
  "js/data.js",
  "js/defaults.js",
  "js/dialog.js",
  "js/addons-ui.js",
  "js/addons.js",
  "js/dietary.js",
  "js/dish-filters.js",
  "js/dish-id.js",
  "js/disclosure.js",
  "js/distance.js",
  "js/dom.js",
  "js/favourites.js",
  "js/favourites-ui.js",
  "js/filters.js",
  "js/filters-ui.js",
  "js/geo.js",
  "js/geo-consent.js",
  "js/fx.js",
  "js/heat.js",
  "js/tags.js",
  "js/home.js",
  "js/hours.js",
  "js/kinds.js",
  "js/lang.js",
  "js/locale.js",
  "js/locations.js",
  "js/menu.js",
  "js/needs.js",
  "js/notes.js",
  "js/notes-ui.js",
  "js/personal-data.js",
  "js/personal-io-ui.js",
  "js/picker.js",
  "js/place.js",
  "js/price.js",
  "js/renames.js",
  "js/profiles.js",
  "js/qr.js",
  "js/quantity.js",
  "js/ranking.js",
  "js/ratings.js",
  "js/ratings-ui.js",
  "js/recipe.js",
  "js/recipe-move.js",
  "js/recipe-record.js",
  "js/recipes.js",
  "js/recipe-stats.js",
  "js/report.js",
  "js/report-ui.js",
  "js/reo.js",
  "js/results-view.js",
  "js/overflow-ui.js",
  "js/search.js",
  "js/search-clear.js",
  "js/search-hints.js",
  "js/settings.js",
  "js/shopping.js",
  "js/shopping-ui.js",
  "js/settings-ui.js",
  "js/share-app.js",
  "js/share-codec.js",
  "js/share-core.js",
  "js/share-ui.js",
  "js/slug.js",
  "js/storage-persist.js",
  "js/suggest.js",
  "js/suggest-ui.js",
  "js/sync-buckets.js",
  "js/sync-code.js",
  "js/schema-stamp.js",
  "js/sync-start.js",
  "js/sync-ui.js",
  "js/sync-crypto.js",
  "js/sync-merge.js",
  "js/sync-log.js",
  "js/sync.js",
  "js/stale-tab-ui.js",
  "js/store.js",
  "js/sw-register.js",
  "js/sw-update.js",
  "js/temporal.js",
  "js/to-top.js",
  "js/toast.js",
  "js/ui-state.js",
  "js/units.js",
  "js/update-notice.js",
  "js/upgrade-start.js",
  "js/user-schema.js",
  "js/versions.js",
  "js/vibes.js",
  "site.webmanifest",
  "favicon.ico",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// ---------------------------------------------------------------------------
// The data store (roadmap 510/030; ADR 0145 layers 1-2, ADR 0146 §4).
// ---------------------------------------------------------------------------
//
// Every data file is named by a FINGERPRINT — the first FINGERPRINT_LENGTH
// hex digits of the SHA-256 of its exact bytes, written by
// tools/gen_summaries.mjs. data/catalogue.json carries the fingerprints of
// the fixed files (index, fx, summary, search index); each summary record's
// `h` carries its venue file's. An update fetches the catalogue, compares,
// and fetches ONLY the files whose fingerprint moved, as
// `<path>?h=<fingerprint>`, keyed in the store by that same URL.
//
// 🔑 WHAT SAVES THE DOWNLOAD IS THIS STORE, NOT HTTP CACHING (ADR 0146). A
// `?h=` URL is not immutable on the server — site/_headers matches paths, not
// query strings, so it is served `max-age=0` like any data file. The phone
// already HOLDING the bytes a fingerprint names is what makes an unchanged
// file free. Every fetch still uses `cache: "reload"` (ADR 0056: never fill a
// store from the browser's own cache), and every download is HASHED ON
// ARRIVAL and refused unless it is the fingerprint asked for — which refuses
// Pages' HTML stand-in (ADR 0100) and a mid-deploy mix of old and new files
// by the same test.
//
// THE SWITCH-OVER (ADR 0146): new files are written BESIDE the old ones, then
// ONE POINTER RECORD naming the whole set is written last. Reads go through
// the pointer, so a half-written sync is unreachable; its files are orphans,
// deleted at the start of the next sync (and after every swap). Offline never
// sees a half-updated set.
//
// The pointer is per DATA_SCHEMA, so a worker that meets a catalogue in a
// shape it does not know keeps its own set rather than reading one it cannot
// (ADR 0145: "never reads a shape it does not understand"), and an old worker
// still serving pages during a new one's install keeps its own pointer.
const DATA_SCHEMA = 1;
const FINGERPRINT_LENGTH = 12;
const DATA_CATALOGUE = "data/catalogue.json";
// Two files the sync must recognise by ROLE: the summary names the venue
// files, and the rates are the one file whose failure must not block a sync
// (a missing rates file degrades to each venue's own currency — ADR 0100).
const DATA_SUMMARY = "data/summary.json";
const DATA_FX = "data/fx.json";
const POINTER_PREFIX = "__data_pointer__/v";
const POINTER_PATH = /\/__data_pointer__\/v\d+$/;
// A data read starts a background update check at most this often. Not a
// cost control — one catalogue request (a few hundred bytes) is less than
// the conditional request per data file every read made before 510/030 — but
// a coalescer: a home screen reads three data files at once, and a burst of
// navigations should share one check. It lives in worker memory, so it also
// covers a check that FAILED (offline), which the window below never records.
const SYNC_MIN_GAP_MS = 10 * 1000;
// …and a data read does not check at all within this long of the last check
// that SUCCEEDED (roadmap 510/180, owner-ruled 2026-10-01: "about 3 minutes",
// ADR 0148). The time is a record in the data store, not a variable, because
// the browser stops an idle worker after ~30 s and a variable dies with it —
// which is why the 10 s gap above never held across a session's screens.
// The trade is freshness: a menu edit reaches an online phone up to this much
// later. A resume (SYNC_DATA from js/sw-register.js) and a forced SYNC_DATA
// ignore the window and check at once; only a data READ consults it.
const DATA_CHECK_WINDOW_MS = 3 * 60 * 1000;
// The record: `{ at }`, epoch ms. Not a pointer and not a file, so the sweep
// keeps it by name (CHECKED_PATH).
const CHECKED_KEY = "__data_checked__";
const CHECKED_PATH = /\/__data_checked__$/;
// Where this worker's scope starts, so a request's pathname maps to the
// site-relative path the catalogue and the summary use.
const BASE_URL = new URL("./", self.location.href).href;
const BASE_PATH = new URL(BASE_URL).pathname;

// Cloudflare Pages 308-redirects /foo.html → /foo (and /index.html → /), so a
// naive fetch of a shell page yields a *redirected* response. The browser
// refuses to return a redirected response to a navigation (net::ERR_FAILED),
// and cache.match would hand one straight back — so copy the body into a fresh,
// non-redirected Response before it ever reaches the cache or a navigation.
async function fetchClean(url, init) {
  const res = await fetch(url, init);
  return res.redirected ? new Response(res.body, res) : res;
}

// 🛑 `res.ok` IS NOT A TRUTHFUL ANSWER ON CLOUDFLARE PAGES (ADR 0100). Pages
// answers a path it does not have with `index.html` and a **200** — its
// single-page-app fallback, and not something a plain static file server does.
// So the install step's `!res.ok → throw` below cannot fire on the input it
// exists to catch: a shell asset that is simply GONE arrives as a successful
// response carrying the home page, and gets precached under the missing file's
// URL. Curl'd against the live site 2026-09-08:
//
//     $ curl -sI https://lets-eat.myspot.nz/js/this-file-does-not-exist.js
//     HTTP/2 200
//     content-type: text/html; charset=utf-8
//
// What Pages does give away is the CONTENT TYPE. A `.js`/`.css`/`.json`/image
// path answered as `text/html` cannot be the real file — every real one is
// served with its own type (measured the same day: `js/app.js` →
// `application/javascript`, `site.webmanifest` → `application/manifest+json`,
// `favicon.ico` → `image/vnd.microsoft.icon`). The response URL is no help: the
// fallback is a direct 200, so `res.redirected` is false and `res.url` equals
// the request URL — see ADR 0100's *Rejected*.
//
// 🔑 DELIBERATELY ONE-WAY, and that is the whole design. It refuses ONLY a known
// non-HTML extension answered as HTML; an unknown extension, a missing header,
// anything else, passes. A guard that throws on a legitimate response is worse
// than the decorative one it replaces: install would reject, the new worker
// would never activate, and every phone would hold the old shell forever with
// no notice and no way back. Over-refusing here is unrecoverable; under-refusing
// is what tools/check_precache.py covers before the push.
const NON_HTML_EXT = /\.(?:js|mjs|css|json|webmanifest|png|jpe?g|webp|svg|ico)$/i;

function servedAsHtmlStandIn(url, contentType) {
  const path = String(url).split(/[?#]/)[0];
  if (!NON_HTML_EXT.test(path)) return false;
  return /^\s*text\/html\b/i.test(String(contentType || ""));
}

/** Refuse a response that cannot be the file we asked for. */
function requireAsset(url, res) {
  // "SW fetch", not "SW install": since 510/030 a data sync outside any
  // install uses this guard too, and the message is what a reader sees.
  if (!res.ok) throw new Error(`SW fetch: ${url} → ${res.status}`);
  if (servedAsHtmlStandIn(url, res.headers.get("content-type"))) {
    throw new Error(
      `SW fetch: ${url} → ${res.status} but served as HTML — that path is ` +
        `missing from the deploy`
    );
  }
  return res;
}

// Building a versioned cache must not read the browser's own HTTP cache.
// `fetch()` defaults to `cache: "default"`, and Cloudflare Pages serves every
// non-HTML asset with `cache-control: public, max-age=14400` (four hours; only
// HTML gets max-age=0). So a precache built with a plain fetch can be filled
// with files up to four hours old — the version constant renames the cache and
// then refills it with the *previous* deploy. Measured 2026-08-16 against the
// live headers: after the filter redesign shipped, a cold start landed on the
// new SHELL_VERSION holding the NEW index.html and the OLD js/app.js. The page
// drew the new bottom bar, the Filters button was there, the click landed on an
// element nothing had wired, the sheet never opened and the console was clean —
// the owner's exact report, and it did not self-heal on the next cold start
// because the skewed cache carries its READY sentinel. The menus came through
// the same hole: 48 places cached when the site had 55.
//   "reload" for the data store — bypass the HTTP cache and refresh it.
//   "no-cache" for a runtime data miss (dataRead) — revalidate rather than
//   refetch, so a menu is never served from a four-hour-old copy while online.
// A `_headers` file setting max-age=0 on js/css would fix the deploy side too,
// and is the belt to this braces; this is the half that protects a phone which
// already has the old files.
// Data keeps "reload": its `?h=` URLs are never in the HTTP cache (a file the
// phone already holds is never fetched at all), so revalidating would save
// nothing, and every download is hash-checked anyway (ADR 0147).
const PRECACHE_FETCH = { cache: "reload" };
// The SHELL, on EVERY install, REVALIDATES instead (roadmap 510/170 for the
// first install, ADR 0149; 510/270 for updates, ADR 0150 — both owner-ruled
// 2026-10-01). `no-cache` sends a conditional request the SERVER answers: 304
// for a file it still serves unchanged, the new bytes for anything else. It
// never uses a stored copy the server has not just vouched for, which is the
// whole of what ADR 0056 required — and tools/precache_check.mjs proves it on
// the incident itself: with Pages' real headers, plain fetch() fills the new
// cache with the previous deploy's app.js; "reload" and "no-cache" both hold
// the current one, as a first install AND as an update.
// 🔑 So this mode is exactly as safe as Pages' ETag. tools/etag_survey.py
// measured it across five real deploys on 2026-10-01: every changed file got a
// new ETag and every unchanged one kept its old one (ADR 0150). What it saves:
// a SHELL_VERSION bump used to re-download all ~110 shell files on every
// installed phone; now only the files that changed come down whole.
const SHELL_FETCH = { cache: "no-cache" };

// Build the shell cache only if it isn't already fully populated. The name
// carries SHELL_VERSION, so an unchanged shell keeps its READY sentinel and is
// skipped here — a worker update that changed nothing in the shell (a new
// sync rule, say) re-downloads none of it. A present-but-unsentinelled cache
// is the debris of an interrupted install; it's deleted and rebuilt.
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
        // `requireAsset` adds the half `res.ok` cannot see on Pages (ADR 0100).
        await Promise.all(
          SHELL.map(async (u) => {
            const res = requireAsset(u, await fetchClean(u, SHELL_FETCH));
            await cache.put(u, res);
          })
        );
      });
      // The data set: a sync against the live catalogue (below). On a FIRST
      // install it downloads everything; on a worker update it fetches only
      // what changed since this phone's last sync — usually nothing. What
      // install REQUIRES is a complete set for this worker's schema, not a
      // successful sync: a phone that already holds one keeps offline working
      // through a flaky update, and a first install with no set is refused as
      // it always was, because a worker that cannot answer offline is not
      // worth activating. `requireAsset` (ADR 0100) is inside `fetchVerified`.
      let failure = null;
      try {
        await requestSync({ force: true });
      } catch (err) {
        failure = err;
      }
      if (!(await readPointer(await caches.open(DATA_STORE)))) {
        throw failure || new Error("SW install: no complete data set");
      }
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

// Three message types come in on this one port (any same-origin script can
// reach it, so all are keyed on `type` and anything else is ignored):
//   - SKIP_WAITING: the page's tap (js/sw-register.js) — the one way out of
//     `waiting`.
//   - GET_VERSIONS: About's version stamp (ROADMAP 16f, ADR 0032) asking
//     *this worker* what it's actually running, rather than inferring from
//     cache names — during a waiting-worker window the newest cache is the
//     update that hasn't taken over yet, not what's serving the page. Only
//     the worker itself knows which version that is, so it answers with its
//     own SHELL_VERSION down the reply port, and for the data the GENERATION
//     its pointer names (the catalogue fingerprint it last switched to —
//     there is no data version constant since 510/030). A worker in `waiting`
//     answers this too (its message listener is live the moment its script
//     runs, well before it controls anything) — that's what lets About report
//     a waiting update's exact version, not just "something is ready".
//   - SYNC_DATA: "check for new menus now" — sent by the page on resume
//     (js/sw-register.js), and by tools/fetch_check.mjs with `force: true` to
//     skip the coalescing gap. Replies with what the sync did. It never
//     consults DATA_CHECK_WINDOW_MS (510/180): a resume checks at once.
self.addEventListener("message", (event) => {
  if (!event.data) return;
  const port = event.ports?.[0];
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "GET_VERSIONS") {
    event.waitUntil(
      (async () => {
        let data = null;
        try {
          data = (await readPointer(await caches.open(DATA_STORE)))?.generation ?? null;
        } catch {
          /* storage refused — "not stored" is the honest answer */
        }
        port?.postMessage({ type: "VERSIONS", shell: SHELL_VERSION, data });
      })()
    );
  }
  if (event.data.type === "SYNC_DATA") {
    const run = requestSync({ force: event.data.force === true });
    event.waitUntil(
      (run || Promise.resolve({ status: "skipped", fetched: [] })).then(
        (result) => port?.postMessage({ type: "DATA_SYNC", ...result }),
        (err) =>
          port?.postMessage({
            type: "DATA_SYNC",
            status: "failed",
            fetched: [],
            error: String(err?.message || err),
          })
      )
    );
  }
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
      // Keep the current shell, the data store and the image cache; delete
      // everything else — old shell versions, the retired per-version
      // `faves-data-<DATA_VERSION>` caches (510/030) and the pre-split single
      // `faves-<VERSION>` cache. The new shell and the data set were complete
      // before install resolved, so there's no window where offline breaks.
      const keep = new Set([SHELL_CACHE, DATA_STORE, IMG_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))
      );
      // Inside the store: a pointer for any OTHER schema belonged to a worker
      // this one has just replaced, so its files become orphans and go.
      await withSyncLock(async () => {
        const store = await caches.open(DATA_STORE);
        for (const req of await store.keys()) {
          const path = new URL(req.url).pathname;
          if (POINTER_PATH.test(path) && !path.endsWith(`/${POINTER_PREFIX}${DATA_SCHEMA}`)) {
            await store.delete(req);
          }
        }
        await sweepOrphans(store);
      });
      await self.clients.claim();
    })()
  );
});

// A cook-mode timer's bell, tapped (ROADMAP 36d, ADR 0071). The notification is
// raised through `registration.showNotification` because Chrome on Android
// refuses `new Notification()` outright, and the click for one raised that way
// arrives HERE — the page that scheduled it may have been closed for half an
// hour by then, so this handler is the only thing that can answer it.
//
// The rule is: get the reader back to the recipe they were cooking, and never
// leave them with a second copy of the app. So an open window already on that
// exact URL is focused; any other open window of ours is focused and navigated;
// only with nothing open at all is a new one launched. `notification.data.url`
// is written by alarm.js — an absolute same-origin URL, re-resolved here rather
// than trusted, so a malformed one can only ever land on the home screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.href);
  if (target.origin !== self.location.origin) return;
  const url = target.href;
  event.waitUntil(
    (async () => {
      // includeUncontrolled: a window loaded before this worker took over is
      // still the reader's open recipe, and opening a second one over it is
      // exactly the failure this is written to avoid.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const exact = windows.find((c) => c.url === url);
      if (exact) return exact.focus();
      const any = windows[0];
      if (any) {
        await any.focus();
        // Not every browser implements client.navigate; falling through to a
        // focused window on the wrong page beats failing the click entirely.
        return any.navigate?.(url)?.catch?.(() => {});
      }
      return self.clients.openWindow?.(url);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/data/")) {
    // A reference recheck (data.js's `_fresh`, ADR 0020) must PROVE it reached
    // the network: straight through, never answered from the store and never
    // written to it (ADR 0146: "cache-busted rechecks are excluded").
    if (isRecheck(url.search)) {
      event.respondWith(fetch(req));
      return;
    }
    // Every other data read is answered from the held set, and starts a
    // background update check — unless one succeeded inside
    // DATA_CHECK_WINDOW_MS (persisted) or started inside SYNC_MIN_GAP_MS. The
    // read that started it is served the set as it stood, so one screen never
    // mixes two generations; the NEXT screen opened after the switch shows the
    // update. So an edit reaches an online phone on the first screen opened
    // after the window, plus one (or at once on a resume).
    event.waitUntil(backgroundCheck().catch(() => {}));
    event.respondWith(dataRead(req));
  } else if (url.pathname.includes("/img/")) {
    event.respondWith(imageCache(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

// Cloudflare Pages 308-redirects `/foo.html` → `/foo`, so the URL a reader ends
// up HOLDING — in the address bar, a bookmark, a shared link, the back stack —
// is the extensionless one. Curl'd 2026-09-08:
//
//     $ curl -sI 'https://lets-eat.myspot.nz/restaurant.html?id=mcdonalds'
//     HTTP/2 308
//     location: /restaurant?id=mcdonalds
//
// The precache is keyed on the paths in SHELL, and those carry `.html` because
// they have to: a plain static file server has no other name for them, and the
// site must run on one (ADR 0001). `ignoreSearch` drops the `?id=…` but not a
// missing extension, so `/restaurant?id=…` missed the shell cache entirely and
// fell through to the network — which offline means it throws. The deep link a
// reader is most likely to have saved was the one route flight mode did not
// cover (ADR 0100).
//
// `/` is already covered: `"./"` is in SHELL, so `/index.html` → `/` needs
// nothing here.
function htmlSibling(pathname) {
  if (pathname.endsWith("/")) return null; // already a directory index
  if (/\/[^/]*\.[^/.]+$/.test(pathname)) return null; // already has an extension
  return `${pathname}.html`;
}

// Shell: precached, so serve instantly; ignoreSearch lets the one
// restaurant.html entry answer every ?id=… deep link.
async function cacheFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const sibling = htmlSibling(new URL(req.url).pathname);
  if (sibling) {
    const viaSibling = await cache.match(sibling, { ignoreSearch: true });
    if (viaSibling) return viaSibling;
  }
  // Cache miss (e.g. a fresh deep link): the network copy of a shell page may be
  // redirected by Cloudflare — fetchClean strips that so a navigation doesn't fail.
  return fetchClean(req);
}

// --- The data store: pure rules (tests/sw-data-store.test.js runs these) ---

/** The store key — and the URL fetched — for one version of one file. */
function storeKey(path, fp) {
  return `${path}?h=${fp}`;
}

/** The pointer record's key for a schema. */
function pointerKey(schema) {
  return `${POINTER_PREFIX}${schema}`;
}

/** Is this data request a reference recheck (data.js's `_fresh` bust)? */
function isRecheck(search) {
  return /(?:^|[?&])_fresh=/.test(String(search || ""));
}

/** A request's pathname as the site-relative path the manifests use, or null
 *  when it lies outside this worker's scope. */
function relativePath(pathname, basePath) {
  return pathname.startsWith(basePath) ? pathname.slice(basePath.length) : null;
}

/** Hex of the first `n` digits of a digest's bytes. */
function hexPrefix(bytes, n) {
  let out = "";
  for (let i = 0; out.length < n && i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out.slice(0, n);
}

/**
 * The venue files a summary names, as [path, fingerprint] pairs. Refuses a
 * record with no id or no `h` rather than skipping it: a set missing a venue
 * is a set that cannot open that venue offline, and it would switch over
 * looking complete.
 */
function venueFiles(summary) {
  if (!Array.isArray(summary)) throw new Error("SW data: the summary is not a list");
  return summary.map((venue) => {
    const id = venue && venue.id;
    const fp = venue && venue.h;
    if (typeof id !== "string" || !id || typeof fp !== "string" || !fp) {
      throw new Error(`SW data: a summary record has no id or fingerprint (${id})`);
    }
    const u = `data/restaurants/${id}.json`;
    return [u, fp];
  });
}

/** Every store URL any of these pointers names — what a sweep must keep. */
function liveKeys(pointers, baseUrl) {
  const live = new Set();
  for (const pointer of pointers) {
    for (const [path, fp] of Object.entries((pointer && pointer.files) || {})) {
      live.add(new URL(storeKey(path, fp), baseUrl).href);
    }
  }
  return live;
}

// --- The data store: reads, sync, sweep ----------------------------------

async function fingerprintOf(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hexPrefix(new Uint8Array(digest), FINGERPRINT_LENGTH);
}

/** This schema's pointer — `{ schema, generation, catalogue, files, at }` —
 *  or null when no complete set has ever been switched to. */
async function readPointer(store, schema = DATA_SCHEMA) {
  const hit = await store.match(pointerKey(schema));
  if (!hit) return null;
  try {
    const pointer = await hit.json();
    return pointer && typeof pointer.files === "object" ? pointer : null;
  } catch {
    return null;
  }
}

/**
 * Download one version of one file and PROVE it is that version. The
 * fingerprint is recomputed over the bytes that arrived; anything else —
 * Pages' HTML stand-in, the previous deploy's file mid-rollout, a truncated
 * body — is refused, so it can never be switched to.
 */
async function fetchVerified(path, fp) {
  const url = storeKey(path, fp);
  const res = requireAsset(url, await fetchClean(url, PRECACHE_FETCH));
  const bytes = await res.arrayBuffer();
  const got = await fingerprintOf(bytes);
  if (got !== fp) {
    throw new Error(
      `SW data: ${path} arrived as ${got}, not the ${fp} the manifest names — ` +
        "a deploy in progress, or not the file; keeping the current set"
    );
  }
  return new Response(bytes, {
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}

/** Delete every store entry no pointer names: the debris of an interrupted
 *  sync, and the files a swap has just replaced. Pointers themselves stay. */
async function sweepOrphans(store) {
  const keys = await store.keys();
  const pointers = [];
  for (const req of keys) {
    if (!POINTER_PATH.test(new URL(req.url).pathname)) continue;
    try {
      pointers.push(await (await store.match(req)).json());
    } catch {
      /* an unreadable pointer names nothing, so it protects nothing */
    }
  }
  const live = liveKeys(pointers, BASE_URL);
  let removed = 0;
  for (const req of keys) {
    const path = new URL(req.url).pathname;
    if (POINTER_PATH.test(path) || CHECKED_PATH.test(path) || live.has(req.url)) continue;
    await store.delete(req);
    removed++;
  }
  return removed;
}

/**
 * One update: catalogue → changed fixed files → summary → changed venue
 * files → pointer → sweep. Resolves `{ status, fetched, generation }`;
 * rejects (switching nothing) when any required file cannot be had, so the
 * held set stays the last complete one.
 */
async function syncData() {
  const store = await caches.open(DATA_STORE);
  // "Cleared on the next start" (ADR 0146): nothing else writes the store while
  // this holds the lock, so every file no pointer names is debris.
  await sweepOrphans(store);
  const before = await readPointer(store);

  const catRes = requireAsset(DATA_CATALOGUE, await fetchClean(DATA_CATALOGUE, PRECACHE_FETCH));
  const catBytes = await catRes.arrayBuffer();
  const generation = await fingerprintOf(catBytes);
  // The common case, and the cheap one: nothing moved. One request, one hash,
  // no parse.
  if (before && before.catalogue === generation) {
    return { status: "current", fetched: [], generation };
  }
  const catalogue = JSON.parse(new TextDecoder().decode(catBytes));
  if (catalogue.schema !== DATA_SCHEMA) {
    // A shape this code does not read. Keep ours; the worker that does read it
    // ships in the same deploy and brings its own set (ADR 0145).
    return { status: "other-schema", schema: catalogue.schema, fetched: [], generation: before?.generation ?? null };
  }

  const have = (before && before.files) || {};
  const files = {};
  const fetched = [];
  let complete = true;
  const take = async (path, fp, soft) => {
    if (have[path] === fp && (await store.match(storeKey(path, fp)))) {
      files[path] = fp;
      return;
    }
    try {
      await store.put(storeKey(path, fp), await fetchVerified(path, fp));
      files[path] = fp;
      fetched.push(path);
    } catch (err) {
      if (!soft) throw err;
      // The rates: keep the copy we had, and leave the pointer marked
      // incomplete so the next check tries again rather than short-circuiting.
      complete = false;
      const old = have[path];
      if (old && (await store.match(storeKey(path, old)))) files[path] = old;
    }
  };

  await Promise.all(
    Object.entries(catalogue.files || {}).map(([path, fp]) => take(path, fp, path === DATA_FX))
  );
  const summaryHit = files[DATA_SUMMARY] && (await store.match(storeKey(DATA_SUMMARY, files[DATA_SUMMARY])));
  if (!summaryHit) throw new Error(`SW data: the catalogue names no ${DATA_SUMMARY}`);
  const venues = venueFiles(await summaryHit.json());
  await Promise.all(venues.map(([path, fp]) => take(path, fp, false)));

  // THE SWITCH: one put. Everything above is invisible to a read until now.
  const pointer = {
    schema: DATA_SCHEMA,
    generation,
    catalogue: complete ? generation : null,
    files,
    at: new Date().toISOString(),
  };
  await store.put(
    pointerKey(DATA_SCHEMA),
    new Response(JSON.stringify(pointer), { headers: { "content-type": "application/json" } })
  );
  await sweepOrphans(store);
  return { status: "updated", fetched, generation, complete };
}

/** When the last check that succeeded finished (epoch ms), or null. */
async function readChecked(store) {
  try {
    const hit = await store.match(CHECKED_KEY);
    const at = hit ? (await hit.json()).at : null;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null; // unreadable ⇒ "never checked" — the safe answer is to check
  }
}

/** Is `at` inside the window ending `now`? A time in the FUTURE (the phone's
 *  clock was wound back) is not: that check is due, not deferred for ever. */
function insideWindow(at, now, windowMs) {
  if (at === null) return false;
  const age = now - at;
  return age >= 0 && age < windowMs;
}

/**
 * A sync, then — if it left the phone holding the current, complete set —
 * the record that starts the window. A failed sync records nothing (the next
 * read retries, coalesced by SYNC_MIN_GAP_MS), and neither does one whose
 * rates file failed (`complete: false`), for the same reason syncData leaves
 * that pointer's catalogue blank. "other-schema" IS recorded: nothing this
 * worker can do will change that answer inside three minutes.
 */
async function syncAndRecord() {
  const result = await syncData();
  if (result.status !== "updated" || result.complete) {
    const store = await caches.open(DATA_STORE);
    await store.put(
      CHECKED_KEY,
      new Response(JSON.stringify({ at: Date.now() }), { headers: { "content-type": "application/json" } })
    );
  }
  return result;
}

/** A data read's check: nothing inside the persisted window, else requestSync
 *  (which still coalesces). Resolves to the sync's result, or null. */
async function backgroundCheck() {
  if (syncInFlight) return syncInFlight;
  const at = await readChecked(await caches.open(DATA_STORE));
  if (insideWindow(at, Date.now(), DATA_CHECK_WINDOW_MS)) return null;
  return requestSync();
}

// One sync at a time across EVERY worker of this origin: during an update the
// old worker (still serving) and the new one (installing) share this store,
// and one's sweep must never delete what the other has written but not yet
// pointed at. The Web Locks API spans workers; a browser without it falls
// back to one chain per worker, which covers everything but that overlap.
let localChain = Promise.resolve();
function withSyncLock(fn) {
  const locks = self.navigator && self.navigator.locks;
  if (locks && typeof locks.request === "function") {
    return locks.request("faves-data-sync", () => fn());
  }
  const run = localChain.then(fn, fn);
  localChain = run.then(
    () => {},
    () => {}
  );
  return run;
}

let syncInFlight = null;
let lastSyncStart = 0;
/** Start a sync unless one ran within SYNC_MIN_GAP_MS; `force` skips the gap
 *  and, if one is running, queues a fresh one behind it (so a forced check
 *  sees files that changed while the running one was mid-flight). Returns the
 *  sync's promise, or null when coalesced away. */
function requestSync({ force = false } = {}) {
  if (syncInFlight) {
    return force ? syncInFlight.catch(() => {}).then(() => requestSync({ force: true })) : syncInFlight;
  }
  const gap = Date.now() - lastSyncStart;
  if (!force && gap >= 0 && gap < SYNC_MIN_GAP_MS) return null;
  lastSyncStart = Date.now();
  syncInFlight = withSyncLock(syncAndRecord).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

// A data read: from the held set. A path the set does not name (a venue newer
// than this phone's last sync, or no set yet) goes to the network and is NOT
// stored — only a sync writes the store, so what it holds is always one
// coherent generation. Offline, that miss throws, exactly as before.
async function dataRead(req) {
  const path = relativePath(new URL(req.url).pathname, BASE_PATH);
  const store = await caches.open(DATA_STORE);
  const pointer = await readPointer(store);
  const fp = path && pointer ? pointer.files[path] : null;
  if (fp) {
    const hit = await store.match(storeKey(path, fp));
    if (hit) return hit;
  }
  return fetch(req, { cache: "no-cache" });
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
