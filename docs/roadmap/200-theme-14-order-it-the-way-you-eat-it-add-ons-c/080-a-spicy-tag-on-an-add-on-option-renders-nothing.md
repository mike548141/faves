- [x] ✅ **A `spicy-*` tag on an add-on option is legal and renders nothing**
      **DONE 2026-09-21 (session `3e87e0bf`, branch `spicy-option-chip`) —
      OWNER RULED: option (1), RENDER IT.** Put to him with the item's own three
      options and its recommendation against (3). His ruling is that the
      picker's chip row says "spicy" the way a dish row already does — the heat
      scale has words in `menu.js` — rather than `validate.py` refusing the tag.
      Reasoning recorded because it reads against ADR 0047's *name the screen
      that renders it*: the answer here is to **name the screen**, not to delete
      the data. A chilli sauce that renders as neutral is a silence about heat,
      and this repo does not do silences on the safety-adjacent surfaces.
      `[XS][js][data]` — found 2026-09-08 (session faves-o1) by the agent that
      built `tests/tag-labels.test.js` (item `340/230`), and filed rather than
      folded in. Recorded as
      [ADR 0119](../../decisions/0119-heat-is-one-vocabulary-and-the-picker-is-a-screen-that-renders-it.md).

  **The fact.** `validate.py` accepts any member of `TAGS` on an add-on option,
  but `addons-ui.js` only ever gives words to a tag that appears in its
  `CONTRADICTS` table, and no heat level does. So `["spicy-3"]` on a sauce
  validates, ships, and is never shown — a silent drop. It errs in the safe
  direction (nothing false is said), but it is a silence, and the corpus is
  free to grow into it.

  🛑 **AND THAT PARAGRAPH IS BROADER THAN THE DEFECT — measured 2026-09-21
  before anything was changed.** Since `200/060` wired the chip row to the
  composed tags, ticking a `spicy-2` sauce DID paint "🌶🌶 Spicy" on the dish
  row like any other composed tag; `composeTags` unions heat in, and
  `isChipTag` in menu.js already admitted it. What rendered nothing was the
  **picker**, in the only moment heat is any use — *while you are choosing*.
  Recorded here rather than quietly fixed, because a session reading "never
  shown" and aiming at it would have aimed at nothing. The item's conclusion was
  right and its statement of the mechanism was a day stale.

  **How much of the corpus this is about.** Measured over all 57 records: **200
  add-on options, of which exactly 2 carry a heat tag** — Wellington Kebab
  Grill's *Mild chilli* (`spicy-1`) and *Hot chilli* (`spicy-2`), side by side
  in one sauce group. Two, not zero, and they are the worst possible two: the
  reader had to tick one to tell them apart.

  **What the guard did.** The label test exempted heat levels on the add-on
  surface with that reason written down, so it stayed green; the exemption was
  the record of this gap, not a fix for it.

  ✅ **What landed.**
  - `site/js/heat.js` — the heat scale's ONE vocabulary (`isSpicy`,
    `heatLevel`, `heatLabel`). It existed twice before, as a regex and a
    template typed out in `menu.js` and again in `recipe.js`; a third copy in
    `addons-ui.js` was the cheapest change and the wrong one. All three import
    it now and none owns the scale.
  - The picker paints `.tag.tag-spicy` on the option row, inside the `<label>`,
    from that module, before anything is ticked. Heat only — an option's other
    tags stay in the warning line (ADR 0096), and heat is the exception because
    it has no warning-line voice at all.
  - The exemption is **deleted and replaced by an assertion**: the label test
    now refuses a surface that does not reach `heat.js` (import round-trips byte
    for byte, names `heatLabel`, calls it, and defines no second `isSpicy`).
  - `addon_check.mjs` 52 → 64 assertions, including the computed **accessible
    name** through the AX tree and the 44px/390px geometry. Break-probe:
    removing the chip fails **7**, all in that block, with 57 still passing.
  - No te reo string is owed — reo.js's SAFETY BOUNDARY keeps every tag chip in
    English on purpose, and heat is a tag chip.

  📋 **Options (as put to him).** (1) Render it: the picker's chip row says
  "spicy" the way the dish row does — small, and the heat scale already has
  words in `menu.js`. (2) Refuse it: `validate.py` forbids `spicy-*` on an
  option, so the data cannot carry what no screen shows (ADR 0047's test).
  (3) Leave the silence and the exemption. Not recommended: (3), because the
  exemption then guards a hole rather than recording one.
