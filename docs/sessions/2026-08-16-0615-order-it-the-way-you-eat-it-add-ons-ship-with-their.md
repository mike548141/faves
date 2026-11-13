## 2026-08-16 06:15 UTC — order it the way you eat it: add-ons ship with their safety rule

Theme 14a + 14d + 14e, taken as one unit because 14d says so and it was right.
Worktree `faves-addons`, three parallel sessions live throughout.

**The information was already there; only the shape was wrong.** Measured
before designing anything, across all 48 records: 28 dish descriptions carry a
priced add-on in prose, 63 carry an unpriced choice, 17 dishes *are* add-ons
wearing a dish's clothes, and 11 sections across 9 venues — 92 rows — are
add-on groups rather than things you would order alone. The owner's own
example (Wellington Kebab Grill's counter card) and the densest venue
(Sprig & Fern, 12 of 63 dishes) became the pilot.

**The corpus proved the safety case rather than implying it.**
`tools/tag_allergens.py` already *excludes* add-on prose from its inference —
correctly, since "add prawns +$7" does not make a garden salad shellfish. But
the prawns' own `contains-shellfish` then had nowhere to live. Every allergen
named in an add-on, corpus-wide, was being dropped on the floor.

**The design call that cost the most thought: intersection, not
contradiction.** The gentle rule is to drop a dietary claim only when an option
positively states a clashing allergen, reading the contradiction table straight
out of `tag_allergens.py`. It handles satay perfectly — and misses grilled
chicken entirely, because meat carries no `contains-*` at all, so a vegan dish
plus chicken would still read vegan. So: **allergens union, dietary claims
intersect**. Both moves fail-safe, mirroring ADR 0025's one-way rule.
The satay example alone could never have taught this; it is the easy case.

**Two deviations from what the roadmap expected, both evidence-led.**

- *Free is written `0`, not implied by an absent price.* The roadmap argued a
  missing price should mean free so twelve sauces need not say so twelve times.
  The terseness is worth having; the implication is not — a transcriber who
  forgets a price then produces a silently free add-on and an under-stated
  total with nothing to catch it. A **group-level price default** gets the
  terseness back while leaving every option's cost answerable.
- *The share codec did not bump.* `CODEC_VERSION` is shared by orders,
  shortlists and personal transfers and checked with a strict `!==`, so a bump
  invalidates every outstanding link of all three kinds for a change two never
  use. The selection is appended as a fourth positional slot instead — every
  existing decoder ignores it by construction — and slot 1 became the
  *configured* unit price, so an old reader still totals correctly. It
  under-specifies rather than mis-states, and dropping an add-on can never put
  something extra on a plate.

**A live defect found and deliberately not fixed.** `slug(name)` is not unique
within a venue: 22 dish rows across 3 venues collide on 10 names, every one at
a different price. `cart.js` matches a line on `(venueId, name)`, so adding
Sprig & Fern's $21 Gold Card Cheeseburger to a tally holding the $28 Mains one
charges **$56 instead of $49** — reproduced against the real module, not
reasoned about. That is dish identity, which the owner reserved for its own
session; the evidence is recorded under Theme 25 and the fix left there.

**A new browser check, for the reason the last two exist.** `addon_check.mjs`
drives the real picker at 390 px on the owner's own venue: the cap refuses a
fourth sauce, satay names peanuts live, the flagged treatment follows the
*configuration* rather than the dish, and the configured dish becomes its own
order line. Its header names what a green run still cannot tell you — above
all that no browser can check whether "Garlic yogurt" really contains dairy.

**A concurrency trap worth recording.** `DATA_VERSION` was bumped to `.5`,
then a parallel session pushed its own `.5` and the rebase silently absorbed
mine — `check_versions.py --range origin/main..HEAD` caught it, the bare
`check_versions.py` did not, because with no range it only reads *staged*
changes and the tree was already clean. **Run it with the range, not bare,
when checking a finished branch.**

**Verification.** `validate.py` 48/0 · `test_validate` **53** mutations (was
32; +19 for add-ons, including 2 that mutate `site/js/addons.js` itself to
prove the CONTRADICTS/CONTRADICTED_BY drift gate can fire) · `node --test`
**680** · `boot_check` 15 · `device_check` 19 · `cook_check` 36 ·
`addon_check` **9** (new) · no-deps, SBOM, FX, visibility, `split_data --check`
and version lockstep all clean.

**Still owed.** 14b (the corpus sweep, sized above), 14c, 14f (combos, blocked
on Theme 25), a `min`/required rule for pick-one groups, and a group-level
marker for preparation-only options that today have to write vacuously-true
tags to survive the intersection rule. All named in ROADMAP rather than left
in this log.

### Owner rulings — 2026-08-16, closing the add-ons session

Four decisions put to the owner with the trade-offs stated, all answered.

- **Free is written `0`, not implied by an absent price — ratified.** The
  deviation from the prior session's note stands, on the ground given: a
  forgotten price would otherwise be a silent under-charge nobody catches, and
  the group-level default keeps the sauce board terse anyway.
- **Hide the duplicated section — ruled, and built the same session.** The
  cost was stated first: a heart or rating saved against a hidden row stops
  appearing. He took it, because a menu that prints "Extra halloumi" twice is
  the version a person is holding in the shop. `addOnsOnly` + ADR 0049; the
  rows stay in the record, and `validate.py` refuses the flag unless every row
  it hides is still reachable as an option. Proved by breaking it, both ways —
  removing an option makes the validator name the orphan, and un-hiding the
  section makes `addon_check` fail.
- **The `$56`-for-`$49` overcharge waits for Theme 25, as reserved.** Not
  patched narrowly here: a second identity concept in `cart.js` is something
  the dish-ids session would then have to unpick.
- **The queue behind this is all four of 14b, Theme 25, 14f and 14c.** Theme 25
  is the one that unblocks the other two, so it wants to go first even though
  14b is the larger pile.

