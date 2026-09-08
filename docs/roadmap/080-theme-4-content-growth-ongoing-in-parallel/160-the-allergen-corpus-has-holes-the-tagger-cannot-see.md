- [ ] 🚩 **The allergen corpus has holes the tagger cannot see** `[M][data]`
      — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). Not a tagging *policy* question; the tagger is matching
      words the menu does not use:
      **BurgerFuel: 13 burgers carry no `contains-gluten`** while their
      "lightweight" twins do — `tag_allergens.py`'s `\bbuns?\b` cannot match
      *"Cheeseburger"*. **McDonald's: 31 of 41 items carry no `contains-*` at
      all.** **21 twin-allergen warnings** are unresolved across the corpus.
      ⇒ These are the dishes a reader with an allergy is most likely to meet,
      and the gap reads on screen as "no allergens" rather than as "not
      checked".
      **Two adjacent data faults from the same sweep:** McDonald's **41 null
      prices carry no `needs: price`**, so `needs.py` cannot see them and they
      are invisible to the worklist; and **`revisions` ships in the precached
      payload while no screen reads it** — an ADR 0047 breach, cost paid by
      every phone.

  ✅ **DELIVERED 2026-09-09 (session faves-o1)** — three of four halves are
  settled; the fourth is an owner ask, so this stays `[ ]`. ADR 0110.

  **RE-MEASURED FIRST, and the item's headline diagnosis does not survive.**

  | Claim | Re-measured | Verdict |
  |---|---|---|
  | BurgerFuel 13 burgers, cause `\bbuns?\b` | 13 untagged, **cause wrong** | ❌ |
  | McDonald's 31 of 41 with no `contains-*` | **30** of 41 | ⚠️ off by one |
  | 21 twin-allergen warnings | **21** | ✅ exact |
  | McDonald's 41 null prices, no `needs: price` | **41**, none | ✅ exact |
  | `revisions` ships unread | **18 rows, 3 recs, 479 B gz** | ✅ cost re-measured |

  🔎 **The BurgerFuel diagnosis is wrong, and one measurement dissolves it.**
  Those 13 descriptions read *"Grass fed beef, cheddar, pickles"* and never
  name a bun. Their lightweight twins carry gluten because *their*
  descriptions end *"On a smaller wholemeal bun"* — `\bbuns?\b` matching the
  standalone word, exactly as designed. No regex reaches a word the record
  does not contain. **This is a DATA gap, not a tagger gap**, and it needs a
  section note or an owner-directed read, not a rule.

  **1 · The compound-word fix — DONE (ADR 0110).** Three tokens (`burger`,
  `muffin`, `nugget`) may now carry a prefix and must still END at the token
  (`\w*burgers?`). The CLOSING boundary is never opened. `cheeseburger`
  reaches the dairy rule as a spelled-out word, because `cheese\w*` also
  spells "cheeseless".

  🛑 **Break-probed on the DANGEROUS cases, all lifted from the real corpus**
  by the new `--compounds` sweep (57 records, 3,557 strings), not invented:
  opening the *tail* would tag `eggplant`/`eggplants` (12 rows) with egg,
  `Bundaberg` (4) with gluten from `bun`, `edamame` (7) with dairy from
  `edam`, `pieces` (106), `toasted` (61), `tartare` (17), `creamy` (64);
  opening the *head* wholesale would tag `kale` ×11, `pale` ×7, `royale` ×3
  from `ale`, `buckwheat` ×5 from `wheat` and `cornflour` ×1 from `flour` —
  both gluten free, so ADR 0097's harm, not an over-warning. Six of the ten
  new breakers WIDEN a boundary the way a future session would and must be
  refused. 68/68 cases pass.

  🔑 **A fourth tail was withdrawn by the dry run, and that is the lesson.**
  `katsu` passed every false-positive check and still reached `tonkatsu` —
  all five of the corpus's are tonkatsu SAUCE — proposing three tags whose
  printed basis, "battered/crumbed coatings", was untrue of the dish. A tail
  can be clean on the word list and still make the tool lie about its reason.

  **17 tags added** (13 gluten, 4 dairy), each from the dish's own word:
  McDonald's Cheeseburger + Double Cheeseburger (gluten + dairy), Hamburger,
  Chicken McNuggets ×3, McMuffin ×5; Sprig & Fern Tawa Cheeseburger ×3
  (Mains, Kids, Gold Card — the last two confirmed by their own `df-option`);
  BurgerFuel Cheeseburger meal. Twin warnings **21 → 18**;
  `allergen_disagreements.py` **88 → 86** rows.

  **2 · McDonald's — DONE, and "not checked" IS expressible.** The record is
  **names and photographs only**: 41 items, **no `desc` on any of them**, no
  ingredients, no prices, `verified: null`. The tagger got what words allow
  (11 rows, 13 tags); nothing more is honestly reachable.
  ✅ **The model can already say "not checked" — `needs: allergens` exists**,
  with a live renderer (`Allergen details unconfirmed. Ask the venue before
  ordering.`) and a precedent: Subway carries 21. So this is **not** the
  bigger finding the brief braced for. All 41 items now carry it, plus
  `needs: price` on all 41 nulls. `needs.py` 197 → 279 gaps, McDonald's
  visible for the first time. Payload cost **+355 bytes gzipped** — the
  repeated note compresses away.

  🎯 **What a human or an owner-directed fetch would have to supply**, since
  CLAUDE.md hard-blocks harvesting this chain: ingredient or allergen data
  for Big Mac, Quarter Pounder ×2, Big Arch, McChicken, McCrispy ×3, Fries
  ×3, Hash Brown, Hotcakes, and the nine McCafé and six dessert rows.

  **3 · `needs: price` — DONE.** 41 entries, `since: 2026-09-09`. `needs.py`
  reads `item.needs[].what` directly, so they appear with no other wiring;
  `--what price` and `--venue mcdonalds` both list them.

  **4 · `revisions` — REPORTED, NOT MOVED (owner's call).** Confirmed: **zero
  readers under `site/`**. 18 rows on 3 records, re-measured at **479 bytes
  gzipped** (a record elsewhere says 582 — that figure is stale). 🚩 But it is
  not a plain ADR 0047 breach: **two roadmap themes already plan to render
  it** — `190/075 (d)` "Dish revisions on the page" and Theme 390. So this is
  the `490/030` class the owner ruled on 2026-09-08: design the render, do
  not silently move. Left exactly as found.

  **5 · The 21 twin warnings — re-measured, and 12 of the 18 remaining are
  the COMPARATOR over-firing, not corpus holes.** Three were resolved by the
  compound fix. Of the rest, **none should gain a tag**:
  - **11 Subway Salads lacking `contains-gluten` — CORRECT AS IS.** The
    Salads section note reads *"With lettuce, spinach, tomato, cucumber,
    capsicum, onion, carrot, olive."* A salad has no bread. The comparator
    matches by dish NAME across sections, and Subway sells one filling three
    ways. 🛑 "Resolving" these would put a false gluten warning on the
    gluten-free option — ADR 0097's harm, on eleven rows.
  - **Roast Beef / Wraps lacking `contains-egg` — CORRECT AS IS**, settled by
    the dish text: the wrap is dressed with honey mustard, the sub with
    mayonnaise.
  - **4 soy warnings — UNSETTLED, and not settleable here.** `contains-soy`
    on Subway is curated from that chain's allergen guide, not inferred, and
    the guide may not be fetched. 🚩 The corpus is internally inconsistent:
    Three Pepper Chicken's SALAD carries soy while its WRAP does not, though
    the salad is a strict ingredient subset of the wrap. Two Subway salads
    (Pizza Melt, Three Pepper Chicken) also carry `contains-gluten` with
    nothing in their text supporting it, where eleven siblings carry none.
  - **2 The Catch Donburi rows lacking `contains-sesame` — UNSETTLED.** Both
    have no `desc` at all. Their Mains twins say *"Served with Japanese
    salad, miso, and rice"* and the sesame plausibly rides on the salad a
    donburi does not come with.

  ✅ **BOTH OWNER ASKS BELOW WERE RULED AND DELIVERED 2026-09-09 UNDER
  `210` (ADR 0114, PR #35) — do not deliver them again.** `210` restates the
  same two questions in better form and carries the ruling, the measurements
  and the delivery note; this section is left standing as the place they were
  first found, not as work still owed. In short: the owner took **both** —
  the two false BurgerFuel tags are removed and ADR 0097's hedge widened to
  cover *"gluten friendly"*, and `alt` is read under a new `PHOTO` tier below
  `STATED`, gated on the dish carrying `needs: allergens` so the weaker
  evidence cannot land where the page claims a confirmed allergen picture.
  34 tags on 19 dishes, five of them the `contains-sesame` burgers.

  🚩 **What still keeps THIS item `[ ]` is §5 alone** — the four Subway
  `contains-soy` disagreements (curated from a guide that may not be
  fetched) and the two Catch Donburi `contains-sesame` rows. Neither is
  settleable from the corpus.

  🎯 **OWNER ASKS — ruled 2026-09-09, delivered under `210`; kept for the
  record.**
  1. **Reading `alt` would resolve 34 more tags on 19 dishes.** McDonald's
     images carry written alt text describing the food — *"melted cheese in a
     toasted English muffin"*, *"a sesame seed bun"*, *"golden crumbed
     chicken"*. The tagger reads name, desc and ingredients, never `alt`.
     Five burgers would gain `contains-sesame`, a declarable NZ allergen
     currently invisible. **Not built:** `alt` describes a PHOTOGRAPH, and
     ADR 0025's `STATED` tier means *the menu names it*, so this needs a
     tier and a ruling, not a rule. It is also self-contradiction on screen
     today — the alt text says "melted cheese" where the tag row says
     nothing, for exactly the reader who depends on text.
  2. **Two BurgerFuel rows carry a FALSE `contains-gluten`.** *"Gluten
     friendly bun"* and *"Low Carborator lettuce bun"* — the second is a
     lettuce leaf. `\bbuns?\b` matched "bun" in both names. ADR 0097's hedge
     covers "gluten free", not "gluten friendly", and its comment claims the
     corpus holds nothing else of that shape; it does. Removing a tag is
     outside the tagger's one-way rule and is a data decision, so **left as
     found**.

  **Found and left alone:** `croquette` is not a rule word, so The Ramen
  Shop's Potato croquette (crumbed, and tagged `vg`) carries no gluten —
  vocabulary, which `110/050` owns, not a boundary fault. `--compounds`
  reports **45 near-miss groups** still open for a human to rule on.
  CLAUDE.md's `test_validate.py` line says 144 mutations; it is now **147**.
