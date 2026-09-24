# 0122 — Declining to infer is not asserting an absence

**Status**: accepted
**Date**: 2026-09-24
**Answers** roadmap
[`470/030`](../roadmap/470-theme-37-cook-mode-and-the-recipe-page-as-the/030-37n-the-corpus-disagrees-with-itself-about-all.md)
(four owner rulings, 2026-09-21) · **applies the one-way rule of**
[`0025-infer-allergens-by-default`](0025-infer-allergens-by-default.md) in the
direction its Consequences never spelled out · **is an instance of**
[0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)

## Context

`tools/allergen_disagreements.py` groups the corpus into declared classes — one
regex, one exclusion, one watched allergen list, one sentence of food reasoning
each — and reports every row whose tagging disagrees with its class. It is
read-only by construction. On 2026-09-20 it stood at **3 class/allergen splits
over 44 rows**, and every one of the 44 was put to the owner as a question
rather than swept.

His four rulings of 2026-09-21 all resolve the same way, and it is not the way
a reader of ADR 0025's summary would predict. In each case the safer-*looking*
move was to tag: cheese on a Turkish pizza, egg on a crumbed cutlet, rusk in an
Italian sausage. He declined all three and narrowed the class instead.

🔑 **The reasoning is the one he gave on 2026-09-07 and it is load-bearing here:
an over-warning is not free.** A warning that fires on food that does not carry
the allergen trains a reader to stop reading warnings, and once they do, every
*correct* tag in the corpus stops working too. ADR 0025's one-way rule says
inference may only ever add a `contains-*` tag. It does **not** say that adding
one is therefore always right, and three sessions have now read it as if it did.

The fourth ruling is the counterweight, and it is why this record exists rather
than a note in the item. Dragonfly's **Taiwanese Popcorn Chicken** keeps its
`contains-gluten` tag. Classically that coating is sweet-potato starch, so a
future session will look at it and reason its way to removal — but the venue
advertises a `gf-option` on that dish, which is the shop itself saying the
default preparation is not gluten-free. Removing the tag would not be declining
to infer. It would be inferring an **absence**, from a cookbook, against the
kitchen's own statement.

## Decision

**A class may stop watching for an allergen it cannot vouch for, and that is
not a safety claim.** Three narrowings land in the class table, each carrying
its food reasoning in the code:

| narrowing | what it changes | what it does **not** change |
|---|---|---|
| `turkish-pizza` splits out of `pizza`, keeping `contains-gluten` and dropping `contains-dairy` | 6 Abrakebabra rows leave the cheese-by-default class | no row gains `contains-dairy`; none gains `df` |
| `crumbed` stops watching `contains-egg` | 36 rows leave the report | `crumbed → contains-gluten` is untouched, and no dish's tags move |
| `italian sausage` leaves the wheat-rusk class | 4 rows leave the class, 2 of them a split | an ordinary NZ sausage is still watched |

**And the boundary the table may not cross: declining to infer a presence is
permitted; asserting an absence is not.** No narrowing here writes `gf`, `df`,
`v` or `vg`, and none removes a tag. `contains-dairy`'s absence from the
`turkish-pizza` watch list means *we will not claim there is cheese on it*, and
carries no opinion about whether there is.

**A narrowing is a LOOKBEHIND on the alternative, never an `exclude` entry.**
In this tool an `exclude` hit vetoes the row's membership of the **whole
class**, so a breakfast plate reading "pork sausages, italian sausage" would
stop being watched for the rusk in its pork sausages. That is an over-warning
traded for a miss, and it is the third time this repo has had to write the rule
down (the water chestnut beside the almonds; the cabinet slice on
`'Caramel slice, with slices of ham'`).

**Where the evidence is genuinely absent, the row keeps reporting.**
Abrakebabra's `pizza-slice` — a $4 *"Pizza Slice / Chicken."* in **Sides** —
prints nothing that says which pizza it is cut from. It stays in the `pizza`
class and stays in the report. A report is the right home for a row nobody can
call; silence would be a decision taken by default.

## Alternatives rejected

- **Tag the six Turkish pizzas with `contains-dairy`.** The fail-safe-looking
  move, and the owner's ruling against it is the whole point of this record.
  Lahmacun is not cheese-topped by default; tagging it would be a guess dressed
  as a warning.
- **Argue it from the price.** Abrakebabra's *Cheese Lovers Turkish Pizza* is
  $3 cheaper than the others, which was offered as positive evidence that
  cheese is not the default. It is worthless — a cheese-only pizza is cheaper
  because it has no meat on it — and it was put to the owner as worthless. He
  ruled on the food. **Recorded because a bad argument that reached the right
  answer is the kind that gets reused.**
- **Accept a report that always fires.** Keeping `crumbed → contains-egg` on
  the watch list after ruling it will never be inferred leaves 36 permanent
  rows, makes `--strict` unreachable for ever, and is precisely ADR 0072's
  decorative-guard shape pointed at this repo's own safety report.
- **Split the crumbed class by venue type** (house kitchen vs frozen supply).
  Offered on 2026-09-07 and declined: there is no data field for it, so it is
  report-only with extra steps.
- **Silence `abrakebabra/pizza-slice` by hard-coding the venue**, or by reading
  the section heading it sits under. The first is a per-venue hack in a
  corpus-wide table of food claims. The second is a capability neither allergen
  tool has, and whether to give them one is an open question with its own
  options in [`470/060`](../roadmap/470-theme-37-cook-mode-and-the-recipe-page-as-the/060-a-section-name-is-evidence-the-tagger-never-reads.md)
  — a child decision may not pre-empt it.
- **Remove Dragonfly's `contains-gluten` on the sweet-potato-starch reading.**
  Rejected above, and pinned in the item so the reasoning does not have to be
  reconstructed by whoever next notices it.

## Consequences

- The report falls from **3 splits over 44 rows to 1 split over 1 row**, and
  that one row is `abrakebabra/pizza-slice`. **`--strict` is therefore still
  not reachable, and wiring it is not attempted here.**
- **No dish's tags changed.** `site/data/` is byte-identical, a dry run of
  `tag_allergens.py` proposes 0 tags, and a case in the new test suite
  fingerprints `site/data/` around three report runs to keep it that way.
- The class table gets its **first test**, `tools/test_allergen_disagreements.py`
  — 14 cases and 6 break-probes, in CI. Until 2026-09-24 nothing tested any of
  the table's claims, and a class narrowed to nothing would have shown up only
  as a shorter report, which reads as progress.
- 🛑 **Two of the six break-probes are about the MECHANISM, not the outcome.**
  On today's corpus the veto and the lookbehind print an identical report, so no
  outcome test can tell them apart. `b3` and `b6` rebuild each narrowing as the
  veto and require one synthetic menu line — and only that line — to notice.
- 🔎 **The `exclude` entries already in the `sausage` class are vetoes of the
  shape this record declines, and the fault is LIVE.** ⚠️ This consequence read
  *"no row in the corpus names one of them beside a rusk-bound sausage, so
  nothing is wrong today"* when the record was first written, and that was
  **wrong** — the measurement counted the rows the veto catches and never asked
  whether any of them *also* named an ordinary sausage. Re-measured the same
  day: of the 11 rows vetoed, **3 carry a sausage token that is no part of the
  excluded phrase** — `daily-bakery/sausage-roll` (*"pastry filled with savoury
  sausage"*, vetoed by `sausage roll`) and Pizza Pomodoro's Carne small and
  large (*"salami, ham, and sausage"*, vetoed by `salami`). All three already
  carry `contains-gluten`, so **the report reads the same either way**, which is
  why nobody had noticed. Converting them is a separate finding and is
  deliberately not done here; the correction is recorded because a wrong reason
  is how a right rule gets argued away.
