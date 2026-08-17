# Theme 16 — Staying current: PWA updates & a manual refresh (owner-raised 2026-08-09)

**The report, raw (owner):** *"the ability to force a full refresh of data
(restaurants, menus, codebase etc). I am finding the PWA on my phone is not
checking for new versions on open. I have to kill the PWA app (unload from
memory) and then it refreshes on next load. We should also fix the auto-refresh
for PWA."*

🔎 **Diagnosed 2026-08-09 — the symptom is exact and the cause is in our code,
not the platform.** [`sw-register.js`](../../../site/js/sw-register.js) is nine lines:
it calls `navigator.serviceWorker.register()` on `load` and **nothing else** —
no `registration.update()`, no `updatefound` handling, no reload path. A browser
only re-fetches `sw.js` on a **navigation** (plus a ~24 h background check), and
a standalone PWA resumed from memory performs no navigation. So "kill it and
relaunch" is the *only* thing that currently triggers an update check. That is
precisely what the owner is doing.

There is a **second** half, easy to miss: even once the new worker installs,
`sw.js` calls `skipWaiting()` + `clients.claim()`, so it takes control
immediately — but the page already on screen keeps the HTML, CSS and modules it
loaded. **Nothing reloads it.** So "check for updates" and "show the new
version" are two separate fixes, and doing only the first changes nothing
visible.

- ✅ **16a — Check on resume** — **shipped 2026-08-09** (`site/js/sw-update.js`
  + `sw-register.js`, 10 tests): `registration.update()` on `visibilitychange`
  (becoming visible) and `focus`, throttled to once every five minutes through
  one shared gate, so fifty app-switches in a minute cost one request. The
  throttle, the resume test and the reload guard are a pure module so
  `node --test` can execute them.
- ✅ **16b — Tell the user, then reload** — **shipped 2026-08-09**
  (`site/js/update-notice.js`): a dismissible banner, "A newer version of Faves
  is ready", with Refresh and Not now. Refresh activates the waiting worker and
  reloads; Not now leaves it for the next cold start. **The notice won**, as
  recommended — no auto-reload, since the search query, scroll position and
  dietary chips don't survive one. English + te reo strings both in `reo.js`
  (drafts, flagged for the reo review).
- ✅ **16c — "Force a full refresh"** — **shipped 2026-08-09**
  (`site/js/cache-refresh.js` + Settings → Your data, 8 tests): clears the shell
  and data caches, unregisters the worker, reloads — the fresh load re-registers
  and rebuilds from the network. Both rules held: **offline is a refusal**, not
  a warning, re-checked at the confirm as well as the first tap; and the
  personal layer is untouched — a test asserts the module never so much as names
  `localStorage`. Photos survive too (capped runtime cache, not what goes
  stale). Wording says plainly it refreshes menus and app code, not your stuff.
- ✅ **16e — About shows the installed versions** — **shipped 2026-08-09**
  (`site/js/versions.js`, 9 tests): an "App" and a "Menus & prices" stamp read
  from the service worker's cache names, so it reports what the device has
  actually stored rather than what the source claims. 🎯 **Owner asked for
  *"all the relevant versions… e.g. code base vs restaurant/menu data etc"* —
  the two named are shipped; the "etc" is left open deliberately.** An audit
  found the only other version stamps in the app are **internal storage-schema
  keys** (`faves.*.v1`, the export envelope's `v`, the share codec's) — they
  identify a data *shape*, never freshness, and would read as noise to a diner.
  Say the word if they should show anyway (they would help when debugging a
  weird device). The genuinely missing piece isn't another number: it's
  **"is this the latest?"**, which needs 16a's update check to answer.
- ✅ **16d — Version skew, named so it isn't discovered the hard way** —
  **decided and shipped 2026-08-09**
  ([ADR 0027](../../decisions/0027-pwa-update-flow.md)): the unconditional
  `skipWaiting()` is **gone**. A new worker holds in `waiting` until the page
  posts `{type:"SKIP_WAITING"}` on 16b's tap, so an old page is never served
  new assets from caches its own worker has just swept. Ignore the notice and
  the worker activates at the next cold start — the kill-and-relaunch behaviour
  that already worked, never worse.
  [ADR 0015](../../decisions/0015-split-precache-versioning.md)'s split caches and its
  build-new-then-delete-old activate order are untouched; `clients.claim()`
  stays, for the first-ever install. Two static tests pin the absence of
  `skipWaiting()` from install, because the temptation to put it back is real.
- ✅ **16f — About's version stamp can now run ahead of the page** `[S]` —
  **shipped 2026-08-09** ([ADR 0032](../../decisions/0032-ask-the-controller-for-its-version.md),
  `site/js/versions.js`, 13 new tests): About now asks the *controlling*
  worker directly for its own `SHELL_VERSION`/`DATA_VERSION` (a MessageChannel
  round-trip to a new `GET_VERSIONS` handler in `sw.js`) instead of inferring
  from cache names — the inference could show the newest **cached** version
  while the page was still running the previous one. A waiting worker's
  version is now reported separately ("an update is ready"), never merged
  into the headline number. Falls back to the old cache-name guess only for a
  controller that predates this protocol (mid-upgrade) or has none yet
  (first load). **Device-verified: none of the four SW-dependent states**
  (no controller yet, controller only, controller + waiting, a non-replying
  controller) **were reachable headlessly this session** — pinned by 13 unit
  tests against fake `ServiceWorker`-shaped objects instead; owed a real
  device pass, same as 16a–16d.

**Test honestly:** the service worker hides its own changes, so this needs a real
device or a headless run with a fresh browser profile — a hard-reload does not
bust it. The acceptance case is the owner's own:
leave the PWA backgrounded, push a data change, foreground it — the new menu
should appear without killing the app. **16a–16d ship with unit tests only:**
the resume check firing, the notice appearing, the tap activating the waiting
worker and the refresh rebuilding the caches are all unreachable from
`node --test`, and are owed a device pass before this theme is called done.
