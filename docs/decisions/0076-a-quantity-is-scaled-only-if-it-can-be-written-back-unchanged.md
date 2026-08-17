# 0076 — A quantity is scaled only if the parser can write it back unchanged

**Status:** Accepted.

**Date:** 2026-08-16

## Context

ROADMAP 17a asks for a ½ / 1× / 2× control that rescales a recipe's
ingredients. Today an ingredient is a plain string — `"1½ cups (375 ml) white
sugar"` — so something has to turn that prose into a number.

The roadmap's own recommendation was **structured data**: split each line into
`{ qty, unit, item, note }`, keep the original string alongside, and have the
owner author it. Its reasoning was about stakes, and the stakes are real:

> parsing NZ home-recipe prose … at render time will be wrong often enough to
> be worse than useless, and a wrong quantity in a recipe is a ruined dinner.

That framing offers two options, and both have a real cost:

- **Structured data** is a field on every one of 204 ingredient lines, in
  `site/data/`, which [ADR 0047](0047-the-app-ships-only-what-it-renders.md)
  precaches to every phone whether a screen reads it or not. It also needs a
  hand pass over 24 recipes before the feature does anything at all, which is
  the same sequencing trap that has left `picks` empty on 44 of 55 venues and
  `serves` set on 3 of 24.
- **Render-time parsing**, as the roadmap says, ships whatever the parser
  believes, and nobody is watching.

**The measurement that reframed it.** Running a parser over the corpus (204
lines, all 24 recipes) rather than reading it: **7 lines carry a second number**
and every one of them is a silent-corruption case. A range doubled to
`"12–8 garlic cloves"`. `"2 shallots, chopped (or 1 medium red onion)"` doubled
its shallots and left the bracket offering one onion — the amount right, the
advice wrong. None of these was predicted by reading the file; all were found
by running against it.

🔑 **But the same exercise shows what the two options have in common: neither
one is a check.** Structured data is trusted because a human typed it;
render-time parsing is trusted because a regex matched. Neither can *tell* you
it got a line wrong. That is the actual gap, and closing it is cheaper than
either option.

There is a precedent in this repo for the shape of the answer.
[ADR 0029](0029-unit-display-preference.md)'s oven-temperature
rewrite is render-time parsing of the same recipe prose, and it is safe because
its pattern is the tightest one that can do the job — the literal `°` sign — and
because it was **proven against all 459 strings**: exactly the 14 temperatures
change, every other string byte-identical. What made that safe was not the
structure of the data. It was the proof.

## Decision

**A line is scaled only if the parser can rebuild it, byte for byte, at 1×.**

`scaleLine()` parses the leading quantity, re-writes it at scale 1, and compares
to the input. If the round trip is not character-identical the line is returned
**unchanged at every scale**. The parser is therefore not trusted — it is
*tested*, on every line, on every render, by a check that cannot pass unless it
genuinely understood what it read. A pattern it half-recognises fails the round
trip and is left alone.

Three supporting decisions fall out of it:

**1. Exact rationals, never floats.** A quantity is an integer numerator over an
integer denominator. ⅓ of 1½ is `0.49999999999999994` in binary floating point,
and a recipe that prints `0.5 cups` where it means `½ cup` has lost the reader.
Nothing is approximated until it is formatted, and formatting snaps to the
fractions a measuring cup actually has — halves, thirds, quarters, eighths.
A value that lands outside them (⅓ halved is ⅙) is **refused, not rounded**.

**2. Three statuses, and the third is the point.** `none` — no quantity here
(`"Pinch of salt"`), correct unchanged, needs no warning. `scaled`. And
`blocked` — there **is** a quantity and we refused it.

> 🚩 A blocked line inside a scaled recipe is a **half-scaled recipe**: the
> flour doubled, the chocolate did not, and nothing on screen says so. That is
> worse than refusing to scale at all, because it looks finished.

So `blocked` is marked on screen, in words as well as colour (WCAG 1.4.1), and
counted in a note above the list. Collapsing it into `none` would bury the ~10
dangerous lines inside the 42 harmless ones.

**3. Only the LEADING quantity moves.** A scaler that took the last number
prints `"cut into 12 wedges"`; one that took the largest prints
`"1 x 18-inch pie crust"`. Both were live possibilities, and both are absurd.

**What is refused, and why each one is on the list.** Every entry here printed a
wrong number before the guard existed:

| Refusal | What it printed |
|---|---|
| a range | `"6–8 garlic cloves"` → `"12–8"` |
| an alternative with its own amount | `"2 shallots (or 1 medium red onion)"` → 4 shallots, still one onion |
| a metric bracket that will not divide | half of `"½ cup (125 ml)"` is 62.5 ml |
| a countable off a whole number | `"1½ eggs"` |
| a value with no kitchen fraction | ⅙ |

The metric bracket is the subtlest and the most important. A line that scaled
its cups and kept its millilitres — `"1½ cup (190 ml)"` — contradicts itself on
screen, and of the two numbers **the reader will believe the precise-looking
one**. So the bracket blocks the whole line rather than half of it.

**Cooking times are never scaled.** The owner's ask was *"adjust ingredients and
**where we can** the timing"*, and "where we can" is narrower than it looks: a
double mixture in a deeper dish takes longer but not twice as long, and for
anything meat-based an under-scaled time is a food-safety failure rather than a
disappointing dinner. `time` is restated unchanged at every scale.

**The scale is not persisted.** [ADR 0034](0034-cook-mode-overlay-and-wake-lock.md)
refused to persist cook mode's step index because *"where I am"* is a position
rather than a fact. A recipe reopened days later at 3× is the same bug wearing
the same feature's clothes.

## Consequences

**Measured over all 204 corpus lines:**

| | scaled | no quantity | blocked |
|---|---:|---:|---:|
| 1× | 204 byte-identical | — | — |
| 2× and 3× | 158 | 42 | **4** |
| ½× | 146 | 42 | **16** |

**Correction (added 2026-08-17):** the `CONJOINED_QTY` guard shipped after
this table was measured (added by this repo's own 2026-08-17 cold review —
see the comment beside it in `quantity.js`), and it moves one line from
scaled to blocked: *"1 can coconut cream and 1 can coconut milk"*. Re-run
against the corpus at 2× and 3×, the row is now **157 / 42 / 5**; ½× is
**145 / 42 / 17**. Verified directly against `site/js/quantity.js` and
`site/data/restaurants/cook-at-home.json`, 204 lines total either way.

20 of 24 recipes double with nothing blocked; 14 of 24 halve. **Halving is where
the difficulty lives** — doubling is nearly free, because doubling a fraction
usually leaves a fraction a kitchen owns and halving usually does not.

**Some lines never scale, and that is correct.** `"Pinch of salt"`, `"Garlic"`,
`"Water or milk, as required for a thick batter"` — 42 lines have no quantity to
double and are right unchanged at any scale. That is not a gap to apologise for;
it is what a cook does with them anyway.

**What structured data would still have bought, and what it would not.** It
would let the owner override a line the parser reads wrongly — but a line read
wrongly cannot survive the round trip, so the override has nothing to correct.
It would also let him state a quantity the prose does not carry (`"Garlic"` →
2 cloves), and **that remains genuinely unavailable here**. If he ever wants it,
the structured field is additive: a line that carries one uses it, everything
else falls back to this. Nothing decided here forecloses it, and ADR 0047 says
the field ships when a screen renders it and not before.

**The tick key is untouched, by design.** `checklist.js` already requires
*"HASH THE DATA, NEVER THE RENDER"* because a metric/imperial flip changes the
words on screen. A scale change is the same class of event and goes through the
same seam: `line.key` stays raw, only `line.text` moves. Tick an ingredient at
2×, drop to ½×, the tick is still there — and `recipe_check.mjs` asserts it,
because that failure would be **silent**.

**This unblocks 18b more than it unblocks itself.** 18b (metric/imperial recipe
quantities) was recorded as blocked on 17a's schema. It is not: the seam it
needs is the one built here, `format(quantity, {scale, units})`, and the corpus
measurement it needs is now on the table — **cup and spoon units are 55% of all
unit-bearing lines**, a US cup is 240 ml against an NZ cup's 250 ml, and the
only in-corpus evidence of which the owner means is a parenthesis
(`"¾ cup (190 ml)"` implies a 253 ml cup, i.e. NZ). 18b needs that as data, not
as inference. 36b's `uses: [{ ingredient, amount }]` still needs its own schema
and is not affected either way.

**What a green test run here cannot show.** That a scaled quantity is *right* —
`recipe_check` asks `quantity.js` what a line should become and checks the page
agrees, so a parser confidently wrong passes in perfect agreement with itself.
The defence against that is the round trip and 23 unit tests whose expectations
were hand-checked against the corpus. And nothing here can tell you whether
doubling a recipe makes good food.
