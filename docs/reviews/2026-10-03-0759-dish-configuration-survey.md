# Dish configuration survey — every way a dish is configured or priced

**Asked by the owner 2026-10-03** (roadmap `200/100`), alongside his five
rulings on compulsory choices (`200/110`–`200/140`): *"scan all the menus,
dishes, and recipes we have and look at all the use cases we have for addons /
optional extras / dish configurations/ portion sizes/ extra fees like takeaway
cups / side dishes / combo deals etc."*

**Corpus at `c0dc71cc`:** 57 files, 56 venues plus Cook at Home. 10 venues
are stubs with no menu lines. In total there are 3,668 dishes and 151
structured add-on groups on 32 venues.

## The answer

The menus use **about fifteen distinct shapes**. Structure holds a minority of
them, and most still live in prose or as near-duplicate dishes. The rulings
cover the shapes that most often decide whether an order is complete:
compulsory choices, size ladders and counts. Four shapes no ruling or item
covers yet were filed as `200/150`–`200/180`.

| Shape | Seen | Structured today as | Still in prose or as duplicate dishes | Board |
|---|---|---|---|---|
| **Compulsory pick-one** ("choice of", "choose", "your way") | very common | 33 `required` groups | well over 100 dishes. 28 Thai Tara dishes ("a choice of meat"), about 25 KC Café names carrying "or", Satay Kingdom "rice or roti" ×10 and "egg or rice noodle" ×8, Abrakebabra "your choice of filling/sauce" ×17, drink flavours everywhere | `200/090` ✅, `200/130` |
| **Size / portion ladder** | very common | 57 `selects` ladders | Abrakebabra "Regular $14.50; large $16.00" ×43 and 12/16-inch ×6; Pizza Pomodoro Small/Large ×26; Regal Half/Whole and For One/For Ten; Gold Lining "- Large" coffees; Pizza Hut and McDonald's counts and drinks | `200/110`, Theme 28 |
| **Protein / base variant** | very common | a few `required` groups | mostly **separate dishes**. Takeaway at Churton has about 57 dishes in 8 protein families; Spices Indian repeats sauce × protein; Pandan, Wellington Kebab Grill, The Catch (soba/udon), Noodle Canteen (noodle/rice twins), Hell Pizza Veggie/Plant-Based twins | Theme 28 (`28a`, `28o`, `28p`) |
| **Optional paid extra** | very common | 30 single-option toggles, 11 pick-one, 10 uncapped pick-many | "Brunch Add-Ons" and "Extras" sections sold as dishes and attached to nothing (Borough, Khandallah, Gold Lining, 1841, Ramen Shop, Satay Kingdom, KK, Takeaway at Churton, Simmer) | `14b` (`200/010`) |
| **Pick-many with a cap** ("up to 3") | common | 10 groups with `max` | Hell Pizza Creator "up to 8 toppings" | `200/140` |
| **Exact or minimum count** ("choose two", "choice of 3 fillings") | occasional | **none can say it.** Charley Noble's `cheese-two` is "Choose two" with `max: 2` and no minimum | GroundUp toasties "Choice of 3 fillings"; Pizza Hut Limo "Choose 3 … & 2 Sides"; Sushi Bi platters "11 nigiri of your choice" | `200/140` |
| **Included allowance, then a fee** | occasional | **none can say it** | Charley Noble grill "choice of sauce … additional sauce or butter $4"; Hell Pizza wings (1 or 2 dips, extra $1.50); Thai Tara "standard meat no charge, upgrade +$4"; Sprig & Fern Tawa kids pizza "$2 per topping" | `200/140` |
| **Substitution / swap** (GF bun, milk, chips → curly fries) | common | modelled as **+$ add-ons**. The thing replaced is not named (`nga-bun`, `milks`, `swap-curly-fries`) | GF "+$2.50"/"+$1"/"on request" in prose at Borough, Khandallah, Gold Lining, Charley Noble, Pomodoro and others; BurgerFuel "Bun swaps" and Thai Tara "Meat choices" sold as dishes | `200/160` (new) |
| **Removal / made-to-order** | occasional | free-text note (Theme 14c) | "Gluten free without the wafer", "Vegan on request", "cannot be removed" (Rock Yard's peanuts), Simmer's "unable to swap" | Theme 14 README |
| **Combo / meal deal / set menu** | common | one +$7 toggle (Abrakebabra "Make it a combo — two of …"), with the choice inside it unmodelled | Pizza Hut deals (all prose), Wellington Kebab Grill combos, Satay Kingdom Combo A/B, Takeaway at Churton packs, Spices Indian Combo, Regal set menus, Sushi Bi platters, Charley Noble kids "$25 for two courses" | `14f` (`200/020`) |
| **Fee not tied to a dish** | rare but real | none | 1841 "Takeaway Container" $1; Southern Cross "Takeaway or large" +$0.50; GroundUp's takeaway cup ladder; Pizza Hut catering "Fee applies on delivery orders" | `200/150` (new) |
| **Per-unit, per-weight, per-person, minimum order** | occasional | none | Charley Noble Wagyu "Per 100g", oysters "minimum order 3", arancini "Minimum order of 2"; Regal dim sum "Minimum two people, price per person"; Rock Yard platters "$16/head"; Takeaway at Churton "(each)"; Sushi Bi per piece (never stated) | `200/170` (new) |
| **Channel price** (delivery or online) | 101 dishes | per-channel `prices` (KK Malaysian delivery, RS Satay online ≈1.65×) | Pizza Hut "Delivered" baked into dish names | built |
| **Time or eligibility window** | occasional | section `served` / `available` | Simmer happy hour, Victoria weekday specials, Sprig & Fern Gold Card, kids "12 and under", Regal pre-order lead times | Theme 28e, built in part |
| **Sharing / serves N** | rare | none | Pomodoro "Serves 2", 1841 "Serves 4–6", Regal party-size set menus ("select 4 mains for a table of 6-7…") | not filed (no ruling asks) |

The counts are from six readers, each reading every dish line of about 9
venues. "Very common" means more than 100 dishes; "common" means tens. The
structured counts are exact, from the data.

## What the corpus says about each ruling

**Ruling 1 — the default (`200/110`).**
- **The menu names a default rarely, but when it does the cue is reliable.**
  Examples: Abrakebabra "Regular $14.50; large $16.00" (43 dishes), Gong
  Cha's Regular, BurgerFuel's "Milk price shown; oat $9.90", Thai Tara's
  "The standard choice of meat — no charge".
- **More often the headline price is the only cue.** That is the Spices
  Indian case.
- **Several ladders default to an option with no name.** Southern Cross,
  The Borough, Khandallah and The Victoria all use `size-1`. The default is
  real, but nothing says what it is (a glass? a 285ml pour?).
- **Gong Cha's size is a pick-one `adds` group (Regular +$0 / Large +$1),
  not a ladder.** It works today only because it is optional. It is exactly
  the coffee case the ruling names.
- 🔎 **Converting a choice deletes the menu's own words from the dish.**
  14b moved "Choice of mild, medium or hot" out of Noodle Canteen's
  descriptions and into a `heat` group. The wording survives only in git
  (`f56eda63`). A default inferred "from the wording used on the menu" needs
  that wording kept somewhere a later reader can check.

**Ruling 2 — must-see (`200/120`).** The best candidates are the defaulted
ladders and choices where a silent default changes the dish or the bill.
Examples: Spices Indian Half/Full, BurgerFuel Single/Double, Gong Cha
Regular/Large, the unnamed `size-1` pours, and a coffee's milk.

**Ruling 3 — the unfinished line (`200/130`).** No new evidence. Its
population is the 33 `required` groups plus every prose compulsory choice
that 14b will convert. Each conversion adds lines that a saved order made
before it would now fail.

**Ruling 4 — optional stays as it is.** 61 optional groups, 30 of them
single-option toggles ("Add gravy $3"). Nothing in the survey argues for
changing them.

**Ruling 5 — counts (`200/140`).**
- Wellington Kebab Grill's `sauces` is already `max: 3` on 12 sauces,
  which is the owner's kebab example exactly.
- What cannot be expressed is "exactly N" (Charley Noble cheese,
  GroundUp's 3 fillings, Pizza Hut deals) and "N included, then $X each"
  (Charley Noble grill, Hell Pizza dips, Thai Tara meats, Sprig & Fern
  kids toppings).
- Gong Cha shows a third shape: a cap that differs per drink over one
  topping list, with **two price tiers** inside the group ($1.00 / $1.30).

## Refuted on checking — read before acting on a scanner's flag

Each scanner read only the current dish text, so some of their flags are
wrong:

- **`required` "with no text support".** Three were flagged:
  - Noodle Canteen `heat`. The pre-conversion text read "Choice of mild,
    medium or hot."
  - BurgerFuel `choppers-sauce`. It read "your choice of BBQ Sauce or
    sriracha."
  - The Borough `schnitty-side`. It read "choice of fries or mash."

  All three are sound. 14b moved the words into the group (`f56eda63`).
  The other `required` groups were flagged on the same grounds and come
  from the same commits; they were **not** individually re-checked.
- **Crêpes "Chocolate or Nutella" tagged `contains-nuts`** was flagged as an
  over-warning. It is one option standing for two products. The union is
  the safe reading, so there is no allergen defect. Splitting it into two
  options would let plain chocolate drop the warning, and that is content
  work for 14b.

## Defects seen in passing (not yet checked against the source)

These are filed as `200/180`, each to be verified against the menu before it
is changed:

- **Prices that look mistyped:**
  - Noodle Canteen Sambal chicken is $13.50; its siblings are $19.
  - Noodle Canteen Wonton noodle soup is $20.30; every other price ends in
    0 or 0.5.
  - The Catch Normal Tempura Udon is $25.30, but Soba is $23 (every other
    pair matches).
  - Abrakebabra Vegetarian Burger large is only +$0.50.
- **Descriptions that describe another dish:**
  - Satay Kingdom "Chicken Nasi Lemak" mentions beef rendang.
  - Satay Kingdom "Black Pepper" describes tom yum.
- **Same thing, two prices:**
  - Sprig & Fern Tawa `gluten-free-toast` is +$2 in `gf-toast` and $6 in
    `brunch-sides`. Eggs on Toast carries both.
  - Gold Lining bacon is $7 in `add-bacon` and $8 in Brunch Add-Ons.
- **Groups wider than their dishes:**
  - Wellington Kebab Grill `extras` offers "Extra meat" on falafel and
    halloumi dishes.
  - Its `sauces` sits on Iskender and Salad sections whose text names no
    sauce, while the pitas that say "and sauce" have none.
  - Abrakebabra `combo` sits on Nachos, Shish and Turkish Pizza.
  - Dirty Little Secret `upgrades` offers "Beef patty" on the beef burger.
- **Filing:** all three entries in The Victoria's Rosé section are named
  Pinot Noir.
- **Online price anomalies at RS Satay** (`prices.online`): the three
  Seafood rows carry their cheaper sibling's online price.

## Recipes (Cook at Home, 21 recipes)

None of the recipe shapes is an order configuration, so none of them is
filed under Theme 14. They bear on the scaler (Theme 17) and the recipe page:

- `serves` disagrees with yield. Hotcakes has "Makes 10–15" against
  `serves: 4`; Queen Cakes has "Makes 21" against 10.
- Some quantities cannot be scaled: "1–1½ cups", "Pinch of salt",
  "liberal amounts", "Approx. 2 cups".
- Alternatives are written as "or": "beef stock or water", "palm sugar (or
  brown sugar)", "chicken, pork and/or prawns".
- Some ingredients are optional: white wine, parmesan, the brownie's
  "anything goes" toppings.
- Some serve-with items appear in the method but not the ingredients:
  Pumpkin Pie's whipped cream, Lava Cakes' fruit and ice cream.

## Method, so this can be re-run

Each venue file was dumped one line per dish: section, name, price,
per-channel `prices`, `desc`, `note` and attached `addOns`. Recipes also
carried `serves`, ingredients and steps. Venue notes and every
`addOnGroups` entry were included verbatim. The 57 dumps were split into six
batches of about 66 KB, and each batch was read in full by a separate reader
against one category list. Readers could add categories but were not allowed
to force a fit. The flags they leaned on were then checked against the data
and git history (above). The structured counts in this review are from the
data, not from the readers.
