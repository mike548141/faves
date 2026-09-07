# 0097 — A hedge is not a warning: the free-from case, then every add-on allergen

**Status:** accepted
**Date:** 2026-09-07
**Amends:** [0025](0025-infer-allergens-by-default.md) — its one-way rule gains
the one exception where adding a tag is not fail-safe ·
[0095](0095-an-add-on-carries-both-axes.md) — the sweep it measured and declined
is now taken, because the blocker it named is fixed · no change to
[0092](0092-an-add-on-option-states-what-it-is.md)'s refusal to promote a hedge

## Context

A **hedge** is a venue writing an allergen word in order to say the allergen is
**absent**: `Gluten free toast`, `No gluten added bun`, a description that reads
`No added gluten.` and nothing else.

`tools/tag_allergens.py` matched the word and never read the two in front of it.
Measured during the Simmer intake (roadmap `080/200`), not hypothesised: the
DERIVED rule *"a wheat bakery item"* fired on **toast** in a dish literally named
`Gluten free toast`, and on **brownie** and **muffin** in two cabinet items whose
whole description is the venue's own `No added gluten.` Three proposals, all
backwards. The `contains-fish` sweep of ADR 0095 found the same fault on the
other side of the corpus: 3 of its 8 add-on candidates were `"No gluten added
bun"` → `contains-gluten`.

🛑 **This is the one place ADR 0025's one-way rule stops being fail-safe.**
Everywhere else an inferred allergen is an over-warning: annoying, and nobody is
harmed — the water-chestnut case (`080/180`) warned a vegan side about tree nuts.
A hedge tag puts a **false gluten warning on the one item a coeliac is hunting
for**, and the way a reader "fixes" that experience is by learning to distrust
the gluten chips. The over-warning trains away the warning.

## Decision

### 1. Two narrow guards, and the second is not the first widened

**The obvious fix is an item-level veto — "skip any dish mentioning *gluten
free*" — and this repo has already paid for that shape once.** It trades an
over-warning for a **miss**, which is the direction the tool may never move:
*"Beer battered fish, gluten free chips"* loses the batter, and an option named
*"No gluten added bun with smoked salmon"* loses the salmon. So:

- **`hedge_before(tag, text, start)`** — a free-from claim for *that allergen*
  directly in front of *that match* cancels **that one match**, exactly as
  `(?<!water )chestnuts?` cancels one alternative of the tree-nut rule.
- **`declared_free(text)`** — a description clause that is **nothing but** the
  venue's own free-from claim (`No added gluten.`) is the venue speaking about
  the whole dish, read the way a `gf` tag is read by `CONTRADICTED_BY`. It is
  **per-allergen**, so the feta salad declaring no added gluten keeps its dairy.
  The full-clause anchor is the entire safety argument: *"sourdough toast, gluten
  free option available"* is not a bare declaration, so the toast keeps its
  warning.

**Written as a helper, not as `(?<!gluten free )` spliced into each pattern.**
The negation has to cancel every gluten alternative across **seven** rules;
seven hand-edited patterns are seven chances to miss one, and nothing would
report it.

### 2. `finditer`, never `search` — the guard that makes the guard narrow

`first_unhedged` walks **every** occurrence and returns the first one a hedge
does not cancel. With `search`, a hedged *first* match takes the whole rule down
with it and *"Gluten free pasta with wheat croutons"* loses the wheat. A
narrowing that is narrow in the regex and wide in the loop is not narrow.

### 3. The forms were swept out of the corpus, not guessed

57 records, every name / desc / ingredient line / section note / option name:

| form | occurrences |
|---|---|
| `gluten free` | 76 |
| `no gluten added` | 23 |
| `gluten-free` | 15 |
| `dairy free` | 10 |
| `no added gluten` | 9 |
| `dairy-free` | 8 |

**Nothing else of that shape exists** — no *wheat free*, *nut free*, *egg free*,
*soy free*, *sesame free*, *without gluten*, *free of dairy*, *non-dairy*,
*lactose free*, *gluten-less* or *low gluten* anywhere. Adding an entry is
cheap; inventing one no venue writes is how a guard starts looking thorough
while covering nothing.

### 4. The REVIEW bucket keeps its hedged hits, deliberately

`read_section_note` filters the hedge out of what it **writes** and leaves it in
what it **reports to a person**. *"Gluten free pasta available"* is the
strongest evidence anywhere that the default pasta has gluten, and deleting the
line because the words spell a negation would remove the very pointer the
review bucket exists to raise.

### 5. Then, and only then, the add-on sweep — once, over everything

The owner ruled on 2026-09-07: **fix the hedge first, then sweep once**,
overruling the recommendation to land the two known misses immediately. He
accepted the cost knowingly and it is stated here because it was real: `Hummus`
(sesame) and `Chocolate or Nutella` (nuts) carried **no warning on any screen**
for as long as the hedge took to fix.

`tools/tag_addon_options.py` now looks up `tag_allergens.py`'s rule set and runs
it over the option's own **name**, through the same hedge guard. The two axes
stay apart exactly as ADR 0095 requires: `has-meat`/`has-fish` are dietary and
outside the `contains-` namespace, allergens are `contains-*`, and neither is
implemented in terms of the other.

`contains-fish` is the one dish rule the sweep does **not** borrow, because the
tool carries its own paired rule for it. Borrowing it as well would write the
tag twice and — worse — would let ADR 0095's breaker (delete the local allergen
rule, watch the case fail) pass with the bug back, because the borrowed rule
would silently carry it. It also keeps 0095's standing decision that only the
STATED species list crosses over. **Measured before accepting the carve-out:
zero options in the corpus would gain `contains-fish` from the DERIVED fish
rules**, so it costs nothing today.

## Alternatives rejected

- **An item-level `exclude` on the wheat rules.** One line, and it loses the
  salmon beside the hedge. Recorded to be refused rather than left tempting;
  it is the water-chestnut fault with the polarity reversed.
- **Match the hedge anywhere in the item's text and veto the allergen.** Passes
  every hedge assertion and silences *"Beer battered fish, gluten free chips"*.
  Break-probed: un-anchoring `declared_free` from `fullmatch` to `search` fails
  *"a hedge does not cancel a real wheat item beside it"* and nothing else.
- **Promote `no added gluten` to `gf`.** Not this record's to take. The corpus
  treats it as a **weaker** claim than `gf` and deliberately writes no dietary
  tag; the vocabulary question is open and referred to Theme 38. Stopping the
  tagger writing `contains-gluten` on those items is a different question and is
  the only one settled here.
- **Hand-add the two missing add-on allergens and stop.** Closes two rows and
  rebuilds the same gap at the next venue with a hummus extra — the
  mechanism-versus-count trap ADR 0095 already named.

## Consequences

- **Dish sweep: 3 proposals → 0**, and the corpus is otherwise unmoved. The
  three were never applied (the Simmer session refused them by hand), so no
  shipped tag changed; what changed is that they stop being re-proposed on every
  run, and stop being one careless `--apply` from landing.
- **Add-on sweep: 2 tags across 1 venue** (`crepes-a-go-go` — `Hummus` →
  `contains-sesame`, `Chocolate or Nutella` → `contains-nuts`). Option coverage
  **103/200 → 105/200 (52%)**. `DATA_VERSION` moves; `SHELL_VERSION` does not,
  because no file under `site/` outside `data/` changed.
- **The re-derived candidate set matched the record.** ADR 0095 measured 8; five
  remain (3 fish landed with 0095) and all five are accounted for — 2 real
  misses, 3 hedges refused. No new candidate appeared despite Simmer's 108
  dishes landing in between, because Simmer carries no `addOnGroups`.
- **No `site/js` change was needed and none was made.** Every table that has to
  recognise these tags already carried both: `ALLERGEN_LABEL` in `addons-ui.js`,
  the chip maps in `menu.js` and `recipe.js`, the avoid list in `settings.js`,
  `TAGS` in `validate.py`; `report.js` filters on the `contains-` prefix.
  Checked rather than assumed, because a whitelist sheds the field added after
  it.
- **Seven new mutation cases and seven new breakers** — `test_tag_allergens.py`
  37 cases green, `test_tag_addon_options.py` 25 cases green. Each of the seven
  breakers restores one fault and is asserted to make its cases fail.
- ⚠️ **One existing breaker had gone DECORATIVE under this change and is
  repaired in the same commit.** `test_tag_allergens.py`'s availability probe
  injected the note *"…can be made with dairy free cheese on request"*, and once
  a hedge cancels the match on **cheese** that clause is refused twice over — so
  deleting the availability guard changed nothing and its breaker passed with
  the bug back. `or halloumi` was added to the injected clause, which has no
  negation in front of it and leaves `AVAILABILITY` as the only thing between it
  and the tag.
- 🚩 **Filed, not fixed:** `charley-noble`'s Charcuterie Board and Classic Beef
  Tartare are `contains-gluten` by hand, and the only gluten word the rules can
  see in either is the **bread inside their hedge** (*"$41 with gluten-free
  bread instead of crostini"*). The real evidence is **crostini**, which is not
  in the wheat rule at all. Nothing changes today — the tags are already
  there — but if a refresh ever strips them the sweep will not put them back.
  Adding `crostini` to the STATED wheat rule is a rule-set widening and belongs
  to whoever owns that, not to this item.
- 🤔 **`Chocolate or Nutella` is one option offering two things**, so its
  `contains-nuts` over-warns a reader who picks the chocolate. That is the
  fail-safe direction and matches how the venue prints it; splitting the option
  is a data question for the venue's next refresh, not a tagger question.
