- [ ] **14b — The content sweep** `[M][content]` — ✅ **the TOOL half is DONE
  2026-08-16** (wt: faves-schema30): `tools/find_addons.py` + 44 test cases +
  17 breakers, and a `validate.py` **warning** on the 15 high-confidence
  convertible rows. **The conversion half stays open and is the bulk of it** —
  converting a row is a judgement and the tool deliberately refuses to make it.
  🔑 **It became a CLASSIFIER rather than a matcher**, because 14b and 28b were
  reading the same field with two regexes written a month apart. It reports 12
  classes and names the theme each routes to: **14b owns 136, 28b owns 220,
  14f 28, 14c 82.** Convertible-now is **15 rows**, not the 28 this item
  assumed. It prints where its numbers differ from the roadmap's rather than
  letting the gap be forgotten, and it exits 0 always — a reporter over prose
  that never fully drains, and a check that always fires is one nobody reads.
  Retro-fitting the corpus is
  the bulk of the work, not the code. Pattern-match `Add …$` / `+$` in every
  `desc` and convert; keep the prose only where it isn't an orderable choice.
  Model it on `tools/tag_allergens.py` (ADR 0024): a re-runnable script plus a
  `validate.py` warning, because a hand sweep across 31 venues is exactly how
  the allergen inconsistency got created in the first place.
  🔎 **Measured 2026-08-16, and it changes the shape of the tool: 14b and 28b
  are reading the same field with no shared classifier.** 152 dish descs carry a
  `$`; only ~24 are add-ons. The rest are size ladders (~101), per-head prices,
  discounts and priced pairings — **an 84% false-positive rate on a bare `$`
  match**. The two themes were sized independently off overlapping counts. So
  the tool classifies every prose offer and *routes* it to its theme (14b add-on
  · 28b size · 14f combo · 14c customisation) rather than pattern-matching for
  add-ons alone. ⚠️ **And the note above about `tag_allergens.py` writing
  nothing on a record with `addOnGroups` is now HISTORICAL** — `e42b343` made
  the scanner structure-aware; a dry run reports 0 missing and 0 skipped today.
  The bail is still there and is now a correct guard rather than a silent
  refusal.
  📌 **`[~]` → `[ ]` 2026-09-27 (session `40d6dea4`):** no claim stamp, no
  branch, no live session behind it. The bracket was standing in for
  "part-done", which the house board does not define — `[~]` means
  *claimed*, and a released claim reverts (atelier `CONCURRENCY.md`
  § Claiming work). What is done is carried in the body below.

  📌 **Claimed 2026-10-02 (`faves-4f`): the 15 high-confidence rows
  `validate.py` warns on.**

  ✅ **First batch landed 2026-10-02 (`faves-4f`, PR #90).** 13 of the 15
  high-confidence rows (16 warnings: the Smashie tripped two) became add-on
  groups on eight venues; validate's convertible warnings 16 → 2. Option tags
  came from `tag_addon_options.py --apply`, plus two by hand: `gf` on Gold
  Lining's "GF seeded toast" (the menu says GF; the tool proposed gluten) and,
  in `8f9c1ac`, `has-meat` on both beef-patty options (the tool refuses
  "patty"; both dishes print "beef patty", and the tag can only add a
  warning). Left prose: Charley Noble's grill section note (sauce or butter,
  with per-sauce gluten caveats) and Sprig & Fern Tawa's "$2 per topping"
  (no toppings named). Unknown: Spices' stuffed naan filling (gluten only).
  🛑 **Merged with two red CI checks** (my merge did not gate on the tally):
  `test_validate` and `test_find_addons` leaned on rows this batch
  converted. Fixed in `e87ae19` the same hour (fixtures clear the subject's
  own groups; the classifier cases restore the rows' original wording in
  their throwaway copy).
  📌 **Claim released.** The 136-row 14b class beyond these is judgement work.

  📌 **Claimed 2026-10-02 06:20 UTC (`faves-77`): batch two, the
  `addon-unpriced-choice` (44) and `addon-priced` (2) rows only, Abrakebabra
  excluded (worker in a worktree).**

  ✅ **Batch two landed 2026-10-02 (`faves-77`, worker branch
  `faves-77/14b-named-choices`):** 39 dishes at 16 venues became add-on
  groups. Each is `select: one`, `price: 0`, no `max`, the Sprig + Fern
  precedent: the menu says "choose"/"choice of" and states no charge, so
  free is written down (ADR 0048 §2); only "choose two" got `many` + `max: 2`.
  Converted: 1841 Sundae topping; BurgerFuel Choppers sauce; Charley Noble
  cheese one and two; Gold Lining Eggs Benedict and Nourish Bowl; Hell NZ
  BBQ ribs sauce and Unholy Donut chocolate; Hotel Bristol, Khandallah,
  Southern Cross and Borough schnitty side; Khandallah, Southern Cross and
  Borough Rosti Benedict; Khandallah and Borough Breakfast Burger side; KK
  Teo Chew noodle type; Noodle Canteen heat (5 dishes); Rock Yard baguette,
  salad, rice paper rolls (2 and 3, both sections), spring rolls (both
  sections) and vermicelli; Satay Kingdom stir-fry sauce; Churton
  Combination Seafood base; Ramen Shop curry rice, kids ramen, yakisoba;
  Victoria Margarita flavour and Spritz.
  Description trimmed only where no `tagNotes` quote the removed words and
  nothing else is lost (1841, BurgerFuel Choppers, Charley cheese two, the
  four schnittys, two burgers, Noodle Canteen, Curry rice, Margarita). The
  rest keep the sentence, because a note quotes it or it carries detail.
  Left prose, 7 rows: Charley grill-section sauce/butter and its "$4
  additional" (per-sauce gluten caveats, a section note, as batch one);
  Charley kids ice cream ("choice of two toppings" lists only two, so
  choose-two-of-two is not credible); KK Nasi Lemak chicken and beef (the
  dish is already split into a priced row per protein, a group would state
  it twice); Borough Mini VIP Pizza (toppings named but no price stated,
  so not plainly nil); Sprig Tawa Cheese Pizza (no toppings named).
  Tags: `tag_addon_options.py --apply` wrote 58. By hand, each from the
  menu's own words: `v` on Gold Lining Halloumi and Mushroom (printed
  "(V)"), `v` on Gold Lining bowl Halloumi, `vg` on its Falafel ("(VG)"),
  `v`+`vg` on Rock Yard baguette tofu ("vegetarian/vegan"), `vg` on salad
  tofu ("vegan"), `gf`+`vg` on spring-roll Vegetables ("GF, vegan"),
  `contains-dairy` on Charley Goat's Blue, both groups (the menu says
  "goat's milk"). NOT tagged, flagged: Ramen Shop "Ebi" (no rule knows ebi
  is prawn; the menu never says so; a shellfish flag would be the safe
  direction but is not the menu's claim). Known cost: a dish carrying a
  `v`/`gf` claim (Veg mee goreng, Benedicts) shows ADR 0092's one hedging
  sentence once an option without that claim is picked, spice level
  included (the Gong Cha class, left open there).

  ✅ **Batch two merged 2026-10-02 (`faves-77`, PR #98, CI 8 of 8;** merged
  with `main` once, summaries regenerated, `addon_check` 108/0 and the two
  text-leaning test files re-run green on the merged tree). Orchestrator's
  review at 390 px found the picker offers **None** on every pick-one group,
  including a menu's mandatory "choice of" sauce — filed as
  [`090`](090-a-required-choice-still-offers-none.md). The Ebi question
  above is settled from the venue's own menu, not asked: the same menu calls
  its "Ebi katsu" a "Deep fried prawn katsu", and its "Spicy ebi ramen"
  already carries `contains-shellfish`. So the curry rice bowl's "Ebi"
  option now carries it too (`main`, same day). Before #98 the bowl, which
  offered ebi in prose, carried no shellfish tag at all.
  📌 **Claim released.** Left in 14b: `section-is-a-group` (14),
  `dish-is-an-addon` (30), `addon-options-not-listed` (37),
  `diet-substitution-price` (15); each needs a call on which dishes an
  extra attaches to, which the menu does not say.
