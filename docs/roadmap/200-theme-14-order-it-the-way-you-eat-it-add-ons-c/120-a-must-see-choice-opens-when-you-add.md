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

✅ **Done 2026-10-16 (faves-11 worker).** Landed as ADR 0159 (branch `w/200-120`).

**What the picker was.** Read from the code, not from 14g: a `<details>` with no
`open`, **closed** on every dish, with the row's ＋ Add outside it. `200/030`'s
"renders open on every dish" does not describe the code, so "expands on Add" is
closed to open and 14g's state machine was not needed and not built.

**What landed.** The row's ＋ Add taking a dish from none to one calls the
picker's `reveal()`. It opens the picker for every `selects` ladder (by rule) and
any `adds` group with `"mustSee": true`; the dish is still added. It shows
"Added as listed. Check “Size” below…" on the page and through a `role=status`
region beside the picker, scrolls the first group in only if off-screen, animates
nothing, and never moves focus. ＋ and − do not trigger it. `required` is **not**
must-see (Add already waits for it), and `mustSee` on a `selects` or `required`
group is a `validate.py` error (redundant; same reasoning as 0156's `required` on
`selects`), as is `false`. `ARCHITECTURE.md`'s group schema carries the flag.

**A defect found underneath and fixed.** Pressing ＋ Add replaced the button, and
focus fell to `<body>` (measured by the break-probe: `tag: BODY`). `dishStepper`
now puts focus on the control that took its place. That is every stepper.

**Verified (real counts).** `node --test` 1867 pass; `validate.py` 57 files
valid; `test_validate.py` 279 mutations behaved (6 new); `addon_check` 160 passed,
0 failed (13 new `(ab)` assertions; the first run had 1 failure, my own wrong
selector, fixed). Break-probes, each reintroducing a bug and watching the named
assertion fail: (1) an unflagged optional group made must-see: the CONTROL
assertion failed; (2) `required` made must-see: "a required group … is NOT
re-opened" failed; (3) stepper focus restore removed: "focus did NOT move into the
picker… not <body>" failed (and two sibling focus assertions). (1) and (2) were
done in one run with (3), so the three failures are attributed by assertion name,
not by separate runs; a cruder first probe (every group must-see) stopped the
run at an earlier block. `device_check` was not run (hangs on main, `340/320`).

**🎯 For the owner: which `adds` groups get `"mustSee": true`.** Not set on any
(a content call). Measured candidates, silent default changes the dish or bill:
- `gong-cha/size` (Regular +$0 / Large +$1, an `adds` group, 77 dishes): the
  biggest, and 0130 says it should become a `selects` ladder, which would make it
  must-see by rule without a flag;
- `groundup-cafe/milks` (10 dishes) and `the-victoria-tavern/milk-options` (5):
  alternative milks, +$1 each;
- `abrakebabra/combo` (61 dishes, +$7): changes the bill;
- `spices-indian/naan-upgrade` (1), `sprig-and-fern-thorndon/nga-base` (5, one
  option, +$3.50), `sprig-and-fern-berhampore/kids-drink` (3, +$3.50);
- `the-victoria-tavern/margarita-flavour` (1): three $0 flavours with no None; a
  `required` question more than a must-see one.
Already covered by rule, no flag needed: BurgerFuel Single/Double, Spices
Indian Half/Full and the unnamed `size-1` pours are all `selects`.

**🎯 Volume the rule has: 130 dish rows in 8 venues open on Add** (Southern Cross
36, Victoria Tavern 31, Borough Tawa 27, Hotel Bristol 19, Khandallah 9,
BurgerFuel 3, Spices Indian 3, Baylands 2). Mostly pub drinks with a pour size.

**🎯 Not decided: a change made in the revealed picker makes a SECOND line**
(Half stays ordered; Full is a new Add). Options A (shipped), B (the change moves
the line just added), C (Add only opens) are in ADR 0159. B recommended; it is
14g's state 2/3 question and `200/030` is still not approved to build.
