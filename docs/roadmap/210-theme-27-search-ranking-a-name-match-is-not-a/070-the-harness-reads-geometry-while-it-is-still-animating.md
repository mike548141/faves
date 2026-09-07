- [ ] 🔎 **The check harness reads and clicks geometry while it is still
      animating, and the knowledge that prevents it is scattered across three
      tools' headers** `[M][tools]` — found 2026-09-07 (session faves-b1) while
      taking `060`'s co-visibility measurement, and filed rather than folded in.

  **What happened.** A sweep written for `060` scrolled with `scrollTo(0, y)`
  and read the page two animation frames later. `site/css/app.css` sets
  `html { scroll-behavior: smooth }`, so every scroll **animated**: measured
  directly, `scrollTo(0, 5000)` left `scrollY` at **2**. Two hundred and
  thirty-eight swept "positions" were nearly all the same position.
  ⚠️ **It produced the correct answer anyway** (`both: 0`, which the valid run
  later confirmed), so nothing in the output invited a second look. It was
  caught only by printing `scrollY` and noticing it had not moved.

  🔑 **THE HOUSE ALREADY KNEW, TWICE, AND IN NEITHER PLACE A NEW SWEEP WOULD
  LOOK.**
  - `tools/sync_check.mjs`'s header documents it in detail, including a trace
    reading *"scrollY:879 immediately AFTER `scrollTo(0, 0)` had run"*, and
    names the two-argument form as the culprit.
  - `tools/to_top_check.mjs` passes `behavior: "instant"` at **every** scroll —
    correct, and with no comment saying it is load-bearing, so it reads as
    style.
  - **CLAUDE.md's harness section says nothing about it**, and that is the file
    a session actually reads before writing a check.
  This is a **findability** defect, which `PROPAGATION.md` § *Pointing up*
  names as a real and separate finding from a missing rule. The rule exists; it
  is filed where only someone who already knew would find it.

  🚩 **AND IT IS NOT ONLY SCROLLING — this is the wider half.** The same
  mistake is available anywhere the harness touches an element whose geometry is
  mid-transition. A sweep of `tools/*_check.mjs` for scrolls that do **not**
  pass `behavior: "instant"` returns one live site:
  - `tools/cook_check.mjs:1172` — `one.scrollIntoView({ block: "center" })`.
    `scrollIntoView`'s default `behavior: "auto"` **resolves to the CSS
    `scroll-behavior`**, so this one animates too. What follows it is
    `openCook(...)`, which **clicks**. A click dispatched at a coordinate the
    element is still travelling through is exactly how a helper comes to report
    *"no clickable box"*.

  🔗 **How this bears on [`340/190`](../340-theme-20-places-from-anywhere-owner-raised-202/190-two-holes-in-the-check-harness-guarantees.md)
  (a), and where the resemblance STOPS.** (a) is the open question about
  `picks_check`'s intermittent `#settings-btn has no clickable box`.
  🛑 **This item does NOT explain it, and must not be read as doing so.**
  `picks_check` performs **no scroll at all** — checked, it contains no
  `scrollTo`, no `scrollIntoView`. Its failing line 285 clicks `#settings-btn`
  immediately after clicking `#overflow-btn`, i.e. it reads the geometry of a
  control in a menu that has just been *opened*, not scrolled. So this is a
  **sibling** of (a) — same class (geometry read while it is still moving),
  different trigger (a CSS transition rather than a smooth scroll) — and the
  reason to record them together is that **one fix could cover both** while a
  fix aimed at scrolling alone would leave (a) exactly where it is.

  💡 **The material for a fix already exists and is unused at these call sites.**
  `tools/lib/browser.mjs` exports **`untilStable`** — the half of ADR 0093's
  split that means *"wait until this stops changing"*, as against `untilPresent`
  meaning *"the site must show me this"*. A `click` that first waits for the
  target's box to stop moving is that helper applied one layer down. Note this
  interacts with the owner's `340/200` ruling (retry the whole check once): a
  retry that papers over an animation race makes the race permanent and
  invisible, so the stabilising wait should land **before or with** the retry,
  never instead of it.

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 1, WITH A CONDITION.**
  His words: *"I accept your recommendation but want it tested etc for
  lag/latency in use."* So `driver.click` waits for a stable box before
  dispatching, via `untilStable` — **and the cost of that wait must be
  MEASURED, not assumed negligible.**
  🛑 **What the condition actually demands, stated so it is not softened into a
  shrug.** A wait added to *every* click is a tax paid on every assertion in
  sixteen checks. The obligation is a **before/after wall-clock measurement per
  check**, on a quiet machine, reported as numbers — not "it felt the same".
  🔑 And there is a second reason the measurement matters beyond runtime: **a
  wait that is too generous hides a real regression.** If a control genuinely
  takes 400 ms to settle because someone shipped a janky animation, a click that
  patiently waits it out turns a user-visible defect into a green run. So the
  measurement wants **both** numbers — the added time, and the settle time
  actually observed — and the timeout must be **bounded and loud**: a box that
  never settles is a FAILED ASSERTION about the site, not a silent hang and not
  a harness error.
  🚩 It interacts with `340/200`'s ruled retry (retry the whole check once): a
  retry that papers over an animation race makes the race permanent and
  invisible. **The stabilising wait lands before or with the retry, never
  instead of it.**
  ❌ Options 2 (fix the two known sites) and 3 (document only) are **declined**.

  📋 **Original options, kept for the record — option 1 is the ruled one:**
  1. **Make `driver.click` wait for a stable box** before dispatching, using
     `untilStable`. Fixes every call site at once, including the ones nobody has
     hit yet. Costs a small delay on every click and needs a bound so a genuinely
     never-settling element still fails rather than hangs.
  2. **Fix the known call sites only** — `cook_check:1172` gains
     `behavior: "instant"`, and any click after an animation gains an explicit
     wait. Cheapest and smallest, and it leaves the next call site to rediscover
     the trap.
  3. **Document it in CLAUDE.md's harness section and do nothing else.** Honest,
     free, and it is a discipline rather than a mechanism — which this repo's own
     record says is the option that quietly fails.
  🚩 Whichever is chosen, the **arrival assertion is separately worth having**:
  a sweep that refuses to report unless the page reached where it was sent. That
  is what turned this from an undetectable wrong answer into a two-minute fix,
  and it is three lines.
