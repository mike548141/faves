- [ ] 💡 **The shopping list appears on screen when it has items, not in the ⋯ menu**
      `[S][ux]` — owner-raised 2026-11-18, for later.

  **Owner, verbatim:** *"Consider if the shopping list should just appear on
  screen when it has items in it, and not in the menu. Similar to how the order
  button appears once you have added something to an order."*

  **What shipped as at 2026-11-18 (read at `961875fc`).** "Shopping list" is an
  entry in the ⋯ overflow menu on every screen that carries `#shopping-btn`
  (`initShoppingEntry` in `site/js/shopping-ui.js`). It is shown whether or not
  the list is empty, with a count badge that hides at zero: the comment there
  says *"the entry stays, so the list is findable when it is empty"*. The order
  button is the model he names: `.order-fab` in `site/js/cart-ui.js` is built
  hidden and appears once an order has a line in it.

  **For whoever takes it.**
  - An empty list then has no way in. Adding to it happens on a recipe page
    ("Add to shopping list"), so that may be fine, but say so.
  - Two floating buttons may now be on screen at once (order + shopping list),
    and the back-to-top button already shares that corner. `to_top_check`
    guards collisions there; read Theme 29 (`300-…`), *things pinned over the
    menu*, first.
  - Whether the ⋯ entry goes or stays alongside is part of the ask ("not in the
    menu"); confirm before removing it.
