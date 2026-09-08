# 0103 — The picker names a substance once, and the two fish tags stay independent

**Status:** accepted
**Date:** 2026-09-08
**Extends:** [0095](0095-an-add-on-carries-both-axes.md) — its §1 independence
rule is the thing this record exists to protect, not to soften ·
[0092](0092-an-add-on-option-states-what-it-is.md) — the `has-*` vocabulary
whose one two-tag substance this is about

## Context

Roadmap `200/050` merged the allergen sentence and the contradiction sentence
when they said the same clause twice, keyed on `(option, TAG)`. It deliberately
left one shape standing, and filed it as `200/070` with the measured string.

**Measured verbatim in headless Chrome at 390 px, `contains-fish` in Settings'
avoid list, Sprig & Fern Tawa's *Potato, Rosemary + Basil Pesto*
(`["v", "gf-option", "contains-nuts"]`), ticking Salmon
(`["has-fish", "contains-fish"]`):**

```
"Salmon contains fish — you asked to avoid it. Salmon is fish, so this is no
 longer vegetarian. Salmon isn't tagged gluten free, so that label describes
 the dish as listed."
```

One option, one fish, two sentences opening with it. `050`'s merge cannot see
it: the allergen half comes from `contains-fish` and the contradiction half from
`has-fish`, so keyed on the literal tag they are two different facts.

**And they are two different facts, in the model.** ADR 0095 §1 writes them from
two independent rules on the same evidence, neither reading the other's tag,
because making the allergen a consequence of the dietary marker is what Theme 5
item `010` forbids. Nothing about that is wrong. What is wrong is only that a
reader told about fish twice has been told about fish twice.

**How wide, swept over the whole corpus 2026-09-08** — 57 venues, 2,866
(dish, option) combinations, `composeTags` and the picker's own
`warningLines` driven directly, both avoid states:

| | before | after |
|---|---|---|
| warnings naming one substance two ways | **22** | **0** |
| distinct (dish, option) pairs | 11 | 0 |
| venues | 2 (`crepes-a-go-go`, `sprig-and-fern-tawa`) | — |

11 pairs × 2 avoid states = 22, because the unflagged branch repeats it too
(*"Salmon contains fish. Salmon is fish, so this is no longer vegetarian."*) —
the same reasoning that made `050` fix both branches rather than only the one a
reader with a declared allergy sees. 13 (dish, option, claim) triples, since two
of the eleven kill `v` **and** `vg-option`.

**Fish is the only substance in the vocabulary carried by two tags.** `has-meat`
has no `contains-meat` — ADR 0092 rejected one and this record does not reopen
it — so meat cannot make the shape. The corpus sweep found exactly one other
option carrying a `has-` and a `contains-` tag at once: Little Sprig Seatoun's
*Cheese & beef gravy* (`contains-dairy` + `has-meat`), which is **two**
substances and correctly stays two sentences.

## Decision

**The picker keys its merge on the SUBSTANCE, through a map that exists in one
place and means one thing.**

```js
const SUBSTANCE = { "has-fish": "fish", "contains-fish": "fish" };
const factKey = (from, tag) => `${SUBSTANCE[tag] || tag} ${from}`;
```

```
BEFORE  "Salmon contains fish — you asked to avoid it. Salmon is fish, so this
         is no longer vegetarian. Salmon isn't tagged gluten free, so that
         label describes the dish as listed."
AFTER   "Salmon contains fish — you asked to avoid it, and this is no longer
         vegetarian. Salmon isn't tagged gluten free, so that label describes
         the dish as listed."
```

Both facts survive — *you asked to avoid it* and *the vegetarian claim is gone*
— the allergen half still leads in the words a scanning reader is looking for,
and the dish's unrelated absence sentence is untouched. Three sentences became
two, not one.

🛑 **The whole safety of this rests on one distinction, so it is stated here
rather than left in a comment.** `SUBSTANCE` is a **presentation-layer
equivalence**: it decides which two SENTENCES are one sentence, and it does
nothing else. It is consulted in exactly one expression, `factKey`. It does
**not** relate the two tags:

- `composeTags` still reports `contains-fish` in `added` and `has-fish` as the
  contradicting tag, unchanged and different from each other;
- `has-fish` alone still adds **no** allergen — the picker still says *"Salmon
  is fish, so this is no longer vegetarian"* where no allergen line exists;
- `contains-fish` alone still puts **no** `has-fish` on the composed tags;
- the tagger still writes both from two independent rules
  (`test_tag_addon_options.py`'s two breakers, ADR 0095 §1).

All four are **asserted**, in `tests/addon-warning.test.js`'s last test, which
names itself *THE DATA RULE IS UNTOUCHED* so a future session reading only the
test list can see the guard exists.

**A second thing the substance key buys, unasked.** `composeTags` picks the
contradicting tag with `find` over the **option's own** tag array, so whether
the drop reports `has-fish` or `contains-fish` depends on the order the venue's
transcription happened to write them in. Keyed on the tag, only one of the two
orders merged — a latent data-order dependency in a safety sentence. Keyed on
the substance, both do, and a unit test pins it.

**`warningLines` is now exported and pure.** Every sentence the picker says is
built there; `refresh()` renders what it returns. That is what let the claim
above be measured over the real corpus with the real code instead of a replica
of five loops — a second implementation of a safety sentence would read correct
in every diff and be updated in one place.

## Rejected

- **Prefer the allergen tag when both are present** (the item's option 2), so
  `composeTags` reports the drop as `contains-fish` and `050`'s merge fires
  unchanged. Smaller, no new map. It changes `addons.js`'s reported `allergen`
  field, which `addon_check` and the *"Salmon is fish"* wording both rest on —
  and *"Salmon is fish"* is the sentence 14h was built to produce. It moves the
  fix into the layer the independence rule lives in, to fix a problem that is
  entirely about words.
- **Derive one tag from the other.** Already rejected by ADR 0095, still
  rejected, and named here because the map above is the nearest thing to it in
  the codebase and is the obvious place for a future session to reach when it
  wants the derivation.
- **Leave it** (the item's option 3). Defensible — the two sentences say
  different things about the same fish, and one of them is the allergen the
  reader asked about. It is the same complaint the owner made about `050`, one
  step further out, and he recommended fixing it.
- **Say *"Salmon is fish — you asked to avoid it, …"***, keeping 14h's
  fact-shaped voice on the merged sentence. It weakens the allergen half, which
  `050`'s ruling explicitly forbids: *contains &lt;allergen&gt;* is the phrasing
  used by all nine allergens and the one a reader scanning for their own is
  looking for. The cost is real and is recorded: on the 11 merged pairs the
  words *"is fish"* are no longer printed. They still are wherever no allergen
  line exists to merge with — a dish that already declares `contains-fish`, and
  every `has-meat` option.

## Consequences

- `SHELL_VERSION` moves; no file under `site/data/` changed, so `DATA_VERSION`
  does not.
- `addon_check.mjs` gains **6** assertions (37 → 43), on the row it already
  ticks Salmon on. Counted rather than matched, following the convention `050`
  set: a merge that appends the consequence and forgets to delete the old
  sentence passes an `includes` and fails a count. One of them is an absence —
  *"Salmon is fish" is gone* — and one is a control on the dish's unrelated
  absence sentence, so a merge that ate one sentence too many cannot pass.
- **Break-probed**, by reverting `factKey` to the tag form: it reproduces the
  measured string byte for byte and fails **4** of the 6 new browser assertions
  with **39 passing and nothing pre-existing broken**, plus 6 of the 10 new unit
  tests. ⚠️ **The other two pass in BOTH states and are therefore not
  break-proven by that probe** — *the allergen clause is said once* (it was
  already once; the repeat was *"Salmon is fish"*, a different clause) and *the
  allergen half still leads* (it led before). They guard a different future
  change, and that is said here rather than left to be assumed.
- `tests/addon-warning.test.js` is new: 10 tests over the exported
  `warningLines`, in CI, covering the shapes the browser check cannot afford to
  drive — the `or` fold across the substance map, two substances on one option,
  the per-option key, the unflagged branch, and the data rule above.
- **Two pre-existing observations, measured while sweeping and left alone**,
  both in `composeTags` and neither a repetition: an option carrying two
  contradicting tags reports only the **first** per claim, so *Cheese & beef
  gravy* on a `vg`-only dish says dairy and never says meat; and with two fish
  options on one plate, `seen` and the `break` mean only the first is named.
  Both are defensible as they stand and neither is this item's question.
