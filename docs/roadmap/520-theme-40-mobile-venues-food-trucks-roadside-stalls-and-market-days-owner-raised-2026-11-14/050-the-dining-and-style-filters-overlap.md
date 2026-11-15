- [ ] **The Dining and Style filters overlap in purpose**
      `[M][ux][data]` — owner-raised 2026-11-15, from a screenshot of the
      live home screen with the Dining list open: *"I think the dinig and
      the styles drop downs are overlapping in purpose"*. ⚑ Owner's call on
      the shape; nothing built.

  **Why he is right, measured on `main` at `57d9efb7` (65 venues, Cook at
  Home excluded):**

  | Style value | Venues | Their Dining values |
  |---|---|---|
  | Food truck | 8 | takeaway only, all 8 |
  | Sit-down | 8 | dine-in on all 8 |
  | Quick eats | 6 | takeaway on all 6 |
  | Counter order | 4 | takeaway on all 4 |
  | Banquet | 1 | dine-in |
  | Fine dining | 1 | dine-in |
  | *(no style)* | **39** | — |

  Style mixes two questions. **How you get the food** (food truck, counter
  order) is the Dining filter's question, and sit-down restates dine-in.
  **What the occasion is like** (quick eats, banquet, fine dining) is the
  only part Dining cannot say. And Style is tagged on 26 of 65 venues, the
  tagging owed by the owner since 37k shipped (2026-08-16), so picking any
  style hides most of the list. ADR 0077's finding (style is not Theme 30's
  price channel) is untouched by any option here.

  **Options:**
  1. **One "Dining" list, two groups.** *How you get it*: Takeaway, Dine-in,
     Delivery, Food truck. *What it's like*: Quick eats, Sit-down, Banquet,
     Fine dining. Counter order leaves the filter and stays a card chip.
     **Pro:** matches his own framing on 2026-11-15 (*"Food truck is another
     vibe like Takeaway, Dine-in, Delivery"*); one control instead of two,
     which frees filter-row width; old `?style=` links can be read into it.
     **Con:** cannot combine "delivery and fine dining" (no venue has both
     today); the style half still finds only tagged venues.
  2. **Split by question, keep two controls.** Dining gains Food truck;
     Style keeps only the occasion values. **Pro:** combinations stay
     possible. **Con:** sit-down still restates dine-in; two controls
     remain for a thin axis.
  3. **Drop the Style filter, keep the chips.** Dining gains Food truck; the
     style values stay on cards and in search. **Pro:** removes the overlap
     and the 39-untagged problem at once. **Con:** reverses his 2026-08-16
     ruling to build the filter fully; fine dining and banquet stop being
     filterable (one venue each today).
  4. **Leave the controls; finish the tagging.** **Con:** the overlap he
     saw is in the vocabulary, not the coverage, so it stays.

  **Recommendation: 1.** It is the shape he described in his own words, it
  is reversible, and it removes a control rather than adding rules.
