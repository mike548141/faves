- [~] **Remove the five family recipes the owner made private from the
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
