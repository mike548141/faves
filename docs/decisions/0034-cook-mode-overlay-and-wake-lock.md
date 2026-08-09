# 0034 — Cook mode is a modal overlay on the recipe, and the wake lock is owned by a lifecycle, not a call

**Status:** Accepted for the build; the placement of the entry point and the
"Done closes it" ending are **proposed, pending owner eyeball** — both are
reversible and neither touches the data model.

**Date:** 2026-08-09

## Context

ROADMAP Theme 17d. A Cook at Home recipe renders well and reads well, but you
cook from a phone propped against a bowl, with wet hands, glancing at it every
few minutes. Two things break that: the whole method is one scrolling column, so
finding "where was I?" costs a scroll and a squint; and the screen sleeps
between steps, so every glance starts with drying your hands.

The roadmap's research pass found every current recipe app has converged on the
same answer — one step at a time, big type, and `navigator.wakeLock`. The wake
lock is the part that is not obvious to build, because it has a lifecycle rather
than an on-switch.

Data note: `serves` and `time` are set on 3 and 8 of the 24 recipes and block
17a/17b. **17d is not blocked by that** — `steps` is set on 23 of 24, so cook
mode had real content to ship against on day one. That is why it went first.

## Decision

**1. A modal `<dialog>` filling the viewport, opened from the recipe.** The
native dialog is doing the accessibility work: focus trapped in the top layer,
the page behind inert, Escape wired, and focus restored to the button you came
from — all platform behaviour, none of it hand-rolled state we could get subtly
wrong. It also keeps the recipe's scroll position, which matters because ducking
out and back in is exactly what happens mid-cook.

**2. Boundaries saturate; they never wrap.** Step 9 → step 1 on a stray tap
looks like the recipe restarted. Back is disabled on step 1; on the last step
the forward button becomes **Done** and closes cook mode — the exit you reach by
finishing rather than by dismissing.

**3. Escape closes cook mode outright, even with the ingredients panel open.**
Making Escape step back a level was tried on this codebase for Settings and
measured: Chrome's close-watcher force-closed the dialog **two times in six**
([ADR 0025](0025-settings-index-and-panels.md)). A promise the platform keeps
only most of the time is worse than not making it.

**4. Ingredients are a toggle inside cook mode, not a navigation.** The roadmap
frames 17c as "don't send the reader back up the page"; the cheap half of that
is reachable here. Opening the panel never touches the step index, so closing it
puts you back exactly where you were. Inline per-step quantities are 17c and
were not attempted — they need structured quantities that do not exist yet.

**5. The wake lock is a small state machine with a `wanted` flag, not a call.**
This is the substance of the ADR. Three behaviours, each of which is a silent
failure if missed:

- **Unsupported is not an error.** Safari only got `wakeLock` in iOS 16.4. An
  older phone gets cook mode with no note, no warning and no dead switch; a
  refusal (`NotAllowedError`) behaves identically. The "Screen stays on" line
  appears only on a lock actually held, so the UI never claims something the
  platform didn't give.
- **The OS takes it back and does not give it back.** Hiding the page releases
  the lock permanently; returning does not restore it. Without a remembered
  `wanted` flag and a re-acquire on every `visibilitychange`, cook mode stops
  working the first time someone answers a text — and looks fine while doing it.
- **It must be handed back, not merely forgotten.** Two leaks were found by
  driving a real headless Chrome, not by unit tests: (a) on hiding, dropping our
  reference to a sentinel the platform had *not* actually released stranded a
  lock nothing could ever release; (b) closing cook mode while a request was
  still in flight let the arriving sentinel be stored after `release()` had
  already run. Both now release explicitly. Both have tests.

**6. Two entry points, both gated on the recipe having steps.** The recipe page
(above the ingredients, so you never scroll past the method to find it) and the
Cook at Home list's expanded detail (where people are when they decide to cook).
The one recipe with ingredients but no method offers nothing at all — it should
look like a recipe without a method, not like a broken feature.

## Rejected

- **A dedicated `cook.html` page.** Real cost, no gain: another shell page in the
  precache, another `?id=&dish=` round-trip, and the recipe's scroll position
  thrown away every time you ducked out. The state is ephemeral and belongs to
  the recipe you are already on.
- **An in-place mode on the recipe page** (hide the article, show the step).
  Cheapest to draw and the worst to make accessible: the focus trap, the inert
  background and the Escape handling all become ours to write and to keep right,
  and that is precisely the code the platform already ships correct.
- **Wrapping past the last step**, and **swipe navigation**. Wrapping misleads;
  swipe conflicts with the scroll a long step needs, and there is nothing wrong
  with two 56 px buttons.
- **Requesting the wake lock while the page is hidden.** The spec rejects it, so
  it is noise in the console and nothing else. The handler waits for visible.
- **Persisting which step you were on.** Deliberately not stored: cook mode is a
  session, and a recipe reopened a week later that resumes at step 7 is a bug
  wearing a feature's clothes. Cheap to add later if it is ever missed.
- **Announcing the step by moving focus to it on every change.** Focus stays on
  Back/Next so repeated taps keep working; the step and its counter sit in one
  `aria-live="polite"` region and are announced together.

## Consequences

- `site/js/cook.js` (pure/injected: step machine + wake-lock lifecycle) and
  `site/js/cook-ui.js` (the dialog), both in the shell precache;
  `SHELL_VERSION` → `2026-08-09.14`.
- 19 tests in `tests/cook.test.js` cover the step boundaries and the whole
  wake-lock lifecycle against a fake `navigator.wakeLock`. **What they cannot
  prove:** that the screen actually stays on. That is platform behaviour and
  only a real device shows it — iOS in particular is unverified here.
- Cook mode is where 17b's timers belong. The roadmap already says the alarm
  only fires reliably with the screen awake, so the timer work now has a host
  that guarantees it.
- Six new chrome strings in `reo.js`, English + a te reo Māori draft. The step
  counter carries no key: "Step 3 of 9" is interpolated, and the engine swaps
  whole strings only — the same boundary "Serves 4" already sits behind.
