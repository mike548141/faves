- [x] **The Dining and Style filters overlap in purpose**
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

  ✅ **Owner ruled 2026-11-15 — option 2, in his words:** *"I choose option 2
  "Keep two lists, but split them by question" … You have the difference
  correct, "How you get [the food]" vs "What [the dining experience is] like".
  And I see that Cook at home is really just another form of "How you get
  [the food]""*. And, same message: *"Remove the "Cheap eats" button from the
  filter list I dont think its useful as it is"*.

  **Built (session record `2026-11-15-0222`):**
  - **Dining** offers Takeaway, Dine-in, Delivery, **Food truck** and **Cook
    at home**. Each option is a predicate (`filters.js` `DINING`): the three
    doors still read `orderMode`; Food truck reads the `food-truck` vibe, now
    in a new `dining` facet; Cook at home is the recipe collection. A truck
    stays under Takeaway too, because it is declared takeaway.
  - **Style** offers Quick eats, Sit-down, Banquet and Fine dining. Counter
    order moved to the `amenity` facet, so its chip stays and the filter no
    longer offers it.
  - **Cheap eats is gone**: the button, its state key, its chip and
    `price.isCheapEats` (nothing else called it). The price band still shows
    on every card. A stale `cheap` in saved state filters nothing.
  - Found on the way: with Cook at home chosen, its card sat alone in the
    right-hand column at desktop width (it is pinned top-right); a lone card
    now takes the first cell. And the count read "1 of 66 place"; it now
    reads "1 of 66 places".
  - **Te reo** for the two new options is owed, not drafted
    (`docs/reo-review-queue.md`); they render in English until looked up.
  - Still true and unchanged: 39 of 65 venues carry no style, so the Style
    list finds only tagged places; that tagging is 37k's and his.
