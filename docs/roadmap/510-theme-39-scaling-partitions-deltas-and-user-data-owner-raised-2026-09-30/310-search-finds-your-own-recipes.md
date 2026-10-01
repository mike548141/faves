- [~] **Search finds your own recipes, labelled "My recipe"** `[M]
      [search][recipes]` — owner-raised 2026-10-01 (session `faves-55`).

  **His words:** *"The search feature(s) should also work to find "My
  recipes" and "Our recipes""*.

  **As read on 2026-10-01:** home search reads only the generated, public
  `site/data/search-index.json` (`site/js/search.js`), so a personal recipe
  is never found. **Build:** every search surface that finds a published
  recipe (home search, its suggestions, and the Cook at Home page's own
  filter once `300` lists your recipes there) also finds the active
  person's own recipes, read from the device's store and never written to a
  shipped index. They are ranked by the same rules and carry the same "My
  recipe" label. Dietary and allergen filters treat them as they treat a
  published dish: an untagged recipe is "not stated", never "free from". The
  shape leaves room for "Our recipe" (shared with you) results, which are
  not built until sharing exists.

  📌 **Claimed 2026-10-01 (`faves-55`)**; build starts after `290` and `300`,
  which share its label and its code (`app.js`).
