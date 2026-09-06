- [ ] 🔎 **The sticky contact bar is a NINTH place the closure sentence appears,
      and `050` counted eight** `[XS][ux]` — found 2026-09-07 (session faves-24)
      while delivering `050`'s muting, and filed rather than folded into it.

  `050` framed the problem as *"the header banner says it once, then every branch
  heading repeats it"* — one plus seven, on a seven-branch chain. Delivering the
  ruling meant reading every surface that renders the sentence, and there is a
  tenth-of-a-screen one nobody had counted: the **sticky contact bar** in
  `site/js/menu.js` states it too, at full weight, and it is *sticky* — so on a
  long menu it is the occurrence a reader sees **most**, not least.

  🔑 **It was deliberately left at full weight, and that is the finding, not an
  oversight.** The ruling was *"full weight on the header, subdued on the
  rows"*. The sticky bar is neither: it is a different surface with a different
  job, and muting it was not what was ruled. Changing it on the delivering
  session's own judgement would have been exactly the quiet scope-widening the
  house forbids.

  🎯 **The question this leaves, which is a taste call and small:**
  1. **Leave it.** The sticky bar is the one surface a reader may see without
     ever scrolling to the branch rows, so full weight is arguably right there.
  2. **Mute it like the rows**, on the grounds that the header banner is the one
     place the sentence should shout and everything else is a repeat.
  3. **Suppress it while the header banner is on screen**, so the two never say
     the same thing simultaneously — the most work, and the only option that
     needs JS rather than a CSS rule.

  🚩 **Worth checking before deciding:** whether the sticky bar and the header
  banner are ever visible *at the same time* at 390 px. If they are not, this is
  close to a non-problem and option 1 wins by default. That is a measurement
  nobody has taken, and taking it should come before the taste call.
