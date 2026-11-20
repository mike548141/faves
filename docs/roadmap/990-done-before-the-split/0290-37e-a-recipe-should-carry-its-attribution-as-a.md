- [x] **37e — a recipe should carry its attribution as a field** `[S][schema]
      [js]`. **CLAIMED 2026-08-16 13:55 UTC (wt: faves-recipe)** — the recipe-page
      pass. Owner: *"Recipes should be able to be attributed, for example to
      the Edmunds cookbook"* (the NZ cookbook is spelled **Edmonds**; the data
      already has it right). Today attribution is buried in free prose — the
      pudding's `description` reads *"A Clements family dessert since the early
      1980s — adapted from the Edmonds cookbook"*. A field can be rendered
      consistently, styled as a credit, and eventually searched; prose cannot.
      🚩 **ADR 0047 applies**: this adds a field to `site/data/`, which every
      phone downloads — so the screen that renders it (the recipe page's credit
      line) ships in the *same* change, never after.
      🔎 This is squarely inside CLAUDE.md's **Exception 1** — family
      attributions in home recipes are owner-approved. A *source* credit
      (a cookbook, a publication) is not personal data at all.
