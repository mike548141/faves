- [ ] 🔎 **Intake added after 2026-10-02 is backed up by nothing** `[S][tools]`
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
