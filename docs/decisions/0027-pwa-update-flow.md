# 0027 — A waiting worker and a notice, not silent skipWaiting

**Status:** accepted
**Date:** 2026-08-09

## Context

Owner report (2026-08-09): *"I am finding the PWA on my phone is not checking
for new versions on open. I have to kill the PWA app (unload from memory) and
then it refreshes on next load."* ROADMAP Theme 16 diagnosed two separate
defects behind that one symptom.

The first is a missing check. `sw-register.js` registered the worker on `load`
and did nothing else. A browser re-fetches `sw.js` on a **navigation** (plus a
roughly daily background check), and a standalone PWA resumed from the app
switcher performs no navigation — so kill-and-relaunch was the only thing that
ever triggered an update check. Theme 16a fixes that: `registration.update()` on
`visibilitychange` (becoming visible) and `focus`, throttled.

The second is what happens **after** a new worker installs, and it is the
subject of this record. `sw.js` called `self.skipWaiting()` at the end of every
install and `self.clients.claim()` on activate. So the new worker took control
of the open page immediately — while that page kept running the HTML, CSS and
ES modules it had already loaded. From that moment the page was old code being
served new assets by a new worker, with **split caches** (ADR 0015) whose old
shell and data caches the new worker's activate handler had just deleted. That
is a version skew we cannot see, cannot test, and would only ever hear about as
"it went weird". Nothing reloaded the page either, so the *visible* effect of an
update was still nil — which is why the owner's symptom survived a worker that
was, technically, updating itself.

## Decision

**The new worker holds in `waiting` until the page asks.** Concretely:

- `install` no longer calls `skipWaiting()`. It builds the caches (unchanged,
  including ADR 0015's per-cache skip and `__cache_ready__` sentinel) and stops.
- A `message` handler is the one way out: `{type: "SKIP_WAITING"}` calls
  `self.skipWaiting()`. Nothing else in the worker does.
- `sw-register.js` shows a notice when an installing worker reaches `installed`
  **and** a controller already exists (no controller = the first-ever install;
  there is no older version to replace and nothing to announce). It also catches
  the case where a worker finished installing in an earlier session and is
  already `waiting` at registration — there is no second `updatefound` for it.
- The notice's Refresh posts the message to `registration.waiting`, then reloads
  on `controllerchange`. Dismissing it leaves the worker waiting.
- `clients.claim()` stays on activate. It earns its place on the **first**
  install, where claiming is what gives a first visit its offline copy without a
  reload; after a `SKIP_WAITING` activation the page is reloading anyway.

**A user who ignores the notice is never worse off than before.** The waiting
worker activates by itself once every client closes — which is precisely the
kill-and-relaunch the owner has been doing by hand, and which kept working
throughout.

**The reload is guarded twice** (`createReloadGuard`, `sw-update.js`): it fires
only for a change *this page* requested — another tab tapping Refresh must not
yank this one out from under whoever is reading it — and only once, which is the
standard defence against the `controllerchange` reload loop.

**Activation cleanup is unaffected.** `activate` still keeps exactly
`{SHELL_CACHE, DATA_CACHE, IMG_CACHE}` and deletes the rest, and the new caches
were fully built during install before any old one is deleted (ADR 0015's
build-new-then-delete-old order), so there is still no window where offline
breaks. What changes is *when* that cleanup runs: at the user's tap, or at the
next cold start, instead of immediately.

## Rejected

- **Keep `skipWaiting()` and auto-reload the page.** The obvious pairing, and it
  does close the skew. Rejected because the reload lands whenever the deploy
  happens to land, which can be mid-order: the order tally, favourites and
  ratings live in `localStorage` and survive, but the search query, the scroll
  position and the dietary-chip toggles do not — the same in-session state the
  2026-07-25 Settings refinement ruling already treats as worth protecting. The
  cost of being one version behind for a few minutes is far below the cost of a
  menu screen resetting under someone reading it out to a table.
- **Keep `skipWaiting()` and show a notice.** The worst of both: the skew is
  live from the moment of install, and the notice merely reports it. If the page
  is going to keep running old code, the *worker* serving it must stay old too.
- **Do nothing until a navigation** (the pre-existing behaviour). This is the
  reported bug.
- **Poll on a timer.** A repeating `setInterval` check burns radio on a phone
  that may be sitting in a pocket, and answers a question nobody is asking while
  the app is not on screen. Resume is the moment the answer matters, and the
  five-minute throttle makes a burst of app-switching cost one request.
- **A module service worker (`{type:"module"}`) importing `sw-update.js`
  directly**, so the worker and the page shared one copy of the rules. Rejected
  for the same reason ADR 0015 rejected it: module workers are not reliably
  supported on older iOS Safari, and a failed registration means *no offline at
  all*. The rules the worker needs are three lines; the page keeps the module.

## Consequences

- **New modules, all precached** (the SHELL list is checked against the
  directory by `tests/sw-versioning.test.js`): `site/js/sw-update.js` (pure
  decision rules — resume detection, the throttle gate, the reload guard),
  `site/js/update-notice.js` (the banner), `site/js/cache-refresh.js` (Theme
  16c's force-refresh).
- **Tests:** `tests/sw-update.test.js` (10) and `tests/cache-refresh.test.js`
  (8) execute the pure logic; `tests/sw-versioning.test.js` gains two static
  guards — `install` must not contain `skipWaiting`, and the `SKIP_WAITING`
  message handler must exist. The second is the important one: the next person
  wondering why an update "doesn't apply immediately" will be tempted to put
  `skipWaiting()` back, and the test says why not.
- **An update now takes two taps in the worst case** (Refresh, then whatever the
  person was doing again) where it previously took a kill-and-relaunch. Better,
  but it is not zero — the notice's copy is doing real work and wants a look on
  a device.
- **`site/js/versions.js` is unaffected** — it reads cache *names*, which the
  split and its constants still produce unchanged. During the waiting window a
  device legitimately holds two shell caches; `versions.js` already picks the
  newer, which is the answer About should give.
- **Force-refresh (Theme 16c) is the escape hatch** when this flow still leaves
  something stale, and is deliberately narrower than it looks: shell and data
  caches only, never `localStorage`, and a refusal when offline.
- **Device verification is owed.** None of the runtime behaviour here —
  the resume check firing, the notice appearing, the tap activating — is
  reachable from `node --test`. It goes to the device-check harness.
