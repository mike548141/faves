- [ ] 💡 **Favourites becomes a filter on the home screen, and the Favourites page
      retires** `[M][ux]` — owner-raised 2026-11-18, for later.

  **Owner, verbatim:**
  > *"Consider removing favourites from the menu. Instead have a filter next to
  > open now for Favourites that,*
  > *\* Keeps the same UI elements using a card per restaurant view on the main
  > screen that lists all restaurants, but (a) filtered to just the restaurants
  > that are marked as a favourite or have dishes marked as a favourite and (b)
  > in a single column*
  > *\* Like on the favourites screen show the favourited dishes / recipes under
  > each restaurant.*
  > *Essentially this removes the favourites dedicated page and instead
  > re-orients the main page to focus on the favourites. It will generally look
  > similar to the existing favourites page only using the existing card for the
  > restaurant from the main page instead of the narrower UI element that the
  > favourites page uses for a restaurant.*
  > *We would retire the "Share these" button that the favourites screen
  > currently has."*

  **What shipped as at 2026-11-18 (read at `961875fc`).**
  - "Favourites" is a ⋯ menu entry on home (`#favourites-toggle`) that opens
    `#favourites-panel`; on a menu page it is a link to `index.html#faves`
    (`site/restaurant.html`). The view is built by `wireFavourites` in
    `site/js/app.js`.
  - "Share these" is `#favourites-share` in that panel.
  - "Open now" is `#open-now`, a `list-toggle` in the home list's toolbar,
    which is where the new filter would sit.

  **For whoever takes it.**
  - Every link to `index.html#faves` (menu page, recipe page, anything shared)
    needs a new target, most likely the home screen with the filter on.
  - The current view keeps a heart whose venue or dish no longer resolves,
    MARKED rather than dropped (ADR 0020, the comment above `wireFavourites`).
    A filter over the venue list has no card for a venue that is gone; that
    promise must survive the move.
  - How the filter combines with the others: a favourite beyond the distance
    limit (ADR 0091), closed when Open now is on, or outside the cuisine
    picked. Decide whether Favourites overrides them or narrows with them.
  - Your own recipes sit under Cook at Home in favourites (`510/290`); they
    must still appear under its card.
  - Retiring "Share these" retires its `reo.js` string (`fav.share`) and any
    check that drives it.
