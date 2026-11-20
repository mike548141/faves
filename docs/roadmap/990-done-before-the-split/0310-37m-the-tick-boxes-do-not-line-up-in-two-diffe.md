- [x] **37m — the tick boxes do not line up, in two different ways**
      `[XS][css]`. **CLAIMED 2026-08-16 13:55 UTC (wt: faves-recipe)** — the
      recipe-page pass. Owner, 2026-08-16: *"the ingredients tick boxes are not
      lined up with the method steps. And the method steps tick boxes are not
      lined up with the method step numbers."* Two complaints, two separate
      causes, both found in `app.css` and both cheap.
      🔎 **Vertical (number vs tick).** `.recipe-body .method li` correctly sets
      `align-items: start`, and then
      `.recipe-body .method li:has(.tick) { align-items: center; }` **overrides
      it**. On a step that wraps to two lines, `center` puts the step number
      halfway down the whole block while the tick box — `.tick` is
      `align-items: flex-start` with a `margin-top: 0.28em` cap-height nudge —
      stays on the first line. A one-line step looks fine, which is why this
      survived: it only shows on the wrapped ones. **Fix: `start`.**
      🔎 **Horizontal (ingredient tick vs method tick).** `.recipe-body .method
      li` is `grid-template-columns: 1.6em 1fr`, so the number's gutter pushes
      the method's tick 1.6em right. Meanwhile `.ingredients li:has(.tick)` sets
      `padding-left: 0` (the bullet is dropped once a box is there), so the
      ingredient tick sits hard against the margin. The two columns can never
      agree. **Fix: give the ticked ingredients list the same `1.6em` leading
      column** so both lists share one tick column down the page — an empty
      gutter on the ingredients reads as alignment, which is the thing asked
      for.
      🔑 **Worth keeping: the second bug was introduced by the fix for a first.**
      `padding-left: 0` and `content: none` were added deliberately, with a good
      comment (*"The bullet and the box say the same thing; the box says it
      better"*), and that change is what pulled the ingredient ticks out of line
      with the method's. A local improvement that breaks a global alignment is
      invisible to the person making it, because they are looking at one list.
      🔎 Do this **with 37c/37d/37l**, not before: collapsing, two columns and
      component grouping all move these same rows, and aligning them twice is
      the waste.
