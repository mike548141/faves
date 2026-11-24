- [x] **Remove the five family recipes the owner made private from the
      research store** `[S][data]` — owner's answer 2026-11-24, at the close
      of queue run f9ee6733.

  (claimed 2026-11-24-0947, session f9ee6733, worktree faves-qr-f9ee-private)

  **His answers, verbatim where they are words:** *"I have moved the recipes
  with family attributions into my private recipes so it stays private."*
  Then, offered three options with their impacts (remove completely; names
  only; keep as an exception), his pick 💬 *"Remove completely
  (Recommended)"*: an answer to options, not a ruling in his words.

  **What was put to him first** (so the record says what he decided on): the
  app never reads `data/`, so nothing in it stops working; for these five,
  `data/history/dishes/cook-at-home.json` holds the full recipe text and is
  what `tools/move_recipes.mjs` reads, so the repo loses its ready copy
  (his private copies, their own `u:` ids, travel with sync; git history
  keeps the old text); and the keep-forever rule (ADR 0047) is set aside for
  these records, with a note saying why.

  **The work:** remove the five family-attributed recipes' rows from
  `data/history/dishes/cook-at-home.json` and their entries from
  `data/estimates/` (records and README prose), plus any other `data/`
  record naming them; a short record of the exception to ADR 0047; every data
  gate green after. **Not here:** docs and code comments elsewhere that name
  the old title are `510/440`'s open question.

  ✅ **Done 2026-11-24 (queue run f9ee6733).** "The five" are the five rows
  that were in `data/history/dishes/cook-at-home.json`: the recipes moved to
  the owner's private cookbook on 2026-10-01 by commit 5cdf29e9. Removed: 5 rows
  from that history file (now `rows: []`, note rewritten), 5 entries from
  `data/estimates/recipes.json` (25 to 20), and the estimates README prose
  rewritten to name none of them. The ids carry a name, so they are not listed
  here. One more `data/` mention, a provenance line in
  `data/intake/recipe-sources.json` naming one of the five as a precedent, was
  neutralised. ADR 0171 records the exception to ADR 0047 and says git history
  keeps the old text.
  - **Brownie, not touched.** The estimates README also listed a sixth recipe
    with an initial for a title. It was not among the five moved, is **still
    published** in `site/data/`, and its estimate is unchanged. A separate
    item, `340/410`, covers it.
  - **Left alone, and why.** `data/intake/name-index.json` (one line, a thigh
    dish under a first name) is a derived index of the private intake exports,
    rebuilt by `tools/intake_index.py` and checked by `--check`; editing it
    would fail that check. `tools/recipe-moves.json` and the `REDACTIONS` keys
    in `tools/intake_index.py` are functional.
  - **Forced outside `data/`:** `tests/move-recipes.test.js` (the real-plan
    case resolved the five against the repo; it now asserts the tool refuses,
    and the command-line case uses a plan of two still-published recipes) and
    a comment in `tools/move_recipes.mjs`.
  - ⚠️ **A gate fires on purpose.** `tools/split_data.py --check` reports
    *"held 5 departed dish row(s) at HEAD and now holds 0 — history was
    destroyed, not relocated"* on this change, and has no allowance for a
    deliberate removal. It reads clean once committed (HEAD compares with
    itself) but a CI run that passes the pre-push state will fail. Narrowing
    that gate is not this item's call.

  ✏️ **Corrected 2026-11-24:** the still-published brownie's title is an
  initial, not a family name, and holds no personal data. The owner,
  verbatim: *"if your talking about "B's Dope-As Brownie" that is not a family
  name there is no PII"*. `340/410` is closed on that.
