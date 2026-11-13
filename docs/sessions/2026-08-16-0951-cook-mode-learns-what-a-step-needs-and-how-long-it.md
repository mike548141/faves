## 2026-08-16 09:51 UTC — cook mode learns what a step needs, and how long it waits

Seven owner items in one run, fed in while the work was in flight. Four shipped,
three are blocked on facts nobody has yet. Worked in `wt: faves-cook` after a
peer session found my earlier changes staged in the shared checkout.

### What shipped

The **cook affordance** was *"terribly ugly… giant, and poorly placed"* — a
full-bleed 52px accent bar carrying a 🍳 that fell back to a magnifier glyph on
the owner's own machine. It is a plain `.btn` now, sized to its words: accent on
the recipe page, quiet in the list, and leading the expanded recipe instead of
trailing the method. Relabelled **Start cooking** — the old text named a mode the
app has rather than the thing the person is about to do.

The **Ingredients toggle is gone**, replaced by the owner's better idea: the step
shows the lines it actually names, with quantities, so the instruction can stay
short. Two precision bugs were caught by tests rather than by reading:
- a head word shared by two ingredients cannot tell them apart, so "beat the
  white sugar" dragged in the sauce's brown sugar. Fixed by an **ambiguity
  rule** — a single word shared by two lines is usable only inside its full
  phrase;
- the corpus writes ingredients plural and instructions singular, so "3 eggs,
  separated" missed "beat the egg whites" and "4 prune plums" missed "over the
  plum wedges". Fixed by stemming **both sides** with the same crude rule.

Audited over all 118 steps of all 23 recipes with a method, by eye, before
wiring: 41 steps show nothing, and every one of them genuinely names no
ingredient.

**Per-step timers** read the duration out of the step and never invent one. 28
of 118 steps state a time. Temperatures, tin sizes, "(makes 21)" and "overnight"
are all refused, and a range times its **lower** bound — come back early and
look, rather than at the point it may already be too late. The countdown stores
the wall clock it ends at rather than decrementing, so a phone that sleeps
mid-bake comes back correct instead of minutes slow.

The **recipe page's back link** was a lone pill outside any `.wrap`, aligned to
the window edge while the recipe sat in the centre column. It now uses the same
`.menu-topbar` as the menu pages — which closed a hole nobody had filed: the
page showed CONTAINS GLUTEN chips with **no route to the Settings that decide
which allergens are flagged**, and no Favourites, Share or About either.

### What the check caught that review did not

`cook_check` failed on the new Reset button: hiding the element that has focus
drops focus to `<body>`, outside the dialog, where the keydown listener never
sees it — so every keyboard shortcut went dead. That is the **same defect the
owner ruled on for the Back button on 2026-08-15**, reintroduced within a day by
a different control learning to hide itself. The rule is now written at both
sites: hand focus on *before* hiding, never after. The check was rewritten
against the new contract and drives its assertions off the recipe data rather
than off step numbers, so editing the corpus cannot quietly turn an assertion
into a different one.

### The three that are blocked, and were not guessed

The owner asked for per-step and total times, and for researched serving sizes.
Measured rather than assumed: **28 of 118 steps** state a duration, **9 of 24**
recipes carry a total, **3 of 24** carry a serving count. Sum-of-stated-steps is
not a total — Hotcakes state 5 minutes against a `time` of "~50 min", because
prep is untimed — so publishing the sum would understate most recipes by most of
their length. And serving sizes for "Booth's Ginger Crunch" or "Shane's Ribs"
are not researchable at all: they are family recipes, and a count lifted from a
published cookbook would be a claim about a different recipe. All three are
Theme 36a/36b/36c with the numbers attached and the ask put to the owner.

Same for the quantity-per-step he described ("1 of the 2 cups"): nothing in the
data ties an ingredient line to a step. Worth noting the corpus is already
reaching for the structure by hand — `"Sauce: ¼ cup cocoa"` and the
`Topping:`/`Batter:` prefixes are per-step grouping invented by whoever typed it
in. That is the argument for the schema change, and it is in 36b.

### The holistic answer he asked for

Cook at Home is a venue file carrying `address: null`, `phone: null`,
`hours: null`, `currency: "NZD"` on something with no prices, and `area: "Home"`
— a suburb invented so the filters would not choke. Then `kind === "recipes"` is
special-cased in about twenty places to take it all back off. That is the seam
he can feel: every recipe screen starts from "restaurant" and reasons its way to
"not that", and the leftovers were the order-style button, the menu-page back
link, and a ⋯ menu nobody added because a recipe was never treated as a
destination. Theme 36 states the three ways out and recommends the cheap one —
declare a capability set per `kind`, so a screen asks "does this have hours?"
instead of "is this a recipe?".

### Concurrency

`main` moved five times during this session; the push took a rebase loop and two
`sw.js` conflicts. `SHELL_VERSION` was taken as **`.60`**, deliberately above
`origin/main`'s `.57` rather than `+1` — the read-and-add-one habit is what has
cost this repo three lost bumps, and a peer session had explicitly asked for
numbers to be claimed out loud.

---

