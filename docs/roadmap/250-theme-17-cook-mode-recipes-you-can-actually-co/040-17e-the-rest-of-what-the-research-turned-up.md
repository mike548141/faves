- [~] **17e — The rest of what the research turned up** `[S]`–`[M]` each,
  ✅ **The checklist and read-aloud bullets are SHIPPED** (claim released
  2026-08-17: `wt: faves-cook-checklist` no longer exists and both bullets are
  in the tree with tests). **Checklist** — `site/js/checklist.js` +
  `checklist-ui.js`, 17 unit tests in `tests/checklist.test.js`, and
  `tools/recipe_check.mjs` asserts in a real browser that every line is
  tickable and that the ingredient and method tick columns share a left edge
  (37m). **Read aloud** — `createSpeaker()` in `cook.js` with `synth`/
  `Utterance` injected, wired to a real "Read aloud" button in `cook-ui.js`,
  omitted entirely where the browser has no `speechSynthesis`, stopped on every
  exit path, and never speaking unprompted; covered by `tests/cook.test.js`
  including the unsupported-browser and user-initiated cases.
  **Still open and unclaimed:** the shopping list, personal notes and
  substitutions bullets. Files: `cook.js`, `cook-ui.js`,
  `tools/cook_check.mjs`, `tests/cook*.test.js`.
  ordered by how well they fit a zero-dependency offline app. ✅ **Ingredient-
  first search is delivered** and was struck from the list below on 2026-08-16
  by audit: `search.js buildIndex()` folds `item.ingredients` into the haystack
  (*"so 'lemon' finds the pasta"*), mirroring the menu screen, covered by
  `tests/search.test.js`, and reaching all 24 ingredient-bearing dishes:
  - **Tick off ingredients and steps as you go** — a checklist with state that
    survives a phone call. Cheap, and every app tested has it.
  - ~~**Ingredient-first search** — "what can I make with mince and a lemon?".
    Faves already has a search index; recipes just aren't in it by
    ingredient.~~ ✅ **Shipped** — see the note above the list.
  - **Shopping list from a recipe** — and note it is the same machinery as the
    order tally (`cart.js`), which already gathers, groups and totals. Build it
    as the tally's cook-at-home twin rather than a second list.
  - **Read the steps aloud** (`speechSynthesis`) — built into the browser, no
    dependency, and genuinely useful with your hands in a bowl. Voice
    *recognition* is the opposite: unreliable in a noisy kitchen and, on most
    platforms, a network round-trip. Recommend speech out, not in.
  - **Personal notes on a recipe** ("used half the sugar, better") — profile-
    scoped, and it slots straight into Theme 11's personal layer and Theme 12's
    export.
  - **Substitutions** ("no buttermilk → milk + lemon") — high value, but it is
    content the owner has to write, and a wrong substitution ruins a dinner.
    Curated only; never generated.
  - ✅ **Oven temperature conversion** (°C/°F) — **shipped 2026-08-09** as
    18c (ADR 0029), proven against all 459 strings in the recipe data. It did
    fall out of Theme 18 for free, exactly as predicted. Struck from this
    bundle 2026-08-15; nothing left to do here.
