- [~] **Back up `intake/recipes/`'s Markdown notes too** `[XS][tools]` —
  (claimed 2026-10-16-1034, faves-11, wt: primary (inline))
      owner-ruled 2026-10-16 (asked by `faves-11`), following `500/070`.

  `tools/backup_intake.py` copies only images and PDFs, per `340/310`'s
  allow-list, so the 24 `.md` recipe notes (Apple Notes exports) in
  `intake/recipes/` exist on one laptop only. The owner ruled: include them.
  **The work:** widen the allow-list to `.md` inside `recipes/` only (never
  elsewhere: `ingredients/` holds health transcripts), add a selftest case
  that a `recipes/*.md` is selected and an `.md` outside `recipes/` is still
  refused, run it, and confirm the upload by Drive's stamp.
