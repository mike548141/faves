- [ ] **14g — Extras you cannot configure until the dish is ordered** `[M][ux]`
      — **owner-raised 2026-08-17 with a design brief; the design below is
      answered and RECOMMENDED but NOT yet approved to build.** *"I should not
      be able to add extras when the dish itself is not ordered."*

**The defect, in his words.** The add-on picker renders open on every dish that
has one, whether or not the dish is in the order. So the sauces, the toasted/
fresh radio and the paid extras are all operable on a dish nobody has ordered,
and configuring them does nothing until you also press Add. The screen offers a
choice that has no subject.

**The four asks, and what each one costs.**

1. *Show that extras exist without offering the controls.* Cheap.
2. *Expand the panel once at least one of the dish is added.* Cheap, plus a
   transition to design — he asked for that thinking explicitly.
3. *Fold it away once configured, and be able to say "no extras".* Medium: the
   folded state needs a summary line worth reading.
4. *How does it handle two of the same dish with different extras?* **Already
   answered by the architecture** — see below.

🔑 **Ask 4 needs no new mechanism: `cart.js`'s `lineKey` is already
`venueId \n dishId \n selectionKey(options) \n note`.** Two of the same dish
with different extras are already two order lines with their own steppers
(ADR 0048 made a configured dish its own line; Theme 14c put the note in the
same key). What is missing is the **UI** for it: the dish row has one picker and
one stepper, so there is nowhere to show "you have two of these, configured
differently". The state table below adds that as state 3, and it is the only
part of the ask that touches identity at all.

**The proposed state machine, per dish row:**

| State | The row shows | The transition into it |
|---|---|---|
| 0 · not ordered | No live controls. A disclosure: *"12 extras available"* — tap to **read** them, nothing tickable | — |
| 1 · added (qty ≥ 1) | The picker expands in place, controls live | Height + opacity ~180ms, `prefers-reduced-motion` respected. **Focus is not moved** — a repeat-tapper must not be yanked mid-tap; scroll into view only if off-screen |
| 2 · confirmed | Folds to one summary line — *"Fresh · Garlic yogurt, BBQ · +$0"* — with **Edit**. **"No extras"** is an explicit button folding it the same way | The same animation, reversed |
| 3 · another one | The configured lines listed under the dish, each with its own ± . **"Add another"** opens a *fresh blank* picker rather than editing line 1 | New picker expands below the existing summaries |

🔎 **State 0 is read-only, not hidden, and that is the load-bearing choice.**
People decide whether to order *because* of the extras — "does it come with
satay?" is a reason to add the kebab, not a thing you ask afterwards. Hiding the
list to enforce the ordering would answer his complaint by removing information
he never asked to lose. Locking the controls while leaving the list readable
gets both halves.

🎯 **The one fork, recommendation first: keep the picker INLINE** rather than
moving it into a bottom sheet. Inline is the smaller change, adds no second
modal surface to an app that has one, and leaves most of `addon_check.mjs`
valid. A sheet would give twelve sauces more room at 390px — the honest
argument for it — at the cost of a new modal, its focus trap, and its own
check.

**Files it lands in:** `site/js/addons-ui.js` (the state machine), `cart-ui.js`
(per-line steppers under a dish), the dish render in `menu.js`, `app.css`, and
`tools/addon_check.mjs` — which will need assertions that the controls are
**inert** in state 0, that the fold survives a re-render, and that "Add another"
produces a second line rather than mutating the first.

⚠️ **What a green `addon_check` still would not tell you:** whether the fold
*feels* like progress or like the app hiding your work. That judgement is the
owner's, and it wants a real thumb on a real phone.
