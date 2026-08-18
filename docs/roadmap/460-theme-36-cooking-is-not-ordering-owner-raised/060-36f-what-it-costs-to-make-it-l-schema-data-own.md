- [x] ⏸️ **PARKED 2026-08-16 by the owner — no work owed, and this is not
      "delivered".** Re-marked 2026-08-17 under the work-owed tri-state (the
      bracket answers *is work owed?*; the disposition lives here, per the
      legend). `costToMake` is parked and `currency` stays the placeholder it is;
      the grocery-source question is **not live** until he unparks it. Reopen by
      flipping this back to `[ ]` — nothing else is needed.
      **36f — what it costs to make it** `[L][schema][data]` — owner-signalled 2026-08-16

Raised by the owner while correcting this theme: *"a recipe may in the future
include the total cost to make that dish."* That is why `currency` sits on the
collection, and it is a stronger feature than it first looks — **Faves' whole
question is "order out, or cook?", and it currently answers only one half of it
with a number.** A recipe that says "$14 to make, serves 6" beside a takeaway
that says "$28" is the app finally comparing the two things it puts side by side
on the home screen.

**What makes it hard is not the arithmetic.** A cost needs a price per
ingredient, and:
- **We do not hold grocery prices, and they move.** Menu prices come from the
  owner or an owner-directed fetch (CLAUDE.md's standing rule); grocery prices
  are a different corpus entirely, with no first-party source and weekly drift.
  Every objection that blocked live menu scraping applies here with more force.
- **A recipe line is prose, not a quantity.** "Water or milk, as required for a
  thick batter" cannot be costed. The same ingredient/step structure 36b needs
  is the prerequisite here too — this is 36b's schema, used a second way.
- **Pack sizes, not recipe sizes.** A recipe wanting 100g of butter costs a
  500g block; "cost to make" and "cost to shop for" are different numbers and
  the app must not conflate them. Which one is wanted is a design call.
- **ADR 0047 applies.** A per-ingredient price is a field on every recipe line,
  precached to every phone. It ships only if a screen renders it.

🎯 **The staged version that is actually buildable:** an owner-supplied
`costToMake` on the recipe — one number, one date, his own figure — rendered
beside `serves` as "about $X, serves Y (priced <date>)". No grocery corpus, no
per-ingredient maths, no invented facts, and it answers the comparison question
today. Per-ingredient costing stays behind 36b's schema.
✅ **RULED 2026-08-16: park `costToMake`.** `currency` stays as the placeholder
it is. ⚑ discharged — the grocery-source question is not live until he unparks
this.
