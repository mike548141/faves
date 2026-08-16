# 0066 — An estimated duration drives a timer, marked as an estimate

**Status:** accepted
**Date:** 2026-08-16
**Supersedes in part:** [0064](0064-an-estimate-carries-its-working-and-never-a-timer.md)
— its decision 2 ("an estimated duration may never drive a timer") and the
`timerSafe` field that enforced it. Decision 1 (every estimate is recorded with
the working that produced it) and decision 3 (`null` is a legitimate answer)
stand untouched, as does everything in `data/estimates/` except that one field.

## Context

ADR 0064 landed the estimates record on 2026-08-16 carrying a rule its own text
flagged as unsettled: only a duration the recipe itself states may drive a
per-step countdown. Every step estimate carried `timerSafe`, true only where
`source == "stated"`, and `tools/recipe_estimates.py --check` exited 1 on any
other combination.

That restriction was the assistant's, not the owner's. 0064 recorded it as
"raised with the owner rather than assumed either way; the restriction holds
until he says otherwise".

**He has ruled otherwise, with the food-safety argument in front of him.** The
concrete case was put to him — an estimated 20-minute simmer on chicken thighs,
where a wrong number is a food-safety failure rather than a disappointing
dinner — alongside a middle option that split on `phase` instead of on source,
so that estimated `prep` times could run a clock and estimated `cook` times
could not. He took the widest option deliberately. The concern is recorded here
because a record that hid it would misdescribe how the decision was reached; it
is not re-argued anywhere else in the repo.

## Decision

**The owner's ruling, verbatim (2026-08-16):**

> Estimates drive timers too, clearly marked — every step gets a countdown;
> estimated ones are labelled as estimates on the timer face.

**1. Every step carrying a `minutes` value is timer-eligible.** Source no longer
gates the countdown. That covers 115 of the 118 recorded steps; the three with
`minutes: null` render no time and offer no timer, exactly as before.

**2. `timerSafe` is retired, not inverted.** Under the ruling it would read
`true` on all 115, and a field with one value tells a renderer nothing. What the
renderer actually needs is already recorded beside it — `source`, which is the
thing the timer face has to display. The field is gone from all 118 steps in
`data/estimates/recipes.json` and from the tool.

**3. `minutes` with no `source` is the new hard failure.** It is the state the
ruling makes dangerous: a countdown would run with no way to know whether to
mark it an estimate. `--check` exits 1 on it and prints it above every other
failure, in the slot the old timer breach held. Proved by deleting the `source`
from the curry's estimated 20-minute simmer:

> 🛑 SAFETY: famous-brade-green-chicken-curry step 5 has minutes 20 but source
> None, not one of ['estimated', 'stated'] — its countdown would run with no way
> to mark it an estimate (see this tool's header)

Every other invariant is unchanged: a shipped recipe with no estimate recorded,
a step-count mismatch and a `stated` value the recipe text no longer supports
all still fail; a recipe held here but absent from the payload still warns at
exit 0, because the privacy split is the correct change and a gate that fires on
it is a gate nobody keeps green.

**4. "Clearly marked" is a requirement on the timer face, not on the step
text.** A countdown that looks identical whether its number was read off the
recipe or worked out by an assistant is not clearly marked — the cook watching a
clock is not reading the paragraph above it. So the marker rides the timer
itself, in text, and the render spec in `data/estimates/README.md` now requires
it there. No UI is built in this pass.

## Rejected

- **Invert the boolean — `timerSafe: true` everywhere.** The smallest diff, and
  it leaves 118 steps carrying a field that can only say one thing. A constant
  dressed as data is how a later session comes to believe a check exists.
- **Split on `phase` rather than on source** — estimated `prep` durations time,
  estimated `cook` durations do not. This was the middle option put to the owner
  and it is the one he did not take. Building it anyway would be substituting a
  preference for a ruling.
- **Keep the restriction pending further evidence.** His authority is absolute
  here and the argument was made before he decided, not withheld from him.
- **Mark the estimate in the step text only.** Cheapest to build, and it fails
  the ruling's own words: the label belongs where the number is counting down.
- **Delete `phase`, now that nothing gates on it.** It still describes what kind
  of step is being timed, cost nothing to keep, and removing a recorded
  observation to tidy up is how a record stops being one.

## Consequences

- 83 estimated step durations, 31 of them on `cook` steps, become
  timer-eligible. None is on a phone yet: `data/estimates/` is the record, not
  the payload (ADR 0047), and the render pass is still owed.
- The render spec in `data/estimates/README.md` gains a hard requirement — the
  estimate marker on the timer face — that the follow-on build must satisfy.
  `site/js/cook.js` and `cook-ui.js` are untouched here.
- `stepDuration()` in `cook.js` reads the recipe text, so it will already time
  the 32 stated steps and none of the estimated ones. Making every step
  timer-eligible therefore needs the per-step minutes to reach the payload,
  which ROADMAP 36b's step objects are the vehicle for. This ADR does not
  shortcut that.
- 0064's index entry points forward to this record. 0064 itself is unedited: its
  status stays accepted, because the half of it that still governs — an estimate
  carries its working — is the larger half.
- Should the owner reverse this, the reversal is a further ADR superseding this
  one, not an edit to it.
