# 0136 — "May contain" is a trace tier, never a tag

**Status:** accepted
**Date:** 2026-09-28
**Builds:** roadmap `110/020` (owner-ruled 2026-08-16, again 2026-09-09) and
`350/020` step 5 (owner-ruled 2026-09-28, twice).
**See also:** [0137](0137-a-field-a-future-screen-will-render-may-ship-before-it.md)
for the exception to [0047](0047-the-app-ships-only-what-it-renders.md) this
field was ruled under · [0025](0025-infer-allergens-by-default.md) · [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)

## Context

Allergen sources state two different things. Pizza Hut's chart grades each
allergen `P` (present) or `T` (*"stored or used to manufacture other items at
the site"*); Whittaker's 72% Dark Ghana label reads *"CONTAINS: SOY. MAY BE
PRESENT: MILK, PEANUTS, TREE NUTS, GLUTEN."* The vocabulary had one tier, so a
trace statement either became `contains-*` or was thrown away.

The owner ruled on 2026-08-16, and again on 2026-09-09 when the item failed to
record the first ruling: **only `P` becomes a `contains-*` tag; the payload
gains the ability to carry `T`.** A warning that fires on every pizza carries
no information — the decorative shape 0072 names.

The Chocolate Lava Cakes and B's Dope-As Brownie then contradicted that
ruling. Both carried `contains-peanuts` and `contains-nuts` whose only
evidence was the Whittaker's "may be present" line, per a 2026-09-27 ruling
("Tag peanuts and nuts") given before the P/T ruling was found. On 2026-09-28
he ruled: **"Apply ruling + show trace"**. The tags come off, the trace is
recorded and shown in the tag tips.

Building that exposed a gap, and it was put back to him before anything
shipped (a peanut warning was about to be removed). A tip opens from a chip,
and with `contains-peanuts` gone the lava cakes have no peanut chip. A reader
who flagged peanuts would get no peanut signal on the row, only a line inside
the *dairy* chip's tip. Asked, he ruled **"Flagged-only chip"**.

## Decision

1. **Data.** A dish carries `trace: [allergen tags]` and `traceSource:
   "<who said it>"` beside `tags`, in `site/data/`. `validate.py`
   `check_trace` holds four rules, each mutation-tested (`test_validate.py`,
   8 cases): trace holds allergen words only; an allergen in both `tags` and
   `trace` is refused (present wins, and a record saying both has not
   decided); `traceSource` is required with trace and refused without it; and
   `tagNotes` never explains a trace. The closed tag vocabulary already
   refuses any `trace:`/`may-contain-` spelling inside `tags`, so a reader of
   `tags` cannot take a trace for a present allergen, positionally or by
   prefix.
2. **Every tip on the dish carries the trace line**: *"May contain traces of
   peanuts and nuts — Whittaker's label."* One sentence per source, so two
   labels are never merged into a claim neither made.
3. **A trace allergen the reader flagged gets its own chip**: *"⚠ May contain
   peanuts"*, dashed and unfilled so its outline differs from "Contains" as
   well as its words (WCAG 1.4.1). It is declared, so the labelled collapse
   never hides it (22e's 4.2.1, 22d's safety half). It sorts straight after
   the flagged present allergens. Its tip says it is a warning, not an
   ingredient.
4. **An unflagged reader gets no trace chip.** That is 110/020's reason, kept.
5. **The row accent (`dish-flagged`) stays present-only.** `dishFlagged` is
   not fed trace: from across a menu, "contains" and "may contain" would look
   the same.

## Consequences

- The lava cakes and brownie now read `trace: [contains-peanuts,
  contains-nuts]`, `traceSource: "Whittaker's label"`. Milk and gluten, also
  on the label, are present from other ingredients, so they are not trace.
  Payload: +22 bytes gzipped for the collection.
- **The Pizza Hut chart is the next consumer, and the cost is known up front.**
  `T` is near-universal for nuts, peanuts, sesame and shellfish there, so a
  reader who flagged nuts will see "May contain nuts" on nearly every pizza.
  That was the trade on the table when he chose; it is accurate, and it
  reaches only the reader it concerns.
- Composition (a recipe's ingredients, an add-on) will carry trace the same way
  (`tagRow.paint(tags, trace)`); 350/020 step 4 builds the ingredient half.
- Checked by `tests/tags.test.js` (8 trace cases, four break-probes) and
  `recipe_check.mjs` §14 (5 assertions, three break-probes: trace shown to
  all, trace line removed, trace fed to `dishFlagged` — each fails exactly the
  assertions it should).
