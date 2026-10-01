- [x] **Searching "my recipe" lists your own recipes** `[S]
      [search][recipes]` — owner-reported 2026-10-01 (session `faves-55`),
      on `2026-10-01.20`, after `310` shipped (PR #75) with browser checks
      green.

  On both the home screen and the Cook at Home page, searching for one of
  his recipes finds nothing. `310`'s checks (`focus_check`, `device_check`)
  passed on synthetic fixtures, so the gap is between those fixtures and a
  real device: suspect the check first, then the data (a real profile id,
  the recipe record's shape after the import, or the store read at query
  time). Reproduce against his real recipe shape (the moved backup's
  structure, never its content in the repo), fix, and make the check fail
  on today's code.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  🔎 **Diagnosed 2026-10-01 (`faves-55`): not a fault in `310`.** With the
  owner's real data shape in a clean browser, searching "Jesse" or "ginger
  crunch" finds his recipes, labelled. He had typed **"my recipe(s)"**,
  expecting the label to be searchable, and it is not in the search text.
  (A word inside a name, such as "curry" or "ribs", also finds his recipe,
  but ranked below names that start with it.)

  ⚖️ **So the build is:** a query of "my recipe" or "my recipes" (any case,
  including within the Cook at Home page's own search) lists every recipe in
  the active person's cookbook, labelled. "our recipe(s)" is reserved for
  shared recipes and returns nothing until sharing exists, without an
  error. Nothing goes into the shipped index.

  📌 **Claim released 2026-10-01 (`faves-55`)** at the owner's word: "put
  them on a board for a fresh session". Nothing was built; ready to take.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Closed 2026-10-02 (`faves-4f`, PR #79):** "my recipe(s)" as the whole
  query, any case or spacing, lists the active person's whole cookbook,
  uncapped and labelled, on the home search and the Cook at Home page's own
  search; "our recipe(s)" lists nothing and does not error. One parser
  (`ownerQuery` in `search.js`); nothing in the shipped index. Three unit
  tests and `focus_check` assertions, break-probed except the "our" absence
  checks against plain text search, which would pass on the old code too.
