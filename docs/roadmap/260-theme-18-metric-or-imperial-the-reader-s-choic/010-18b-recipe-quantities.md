- [x] **18b — Recipe quantities** `[M]` — ✅ **DONE 2026-11-23** (queue run
  f9ee6733), [ADR 0170]. Originally "still blocked on 17a": **that note was stale**
  — 17a shipped 2026-08-16 (ADR 0076), and its structured parser is what
  unblocked this. Kept as written below.

  Done 2026-11-23 (queue run f9ee6733). `cooking` is the third field of
  ADR 0087's usage table (`{distance, oven, cooking}`); zero new settings. A
  US reader (and the explicit *US customary* choice, relabelled *"miles, °F,
  cups"*) sees ingredient lines in US cups, tablespoons, teaspoons, quarts,
  ounces and pounds; every other region is unchanged, **GB included** (CLDR has
  no cooking usage and its GB volume row has no cup — a judgement, put to the
  owner in the ADR). `cooking-units.js` runs **after** the 17a scaler and rounds
  once, so ½×, 2× and the people stepper compose with it; the tick key is the raw
  line, so a unit change moves no tick. Definitions: US cup 236.5882365 ml (8 US
  fl oz, not the 240 ml label cup), so a NZ 250 ml cup reads 5.7% more; spoons are
  1.4% apart and keep their words. On the corpus's 165 ingredient lines: **41
  change** (15 in cups, 22 weights, 4 in ml or litres), 68 convert to the same
  words (spoons, and one-cup lines), 54 name no measure, and **2 are marked "as
  written"** (`1–1½ cups chocolate`, and a water line with `300–400ml` mid-line)
  rather than half converted. Surfaces: the recipe page, cook mode, the
  shopping list, the list's expanded preview.

  Follow-ups, not built, each deliberately:
  - **Grams for flour and sugar** (the idea in the original note below) — the
    bigger win for a US baker, and it needs a density per ingredient, a table of
    claims nothing checks. Volume is never turned into weight here.
  - **Method prose** is not converted: 6 of the corpus's 100 steps name a measure
    ("1 cup of flour", "20cm cake tin", "4–5mm"), so a step can say `1 cup`
    beside an ingredient line reading `2⅜ cups`.
  - **Ranges** (`1–1½ cups`) are marked, not converted, as the scaler refuses them.
  - 🎯 **Owner's call**, in the ADR: GB metric for cooking (one line in
    `locale.js` if he reads British recipes otherwise), and `2⅛ cups` rather
    than a familiar `2 cups` (precision over familiarity; `MAX_ERR` and the
    ladders in `cooking-units.js`).

  Original note follows (claimed 2026-11-23-1433, session f9ee6733, worktree
  faves-qr-f9ee-units) —

  deliberately out of scope for the 18a/18c build: strings cannot be
  converted, only structured quantities can. Note the trap that makes this
  harder than it looks — **a US cup (240 ml) is not a NZ/metric cup (250 ml)**,
  and US tablespoons differ too, so "imperial" needs to mean a specific system
  and say which. Baking is also the one place where **weight beats volume**;
  offering grams for flour and sugar is arguably a bigger win than offering
  cups.

[ADR 0170]: ../../decisions/0170-recipe-quantities-are-a-third-usage-and-only-the-us-converts.md
