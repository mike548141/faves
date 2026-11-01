- [ ] 🎯 **A swap is not an extra: name what it replaces** `[M][schema][safety]` —
  the Theme 14 README's consequence *"A substitution is not an addition"*
  (2026-08-17) never became an item. `200/100`'s survey measured how much it
  matters ([the review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)).

  **How swaps are built today:** as `+$` add-ons that never name the thing
  they replace. Examples are Sprig & Fern's `nga-bun`, `nga-base` and
  `swap-curly-fries`, Hotel Bristol's `no-gluten-added-bun`, GroundUp's and
  The Victoria's `milks`, and Sprig & Fern Tawa's `gf-toast`. The order line
  reads "Cheeseburger + No gluten added bun", and the kitchen has to infer
  "instead of the milk bun".

  **Still in prose, at many venues:** "GF on request +$1", "$40 with a
  gluten-free bun", "+$0.50 for coconut or oat milk", "Swap roti for veggie
  soup", BurgerFuel's "Bun swaps" section, and Thai Tara's "Meat choices"
  section.

  🛑 **The safety half is why this is more than wording.** Composition unions
  allergens *in*. A swap also takes a component *out*: oat for dairy milk
  removes the milk. So a swap modelled as an add-on can only ever over-warn.
  That is safe, but it is wrong. A swap modelled as removal plus addition can
  under-warn if the removal is trusted when it shouldn't be. Whoever builds
  this needs an ADR and break-probes for both directions.

  **Done (part 1, worker w/200-160, 2026-10-18; [ADR 0168](../../decisions/0168-a-swap-names-what-it-replaces-and-removes-nothing.md)).**
  A swap now NAMES what it replaces, on the picker ("No gluten added bun, instead
  of the milk bun") and on the order line ("No gluten added bun (instead of the
  milk bun)"). **Allergens are still unioned in, exactly as before: a swap removes
  no `contains-*` tag and weakens no warning. Trusting a removal is part 2 and is
  the owner's decision; nothing here decides it.**
  - **Shape.** One optional `replaces` on a pick-one `adds` group: a noun phrase in
    the menu's own words, with the app supplying "instead of the". Absent changes
    nothing byte for byte. validate.py refuses it on a `selects` or pick-many group,
    with a leading article or "instead", empty, or over 60 characters, and refuses
    any group whose dishes do not state the phrase in their own `desc` or section
    `note` (13 mutations in `test_validate.py`).
  - **Order line and tally.** The words ride in the line's option `name`
    (`lineName` in `lineOptions`). The share codec, backup whitelist, saved orders
    and collect mode already carry and render `name`, so none changed; the line is
    keyed on the option id, so the wording cannot split or merge a line. A line
    saved before this keeps its plain name and is re-worded when recalled.
  - **Data, with the menu's words.** Hotel Bristol `no-gluten-added-bun` replaces
    "milk bun" (all three burgers' own descriptions say "milk bun"); Sprig & Fern
    Thorndon `nga-bun` replaces "sesame bun" (the Burgers section note: "on a
    sesame bun with hot chips") and `swap-curly-fries` replaces "hot chips" (same
    note); Sprig & Fern Tawa `gf-toast` replaces "toasted sourdough" (Eggs on
    Toast: "Eggs your way on toasted sourdough").
  - **Left alone because the menu does not say what is replaced** (the validator
    would refuse each): GroundUp `milks` and The Victoria's `milk-options` (their
    drinks never state the milk; Victoria states "with milk" for one espresso
    only, on a group shared by the whole section); Sprig & Fern Tawa `nga-bun`
    (the Mains Cheeseburger says "seeded bun" but the Gold Card Cheeseburger, which
    shares the group, says nothing about its bun; splitting the group would strand
    saved lines, so it waits for an owner call or a per-dish form); Thorndon
    `nga-base` (the Pizza section never says what its base is). The survey's
    "The Victoria's `milks`" is `milk-options` in the data.
  - **Tests.** `tests/swap.test.js` (13): words, byte-identical when absent, line
    identity, share-codec round trip, recall; and the safety half. It fails if a
    swap changes the composed tags, `added`/`dropped`, any warning sentence or the
    `flagged` state, and walks every shipped swap against every dish that offers
    it. Break-probed: `composeTags` dropping `contains-gluten` when a swap is
    chosen failed 4; letting a swap keep a claim it should lose failed 2; the line
    ignoring `replaces` failed 2. `addon_check` block (ae) (6 assertions, 216
    total) drives the picker words, the stored line, the sheet line, a no-removal
    check on the dish's composed tags, and a control (Tawa's silent group); one
    combined break-probe (words removed, line unworded, gluten dropped) failed
    exactly the four non-control assertions.
  - **Left for part 2 / later.** Trusting a swap's removal to drop an allergen or
    claim; prose swaps ("GF on request +$1", BurgerFuel's "Bun swaps") are not
    converted to groups; a per-dish `replaces` for a group shared by dishes that
    say different things.

  📌 **Part 1 merged 2026-10-18 (faves-b4), PR #129** (ADR 0168,
  SHELL_VERSION 2026-10-18.7): four swaps name what they replace; allergens
  still union in, guarded by `tests/swap.test.js`. 🎯 **Open for the owner:**
  may a swap ever take an allergen *out* (oat milk removing dairy), which
  trades today's safe over-warning for an under-warning if the removal is
  trusted wrongly? Also left: GroundUp's and The Victoria's milks and
  Thorndon's pizza base (the menus do not name what is replaced), Tawa's
  `nga-bun` (one of its two dishes is silent), and the prose swaps.

  ✅ **Owner ruled 2026-10-18 (asked by faves-b4): YES, WHEN THE MENU SAYS
  SO** — a swap may remove an allergen warning where the menu states the
  replacement. Recommendation was "never, add only" and was declined. Part 2
  is now buildable: an ADR first, and break-probes for BOTH directions (a
  wrongly recorded swap must not under-warn silently).

  review: done (pass ran 2026-11-01 UTC on Fable 5.1, 1 MAJOR / 3 MINOR /
  8 NOTE; verdict, owed rulings and routing below) — was queued
  (`docs/reviews/2026-11-02-1214-dish-configuration-obligations-and-allergens-cold.md`,
  one pass over ADRs 0156, 0158, 0159, 0163 and 0168 together, with a
  held-back sibling). Brief written 2026-11-02 by a brief-writing sub-agent
  (Claude Opus 5.5) of session `2be3482c`, a non-author. Tier at selection:
  Fable. **Fable-gated: the pass runs only on the owner's explicit
  approval.**

  **Review pass claimed 2026-11-01T14:10Z** by a headless per-pass orchestrator
  (Claude Opus 5.5; an off-tier orchestrator under rule 4, which holds the
  context partition and forms no finding and writes no severity), started by
  shed session `c87c4ee0` (Opus 5.5) in the owner's weekly Fable drain. The
  reviewer is one Fable 5.1 sub-agent, tier checked at selection. Neither
  session wrote the brief or built any of the five changes. Runs under the
  owner's approval of 2026-11-02, verbatim: *"As in past sessions I want you
  to use fable model in subagents to do all fable dependent work in all my
  repos including cold fable reviews"*. The pass covers `200/090`,
  `200/120`, `200/130` and `200/140` with this item; the verdict is recorded
  here.

  🎯 **PASS RAN 2026-11-01 (UTC), acts 1 and 2; sibling folded in the
  brief.** Reviewer Fable 5.1 (tier checked at selection) at HEAD
  `3016d708`; the orchestrators were off-tier (Opus 5.5) and formed no
  finding. **Verdict, the reviewer's words:** *"the five changes stand as
  shipped"*, but the swap's headline case reads as self-contradicting until
  F1's stopgap (or the ruled part 2) lands, and the sheet's "finished" check
  must resolve the options it counts (F2). **Tally: 1 MAJOR / 3 MINOR /
  8 NOTE**; every brief re-run line reproduced, `addon_check` 216/0.

  **Standing MAJOR — F1:** three of four shipped swaps (Bristol's and
  Thorndon's no-gluten-added buns, Thorndon's curly fries) are tagged `[]`,
  so choosing one drops the dish's `gf-option`, keeps "contains gluten" and
  adds "isn't tagged gluten free": two messages that cancel for a reader
  avoiding gluten.

  🎯 **Rulings owed by the owner** (put here, not asked, per his drain
  ruling of 2026-11-02; options and reasoning are in the verdict):
  - **F1 (MAJOR):** (1) a stated-rule sentence on any `replaces` swap and
    the residue line suppressed for it, now; (2) tag a swap with what its
    menu does claim; (3) part 2 as already ruled 2026-10-18. Reviewer
    recommends **1 now**, 2 where wording allows, 3 in part 2's own ADR.
  - **F3 (MINOR):** the row's Add drops optional picks once 0156 has sent
    the reader into the picker. Options: the row Add carries the whole
    selection; the stepper mirrors the picker's; or say it in the text.
    Reviewer recommends **the first** (two buttons, one dish).
  - **F4 (MINOR):** `replaces` must be stated by the menu but `required`
    needs no evidence; 7 of 33 required groups have no stated source.
    Reviewer recommends a `validate.py` *warning* shaped like
    `check_replaces_stated`.

  **Routing (the reviewer's, one follow-ups item):** F1 stopgap and part 2;
  F2, F7, F12 fixes with tests; F6 one harness assertion; F11 ADR 0168 is
  stale against the 2026-10-18 ruling; F5, F8, F9, F10 record only. The
  follow-ups item is not yet filed.
