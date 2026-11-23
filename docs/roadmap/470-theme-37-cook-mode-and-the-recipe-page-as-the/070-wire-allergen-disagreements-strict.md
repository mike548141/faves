- [~] **Wire `allergen_disagreements.py --strict` into the gates, now the
      last row is ruled** `[S][tools]` — filed 2026-11-23 by queue run
      f9ee6733, as [`030`](030-37n-the-corpus-disagrees-with-itself-about-all.md)
      asks (*"wire `--strict` as its own item"*).

  (claimed 2026-11-23-1419, session f9ee6733, worktree faves-qr-f9ee-allergen)

  **Why now.** The report's last row, `abrakebabra/pizza-slice`, was ruled
  by the owner on 2026-10-18 (cut from the Turkish pizza). Once 030 records
  that, the report should be empty, and `--strict` can refuse the next
  disagreement instead of listing it. **Done means:** `--strict` exits 0 on
  the corpus, exits non-zero on a planted disagreement (a break-probe), and
  runs where the repo's other Python gates run (CI and the verify list in
  `CLAUDE.md`). If the report is not empty after 030, this stops and says
  why rather than narrowing anything.
