- [x] 🔎 **The picker still says one SUBSTANCE two ways when the option carries
      both fish tags** `[XS][ux][js]` — found 2026-09-07 (wt: faves-picker)
      while building `050`, **measured in a real browser**, and deliberately
      **left standing** rather than folded into that ruling.

  ✅ **DELIVERED 2026-09-08 (session faves-o1) — option 1, the substance map, as
  recommended.** Worktree `faves-o1-one-substance`, branch `one-substance`,
  landing by PR. Full deliberation: ADR 0103,
  [the picker names a substance once](../../decisions/0103-the-picker-names-a-substance-once-and-the-tags-stay-independent.md).

  ```
  BEFORE  "Salmon contains fish — you asked to avoid it. Salmon is fish, so
           this is no longer vegetarian. Salmon isn't tagged gluten free, so
           that label describes the dish as listed."
  AFTER   "Salmon contains fish — you asked to avoid it, and this is no longer
           vegetarian. Salmon isn't tagged gluten free, so that label
           describes the dish as listed."
  ```

  Both measured in headless Chrome at 390 px on the same row `addon_check`
  already ticks Salmon on. Both facts survive, the allergen half still leads,
  and the dish's unrelated absence sentence is untouched — three sentences
  became two, not one.

  **The corpus, swept with the real code rather than a replica** (57 venues,
  2,866 (dish, option) combinations, both avoid states, driven through
  `composeTags` and the picker's now-exported `warningLines`):

  | | before | after |
  |---|---|---|
  | warnings naming one substance two ways | **22** | **0** |
  | distinct (dish, option) pairs | 11 | 0 |
  | venues | 2 (`crepes-a-go-go`, `sprig-and-fern-tawa`) | — |

  11 pairs × 2 avoid states = 22: 🚩 **the item said this fires "only when the
  reader has flagged fish" and that is too narrow** — the unflagged branch
  repeats it too (*"Salmon contains fish. Salmon is fish, so this is no longer
  vegetarian."*), and both are fixed, for the reason `050` fixed both. 13
  (dish, option, claim) triples, because two of the eleven kill `v` **and**
  `vg-option`.

  ✅ **The "only near-miss of its kind" claim CHECKS OUT.** The sweep found
  exactly one other option in the corpus carrying a `has-` and a `contains-`
  tag at once: Little Sprig Seatoun's *Cheese & beef gravy* (`contains-dairy` +
  `has-meat`) — **two** substances, correctly still two sentences, and pinned
  by a unit test. `has-meat` has no `contains-meat` (ADR 0092), so no second
  pair exists and the map stays a one-substance map.

  🔑 **The data rule is untouched, and it is ASSERTED rather than promised.**
  `SUBSTANCE` is consulted in one expression, `factKey`, whose only job is
  deciding which two SENTENCES are one. `tests/addon-warning.test.js`'s last
  test — named *THE DATA RULE IS UNTOUCHED* — pins all four halves: the
  composer still reports `contains-fish` in `added` and `has-fish` as the
  contradicting tag; `has-fish` alone adds **no** allergen; `contains-fish`
  alone puts **no** `has-fish` on the composed tags; and the tagger's two
  independent rules (ADR 0095 §1) still have their own breakers in
  `test_tag_addon_options.py`.

  🧪 **Break-probed**, by reverting `factKey` to the tag form: it reproduces
  the recorded string **byte for byte** and fails **4** of the 6 new
  `addon_check` assertions with **39 passing and nothing pre-existing broken**,
  plus 6 of the 10 new unit tests. ⚠️ The other two — *the allergen clause is
  said once* and *the allergen half still leads* — pass in **both** states and
  are therefore **not** break-proven by that probe; the repeat was *"Salmon is
  fish"*, a different clause, and the allergen half led before. Said here
  rather than left to be assumed.

  `addon_check.mjs` **37 → 43**. `tests/addon-warning.test.js` is new: 10 tests
  in CI over the exported `warningLines`, covering the `or` fold across the
  map, two substances on one option, the per-option key, and the unflagged
  branch.

  🔎 **Two pre-existing observations, found while sweeping and left alone** —
  both in `composeTags`, neither a repetition: an option carrying two
  contradicting tags reports only the **first** per claim, so *Cheese & beef
  gravy* on a `vg`-only dish says dairy and never says meat; and with two fish
  options on one plate, `seen` and the `break` mean only the first is named.

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
