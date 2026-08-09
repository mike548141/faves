# 0031 — Ask the controller for its version, don't infer it from cache names

**Status:** accepted
**Date:** 2026-08-09

## Context

ADR 0027 traded an unconditional `skipWaiting()` for a worker that holds in
`waiting` until the page asks. Its consequences named a follow-on it left
unfixed: `site/js/versions.js`'s About stamp reads `caches.keys()` and picks
the *newest* shell/data cache present (`parseCacheVersions`'s `newer()`).
That was a fine proxy for "what the page is running" only because
`skipWaiting()` made the newest cache and the controlling worker the same
fact within seconds. Once a worker can sit in `waiting` for hours, the newest
cache present is precisely the update that has **not** taken over the page —
so About could report a version number the page in front of the user was not
running. Exactly the dishonesty the apex doctrine rules out.

ROADMAP 16f is the fix. The question About actually answers changes from
"what's stored on this device" to "what is this page actually running", and
those are provably different questions during a waiting-worker window.

## Decision

**Ask the controlling worker directly.** `site/sw.js` gains a `GET_VERSIONS`
message handler that replies with its own `SHELL_VERSION`/`DATA_VERSION`
constants down a transferred `MessagePort`:

```js
if (event.data.type === "GET_VERSIONS") {
  event.ports?.[0]?.postMessage({ type: "VERSIONS", shell: SHELL_VERSION, data: DATA_VERSION });
}
```

`site/js/versions.js` gains `askController()` (the round-trip, timeout-guarded,
never-rejects) and `currentVersions()`, which:

- asks `navigator.serviceWorker.controller` for its version — the honest
  answer, straight from the one thing that actually knows which cache it
  reads from;
- separately asks `registration.waiting` (detected via `getRegistration()`,
  not cache names) for *its* version, so a waiting update is reported as its
  own fact rather than folded into the primary number;
- falls back to the pre-existing `installedVersions()` cache-name guess only
  when there is no controller to ask, or a controller exists but never
  replies (see Rejected/Consequences below) — never worse than the
  pre-16f behaviour.

About (`about-ui.js`) renders `{ shell, data, controlling, waiting }`: the
controller's version as the headline, a distinct caveat when nothing is
controlling yet, and a separate "update is ready" line when `waiting` is
non-null (with its own version numbers when the waiting worker answered).

## Rejected

- **Keep inferring from `caches.keys()`, just restrict to "the older of the
  two caches when two coexist."** This still guesses. Two shell caches can
  coexist for reasons other than "one is waiting and one is controlling" —
  ADR 0015's build-new-then-delete-old activate order means a *mid-activate*
  worker briefly has both too, and nothing in the cache names themselves says
  which worker is currently answering `fetch` events. The heuristic that
  produced this bug (`newer()` = "the fresher one must be right") does not
  become sound by picking the other end of it; it only encodes a different
  guess. Only the worker that is actually running fetch/cacheFirst knows
  which cache it reads from — asking it removes the guess entirely instead of
  refining it.
- **Read `navigator.serviceWorker.waiting` / `.controller` presence only, no
  postMessage.** Cheaper, and it correctly distinguishes "is there a
  waiting worker" from "is there a controller" as booleans. But it cannot
  answer *which version* the controller is running — that number still has
  to come from somewhere, and the only non-inferred source is the worker's
  own constants. This shape is used anyway, but as a **support**: `waiting`
  presence still gates whether `askController` is called on it at all.
- **A shared version constant imported by both `sw.js` and `versions.js`.**
  Rejected for the same reason ADR 0015 keeps `sw.js` a classic (non-module)
  worker: module workers aren't reliably supported on older iOS Safari, and a
  failed SW registration means no offline at all. `sw.js` cannot safely
  `import` anything, so its constants cannot be a shared source file — asking
  it at runtime is the only route that doesn't risk offline capability.

## Consequences

- **New protocol, old workers don't speak it.** A controller deployed before
  this change has no `GET_VERSIONS` handler and will never reply — the same
  "ships once, then the old copy is silently running the old rules until
  it's replaced" shape ADR 0027 already documented for its own notice.
  `askController`'s timeout (1000 ms default) turns that silence into a
  clean `null`, and `currentVersions()` falls back to the cache-name guess
  for that one version — reporting *a* version rather than nothing, exactly
  as honest as the pre-16f behaviour, until the device's controller catches
  up to this release.
- **`report-ui.js` is untouched.** It calls `installedVersions()` for its
  bug-report envelope — "what's stored" is the right question there (a
  device-state diagnostic for whoever reads the report), not "what's
  currently rendering this exact page load." Kept as two functions with two
  contracts rather than merging them into one that would have to serve both.
- **A waiting worker can now be reported with its own exact version**, not
  just a boolean — `askController` is generic over any `ServiceWorker`-shaped
  object with `postMessage`, so the same round-trip that asks the controller
  also asks `registration.waiting`.
- **Device verification owed for the waiting-worker path**, same as ADR
  0027's own unfixed item: reaching an actual `waiting` state needs two
  service-worker versions live at once, which is hard to force headlessly.
  Every state is pinned by unit tests against fake `ServiceWorker`-shaped
  objects (`tests/versions.test.js`); the real-worker round-trip itself is
  confirmed only by a static shape guard on `sw.js`
  (`tests/sw-versioning.test.js`), not a live device pass.
