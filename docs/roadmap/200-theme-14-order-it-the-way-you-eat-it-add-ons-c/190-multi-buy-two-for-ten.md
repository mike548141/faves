- [ ] **Multi-buy: "Two for $10.00"** `[S][schema]` — filed 2026-10-18 by
      `faves-b4` from 200/170's hand-back. Spices Indian's samosa is "Two for
      $10.00" with `price: null`, so it shows no price and never reaches a
      total. ADR 0166's `minQty` + `unit` cannot say it: the price is for a
      bundle, not a unit. Needs a bundle shape (a price for N) or stays prose;
      one row in the corpus, so measure how many more exist before designing.
