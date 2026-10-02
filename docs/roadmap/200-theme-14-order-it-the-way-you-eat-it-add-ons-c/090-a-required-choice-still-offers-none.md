- [~] 🔎 **A required choice still offers "None"** `[S][js][schema]` — found
  2026-10-02 (`faves-77`) reviewing 14b batch two at 390 px.

  Every pick-one add-on group renders a **None** radio, checked by default
  (`addons-ui.js`, deliberately: a radio cannot be cleared, so an optional
  extra like "Add gravy $3" needs a way back out). But many converted rows
  are not optional: Satay Kingdom's Stir Fry Vegetables is "with choice of
  sweet & sour sauce, satay sauce or chef special sauce", and the picker
  offers None first. The order line then names no sauce, so the kitchen has
  to ask. (Not an allergen hole today: the dish's own chips still carry
  every option's allergens — PEANUTS shows on that dish whatever is picked.)

  Size groups already refuse None ("a plate always has a size", ADR 0130).
  The gap is that a group has no way to say *required* — the min/max
  (ADR 0048) express a cap, not an obligation.
  **Options, none chosen:** (a) a `required` flag on a group, set where the
  menu says "choice of"/"choose", rendering no None and blocking Add until
  chosen; (b) treat every `select: one` group with no `price` as required,
  which would wrongly force optional free extras; (c) leave it.
  Any of these is a schema change and wants an ADR; `addon_check` must
  assert both the required and the optional shape.

  ✅ **Owner ruled 2026-10-03 (asked by `faves-77`, via AskUserQuestion):
  option (a), a `required` flag** — set only where the menu says "choice
  of"/"choose"; a required group shows no None and Add waits for a choice;
  optional extras keep theirs. Needs an ADR, the schema line in
  `ARCHITECTURE.md`, `validate.py`, and `addon_check` asserting both shapes.
  Ready to take.

  📌 **Claimed 2026-10-03 (`faves-77`): the required flag, ADR 0156 reserved;
  worker in a worktree.**

  📌 **Built 2026-10-03 (worker for `faves-77`), PR open, not merged.**
  ADR 0156. `required: true` on a pick-one `adds` group; `validate.py`
  refuses it on `selects` and pick-many groups and refuses `false`. The
  picker drops None and pre-selects nothing; both Adds (picker and row)
  are `aria-disabled` with the reason in words until answered, and a tap
  opens the picker and focuses the first unanswered radio. `addon_check`
  block (z) asserts both shapes on real records; break-probed.
  **Flagged required (33 groups, 19 venues), each from the dish's own
  words ("choice of", "choose", "your choice"), read from the description
  or from the pre-conversion text in git history:** 1841 sundae-topping;
  burgerfuel choppers-sauce; charley-noble cheese-one; gold-lining
  benedict-choice, bowl-choice; hell-pizza rib-sauce, donut-chocolate;
  hotel-bristol, khandallah, southern-cross, the-borough-tawa
  schnitty-side; khandallah and the-borough-tawa burger-side;
  khandallah, southern-cross, the-borough-tawa rosti-benedict-choice;
  kk-malaysian noodle-type; noodle-canteen heat; rock-yard baguette-
  filling, salad-protein, rice-paper-filling, spring-roll-filling,
  vermicelli-protein; satay-kingdom stir-fry-sauce; sprig-and-fern-petone
  croquette-filling; sprig-and-fern-tawa steak-sauce, sundae-sauce;
  takeaway-at-churton combination-seafood-base; the-ramen-shop
  curry-rice-protein, kids-ramen-protein, yakisoba-protein;
  the-victoria-tavern spritz-aperitif; wellington-kebab-grill
  kebab-style (the group's name is the menu's "Choose your kebab toasted
  or fresh").
  **Left optional, for the owner to overrule:** sprig-and-fern-berhampore
  wing-sauce (name says "Your way", original wording not in git, dish is
  "Buffalo" wings); the-victoria-tavern margarita-flavour (source said
  "Flavour options", a margarita has a default) and grill-sauces (only some
  grill dishes say "topping of your choice"); gong-cha size (an `adds`
  group named Size, no compulsory wording; arguably a `selects` group
  instead); every "Add …" group (gravy, bacon, milks, naan upgrade, kids
  swirl and drink, affogato liqueur, salad protein).
  Not done: pick-many minimums (no wording asks for one).
