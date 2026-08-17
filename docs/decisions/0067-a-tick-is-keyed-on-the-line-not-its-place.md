# 0067 — A tick is keyed on the line's own text, not on where the line sits, and it expires

**Status:** Accepted.
**Superseded in part (added 2026-08-17):** decision 4's final clause — that
the catch-all sweep makes leaving the checklist out of `SCOPED_BASE_KEYS`
free — is superseded by
[0074](0074-a-backup-carries-only-what-it-can-put-back.md); decision 4's
conclusion and the other six decisions stand.

**Date:** 2026-08-16

## Context

ROADMAP 17e, first bullet: *"Tick off ingredients and steps as you go — a
checklist with state that survives a phone call. Cheap, and every app tested has
it."* Cheap it is; the two decisions underneath it are not obvious, and one of
them argues with an ADR this repo already accepted.

**The keying problem.** A recipe is keyed easily enough — venue plus dish id
([ADR 0051](0051-a-dish-has-an-id-and-its-name-is-not-it.md)), the same identity
hearts and ratings use. Inside a recipe there is nothing to key on at all:
`ingredients` and `steps` are flat lists of free text, and no line carries an
id, a name or anything else the data controls. The index is the only handle the
shape hands you.

**The persistence problem.** [ADR 0034](0034-cook-mode-overlay-and-wake-lock.md)
explicitly rejected persisting the step index: *"a recipe reopened a week later
that resumes at step 7 is a bug wearing a feature's clothes."* The roadmap now
asks for state that survives a phone call. Both cannot be taken literally at
once.

## Decision

**1. The line is keyed on a hash of its own text, never on its index.** An
inserted ingredient shifts every index below it, and a tick that slides one row
down does not read as a bug — it reads as "I already added the salt" pointing at
the sugar. In a kitchen that is a ruined dinner, not a nuisance. Keying on the
text instead means a line that MOVES keeps its tick, a line that is EDITED
quietly loses only its own, and a line that is DELETED takes its tick with it —
each of which is the answer a reader would give. Two lines with identical text
share one tick, which is also the answer a reader would give. The hash is
FNV-1a/32, stated in `checklist.js` as what it is: a short stable key, never a
security primitive.

**2. The RAW line is hashed, never the rendered one.** Steps and ingredients go
through `convertTemperatures` ([ADR 0029](0029-unit-display-preference.md)), so
the words on screen change when the reader flips to imperial. Hashing what is
displayed would silently drop every tick on a units change — a bug nobody would
attribute to the units toggle. Every caller passes the line as the data holds
it and renders the converted one beside it.

**3. It persists, and it expires after twelve hours.** ADR 0034 was right and
so is the roadmap, because they are about two different facts. *Where I am* is a
position, and resuming a week-old position is a lie about what you were doing.
*What I have already put in the bowl* is a fact about the food in front of you,
and losing it to a phone call is exactly the failure the bullet names. So ticks
survive a reload, a phone call and closing cook mode — and a record untouched
for twelve hours is dropped the next time the store is read from disk, so a
recipe cooked twice never starts half-ticked. Expiry is evaluated on read from
disk only, never on a timer: a page left open all afternoon must not have its
ticks vanish mid-stir.

**4. Per-profile storage, by the house convention, and NOT in
`SCOPED_BASE_KEYS`.** `faves.checklist.v1` is read through
`profileScopedStorage()` exactly as favourites, ratings and settings are — what
you have already done is yours, not the next person's. It is deliberately absent
from `SCOPED_BASE_KEYS`, which is the list `personal-data.js` exports, imports
and purges by name: half-finished cooking progress with a twelve-hour life is
not part of anyone's personal record, and putting it there would have added a
`checklist` field to every backup that the import path then ignored — an
asymmetry dearer than the thing it carried. What it costs is the profile-delete
purge that list also drives; the twelve-hour clock covers that, and
`collectPersonalData`'s catch-all still carries the raw key through a backup, so
nothing is silently lost.

**5. The store re-points itself on a profile switch, rather than waiting to be
told.** Every other per-profile store is reloaded by `reloadProfileStores()`,
whose ORDER is load-bearing — settings must go last, because its subscribers
drive the allergen re-render. A tick has no such constraint, so `checklist.js`
subscribes to the profile registry itself. That makes it correct on every
screen, including the ones that never learned to pass it along.

**6. The strike-through is CSS, and that is load-bearing.** In cook mode the
ingredient lines sit inside an `aria-live="polite" aria-atomic="true"` region.
Toggling a class there is a DOM mutation, and a DOM mutation there re-reads the
whole step aloud on every tick. Setting a checkbox's `checked` PROPERTY mutates
nothing, so `.tick:has(.tick-box:checked)` does the styling and the screen
reader stays quiet. `cook_check.mjs` asserts this by comparing the live region's
markup byte for byte before and after a tick.

**7. Reading a step aloud is offered, never assumed, and cancelled on every
exit.** `speechSynthesis` is in the browser, so it adds no dependency to the
code — **but several platforms fetch their better voices from a server, so it
may add one to the runtime.** That is stated in `cook.js` and in the guard's
header rather than dressed up as offline text-to-speech; the words stay on
screen regardless. It speaks only on an explicit tap, one utterance at a time,
and stops on a second tap, a step change, closing cook mode and `pagehide` —
because speech belongs to the browser rather than to the document, so a leaked
utterance keeps talking at whatever page you open next. That is ADR 0034's
unreleased wake lock wearing a different coat, and it is treated with the same
seriousness. A browser without the API gets **no control at all**, never a dead
button.

## Rejected

- **Keying a line on its index.** The obvious answer, and the one that fails
  silently: see decision 1. It is also what a stored `[0, 3, 7]` would tempt the
  next session into, which is why the reasoning is in the module header and not
  only here.
- **Keying on the index plus a whole-recipe fingerprint**, discarding every tick
  when the recipe's shape changes. Safer than a bare index and worse than the
  text hash: a typo fixed in step 7 would wipe your ingredient ticks mid-cook,
  where the text hash loses only the line that actually changed.
- **Never expiring.** It is what "survives a phone call" literally asks for, and
  it delivers ADR 0034's exact complaint one week later.
- **Expiring immediately — ticks that live only as long as cook mode is open.**
  That is a session, not a checklist, and it fails the bullet's own test: a
  phone call closes nothing, but a reload after one would.
- **Auto-ticking a step when you tap Next.** Tempting, free, and a guess about
  intent: Back and Next are navigation, and someone reading ahead would come
  back to a recipe that claims they cooked it.
- **Putting the tick boxes on the Cook at Home list's expanded `<details>` as
  well.** Only because `menu.js` was held by another session for a wide refactor
  at the time. Nothing in this design prevents it — `tickRow(rid, kind, raw,
  display)` is the whole API and the list already has the venue id to hand.
  Recorded so the next session does it rather than redesigns it.
- **Voice recognition** ("Faves, next step"). Already rejected in the roadmap's
  own research pass and not revisited: unreliable in a noisy kitchen and, on
  most platforms, a network round-trip.

## Consequences

- `site/js/checklist.js` (store, pure + injected) and
  `site/js/checklist-ui.js` (the control), both added to the shell precache;
  `createSpeaker` joins `cook.js` beside the wake lock, for the same reason —
  it is a lifecycle, not a call. `SHELL_VERSION` → `2026-08-16.71`.
- Two surfaces carry it: the **recipe page** (every ingredient, every step, plus
  a reset) and **cook mode** (the step's own ingredients, a "Step done" tick, a
  reset and Read aloud). Both entry points into cook mode reach the same
  checklist, which `cook_check.mjs` asserts by opening the recipe from the Cook
  at Home list and finding the tick made from the recipe page still there.
- `tools/cook_check.mjs`: **42 → 57 assertions as run** (ADR 0039's stated 36
  is the count at the time; several blocks are conditional on the fixture), with
  `speechSynthesis.speak`
  and `.cancel` instrumented at the real API alongside the wake lock. Two new
  gaps are declared in its header rather than papered over: whether a voice was
  fetched over the network, and whether `pagehide` really stops speech on a
  navigation (a headless browser has the API and no voice, so its `speaking`
  flag is never true and an assertion there would pass either way).
- **Proven to bite: all fifteen new assertions were seen to fail, under
  fourteen deliberate breaks, each reverted.** Removing the
  focus hand-off before the ingredient list is rebuilt → the focus assertion
  (plus two cascades, because the arrow keys die with the focus); toggling a
  class inside the live region → the byte-for-byte markup assertion, alone;
  never writing to storage → the reload assertion; not re-pointing the step tick
  → the step-tick assertion; a `clear()` that does nothing → the reset
  assertion; cook mode forgetting which collection it is in → the two-entry-
  points assertion, alone; the recipe page not following the store → the live
  cross-surface assertion; dropping the row's 44px minimum → both tap-target
  assertions; rendering the method without tick rows → the coverage assertion;
  and for speech: no cancel on a step change, no cancel on close, a button built
  where there is no API, speaking on open, and an utterance without its step
  number → one assertion each, exactly the intended one.
- Six new chrome strings in `reo.js`, English plus a te reo Māori draft.
