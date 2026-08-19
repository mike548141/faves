- [~] 🛑 **`cook_check` wedges on its DEFAULT recipe, deterministically, and it
  is not machine load** `[M][js]` — found and **controlled** 2026-08-17 while
  merging the cook-mode work. This is a different fault from `010` in this
  section (transport flakiness under load), and conflating the two is how it
  stays unfixed.

  ⚠️ **THE HEADLINE CLAIM IS REFUTED — 2026-08-19, on byte-identical code.**
  `git log 5e23592..HEAD -- tools/cook_check.mjs tools/lib/browser.mjs
  site/js/cook.js site/js/cook-ui.js` returns **nothing**: not one line of the
  cook path changed between the finding being filed and being re-tested. On
  that same code, `node tools/cook_check.mjs` (default recipe, no `--dish`) ran
  **four consecutive times and reached `OK — 84 passed, 0 failed`** every time,
  at `FAVES_CDP_TIMEOUT_MS=60000` — a **smaller** budget than the 180 s and
  240 s at which it was recorded wedging. Load average at the time was
  3.49/5.12/5.29, materially the same as the 3.81 the merging session recorded.
  `pgrep -f 'user-data-dir=.*faves-'` reported **0** orphaned browsers before
  the runs.

  🔑 **What survives the refutation, and it is worth keeping.** The wedge point
  was recorded as *"always the same 30, ending at 'a step that never says how
  long gets NO timer'"*. That assertion is **exactly PASS number 30** in a green
  run too. So the observation was accurate; the *position* is a property of the
  script, not of the fault. Two independent sessions then read a shared position
  as evidence of determinism — which it is not, and that is the transferable
  lesson: **a fault that always stops at the same place has only shown you
  where the script's clock runs out, not what stopped it.**

  🛑 **So the "not machine load" conclusion does not hold, but neither does its
  opposite — the mechanism is still unexplained.** Seven runs plus a control at
  `origin/main` is real evidence that something was happening on 2026-08-17. It
  is simply no longer evidence that the cause is *in this code*. The one
  documented mechanism with this exact signature is already named in the tool's
  own comment at `setNotifications("prompt")`: a native permission prompt this
  headless browser never answers makes **every subsequent `Runtime.evaluate`
  time out**, killing the run tens of assertions before the thing it was
  proving. That is a hypothesis, **not** a measurement — it was not tested.

  🎯 **Owner's call, offered rather than taken:** on this evidence the residual
  belongs with `010` (transport flakiness), which is precisely the merge this
  item's opening paragraph forbids. That paragraph was written on the
  determinism claim that has now failed, but one session's four green runs
  overturning two sessions' seven red ones is a judgement, not an arithmetic —
  so the merge is **put to him, not made**. Until he rules, both items stand.

  ✅ **The workaround is no longer needed and should not be cargo-culted:**
  `--dish "Easy Pad Thai"` was recorded as *"the only known good run today"*.
  The default recipe is a good run now.

  ✅ **BOTH SMALLER FAULTS ARE FIXED AND SHIPPED — 2026-08-19.** These were
  real, are code-level, and were verified by measurement rather than by reading.

  - ✅ **The raw-`recipe.ingredients` fault was REAL and SIX TIMES WIDER than
    filed.** The item named section 4b (line ~883) alone; the same raw array was
    passed at **seven** sites, including `idxNeeding`/`idxIdle` themselves —
    which is what made the damage silent rather than local. The page never does
    this: `cook-ui.js:135` flattens with `ingredientKeys(item.ingredients)`
    first, because a component-grouped recipe holds `{component, items[]}`
    objects and `ingredientsForStep` keeps **only strings**.
    **Measured, not reasoned:** the corpus holds four component-grouped
    recipes, and *Upside-Down Plum Cake* is **0 loose lines, 2 groups (14
    lines), 8 steps** — so every step "needed nothing", `idxNeeding` was `-1`,
    and **both** ingredient sections skipped. Before the fix that recipe ran
    **73 assertions and FAILED 2** (`"the recipe page makes every ingredient and
    every step tickable" — 22 of 10 lines`: the tool counted 2 groups where the
    page rendered 14 lines). After it: **`OK — 85 passed, 0 failed`** — twelve
    assertions that had never run, now running, and the two failures gone.
  - ✅ **A guard against the silence itself**, which is the ADR 0072 half. Both
    ingredient sections are gated on `idxNeeding >= 0`, so when the matcher
    finds nothing they vanish leaving a wall of PASS that reads exactly like a
    clean run. A recipe that lists ingredients must have at least one step that
    names one; if it does not, that is now a **FAIL with a sentence**, not a
    skip. This is the assertion that would have caught the fault above on the
    day it was written.
  - ✅ **`ingredientsForStep`'s docstring described a mechanism that is not
    there.** It claimed *"the FIRST word of a multi-word ingredient is
    deliberately not a term on its own"*. `ingredientTerms` (`cook.js:149`) adds
    **every** kept word, first word included; what actually stops *"baking
    powder"* claiming *"baking paper"* is that `"baking"` is in `PREP_WORDS`
    (`cook.js:118`) and is never kept at all. Corrected in place, with the
    correction dated so the next reader knows the sentence moved.

  **What a green run here still cannot show you:** whether the wedge returns.
  Four runs on one machine on one day is the evidence this note rests on, and it
  is stated as exactly that.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md

  ✅ **A THIRD FAULT, FOUND BY THE SECOND — and it was accusing the product of
  a bug it does not have. Fixed 2026-08-19.** Making the ingredient sections
  actually run (above) is what surfaced it: with the tool now usable on
  component-grouped recipes, *Sticky Date Pudding* returned
  `FAILED — 84 passed, 1 failed` on `the list's way in reaches the SAME
  checklist, not a second copy`. That sentence reads as **"your ticks are
  lost depending on how you opened cook mode"** — a data-loss bug in the
  product. It is not. **Nobody's ticks are lost.**

  **The mechanism, and it is a good one to know.** Section 12 opened the
  recipe on the Cook at Home list by *substring-matching the recipe's NAME*
  against each card's `textContent`, with `|| d[0]` behind it. But **`goesWith`
  prints OTHER dishes' names onto a card** (Theme 4b pairings) — **Shane's Ribs
  lists `"Sticky Date Pudding"` as a pairing and sits at index 12, five places
  ahead of the real recipe at 17.** So the match won on the ribs, the tool
  opened the wrong recipe, started cook mode on it, and then correctly observed
  that step 1 of *Shane's Ribs* was never ticked. Upside-Down Plum Cake passed
  the same assertion because its name appears exactly once in the corpus.

  🔑 **Which recipes this hides is decided by the PAIRINGS CORPUS, so it grows
  silently.** Every `goesWith` entry added is a chance that some other recipe
  becomes untestable by section 12 — and the failure it produces always
  accuses the app, never the tool. A wrong fixture that reports a plausible
  product bug is worse than a crash, because someone will go and "fix" the app.

  **The fix.** Scope by the dish's own `dishId` (`#dish-<id>`, ADR 0051)
  instead of by its name, for the fold, the count and the cook-mode open. The
  `|| d[0]` fallback is deleted rather than retargeted, and that half matters
  more than the selector: **silently falling back to the first recipe on the
  page is exactly what turned *"this tool cannot find its fixture"* into
  *"the product loses your ticks"*.** A missing fixture now fails by name
  through `need()`, at exit 1.

  **Verified:** *Sticky Date Pudding* `OK — 85 passed, 0 failed` (was 84/1, and
  82/2 before the ingredient fix). Same run on `main@807339c`.

  🚩 **Same class as `070` in this section, from the other end.** That item is
  about a check naming an element that no longer exists. This is a check naming
  an element by a string the **data** can duplicate. Both are "the selector is
  only as stable as what it points at"; only one of them can be found by
  grepping for ids.
