- [x] **Multi-buy: "Two for $10.00"** `[S][schema]` — filed 2026-10-18 by
      `faves-b4` from 200/170's hand-back. Spices Indian's samosa is "Two for
      $10.00" with `price: null`, so it shows no price and never reaches a
      total. ADR 0166's `minQty` + `unit` cannot say it: the price is for a
      bundle, not a unit. Needs a bundle shape (a price for N) or stays prose;
      one row in the corpus, so measure how many more exist before designing.

  (claimed 2026-11-23-1501, session f9ee6733, primary checkout: the
  measurement only, not a design)

  ✅ **Measured and closed 2026-11-23 (queue run f9ee6733): it stays prose.**
  Every string in the 66 venue files was searched for a bundle price (`N for
  $X`, `N x for`, `N @ $`, `buy N`, `any two`), number words and digits both.
  **Two rows**, both already saying it in their own `desc`:
  `ah-mas-kitchen` *"3 for $20."* (unit `price` 7, so it totals at the unit
  price) and `spices-indian` *"Two for $10.00."* (`price: null`, as filed).
  Two rows do not earn a schema shape (ADR 0047: name the screen; and a
  bundle price changes the order total's arithmetic, which is not worth
  risking for two lines). **Re-open when a fifth row appears**, or if the owner
  wants the samosa to reach a total; the search above is the measurement to
  re-run.

