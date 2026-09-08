- [ ] 💡 **30g — a delivery price is a SERVICE FEE, not a second price**
      `[M][schema][design]` — **owner-raised 2026-08-16, and he said "I would
      consider", not "build it".** Raised in the same breath as the 30d ruling,
      about the case that ruling deliberately excluded:
      > *"your Pizza hut example of delivered vs in-store is an interesting one
      > that I would consider adding to Faves, its essentially a dish(es) with a
      > service fee/alternate price to pay for that service and I would consider
      > including that in Faves. It may require choosing dine-in vs takeaway
      > (pickup) vs delivery?"*
      🔑 **This is a better framing than the one [ADR 0085](../../decisions/0085-a-delivery-price-fills-a-hole-it-is-not-a-feature.md)
      rejected, and it is not the same idea.** 0085 refused *"one dish shown at
      two prices"* because that productises a data gap. A **service fee** is a
      different claim: the dish is the same, the price differs because you are
      buying a *service* alongside it, and the reader chooses the service. That
      is honest, it is what the shop actually charges, and it does not ask the
      reader to compare two numbers for the same thing.
      🛑 **[PREMISE DEAD — see the 2026-09-09 note at the foot of this item. The
      sweep below was true on 2026-08-16 and is not true now.]
      But NOTHING IN THE CORPUS EXERCISES IT — measured, not assumed.**
      Swept all 55 records for a dish priced twice by channel: **12 rows, 2
      venues.** `pizza-pomodoro`'s 2 are withdrawn (30d's ruling). `pizza-hut`'s
      10 are *"…Delivered"* rows, and the pairing test returns **ZERO true pairs**
      — every one is a delivery-only bundle with no in-store twin, so not one of
      them is the same dish at two prices. ⇒ **The idea has no instance.** By the
      owner's own 30a logic — *don't ship a schema nothing exercises* — this gets
      recorded and waits for a venue that genuinely prices one dish differently
      for dine-in, pickup and delivery.
      🎯 **What it needs when a venue arrives, so the design starts from the right
      question:** is it a **fee on the order** (one charge, whole basket — which
      is what a delivery fee usually is, and belongs with 30f `charges[]`), or a
      **per-dish price** (which is the `channel` axis 0085 declined)? Pizza Hut's
      own data suggests the first: its delivered rows are *bundles priced whole*,
      not dishes with a surcharge. **Answer that before writing any field** — the
      two shapes are not variants of each other, and 0085 already shows how
      easily a collection gap is mistaken for a modelling one.
      ⚠️ Also note this reaches the naming ruling: `order-mode` is now the settled
      word for the shipped venue filter, and *"dine-in vs takeaway (pickup) vs
      delivery"* is that same axis at dish level. Do not open a fourth word.

  ## 🛑 THE PREMISE THIS ITEM WAITS ON IS DEAD — re-measured 2026-09-09

  This item's whole reason for waiting is *"the idea has no instance"*. **It has
  101 of them.** [ADR 0089](../../decisions/0089-a-dish-has-a-price-per-door.md)
  (accepted **2026-09-06**, owner-ruled) put a per-door price on the dish and a
  `priceChannels` block on the venue:

  | Venue | Channel | Dishes with a per-channel price |
  |---|---|---|
  | `kk-malaysian` | delivery (Delivereasy) | **29** |
  | `rs-satay-noodle-house` | online | **72** |
  | | | **101 across 2 venues** |

  Counted on 2026-09-09 from `site/data/restaurants/*.json`, by walking each
  record for a dish carrying a `prices` map. The 2026-08-16 sweep quoted above —
  *"12 rows, 2 venues … ZERO true pairs"* — described the corpus before ADR 0089
  and is kept for the record, struck at its head.

  🔑 **What actually changed, stated carefully, because it is NOT simply "this is
  now built".** ADR 0089 answered the *data* half — a dish may hold more than one
  price, keyed by door. It did **not** answer the question this item exists to
  ask, and it did not claim to: **is a delivery premium a fee on the ORDER
  (whole basket, `charges[]`, 30f) or a price on the DISH?** 0089 chose per-dish
  *without putting that question*, which `490/030` records in the same words.
  So the 🎯 above survives its own premise's death — it is now a question about
  a shipped field rather than a hypothetical one, which makes it **more** live,
  not less.

  🔗 **Now duplicated in substance by
  [`490/030`](../490-cold-review-of-the-data-model-owner-raised-2026-09-07/030-prices-and-pricechannels-ship-to-every-phone-and-nothing-renders-them.md)**
  — *"`prices` and `priceChannels` ship to every phone and nothing renders
  them"*, which the owner ruled on 2026-09-08 (option 3, design a render).
  **Deliberately NOT merged**, and the two are not the same item: `490/030` asks
  *what screen shows this field*, this one asks *what the field should have been
  in the first place*. Cross-referenced instead so neither is worked in ignorance
  of the other. `490/030` carries the reciprocal pointer already.
  🛑 **The bracket stays `- [ ]` and the 🎯 stays live.** This pass measured the
  premise and changed nothing else; whether 30g's question is still worth asking
  now that 0089 has shipped one answer to it is an owner call, not this pass's.
