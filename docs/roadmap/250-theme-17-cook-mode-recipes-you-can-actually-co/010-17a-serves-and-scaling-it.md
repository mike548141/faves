- [ ] **17a — Serves, and scaling it** `[M][schema][design]` — ⚠️ **CLAIM
  RELEASED 2026-08-16 22:59 UTC. The scaling half is SHIPPED (see the block
  above); what is left is the `serves` half and it is OWNER-BLOCKED, not
  unclaimed work** — `serves` is on 3 of 24 recipes and can only come from him.
  🎯 The one piece anyone may take without him: surface the **4 yields already
  stated in prose** (`"Makes 21"`, `"Makes 10–15"`), which invents no facts.
  Former claim (wt: faves-cook2, branch `cook-recipes-17`). Files:
  `site/data/restaurants/cook-at-home.json`, `site/js/ingredients.js`,
  `site/js/recipe.js`, `tools/recipe_check.mjs`, `docs/decisions/`.
  🔎 **Taking it in two halves, because the header's "the data is the blocker"
  is only half true.** Scaling the *ingredients* needs no owner input at all —
  a ½/1×/2× multiplier is meaningful without knowing the yield ("double the
  recipe" is a complete thought). Only *"serve N people"* needs `serves`, which
  is on 3 of 24. So the multiplier half ships now and the target-serves half
  waits on him. 🚩 **17c, 18b and 36b all ride on the quantity schema this
  lands** — coordinate with this worktree before starting any of them.
  The owner's items
  1 and 4. `serves` already exists in the schema and renders where a price
  would; the ask is to make it **load-bearing**: show it clearly, then let the
  reader pick ½ / 1× / 2× (or type a number) and rescale the ingredients.
  - **Quantities have to become data.** Today an ingredient is a **string**
    (`"1½ cups (375 ml) white sugar"`). Scaling means parsing it, or splitting
    it into `{ qty, unit, item, note }`. Recommend **structured, with the
    original string kept** — parsing NZ home-recipe prose (`"2 tbsp"`, `"200g"`,
    `"a handful"`, `"Sauce: ½ cup"`) at render time will be wrong often enough
    to be worse than useless, and a wrong quantity in a recipe is a ruined
    dinner.
  - **Rounding is the whole UX.** ⅓ of 1½ cups is not a number anyone wants to
    read. Scaled amounts need friendly fractions and sensible unit hops
    (`0.5 tbsp` → `1½ tsp`), and eggs need honest handling — half an egg is a
    real problem, so say so rather than printing "1½ eggs".
  - 🚩 **Don't auto-scale cooking times — and the owner already said so.** His
    ask was *"adjust ingredients and **where we can** the timing for each step"*;
    this records where the line falls, because "where we can" is narrower than it
    looks. Bake and cook times **do not scale linearly** — a double mixture in a
    deeper dish takes longer, but not twice as long, and for anything meat-based
    an under-scaled time is a **food-safety failure**, not a disappointing
    dinner. So: ship a *hint* ("a deeper dish will take longer — test with a
    skewer"), and let a recipe carry an explicitly authored time for a given
    scale where the owner knows it. Never a computed one.
