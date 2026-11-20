**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 57+1 -->
- [2026-07-08 · 2026-07-08 (Cook at Home full recipe pages)](2026-07-08-archived-009-2026-07-08-cook-at-home-full-recipe-pages.md) — archived entry, verbatim in its file

- **2026-07-08 (Cook at Home full recipe pages)**: Owner wanted tapping a
  recipe name to open it in full, not just the inline expand. Added a new
  screen `recipe.html` + `site/js/recipe.js` (self-contained, like the
  other screen modules): reads `?id=&dish=`, renders the whole recipe —
  meta, photo, tags, ingredients, method, and "goes well with" chips
  linking to the other recipes' full pages; back-links to the collection.
  In `menu.js`, recipe dish names became links to it (restaurant dishes
  stay plain); the inline `<details>` quick-expand is kept. Deep-linkable
  and shareable; SW precaches `recipe.html`+`recipe.js`, served via
  `ignoreSearch`. Browser-verified: Shane's Ribs full page + every list
  name links correctly. VERSION → 2026-07-08.13. ARCHITECTURE updated.
