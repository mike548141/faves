- [x] 🔎 **Intake added after 2026-10-02 is backed up by nothing** `[S][tools]`
  — found 2026-10-02 (`faves-77`) closing `340/310`; filed 2026-10-03.

  `340/310` copied the 294 evidence originals in `intake/` (menus, recipes,
  `ingredients/raw_food_photos/`, the fingerprinted web snapshot) to the
  owner's Drive at `My Drive/Faves evidence/intake/`, and verified them
  against source, against the committed fingerprints, and as uploaded. That
  was a one-off copy. `intake/` is gitignored and lives on one laptop, so
  every photo or PDF dropped in since is in exactly the state `340/310`
  existed to end: one copy, unfingerprinted until a reading cites it.

  **The work:** a re-runnable tool (e.g. `tools/backup_intake.py`) that
  copies only what is new or changed, by the same ALLOW-list `340/310`
  used — never "every image": `ingredients/Healthy Mike_files/` holds 105
  images that are a health transcript's own assets, and the transcripts and
  food-log exports are never opened or copied. It re-hashes each copy
  against source and against any committed fingerprint, and counts upload
  by Drive's `com.google.drivefs.item-id#S` attribute, not by the local
  copy. Prints its scope and counts every run; `--selftest` break-probes
  the allow-list (a transcript image must be refused). Then decide when it
  runs — after every intake session, or named in the intake workflow.
  The Drive path is the owner's private account; keep it out of committed
  text beyond the local-path convention `340/310` already uses.

  ✅ **Done 2026-10-16 (faves-11 worker).** `tools/backup_intake.py` landed.
  It reuses 340/310's allow-list unchanged (three trees, images and PDFs,
  plus the one fingerprinted web page by exact path from
  `recipe-sources.json`; nothing else is ever opened), copies only new files,
  holds a changed file that has no fingerprint (`--accept-changed`), refuses
  a source that disagrees with its committed `sha256`, re-hashes every copy
  against source and fingerprint, and counts upload from Drive's
  `com.google.drivefs.item-id#S` stamp on the destination file, never the
  local copy. `--dry-run` writes nothing; `--selftest` runs 33 cases and six
  break-probes (allow-list off, copy verification off, fingerprint check off,
  skip-if-present off, `--deep` off, upload counted locally), each of which
  must fail exactly the cases it is aimed at. Prints scope, counts and the
  tree line every run.
  **When it runs:** at the end of every intake session, as step 9 of
  `intake/README.md`'s workflow. **Not a gate**, so not on CLAUDE.md's verify
  list: it reads a gitignored folder that CI and every worktree lack, so there
  it could only pass vacuously; `--selftest` is the part that runs anywhere.
  **Measured on the primary checkout's `intake/` (dry run, 2026-10-16):** 294
  files selected (menus 87, recipes 24 incl. the web page, raw food photos
  183), 0 would be copied, 294 of 294 already carry Drive's stamp; 89 carry a
  committed fingerprint, 205 do not (the 183 raw food photos and 22 recipe
  images are not in any committed record).
  🚩 **Noted, not decided:** the allow-list excludes the 24 `.md` recipe notes
  in `recipes/` (340/310 ruled "images and PDFs only"), so those exports have
  no backup. They are not health data; whether to widen the allow-list to
  them is the owner's call.
  💡 **Design detail, recorded here:** a destination file is judged "same" by
  size and modification date, not by reading it, because Drive keeps files
  online-only and hashing them downloads ~1.8 GB (the first dry run sat for
  minutes doing exactly that). `--deep` re-hashes every destination file for
  the occasional full audit.
