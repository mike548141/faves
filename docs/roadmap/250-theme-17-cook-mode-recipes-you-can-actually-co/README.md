# Theme 17 — Cook mode: recipes you can actually cook from (owner-raised 2026-08-09)

Cook at Home renders a recipe well — ingredients, then a numbered method. That
is a recipe you can *read*. This theme is about a recipe you can *cook from*,
with wet hands, at the bench, mid-step. The owner raised four items; a research
pass over what current recipe apps do (sources at the end) adds a fifth group,
and moved one of them to the top.

🚩 **The data is the blocker, not the code.** Verified 2026-08-09 across the 24
recipes: **`serves` is set on 3** (Liège Waffles, the pudding, Tiramisu) and
<!-- count re-measured 2026-08-16: `time` is now 9, not 8. Conclusion unchanged. -->
**`time` on 8**. Every item below renders nothing until those fields exist, and
they can only come from the owner — the same shape as the empty `picks`
problem. Sequence the content with the build or the feature ships blank.

> ✅ **17a — THE SCALING HALF SHIPPED 2026-08-16** (wt: faves-cook2, `f4c65e8` +
> `fe88d20`). Recorded as **ADR 0076**. `site/js/quantity.js` is new; the
> recipe page carries a ½ · 1× · 2× · 3× radiogroup above the ingredients.
> 23 unit tests, `recipe_check` **22 → 29 assertions**, `node --test` 995 pass.
> 🔑 **The roadmap's recommendation was overridden, with evidence.** It said
> make quantities structured data because render-time parsing "will be wrong
> often enough to be worse than useless". Both options share one defect —
> **neither is a check**: structured data is trusted because a human typed it,
> a parse because a regex matched, and neither can tell you it got a line
> wrong. So a line is scaled only if the parser **rebuilds the author's
> characters byte for byte at 1×**. 204/204 byte-identical.
> 🔎 **Every refusal in it printed a wrong number first, and none was
> predicted by reading the file** — they were found by RUNNING a parser over
> the corpus. `6–8 garlic cloves` doubled to `12–8`; `2 shallots (or 1 medium
> red onion)` doubled the shallots and left the bracket offering one onion.
> 🚩 **The design crux, which is not the parsing:** a line that HAS a quantity
> and is refused makes a **half-scaled recipe** — flour doubled, chocolate not,
> nothing on screen saying so. Worse than not scaling, because it looks
> finished. So there are three statuses, not two: `none` (no quantity — 42
> lines, correct unchanged, silent), `scaled`, and `blocked` (marked in words,
> not colour alone, and counted in a note). 2× blocks 4 lines; ½× blocks 16.
> **20 of 24 recipes double clean, 14 halve.**
> 🎯 **STILL OWED, and it is his:** `serves` is set on **3 of 24**, so "scale
> to serve 8" cannot ship. But **4 more recipes state a yield in prose** —
> Hotcakes "Makes 10–15", Queen Cakes "Makes 21" (twice, in `desc` AND
> `steps[1]`), Turkish Flatbread "Makes 1 large flatbread" — so real coverage
> is 7 of 24, not 3, and surfacing those needs no new facts.
> ⚠️ **A trap for whoever does that:** Liège Waffles states 12 in `serves` AND
> "divide the dough into 12 portions" in `steps[3]`, so a scaled recipe
> contradicts its own method. Steps are not scaled and should not be.
> ✅ **18b is NOT blocked on this any more.** It was recorded as waiting on
> 17a's schema; the seam it needs is the one now built. Its own measurement is
> on the table too: **cup and spoon units are 55% of all unit-bearing lines**
> (47 cup/cups, 55 spoons, of 135), a US cup is 240 ml against NZ's 250 ml, and
> the ONLY in-corpus evidence of which the owner means is a parenthesis —
> `¾ cup (190 ml)` implies a 253 ml cup. 🎯 18b needs that as **data, not
> inference**. 36b's `uses:[{ingredient, amount}]` is unaffected and still
> needs its own schema — and note only **2 steps in the whole corpus** carry a
> scalable amount, so 36b has almost nothing to bind to today.

- ✅ **17d — Cook mode** `[M]` — **shipped 2026-08-09** (ADR 0034,
  `cook.js` + `cook-ui.js`). A modal full-screen `<dialog>` over the recipe: one
  step at a time, a "Step 3 of 9" counter, 56 px Back/Next plus arrow keys, and
  `navigator.wakeLock` holding the screen awake. The lock keeps a `wanted` flag
  and re-acquires on every `visibilitychange` — the OS releases it when the page
  hides and never gives it back — and degrades to silence where unsupported
  (iOS < 16.4) or refused. Ingredients open in place without moving the step
  index, which is the cheap half of 17c's problem. Entry points: the recipe page
  and the Cook at Home list, on the 23 of 24 recipes that have steps.
  **Deliberately left for their own items:** scaling (17a), timers (17b — cook
  mode is now the host the roadmap said they needed), inline quantities (17c),
  checklists/TTS (17e). **Not verified:** that the screen genuinely stays awake
  on a real iPhone — the lifecycle is proved against a fake and in headless
  Chrome, the platform behaviour needs a device.
  - ✅ **The real-browser regression guard — done 2026-08-15** (ADR 0039,
    `tools/cook_check.mjs`, **35 assertions**). Answered as a **sibling**, not a
    widening: the allergen safety verdict keeps its own line and its own exit
    code, and the CDP harness moved to `tools/lib/browser.mjs` so there is only
    one of it (`device_check.mjs` unchanged at 19/19). The wake lock is watched
    by **instrumenting the real API** — headless Chrome 151 grants genuine
    sentinels — and the guard was **proven to bite** by three deliberate breaks
    in `cook.js`, each reverted. Three gaps are declared rather than faked, in
    the tool's own header: that the screen truly stays on (needs a phone), leak
    (a)'s original form (this Chrome always releases on hide first, so removing
    that release is invisible here), and release on document teardown.
    - ✅ **Found by the guard, ruled and fixed the same day (2026-08-15).**
      Tapping **Back** until step 1 disabled the Back button while it held
      focus; Chrome then drops focus to `<body>`, outside the dialog, and the
      arrow keys, Home and End stopped working. ADR 0034 promises "focus stays
      on Back/Next so repeated taps keep working" — at the lower boundary it
      did not. **Owner ruled: hand focus to Next before disabling Back**, the
      only control that still does anything at step 1. Focusing the *step* was
      rejected (ADR 0034 already rejected that on every change, and a one-
      boundary exception is a rule nobody remembers); so was never disabling
      Back (a control that looks live and is not trades one accessibility
      fault for another). Guard **35 → 36 assertions**, the new one proved to
      bite. `SHELL_VERSION` bumped.
      🔎 **Worth keeping: 19 unit tests and a hand pass had both missed this.**
      A real browser found it on the first run, because "focus falls to
      `<body>`" is platform behaviour that a fake wake lock and a jsdom-shaped
      test cannot have. That is the argument for the guard existing, made by
      the guard itself within an hour of being written.
**Sources (research pass, 2026-08-09):** [Cook Mode step-by-step view][s1] ·
[Cook Mode and screen wake lock][s2] · [Best recipe apps tested][s3] ·
[ScaleRecipe — scaling, TTS, checklists][s4] ·
[Recipe Keeper — hands-free, unit conversion][s5] ·
[SuperCook — cook by ingredient][s6]

[s1]: https://www.drizzlelemons.com/blog/cook-mode-step-by-step-recipe-view
[s2]: https://bootstrapped.ventures/cook-mode/
[s3]: https://preplo.app/best-recipe-app-2026
[s4]: https://www.scale-recipe.com/
[s5]: https://apps.apple.com/us/app/recipe-keeper/id974683711
[s6]: https://apps.apple.com/us/app/supercook-recipe-by-ingredient/id1477747816
