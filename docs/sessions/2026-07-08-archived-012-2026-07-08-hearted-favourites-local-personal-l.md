- **2026-07-08 (hearted favourites — local personal layer, part 2)**:
  Built the ♥ favourites feature (roadmap Theme 5), extending the same
  device-local layer as the order tally. Extracted `site/js/store.js`
  (`safeStorage` with the private-mode memory fallback) and refactored
  cart.js onto it. New DOM-free model `site/js/favourites.js` (`createFav­
  ourites` store; `favKey`/`favHref` identity + deep-link; venues and
  dishes; denormalised so the view renders from storage alone) with 9 unit
  tests. `favourites-ui.js` is the self-syncing ♥ toggle (bound to the
  shared `favourites` singleton; `stopPropagation`/`preventDefault` so a
  heart inside a link/row toggles without navigating). Hearts added to
  every dish row + the venue/collection header (menu.js) and the full
  recipe page (recipe.js). Home gained a **Favourites** toggle beside the
  search box (placed *outside* the browse-only region so it stays reachable
  in the view) opening a panel that reuses a new shared grouped renderer
  `results-view.js` — which I refactored the global-search rendering onto
  too (Places/Dishes groups, now with an optional trailing node per row for
  the inline un-heart). Search and the favourites view are mutually
  exclusive (module-level `exitSearch`/`exitFavourites`). Caught a Write
  gotcha: a literal NUL crept into `favKey`'s separator; swapped to a space
  (venue ids are slugs, so unambiguous) and a test caught it. Browser-
  verified at 390px in headless Chrome: heart a dish + venue on the menu →
  home toggle shows count 2 → panel groups them with correct deep-links →
  un-heart from the view removes in place and drops the count → global
  search still renders correctly after the shared-renderer refactor.
  node --test 68→77 (9 new favourites tests; cart refactor intact) all
  pass; validate.py +
  check_no_deps.py clean. VERSION → 2026-07-08.16; store.js, favourites.js,
  favourites-ui.js, results-view.js precached. CHANGELOG + ROADMAP +
  ARCHITECTURE updated.
