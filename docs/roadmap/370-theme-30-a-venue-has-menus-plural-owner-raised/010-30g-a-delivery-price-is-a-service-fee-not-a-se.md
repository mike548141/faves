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
      🛑 **But NOTHING IN THE CORPUS EXERCISES IT — measured, not assumed.**
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
