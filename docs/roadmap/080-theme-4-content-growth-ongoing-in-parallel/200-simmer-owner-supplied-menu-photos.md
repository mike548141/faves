- [x] 🎯 **Simmer, Churton Park — owner-supplied menu photos** `[S][content]` —
      ✅ **CLOSED 2026-09-07 (session faves-b1); the claim is released.**
      Owner, mid-session: *"I've just added photos for simmer's menu"* — four
      JPEGs in `intake/menus/Simmer Cafe/`, timestamped 14:16 on 2026-09-07.

  🔑 **This is the menu-content rule's FIRST limb, not its second.** The rule is
  *"whatever food/dishes I give you are to be included"* — owner-**supplied**,
  which needs no further direction and no scoping argument. Contrast the
  thirteen-stub sweep in [`190`](190-the-stub-sweep-missed-a-fetchable-menu.md),
  which needed an explicit fetch instruction because nobody had handed anything
  over.

  🔎 **It answers a verdict this session had just recorded, and the answer is
  "correct, and irrelevant".** `190`'s sweep, run hours earlier, put Simmer in
  the not-fetchable column: *"no site of their own could be found under any
  spelling … behind a login past its first screen. Nothing readable was
  published."* That verdict stands — Simmer still publishes nothing. **A venue
  that publishes no menu is not a venue with no menu.** The sweep measured what
  is *on the web*, which is a different question from what exists, and the
  owner walking in with a camera is the difference. Worth stating because the
  same confusion is what made `150`'s "not one is fetchable" sentence read as
  "there is nothing to get".

  ✅ **DELIVERED 2026-09-07.** `stub` → `menu-complete`: **108 dishes across 19
  sections**, `verified: 2026-09-07` / `verifiedBy: in-store`, and the no-JS
  fallback `<li>` promoted from an unlinked "Menu coming soon" card to a real
  link (46 linked / 11 stub, was 45 / 12).

  📋 **What the four photos carried, and how each was read.**
  - `IMG_7255` — the printed **food** menu. Breakfast 4 · Eggs 5 · Lunch 7 ·
    "Go on, have…" 1 · For the kids 2 · Extras 6. Legend: `GF` `V` `N` `DF`
    `VG` and `O` = option available, mapped to `gf` `v` `df` `vg` and the
    `-option` forms.
  - `IMG_7256` — the **VITAL FLUIDS** drinks board. Friday night snacks 4 ·
    Pizzas 4 · Fancy extra toppings 2 · Smoothies 8 · Add an extra kick 3 ·
    Iced 1 · Fresh juices 3 · Bottled softs 5 · Wine 11 · Cocktails 3 · Beer 9.
  - `IMG_7257` — the **cabinet**, 24 handwritten tags on three shelves. Read at
    native resolution, one tight crop per tag.
  - `IMG_7258` — the **counter** baking, 6 tags.

  ⏱️ **Two `served` windows, both annotating and neither filtering.** The food
  menu's *"Available until 2pm"* becomes `[[null, "14:00"]]` on all seven days
  across its six sections — a null open, because the menu states no start and
  writing one would invent evidence. *"Friday from 5pm only"* becomes
  `fri: [["17:00", null]]` with every other day `[]`, across the three Friday
  sections. `tools/served_check.mjs` guards that an out-of-window section is
  still on the page with its prices legible.

  🛑 **THREE REFUSALS, none of them papered over.**
  1. **Caramel slice and Citrus slice carry no price.** Both handwritten tags
     read **`$55`** with no decimal point — verified by cropping at native
     resolution, where the `$7·50` and `$5·50` tags on the same shelf show
     their separator clearly and these two show nothing. $5.50 is obviously
     what was meant and **inferring it is inventing a price**, so both carry
     `price: null` with a `needs: price` entry saying so. The menu screen shows
     a **?**, which is the admission ADR 0041 exists to make.
  2. **One counter tag was not transcribed at all.** A tag behind the blueberry
     muffin sign shows only *"…chicken, leaves & tomato $8.70"*; the item's own
     name is hidden. A price with no dish is not a menu row.
  3. **`Gluten free toast` was NOT tagged `contains-gluten`** — see the tagger
     finding below.

  🤔 **One unresolved reading, transcribed as written.** The cabinet tag reads
  **"Chicken Cabone"**. At maximum zoom the third letter is a stem with a
  closed bowl — a `b`, not `lz` — so *what is written* is "Cabone". The item in
  the cabinet is plainly a calzone and the filling on the tag (spinach, feta,
  olive, red onion, cheese) is calzone filling, so it is near-certainly the
  shop's own misspelling. The record keeps the tag's wording and carries a
  `needs: name` entry saying why. **Not corrected**, because correcting a
  venue's spelling on a guess is the same move as guessing a price.

  🛑 **A TAGGER FINDING BIGGER THAN THIS VENUE: `tools/tag_allergens.py`
  proposed `contains-gluten` on a dish called `Gluten free toast`.** The
  DERIVED rule *"a wheat bakery item (toast)"* matched the word "toast" and
  nothing in the tool looked at the two words in front of it. This is the
  water-chestnut class of fault from [`180`](180-dragonfly-owner-directed-fetch.md)
  with the polarity reversed and the stakes higher: the water chestnut was an
  **over-warning on a vegan side**, this is a **false warning on the one item a
  coeliac is looking for**, and the fix a reader would make — distrusting the
  gluten chips — is exactly the harm. The tag was refused here.
  **Filed, not fixed** — `tag_allergens.py` was outside this session's lane and
  another session was live in the allergen tooling. The fix is an EXCLUDE
  pattern (`gluten free`, `gluten-free`) on the wheat rules, break-probed on
  this dish. It re-proposes on every future run until it lands.

  ⚠️ **The same tool leaves "no added gluten" invisible.** Five cabinet items
  carry the venue's own *"no added gluten"* wording, which is **not** `gf` —
  the weaker, safer reading, per this repo's standing treatment and the
  unresolved `LG`/`LGO` vs `NGA`→`gf` split noted in
  [`190`](190-the-stub-sweep-missed-a-fetchable-menu.md). The wording is kept
  in each dish's `desc` and no dietary tag is written. But the tool's
  `CONTRADICTED_BY` guard only knows `gf`/`df`/vegan, so it proposed
  `contains-gluten` on the Brownie and the Spiced ginger love muffin — a
  warning that directly contradicts the venue's printed claim. Both refused,
  which also keeps all five "no added gluten" items treated alike.
  **Not resolved here: the vocabulary question is not this repo's to settle in
  passing.**

  🔎 **Ten `contains-gluten` tags were added by hand, and here is the line
  drawn.** The tagger's beer rule keys on style words (`apa`, `ipa`, `stout`,
  `beer`), so it tagged four of the nine beers and left Tiger, Corona,
  Steinlager Light, Garage Project Tiny and Heineken 00 clean — and a beer list
  where four rows carry a gluten chip and five do not reads as a claim about
  the five. Same for `Bacon panini`, `Chicken panini`, `Sausage roll`,
  `Cinnamon pinwheel` and the calzone. All ten are **wheat or barley by
  definition** and match unanimous corpus practice (`the-borough-tawa` and
  `southern-cross` tag Tiger and Heineken 0.0 exactly so; `daily-bakery`,
  `gold-lining-cafe` and `charley-noble` tag panini, sausage roll, focaccia and
  ciabatta). **The line is composition-by-definition, not recipe assumption** —
  so `Fluffy pancakes` did NOT gain `contains-egg`, because vegan pancakes
  exist and this kitchen serves vegan food.

  📋 **Two modelling calls worth naming.**
  - **`Fried chicken OR cauliflower  DF, GFO  $18 / $16` became two dishes.**
    Two prices on one line cannot be one dish. The price-to-variant mapping
    follows print order (chicken $18, cauliflower $16) — an **ordering
    inference**, not a stated fact, so each dish's `desc` carries the printed
    line verbatim and a reader can see what was done.
  - **The three cocktails appear on BOTH boards** — as "Brunch cocktails" on the
    food menu and "Cocktails" on the drinks menu. Recorded once, under the
    drinks heading, with the other name in the section note. They deliberately
    carry **no `served` window**: the food sheet's "available until 2pm" would
    be a claim the drinks board does not make.

  🚩 **The schema has no venue-level note, so a venue-wide statement has to be
  attached to a section.** Simmer prints two of them — *"All of our dishes may
  contain allergens…"* and *"we are unable to swap one ingredient for
  another"* — that are true of the whole kitchen and belong to no section. Both
  are on the `Breakfast` note, which is where a reader meets them first and is
  still the wrong home. Noted, not acted on; `note` is the only prose slot a
  record has (`SECTION_KEYS` in `tools/validate.py`, `VENUE_KEYS` has none).

  📋 **Ownership deliberately NOT recorded**, as with Dragonfly: ADR 0046 would
  permit it, no Faves screen reads it, and the owner's own design rule is
  *don't write an identifier into the repo the product doesn't need*.

  🚩 **Read the photos, do not infer from the filenames.** `IMG_7255`–`IMG_7258`
  say nothing about which board or page each carries, and consecutive numbers
  need not be consecutive pages. Any price or dish that cannot be read
  confidently is **not transcribed** — the corpus's standing rule, and the
  Dragonfly and five-stub fetches both recorded refusals rather than guesses.
