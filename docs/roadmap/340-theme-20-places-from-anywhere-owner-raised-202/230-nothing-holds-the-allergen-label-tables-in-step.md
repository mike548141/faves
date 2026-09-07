- [~] 🔎 **Nothing holds the four JavaScript allergen LABEL tables in step with
      `validate.py`'s vocabulary, so a future tag can ship as a bare
      unexplained chip** `[S][tools]` — found 2026-09-07 (session faves-b1)
      while landing `contains-fish`, and filed rather than fixed.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — the owner's
  ruling above is the brief. Delivered by a sub-agent in its own worktree
  (`faves-o1-allergen-labels`, branch `allergen-labels`), landing by PR so CI
  runs before the merge.

  **The asymmetry, stated precisely.** Adding an allergen touches two kinds of
  table:
  - **Contradiction tables** — `addons.js`'s `CONTRADICTS` and
    `tag_allergens.py`'s `CONTRADICTED_BY`. These **do** have a drift check:
    `validate.py` holds them in step, so a tag added to one and not the other
    fails a gate.
  - **Label tables** — `menu.js`, `recipe.js`, `addons-ui.js` and
    `settings.js`'s avoid list, each mapping a tag to the words a reader sees.
    **These have no check at all.** A tag present in `validate.py`'s `TAGS` but
    missing from a label table renders as whatever the fallback is, on that
    screen only.

  🔎 **The failure is silent and partial, which is the worst shape.** It does
  not break a page; it degrades one surface out of four. A dish would carry a
  correct warning on the menu and an unlabelled one on the recipe page, or the
  allergen would be missing from Settings' avoid list so the reader **cannot
  ask to avoid it** while the data cheerfully carries it.

  **How it was found: by tripping over its neighbour.** Landing
  `contains-fish` needed ten surfaces. The delivering agent grepped for an
  existing tag, found the files, and still missed `tests/addons.test.js:170` —
  a closed-set whitelist that *reads* like a fixture. `node --test` caught that
  one. Nothing would have caught a missed **label** table, because no test
  asserts the label tables are complete. So the near-miss was on the half that
  has a guard, and the half with no guard was passed by luck and care rather
  than by mechanism.
  🔑 This is [ADR 0072]'s decorative-guard question from the other side: not *a
  guard whose output is the same whether or not the thing is broken*, but **a
  neighbouring guard whose existence makes an unguarded surface feel covered.**

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — OPTION 1, ADD THE TEST NOW.**
  A plain unit test asserting every tag in `validate.py`'s `TAGS` has a
  reader-facing label in all four JavaScript tables and in Settings' avoid list.
  ❌ Option 2 (one shared source of truth) is **declined for now** — it is the
  right end state and it crosses the Python/JavaScript boundary in a
  zero-build-step repo, so it is not worth paying for on today's evidence.
  ❌ Option 3 (document the checklist) is **declined**: it is what we
  effectively had, and it failed twice on 2026-09-07 — caught by a test run and
  by luck, not by design.
  🔑 **The interesting half is where the vocabulary comes from.** The master
  list is Python and the labels are JavaScript, and the zero-dependency rule
  forbids a build step — so the test needs either a small shared JSON both read,
  or a parse of one by the other. **A parse that rebuilds its input must
  re-emit it byte-for-byte or refuse the line** (the standard set by ADR 0076);
  a lenient parse here would be a check that agrees with a broken vocabulary.

  📋 **Original options, kept for the record — option 1 is the ruled one:**
  1. **A test that asserts every tag in `validate.py`'s `TAGS` has an entry in
     each of the four label tables** (and in Settings' avoid list). Pure logic,
     runs in `node --test`, no browser. Cheapest real mechanism. Needs the JS
     side to be able to read the Python vocabulary or a single shared source —
     which is the interesting part of the work, and may argue for 2.
  2. **One source of truth for the vocabulary**, exported once and imported by
     every table. Removes the class rather than checking for it. Larger, and it
     crosses the Python/JavaScript boundary in a repo with a zero-build-step
     constraint — so the shared source probably has to be a JSON file both read.
  3. **Document the checklist** in `ARCHITECTURE.md` beside the closed
     vocabulary: "adding a tag means these ten places". Free, and it is a
     discipline rather than a mechanism.
  🎯 **Recommendation: option 1 now, option 2 only if a third tag arrives.**
  Option 1 buys the mechanism at low cost; option 2 is the right end state but
  is not worth crossing the language boundary for on today's evidence.

  🔗 Related but distinct: [`110/040`](../110-theme-5-richer-dish-data/040-an-add-on-naming-fish-carries-no-allergen-warning.md)
  is a tag that reaches every label table correctly and still fails to warn,
  because the *add-on* axis never carries it. Same feature, different hole —
  fixing either does nothing for the other.
