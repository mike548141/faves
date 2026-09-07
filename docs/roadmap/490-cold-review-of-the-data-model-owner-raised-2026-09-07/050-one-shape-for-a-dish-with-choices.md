- [ ] 🎯 **One shape for "a dish with choices" — variants, sizes, proteins and
      pick-a-kebab combos are modelled four ways** `[L][schema][design]` — Theme
      38 review (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §6 C1,
      C2, §7 D2). Owner's decision on the shape; a recommendation is given.

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
