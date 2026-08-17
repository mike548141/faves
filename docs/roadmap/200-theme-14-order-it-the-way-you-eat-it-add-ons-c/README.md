# Theme 14 — Order it the way you eat it: add-ons & customisation (owner-raised 2026-08-09)

**The two asks, raw (owner):** *"the ability to customise a dish e.g. no tomato
in a big breakfast"* and *"re-interpret menus to align add-ons to a dish, making
it easy to specify add-ons… 'Thick Cut Fries' at Sprig + Fern Tawa has 'Add gravy
$3.' within its description, I want that to be an add-on you specify… similarly
their brunch sides are add-ons to all the brunch dishes — I should be able to
select 'Eggs on Toast' and add-on Halloumi and add that dish to the order."*

They are one feature with two halves: **what the menu offers** (structured
add-ons, priced) and **what you ask for** (customisation, usually a removal and
usually free). Both end in the same place — an order line that says what you'll
actually say at the counter.

🎯 **Owner ruling 2026-08-17 — scope, stated once for the whole theme.** *"The
same feature should work for many scenarios. It could be sauces to put on it,
things to remove from the dish, to use a different milk in a coffee, to upsize
something, to get sides on a breakfast, to get a combo etc… essentially the
ability to customise or add to a dish."*

So this theme is **one mechanism**, not a family of similar ones, and its name
is *customise or add to a dish*. Six scenarios were named; here is where each
one stands against what is built, which is the point of writing them down:

| The scenario he named | What exists today | Gap |
|---|---|---|
| Sauces to put on it | 14a add-on groups, `select: many` + `max` | ✅ built |
| Sides on a breakfast | The same 14a shape (Sprig & Fern's brunch sides) | ✅ built, 14b has to convert the prose |
| Things to remove from the dish | 14c shipped as **free text**, not structure | ⚠️ works, but it is not the same mechanism |
| A different milk in a coffee | Nothing. A **substitution** — swap one component for another, sometimes priced | 🛑 unmodelled |
| Upsize something | Nothing here. Sizes are **Theme 28** (portions) | 🛑 two themes now claim it |
| A combo | 14f, designed not built | 🛑 unbuilt |

🚩 **Three consequences worth naming before anyone builds to this ruling, because
each one is a decision and not a task.**
- **A removal is now in scope as structure, not just as a note.** 14c shipped
  the recommended half — free text on the order line — and its notes say the
  *components* half stays unbuilt until a venue's data justifies it. This ruling
  says the reader should not be able to tell which of the six they are doing, and
  a free-text box is visibly a different act from ticking a sauce. That is a
  reason to reopen 14c's components half, not a defect in what shipped.
- **"Upsize" straddles Theme 14 and Theme 28.** 28's question is whether a
  regular and a large are one dish or two; this ruling says upsizing should feel
  like the same control as adding a sauce. Both can be true — a size can be a
  pick-one group over one dish's own variants — but somebody has to rule which
  theme owns the data shape, or the two will model it twice.
- **A substitution is not an addition.** Oat instead of dairy milk *removes* one
  component and *adds* another, and it changes the dish's allergen composition in
  both directions. 14d's `composeTags` unions allergens on the way in; a swap
  needs the way out as well, which today nothing does. This is the one scenario
  with a genuinely new safety surface.

**The prose is already there, it's just unstructured.** Verified in
`sprig-and-fern-tawa.json` 2026-08-09: `"Served with aioli. Add gravy $3."`,
`"Add chicken, halloumi, prawns or beef +$7."`, `"No gluten added bun +$2.5."`,
`"Gluten free toast +$2."` — plus a whole **brunch sides section** (Halloumi
$7 and friends) that is really an add-on group for every brunch dish, not a set
of things you'd order alone. The information is captured; only the *shape* is
wrong.

- ✅ **14a — Structured add-ons** — **shipped 2026-08-16** (ADR 0048):
  venue-level `addOnGroups`, `select: one|many` + `max`, group price default,
  required per-option `tags`. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **14d — an add-on carries its own tags** — **shipped with 14a**, as it
  insisted. Allergens union, dietary claims intersect. Detail →
  [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **14e — Order-tally knock-ons** — **shipped 2026-08-16**. Line identity is
  now `(venueId, name, selectionKey)`; the share codec deliberately did *not*
  bump. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **14c — Customise / omit — SHIPPED 2026-08-16** ([ADR 0073]) as the
  recommended half: a free-text note per order line, part of line identity.
  The **components** half stays unbuilt and is still the right answer *if* a
  venue's data ever justifies it. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
**The worked example, transcribed from the counter board (2026-08-15, in
store).** The owner photographed Wellington Kebab Grill's "EXTRAS & SAUCES —
customize your meal" card. Everything **priced** on it is already in the payload <!-- spellscan:allow: verbatim quote of the venue's own printed card, which spells it the US way — correcting it would misquote the shop -->

(the three drinks, all five extras). The one part that is not is the part with
nowhere to go — which is the whole of this theme:

- **"Choose your kebab toasted or fresh"** — pick-one, free. A 14c
  customisation with exactly two options, so the "no structured thing to remove
  from" objection does not apply; it is a choice the venue itself offers.
- **"Our delicious sauces — choose up to 3"** — multi-select, free, **capped at
  three**: Garlic yogurt · Plain yogurt · Hot chilli · Mild chilli · Tomato
  sauce · Mayonnaise · Sweet chilli · Satay · Tahini · Garlic aioli · Mint
  sauce · BBQ sauce.

Three things this one card settles that the theme had left open:
- 🚩 **A free add-on is still an add-on.** Every design note above assumed a
  price (`Add gravy $3`). Twelve sauces at no charge are the commonest kind of
  add-on there is, so `price` must be optional in the 14a shape — and a missing
  price must mean **free**, not the `priceUnknown` "we don't know" state the app
  already uses for unpriced dishes. Those two are opposite claims and must not
  collide.
- 🚩 **A cap is part of the group, not the UI.** "Up to 3" is a rule the venue
  set; it belongs in the data (`max`), or the order sheet will happily produce
  something the shop will refuse to make.
- 🚩 **Satay is the 14d case, in the flesh.** Adding satay to a kebab makes it
  contain peanuts — the single most serious allergen in the app's vocabulary,
  on a dish that carried no warning when you tapped it. This is the concrete
  proof that 14d ships *with* 14a and not after it: an add-on layer without
  allergen composition would let the app show a clean dish that the reader then
  configures into an anaphylaxis risk, silently. **No add-on UI ships before
  `dishFlagged`/`dishSatisfiesDiet` evaluate dish + selections.**

✅ **The sauce list moved into `site/data/restaurants/wellington-kebab-grill.json`
on 2026-08-16**, discharging the ⏳ above exactly as it said it would: a screen
renders add-ons now, so ADR 0047 lets the payload carry them. The paragraph
stays as the design input it was.

**Three things 14a left open, named rather than hidden.**
- ✅ **FIXED 2026-08-17 (`8e3b35c`, by the cold-review session).** The key is now
  the tag minus `-option`, so a claim resolves to its own contradiction list
  rather than to the first list that mentions it. All three faces reproduced
  before the fix and asserted after: `vg` + an option *stating* `vg` while
  carrying dairy now drops; `vg` + a dairy-only option still drops as
  `not-stated`; `vg` + a `v`-only option still survives. Tests carry the paired
  `gf` control this item asked for, and `addon_check` gained an assertion that a
  refused fourth sauce keeps the peanut warning. The account below stands as the
  finding's record.
- 🛑 **`composeTags` checks a vegan claim against the WRONG contradiction list —
  latent today, live the moment a venue writes one option.** `[S][js]` Found
  2026-08-16 while adding `vg-option`; **reproduced twice and measured, because
  the first reproduction handed to me did not reproduce.**
  `addons.js:170` maps a claim tag back to a filter key with
  `DIET_KEYS.find(k => CLAIM_TAGS.get(k).includes(tag))` — **first match wins.**
  `vg` appears in *both* `v`'s satisfies list (`["v","vg","v-option"]`) and its
  own, so `vg` resolves to key **`v`** and is checked against `CONTRADICTS.v`
  (shellfish) instead of `CONTRADICTS.vg` (dairy, egg, shellfish).
  **Measured, with the control that proves it is a real fault and not the
  intersection rule doing its job:**
  ```
  dish ["vg"]  + option tags ["vg","contains-dairy"] -> ["vg","contains-dairy"]  dropped []
  dish ["gf"]  + option tags ["gf","contains-gluten"] -> ["contains-gluten"]     dropped [gf: contradicted]
  ```
  ⇒ **A dish can carry a vegan label beside `contains-dairy`, on the app's own
  tags.** The `gf` line shows the machinery works for every other claim.
  ✅ **NOT live today: zero add-on options in the corpus claim `vg` while
  carrying a contradicting allergen** — checked all 40 groups / 155 options. It
  needs one option written as `tags: ["vg", "contains-dairy"]` to fire, which is
  an ordinary thing for an intake to write.
  ⚠️ **Note what does NOT trigger it, because this is where the first
  reproduction went wrong:** an option stating *no* claim drops `vg` correctly
  via the intersection rule (`reason: "not-stated"`). The fault only appears when
  the option **states the claim and contradicts it** — so a casual test looks
  clean. That is why this needs the paired control above in whatever test fixes
  it.
  🔗 **Do not fix it by adding `vg-option` to two satisfies lists.** ADR-adjacent
  reasoning is already in a comment at `dietary.js:34`: `vg-option` was
  deliberately put in **one** list to avoid extending this exact fault to a
  second tag. Fix the resolution, then reopen that choice.
  💡 **Adjacent, same file, reported not changed:** `vg` does not satisfy `df`,
  though a vegan dish is dairy-free by definition and both `addons.js:52` and
  `tag_allergens.py:70` already encode that fact. One definitional entailment
  (`vg ⇒ v`) is honoured and its sibling is not. Changing it moves filter results
  corpus-wide, so it is a decision rather than a fix.
- 🚩 **A group has a `max` but no `min`.** "Choose your kebab toasted or fresh"
  is not optional at the counter — you will be asked — and a pick-one group
  left unanswered produces a line the shop cannot fill without asking. That is
  the same class of defect as exceeding a cap, and `max` alone does not catch
  it. Left out of v1 deliberately to keep the shape small.
- 🚩 **A preparation-only option has to fake its tags.** "Toasted" adds no
  ingredient, but under the intersection rule an empty `tags` would strip `gf`
  off a gluten-free kebab for choosing it. The pilot data works around this by
  writing vacuously-true claims (`vg, gf, df`) on both options. It is fail-safe
  either way, but the honest fix is a group-level marker saying the group
  changes method rather than contents, so composition can skip it.
- ✅ **Converted rows existed twice; ruled and fixed the same day.** Wellington
  Kebab Grill's five `Extras` and Sprig & Fern's twelve `Brunch Sides` were
  each both an orderable dish and an add-on option. 🎯 **Owner ruled
  2026-08-16: hide the duplicated section** — given the stated cost, that a
  heart or rating saved against a hidden row stops appearing. `addOnsOnly` on
  the section (ADR 0049); the rows stay in the record so old links, hearts and
  `picks` still resolve, and `validate.py` refuses the flag unless every row it
  hides is reachable as an option. Theme 25 may retire it entirely.

**Sizing for 14b, measured 2026-08-16 rather than estimated.** Across the 48
records: **28** dish descriptions carry a priced add-on in prose, **63** carry
an unpriced choice, **17** dishes *are* add-ons wearing a dish's clothes, and
**11 sections across 9 venues** (92 rows) are add-on groups rather than things
you would order alone. Four of those venues are one pub group with near-
identical prose, so one modelling decision covers them all.
