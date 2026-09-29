- [ ] 🎯 **Nutrition for every dish, recipe and serving — a future major
      feature** `[XL][design][data]` — owner-raised 2026-09-29 (session
      faves-ec). Direction captured; not designed, not scheduled.

  **The brief, in his words:** *"A future major feature will be Faves providing
  the nutritional information of a dish, recipe, serving etc… This is not just
  things like allergen information but micro-nutrients, calories, cholesterol
  content and anything else available. The idea extend Faves from choosing what
  you eat (ordering out or cooking at home). Ideally this information would be
  pushed to software like Apple Health but it may be stored in Faves — in the
  user's data set."*

  **What that adds to this theme.** The README above treats health as a separate
  app that reads Faves. This brief widens it in three ways:

  1. **Breadth.** Not just allergens: energy (kJ and calories), macronutrients,
     cholesterol, micronutrients, and *anything else available*. The unit is
     whatever someone eats: a dish, a recipe, a serving.
  2. **Both halves of the product.** Eating out (venue menus) and cooking at
     home (the Cook at Home collection and, later, packaged products).
  3. **Where it lands.** Preferred: pushed to a health app such as Apple Health.
     Acceptable: kept in Faves, in the **user's own data set**. That is the
     device-local, per-profile, optionally synced store that already holds
     favourites, ratings and orders. It is not the repo, so the repo's
     no-personal-data rule is not what decides this.

  **What already exists to build on**
  - `data/products/`: 87 packaged-product records read off labels, 74 with a
    nutrition panel (per 100 g and per serving). See
    [ADR 0090](../../decisions/0090-the-packaged-product-record-store.md), whose
    brief already said *"we may also use it for a future healthy food, eating
    and food diary, food planning feature(s) or a separate app"*.
  - Recipes have ingredients with quantities and a `serves` figure, and the
    scaler (½/1×/2×/3×, ADR 0076). That is enough to compute a recipe's
    per-serving figure once each ingredient maps to a nutrition source.
  - The order tally is already a record of what was chosen, which is the
    natural seed of an eating log (see the README above).
  - Theme 5's line stands: *"Don't fake restaurant nutrition"*
    ([Theme 5](../110-theme-5-richer-dish-data/README.md)).

  **🤔 Open, for the owner. Nothing here is decided.**
  - **Where the eating log lives.** The README above says a separate private
    app. This brief says it *may* live in Faves' user data. Both are workable.
    They differ in who builds the health-app link and in whether Faves grows a
    diary screen.
  - **Venue dishes without published figures.** Almost no small venue publishes
    nutrition. The choices are to show nothing, to show chain figures only
    (McDonald's and the like publish theirs), or to estimate from a recipe
    we've matched. 🚩 Today's ruling on estimate wording (ADR 0141: no "our
    estimate" on prices) was about **prices**. A nutrition figure is a health
    claim, so that ruling should not be read across without him saying so.
  - **The phone payload (ADR 0047 / 0137).** Nutrition fields in `site/data/`
    download to every phone. ADR 0137 admits a field only for a screen that
    renders it, or a future feature *the owner has ruled* will. This brief says
    the feature is coming but names no screen. Before the first nutrition field
    lands in `site/data/`, confirm whether this brief is that ruling.
  - **Nutrient scope and units.** NZ labels give energy in kJ, while "calories"
    is the everyday word. Which nutrients count as a minimum, and which are
    shown only when present?

  **🤔 Assumed, not verified this session: pushing to Apple Health.** As
  understood, Apple Health (HealthKit) has no web API, so a web app like Faves
  cannot write to it directly. Candidate routes: a small native companion or
  wrapper app; an Apple Shortcut that logs a health sample from data Faves hands
  it; or a file export. Android's Health Connect is believed to be native-only
  too. Check all of this before any design leans on it.
