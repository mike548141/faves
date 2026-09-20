- [~] 🔎 **A `spicy-*` tag on an add-on option is legal and renders nothing**
      📌 **CLAIMED 2026-09-21 (session `3e87e0bf`) — OWNER RULED: option (1),
      RENDER IT.** Put to him with the item's own three options and its
      recommendation against (3). His ruling is that the picker's chip row says
      "spicy" the way a dish row already does — the heat scale has words in
      `menu.js` — rather than `validate.py` refusing the tag. Reasoning
      recorded because it reads against ADR 0047's *name the screen that
      renders it*: the answer here is to **name the screen**, not to delete the
      data. A chilli sauce that renders as neutral is a silence about heat, and
      this repo does not do silences on the safety-adjacent surfaces.
      `[XS][js][data]` — found 2026-09-08 (session faves-o1) by the agent that
      built `tests/tag-labels.test.js` (item `340/230`), and filed rather than
      folded in.

  **The fact.** `validate.py` accepts any member of `TAGS` on an add-on option,
  but `addons-ui.js` only ever gives words to a tag that appears in its
  `CONTRADICTS` table, and no heat level does. So `["spicy-3"]` on a sauce
  validates, ships, and is never shown — a silent drop. It errs in the safe
  direction (nothing false is said), but it is a silence, and the corpus is
  free to grow into it.

  **What the guard does today.** The label test exempts heat levels on the
  add-on surface with that reason written down, so it stays green; the
  exemption is the record of this gap, not a fix for it.

  📋 **Options.** (1) Render it: the picker's chip row says "spicy" the way the
  dish row does — small, and the heat scale already has words in `menu.js`.
  (2) Refuse it: `validate.py` forbids `spicy-*` on an option, so the data
  cannot carry what no screen shows (ADR 0047's test). (3) Leave the silence
  and the exemption. Not recommended: (3), because the exemption then guards
  a hole rather than recording one.
