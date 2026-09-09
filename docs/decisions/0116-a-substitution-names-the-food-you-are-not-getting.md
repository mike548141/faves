# 0116 — A substitution names the food you are NOT getting

**Status**: accepted
**Date**: 2026-09-09
**Amends:** [0097](0097-a-hedge-is-not-a-warning.md) — a second per-match
cancellation beside the hedge, built to the same rule that a cancellation may
never become an item-level veto · no change to
[0025](0025-infer-allergens-by-default.md)'s one-way rule

## Context

BurgerFuel's menu carries a **Bun swaps** section. One of its two rows is

> **Gluten friendly bun** — *"Switch the wholemeal bun for a gluten friendly
> bun. Not a dedicated gluten free kitchen."* — tags `["gf-option"]`

The owner ruled the `contains-gluten` tag off that row on 2026-09-09 (roadmap
`080/210`), and it came off. But **the tagger proposed it straight back**, and
`validate.py` — the first entry on CLAUDE.md's mandatory verify list — printed

> `warning: [burgerfuel] Gluten friendly bun: missing contains-gluten (DERIVED —`
> `a wheat bakery item (bun)) — run tools/tag_allergens.py`

so the corpus's warning count went **74 → 75** and the extra line was a standing
instruction, on the one gate nobody skips, to re-land a false gluten warning on
the row a coeliac is hunting for. A session chasing a clean warning list would
have done it in good faith and the diff would have read as tidying up.

ADR 0097's hedge cannot reach it. The hedge cancels the match the negation
stands in front of, and here the negation qualifies the **other** bun, five
words later. The words *"wholemeal bun"* really are in the description and a
wholemeal bun really is wheat. What is false is that **this row contains it**:
the row IS the swap, and the wholemeal bun is the thing being taken away.

**That is a fact about grammatical position, not about vocabulary, so no word
rule reaches it** — which is why roadmap `080/220 §3` offered four options and
recommended none.

## Decision

**A rule word that stands in the swap-AWAY half of a substitution is not
evidence that the dish contains it — but only when the same food is named on the
far side of the swap.**

### 1. Per-match, never per-item

`swapped_away(pattern, text, match)` cancels the single match that sits inside a
`switch/swap X for/with Y` construction's `X`. `first_unhedged` walks on to the
next match, exactly as it does for a hedge. Roadmap `080/220 §3`'s option (2) — a
**name-level veto** — and option (3) — a `noTags` **data field** — are both the
item-level veto ADR 0097 refused, one at the rule and one at the schema. On a
future row reading *"Gluten free base — served with garlic bread"* both lose the
garlic bread, and option (3) also fails ADR 0047's *name the screen that renders
it* (none does).

### 2. 🛑 The MIRROR CONDITION is the safety argument, not a refinement

Grammar alone would have traded the over-warning for a **miss**, which is the one
direction this tool may never move. These two sentences are the same shape:

| sentence | what the dish arrives as |
|---|---|
| *"Switch the wholemeal bun for a gluten friendly bun"* | the row **is** the swap — no wholemeal bun |
| *"Grass fed beef, cheddar, pickles. Swap the bun for lettuce"* | the default **has** the bun; the swap is an offer |

Nothing grammatical separates them, so grammar is not allowed to decide alone. A
match is cancelled **only when the food named after the pivot is the same food**
(plural-tolerant string equality on the two matched words). The destination then
decides:

- *"…for a **gluten friendly bun**"* — same food, so cancel; the destination's
  own bun is hedged, so no tag. ✅ the fault fixed.
- *"…for a **milk bun**"* — same food, so cancel; the destination's bun is
  unhedged and `first_unhedged` returns it. **The tag stands**, and the dairy in
  the milk with it.
- *"…for **lettuce**"* — not the same food, so **nothing is cancelled** and the
  warning stays. This is the fail-safe default.

🔑 **The invariant that falls out of it: a tag can only be lost here when the
venue has printed a free-from claim about the swap DESTINATION**, because any
unhedged destination match is still returned. The guard cannot reach further
than ADR 0097's hedge already does.

🔑 **And it answers the objection that refusing to infer errs toward a miss.**
It does not: the swap-**TO** half is read exactly as it would have been anyway,
so a hypothetical *"Switch the bun for a brioche bun"* still gains its gluten,
and *"Switch to a brioche bun"* — which has no swap-away half at all — is left
entirely alone.

### 3. Two verbs, because two verbs is what the corpus writes

Swept 2026-09-09 over all 57 records and **5,844** name / description /
ingredient / section-note / add-on-option / `alt` strings, for `switch`, `swap`,
`replace`, `substitute`, `instead of`, `sub`, `upgrade`, `change to`, `in place
of`, `in lieu of`, `exchange`, `rather than`, `without` and `hold the`:

| form | strings | reaches an allergen word in the swap-away half? |
|---|---|---|
| `switch` | 1 | **yes — the BurgerFuel row** |
| `swap` | 2 | no (both section notes; see below) |
| `instead of` | 2 | no (`crostini` is not a rule word) |
| `upgrade` | 4 | no — all four are swap-**TO** |
| `substitute` (noun) | 6 | no |
| `sub` (the sandwich) | 4 | no |
| `without`, `make it`, `rather than` | 18 | no |

37 strings carry any of the forms; **exactly one is a substitution reaching an
allergen word.** `switch` and `swap` are therefore the only verbs admitted —
ADR 0097 §3's rule, applied to verbs instead of hedges: *adding a form no venue
writes is how a guard starts looking thorough while covering nothing.*

🛑 **`substitute` is refused on its own merits and it is not an oversight.**
English uses it in **both** directions — *"substitute margarine for butter"*
means use the margarine — so its object cannot be read positionally at all, and
a guard that read it would cancel the food you ARE getting about half the time.

### 4. `--swaps`, for the same reason `--compounds` exists

A hand-written verb list is **silent** about the phrase that lands after it was
written (ADR 0110). `tools/tag_allergens.py --swaps` prints every
substitution-shaped phrase in the corpus, whether the guard read or refused it,
and which matches it actually cancels. Today: **15 phrases, 3 read, 1 cancelled.**
A refusal costs an over-warning — visible as a dry-run proposal — never a miss,
so silence here fails safe; the report is what makes it falsifiable rather than
merely quiet.

### 5. The REVIEW bucket is untouched, deliberately

`read_section_note` filters only `writable` through `first_unhedged`, so a swap
clause a person should see still reaches them — ADR 0097 §4's decision,
unchanged. Rock Yard's *"Swap roti for veggie soup for a gluten-free option"* is
read by the guard, cancels nothing (no `roti` after the pivot) and stays in the
report.

## Alternatives rejected

- **Leave it** (`080/220 §3` option 1). The tag is off the row and the proposal
  is visible, which is the state ADR 0097 shipped for three months. Refused
  because it is no longer only a dry-run line: `validate.py` carries it, and
  "a person refuses it each time" is a much weaker promise on the gate every
  session runs than on a tool nobody runs by accident.
- **A name-level veto** (option 2). Costs **zero tags today**, and that zero is
  borrowed: 12 of the corpus's 14 hedged-name dishes carry `gf`, so
  `CONTRADICTED_BY` is already doing the work. On its own merits it is the
  item-level veto ADR 0097 refused.
- **A `noTags` / `tagsFinal` data field** (option 3). A new field in
  `site/data/`, downloaded by every phone, that no screen renders — ADR 0047
  refuses it — and it records a ruling without recording a reason, so the next
  venue with a bun swap rebuilds the same gap.
- **Treat "Bun swaps" as a section the tagger must not read** (option 4). A much
  bigger question about what `menu[].items[]` means, and one this repo does not
  own alone; it would also silence a modifier row that genuinely adds an
  allergen ("Add satay +$2").
- **Cancel on grammar alone, with no mirror condition.** One line shorter and it
  loses *"Swap the bun for lettuce"*. Break-probed: removing the mirror fails
  *"a swap names the food you are NOT getting"* and nothing else.
- **Run the away-span to the end of the sentence.** The veto in disguise — it
  swallows the destination match along with the source, so *"…for a milk bun"*
  goes silent about the bun you are actually served. Break-probed; fails the
  real-record case as well as the probe group.

## Consequences

- **Dry run: 1 proposal → 0.** `validate.py`: **75 warnings → 74**, and the one
  that goes is the instruction to re-land the false tag.
- **No tag changed on disk and no file under `site/` changed**, so neither
  `DATA_VERSION` nor `SHELL_VERSION` moves. `check_versions.py --range` agrees.
- **Measured, not reasoned: with every tag in the corpus CLEARED, the old rules
  make 3,213 findings and the new rules make 3,212.** The one difference is the
  BurgerFuel row. **Zero findings gained, zero others lost** — which is the only
  form of this claim that could have caught a regression on the other 3,211.
- `test_tag_allergens.py` **81 → 90 cases**: two real-record cases on
  `burgerfuel.json` (both carrying the Bambina proof-of-write, because an
  absence assertion is satisfied perfectly by a tool that has stopped writing),
  an eight-line probe group, and **six breakers** — the guard off, the mirror
  removed, the span run on, `substitute` admitted, the word cap lifted, and
  `switch` dropped from the verb list.
- 🚩 **One probe was wrong on first write and the breaker caught it.** *"Buns
  can be swapped. …"* kept its gluten from the word **Buns** in its own first
  clause, so the word-cap breaker passed with the bug back. Reworded to *"Speak
  to staff to swap. …"*. The lesson is ADR 0114's, one file over: a probe line
  must make the mechanism under test the **only** thing that can produce the
  answer.
- 🤔 **The word cap (`SWAP_AWAY_MAX_WORDS = 5`) is defence in depth and nearly
  unbreakable.** Because the mirror condition already requires a same-food match
  after the pivot, a run-on span almost always leaves that match standing.
  Its one real failure mode — and its breaker — is a destination match that is
  itself hedged, where the tag is lost rather than re-found.
- 🚩 **Filed, not fixed.** `charley-noble`'s two *"…with gluten-free bread
  instead of crostini"* rows are the same class read by a different verb.
  Nothing changes for them today (`crostini` is not a rule word and both rows
  are hand-tagged), and `instead of` is not admitted because no corpus row needs
  it. If `crostini` is ever added to the wheat rule — ADR 0097 already filed
  that — this decision has to be revisited in the same commit.
