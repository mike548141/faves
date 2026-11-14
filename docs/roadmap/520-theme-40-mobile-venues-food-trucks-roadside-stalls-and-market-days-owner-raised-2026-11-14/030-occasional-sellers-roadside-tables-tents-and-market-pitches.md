- [ ] **Occasional sellers: roadside tables, tents and market pitches**
      `[M][schema][content][constraint]` — owner-raised 2026-11-14: *"a chef
      that sells food on the side of the road from a table/tent in the
      afternoon on occasion or farmers markets."* ⚑ One owner call (is a
      market a place?) and one rule this item carries absolutely.

  **Two shapes hide in this sentence, and they pull apart.**

  **The market pitch is the easy one.** A market has a street address and a
  weekly rhythm (Sunday 7:30–13:00), so a seller who is there every market
  day is `010`'s option 1 today, with no schema change: a branch at the
  market's address, hours on the market day, `[]` elsewhere, and
  `detailsVerifiedBy` naming where we read it. ⚑ **The question for the
  owner is whether the market is itself a *place***: a venue-shaped record
  whose "menu" is its stalls (each stall then a dish-like line pointing at
  its own record if it has one), or only ever a shared pitch that several
  sellers' branches happen to carry the address of. The first makes "what's
  on at Harbourside this Sunday" a screen; the second keeps the model as it
  is and loses that screen. Recommendation: **the pitch, not the place**,
  until a second market is in the corpus — one noun for one thing (ADR 0035)
  has served this repo, and a market-as-venue is a third thing with a menu
  that is not food.

  **The roadside chef is the hard one, for two reasons that are not
  technical.**

  1. **"On occasion" has no shape.** No weekly pattern, no announced spot,
     sometimes no notice at all. Today the honest record is `hours: null`
     (legal) and the app says "Hours not published" — which is true and
     unhelpful. `010`'s dated spots fit *when we are told*; when we are not,
     the right state is **"trades occasionally — watch for word"**, which is
     a fourth badge state nothing has words for. Needs the owner's words,
     and te reo for them (the reo queue).
  2. 🛑 **A table or tent on the roadside is very often outside the seller's
     own home, and a home address is never recorded — for anyone, anywhere,
     in `site/data/`, in `data/`, or in a commit message.** That is the one
     absolute in `CLAUDE.md`'s personal-data rule, and ADR 0046's `data/`
     exception (name, email, phone under provenance) stops short of it on
     purpose. So the rule this item carries: **a roadside spot is recordable
     only when it is a public place the seller has themself publicly named**
     — a park, a reserve, a car park, a market — and it carries a `source`
     saying so (`public-record` or `given`, the registry's two). A spot we
     worked out from a photo's GPS, a mention, or "it's usually near the
     school" is **not recorded**, however accurate. `tools/check_images.py`
     and `products.py` already refuse coordinates on a private address for
     intake photographs (ADR 0115, 0128); the same refusal belongs on a spot
     at intake, as a `validate.py` rule that a roaming spot's `source` is
     present and one of the two, plus a hand check that the place named is
     public. Nothing automated can tell a park from a driveway, so the hand
     check is the guard and this line is where it is written down.

  **Naming the seller.** A venue named for a person ("Ana's roadside
  dumplings") is a name, which Exception 1 already allows for recipe
  attributions at the owner's discretion; it is still the person's choice to
  trade under it publicly that makes it recordable. Phone and contact go in
  `data/` only, under ADR 0046's provenance rule, and only if `given`.

  **What ships first, when the owner names one seller:** the record, as
  `010` option 1 if there is any rhythm at all and as `hours: null` if not;
  the "trades occasionally" words; and the `source` rule in `validate.py`
  with a `test_validate.py` mutation that a spot without one is refused.
  Nothing about notifications — that is `020`, and it is downstream of this.
