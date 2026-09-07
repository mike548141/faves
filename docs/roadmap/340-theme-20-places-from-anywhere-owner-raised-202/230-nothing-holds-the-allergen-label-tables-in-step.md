- [x] 🔎 **Nothing holds the four JavaScript allergen LABEL tables in step with
      `validate.py`'s vocabulary, so a future tag can ship as a bare
      unexplained chip** `[S][tools]` — found 2026-09-07 (session faves-b1)
      while landing `contains-fish`, and filed rather than fixed.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — the owner's
  ruling above is the brief. Delivered by a sub-agent in its own worktree
  (`faves-o1-allergen-labels`, branch `allergen-labels`), landing by PR so CI
  runs before the merge.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — `tests/tag-labels.test.js`,
  18 tests, `node --test` 1193 → 1211 pass / 0 fail. Worktree
  `/Users/mike/worktrees/faves-o1-allergen-labels`, `allergen-labels@9b61892`.
  **No corpus gap: all five surfaces are complete today.** Nothing under
  `site/` changed, so no version bump —
  `check_versions.py --range origin/main..HEAD` says *"Version lockstep not in
  scope: nothing under site/ changed."*

  **How the vocabulary crosses the language boundary.** Settings is
  **imported** (`ALLERGEN_PREFS`/`DIETARY_PREFS` are exported and the module
  loads under Node) — a real value beats a parsed one. The other three cannot
  be: `menu.js` and `recipe.js` call `document.getElementById` at module
  scope, and none of `DIETARY`, `ALLERGEN`, `ALLERGEN_LABEL`, `CLAIM_LABEL`,
  `CARRIES` is exported. Exporting them to suit the test would change a
  shipped module for the test's convenience, so they are read as **source**.
  Per [ADR 0076] every parser re-emits the block it read and compares it to
  the original byte for byte.
  🔑 The separator grammar is deliberately **loose in, canonical out**
  (`\s*,\s*` read, `", "` written). A grammar tight enough to reject every
  non-canonical line would leave the round trip unable to fire — [ADR 0072]'s
  decorative guard wearing [ADR 0076]'s clothes. Loose-in means the round trip
  is the gate that catches a re-spaced vocabulary and the regex catches only
  shapes with no reading at all.

  **Heat levels are a regex, not a table**, so the test parses
  `const isSpicy = (t) => /^spicy-[123]$/.test(t);` (round-tripped too) and
  runs every tag past it — a hypothetical `spicy-4` fails rather than painting
  as a bare chip. **Exemptions are explicit and reasoned**, never defaulted:
  `has-meat`/`has-fish` are read off `validate.py`'s own `OPTION_ONLY_TAGS`
  ([ADR 0096]), spicy levels are exempt from the picker and Settings, and the
  four `-option` tags are exempt from Settings because `DIET_FILTERS.satisfies`
  already reaches them from the claim. A word added to `TAGS` is exempt
  **nowhere**, so it fails all five surfaces at once. A stale exemption fails
  too: the test refuses an exemption for a tag no longer in `TAGS`, or one the
  surface has since labelled.

  **The reverse direction is asserted as well** — a label for a word
  `validate.py` has never heard of is a half-done rename or a retired tag left
  on a screen. Removing `contains-sesame` from `TAGS` fails on all four label
  surfaces plus Settings by name.

  🔬 **Break-probe 1 — a label deleted from ONE table.** Removed
  `"contains-sesame": "Contains sesame",` from `recipe.js`'s `ALLERGEN`:

  > ✖ every tag has reader-facing words in site/js/recipe.js — the recipe
  > page's tag chips (DIETARY + ALLERGEN + isSpicy)
  > AssertionError: site/js/recipe.js has no label for: contains-sesame —
  > either give it words there or record why that surface never shows it
  > (tests/tag-labels.test.js)
  > pass 17 · fail 1

  One failure, naming the file and the tag; `menu.js` stayed green, which is
  what proves the surfaces are checked independently. Restored, 18/18.

  🔬 **Break-probe 2 — a malformed vocabulary.** Dropped the comma in
  `TAGS`'s `"contains-egg", "contains-dairy",` row:

  > Error: tools/validate.py: line 32 of `TAGS` is neither a comment nor a
  > row of quoted tags, so this parser does not understand it:
  > `"    \"contains-egg\" \"contains-dairy\", \"contains-gluten\","`
  > pass 0 · fail 1

  **Zero tests pass** — the parse is at module scope, so a shape it does not
  understand takes the whole file down rather than yielding fewer tags and
  passing every completeness assertion in silence. The same two refusals are
  asserted *inside* the test as fixtures, so the refusal itself is guarded.
  A third probe (a well-formed `TAGS` one tag short) fires the count
  assertion — `TAGS parsed as 21 tags` — plus the four reverse checks.

  🚩 **What a green run here cannot show:** that a label is *correct*, or the
  right words for a reader — only that one exists. Option 2 (one shared source
  of truth) remains the right end state and remains declined.

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
