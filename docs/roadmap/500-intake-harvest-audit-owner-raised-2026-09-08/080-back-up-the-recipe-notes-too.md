- [x] **Back up `intake/recipes/`'s Markdown notes too** `[XS][tools]` —
      owner-ruled 2026-10-16 (asked by `faves-11`), following `500/070`.

  `tools/backup_intake.py` copies only images and PDFs, per `340/310`'s
  allow-list, so the 24 `.md` recipe notes (Apple Notes exports) in
  `intake/recipes/` exist on one laptop only. The owner ruled: include them.
  **The work:** widen the allow-list to `.md` inside `recipes/` only (never
  elsewhere: `ingredients/` holds health transcripts), add a selftest case
  that a `recipes/*.md` is selected and an `.md` outside `recipes/` is still
  refused, run it, and confirm the upload by Drive's stamp.

  ✅ **Done 2026-10-16/17 (`faves-11`).** The allow-list takes `.md` in
  `recipes/` only. It also selects any `menus/` file that
  `menu-sources.json` or the new `menu-web-sources.json` fingerprints, which
  is how a fetched menu page is cited. Doing that turned up a parser bug: a
  snapshot path stopped at its first space, so every snapshot under a venue
  folder with a space in its name was silently skipped. Verified:
  `--selftest` 37/37 with every breaker caught, and a probe allowing `.md` in
  every tree failed 5 cases. Real runs copied 26, then 14. The final run
  reads **334 of 334 verified, 334 of 334 stamped by Drive, 0 evidence
  refused** (149 refused as outside the trees, 8 hidden, none opened).

