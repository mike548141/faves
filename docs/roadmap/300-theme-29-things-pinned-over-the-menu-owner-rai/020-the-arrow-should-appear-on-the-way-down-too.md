- [~] 🎯 **The back-to-top arrow should appear on the way DOWN too — and still
      not sit on a price** `[M][js][css]` — 🔒 **CLAIMED 2026-09-07 (session
      faves-24).** Owner, this session: *"On the restaurant page. The arrow to
      scroll to the top of the page should appear the moment I start to scroll
      down the page, currently it does not appear until I start to scroll back
      up after scrolling down."*

  🛑 **This reverses `010` in this same section, which the owner also raised,
  and the reversal was put to him with that evidence before any code moved.**
  `to-top.js`'s header records why it tucks on the way down: *"the ↑ sat over
  the 'French fries' row and hid the right-hand end of its price"*, and the
  measurement behind it — at 390 × 844 over a real menu (thai-tara-express,
  21 667 px, 547 scroll positions) the button **covered a `.dish-price` at 96
  of them (17.6%)**, worst case covering a price **100%**, leaving 0 px of "$8"
  readable; on the home list it covered a venue's ♥ at 64 of 169 positions,
  worst case 88.8%.

  ✅ **RULED 2026-09-07 — SHOW IT ON THE WAY DOWN, AND MOVE IT CLEAR.** Put to
  the owner with four costed options; he took the one that honours **both** of
  his asks rather than trading one away. So:
  - The control is **offered while scrolling down**, not only on the up-gesture.
    The `goingDown` tuck that `010` introduced no longer governs whether it is
    visible.
  - **And it must not occlude a price or a ♥.** *"Just show it on scroll-down"*
    — the straight revert — was explicitly **declined**, so re-introducing the
    measured occlusion is not an acceptable outcome of this item.

  🚩 **`010`'s reasoning is not wrong and must not be discarded**: *"a fixed
  control over a scrolling list will always overlap something, so 'move it' is
  not a fix — there is nowhere at 390 px that is not over the list."* That
  sentence is why option 2 here is not simply "shift it 20 px". Whatever lands
  has to answer it — by dodging what is actually under it, by shrinking to a
  footprint that clears the price column, by riding the safe-area edge, or by
  some route nobody has thought of yet. **A solution that merely moves the
  overlap somewhere else has not solved it**, and the sweep below is what tells
  the difference.

  📋 **The bar for "done", which is not negotiable and is already built.**
  `tools/to_top_check.mjs` sweeps the **whole document in 37 px steps at two
  widths and two text sizes** — it exists because *"a fixed control's victim
  depends entirely on where you stop scrolling, and a single sample is what
  every eyeball report of this bug had been."* Re-run it and require the
  occlusion count to be **0**, or state the residual honestly with its worst
  case. **Do not** assert the overlap is gone from a screenshot or a single
  scroll position; that is the exact evidence standard this check was written
  to replace.
  🔑 Also keep what `010` got right and is easy to lose: the tuck is
  `opacity + transform`, **never** `visibility`/`pointer-events`, so the button
  stays focusable and in the accessibility tree; `.to-top.is-tucked:focus-visible`
  brings it straight back on Tab; and it is never tucked while it holds focus.
