- [ ] **A fee that is not a dish: takeaway containers and cups** `[M][schema]`
  — owner-named 2026-10-03 (*"extra fees like takeaway cups"*). Found by
  `200/100`'s survey ([the review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)).

  **In the corpus, each one stored as a dish:**
  - 1841's "Takeaway Container" is $1, a row in its Extras section.
  - Southern Cross's "Takeaway or large" is +$0.50, a row under Coffee & tea.
    It merges a cup fee with a size, and the venue's `orderMode` is dine-in
    only.
  - GroundUp's "Takeaway Cups" section (Small 5.5 / Medium 6.5 / Large 7.5 /
    6oz 5.0) is a separate takeaway price ladder for its coffees.
  - Pizza Hut catering says "Fee applies on delivery orders" and gives no
    amount.

  These get added to an order as if they were food, or not added at all, and
  the sheet's total is wrong either way.

  **Options, none chosen:**
  - (a) a venue-level fee that the sheet adds when the order is takeaway,
    per order or per item;
  - (b) a required pick-one "Here or takeaway" group on the drinks, which is
    the owner's coffee example in `200/110`. ADR 0156 can already express it;
  - (c) treat it as a price channel. GroundUp's ladder is really a takeaway
    price for each coffee, which is Theme 30's `30d` channel dimension.

  The sheet has no takeaway/dine-in state today, so (a) needs one.
