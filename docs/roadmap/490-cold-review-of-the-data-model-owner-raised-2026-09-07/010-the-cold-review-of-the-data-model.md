- [~] 🎯 **38a — the cold review itself** `[XL][schema][design][js][docs]`
      ⏳ **FRESH SESSION, owner-directed 2026-09-07.** Recorded now and
      deliberately not started; see this section's README for why.

  **The deliverable is a written review**, not a migration: what gets it right,
  where it will break, and what the options are — each costed against the hard
  constraints. A schema or feature change may fall out of it. **That is a
  separate decision and a separate item, and it is the owner's.**

  🛑 **THREE SUBJECTS, NOT ONE — and the first filing of this item got this
  wrong.** He asked for a review of *"the data model **and features developed
  and planned**"*:
  1. **The data model** — the shapes we store. What this item was originally
     scoped to, and roughly a third of the ask.
  2. **The features already developed.** Does what *ships today* actually handle
     this list? That is a question about `site/js/` and the screens, and it is
     answered by driving the app, not by reading the schema. Several strands
     below are already **storable and not shown** — a `served` window annotates
     but nothing surfaces "what is on right now"; per-branch hours exist and no
     screen lets you compare branches; price history accrues and is never
     rendered (`Theme 13`, ruled three times: **Faves collects it and does not
     display trends**). **A model that can express something the app never shows
     is not the same as a feature.**
  3. **The features planned** — the roadmap's own open items, read *together*
     rather than one at a time. This is the part nothing else in the process
     does. `14f` combos, `26a` saved orders, `28b` a second price, `30g` a
     delivery fee and `33b` reservations were each filed sensibly and in
     isolation; whether they compose into one coherent product is a question
     only this review asks.
  🔑 **The three are not separable in practice**, which is the argument for
  doing them in one pass rather than three items: a modelling answer that no
  screen can render is worthless, and a planned feature that the model cannot
  carry is a schema change nobody has costed.

  ## The eleven strands he named, each with what ALREADY EXISTS

  Mapped so the review starts from the tree rather than from a blank page.
  Every row here was checked on 2026-09-07; re-verify before relying on one.

  | # | His strand | What exists today |
  |---|---|---|
  | 1 | Cooking at home vs getting it from a restaurant | The **Cook at Home** collection, `recipe.js`, cook mode (ADR 0039), `quantity.js` + the ½/1×/2×/3× scaler (ADR 0076). Recipes and venues already coexist in one corpus. |
  | 2 | Ready-made food at home | 🎉 **Half-built already: `data/products/` holds 87 packaged products** (ADR 0090) with brand, pack, servings, nutrition, ingredients, allergens, origin and provenance. **Repo-only — never served, never precached.** Leftovers and household stock are genuinely new. |
  | 3 | Restaurant vs branch vs franchise | `locations[]` with per-branch hours, phone and coordinates; the branch picker (ADR 0054); `branch_check.mjs`. 🚩 **Closure is venue-level only** and per-branch closure is explicitly an open design question. |
  | 4 | Seasonal menus, menus by time of day | `served` windows exist and **annotate rather than filter** (`served_check.mjs` pins this). Theme 30 is *"a venue has menus, plural"*. Seasonality is not modelled. |
  | 5 | Configuring a dish (Subway) | ADR 0048 + `addons.js` `composeTags()` — already unions allergens, de-duplicates, records which option carried each, and *intersects* dietary claims. 🛑 `110/040`: the fish axis silently carries nothing. |
  | 6 | Combos | Filed as `200/020` (**14f**), owner-raised 2026-08-16, not started. |
  | 7 | Variants (beef vs chicken satay) | Not modelled. Adjacent: `310/010` ruled that three sizes are **three dishes**, which is a precedent a variant model must either follow or consciously break. |
  | 8 | Pricing by channel and deal | `310/020` (**28b**, 153 prose price points) · `370/010` (**30g**, a delivery price is a *service fee*, owner said *"I would consider"*) · counter-vs-delivery price already renders (`focus_check` pins which is primary). |
  | 9 | Capturing change over time | ADR 0023 (the time dimension) + ADR 0047's **two-store split**: `site/data/` is the payload, `data/` is the record. Price history and departed dishes already accrue at zero cost to the phone; `split_data.py --check` proves the two reconstruct the corpus. |
  | 10 | Venue/branch state | `lifecycle.events` + `closure` (`closed-permanently`, `closed-temporarily`, `overdue`), `closureBadge`. 🚩 **The corpus holds NO closed venue**, so this whole class ships exercised only by injected fixtures (`340/150`). |
  | 11 | Past midnight, daylight saving | ✅ **Both closed 2026-09-07.** ADR 0094 (a close before its open means the next day) and `190/030` (DST tested correct in both directions, 68 browser assertions). Residual: `190/040`, April's repeated hour understates the countdown. |

  ## 🔎 Nine more strands he did not name — the "more that I've missed"

  These come from this repo's own record, not from speculation. Each is a live
  modelling question, not a bug.

  1. **Two tag axes, and nothing holds them together.** Allergen
     (`contains-*`) and dietary (`v`/`vg`/`gf`/`df`, plus `has-meat`/`has-fish`)
     are deliberately separate (ADR 0092) and **neither may be implemented in
     terms of the other**. A model review has to say what an *option* carries,
     what a *dish* carries, and what composition means — the owner already
     ruled the direction on 2026-09-07 (`110/040`).
  2. **Claim STRENGTH has no representation.** *"Gluten free"*, *"no gluten
     added"*, *"low gluten"* and *"gluten free option available"* are four
     different promises. The corpus currently holds **two readings of one
     idea**, at `southern-cross` and `dirty-little-secret`. This is a
     vocabulary question the board has explicitly refused to settle venue by
     venue, and it is the clearest single gap.
  3. **"We do not know" has no consistent shape.** `price: null` means
     *unknown* (240 items). `hours: null` means unknown but `hours: []` asserts
     **closed** (`190/020`, filed 2026-09-07 when a venue published six days of
     seven). `picks: []` means nothing was chosen. **Absent, empty and unknown
     are three different facts and the model spells them differently in every
     field.**
  4. **Provenance and ageing.** `verified` / `verifiedBy` /
     `detailsVerified` / `detailsVerifiedBy`, and ADR 0036's trusted sources.
     `270/010`: a venue whose details are *stale* and one *never checked*
     render identically. A richer model multiplies the surfaces needing this.
  5. **Identity across change.** `dishId` (ADR 0051), `sectionId` (ADR 0058),
     `renames.js`. What happens to a **saved order** (`220/030`, 26c) or a
     price series when a dish is renamed, a size is split out, or a branch
     relocates? Variants and combos make this sharply worse — a combo
     references dishes that can move underneath it.
  6. **Every field is a download.** ADR 0047: `site/data/` is precached, so a
     field added there is fetched by every phone whether a screen reads it or
     not. **This is the constraint that decides most of the review's answers**,
     and it is the one a modelling discussion forgets first. *Before adding a
     field, name the screen that renders it.*
  7. **Local-first, no accounts.** Household stock (strand 2) is a
     substantially larger and more personal dataset than anything Faves holds
     today. Sync exists (ADR 0017: encrypted blob, bearer code, no accounts) —
     the review should say whether stock fits inside that envelope or breaks it.
  8. **Servings, quantity and yield.** `36b` (the quantity used at *this*
     step), `36c` (serving sizes — measured **not researchable** for 21 of 24
     recipes), `18b` (unit conversion needs structured quantities). Recipes,
     packaged products and restaurant dishes each mean something different by
     "a serving", and strand 2 forces them into one place.
  9. **Per-branch everything.** Strand 3 is deeper than closure: menus,
     prices, hours and *availability* can all vary by branch, and the corpus
     already carries chains where they do. The model currently allows per-branch
     **hours** and nothing else.

  ## 📥 Referred INTO this review by the owner

  - **A venue-level note has nowhere to live** (referred 2026-09-07 from
    `080/200`). Simmer prints two statements true of its whole kitchen — *"All
    of our dishes may contain allergens…"* and *"we are unable to swap one
    ingredient for another"* — and `VENUE_KEYS` has no prose slot; `note` exists
    only on a **section**. They are parked on `Breakfast`, which renders
    correctly and is the wrong home. He ruled **fold it into this review**
    rather than add a field now: *"adding a field now means designing it
    twice"*, and every field added to the payload downloads to every phone.
    🔑 It is a good probe for the review as a whole — a one-field question whose
    honest answer needs the store split, the precache budget and the render
    surface all considered at once.

  ## 🛑 The constraints any answer must survive

  Not preferences — they are in `CLAUDE.md` as hard constraints, and a proposal
  that quietly breaks one is not a proposal.
  **Zero build step** (no bundler, no npm at runtime) · **offline capable**
  (the whole app must work in flight mode after first visit) · **precache
  budget** (first visit under 300 KB excluding photos) · **no personal data**
  beyond the two owner-approved exceptions · **the app ships only what it
  renders** (ADR 0047) · **menu content is owner-supplied or owner-directed**,
  never harvested on a hunch.

  ## What the review should produce

  0. **A map of the FEATURES as they are** — what each screen actually does
     with this data today, and specifically **what the model can express that
     no screen shows**. Cheapest way in, and it is the half the first filing
     omitted.
  1. A **map of the model as it is** — entities, the fields that carry state,
     and where each concept lives across the two stores.
  2. For each strand: **does the current model express it, express it badly, or
     not at all?** With the evidence, and with refutations reported first.
  3. The **collisions** — where two strands want incompatible things. Variants
     against ADR 0051's "three sizes are three dishes"; combos against saved
     orders; household stock against the precache budget.
  4. **Options with costs**, offered and not recommended where the choice is
     the owner's, and a recommendation where it is an engineering call.
  5. An explicit list of **what NOT to change**, because the most likely
     failure of a review this wide is a redesign nobody asked for.

  🚩 **A review is not a licence.** Nothing here changes the schema, and the
  board's own rule stands: a house-level question goes up rather than being
  settled locally.
