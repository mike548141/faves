- [ ] **A "must-see" choice opens when you press Add** `[M][schema][js]` —
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
