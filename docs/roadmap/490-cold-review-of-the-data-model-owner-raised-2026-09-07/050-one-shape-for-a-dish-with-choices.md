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
