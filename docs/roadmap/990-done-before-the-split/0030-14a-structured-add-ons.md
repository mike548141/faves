- [x] ✅ **14a — Structured add-ons** — **shipped 2026-08-16** (ADR 0048):
  venue-level `addOnGroups` referenced by id from a section or a dish,
  `select: one|many` with a `max` cap, group-level price default, required
  per-option `tags`. `site/js/addons.js` (resolver + composition, 25 unit
  tests) and `site/js/addons-ui.js` (the picker). Enforced in `validate.py`,
  including unknown-key rejection — `"prive": 2.5` inside a group defaulting
  to `0` would otherwise validate clean and sell the extra free. Two design
  calls deviate from the notes below and are recorded in the ADR: **free is
  written `0`, not implied by an absent price**, and **options are standalone
  records, not references to menu items** (that is Theme 25's question).
  Original note: optional `addOns` on
  a dish (`{ name, price, tags }`) plus a **reusable group** defined once per
  section or venue that dishes reference, so "brunch sides" attaches to eight
  brunch dishes without being written eight times. Design calls: single-select vs
  multi-select per group (the Garden Salad's "chicken, halloumi, prawns **or**
  beef" is a pick-one; brunch sides are pick-many); whether an add-on may itself
  be an existing menu item by id (the brunch sides *are* menu items) or is always
  a standalone record. Record in `ARCHITECTURE.md` + enforce in `validate.py`
  when it lands.
