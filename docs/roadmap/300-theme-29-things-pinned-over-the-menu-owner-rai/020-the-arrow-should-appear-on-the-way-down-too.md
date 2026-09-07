- [x] 🎯 **The back-to-top arrow should appear on the way DOWN too — and still
      not sit on a price** `[M][js][css]` — ✅ **CLOSED 2026-09-07 (session
      faves-24); the claim is released.** Owner, this session: *"On the restaurant page. The arrow to
      scroll to the top of the page should appear the moment I start to scroll
      down the page, currently it does not appear until I start to scroll back
      up after scrolling down."*

  ✅ **DELIVERED 2026-09-07 (merged `4e64fc1`). BOTH halves, with zero
  occlusion measured across all eight sweep combinations.**

  🔑 **How it answers `010`'s "there is nowhere at 390 px that is not over the
  list", which was correct and was not discarded.** At 390 px `.wrap` is
  `100% - 2·--space-3`, so the gutter is **16 px** and a 44 px target cannot
  live in it. The way through is that *"over the list"* is not the same as
  *"over anything of the reader's"*: the same sweep that measured the damage
  also measured the escape — at **every** occluded position a clear resting
  place existed a short move **up the same column**. So the control now stays
  offered and **steps aside**, climbing the smallest distance that clears the
  topmost protected box in its column with 6 px of air, and returning to the
  corner the moment the corner is free. One layout read per rAF tick, all reads
  before the single write. `JITTER` and the direction tracking are **gone** —
  direction no longer decides anything. The tuck survives only as a safety
  valve, and the check **fails if it ever fires**.

  📊 **Measured, before → after** (before = the declined straight revert,
  produced by switching the dodge off, so it is reproducible in one edit):

  | screen / width / text | swept | occluded before | worst before | after |
  |---|---|---|---|---|
  | menu 390 / 16 | 554 | **151** | 100% of a `$8` | **0** |
  | menu 390 / 24 | 844 | **184** | 100% | **0** |
  | home 390 / 16 | 200 | **134** | 88.8% of a ♡ | **0** |
  | home 390 / 24 | 391 | **174** | 77.9% | **0** |
  | home 1200 / 16 | 96 | **60** | 86.2% | **0** |
  | home 1200 / 24 | 157 | **70** | 94.6% | **0** |

  (Menu at 1200 px has nothing to solve — the column stops at 756 px and the
  button sits at 1004 px.) ⚠️ **These do not reconcile with the historical
  "96 of 547 / 17.6%"**, and no attempt was made to force them to: that figure
  came from a sweep the old tool never actually ran (see `340/210`), over a
  document 21,667 px tall where this one is 21,330 px.

  🎯 **ONE DECISION LEFT, AND IT IS THE OWNER'S — the ± order stepper.** The
  dodge protects `.dish-price`, `.dish-name`, `.heart` and `.card-name`. Because
  the button is now on screen for the *whole* of a downward read where it used
  to be tucked, it can come to rest on a dish's **＋/− stepper and own that
  tap** — the same harm class as the order pill eating a dietary chip's tap.
  Adding `.stepper-add, .stepper-btn, .dish-photo-btn, .dish-report` was
  **measured and works** (occlusion still 0, still inside the travel limit), at
  this price on the menu at 390 px:

  | | ships today | with the stepper protected |
  |---|---|---|
  | positions where it steps aside | 151 of 537 | **326 of 537** |
  | furthest it travels | 82 px | **168 px** |

  Home list is unaffected (cards carry no steppers). **Doubling the movement on
  the very screen this was raised from is a taste call, so it is recorded in the
  module header and not taken.** The home list's whole-card link is deliberately
  *not* protectable — it spans the card, so counting it leaves nowhere clear.

  ⚠️ **Stated limits, none of them papered over.** No real device — headless
  Chrome only, and iOS Safari rubber-banding is exactly where a scroll-driven
  control misbehaves. **Mid-glide is not measured**: the sweep disables the
  transition so every sample is a *resting* position, so a fast flick can put
  the button briefly over a price while the 0.16 s glide catches up. And whether
  151 of 537 stopping places with the arrow floating above its corner *feels*
  right is not something any check can judge.

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
