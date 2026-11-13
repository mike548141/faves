## 2026-08-09 — Cook mode: one step at a time, screen awake (wt: faves-cook-mode) — Opus 5

Shipped ROADMAP **17d** on its own worktree, branch only — no merge to
`main`. Cook mode is a modal full-screen `<dialog>` over the recipe:
one step at a time, a "Step 3 of 9" counter, 56 px Back/Next with arrow
keys, an ingredients panel that toggles without moving the step index,
and `navigator.wakeLock` holding the screen on. Entry points on the
recipe page and the Cook at Home list, on the 23 of 24 recipes that
carry `steps`. ADR **0034** records the shape and the lifecycle.

**The finding worth keeping: two wake-lock leaks that `node --test`
could not see.** The lifecycle passed 17 unit tests against a fake
`navigator.wakeLock` and still leaked twice in a real headless Chrome.

- **Hiding dropped the reference instead of releasing the lock.** The
  spec says the platform releases on hide, so forgetting the sentinel
  looked correct — and against a fake that models the spec, it is. A
  browser that reports hidden *without* having released leaves a lock
  nothing holds a reference to, and it is then never given back. The
  instrumented run showed it plainly: two requests, one release.
- **Close beating the request in flight.** Open and close inside the
  request's window and the arriving sentinel was stored *after*
  `release()` had already run — held forever, by nobody.

Both now release explicitly, both have tests, and the lesson is the
one the apex rule already states: a fake proves the model you wrote,
not the platform you shipped to. The browser run was 28 assertions in a
throwaway script; the roadmap now carries a 🚩 saying cook mode has no
durable real-browser guard, because `device_check.mjs` is scoped to the
allergen re-apply and widening it is a decision, not a chore.

**Deliberately not built,** so 17a/b/c/e stay clean: scaling, timers,
inline quantities, checklists, TTS. Cook mode is now the host 17b's
timers needed — the roadmap already says the alarm only fires reliably
with the screen awake.

**Also not verified, and said plainly:** that the screen actually stays
on. The lifecycle is proved; the platform behaviour needs an iPhone.
Everything else — 522 `node --test` (505 baseline + 17, then 19 after
the leak fixes), all Python gates, `device_check.mjs` 15/15 — is green.

**Escape closes cook mode outright**, even with ingredients open. Making
it step back a level was not re-litigated: ADR 0025 measured Chrome's
close-watcher force-closing that pattern two times in six on this very
codebase, and a promise the platform keeps most of the time is worse
than none.

