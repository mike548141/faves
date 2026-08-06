# 0015 — Split precache versioning: shell cache vs data cache

**Status:** accepted
**Date:** 2026-07-23

## Context

Owner idea (2026-07-22): "Should have a different version for the app vs the data
it holds vs the configuration so that it can trigger a refresh based of any of
them changing but only download the part(s) that change."

Until now `site/sw.js` had a single `VERSION` constant naming one precache
(`faves-<VERSION>`). Any change under `site/` — most often a data-only menu edit
— had to bump it, which renamed the *whole* cache and made every installed phone
re-download the entire app shell (all HTML/CSS/JS/icons) just to pick up one
changed menu. Wasteful on mobile data, and it discouraged the frequent small
data edits the whole "git-as-CMS" model (ADR 0002) is built around.

The mechanism that even lets a phone notice an update is unchanged and worth
stating: the browser re-runs the service-worker install/activate cycle whenever
**the bytes of `sw.js` differ** from the installed copy. So *any* edit to sw.js
(including bumping a version constant) triggers the update; the version constants
then decide *which caches* get rebuilt.

## Decision

Split the single precache into two independently-versioned caches, each with its
own constant in `sw.js`:

| Cache | Constant | Contents |
|-------|----------|----------|
| `faves-shell-<SHELL_VERSION>` | `SHELL_VERSION` | both HTML shells, `css/app.css`, every `js/*.js`, `site.webmanifest`, `favicon.ico`, icons |
| `faves-data-<DATA_VERSION>` | `DATA_VERSION` | `data/index.json` + every `data/restaurants/<id>.json` |
| `faves-img-v1` | *(none)* | runtime photo cache, size-capped — unchanged, deliberately version-free so it survives every bump |

**Only-download-what-changed** is delivered by cache *naming* plus a skip on
install. `ensureCache(name, populate)` skips populating a cache that already
exists and is marked complete. Because each cache name embeds its own version,
bumping only `DATA_VERSION` renames only the data cache: on the next install the
shell cache name is unchanged, still present, still complete → skipped (no shell
refetch), while the new data cache name doesn't exist yet → built. And
vice-versa. Bump both → both rebuild.

**Completeness sentinel.** A cache is trusted as populated only once a synthetic
`./__cache_ready__` entry lands in it, written *last*. An install interrupted
midway (flaky network, tab closed) leaves the named cache present but *without*
the sentinel; the next install sees the missing sentinel, deletes the debris and
rebuilds. Without this, the skip-if-present optimisation could permanently strand
a phone on a half-filled cache until the next version bump. The sentinel URL is
never fetched by the app, so it can't collide with a real request.

### The "configuration" axis — mapped to shell, no third cache

The owner named three axes: app, data, configuration. Honest mapping: **there is
no configuration artefact distinct from the shell.** The only config-shaped file
shipped is `site.webmanifest` (PWA name/icons/colours) — it changes on app
releases, in lockstep with the shell it describes, and is meaningless without it.
It stays in the shell cache. `data/index.json` reads like "configuration" (it
lists which restaurants exist) but it is **data**: it's the manifest of the menu
set, changes whenever a restaurant is added/removed, and drives the data
precache — so it lives in the data cache, versioned by `DATA_VERSION`. Inventing
a third cache to match the wording would be three caches for two real change
sources. If a genuine runtime-config artefact ever appears (e.g. feature flags, a
settings JSON fetched at runtime distinct from both shell and menu data), add a
`CONFIG_VERSION`/`faves-config-*` cache then — the `ensureCache` seam already
generalises to N caches.

### Everything preserved

- **Network-first data** (`networkFirst`, now backed by `DATA_CACHE`): online
  users always get fresh menus; the cache answers offline / on bad reception.
- **Cache-first shell** (`cacheFirst`, now scoped to `SHELL_CACHE`) with
  `ignoreSearch: true`, so the one `restaurant.html` entry still answers every
  `?id=…` deep link.
- **Capped runtime image cache** (`imageCache`, `faves-img-v1`) — untouched.
- **Offline-after-first-visit for everything**: install still precaches both
  shells, all JS/CSS/icons, and every menu, so flight mode opens every menu.
- The Cloudflare 308-redirect cleanup (`fetchClean`) and the by-hand
  `response.ok` guard on shell precache are retained verbatim.

### Upgrade path from the pre-split SW (mixed state)

An installed phone on the old SW holds one cache `faves-<old VERSION>` (e.g.
`faves-2026-07-23.73`) plus `faves-img-v1`. On first load after this ships:

1. New `sw.js` bytes differ → browser downloads it and fires **install**. The
   *old* SW is still controlling the page and still serving from the old cache —
   so there is no offline gap during this step.
2. Install builds `faves-shell-2026-07-23.74` and `faves-data-2026-07-23.74` from
   scratch (neither exists yet) — a one-time full download, expected for the
   migration. Both get their `__cache_ready__` sentinel. `skipWaiting()`.
3. **activate** fires, `clients.claim()`. Cleanup keeps exactly
   `{SHELL_CACHE, DATA_CACHE, IMG_CACHE}` and deletes everything else — including
   the old single `faves-2026-07-23.73` cache. The new caches were fully built in
   step 2 *before* the old one is deleted, so at no point is the phone without a
   complete cache set: **no window where offline breaks.**
4. Every subsequent update rebuilds only the cache whose version moved.

Values start at `2026-07-23.74` for both constants (successors to the old
`.73`), so installed phones update once and land on the split model.

## Rejected

- **A third `CONFIG_VERSION` cache** to literally match the owner's three axes.
  No config artefact exists that is distinct from the shell; `site.webmanifest`
  is shell, `index.json` is data. Three caches for two change sources is
  machinery for a wording match. Documented as the seam to add *if* a real
  runtime-config file ever appears.
- **Re-precaching every cache on each install (the old behaviour) but reading
  from the HTTP cache to avoid re-download.** Relies on Cloudflare cache headers
  and the browser HTTP cache to make unchanged assets cheap; unpredictable and
  invisible to us. Name-based skip is explicit and provable.
- **Deleting the old/other cache first, then rebuilding.** Simpler code, but a
  crash between delete and rebuild would leave a phone with no cache. Build-new-
  then-delete-old (the activate order here) has no such window.
- **A module service worker importing a shared pure module** so the split logic
  could be unit-tested by executing it. Module SWs (`{type:"module"}`) aren't
  reliably supported on older iOS Safari, and a failed SW registration means *no
  offline at all* — unacceptable for a PWA. sw.js stays a classic worker; the
  split invariants are guarded by a static-shape test instead (below).

## Consequences

- **Lockstep rule changes (documented in `CLAUDE.md`, `README.md`,
  `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`):** the single "bump `VERSION`" rule
  becomes — *data-only change under `site/data/` → bump `DATA_VERSION`; any other
  change under `site/` → bump `SHELL_VERSION`; a change touching both → bump
  both.* Both constants live in `site/sw.js`.
- **Guardrail in `tools/validate.py`** (`check_version_bump`): a best-effort,
  build-never-failing warning that fires when `site/data/` is dirty in the
  working tree but `site/sw.js` is not — catching the "forgot to bump anything"
  slip. It shells out to `git status --porcelain`; if git is absent or this isn't
  a checkout it silently skips, so the validator still runs standalone. It's
  deliberately shallow (it doesn't parse *which* constant moved) to stay a
  reminder, not machinery.
- **Test (`tests/sw-versioning.test.js`):** sw.js is browser-API code `node
  --test` can't execute, so this asserts the *shape* of the shipped file — two
  well-formed version constants, cache names derived from them, `index.json`
  absent from the SHELL list (it's data), the image cache version-free, and
  activate keeping exactly the three caches. It guards the split invariant
  against a future edit that, say, re-adds `index.json` to the shell.
- **Runtime behaviour needs a device pass** (see manual steps below) — the test
  can't prove install-time skipping or activate cleanup actually happen in a
  browser.

## Manual device test (owner)

The split's *point* — a data edit not refetching the shell — is only observable
on a real device. Steps:

1. **Baseline install.** Load the site on a phone (or Chrome DevTools →
   Application → Service Workers, "Update on reload" off). Confirm under Cache
   Storage you see `faves-shell-2026-07-23.74` and `faves-data-2026-07-23.74`
   (and, after viewing a photo, `faves-img-v1`). Enable flight mode → every menu
   still opens. Disable flight mode.
2. **Data-only bump.** Edit a menu JSON, bump **only** `DATA_VERSION` (e.g. to
   `.75`), leave `SHELL_VERSION`. Deploy/serve. In DevTools, throttle to "Slow
   3G" and reload with the Network tab filtered to `.js`/`.css`: on the SW
   install you should see the `data/*.json` refetched but **no** shell JS/CSS
   requests. After activate, Cache Storage shows `faves-data-...75` and the old
   `faves-data-...74` gone, while `faves-shell-...74` is unchanged (same entries,
   not rebuilt).
3. **Shell-only bump.** Bump only `SHELL_VERSION`. Reload: shell assets refetch,
   `data/*` do not; `faves-data-...` survives.
4. **Offline continuity.** During each update, before it activates, flip flight
   mode mid-reload — the site must still open every menu (old caches serve until
   the new ones are ready).

DevTools "Network" + "Cache Storage" panes are the evidence; screenshot the
absent shell requests in step 2 to confirm the saving.
