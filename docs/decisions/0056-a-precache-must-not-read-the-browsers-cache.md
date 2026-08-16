# 0056 — A precache must not be filled from the browser's cache

**Status:** accepted
**Date:** 2026-08-16
**Extends:** [0015](0015-split-precache-versioning.md) — split versioning was
correct and was not enough · [0027](0027-pwa-update-flow.md) — the
version skew this produced is the *shape* 0027 exists to prevent, arriving by a
route 0027 does not cover

## Context

The owner reported the home screen's Filters button doing nothing, hours after
the redesign that added it (ADR 0052) shipped. A parallel session drove the same
build in a real browser on a fresh profile: the button had a proper box, the
click landed, the sheet opened, no console errors. The code was fine.

**The fault was one layer below both the code and the service worker.**

1. `sw.js` builds its versioned precache with `fetch()`.
2. A plain `fetch()` consults the browser's **own HTTP cache** first.
3. Cloudflare Pages served `js/*` with `max-age=14400` — four hours.
4. So bumping `SHELL_VERSION` renamed the cache, and the install then
   **refilled it from the previous deploy's bytes**.
5. The `READY` sentinel then marked that cache fully built, so it never
   self-healed on a later cold start. The staleness was durable.

The phone held the **new `index.html`** (`max-age=0`, always revalidated)
against the **old `app.js`** (up to four hours stale) — markup that knows about
a control its JavaScript has never heard of. It renders. It logs nothing. The
button does nothing. That is exactly the report.

**Reproduced end to end against the real worker** with the measured headers,
old deploy → new deploy → cold start, before anything was changed:

| | before | after |
|---|---|---|
| Cached `index.html` | NEW | NEW |
| Cached `js/app.js` | **OLD** | NEW |
| Click → sheet opens | **no** | yes |
| Console errors | **none** | none |
| Venues cached | **48** (site had 55) | 55 |
| Self-heals next cold start | **no** | n/a |

**A stale *worker* was ruled out by measurement, not assumed away.** Pure
service-worker staleness produces a different symptom — the old worker serves a
*coherent* old shell, with no Filters button at all. The owner saw the button.

## Decision

**An install fetches from the network, never from the browser's cache**, and
the origin stops offering a stale copy in the first place. Both halves, because
they protect different visitors.

1. **`sw.js` precaches with `cache: "reload"`** on every asset, and runtime data
   with `cache: "no-cache"`. `cache.addAll` is replaced by explicit puts,
   because it carried the same hole. This protects a phone that is **already
   installed** — the case the owner hit.
2. **`site/_headers` sets `max-age=0, must-revalidate`** on `js/`, `css/`,
   `data/` and `sw.js`. This protects a **first visit** landing between a deploy
   and the service-worker update, which half 1 cannot reach. `img/` is cached
   for a year and marked `immutable`: dish photos are content-addressed by dish
   id and never rewritten in place (ADR 0053).

## Rejected

- **Long cache lifetimes plus hashed filenames**, the standard answer. There is
  no build step (ADR 0001) and there never will be, so there are no content
  hashes to put in a filename. Revalidation is the only correctness mechanism
  available to a repo that ships what it wrote.
- **Fixing only `sw.js`.** It leaves a first visit between deploy and update
  able to skew, and that visitor has no worker yet to protect them.
- **Fixing only `_headers`.** It leaves every already-installed phone holding a
  four-hour-stale asset until its HTTP cache expires — including the owner's,
  right now, which is the whole reason this record exists.
- **Shortening the version-bump cadence, or bumping harder.** The bug is
  immune to it: the *rename* worked perfectly and the *refill* was stale. More
  bumps would have produced more freshly-named caches full of old bytes.

## Consequences

- **An install is now always a full download** of every precached file on a
  version bump — roughly 125 files. That is correct rather than free, and it is
  the price of the guarantee. It happens once per version, not per visit.
- **An install with no network still fails**, as before. But an install that
  previously *succeeded from disk cache alone* now will not — which is the
  point, not a regression.
- **A first visit now costs a conditional request per asset** — a 304 with no
  body — and only on a visit where the service worker is not already answering.
  Every subsequent visit is served from the precache without touching the
  network at all, so the offline guarantee is untouched.
- 🚩 **This bug was invisible to every check in the tree.** `check_versions.py`
  confirmed perfect lockstep across the whole day (86 shell files, 61 data
  files); the bump was never the problem. `boot_check`, `device_check`,
  `addon_check` and `cook_check` all launch a **fresh profile with an empty HTTP
  cache**, which is precisely the condition under which the bug cannot occur.
  A green suite and a broken phone were both telling the truth. **The gap is
  that nothing tests an upgrade** — every check tests a first install. That is
  worth a check of its own; it is roadmapped, not built here.
- Confirmed in Chrome only. `cache: "reload"` inside a service-worker install is
  specified and supported in Safari, but the owner's phone is the real test.
