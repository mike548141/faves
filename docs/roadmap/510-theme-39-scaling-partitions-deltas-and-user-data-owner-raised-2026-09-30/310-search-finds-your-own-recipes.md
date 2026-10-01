- [x] **Search finds your own recipes, labelled "My recipe"** `[M]
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

  ✅ **Built 2026-10-01 (`510-300`).** Home search merges the active person's
  recipes into its dish list at query time (`search.js` `personalDishes` and
  `withCookbook`, memoised on the store's map object), read from the device and
  never written to `search-index.json` or any shipped file. They are ordinary
  dish entries to the one ranker, so the same rules rank them (name hit over a
  description hit; a personal name-start hit above a published mid-name one),
  and `dishHay` builds their text the way it builds a published dish's, from
  the recipe composed as its own page composes it: an untagged recipe has no
  diet label in its haystack, so a diet word does not find it ("not stated",
  never "free from"; unit-tested, and on the Cook at Home page by
  `device_check`). Rows carry the "My recipe" label through an `owner` kind on
  the entry (`ownerLabel(d.owner)`): "Our recipe" is a line in `OWNER_TEXT` and
  an entry with `owner: "ours"`, and nothing else moves. A live query re-runs
  when the person switches or the cookbook changes, and `app.js` now re-reads
  the cookbook on a cross-tab write. The Cook at Home page's filter and
  suggestions read the merged menu from `300`; choosing a personal suggestion
  opens it under `u:mine` (it used to build the link from the page's venue).
  `focus_check` +10 assertions (40 in all), break-probed: merge removed fails
  5, label on every search row fails 1.

  ⚠️ **Read as found:** the home search has no suggestions popup in this build
  (`attachSuggestions` is wired only on menu pages), so there was no home
  suggestion list to extend; the Cook at Home page's suggestions are covered.
  The home Favourites list and the venue cards are untouched.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #75), live as
  `2026-10-01.18`, and `main` CI green.
