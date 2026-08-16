# 0064 — an estimate carries its working, and never a timer

**Status:** accepted
**Date:** 2026-08-16

## Context

The owner asked for per-step times, recipe totals and serving sizes. ROADMAP
36a and 36c argued at length that they must not be invented: 90 of 118 steps
state no duration, 21 of 24 recipes state no serving count, and most of the
gaps are family recipes with no published source to check against. The
recommendation was to surface only what the text already carries and get the
rest from the owner.

**He ruled the other way on 2026-08-16: estimate them, and label them as
estimates.** That is his call and it stands. The question this record settles
is what "well" looks like when executing it.

Two things make an estimate different from a number the recipe states. First,
an estimate with no working is unarguable — nobody can check it, correct it, or
tell it from a fact a year later. Second, and unlike every other estimate this
repo holds, a cooking duration can hurt someone: an invented "simmer 20 min" on
chicken thighs is a food-safety failure, not a disappointing dinner. Stated
durations already drive the one-tap per-step timers (`stepDuration` in
`site/js/cook.js`), and nothing in the shape of the data distinguished the two.

## Decision

**1. Every estimate is recorded with the working that produced it**, in
`data/estimates/recipes.json` — the repo-only record, not the precached payload
(ADR 0047). Each value carries `*Source` (`stated` = the recipe says it,
`estimated` = we worked it out) and `*Working`, a sentence naming the numbers
used ("20cm tin stated in step 0; a 125g-butter batter cuts 8 slices").
`tools/recipe_estimates.py --check` re-parses the recipe text and rejects any
`stated` value the text does not support, and any `estimated` step whose text
*does* state a time.

**2. An estimated duration may never drive a timer.** Every step carries
`timerSafe`, true only where `source == "stated"`; `--check` exits 1 on any
other combination and prints that failure above all others. Every step also
carries a `phase` — `prep` (no heat on the food), `cook` (food in the heat),
`wait` (passive) — because an estimated `prep` time is harmless and an
estimated `cook` time is the risky class. 31 estimated durations sit on `cook`
steps today, and none of them may run a clock.

**3. `null` is a legitimate answer.** Three steps, two totals and two serving
counts carry `null` plus a reason. The ruling was "estimate them", not "leave
no field empty" — the slow cooker's "cook until tender" cannot be given a
number without also inventing whether it is set to low or high.

## Rejected

- **Put the estimates straight into `site/data/`.** Faster, and wrong twice
  over: the numbers would reach every phone before anyone could audit them, and
  the workings — which are the reviewable part — have no home in a payload that
  ships only what a screen renders (ADR 0047). The record first, the render
  after, is what makes the follow-on pass mechanical.
- **Let estimates drive timers like any other duration.** It is what the code
  would do by default, and it is the one failure mode here with a physical
  consequence. Raised with the owner rather than assumed either way; the
  restriction holds until he says otherwise.
- **Derive serving counts from the published recipes some of these adapt.** A
  serving count taken from a published recipe is a claim about *that* recipe,
  not this variant of it, and this dataset is public.
- **Estimate only the recipes that ship.** Five family-attributed recipes are
  due to leave the payload (Theme 11e). All 24 are estimated anyway: the record
  keeps everything forever, and `--check` warns rather than fails when a recipe
  it holds is no longer in `site/data/` — a gate that failed on the privacy
  split would be firing on the correct change.
- **Treat "for a minute" as unstated** because `cook.js` cannot parse it. It is
  the recipe stating a time, in words. Counting it gives 32 stated steps where
  ROADMAP 36a counted 28; the difference is exactly the four steps the timer
  regex cannot see, and calling them estimates would have mislabelled the data
  to match a tool's limitation.

## Consequences

- The corpus gains 19 estimated serving counts, 13 estimated totals and 83
  estimated step durations, each with its working, and none of them on a phone
  yet. `data/estimates/README.md` holds the render spec for the pass that
  changes that, including the label wording and which ADR 0047 test each
  proposed field passes.
- A recipe edited without its estimate being revisited fails `--check` on the
  step count, the stated value, or a missing entry. This is the same trade the
  price history makes: the record is only worth keeping if something notices
  when it drifts.
- The estimates are one assistant's, read off recipe text rather than measured
  by cooking the food. They must render labelled as estimates, never bare, and
  the recipes where the working rests on a single number are named in the
  README so the owner can replace them with real ones.
