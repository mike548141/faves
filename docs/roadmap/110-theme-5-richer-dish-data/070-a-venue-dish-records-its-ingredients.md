- [ ] 🎯 **A venue dish records its ingredients where they are available,
      for search and allergen tags, never shown** `[L][design][schema][data]`
      — owner-raised 2026-09-29 (session faves-ec). Direction captured; not
      designed.

  **The brief, in his words:** *"Where it is available we should store the
  ingredients of a restaurant dish in the data model so that it can be used in
  searches, informs allergens tags etc.. Unlike recipes I do not expect to
  present the dish ingredients to the user."*

  **What it asks for**
  - An ingredient list on a restaurant dish, **only where one is available**
    (the menu, the venue, or a published source). None is invented. That is
    Theme 5's *"don't fake it"*, and ADR 0025's *no tag = not stated*.
  - **What it's for:** search (finding "chorizo" when the menu line just says
    "the Spaniard") and allergen and diet tags (the tagger reads ingredients,
    not only the description). It also feeds nutrition,
    [`120/010`](../120-theme-6-north-star-the-health-tie-in/010-nutrition-for-every-dish-recipe-and-serving.md).
  - **Never displayed.** Recipes show their ingredients; a venue dish does not.

  **What already exists to build on**
  - Recipe ingredients have a shape of their own (ADR 0070), and each can carry
    its own allergens and note (ADR 0138). 22e ruled
    ([`350/020`](../350-theme-22-the-personal-layer-holistically-owner/020-22e-tags-sorted-collapsed-and-explained.md))
    that add-ons and ingredients share **one** tag-composition mechanism, so a
    venue dish's ingredients should plug into it rather than add a second one.
  - Allergen tag tips already store the words that triggered each tag for a
    venue dish (`tagNotes`). An ingredient list is a richer source for the same
    tips.

  **🤔 Open, for the owner**
  - **Where the list lives (ADR 0047 / 0137).** The app ships only what a
    screen renders. Tags can be computed **in the repo** from a list kept in
    the `data/` research store, so the list never reaches a phone. Search runs
    **on the phone**, so it needs the words there. Two shapes: (a) the list is
    kept in `data/` and only a search keyword set ships; (b) the list itself
    ships. (a) costs less download; (b) is simpler. Either way the brief is the
    owner's ruling that search and tags use it — confirm that is what 0137
    needs.
  - **Where lists come from.** A menu rarely prints one; chains publish
    ingredient and allergen sheets. Is copying those in scope under the
    2026-08-16 rule that menu content is owner-supplied or owner-directed?
