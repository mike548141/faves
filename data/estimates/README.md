# `data/estimates/` — estimated times and serving sizes, with their workings

Nothing here is served, precached, or read by anything under `site/`. It is the
**record** half of the two stores (ADR 0047): the numbers and the reasoning that
produced them land here first, so they are auditable before any of them reach a
phone.

One file today: `recipes.json`, covering the 24 recipes in
`site/data/restaurants/cook-at-home.json`, keyed by `dishId`.

## Why it exists

The owner ruled on 2026-08-16 (ROADMAP 36a and 36c): **estimate the per-step and
total times, and the serving sizes, and label them as estimates.** That reverses
what those two roadmap items argued for, and it is his call.

What the ruling does *not* do is make an estimate the same kind of thing as a
number the recipe states. So every value here carries three things: the number,
where it came from, and the working that produced it.

| Field | Means |
|---|---|
| `serves` | people served — our estimate unless `servesSource` is `stated` |
| `yield` | what the recipe *makes* (21 cakes, 1 flatbread) — **not** `serves` |
| `timeTotal` | minutes, elapsed from starting to serving |
| `steps[].minutes` | minutes that step takes |
| `*Source` | `stated` (the recipe says it) or `estimated` (we worked it out) |
| `*Working` | the reasoning, naming the numbers it used |

`null` is a legitimate answer, and three steps, two totals and two serving
counts use it. A null with a reason beats a number with none: the ruling was
"estimate them", not "leave no field empty".

## 🛑 The timer rule — every duration times, and an estimate says so

**Owner ruling, 2026-08-16 (ADR 0066):** *"Estimates drive timers too, clearly
marked — every step gets a countdown; estimated ones are labelled as estimates
on the timer face."* That supersedes ADR 0064's timer clause in part; the rest
of 0064 stands. The food-safety argument against it was put to him before he
decided and overruled — recorded in 0066, and not re-argued here.

So every step with a `minutes` value is timer-eligible, and the field that
matters to a renderer is `source`. **A `minutes` with no `source` is the state
that is now dangerous**: the countdown would run with no way to tell the cook
whether the number was read or worked out. `python3
tools/recipe_estimates.py --check` exits 1 on it and prints it above every other
failure.

`timerSafe` is gone. Under the ruling it would have been `true` on all 115 steps
that carry a number, and a field with one value tells a renderer nothing.

Every step still carries a `phase`, which no longer gates anything but still
says what kind of step is being timed:

- **`prep`** — no heat on the food. Mixing, shaping, and heating an empty oven
  or an empty pan. 53 steps.
- **`cook`** — the food is in the heat. 53 steps, 31 of them with an estimated
  duration.
- **`wait`** — chilling, rising, resting, marinating, cooling. 12 steps.

## How the numbers were derived

**Stated values are read, never typed.** `tools/recipe_estimates.py` parses the
recipe text and `--check` rejects any `stated` value the text does not support —
and any `estimated` step whose text *does* state a time. The authoring pass used
the same parser, so the record and its check cannot disagree about what the
recipe says.

- **A range takes its lower bound** — "bake 5–8 minutes" is recorded as 5,
  matching `stepDuration()` in `cook.js`: the timer exists to bring you back to
  the oven, and coming back early to look is right while coming back at 8 may
  already be too late.
- **A step stating two durations sums them** ("12 minutes, then a further 5–8"
  is 17), because `minutes` is how long the *step* takes. `cook.js` deliberately
  times only the first leg, which is a different question and still correct.
- **Words count as stated.** "Cook the garlic for a minute" is the recipe
  stating a time. Four steps state one in words rather than digits, which is why
  this record counts **32** stated steps where ROADMAP 36a counted 28 — the
  roadmap's figure is the digits-only count, i.e. the steps `cook.js` can time.
- **Serving sizes come from tin size, batter volume or stated yield**: a 20cm
  tin cuts 8, a 23cm pie cuts 8, 200g of dried rice noodles is 4 mains. The
  working names the numbers every time.
- **`yield` is not `serves`.** "Makes 21" is 21 queen cakes, not 21 people. The
  payload already conflates the two — Liège Waffles' `serves: 12` is 12 waffles,
  while the puddings' `serves: 6` is 6 people — so the yield is recorded
  separately rather than being quietly resolved one way. 🎯 **Which one the app
  should show is the owner's call**, and it is not made here.
- **Prep that runs underneath a bake is not added twice.** Where the oven
  preheats while the batter is mixed, the working says so and the total counts
  it once.

## The honest limitations

1. **These are one assistant's estimates from recipe text, not times measured by
   cooking the food.** Nobody creamed the butter with a stopwatch.
2. **The family recipes have no published source to check against.** Booth's
   Ginger Crunch, Shane's Ribs, B's Dope-As Brownie, Jesse's Garlic Chicken
   Thighs and the Famous Brade Green Chicken Curry are the owner's, and a
   serving count borrowed from someone else's published recipe would be a claim
   about *that* recipe, not this one.
3. **Several rest on one number.** Where the protein is unquantified ("Chicken",
   "Pork ribs", "Mussels") the serving estimate rests on the sauce volume alone.
   Each of those says "Weak:" in its own working.
4. **They must render labelled as estimates, never bare.** A bare "Serves 8"
   claims the recipe says so. It does not.
5. **Booth's Ginger Crunch has no method at all** — `steps` is empty — so it has
   no total and no step estimates. Only the owner can close that.

## The record covers recipes the app may not ship

The owner ruled on 2026-08-16 (Theme 11e) that family-attributed recipes go
private by default, so five of these 24 — Booth's Ginger Crunch, B's Dope-As
Brownie, Shane's Ribs, Jesse's Garlic Chicken Thighs and the Famous Brade Green
Chicken Curry — are due to leave `site/data/`. **Their estimates stay here.**
The record keeps everything forever (ADR 0047), which is exactly why the
derivation landed here before it landed on a phone.

So `--check` treats the two directions differently, and deliberately:

- **Recorded here, not in the payload → a warning, exit 0.** It names the count
  and the ids. A gate that failed on the privacy split would be firing on the
  *correct* change, and a check nobody can keep green is a check nobody reads.
- **In the payload, no estimate here → a failure, exit 1.** That direction
  catches the thing that actually goes wrong: a new or renamed recipe slipping
  in with no working recorded for it.

## The check, and the four paths it was proved against

A check nobody has watched fail is decoration. `--check` was deliberately
broken four ways on 2026-08-16. What each printed:

**1. The privacy split simulated** — the five family recipes removed from
`cook-at-home.json`. Exit **0**:

> ⚠️ 5 recipe(s) no longer in the shipped payload; estimates retained in the
> record: b-s-dope-as-brownie, booth-s-ginger-crunch, … · estimates check:
> clean. 1 warning(s), which do not fail.

**2. A wrong `dishId`** — `mussels` renamed to `mussels-and-fries` in this
file. Exit **1**, caught from the other direction, with the warning beside it:

> mussels: in cook-at-home.json with no estimate recorded

**3. A step-count mismatch** — one step dropped from `tiramisu`. Exit **1**:

> tiramisu: 7 step estimate(s) against 8 recipe step(s) — the recipe changed
> under the record

**4. The safety invariant breached** — the `source` deleted from the curry's
estimated 20-minute simmer. Exit **1**:

> 🛑 SAFETY: famous-brade-green-chicken-curry step 5 has minutes 20 but source
> None, not one of ['estimated', 'stated'] — its countdown would run with no way
> to mark it an estimate (see this tool's header)

Path 4 previously read `timerSafe: true` on the same step, under ADR 0064's
rule. The rule changed with the 2026-08-16 ruling (ADR 0066); the break was
re-run against the invariant that replaced it, rather than left standing as a
description of a check that no longer exists.

Failures all exit 1 and are told apart by their message; the safety one sorts to
the top of the output so it cannot be buried in structural noise.

## Render spec — for the follow-on pass, deliberately not built here

Nothing under `site/` changed in this pass, so no `sw.js` bump was owed. The
pass that renders these numbers owes both: fields under `site/data/` bump
`DATA_VERSION`, and touching `menu.js` or `cook-ui.js` bumps `SHELL_VERSION`.

### Ship now: `serves` and the recipe total

Four fields per recipe in `site/data/restaurants/cook-at-home.json`. Each names
the screen that renders it, which is the ADR 0047 test:

- **`serves` (number)** — already in the schema and already rendered, in two
  places: the recipe meta chip in `menu.js` (line 919, `Serves ${item.serves}`)
  and the recipe page header in `recipe.js` (line 111). Nineteen recipes gain
  it; BBQ Prawns and Caramel Banana stay without one. ✅
- **`time` (string)** — the same two render sites, joined into the same meta
  line. Thirteen recipes gain it, formatted like the nine already there
  ("~45 min"). Chicken Noodle Soup and Ginger Crunch stay without one. ✅
- **`servesEstimated`, `timeEstimated` (boolean)** — the same two render sites.
  They pick the wording below, and nothing else reads them. ✅

Only for recipes still in the payload after the privacy split, of course: the
record here is the source, but the fields land on the recipes that ship.

**Label wording.** A stated value renders exactly as it does today. An estimated
one renders with the qualifier in **text**, never in colour or a tooltip alone:

- stated: `Serves 6 · ~35 min`
- estimated: `Serves about 8 (estimate) · about 45 min (estimate)`
- mixed: `Serves 12 · about 1 hr 30 (estimate)`

One "(estimate)" per chip reads better than one per line, and it must survive
being read aloud — so it is a real word in the DOM, inside the same element as
the number it qualifies.

### Hold: per-step minutes, until 36b

The 118 step estimates stay in this record for now. `steps` is currently an
array of **strings**, so shipping per-step minutes today means a parallel array
indexed by position — which is exactly the fragility `dishId` was introduced to
kill (ADR 0051): reorder one step and every number moves to the wrong sentence.

ROADMAP 36b already plans to turn `steps` into objects carrying per-step
ingredient quantities. Per-step times should ride that change, as
`{ minutes, estimated }` on the step object.

**Then every step with a number gets a countdown** (ADR 0066), and `cook-ui.js`
renders:

- `minutes` present, `source: "stated"` → the number and a one-tap timer, as
  today.
- `minutes` present, `source: "estimated"` → the number marked "(estimate)" in
  the step text **and the same one-tap timer**. It is no longer text-only.
- `minutes: null` → nothing rendered, no timer. Three steps.

🛑 **The timer face must carry the marker itself.** A running countdown that
looks identical whether its number was read off the recipe or worked out by an
assistant does not satisfy "clearly marked": the cook watching the clock is not
reading the paragraph above it. So the estimate marker appears **on the timer**,
not only in the step text beside it, and it is real text in the DOM — inside or
labelled onto the element showing the remaining time — so it survives being read
aloud and is not carried by colour alone.

- stated: `12:00`
- estimated: `12:00 (estimate)`

`stepDuration()` in `cook.js` reads the recipe text today, so it finds the 32
stated steps and none of the estimated ones. Making every step timer-eligible
means the per-step `minutes` has to reach the payload first; the timer must then
read the shipped number rather than re-parsing the sentence, or the estimated
steps stay silently untimed with everything looking correct.

`phase` is the remaining field a renderer may want — it says whether the step is
`prep`, `cook` or `wait` — but nothing gates on it.
