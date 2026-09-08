- [ ] **36c — serving sizes** `[M][data]` ⚠️ ~~🎯 **not researchable**~~
      🛑 **OVERRULED 2026-08-16 — everything below this line is the SUPERSEDED
      recommendation, kept for the record. Read the note at the foot first.**

The owner asked me to research estimated serving sizes. **21 of 24 recipes have
none, and for most of them no source exists**: "Booth's Ginger Crunch",
"Shane's Ribs", "B's Dope-As Brownie", "Jesse's Garlic Chicken Thighs" and
"Famous Brade Green Chicken Curry" are family recipes. A few are adaptations of
published ones (the Edmonds cookbook is credited on the pudding), but a serving
count taken from a published recipe is a claim about *that* recipe, not this
variant of it — and this dataset is public.

What *is* honest, and is the recommendation:
- **Two are already stated in the data and simply not read**: Queen Cakes' step
  says "(makes 21)", and the pudding's "1.5–2L ovenproof dish" bounds it.
  Surface a yield where the text already carries one — no new facts.
- **Everything else comes from the owner.** He has cooked them.
- If he wants estimates rather than facts, they can be derived from tin size and
  batter volume and **shown as estimates** — but that is a labelling decision he
  should take deliberately, not one to slip into a public dataset.

## 🛑 THIS ITEM WAS OVERRULED ON 2026-08-16 AND HAS BEEN DELIVERED SINCE — noted 2026-09-09

**He took the last bullet and rejected the first two.**
[ADR 0064](../../decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md)
records it in its own Context, lines 15-16:

> **He ruled the other way on 2026-08-16: estimate them, and label them as
> estimates.** That is his call and it stands.

So *"everything else comes from the owner"* is **not** the standing position,
and *"not researchable"* in the title is his overruled premise, not a finding.
The labelling decision the third bullet said he should take deliberately —
**he took it**, and ADR 0064 is what executing it well looks like.

### 📏 What the record actually holds now, measured 2026-09-09

`python3 tools/recipe_estimates.py --check` → **`estimates check: clean.`**
It has been a required CI step since 2026-09-08, so this is enforced rather
than remembered. Counted from `data/estimates/recipes.json` at this commit:

| | Count |
|---|---|
| Recipes carried | **24 of 24** |
| `serves` present | **22** — 3 `stated`, 19 `estimated` |
| `serves` deliberately null | **2** (`bbq-prawns`, `caramel-banana`) |
| `yield` `stated` | **4** |
| `yield` `estimated` | 3 |
| Steps carried | **118 of 118** |
| Steps with a minutes figure | **115** (3 null with a stated reason) |
| `timeTotal` present | 22 of 24 |

⚠️ **Two figures above correct this item's own text, and one corrects a
plausible misreading of the number.**
- The item says **"Two are already stated in the data and simply not read"**
  (Queen Cakes' *"makes 21"* and the pudding's *"1.5–2L dish"*). The record
  carries **four** `stated` yields: `perfectly-pretty-hotcakes` (10–15
  hotcakes), `li-ge-waffles` (12 waffles), `queen-cakes` (21 cakes) and
  `turkish-flatbread` (1 large flatbread). The pudding is not among them — its
  `stated` value is a **`serves`**, not a yield, and `yield` and `serves` are
  explicitly different fields in the file's own `fields` block.
- **"24/24" and "118/118" mean CARRIED, not NUMBERED.** Every recipe and every
  step has a record; 2 recipes carry a null `serves` and 3 steps a null
  `minutes`, each with a reason, because ADR 0064's whole point is that a null
  with a reason beats an invented number. Read as *"every step has a time"* it
  would be wrong, and dangerous in the one direction that matters — a
  fabricated cooking duration is a food-safety failure, which is why ADR 0064
  §2 forbids an estimated duration from driving a timer at all.

### 🛑 Why the bracket stays `- [ ]` — the research is done, the RENDER is not

Checked rather than assumed: `data/estimates/` is the repo-only record under
ADR 0047, and **no dish in `site/data/restaurants/cook-at-home.json` carries a
`serves` or a `yield`** — 0 of them. `menu.js:1311` has a slot waiting
(*"The price slot doubles as a recipe meta chip (serves · time)"*), and ADR 0066
says in as many words that *"the render pass is still owed"*. So a reader of a
recipe still cannot see how many it serves.
✅ **NO OWNER DECISION REMAINS HERE.** The 🎯 on the title line is retired: he
ruled the labelling question on 2026-08-16 and ADR 0064 is accepted. What is
left is a `[S]` render pass over data that already exists and is already
CI-guarded — not a question for him.
