- [x] **A "must-see" choice opens when you press Add** `[M][schema][js]` —
  **owner-ruled 2026-10-03:**

  > *"We need a way to mandate a user at least seeing the options, so that they
  > have not missed it. I am thinking some code that if the addon is marked as
  > "must-see" (or something to that effect) in the data model then when the
  > user adds the dish to the order (i.e. presses Add button) the addon section
  > expands to show them."*

  **Bounded by ruling 4, same day:** *"Some addons are purely optional and what
  we have today is perfect for those"*. Must-see is therefore a flag a group
  opts into. It is **not** a change to every picker.

  **What exists.** A `required` group (ADR 0156) already does most of this:
  the row's Add is blocked, and tapping it opens the picker on the first
  unanswered radio. The cases nothing covers are a choice that **has** a
  default, such as the Garlic Tikka's pre-selected Full, and a consequential
  optional choice. In both, Add succeeds silently and the reader never learns
  a choice was made for them.

  **Design points for whoever builds it:**
  - ✅ **Owner ruled 2026-10-03 (asked by `faves-de`): every `selects`
    ladder is must-see by rule, and other groups opt in with a flag.**
  - Should `required` imply must-see? It already behaves that way.
  - ⚠️ Read with **14g** (`200/030`, open, designed but not approved). 14g
    expands the picker on Add for **every** dish. Ruling 4 says the optional
    pickers are right as they are. The two rulings bound 14g's state 1 to
    must-see groups, and 14g's state machine should be reconciled before
    either is built.
  - Expanding the picker must not move focus. 14g already reasons about this
    for repeat-tappers.

  🔎 **Survey candidates 2026-10-03** (`200/100`,
  [the review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)):
  defaulted ladders and choices where a silent default changes the dish or the
  bill. Examples are Spices Indian Half/Full, BurgerFuel Single/Double, Gong
  Cha Regular/Large, the unnamed `size-1` pours, and a coffee's milk.

  Lands in: an ADR, the group schema in `ARCHITECTURE.md`, `validate.py`,
  `addons-ui.js`/`cart-ui.js`, and `addon_check.mjs`. That check must show a
  must-see group opening on Add **and** an unflagged optional group staying
  closed, because the absence is the half that rots.

  ⏳ **Built, held for an owner ruling — 2026-10-16 (`faves-11`).** The
  build is PR #108 (branch `w/200-120`, ADR 0159, `SHELL_VERSION`
  `2026-10-16.3`), verified (`addon_check` 160, `node --test` 1867,
  `test_validate` 279) and **not merged**, because it surfaced a fork that
  changes what the feature does:
  - 🎯 **A change made in the picker that opens on Add makes a second order
    line.** Add has already ordered the default, so choosing Half after the
    picker opens leaves the Full ordered as well. A (as built): a second
    line. B (the builder's recommendation): the change moves the line just
    added. C: Add only opens the picker, so every ladder dish takes two
    taps. This is `14g`'s edit-or-add-another question, met first here.
  - 🎯 **Which `adds` groups get `mustSee: true`:** none is set. The
    candidates are Gong Cha's size (77 dishes; ADR 0130 says it should become
    a `selects` ladder, which would make it must-see by rule), the two
    coffee-milk groups (15), Abrakebabra's combo (61), and the Victoria's
    margarita flavour (more a `required` question).
  - The PR also fixes a bug found on the way: focus fell to `<body>` on every
    ＋ Add, because the pressed button is replaced. That fix waits with it.
  - Rebase note: PR #110 has since added assertions in `addon_check.mjs`
    section (w); #108's own block is separate.

  ✅ **Owner ruled 2026-10-16 (asked by `faves-11`, via AskUserQuestion):**
  - **B: a change made in the picker that opens on Add UPDATES the line just
    added** (Full → Half leaves one Half, not a Full and a Half). #108 is
    reworked to this before it merges.
  - **`mustSee: true` on three groups:** the two coffee-milk groups, Gong
    Cha's size group, and Abrakebabra's combo. (Gong Cha's size may instead
    become a `selects` ladder per ADR 0130, which is must-see by rule; either
    way it ends must-see.)

✅ **Done 2026-10-16 (faves-11 worker), reworked to B the same day.** ADR 0159
(PR #108, branch `w/200-120`), `SHELL_VERSION` `2026-10-16.6`.

**What landed.** The row's ＋ Add (none to one) opens the closed `<details>`
picker for every `selects` ladder (by rule) and any `adds` group with
`"mustSee": true`; the dish is still added. A sentence in words (page and status
region), no focus move, no animation. `required` is not must-see; `mustSee` on a
`selects` or `required` group, or `false`, is a `validate.py` error. The stepper
also keeps keyboard focus across its own re-render (focus fell to `<body>` on
every first ＋ Add before; measured).

**B, as ruled.** A change made in that picker **moves the one unit just added**
(`cart.js` `moveOneItem` / `order.moveOne`): Full to Half leaves one Half. It
moves one unit only (a line of two splits), joins an existing destination line,
carries a note with the unit, and ends when the dish's total quantity changes
(any ＋/−), the line is gone or re-keyed by a note, the picker is closed, or a
required choice is open (so a moved unit is never an ADR 0158 unfinished line).
Announced as "Updated in your order: …". Only a reveal that actually opened the
picker starts it.

**Data (owner-ruled): `mustSee: true` on four groups** (Gong Cha `size`, 77
dishes; Groundup `milks`, 10; the Victoria `milk-options`, 5; Abrakebabra
`combo`, 61). `gen_summaries.mjs` re-run (3 outputs committed). **Gong Cha's size
was flagged, not converted** to a `selects` ladder: it is shared by 77 dishes at
19 prices (a ladder's `dishPrice` is absolute, so one group per price and tag
set), and every stored order line or saved order holding `size/large` would be
stranded. Not mechanical, not safe. Same behaviour either way.

**Volume.** 130 dish rows in 8 venues open on Add by rule (Southern Cross 36,
Victoria 31, Borough 27, Bristol 19, Khandallah 9, BurgerFuel 3, Spices Indian 3,
Baylands 2), plus the four flagged groups' dishes.

**Verified.** See the PR for the run-by-run counts; `addon_check` 174 passed, 0
failed (27 new `(ab)` assertions across the reveal and B). B break-probed: with
the move disabled (back to A) the B assertions fail ("choosing Large after Add
leaves ONE line", "…is SAID", "a third rung is still ONE line", the confirm-by-＋
pair), and the run then stops on a missing element. Earlier probes (unflagged
optional made must-see; `required` made must-see; focus restore removed) each
failed their named assertion.
