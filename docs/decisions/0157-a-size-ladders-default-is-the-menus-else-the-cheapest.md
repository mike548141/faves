# 0157 — A size ladder's default is the menu's, else the cheapest

**Status:** accepted
**Date:** 2026-10-16
**Amends:** [0130](0130-a-group-that-selects-a-variant-is-not-an-add-on.md) §2
— its "exactly one `default`" rule gains a rule about *which* option ·
**Builds on:** [0047](0047-the-app-ships-only-what-it-renders.md) and
[0137](0137-a-field-a-future-screen-will-render-may-ship-before-it.md)
(what may ship) · **Roadmap:** `200/110`, owner-ruled 2026-10-03

## Context

A `selects` group must have exactly one default, and the dish's `price` equals
its `dishPrice` (0130). Nothing said *which* option. Spices Indian's Garlic
Tikka (Half $12 / Full $20) opened on Full at $20 because the conversion took
the old headline price as the default. The owner ruled (2026-10-03): the menu's
default where the menu names one, by wording ("regular") or by a printed
headline price; otherwise **the cheapest option, with the dish priced there**.

The wording or price a default was inferred from is deleted from the dish when
a choice is converted, so the cue has to be kept somewhere checkable. The
validator cannot read a menu, so it can enforce only the second half: *default
= cheapest unless a cue is recorded*. That needs a place to record the cue. The
roadmap item left the design to the builder.

Measured at `9fc0b119`: 57 `selects` groups in 8 venues (Victoria 17, Southern
Cross 12, Hotel Bristol 10, Borough 7, BurgerFuel 3, Khandallah 3, Spices
Indian 3, Baylands 2). In 54 the default is the cheapest. In 3 it is not: the
Spices Indian portion groups (Full is the default over Half), all headline-price
cases. The unnamed-ladder defaults the survey worried about (`size-1`) are
cheapest, so the rule leaves them alone.

## Decision

1. **A default is the cheapest option unless the menu names another.** A tie
   for cheapest counts as cheapest. Enforced by `validate.py`
   (`check_default_cues`): a default with a higher `dishPrice` than any sibling
   is an error unless a cue is recorded.
2. **The cue lives in the repo-only store `data/defaults/<venue>.json`**, not in
   the venue file:

   ```json
   { "venue": "spices-indian",
     "rows": [ { "group": "portion-12-20", "option": "full",
                 "from": "headline", "evidence": "…what the menu printed…" } ] }
   ```

   `from` is `"wording"` or `"headline"` (the two cues the owner named). `option`
   must be the group's current default, `evidence` must be non-empty. Keyed by
   group id, which is unique in a venue's `addOnGroups`, so a group shared by
   several dishes is cued once.
3. **The check runs both ways.** A row for a group whose default is already the
   cheapest, a row naming an option that is no longer the default, a duplicate
   row, a row for a group that does not exist, a malformed `from`, empty
   evidence, and a file for a venue that does not exist are all errors. A cue
   nothing needs reads as true to a later session and outlives the menu that
   earned it.
4. **Spices Indian keeps Full** on its three dishes under `from: "headline"`
   (owner-ruled). The venue file does not change, so the payload, `summary.json`
   and the catalogue fingerprints do not move.

## Rejected

- **`defaultFrom` on the default option in the venue file** (the item's own
  example). It is `site/data/`, so every phone downloads it, and no screen
  renders it. ADR 0047 asks for a screen, and 0137 admits a field only for one
  the owner has ruled will render. No screen or ruling exists for "this default
  came from the menu's headline". It would be a payload field serving the
  validator alone.
- **Infer the cue from the data** (e.g. "a default named Regular/Standard is
  wording"). A wrong inference passes silently, which is the false assurance a
  gate exists to avoid, and "headline price" has no name to match.
- **A per-venue waiver list** in
  `validate.py`. A list of exceptions with no reason beside each is the
  decorative guard of ADR 0072. A row with evidence is the reason.
- **(b) No default, make the reader pick.** The owner declined this when he
  ruled (c) for the unnamed case. It would also supersede 0130's exactly-one
  rule and touch every reader of a dish's single `price`.

## Consequences

- Adding a ladder whose default is not cheapest fails `validate.py` until the
  row is written. The intake rule (28r) should say the same thing up front:
  *default to the cheapest option; make another the default only if the menu
  names it, and then record `wording` or `headline` with the printed text in
  `data/defaults/<venue>.json`.*
- Changing a price so that a recorded default becomes the cheapest makes its row
  stale, and the validator says to remove it.
- `tools/test_validate.py` copies `data/defaults/` into its sandbox and carries
  12 cases for the rule (`STORE_CASES`).

### The `adds` side: no decision needed today

A pick-one `adds` group has no `default` (`validate.py` refuses one, 0130 §2).
An optional group opens on None, the dish's own price; a `required` group
(0156) opens on nothing, deliberately, because a default there would be a
choice the reader never made. Measured: 74 pick-one `adds` groups, 33
`required`, none with a negative-priced option, so the base is the cheapest by
construction. Gong Cha's size (Regular +$0 / Large +$1) is therefore already
"the cheapest, priced at the dish price". If the owner ever wants "Regular"
pre-selected in a required `adds` group, that is a new feature that reverses a
sentence of 0156, and a ruling, not a rule extension.
