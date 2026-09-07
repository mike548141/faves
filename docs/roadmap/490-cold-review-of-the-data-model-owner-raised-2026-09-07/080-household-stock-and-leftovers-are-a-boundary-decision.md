- [ ] 🎯 **Household stock, leftovers and "what can I make" are a product-boundary
      decision before they are a design** `[design]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §6 C6, §7 D3).
      Owner's decision; no recommendation.

  **The brief** (`README.md` in this directory, his words): *"Ready made food at
  home (from a can of beer to a bag od chips to a ready made meal/dish). And
  potentially in future maybe we add dishes that have been made prior (e.g. left
  overs) and are ready to eat in the fridge which gets into what stock we have in
  the house vs recipes we can make assuming we have the ingredients"*.

  **What exists.** `data/products/` holds 87 packaged products (ADR 0090) with
  brand, pack, servings, nutrition, ingredients, allergens, origin and provenance.
  It is never served, never precached, and **nothing in the repo references a
  product id** — it is a store with no reader. Ingredient-first recipe search
  ships (`search.js` folds ingredient lines).

  🛑 **Three fences already stand, and none knows it fences this.**
  - ADR 0090 rule 2: *"No eating events. This is a store of products, not of
    meals. 'He had this for lunch on Tuesday' is health-adjacent personal data
    about a named person."* A leftovers record is an eating event with a date.
  - Theme 6: an eating diary is *"a separate, private, personal app that
    consumes Faves — not a feature bolted into Faves"*, and *"the order tally is
    the natural bridge."*
  - `site/js/sync-merge.js:35`: live state (the order tally) is deliberately not
    synced; a fridge is the same shape — live, perishable, per household rather
    than per profile. And `data/products/` is never served, so "what can I make"
    has no ingredient vocabulary in the app to match a recipe against.

  📋 **Options.**
  - **(a) Out of Faves.** Theme 6's separate private app reads Faves' JSON and the
    product store. Nothing in Faves changes except keeping `data/products/` fit to
    be read (a stable id, a documented shape).
  - **(b) In Faves, device-local, exported, never synced** — like the order
    tally. "What can I make" then needs an ingredient vocabulary in the payload,
    which is a new precache cost to be named per ADR 0047, and a new personal
    store to add to the whitelist walk (`personal-data.js`, `profiles.js`).
  - **(c) In Faves and synced.** Reopens the 256 KiB blob envelope
    (`worker/sync-worker.js:85`), needs the first per-household store and a
    three-way merge rule for a list that changes every day.

  Each of the three fences was the owner's own ruling for its own reason. This
  item exists so the next session does not pick a fork by accident.
