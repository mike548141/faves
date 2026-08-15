# 0039 — Cook mode gets its own real-browser guard, gaps declared

**Status:** Accepted.

**Date:** 2026-08-15

## Context

ROADMAP 17d shipped cook mode with 19 unit tests against a fake
`navigator.wakeLock` — and it still leaked a wake lock **twice** in a real
headless Chrome ([ADR 0034](0034-cook-mode-overlay-and-wake-lock.md), decision
5). Both leaks were found by a 28-assertion throwaway script that was then
thrown away, so the only durable evidence was of the model we wrote, not of the
platform we ship to. The roadmap carried the gap as a 🚩 and framed the fix as a
decision rather than a chore: **widen `device_check.mjs`, or give cook mode a
sibling.**

## Decision

**1. A sibling, `tools/cook_check.mjs`, not a wider `device_check.mjs`.** The
two answer different questions. `device_check` is the allergen **safety**
re-apply on a restaurant menu, and a failure there means someone could be served
a dish that hurts them; that verdict should stay readable on its own line and
its runtime should stay short enough that nobody skips it. Cook mode lives on a
different screen, needs a different fixture (a recipe, not a peanut-heavy
menu), and needs machinery `device_check` has no use for: the wake-lock API
instrumented before page scripts run, a page hidden and re-shown, an emulated
`prefers-reduced-motion`, and six documents' worth of navigation. Merged, one
tool would have two subjects and one exit code.

**2. The harness is shared, extracted verbatim into `tools/lib/browser.mjs`.**
Static server, CDP client, Chrome launcher on a throwaway profile, the
report, and the page driver. A second copy of a CDP client is a second place for
a platform quirk to be fixed once and missed once. `device_check.mjs` keeps its
behaviour exactly (19/19 before and after) and now reads as what it is: a
fixture, a sequence and a set of assertions.

**3. The wake lock is observed by instrumenting the real API, never by
replacing it.** A script installed with `Page.addScriptToEvaluateOnNewDocument`
wraps `navigator.wakeLock.request` and `WakeLockSentinel.prototype.release` to
count calls and keep every sentinel the page was handed. "Still held" is then
read off the platform's own `released` flag. Measured here: headless Chrome 151
grants genuine sentinels on an http origin, releases them when the page hides,
and refuses a request while hidden — so there is a real platform to observe and
no reason to invent one.

**4. One deliberate intervention, and it widens a real race rather than
inventing one.** Leak (b) — a close landing inside the wake-lock request's
window — cannot be driven from outside in microseconds. The instrumentation can
stall inside `request` on the harness's signal, so the close reliably lands
first. The request, the sentinel and the release are all the platform's; only
the window is ours.

**5. The guard states what it cannot prove, in its own header.** Three gaps,
left as gaps rather than papered over with an assertion that would pass either
way:

- **That the screen actually stays on.** Device behaviour; only a real phone
  shows it, and iOS is still unverified (ADR 0034 already says so).
- **Leak (a) in its original form** — a browser reporting the page hidden
  *without* having released the lock. Chrome 151 here always releases first
  (measured: the sentinel's `release` event fires *before* `visibilitychange`),
  so the extra `release()` `cook.js` makes on hide is a no-op in this
  environment and its removal is invisible. What is checked instead is the
  consequence that mattered: after a hide/show cycle cook mode holds exactly
  one lock again, and no cycle ever leaves two.
- **Release on document teardown.** The page that held the lock no longer
  exists, so nothing can ask it. The checkable half — that the document you
  land back on starts clean — is checked.

## Rejected

- **Widening `device_check.mjs`.** See decision 1. The deciding argument was
  the safety verdict, not the file size.
- **A fake `navigator.wakeLock` in the browser run**, to reproduce leak (a)'s
  platform. That is the same fake `node --test` already has, moved somewhere
  more expensive: it would prove the model twice and the platform never. ADR
  0034's own lesson is that a fake proves the model you wrote.
- **Asserting leak (a) anyway**, on the reasoning that a green line is better
  than an admitted gap. A check that cannot fail is decoration, and this repo
  has already paid for three of those.
- **Adding the check to CI.** CI has no Chrome and the site has no build step;
  a browser gate belongs where the browser is. It is in the pre-commit list in
  `CLAUDE.md` beside `device_check.mjs`, run after touching cook mode.
- **Fixing the focus defect the guard found** (below) *silently*, as a chore.
  Where focus should land was a design call the owner and ADR 0034 own, so it
  was surfaced rather than patched. The owner ruled the same day and the fix
  landed — see Consequences.

## Consequences

- `tools/cook_check.mjs` (**36 assertions**), `tools/lib/browser.mjs`, and a
  `device_check.mjs` that now imports the harness rather than owning it
  (19/19 before and after the extraction). The guard itself changed nothing
  under `site/`; the focus fix it *found* did, and carries its own bump.
- **Proven to bite**, by three deliberate breaks in `site/js/cook.js`, each
  reverted: forgetting the sentinel instead of releasing it → 5 failures;
  storing a sentinel that arrives after `release()` → exactly the in-flight
  assertion; never re-acquiring on return → exactly the hide/show assertion.
- **🔎 A real defect found, surfaced not patched — then ruled and fixed the
  same day (2026-08-15).** Tapping **Back** until step 1 disabled the Back
  button *while it held focus*, and Chrome then drops focus to `<body>` —
  outside the dialog. `cook-ui.js` listens for keydown on the dialog, so from
  that moment the arrow keys, Home and End did nothing. Measured: after three
  clicks on `.cook-prev`, `document.activeElement === document.body` and a real
  ArrowRight produced no keydown on the dialog at all. ADR 0034 says "focus
  stays on Back/Next so repeated taps keep working"; at the lower boundary it
  did not.
  **Owner ruled: hand focus to Next before disabling Back.** Next is the only
  control that still does anything at step 1, and it keeps focus inside the
  dialog. Rejected: focusing the *step* (ADR 0034 already rejected moving focus
  to the step on every change, and an exception at one boundary is the kind of
  rule nobody remembers), and never disabling Back (a control that looks live
  and is not trades one accessibility fault for another). The guard gained the
  assertion for it — **35 → 36 assertions** — and that assertion was proved to
  bite by removing the fix line again. `SHELL_VERSION` bumped, since this one
  *does* change `site/`.
  **The value here is the pattern, not the bug.** 19 unit tests and a hand
  pass over cook mode had both missed it; a real browser found it in the first
  run, because "focus goes to `<body>`" is a platform behaviour a fake cannot
  have.
- The driver now scrolls with `behavior: "instant"`. The site sets
  `scroll-behavior: smooth`, so a plain `scrollIntoView` returned before the
  page had moved and every click far down a page landed in empty space — which
  is why the Cook at Home list's entry point looked broken until it was found.
