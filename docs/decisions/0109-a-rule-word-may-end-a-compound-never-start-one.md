# 0109 — A rule word may END a compound, never START one

**Status**: accepted
**Date**: 2026-09-09

## Context

`tools/tag_allergens.py` matches every rule as `\b(alternatives)\b`. Both
boundaries are load-bearing and neither had ever been questioned, so a rule
word inside a longer word was invisible: `\bburgers?\b` cannot see
"Cheeseburger", and nothing in the repo reported that it could not.

Roadmap `080/160` names the symptom. Roadmap `110/050`, delivered the day
before, hit the same wall from the other side and left it alone — it noted
that the leading `\b` means `burgers?` cannot reach "Cheeseburger" and
deferred the fix here.

The obvious repairs are both wrong, and the corpus says so out loud. A sweep
of all 57 records (3,557 name/description/ingredient/note/option strings)
for words a rule matches *inside* gives:

**Opening the CLOSING boundary** would tag `eggplant`/`eggplants` (12 rows)
with egg, `Bundaberg` (4) with gluten from `bun`, `edamame` (7) with dairy
from `edam`, `pieces` (106) from `pie`, `toasted` (61) from `toast`,
`tartare` (17) from `tart`, and `creamy` (64) from `cream`.

**Opening the LEADING boundary wholesale** would tag `kale` (11), `pale` (7),
`royale` (3), `cardinale` (2) and `vale` (1) with gluten from `ale`;
`buckwheat` (5) from `wheat`; `cornflour` (1) from `flour`; `kewpie` (5,
Japanese mayonnaise) from `pie`; `cheesecake` (15) from `cake`; and
`kielbasa`, `pinwheel`, `jellyfish` and `agedashi` with fish.

Buckwheat and cornflour are both gluten free. A false gluten warning there
is not an ordinary over-warning — it is [0097](0097-a-hedge-is-not-a-warning.md)'s
harm, landing on the row a coeliac is specifically hunting for.

## Decision

**A rule word may be opened at its HEAD, per token, and never at its TAIL.**
Three tokens are opened: `burger`, `muffin`, `nugget`, written `\w*burgers?`.
The word may carry any prefix and must still END at the token.

Two things make that safe rather than merely narrower:

1. **The closing boundary is never touched.** Every catastrophe in the
   second list above is a suffix problem, and none of them can occur.
2. **The set is opt-in and small.** Each of the three is a food noun that
   forms compounds only by taking a prefix, and no non-food word in the
   corpus ends in any of them.

`cheeseburger` reaches the **dairy** rule as a spelled-out alternative
rather than by opening `cheese`'s tail, because `cheese\w*` also spells
"cheeseless" — the same harm as buckwheat, one aisle over.

**`--compounds` is half the decision, not a convenience.** It is the sweep
above, kept in the tool: it prints every word a rule matches inside and
which boundary refused it. A bare list of compound words would have been
strictly safer, and it is what the dairy rule does — but a list is SILENT
about the compound that lands after it was written, and silence is how 13 rows sat
unnoticed for two months. The reporter makes the remaining 45 near-miss
groups falsifiable; the tail closes the three the corpus can already prove.

## Consequences

17 tags landed across three venues (13 gluten, 4 dairy): McDonald's
Cheeseburger, Double Cheeseburger, Hamburger, three Chicken McNuggets and
five McMuffins; three Sprig & Fern Tawa Cheeseburgers; one BurgerFuel kids
meal. `validate.py`'s twin-allergen warnings fell 21 → 18.

**A fourth tail was withdrawn by the dry run, and that is the reusable
lesson.** `katsu` passed every false-positive check — `\w*katsu` cannot
reach `katsuobushi`, because that is a suffix — and it was still wrong. It
reaches `tonkatsu`, and all five of the corpus's are tonkatsu **sauce**, a
condiment. It proposed three tags whose printed basis, "battered/crumbed
coatings are wheat flour", was untrue of the dish. The tag may even be right
for another reason; a rule whose stated basis is false is a claim stronger
than its evidence in either direction, and this file's whole promise is that
the basis is checkable. **A tail can be clean on the word list and still
make the tool lie about its reason** — so the dry run is part of admitting
one, not a formality after it.

`test_tag_allergens.py` gains 10 breakers. Four revert a tail and must fail
the group that reads it. The other **six WIDEN a boundary** the way a future
session reaching for "just drop the `\b`" would — `egg`→eggplant,
`bun`→Bundaberg, `ale`→kale, `wheat`→buckwheat, `pie`→kewpie,
`cheese`→cheeseless — and the absence group has to refuse every one. Absence
cases alone are satisfiable by a tool that has stopped matching, so each of
those rows also asserts a tag it must still gain.

**What this does not fix.** The 13 BurgerFuel burgers in `080/160` are not a
compound-word fault at all, and one measurement dissolved the diagnosis: their
descriptions read "Grass fed beef, cheddar, pickles" and never name a bun.
Their "lightweight" twins carry gluten because those descriptions end "On a
smaller wholemeal bun". No regex reaches a word the record does not contain.
