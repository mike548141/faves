- [~] 🔎 **The picker says one clause twice when an allergen both warns AND
      kills a claim** `[S][ux][js]` — 🔒 **CLAIMED 2026-09-07 (session
      faves-picker).** Found 2026-09-07 (wt:
      faves-addon-allergens) while verifying `110/040`, **measured in a real
      browser**, and **pre-dates that work entirely** — it is true with no fish
      anywhere near it.

  **Verbatim, from headless Chrome on the shipped corpus.** Sprig & Fern Tawa's
  **Garden Salad** (`vg`), `contains-dairy` ticked in Settings' avoid list,
  ticking **Halloumi** (`contains-dairy`):

  ```
  "Halloumi contains dairy — you asked to avoid it. Halloumi contains dairy, so
   this is no longer vegan."
  ```

  The same clause, word for word, in two consecutive sentences.

  🔑 **This is exactly the shape the owner named when he ruled on `110/040`**:
  *"We don't want a flood of noisy tags on the menu, especially if two tags are
  telling the reader the same thing i.e. the dish has fish in it."* He was
  looking at fish and at chips; the live instance is dairy, and it is in the
  warning line rather than the chip row. 🚩 **Not caused by the fish work** —
  shipped since [ADR 0048](../../decisions/0048-an-add-on-is-part-of-the-dish-you-are-ordering.md)
  gave `composeTags` its two report shapes, and reachable by every allergen that
  contradicts a dietary claim.

  **Why it happens.** `addons-ui.js` `refresh()` builds its lines from two
  independent arrays and neither knows about the other:

  - `added` → *"Halloumi contains dairy — you asked to avoid it."* (the
    allergen the selection brought in, addressed to the allergy reader)
  - `dropped` with `reason: "contradicted"` → *"Halloumi contains dairy, so
    this is no longer vegan."* (the claim it killed, addressed to the vegan
    reader)

  Both are correct, both are addressed to a different need, and on one screen
  one person reads both.

  🔎 **How wide.** Every `(allergen, claim)` pair in `CONTRADICTS` can produce
  it: gluten×`gf`, dairy×`df`/`vg`, egg×`vg`, shellfish×`v`/`vg`, fish×`v`/`vg`
  — and it fires only when the reader has flagged that allergen **and** the dish
  makes the claim the option kills. `has-meat`/`has-fish` never collide on the
  allergen line, because they are not in the `contains-` namespace and never
  join `added`; fish is the one substance that now produces a near-miss rather
  than a verbatim repeat (*"Salmon contains fish"* + *"Salmon is fish"*).

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — MERGE INTO ONE SENTENCE.**
  Say the fact once and both consequences after it, e.g. *"Halloumi contains
  dairy — you asked to avoid it, and it's no longer vegan."* Both meanings are
  preserved; the repetition is not.
  🔑 **This is the same complaint he made about the chip row, on a different
  surface.** Ruling on `110/040` he wrote: *"We don't want a flood of noisy
  tags on the menu, especially if two tags are telling the reader the same thing."*
  The chip-row instance turned out not to exist; **this one is real and has been
  shipping since ADR 0048**, reachable by five allergen×claim pairs.
  ❌ Dropping the second sentence is **declined** — it silently loses the broken
  dietary claim, which matters to a reader choosing on vegan grounds rather than
  allergy. ❌ Leaving it is **declined**.
  🚩 The merged sentence must not weaken the **allergen** half: it leads, and the
  dietary consequence follows it. A reader skimming must still meet "you asked to
  avoid it" first.

  📋 **Options, costed:**
  1. **Merge the two when they name the same option AND the same substance** —
     *"Halloumi contains dairy — you asked to avoid it, and this is no longer
     vegan."* `[S]` One sentence, both facts, nothing lost. Costs a join in
     `refresh()` and a decision about which voice leads; the flagged phrasing
     must survive, because it is the half the reader is scanning for.
  2. **Suppress the contradiction sentence when the allergen line already said
     it.** `[XS]` Shortest. 🛑 Loses *which claim died*, which is the whole
     point of the second sentence for a reader who is vegan and not allergic.
  3. **Leave it.** `[XS]` Two readers, two sentences, and a duplicated clause is
     a much smaller sin than a missing warning. Defensible, and it is the state
     the owner has now described as noise once.

  🎯 **A ruling is wanted before any of them**: this changes what a reader sees
  on a safety surface, so it is not a session's call. ⚠️ Whichever way it goes,
  `addon_check.mjs` needs the assertion — there is none today, which is how a
  verbatim repeat shipped for three weeks.
