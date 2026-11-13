## 2026-09-27-0429 — session `faves-a6`: Whittaker's lava cakes, and the recipe page rebuilt after it

**Asked:** add <https://www.whittakers.co.nz/en_NZ/recipes/choc-lava-cakes>
with provenance, then *"replicate this [page] including page layout, the
photo, useful information like prep time, cook time, the ingredients list vs
method"*.

**Delivered.** Two commits on `faves-a6-lava-cakes`, merged to `main`:

- `34a2bbf` adds the recipe. The method is reworded and credited. The web
  provenance goes in a new by-hand record, `data/intake/recipe-sources.json`,
  holding the URL, fetch time, SHA-256 and page dates. It can't go in
  `menu-sources.json`, because that file's `--rebuild` regenerates it from
  photos and PDFs and would delete a web row. The raw page is kept in
  gitignored `intake/recipes/web/`.
- `a35d863` rebuilds the recipe page (ADR 0125): hero photo, a Prep · Cook ·
  Serves · Difficulty panel on all 25 recipes, and the ingredients beside the
  method from 60rem.

**Owner rulings (asked with costs via AskUserQuestion, 2026-09-27):**

| Question | Ruling |
|---|---|
| Whittaker's photo in a public repo | **Use theirs, credited** |
| What the panel shows | **Prep · Cook · Serves + Difficulty** (24 difficulties are estimates) |
| Layout | **Yes, in Faves' own style** |
| The chocolate's "may contain peanuts, tree nuts" | **Tag peanuts and nuts**, and the brownie for consistency |

🔎 **The source recipe has a gap:** it lists ½ tsp flaky sea salt and never
uses it. The line is kept, the gap is stated in `desc`, and no step was
invented to use it.

🔎 **A hard-coded count moved:** `tests/units.test.js` asserted 14 oven
temperatures across the collection, and the new recipe made it 15.

🔎 **A CSS rule that did nothing:** an explicit one-column override for the
side column was break-probed and changed nothing. 37d's `column-width`
already declines a second column in a third-width column. The rule was
removed; `recipe_check` asserts the outcome.

🚩 **Owed, not done:**
- **Te reo** for Prep / Cook / Serves / Difficulty. It hasn't been checked
  against maoridictionary.co.nz, so there are no `data-i18n` keys yet.
- **The atelier pin is 42 commits behind** `origin/main`
  (`2b29bb7..origin/main`). Reading those commits and bumping the pin is its
  own job, and this lane didn't take it.
- **Lighthouse** was not run on the new recipe page.

