- [x] 🔎 **The sticky contact bar is a NINTH place the closure sentence appears,
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

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — TAKE THE MEASUREMENT FIRST,
  THEN HE DECIDES.** All three options were put to him with the measurement
  offered as the recommendation, and he took it: nobody is to make the taste
  call until the co-visibility number exists. So **the measurement is the work
  this item now owes**, and the taste call stays with him afterwards. If the two
  surfaces are never co-visible at 390 px, option 1 wins by default and the
  question dissolves — which is why measuring is cheaper than deciding.

  ✅ **MEASURED 2026-09-07 (session faves-b1) — THEY ARE NEVER CO-VISIBLE. 0 of
  421 swept positions, across two page shapes.** The measurement the item asked
  for, taken before the taste call as ruled.

  | page shape | venue | positions swept | scroll range | **both** | banner only | bar only | neither |
  |---|---|---|---|---|---|---|---|
  | chain, many branches | `mcdonalds` | 238 | 0–8792 px | **0** | 6 | 216 | 16 |
  | single site | `dragonfly` | 183 | 0–6746 px | **0** | 6 | 164 | 13 |

  The banner is gone by `y=185` on both. The sticky bar first appears at
  `y=814` (chain) and `y=703` (single site). Between them sits a dead band —
  16 and 13 positions — where neither is on screen. They do not merely fail to
  overlap; they are separated by roughly two thirds of a screen.

  🔑 **So option 1 wins by default, on the item's own stated test**, and options
  2 and 3 are solving a problem that does not occur. The bar is not a *repeat*
  of the banner to any reader: by the time it appears the banner has been off
  screen for over 500 px. Muting it would quieten the only closure notice a
  reader has at that point, which is the opposite of what `050` was for.

  **Method, because the numbers are only worth what the method is.** 390 px
  viewport, real Chrome on a fresh profile, the whole document swept in 37 px
  steps rather than sampled — `to_top_check`'s lesson, learnt here the hard way.
  Two things were deliberately not trusted:
  - **The bar's state is READ, not predicted.** The obvious probe computes the
    bar from the contact card's own box, which is re-implementing the
    `IntersectionObserver` rule the measurement is supposed to be testing — it
    would agree with a broken implementation. So the sweep is async, waits two
    animation frames after each scroll, and reads whether the bar is actually
    painted. The predicted value was recorded alongside and compared:
    **0 disagreements** in the valid runs.
  - **The fixture is proved to be doing its job.** The corpus holds **no closed
    venue at all**, so the closure is injected via `startServer`'s overlay under
    a fixture id, as `branch_check` does. The first run printed
    `banner present: false` — the injection had silently failed, because the
    event key is `type` and not `kind`. Printing the rendered TEXT is what
    caught it; a sweep that only counted booleans would have reported a
    confident, meaningless zero.

  🛑 **AND THE FIRST VALID-LOOKING RUN WAS STILL WRONG, WHICH IS THE FINDING
  WORTH KEEPING.** `app.css` sets `html { scroll-behavior: smooth }`, so a plain
  `scrollTo(0, y)` **animates**: two frames later the page has moved about 2 px.
  Measured directly — `scrollTo(0, 5000)` left `scrollY` at **2**. The sweep
  therefore read 238 "positions" that were nearly all the same place.
  ⚠️ **It reported `both: 0` — the same answer the valid run later gave.** A
  broken measurement that happens to agree with the truth is worse than one that
  disagrees, because nothing about the output invites a second look. It was
  caught only by printing `scrollY` and seeing it had not moved. The sweep now
  passes `behavior: "instant"` and **refuses the whole run** if the page did not
  arrive within 2 px of where it was sent.
  🔑 `sync_check.mjs`'s header already documents this exact trap, and
  `to_top_check` already passes `behavior: "instant"` at every scroll — **the
  house knew and the knowledge was not where a new sweep would find it.** That
  is a findability defect, and it is filed as `210/070`.

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 1, LEAVE IT AT FULL
  WEIGHT.** Put to him with the measurement in hand and option 1 recommended.
  **CLOSED: no work is owed and nothing was built.** Options 2 (mute it) and 3
  (suppress it while the banner shows) are **declined** — recorded so neither is
  re-proposed. 🔑 Option 3 in particular would have been **dead code**: the
  measurement shows the condition it fires on never occurs.
  🔑 **The item closed by being measured, not by being built**, which is the
  cheapest way an item can close and is worth naming as a pattern — its own
  text predicted it (*"if they are not [co-visible], this is close to a
  non-problem and option 1 wins by default"*) and was right.

  🚩 **Worth checking before deciding:** whether the sticky bar and the header
  banner are ever visible *at the same time* at 390 px. If they are not, this is
  close to a non-problem and option 1 wins by default. That is a measurement
  nobody has taken, and taking it should come before the taste call.
