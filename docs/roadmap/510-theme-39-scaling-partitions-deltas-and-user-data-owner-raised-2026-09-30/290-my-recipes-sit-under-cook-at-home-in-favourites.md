- [~] **Your own recipes sit with Cook at Home in Favourites, marked
      private** `[S] [home][recipes]` — owner-raised 2026-10-01 (session
      `faves-55`), on seeing the import's result.

  **His words:** *"in the favourites list I should see all the recipes
  together under Cook at home. We could use a tag on the recipes that are
  the users (private), or shared from someone else"*.

  **Build:** Favourites shows no separate "My recipes" group. A hearted
  personal recipe (`u:` id) is listed in the Cook at Home group with the
  published ones, in the same order, and carries a small "Private" label,
  in words and not colour alone. A Cook at Home group appears when only
  personal recipes are hearted. Nothing about the data changes; this is
  display only.

  **Not built: "shared from someone else".** No way of sharing a recipe
  exists yet. The label is designed so a "Shared by <name>" variant can sit
  in the same place later, and that waits for a sharing feature.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): only HEARTED own recipes show**,
  the same rule as published dishes. So an unhearted personal recipe (the
  imported Famous Brade Green Chicken Curry, today) is reachable only by a
  direct link until a list of your own recipes exists. That list is still
  `050`'s open fork (3).

  ⚖️ **Wording, owner-ruled 2026-10-01 (`faves-55`):** the label reads **"My
  recipe"**, not "Private". A recipe someone else shares with you will read
  **"Our recipe"** (not built until sharing exists).

  ✅ **Built 2026-10-01 (`510-290`).** Favourites has no "My recipes" group: a
  hearted personal recipe is a row of the Cook at Home group, in the order it
  was hearted among the published ones, with a "My recipe" label inside its
  link (words, so a screen reader says it with the dish). The
  markup is `.recipe-owner.recipe-owner-mine`, so a later "Our recipe" (a
  recipe someone shared with you) is a second modifier and a line in
  `OWNER_TEXT` (`favourites-ui.js`), and nothing of sharing is built. Counting:
  Cook at Home is ONE place whether it holds published recipes, personal ones
  or both, and each hearted personal recipe is a dish, so the summary matches
  the rows on screen ("1 place, 2 dishes saved" for two personal recipes alone).
  The grouping is the pure `groupFavourites` (`favourites.js`, 6 unit tests);
  `device_check.mjs` section 9 asserts it in the real home screen (14 checks,
  break-probed: separate group back fails 8, label dropped fails 2, label on
  every row fails 2). The search row is untouched: the "My recipes" block at
  `app.js` ~1199 was the Favourites group heading itself, not a search row, and
  no search path renders personal recipes.
