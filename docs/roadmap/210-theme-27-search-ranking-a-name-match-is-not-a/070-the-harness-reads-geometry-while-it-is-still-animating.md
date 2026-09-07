- [x] 🔎 **The check harness reads and clicks geometry while it is still
      animating, and the knowledge that prevents it is scattered across three
      tools' headers** `[M][tools]` — found 2026-09-07 (session faves-b1) while
      taking `060`'s co-visibility measurement, and filed rather than folded in.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — option 1 built, in
  `tools/lib/browser.mjs`; ADR 0101. `driver.click` now waits for the target's
  box to stop moving before it dispatches, **inside the page**: read the rect,
  wait one animation frame, read again, dispatch when two consecutive frames
  agree within 0.5 px and the box is at least 1×1. That keeps the CDP
  round-trip count exactly what it was — polling from Node would have added a
  round-trip to every click in sixteen tools. Bounded by
  `FAVES_CLICK_SETTLE_MS` (default 2000) and **loud**: a box that never settles
  raises `UnstableElementError` → `FAIL UNSTABLE ELEMENT`, **exit 1**, naming
  the elapsed time, the frame count, the last movement and any animations still
  running. That also answers the question ADR 0093 left open in its
  Consequences: a geometry throw is a **site** claim.

  🔎 **`cook_check.mjs:1172` also gained `behavior: "instant"`.** The
  stabilising click covers that call site either way, but not animating at all
  is cheaper than waiting an animation out, and it removes the one live site
  the 2026-09-07 sweep found.

  🔎 **The arrival assertion is built, as a REFUSAL rather than an assertion.**
  There was no scroll helper to hang it on, so `driver.scrollTo(y)` is new: it
  passes `behavior: "instant"` and refuses unless the page arrived within 2 px.
  `to_top_check`'s two in-page sweeps count non-arrivals and **raise** rather
  than report. A `report.check` would have let the run print 63 other verdicts
  computed from one scroll position pretending to be 3,452 — which is exactly
  what happened here, correct answer and all. Assertion count unchanged at 64.

  📊 **THE MEASUREMENT THE OWNER ASKED FOR — and it changed the answer twice.**
  Both trees swept back to back on the same machine, same base commit, no peer
  sessions and no orphan Chromes; `FAVES_CDP_TIMEOUT_MS=60000`. ⚠️ The machine
  was **not** quiet — an unrelated session's `cbom`/`pytest` jobs were live and
  1-minute load ran 9–46 — so every wall-clock figure below is **provisional**.
  All sixteen passed on both trees.

  | check | before ms | after ms | Δ | settle observed (printed every run) |
  |---|---|---|---|---|
  | boot | 9679 | 11909 | +2230 | — no `driver.click` |
  | device | 4954 | 6833 | +1879 | 12 clicks, 388 ms, 2 waited, worst 173.4 |
  | cook | 51315 | 69127 | +17812 | 130 clicks, 1603 ms, 0 waited |
  | addon | 5996 | 8525 | +2529 | 20 clicks, 187 ms, 0 waited |
  | branch | 5936 | 9205 | +3269 | 6 clicks, 37 ms, 0 waited |
  | to_top | 138130 | 150527 | +12397 | — no `driver.click` |
  | filter_row | 11588 | 12746 | +1158 | — no `driver.click` |
  | recipe | 13534 | 11793 | −1741 | 5 clicks, 52 ms, 0 waited |
  | served | 14235 | 10455 | −3780 | — no `driver.click` |
  | midnight | 34897 | 20017 | −14880 | — no `driver.click` |
  | geo | 33327 | 31952 | −1375 | 6 clicks, 30 ms, 0 waited |
  | note | 9678 | 12199 | +2521 | 9 clicks, 102 ms, 0 waited |
  | focus | 6851 | 9211 | +2360 | 1 click, 4 ms, 0 waited |
  | picks | 10309 | 13809 | +3500 | 6 clicks, 172 ms, 2 waited, worst 103.9 |
  | distance | 9192 | 11908 | +2716 | 2 clicks, 9 ms, 0 waited |
  | sync | 26724 | 24832 | −1892 | 58 clicks, 2137 ms, 10 waited, worst 223.3 |
  | **total** | **386.3 s** | **415.0 s** | **+28.7 s** | **4.7 s attributable** |

  🛑 **READ THE FIVE ZERO-CLICK ROWS FIRST — they are the control, and they
  say the sweep cannot resolve this cost.** `boot`, `to_top`, `filter_row`,
  `served` and `midnight` make no `driver.click` at all, so the change cannot
  have touched them; they moved from **−14.9 s to +12.4 s**, net −2.9 s. One
  check's noise is larger than the entire attributable cost of all sixteen.

  📊 **So it was measured again, interleaved** — base/new/base/new on one
  machine, three repetitions, medians:

  | check | base median | new median | Δ median | settle measured |
  |---|---|---|---|---|
  | cook (130 clicks) | 44607 | 45458 | **+851 ms on 45 s (+2%)** | 1761–1815 ms |
  | sync (58 clicks) | 14225 | 16928 | **+2703 ms on 14 s (+19%)** | 1869–2162 ms |
  | addon (20 clicks) | 6382 | 5403 | **−979 ms (below noise)** | 256–319 ms |

  🔑 **The second number is the one that matters, and it is the reason the
  owner asked for it.** A wait too generous hides jank, so the worst settle is
  printed by name every run. Today: `.sync-body .settings-reset` *"Sync now"* at
  **176–237 ms**, `.profile-btn[data-act="add"]` at **173.4 ms**,
  *"Show suggestions again"* at **103.9 ms**, `#overflow-btn` at **22–30 ms**.
  Those are real animations that were being clicked mid-flight. If any grows,
  the number grows and the run says so — which a wall-clock total never would.
  The settle totals repeat to within 3% across runs, which is itself evidence
  the instrument is sound where the wall clock is not.

  ✅ **Break-probed, both halves, verbatim.** Bound shrunk to 1 ms against a
  control that genuinely animates:

      FAIL  UNSTABLE ELEMENT — #overflow-btn never came to rest: after 13.7ms
      and 1 frames its box was still moving (last frame dx 0, dy -23); still
      running: opacity, transform

  And a target made to animate forever, at the default 2 s bound:

      FAIL  UNSTABLE ELEMENT — #overflow-btn never came to rest: after 2007.1ms
      and 121 frames its box was still moving (last frame dx 0, dy 1.7); still
      running: probe-never-settle

  Both exit **1**, both named, neither retried.

  ❌ **IT DOES NOT COVER `340/190` (a), and the evidence says why.** This item
  hoped "one fix could cover both". It does not, and the instrumentation is
  what proves it: `picks_check` still fails intermittently, and the new message
  reads `#settings-btn has no clickable box: 2010.5ms and 121 frames after the
  page was asked for it, it still measures 0.0x0.0` — with **`anims: 0`**. A
  failure-only probe caught the state: the overflow menu is `display: none`,
  `hidden`, `aria-expanded="false"` — **it never opened** — and `#overflow-btn`
  sits at `top: -35`, off the top of the viewport. So (a) is a **scroll /
  hit-test** fault, not an animation one, and no stabilising wait can reach it.
  Paired, interleaved runs (the only fair comparison — an unpaired sample at
  different loads first suggested 6/10 against 2/10 and was noise): **base 3 of
  10 failures, this branch 1 of 10.** Not worse, and far more legible: base
  fails as a bare `harness error … exit 2` with no `FAIL` line, this branch as
  a named exit 1 carrying the evidence above. **`340/190` is left untouched for
  its owner** — reported, not edited.

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
