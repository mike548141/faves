- [ ] 🛑 **`cook_check` wedges on its DEFAULT recipe, deterministically, and it
  is not machine load** `[M][js]` — found and **controlled** 2026-08-17 while
  merging the cook-mode work. This is a different fault from `010` in this
  section (transport flakiness under load), and conflating the two is how it
  stays unfixed.

  **The measurement.** `node tools/cook_check.mjs` reaches **30 PASSes**, always
  the same 30, ending at *"a step that never says how long gets NO timer"*, then
  `harness error: Runtime.evaluate timed out after 180s`, **exit 2**. Seven
  consecutive runs by the building session at 180 s and 240 s CDP budgets; then
  reproduced by the merging session and **controlled against a throwaway
  worktree at `origin/main`** carrying none of the changes — **identical wedge,
  identical point.** So it is not the new code.

  🔑 **And the load explanation does not survive the control.** The building
  session attributed it to heavy swap (12.5 GB of 14.3 GB). At the moment the
  merging session reproduced it the machine reported **67% memory free and load
  average 3.81**. A fault that is deterministic at one assertion, at two very
  different memory pressures, is not the contention signature `010` describes —
  `010`'s evidence is *intermittent* failure across *several* tools.

  ✅ **The workaround completes and is the only known good run today:**
  `node tools/cook_check.mjs --dish "Easy Pad Thai"` → `OK — 83 passed, 0
  failed`. Verified on the merged tree by the merging session.

  🚩 **Why this outranks its size: `cook_check` is one of the twelve guards CI
  does not run.** A guard that only a human types, and that now cannot complete
  on its own default input, is on the honour system *and* broken — and it exits
  2 with no `FAIL` line, so it does not look like a failure. Anyone who runs it,
  sees a wall of PASS and moves on has been told nothing. That is the exact
  shape [ADR 0072] names.

  🔎 **Two smaller faults in the same tool, found by the building session, not
  fixed:**
  - `cook_check.mjs` section 4b (line ~883) passes **raw** `recipe.ingredients`
    to `ingredientsForStep`, where the page always passes `ingredientKeys(...)`.
    Harmless for the current default recipe, which has flat strings — but on a
    **component-grouped** recipe it computes `needed = []` and quietly asserts
    nothing. A check that asserts nothing is worse than no check.
  - `ingredientsForStep`'s docstring is **wrong about its own mechanism**. It
    says *"the FIRST word of a multi-word ingredient is deliberately not a term
    on its own"*; `ingredientTerms` in fact adds **every** kept word, and it is
    `PREP_WORDS` containing `"baking"` that stops *"baking powder"* claiming
    *"baking paper"*. Pre-existing. A reader reasoning from that sentence
    reasons from a mechanism that is not there.

  **Where to start:** the wedge is in `Runtime.evaluate`, which means the page
  stopped answering rather than an assertion failing — look at what the default
  recipe (*Jesse's Garlic Chicken Thighs*) does at the timer step that Easy Pad
  Thai does not.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
