- [ ] **17a — Serves, and scaling it** `[M][schema][design]` — ⚠️ **CLAIM
  RELEASED 2026-08-16 22:59 UTC. The scaling half is SHIPPED (see the block
  above); what is left is the `serves` half and it is ~~OWNER-BLOCKED~~, not
  unclaimed work**
  🛑 **"OWNER-BLOCKED" IS WRONG AND HAS BEEN SINCE 2026-08-16 — see the note at
  the foot of this item (2026-09-09). He ruled on it; nothing is waiting on
  him.**
  🛑 **THE SCALING HALF SHIPPED WITH A HOLE, found by the owner in his own
  kitchen 2026-08-17 and closed the same day (`5403552`).** The picker was
  built into `recipe.js`; **cook mode never knew it existed**, so picking 2×
  and tapping Start cooking gave a step panel reading ¾ cup under a page
  reading 1½ cups. Nothing caught it — `quantity.js`'s 23 unit tests, the
  corpus sweep and `recipe_check`'s 7 scaler assertions were all about the
  *page*, and `cook_check`'s 75 were all about a screen opened at 1×. **Two
  correct halves, never introduced.** The scale now travels as a getter read at
  the tap; the panel, the read-aloud text and a "2× mixture" badge all carry it;
  a refused line keeps its "as written" mark there too. `cook_check` gained four
  assertions (+ a break-probe: making `shownLine` ignore the scale fails them).
  🔑 **The generalisable bit for whoever finishes the `serves` half:** a value
  chosen on one screen and consumed on another has no natural gate, because
  every test on each side passes. Ask what *else* reads it before calling a
  picker done. — `serves` is on 3 of 24 recipes and can only come from him.
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

## 🛑 THIS ITEM DESCRIBES ITSELF AS BLOCKED ON THE OWNER, AND IT IS NOT — 2026-09-09

Three phrases above say the `serves` half waits on him: **"it is OWNER-BLOCKED,
not unclaimed work"**, **"`serves` is on 3 of 24 recipes and can only come from
him"**, and **"the target-serves half waits on him"**. All three were overtaken
on **2026-08-16**, the day after the last of them was written.

**He ruled that `serves` may be ESTIMATED rather than supplied by him.**
[ADR 0064](../../decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md),
Context lines 15-16:

> **He ruled the other way on 2026-08-16: estimate them, and label them as
> estimates.** That is his call and it stands.

And he closed the door on being asked again, in terms that name this exact
request — `460/010` (36a), recording the same day's rulings:

> **The nine weak estimates → SHIP AS THEY ARE.** He declined to supply his own
> numbers, and the reasoning holds: every one is labelled an estimate and
> carries its **working** in prose, so nothing is presented as fact.
> **Do NOT re-open this by asking him per recipe.** The weak ones stay weaker,
> visibly.

🔑 **So the blocker is not that the data can only come from him — it is that he
ruled it need not.** The distinction is the whole point of this correction: as
written, this item instructs the next session to do precisely the thing the
ruling forbids.

### 📏 And the data already exists — measured 2026-09-09

`python3 tools/recipe_estimates.py --check` → **`estimates check: clean.`**,
a required CI step. `data/estimates/recipes.json` carries **`serves` for 22 of
24 recipes** (3 `stated`, 19 `estimated`, 2 deliberately null with a reason),
each estimate carrying its `servesWorking`.
⚠️ **"3 of 24" is still true of the PAYLOAD and is no longer the whole picture.**
The three are the recipes whose own text states a serving count; the other
nineteen are estimated in the repo-only record under ADR 0047 and have simply
**never been rendered** — `site/data/restaurants/cook-at-home.json` carries
`serves` on **0** of its dishes.
✅ **The "4 yields already stated in prose" figure in this item is CORRECT** —
verified as exactly four: `perfectly-pretty-hotcakes`, `li-ge-waffles`,
`queen-cakes`, `turkish-flatbread`. (Worth saying because `460/030` states the
same fact as *"two"*; this item is the accurate one.)

### 🛑 What is actually owed, and why the bracket stays `- [ ]`

Real work remains — it is just **build work, not a decision**:
1. **Render `serves` and `yield`, labelled**, which he ruled for on 2026-08-16
   (*"`serves` vs yield → SHOW BOTH, LABELLED"*, `460/010`). The estimates are
   recorded and CI-guarded; nothing shows them.
2. **The target-serves picker** — *"serve N people"* — which needed `serves` to
   exist and now has it for 22 of 24 recipes.
🎯 **NO LIVE OWNER ASK REMAINS ON THIS ITEM.** The 🎯 still standing in the body
— *"surface the 4 yields already stated in prose"* — is explicitly the piece
**anyone may take without him**, so it marks available work rather than a
question for him. It is left in place unchanged.
🚩 **Do not put `serves` to him.** If this item reaches a session sweeping the
board for owner decisions, this note is the reason to skip it.
