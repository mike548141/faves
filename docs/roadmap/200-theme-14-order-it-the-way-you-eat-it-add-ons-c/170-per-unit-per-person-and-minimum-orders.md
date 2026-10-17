- [~] **Priced per piece, per 100 g or per person, with a minimum order**
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

  (claimed 2026-10-17-2134, faves-b4, wt: faves-200-170)

  **Done in `w/200-170` (ADR 0165), minimum orders end to end; the board state
  is the orchestrator's.** Two optional dish fields, `minQty` (integer of 2 or
  more) and `unit` (`each`, `per person`, `per 100 g`), both only where the menu
  prints them. Add starts at the minimum; ＋ on a short line jumps to it; − at the
  minimum becomes ✕ and removes the line. The order line stores neither field:
  the sheet joins each line to the live record (`dish-rules.js` `joinRules`), so
  lines that predate the rule or came in a link are flagged and the total says so.
  A `per 100 g` line shows its unit price and is left out of the total (the sheet
  gives it `price: null`, so the existing "+" machinery does the rest). Recall
  raises a saved quantity under the minimum and names it. Browser assertions are
  block (ad) of `tools/addon_check.mjs`; unit tests in `tests/dish-rules.test.js`.

  Data applied (menu words in brackets): Charley Noble oysters natural and beer
  battered `minQty` 3 ("minimum order 3"); arancini and smoked fish croquette
  `minQty` 2 ("Minimum order of 2"); Wagyu ribeye on the bone and A5 sirloin
  `unit` per 100 g ("Per 100g"). Regal dim sum platter `minQty` 2, per person
  ("Minimum two people, price per person"); Peking duck set menu and Regal set
  menu `minQty` 6, per person ("Per person, minimum table of 6"). Spices Indian
  roasted poppadom `unit` each ("Each."). Takeaway at Churton chicken nugget,
  calamari ring, battered mussel, scallop and dim sim `unit` each ("(each)").
  1841's four "Each." extras (aioli / garlic butter / hollandaise / fried egg;
  house-made salsa / toast / GF bread / extra sauce; 1841 slaw / garden salad /
  mash / onions / tomatoes / mushrooms; pork sausage / bacon) `unit` each. KK
  Malaysian jasmine tea and green tea `unit` per person ("Per person.").

  Left, and why: Rock Yard's tasting platters (the price is the platter's total
  for 2 to 5 people, $32 for two, so "per person" on it would misprice);
  Regal's mains-per-table scaling and "one set menu per table" (prose, as this
  item allows); Spices Indian's "Two for $10.00" multi-buy (`price: null`, needs
  a bundle shape); Sushi Bi's per-piece rows (the menu never prints a unit);
  Steamed Paua "(each)" (market price, so a unit has no price to describe); the
  `desc` and `name` words the new fields repeat ("(each)", "minimum order 3")
  are kept as evidence, so a row now reads "Dim Sim (each) $2.90 each". Whether
  to strip them is a separate content call. Open: a mid-order picker change on a
  dish with a minimum would leave the line short (none has a picker today).
