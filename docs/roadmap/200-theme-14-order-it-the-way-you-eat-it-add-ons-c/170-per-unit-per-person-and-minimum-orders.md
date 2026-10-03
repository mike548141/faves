- [ ] **Priced per piece, per 100 g or per person, with a minimum order**
  `[M][schema]` — found by `200/100`'s survey
  ([the review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)).
  A dish's `price` assumes one dish = one price. These do not:
  - **Per weight:** Charley Noble's Wagyu ribeye and A5 sirloin are "Per
    100g … size subject to availability".
  - **Minimum order:** Charley Noble's oysters are "minimum order 3"; its
    arancini and croquettes are "Minimum order of 2".
  - **Per person, with a minimum party:** Regal's dim sum platter is
    "Minimum two people, price per person". Its set menus are "Per person,
    minimum table of 6 … limited to one set menu per table", and the number
    of mains scales with the table ("select 4 mains for a table of 6-7, 5 for
    8-9, 6 for 10+"). Rock Yard's tasting platters are "$16/head, min 2"
    and are stored as four dishes (2 to 5 people).
  - **Per piece, said or unsaid:** Takeaway at Churton's "(each)" rows.
    Sushi Bi's $1.80–$2.50 rows, where the unit is never printed.
  - **Multi-buy:** Spices Indian's samosa is "Two for $10.00" with
    `price: null`.

  On the sheet today, a quantity stepper starting at 1 lets you order one
  oyster and one head of a set menu, and the total says nothing is wrong.
  The fix wants a `unit` and a `minQty` (or similar) on a dish. The
  party-size rule is a separate, harder shape and may stay in prose.
