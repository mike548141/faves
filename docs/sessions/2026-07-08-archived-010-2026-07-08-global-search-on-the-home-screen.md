- **2026-07-08 (global search on the home screen)**: Built the roadmapped
  home-screen global search (Theme 3) — one box that finds a **place or a
  dish** by name across every venue and Cook at Home. New pure module
  `site/js/search.js` (`buildIndex` + `search`): indexes places (name +
  area + cuisine) and dishes (name + desc + ingredients) from the already-
  loaded records, ranks name-start > later-word > substring > haystack,
  returns `{places, dishes}` each `{total, items}` (capped, total kept so
  the UI says "12 of 30"). Dish results deep-link to `#dish-…` (or the
  recipe page). To make those anchors provably match the menu/recipe
  screens, extracted the duplicated `slug()` into a shared `site/js/slug.js`
  and had menu.js + recipe.js import it (single source for the anchor
  scheme). Wired into app.js: `body.searching` hides the browse cards,
  filters and shuffle FAB while a query ≥2 chars is live; clearing restores
  browse. Search field + results are a JS-only enhancement (hidden until
  app.js unhides), so the no-JS fallback list is untouched. 10 new unit
  tests (place/dish/cuisine/ingredient match, recipe href, slug scheme,
  min-length, caps) — all 58 pass; validate.py + check_no_deps.py clean.
  Browser-verified in real headless Chrome at 390px via a zero-dep CDP
  driver (Node 24 global WebSocket): typed queries, confirmed grouped
  results, correct cross-venue deep-links, browse-view hide/restore.
  VERSION → 2026-07-08.14; search.js + slug.js precached. CHANGELOG +
  ROADMAP + ARCHITECTURE updated.
