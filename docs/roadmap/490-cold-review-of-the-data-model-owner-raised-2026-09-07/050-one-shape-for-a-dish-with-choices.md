- [ ] 🎯 **One shape for "a dish with choices" — variants, sizes, proteins and
      pick-a-kebab combos are modelled four ways** `[L][schema][design]` — Theme
      38 review (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §6 C1,
      C2, §7 D2). Owner's decision on the shape; a recommendation is given.

  ⏳ **OWNER LEANING, NOT YET A RULING (2026-09-08).** Asked to choose, he said:
  *"I'm not sure - I'm leaning toward your recommendation"* — which is option
  (a), one group type that either **adds** to the plate or **selects** a
  variant.
  🛑 **Recorded as a lean on purpose, and it must not harden into a ruling by
  being repeated.** This repo has three recorded instances of a record ending up
  stronger than the thing it describes, always in the same direction. *"Leaning
  toward"* is not *"do it"*, and this item is `[L]` and touches the shape four
  accepted records already disagree about — the cost of guessing his intent
  wrong here is a schema migration, not an edit.
  🎯 **What would turn the lean into a decision**, and it is a fair thing to
  bring him: the sub-question the recommendation itself flagged as his —
  **whether a size or a protein is ever "one dish"** for hearts, ratings and
  links. Under (a) the id belongs to the base dish and the choice lives on the
  order line, which is the *opposite* of `310/010` (28a)'s premise that a size
  is a dish. He cannot settle (a) without settling that, and it is a question
  about what a reader thinks they are saving, not about data.


  **Measured at `de6d2b7`.** The owner's own example, beef or chicken satay, is in
  the corpus four ways, each under an accepted record:
  1. **Two rows** — ADR 0089: *"Nasi Lemak split into chicken ($21) and beef ($23)
     … follows the record's own precedent — it already splits Kung Po that way"*.
  2. **A pick-one add-on group** — ADR 0048 §1: *"The Garden Salad's 'chicken,
     halloumi, prawns or beef' is a pick-one"*.
  3. **A size ladder in prose** — `tools/find_addons.py`: Theme 28b owns **363**
     rows; `abrakebabra` (transcribed 2026-09-07) added 14 more `Regular $x /
     large $y` ladders as prose, because intake has no rule to follow.
  4. **Sizes as add-on options** — ADR 0092 *Rejected*: Gong Cha's
     `Regular`/`Large` *"carry no ingredient and can never make a drink unsafe,
     yet they degrade every claim"* under the intersect rule; *"it needs a notion
     of a group that selects a variant rather than adds to the plate … belongs on
     the board"*. Nothing was filed.

  **Three themes claim it.** `310/010` (28a) says a size is a dish and wants an
  optional link between ids. Theme 14's ruling of 2026-08-17 says upsizing is the
  same control as a sauce and *"the reader should not be able to tell which of the
  six they are doing"*. Theme 14's README admits *"somebody has to rule which
  theme owns the data shape, or the two will model it twice."* `200/020` (14f)
  proposes a combo entity while the same ruling calls a combo a configuration;
  ADR 0048 §5 (accepted, never superseded) says *"14f inherits the same
  constraint"* that options are standalone records; and `cart.js`'s line key
  holds exactly one `dishId`.

  📋 **Options.**
  - **(a) A `kind` on an add-on group** (`adds` | `selects`). A `selects` group is
    a variant chooser: exempt from the intersect-degrade rule (it adds nothing),
    its choice already part of the order line's identity as options are, its
    price a delta or an absolute. Sizes, proteins and pick-a-kebab combos fit;
    the picker, the warning line and the order line exist; 0089's two-row shape
    becomes the exception for genuinely different compositions (the Kids
    cheeseburger). Needs a written intake rule for *when a choice is a `selects`
    group and when it is two dishes*.
  - **(b) An inter-dish link for sizes (28a) plus a combo entity (14f).** Two new
    shapes, two renders, and the reader can tell which they are using — the one
    outcome the 2026-08-17 ruling forbids.
  - **(c) `menus[]` and price-as-context** per ADR 0080. The industry's answer,
    held by ADR 0080 D4 until a venue exercises the container.

  🎯 **Recommendation: (a)**, as an engineering reading of his own ruling. What
  stays his: whether a size or a protein is ever "one dish" for hearts, ratings
  and links — because under (a) the id belongs to the base dish and the choice
  lives on the line, which is the opposite of 28a's premise.

  ---

  ✅ **OWNER RULED 2026-09-09 (session faves-p1) — ONE DISH, THE CHOICE MADE
  AT ORDER TIME.** Put to him in the reader's terms: *if someone hearts
  "Large Butter Chicken", have they hearted a dish or a size?* His answer is
  the dish. Not "separate dishes, as today", and not "let the venue's own
  presentation decide".

  📋 **What that settles, and it settles more than this item.**
  - A **size** and a **protein** become a CHOICE on one dish, the shape
    add-ons already use. The **id belongs to the base dish**; the choice
    lives on the order line.
  - 🛑 **This is the opposite of `310/010` (28a)'s premise**, which reads
    *"nothing to do about one dish or three: they are three dishes"*. That
    item is now overtaken by a later ruling and must say so rather than
    stand as a contrary decision — the sibling-item trap this board has hit
    before. It is NOT closed by this note; it needs re-stating against the
    ruling.
  - `200/020` (14f, combos) and the intake rule for future size ladders both
    inherit the answer.

  🚩 **Sized as an engineering job before anything is promised: this is `[L]`
  and it is a corpus migration, not a schema tweak.** Measured 2026-09-09 by
  the ask that produced the ruling: **348 size-ladder rows** across the corpus
  (`find_addons.py`), plus **665 prose offers over 36 venues**. Hearts,
  ratings, saved orders and price history all currently join to the row that
  is about to stop being a dish, so each is a separate migration question —
  ADR 0099 made history join by dish **id**, which is exactly the id that
  moves. Nothing here should start as one piece of work.
  🎯 **Owed before build: a decomposition into parts**, and a statement of
  what happens to an existing heart on "Large Butter Chicken" the day the
  shape changes. Do not migrate data until that is written down.

  ---

  ✅ **DECOMPOSED 2026-09-09 (session faves-p1-sizes-plan). Written down, not
  started** — this item stays `- [ ]`, and no byte of `site/data/`, `data/` or
  `site/js/` moved. The eleven parts are `28h`–`28r` in
  [Theme 28](../310-theme-28-one-dish-or-three-sizes-portions-and/), which is
  the theme that owns the shape:

  | part | what | effort |
  |---|---|---|
  | `310/050` **28h** | the variant enumerator — nothing else can be sized without it | `[M]` |
  | `310/060` **28i** | 🎯 a `selects` option must be able to **add** a dietary claim, and ADR 0048 forbids it | `[design]` |
  | `310/070` **28j** | 🎯 what happens to an existing heart | `[design]` |
  | `310/080` **28k** | `kind: selects` in the schema, no data migrated | `[M]` |
  | `310/090` **28l** | the absorption mechanics and the gate, before any row moves | `[M]` |
  | `310/100` **28m** | render a `selects` group | `[M]` |
  | `310/110` **28n** | convert the 336 prose ladders — additive, no id moves | `[L]` |
  | `310/120` **28o** | merge the 63 mechanical split-row ladders | `[L]` |
  | `310/130` **28p** | the 70 that need a human, one at a time | `[L]` |
  | `310/140` **28q** | an add-on option has no id, and this makes it expensive | `[M]` |
  | `310/150` **28r** | the intake rule, written down | `[S]` |

  🛑 **Two corrections to this item's own sizing, both measured at `e50c0ee`
  and both material.**
  1. **"348 size-ladder rows" does not reproduce.** `find_addons.py --quiet`
     reports **336 `size-ladder` offers on 187 distinct dish rows across 11
     venues**; **363** is the tool's own *Theme 28b ownership total*
     (336 + `diet-substitution-price` 16 + `per-head` 11), which is why the
     earlier draft's 363 was right for the wrong reading. No combination of
     the tool's twelve class tallies sums to 348 (checked over all 4,095
     subsets). *"665 prose offers over 36 venues"* reproduces exactly.
  2. **🔑 The sentence *"hearts, ratings, saved orders and price history all
     currently join to the row that is about to stop being a dish"* is FALSE
     of those 336 rows and TRUE of a different population this item never
     counted.** A prose ladder is **one row with one `dishId`** — converting
     it retires nothing. The rows whose ids actually disappear are the ones
     **already split into separate dishes**, and no tool in the repo counts
     them: **133 groups / 381 rows / 21 venues / 248 `dishId`s surrendered**
     (78 protein, 47 size, 8 size × protein). Of those, 57 price-history rows
     and 3 image-provenance rows already join in, and 7 of the corpus's 40
     `picks` name a ladder row. So the migration is **smaller than feared in
     the half this item measured and larger than described in the half it did
     not** — and the split is what makes it decomposable at all: `28n` is
     additive and safe, `28o`/`28p` are the real migration.
