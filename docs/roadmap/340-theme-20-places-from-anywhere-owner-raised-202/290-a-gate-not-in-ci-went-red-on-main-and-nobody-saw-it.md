- [ ] 🔎 **A gate that is on the verify list but not in CI went red on `main`,
      and it took a passing agent on unrelated work to notice** `[S][tools]` —
      found 2026-09-09 (session faves-3b) by the agent delivering `500/060`,
      which ran `products.py` because its brief said to and found `main`
      already failing.

  **What happened, exactly.** PR #31 (`500/020`, the Churton leaflet) added
  `readAlso` and `readAlsoBy` to the `b029` row of
  `data/intake/not-products.json`, recording a **second** reading of the same
  photographs. `NOT_PRODUCT_KEYS` in `tools/products.py` is **closed on
  purpose** — its own comment says a free-text key is *"a place to write
  'misc' and stop looking, which is the exact silence this file exists to
  replace"* — so it refused both keys and the gate exited non-zero.

  🛑 **Three independent things all failed to catch it, and that is the
  finding — not the two keys.**
  1. **The delivering agent's verify list did not include `products.py`.** Its
     brief named eleven gates and this was not one of them, because nobody
     writing the brief connected *"you are editing `data/intake/`"* with
     *"`products.py` validates `data/intake/`"*. The brief was the gate.
  2. **CI does not run `products.py`.** `.github/workflows/ci.yml` runs
     `check_records.py`, `recipe_estimates.py --check` and the rest, but not
     this one — verified 2026-09-09 by reading the workflow.
  3. **The commit message's own verify list omitted it**, so the record of how
     the change was checked was true about what was run and silent about what
     was not.
  ⇒ `main` was red on a repo invariant for the length of three merged PRs, on
  a repo where **a push is a deploy**.

  ✅ **FIXED 2026-09-09 (session faves-3b), minimally and without deciding
  anything.** The two invented keys are gone; both readings are preserved
  inside the existing closed schema — `read` now carries the fuller 2026-09-09
  reading and `readBy` names both sessions and says what the first one could
  not do (it could not crop, so it counted one side's 82 dishes as the whole
  180). `products.py` → **87 valid, 0 errors**. No schema change was made,
  because widening a deliberately-closed key set is not a fix a delivering
  session gets to make on its own.

  🎯 **What is still open, and it is a real question rather than a tidy-up.**
  **Does the record need a repeat-reading concept at all?** The `b029` row was
  read twice, by two sessions, to different depths, and the second reading
  corrected the first. Today that is prose inside `readBy`. Options:
  1. **Leave it as prose.** Free. A second reading is rare and the fields say
     enough. Costs: nothing machine-readable can ask *"which rows have been
     re-read, and did the re-reading change the answer?"*
  2. **Add a `reads: [{date, by, what}]` array** and keep `read`/`readBy` as
     the latest. Honest to what happened; costs a schema change on a closed
     set and a migration of the existing rows.
  3. **Refuse re-reads in the record** and require the prose to carry it, i.e.
     make option 1 explicit rather than accidental.
  Recommendation: **(1) made explicit, i.e. (3)** — one row in the corpus has
  ever been read twice, and ADR 0080 D4's rule is that a shape recorded before
  its instances is a hypothesis. Revisit when a third row needs it.

  🚩 **And the structural half, which is bigger than this item.** The verify
  list in `CLAUDE.md` is long and CI runs a fraction of it, so *which* gates a
  session runs is chosen by whoever writes its brief. That is the
  honour-system class `340/020` and ADR 0072 already name — but this is the
  first recorded instance of it letting `main` go **red and stay red**, rather
  than merely leaving a behaviour unchecked. Options worth costing: a gate that
  maps a changed path to the gates that read it (`data/intake/` ⇒
  `products.py`, `intake_index.py`), so a brief cannot omit one by accident;
  or adding the missing Python gates to CI, which is cheap for these — they
  need no browser. 📌 Not proposed as a decision here: `340/020`'s subset
  ruling is the owner's and this would widen it.
