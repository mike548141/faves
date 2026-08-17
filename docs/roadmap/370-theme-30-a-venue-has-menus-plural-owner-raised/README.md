# Theme 30 — a venue has *menus*, plural (owner-raised 2026-08-16)

> *"I think we need to allow for a restaurant (irrespective of single location
> or branches) having multiple menus. They could be seasonal (summer vs winter)
> or time of day (lunch vs dinner) where one finishes another starts. But they
> could also be over lapping e.g. a brunch menu that runs all day, or different
> menus for dine-in vs takeaway, or different areas of the restaurant that you
> can use. Lets at least ensure the data model supports all that … Again this is
> ensuring that future needs don't break the data model, and some of those needs
> might be things outside Faves core purpose, like keeping the historical
> pricing data, and permanently closed restaurants as historical/analytical/
> trend data to analyse outside of Faves."*

The ask is explicitly **model-first**: make the shape able to hold this, build
screens later. What follows is the answer to that, grounded in a survey of how
the industry actually does it rather than in invention.

### What the survey found — three convergences

Every serious commercial menu schema (Square, Toast, Uber Eats, Deliveroo,
DoorDash, Oracle Simphony, Lightspeed, Google's menu feed, schema.org) lands on
the same three decisions, and **all three are ones our tree cannot make.**

1. **Flat entity pools joined by id, not nested containment.** Deliveroo tells
   partners outright to *avoid duplicating categories, items and modifiers
   across mealtimes* and to reuse one item id. Containment forces duplication;
   the duplicate then drifts. 🎯 **We are already halfway there** — ADR 0051's
   `dishId` landed today, and it is precisely the primitive that makes this
   possible. A dish becomes an entity in the venue's catalogue and a menu
   becomes an *ordered list of references*.
2. **Price is a resolution over context, not a scalar on a dish.** Toast's
   `pricingStrategy` enum is the best real enumeration of why:
   `BASE_PRICE`, `MENU_SPECIFIC_PRICE` (*"an entree might cost $10 from the
   Lunch menu but $15 from the Dinner menu"*), `TIME_SPECIFIC_PRICE`,
   `SIZE_PRICE`, `SEQUENCE_PRICE` (1st topping vs 2nd), `SIZE_SEQUENCE_PRICE`,
   `GROUP_PRICE`, `OPEN_PRICE` (market price). Uber Eats and Deliveroo both
   name the field `price_info.overrides[]` with a `context_type`.
3. **Availability is a rule set with a conflict rule, not a boolean.** And here
   the survey settled the owner's hardest case for us — see below.

### The owner's "overlapping brunch menu" is the case that breaks the field

Deliveroo forbids overlap: mealtime schedules *"must not overlap"*, no gaps,
one active at a time. That is tenable only for a delivery-only catalogue.
Simphony — 30 years of real hospitality — allows overlap and resolves it by
**explicit priority, first match wins**: a "Free Drinks" rule at priority 1
beats "Early Bird" at priority 2 in the hour they share. Its documented
resolution order is Serving Period > Auto Menu Level > revenue-centre default >
fallback.

🎯 **So the owner's instinct is right and the tidier model is the wrong one.**
An all-day brunch menu genuinely does run alongside lunch. We should carry
`priority` on every availability rule and document first-match-wins, rather than
validating overlap away.

### "Different areas of the restaurant" already has an industry name

Simphony's **`Revenue Center`**: bar, dining room, garden bar, room service are
separate RVCs sharing enterprise-level dishes but carrying **their own prices,
their own serving periods and their own tax rates**. Lightspeed does the same
by binding a menu to a POS device. A `venue → menu` model cannot say "the same
Negroni is $18 in the dining room and $14 in the garden bar", which is ordinary.

### What our current model cannot represent — ranked, with our own evidence

`site/data/restaurants/<id>.json` is `venue → menu[] (sections) → items[]`, one
`price` per item, one `available` window per section or dish.

| # | Cannot represent | Already biting us? |
|---|---|---|
| 1 | One dish on two menus at two prices | Not yet — but Theme 28 found **81 rows carrying a second price inside a `desc` string**, 153 price points. That is this problem, already here, encoded as prose. |
| 2 | Dine-in vs takeaway vs delivery price for one dish | **Yes.** Phase 1 notes KK Malaysian and KC Cafe prices are *delivery/online-ordering, marked up*, with "prefer in-store" as an unresolved caveat. We have two prices and one field. |
| 3 | Per-branch price and per-branch existence | **Yes, latent.** 5 chains, 22 branches. McDonald's NZ franchisees set their own prices; the same is true of Subway. |
| 4 | Overlapping active menus needing priority | Not yet — no venue has two menus at all. |
| 5 | Menus/prices bounded by absolute dates (LTO, seasonal, Ramadan) | Partly — `available.from/to/season` exists on sections and dishes, but not on a *menu*, because there is no menu entity. |
| 6 | A dish's section membership being many-to-many | **Yes.** ADR 0049 exists because a row offered as an add-on was being printed twice; that is the many-to-many problem solved once, narrowly. |
| 7 | Price bands shared by many dishes (dim sum 小點/中點/大點) | Not yet — but it is how a whole cuisine prices itself, and we hold no dim sum venue *yet*. |
| 8 | Per-person / per-table pricing (tasting menus, thali, iftar) | Not yet. `pricePerPerson` exists but is a *curated estimate*, not a price. |
| 9 | Included, unpriced accompaniments (Korean banchan, bread with menú del día) | Not yet — and note a schema **requiring** a price per dish cannot show banchan at all. Ours allows `null`, so we are accidentally fine. |
| 10 | Non-dish charges that must appear on the menu (Italian *coperto*, Portuguese *couvert*, Japanese *otoshi*) | Not yet. All three are legally required to be printed on the menu in their jurisdictions. |

### The proposed shape — staged, backward-compatible, and ADR 0047-bounded

The governing constraint is **ADR 0047: the app ships only what it renders.**
`site/data/` is precached by every phone. So the staging below is not
gold-plating deferred — it is *the payload staying small while the record gets
rich*.

- **30a — `menus[]` as an optional layer above `menu[]`** `[L][schema]`. Today's
  `menu: [section, …]` becomes sugar for "one unnamed menu". A venue with more
  says:
  ```jsonc
  "menus": [
    { "id": "lunch", "name": "Lunch", "kind": "lunch",
      "available": [{ "days": ["mon","tue","wed","thu","fri"],
                      "from": "11:00", "to": "15:00", "priority": 2 }],
      "sections": [ … ] },
    { "id": "all-day", "name": "All day", "kind": "all_day",
      "available": [{ "priority": 5 }], "sections": [ … ] }
  ]
  ```
  Sections keep their present shape. **Backward compatible**: absent `menus`
  means today's behaviour exactly. `validate.py` rejects a record carrying both.
- **30b — a dish reference, not a dish copy** `[M][schema]` 🔗 **rests on ADR
  0051.** Where the same dish appears on two menus, the second carries
  `{ "dishId": "…", "price": … }` rather than a duplicated object. This is the
  single decision that stops two copies of one dish drifting apart, and it is
  only possible because `dishId` is now required and immutable.
- **30c — `kind` on a menu, driving optional schema** `[S][schema]`. Not a
  label: a wine list needs vintage/producer/format, a set menu needs a
  per-person price and course sequence, a kids menu changes legally-required
  calorie footer text in England. Closed set, extended when a real venue needs
  a value — never invented ahead of one (owner's 2026-08-16 scope ruling).
- ✅ **30d IS CLOSED AS A SCHEMA ITEM — owner ruled 2026-08-16,
  [ADR 0085](../../decisions/0085-a-delivery-price-fills-a-hole-it-is-not-a-feature.md).**
  He was given four options and answered none of them, restating the goal
  instead: *"Our goal is to show only in-store pricing, but if we don't have any
  other data to hand then we will at least show the app store pricing until an
  in-store menu can be collected. I do not want Faves to show both the in-store
  and in-app pricing as a feature, it's a way to fill a hole in the data not a
  feature."*
  ⇒ **One price per dish. Delivery is a captioned fallback, never a second
  price shown beside the first. `channel` is NOT admitted to `site/data/`.**
  🔑 **The inference that had to be retracted, worth keeping:** the evidence was
  sound and the conclusion drawn from it was wrong — **a duplicated row is a
  data-collection gap wearing the clothes of a modelling gap**, and an industry
  consensus is evidence about what a POS must model, not about what this app
  should show. ADR 0085 supersedes the channel half of ADR 0080 on that point.
  ⏳ **What survives is a CONTENT task, not a schema one:** collect in-store
  prices where only app prices are held. Two open pieces, both needing the
  owner because content is owner-directed — (1) `pizza-pomodoro` currently shows
  **both** an in-store $29.00 and an Online Deal $17.00 for one pizza, which the
  ruling forbids; the in-store price is the one to keep and the deal rows belong
  in `data/`. (2) `pizza-hut`'s five *"…Delivered"* rows are **NOT** the same
  case and must not be swept up with them — a delivery-only bundle is one
  product, not one dish at two prices.
  ✅ **KK Malaysian and KC Cafe are now correct rather than incomplete** — they
  hold a delivery-sourced price because no in-store reading exists, which is
  exactly the ruling, and since 2026-08-16 they say so (`verifiedBy:
  delivery-app`). Their fix is an in-store menu, at which point the fallback is
  replaced and the caveat retires itself.
- ⚠️ **CORRECTION, same session, 2026-08-16 (wt: faves-schema30). The block
  immediately below said the channel dimension is exercised by nothing. That is
  WRONG and it is corrected here rather than rewritten away.** It was arrived at
  by looking only at the record store, which is where the owner's greenlight
  pointed. Re-testing a *different* stale premise — Theme 28's *"there are no
  discounts in the corpus at all"*, measured at 48 records and now 55 — turned
  this up on the way past:
  🔑 **`pizza-pomodoro` sells the same pizza at two prices, right now, in the
  payload.** `Margherita - Large` is **$29.00**; `Large Margherita (Online Deal)`
  is **$17.00**, desc *"Large size only. Online ordering special price."* Same
  for Marinara. **A 41% spread on identical ingredients, in the same section of
  the same file**, distinguished only by a parenthetical in the dish NAME and a
  sentence of prose — which is precisely the pattern ADR 0057 spent a whole
  theme pulling out of section headings. `pizza-hut` has the same disease in a
  second form: five `Meal Deals` rows whose names end *"Delivered"*.
  So the honest statement is: **the channel dimension IS live, and it is live in
  `site/data/`, not in `data/`.** That is a different dilemma from the one below,
  not the absence of one — and it is sharper, because ADR 0047 says the payload
  ships only what it renders, and no screen renders a channel today. The two
  rows are also a Theme 25 case: `large-margherita-online-deal` and
  `margherita-large` are two `dishId`s for one dish in two channels.
  🚩 **And Theme 28's "no discounts" claim needs re-reading, not deleting.** On
  its own stated word list it is still true — no "% off", no "happy hour", no
  "senior". In substance it is not: `satay-kingdom-cafe` prints *"(Save $2.50)"*
  on two combo rows, and the Online Deal rows above are a channel discount by
  another name. The Gold Card rows remain correctly analysed as portions, not
  discounts. **A word-list measurement expires when the corpus grows; the
  finding was sound and its scope was not restated when 7 venues landed.**
- 🛑 **The part of the finding below that STANDS.** Checked 2026-08-16
  (wt: faves-schema30). The owner greenlit *"`channel` on a price record in
  `data/`"*. Three facts say that *specific* placement would ship a field
  nothing exercises — the correction above moves the need into the payload, it
  does not create one in the record store:
  - **Only 2 venues have any price history at all** — `takeaway-at-churton`
    (174 rows) and `thai-tara-express` (38 rows). Every one of those 212 entries
    is a paper menu or a 2019 scan. **None is delivery-sourced.**
  - **KK Malaysian and KC Cafe — the two venues this item exists for — have no
    price-history rows whatsoever.** The live debt is in their *current* price,
    not in the record store.
  - **`delivery-app` already exists as a `verifiedBy` value** (ADR 0031),
    already renders the "untrusted" caveat — *"These prices came from a delivery
    app, not the place itself"* — and is already precached. **It is used by zero
    venues.**
  🔎 **The real defect is one level down and needs no new field.** KK Malaysian
  and KC Cafe carry `verified: null` and no `verifiedBy` — no derivation at all
  — while `docs/STRATEGY.md` records in prose that their prices are
  Delivereasy's and marked up. **27 of 55 venues have no verification reading**,
  so the caveat machinery ADR 0037 built cannot fire for half the corpus. Two
  venues today show marked-up delivery prices with no caveat, using a field that
  already exists and already renders.
  🎯 **Owner's call, and it is a real fork** — (a) build `channel` in `data/` as
  greenlit, on the understanding that it lands on 212 rows that are all the same
  value and does nothing for KK/KC; (b) spend the same effort setting
  `verifiedBy: delivery-app` on the venues whose prices came from one, which is
  visible to readers immediately; or (c) both, in that order. Recommendation:
  **(b)**. Note (b) needs a `verified` date and `reading()` returns null without
  one — the git add-date (2026-07-06 for both) is defensible *record time*, but
  provenance on menu content is owner-directed, so it is asked rather than
  assumed.
  ⚠️ **Naming clash to settle before either:** this item spells it `dine_in`,
  the repo's house style everywhere else is kebab (`SERVICES = {"dine-in",
  "takeaway"}`, and every `verifiedBy` method). There is also already a venue
  filter facet called `service` and `docs/decisions/0071-…` already uses the word
  "channel" for notification channels. Three meanings, one word.
- **30d — the `channel` dimension** `[M][schema]`. `dine_in` / `takeaway` /
  `delivery`. This is the one with a **live** debt (row 2 above) and it is not
  only commercial: in the UK the same sandwich is 20% VAT eaten in and 0% taken
  away cold, so the *tax rate* is a function of (item × channel).
- **30e — per-branch overrides** `[M][schema]`. Square's shape is the one to
  copy, including its two modes: `present_at_all_locations` **plus**
  `absent_at_location_ids` (the "everywhere except these three" form), because
  a per-branch allow-list does not scale to a 400-store chain. We have 22
  branches, so this can wait — but the shape should be decided before a chain
  with a per-branch menu arrives.
- **30f — non-dish charges** `[S][schema]`. `charges[]` at venue or menu level:
  `{kind, amount|percent, basis: per_person|per_table|per_bill, mandatory,
  refusable, disclosure}`. Needed the day a non-NZ venue lands. Italy's Lazio
  region *bans* a line labelled `coperto`, so venues charge `pane` instead —
  which is exactly why `kind` must be data, not a hard-coded word.

### Metadata, reference data, and hierarchy-vs-ontology

The owner asked this explicitly. The survey's answers, and what we already do
right:

- ✅ **Already right.** ISO 8601 with **reduced precision** (`"2019"`,
  `"2019-05"`) — ADR 0023. Two clocks, world time vs record time, never
  collapsed — this *is* bitemporality (valid time vs transaction time,
  SQL:2011), arrived at independently. Dated lifecycle events rather than a
  `closed: true` flag — which is exactly what OpenStreetMap's lifecycle prefixes
  and Wikidata's `P576` + `replaced by` achieve. IANA timezones per venue and
  per branch (ADR 0043). ISO 4217 currency (ADR 0045). BCP-47 language tags
  including `th-Latn` (ADR 0044). Provenance with a *method* (`verifiedBy`) and
  a separate clock for details (ADR 0037). **This model is in better shape than
  the ask implies.**
- 🔎 **Cuisine is our one genuine ontology weakness.** `cuisine: []` is a flat
  multi-valued list, and it mixes *origin* ("Malaysian") with *dish form*
  ("Burgers") — the identical flaw OSM documents in its own `cuisine=` key and
  is trying to replace. The fix is cheap and worth doing before the corpus
  grows: give each value an **axis** (`origin` / `dish_form` / `service`).
  Yelp's model is a **DAG, not a tree** (`parent_aliases` is a list) and is
  **country-scoped**; Overture split "cognitively basic category" from the deep
  hierarchy. `[M][schema]`
- 🚩 **The null-vs-missing problem is a safety issue here, not a style one.**
  "No peanut declared" and "declared peanut-free" are different facts and our
  schema says both with an absent tag. ADR 0025's rule ("no tag = not stated")
  is the right *convention* but it is only a convention. HL7 FHIR's
  `dataAbsentReason` vocabulary is the mature answer (`unknown`, `asked-unknown`,
  `not-asked`, `asked-declined`, `not-applicable`, `masked`). We already have a
  partial version — ADR 0041's `needs[]` — which is genuinely the same idea.
  Extending `needs` to allergens would close it. `[M][schema]`
- 🔎 **Allergen lists differ by jurisdiction and ours is NZ-shaped.** AU/NZ PEAL
  (in force 2026-02-25) requires **each tree nut named individually** — almond,
  Brazil, cashew, hazelnut, macadamia, pecan, pine nut, pistachio, walnut — and
  has **no celery and no mustard**; the EU's 14 groups nuts and adds both, plus
  a numeric sulphites threshold (>10 mg/kg); the US has 9 and added sesame in
  2023; Japan mandates buckwheat, which nobody else does. *"Contains tree nuts"
  is a legal statement in the US and an illegal one in Australia.* Implication:
  tag at the **granular substance** level and derive the jurisdiction view —
  which is what `contains-peanuts` already does. Our vocabulary is closer to
  right than it looks; what is missing is the **regime** it is being read under.
  `[M][schema]` — matters the day a non-NZ venue lands.
- 💡 **`premises` as an entity distinct from `venue`** `[M][schema]`. The
  single highest-value structural idea in the survey for the owner's
  *"historical/analytical"* ask: *"what has operated at this address since 1998"*
  is unanswerable in a venue-only model. It is the join key when one address
  churns through six tenants, and it distinguishes four relations that a single
  `formerIds` cannot: same entity moved · same entity rebranded · **different
  business, same premises** · merged/split.
- **Certification is an assertion, not a property** `[S][schema]`. Halal and
  kosher are claims by a named body with a certificate number, a **scope**
  (whole premises vs specific products) and an **expiry** — so a lapsed claim
  can auto-demote to unknown. Google's own menu enum lumps `HALAL` and `KOSHER`
  in with `VEGAN`, conflating a certified legal claim with a self-declaration.
  Don't copy that.

### The out-of-scope-for-Faves half, which the owner named

*"…outside of Faves … keeping the historical pricing data, and permanently
closed restaurants as historical/analytical/trend data."*

✅ **This is already the architecture.** ADR 0047 split the two stores exactly
here: `site/data/` is the payload, `data/` is the record kept forever, and
`tools/split_data.py --check` proves the two still reconstruct the corpus. A
price that moves appends to `data/history/prices/`; a departed dish moves whole
to `data/history/dishes/`. So the owner's "outside Faves" store **exists**.
What the survey says is missing from it, for the analysis he describes:

- **`channel` and `tax_status` on a price observation.** Delivery menus run
  15–30% above dine-in; without the flag, any price trend silently mixes them
  and the series is worthless. This is the strongest single argument for 30d.
- **Decimal-as-string for money.** Floats corrode over a multi-decade series.
- **A `corrected` event distinct from a `price_changed` event** — we already
  make this distinction in prose ("did the shop change it, or did we?"); the
  record should make it in data.
- **Monthly snapshots derived from the event stream**, so "median main price by
  month" is not a correlated as-of join every time.

### Sizing, and the one thing to do first

⚠️ **The sizing below is amended by measurement, 2026-08-16 (wt: faves-schema30).
The ADR discharging the owner's "write it now" ruling is drafted and committed.**
Its finding: this theme holds **two halves in opposite evidential states**, and
the roadmap puts them in one bucket. `menus[]` and the other *containers* are
exercised by nothing — the hold is right for them. **The pricing primitive is
exercised by 152 dish rows in 13 venues today**, all carrying a second price
inside a `desc` string, across at least six distinct context axes. So the reason
to hold 30a does not reach the pricing work, which belongs to Theme 28b and can
proceed on its own evidence.
Two further corrections to this theme's own table: **per-person pricing is
recorded above as "Not yet" and is in fact here** (`rock-yard-restaurant`, 8
rows, *"Min 2 people, $16/head"*); and a **seventh axis nobody named** — 19 rows
in 7 venues price a *dietary substitution* (`No gluten added bun +$2.50`,
`+$0.50 for oat milk`). 17 of the 19 already carry `gf-option`, which
`dietary.js` treats as satisfying the gluten-free claim, so the dish shows
correctly for a reader who needs it — only the option's **price** has nowhere to
live. Not a safety defect; an accuracy one, aimed at readers with no choice
about paying it.

The whole theme is `[XL]` and must not be attempted in one go. **30a is the
keystone** — everything else attaches to a menu entity that does not yet exist.
But the honest sequencing note is that **no venue in the corpus has two menus
today**, so 30a would ship a schema nothing exercises, which this repo has
learned to distrust.

> 🎯 **Owner decision:** do we (a) build 30a now against a venue you know has
> two menus and can supply — the shape then earns its keep immediately; or
> (b) hold 30a until such a venue arrives and meanwhile land the cheap,
> independently-useful pieces (the cuisine axis, the allergen regime field,
> `channel` on a price record in `data/`)? **Recommendation: (b) plus one
> exception** — write the ADR for 30a's *shape* now, while the survey is fresh,
> so the decision is recorded before a rushed venue forces it.

**Sources for the survey**: Square `Catalog` (`CatalogItemVariation`,
`location_overrides`, `present_at_location_ids`, `CatalogPricingRule`,
`CatalogAvailabilityPeriod`); Toast (`pricingStrategy`, `multiLocationId`,
`visibility[]`); Deliveroo Menu API (`mealtimes[]`, non-overlap rule, three-state
availability); Uber Eats (`price_info.overrides[]`, `menu_type`, `suspend_until`,
kcal *and* kJ); DoorDash (`price`/`base_price`); Oracle Simphony (Revenue
`Center`s, Menu Levels, Serving Periods, priority-ordered overlap); Lightspeed
(order profiles → price lists); Google Business Profile FoodMenus; schema.org
`Menu`/`MenuSection`/`MenuItem`/`Offer`; FoodOn and LanguaL's 14 facets; OSM
`cuisine=`, `diet:*` and lifecycle prefixes; Wikidata P576/P1366 and redirects;
Overture GERS and `taxonomy`; FSANZ PEAL, EU 1169/2011 Annex II, FASTER Act,
Natasha's Law; VITAL 4.0; HL7 FHIR `dataAbsentReason`; W3C PROV-O and DQV;
Kimball SCD type 2 and durable super-natural keys; EDTF / ISO 8601-2:2019.

---
