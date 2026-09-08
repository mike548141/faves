- [~] 🔎 **The picker still says one SUBSTANCE two ways when the option carries
      both fish tags** `[XS][ux][js]` — found 2026-09-07 (wt: faves-picker)
      while building `050`, **measured in a real browser**, and deliberately
      **left standing** rather than folded into that ruling.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — delivered by
  a sub-agent in its own worktree (`faves-o1-one-substance`, branch
  `one-substance`), landing by PR so CI runs before the merge.

  **Verbatim, headless Chrome, 390 px, `contains-fish` ticked in Settings'
  avoid list.** Sprig & Fern Tawa's *Potato, Rosemary + Basil Pesto*
  (`["v", "gf-option", "contains-nuts"]`), ticking **Salmon**
  (`["has-fish", "contains-fish"]`):

  ```
  "Salmon contains fish — you asked to avoid it. Salmon is fish, so this is no
   longer vegetarian. Salmon isn't tagged gluten free, so that label describes
   the dish as listed."
  ```

  One option, one fish, two sentences opening with it — *"Salmon contains
  fish"* and *"Salmon is fish"*.

  **Why `050`'s merge does not catch it, and why that was deliberate.** The
  merge keys on `(option, TAG)`, so it fires only where the clause is literally
  the same one twice. Here the allergen line comes from `contains-fish` and the
  contradiction line from `has-fish`, and
  [ADR 0095](../../decisions/0095-an-add-on-carries-both-axes.md) §1 keeps those
  two tags **independent on purpose** — two rules on the same evidence, neither
  written in terms of the other, because collapsing them would make the allergen
  a consequence of the dietary marker, which Theme 5 item `010` forbids. Teaching
  the *picker* that the two name one substance is a presentation-layer
  equivalence and would not touch that rule — but it is a different decision from
  the one the owner made, so a session should not make it while closing `050`.

  🚩 **It is the only near-miss of its kind.** `has-meat` has no
  `contains-meat` (ADR 0092 rejected one), so meat cannot produce this shape.
  Fish is the single substance in the vocabulary carried by two tags at once,
  and the tagger writes both on every finfish option — so this fires on **every
  fish add-on in the corpus** where the dish makes a `v`/`vg` claim, and only
  when the reader has flagged fish.

  📋 **Options, costed:**
  1. **Give the merge a substance map** — `has-fish` ↔ `contains-fish` are one
     substance for the purpose of the sentence only. `[XS]` Produces *"Salmon
     contains fish — you asked to avoid it, and this is no longer vegetarian."*
     Both meanings kept, nothing repeated, and it reuses the machinery `050`
     already built. 🛑 It introduces a second place in the app where the two
     fish tags are related to each other; the map would need a comment saying it
     is about WORDS, not about the tag model, or the next session reads it as
     licence to derive one tag from the other.
  2. **Prefer the allergen tag when both are present**, so `composeTags` reports
     the drop as `contains-fish` and `050`'s existing merge fires unchanged.
     `[S]` No new vocabulary, no map. 🛑 Changes `addons.js`'s reported
     `allergen` field, which `addon_check` and the *"Salmon is fish"* wording
     both rest on — and *"Salmon is fish"* is the sentence 14h was built to
     produce.
  3. **Leave it.** `[XS]` It is a near-miss, not a repeat: the two sentences say
     different things about the same fish, and one of them is the allergen the
     reader asked about. Cheapest, and it is the state that ships today.

  🎯 **Owner's call — it is the same complaint as `050` one step further out,
  and the recommendation is option 1** for the reason `050` was ruled the way it
  was: both meanings kept, the repetition removed, allergen half leading. Say if
  the answer is 3 and this closes.
