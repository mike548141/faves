- [~] **Your own recipes on the Cook at Home page, and labelled Private
      wherever they appear** `[M] [menu][recipes]` — owner-raised
      2026-10-01 (session `faves-55`).

  **His words:** *"In the list of recipes page, and on the recipe itself
  there should be the same tag to show if the recipe is a private one (user
  or shared by someone else)"*.

  ⚖️ **Owner-ruled the same day: "Yes, all of mine".** The Cook at Home page
  (`restaurant.html?id=cook-at-home`) lists every recipe in the active
  person's cookbook beside the published ones, hearted or not, each with the
  same "Private" label `290` adds to Favourites. The recipe page shows that
  label too. This answers `050`'s fork (3), a list of your own recipes, and
  gives an unhearted own recipe (the imported curry) a way in. Nothing is
  published: the rows come from the device's own store.

  Depends on `290` (the label). "Shared by <name>" waits for a sharing
  feature, as in `290`.

  📌 **Claimed 2026-10-01 (`faves-55`)**; build starts once `290` merges.

  ⚖️ **Wording, owner-ruled 2026-10-01 (`faves-55`):** the label reads **"My
  recipe"**, not "Private". A recipe someone else shares with you will read
  **"Our recipe"** (not built until sharing exists).

  ✅ **Built 2026-10-01 (`510-300`).** The Cook at Home page lists every recipe
  in the active person's cookbook, hearted or not, each with the "My recipe"
  label from `290` (`ownerLabel`, one implementation: the label sits in the
  row's heading after the name, and under the title on the recipe page).
  **Placement, the choice made:** the page follows what the record already says,
  its `section`. A recipe whose section names a published one ("Desserts")
  sits inside it, after the published recipes (the five recipes moved out of
  the published data kept their sections, so they land back where they were);
  any other recipe gets a section of its own after the published ones, named by
  its `section`, or "My recipes" when it has none. The pure fold is
  `mergeCookbook` (`cookbook-menu.js`, 9 unit tests); `menu.js` builds it at
  every render from the device store, so nothing is fetched, saved or shipped.
  A row's identity comes from its own id (`isPersonalId`), so heart, rating and
  link are keyed under `u:mine` exactly as the recipe page keys them, and the
  page's "favourites" query reads both venues (`favouriteDishIds`, one unit
  test). A profile switch, sync pull, import or cross-tab write re-renders the
  page (a microtask after the store, so one person's recipes are never painted
  under another's allergen prefs). `device_check` section 10 (22 assertions,
  69 in all) covers: listed beside published, unhearted listed, label on own
  rows and on no published row, placement, links, no tag chips on an untagged
  recipe, hearts and ratings, the filter, a different profile's recipe NOT
  listed with no reload, live add, the recipe page label (and none on a
  published one), and no request or shipped index carrying a fixture's text.
  Break-probed: favourites query reduced to one venue fails 1 unit and 1
  browser assertion; heart keyed under the page's venue fails 1; own-row
  detection off fails 4.

  ⚠️ **Not changed:** the home card still says "20 recipes", the published
  count; your own are on the page and not in that figure.
