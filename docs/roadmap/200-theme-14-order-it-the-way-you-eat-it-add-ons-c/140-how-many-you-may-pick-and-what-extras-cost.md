- [~] **How many you may pick, and what the extras beyond that cost**
  `[M][schema][data]` — **owner-ruled 2026-10-03:**

  > *"Some addons might have a list of things and the user may be forced to
  > select a certain number of them, like the sauces on a kebab or iskender.
  > The number range may change between dishes for example kebabs are often
  > "not more than 3" i.e. 0-3 are fine, after that is disallowed. Some allow
  > more but charge an additional fee"*

  and the boundary (ruling 4): *"Some addons are purely optional and what we
  have today is perfect for those"*. Every new field is optional, and leaving
  it out keeps today's behaviour exactly.

  **What exists (ADR 0048):** `max` on a pick-many group, as a hard cap. That
  covers "not more than 3".

  **Not expressible today:**
  - **A minimum** ("pick at least 1", "choose 2"). ADR 0156 explicitly left
    pick-many minimums undone, because no wording then asked for one.
  - **A free allowance, then a fee.** For example, Charley Noble's grill
    note: *"served with a choice of sauce … or butter …; additional sauce or
    butter $4"*. That is one included, then $4 each, and it is still prose.
  - **Per-group counts inside one build.** For example, Hell Pizza's
    build-your-own: *"up to 8 toppings — … plus 1 meat, 1 vegetable and 1
    sauce. Extra toppings priced individually."*

  🔎 **Survey evidence 2026-10-03 (`200/100`):**
  - **The cap is already in the data.** Wellington Kebab Grill's `sauces`
    is `max: 3` over 12 sauces, which is the kebab example exactly.
  - **"Exactly N" cannot be said.** Charley Noble's `cheese-two` is named
    "Choose two" but has `max: 2` and no minimum. Other cases are
    GroundUp's "Choice of 3 fillings", Pizza Hut's "Choose 3 … & 2 Sides"
    and Sushi Bi's "11 nigiri of your choice".
  - **"N included, then $X" cannot be said.** Examples are Charley Noble's
    grill, Hell Pizza's dips (1 or 2 included, extra $1.50), Thai Tara's
    meat (standard free, upgrade +$4) and Sprig & Fern Tawa's kids pizza
    ($2 per topping).
  - **Gong Cha adds a third shape:** caps that differ per drink over one
    list, with two price tiers ($1.00 / $1.30) inside a group.

  How often each shape occurs is `200/100`'s survey to measure, before the
  schema is designed. Lands in: an ADR, `ARCHITECTURE.md`, `validate.py`,
  `addons.js` (`selectionAllowed`, `configuredPrice`), the picker's words
  ("2 included, then $1 each"), the recall cap check (`saved-recall.js`), and
  `addon_check`.

  (claimed 2026-10-17-2122, faves-b4, wt: faves-200-140)

  **Done 2026-10-18 (worker `w/200-140`, ADR [0163]).** Three optional fields on a
  pick-many group: `min` (exactly N is `min == max`), and `included` with
  `extraPrice` (a fee for each pick beyond an allowance, on free options only).
  A minimum is an obligation through the same `owed()` / `missingRequired`
  mechanism as `required`, so the picker gate, the row's Add, recall and the
  order sheet's finish control (checkboxes, "choose 1 more") share one question.
  The fee rides in the line's price via `configuredPrice(base, selection, groups)`.
  Data: only Charley Noble `cheese-two` gains `min: 2` (its name is the venue's
  "Choose two", on the dish "Cheese Selection (Two)"). Left out, and said so in
  the ADR: the grill sauce and Hell's dips fit the shape but are not structured
  groups yet (content-sweep work, no option lists to apply it to); Hell's
  per-category build counts need a group of groups and were seen once; Gong Cha's
  per-drink caps and two price tiers are already expressible (one group per cap,
  option prices). `addon_check` block (ac) drives it at 390 px.

[0163]: ../../decisions/0163-a-pick-many-group-can-ask-for-n-picks-and-charge-for-extras.md
