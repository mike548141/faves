- [x] 🔥 **Evidence by fingerprint, originals backed up privately — OWNER
  RULED 2026-09-28 (option C, via AskUserQuestion, after an impact
  analysis)** `[M][tools]` — this replaces 340/250 part (4). **Nothing from
  `intake/` is committed to the public repo.**

  **Why (the analysis, measured 2026-09-28):**
  - Importing would take the repo from **13 MB to ≈1.85 GB**, permanently.
  - It would publish ~311 photos taken in the owner's home. GPS stripping
    cannot hide what is *in* a picture.
  - Every clone, CI job and worktree would carry it (the session that
    measured this made 6 worktrees, ≈11 GB).
  - The photos never reach phones either way: `data/` is not deployed.
  - The import's goals — **auditable** (prove which photo a reading came
    from) and **durable** (not one copy on one laptop) — are both met
    without publishing.

  **The work:**
  1. **Fingerprints.** Add a `sha256` per evidence file to
     `data/intake/menu-sources.json`, via `tools/intake_exif.py
     --rebuild`, matching `recipe-sources.json`'s existing field. Then have
     `check_provenance.py` verify each hash against local material where
     it is present, and report where it is not.
  2. **Private backup.** Copy the ORIGINALS, with GPS (it is evidence,
     ADR 0107, and the destination is private), into the Drive desktop sync
     folder
     `~/Library/CloudStorage/GoogleDrive-<account>/My Drive/`
     under a folder such as `Faves evidence/`. Mirror `intake/`'s tree,
     **images and PDFs only**.
  3. **Verify.** Re-hash the Drive copies against the committed
     fingerprints, and report counts.
  4. **Tidy.** Delete the gitignored `evidence-stripped/` (1.7 GB of
     derived copies with no remaining purpose), with the owner's go.

  🛑 **Never copied or committed:** the "Healthy Mike" ChatGPT and Gemini
  transcripts and the food-log exports in `intake/ingredients/`. They are
  health data and eating events, which CLAUDE.md says are never opened.
  🚩 **Assumed, not asked:** that the owner's Google Workspace account (the
  only Drive on this machine) is the right Drive. Confirm with him in one
  line before the first copy.

  📌 **Claimed 2026-10-02 (`faves-4f`), part 1 (fingerprints) only.** Parts 2–3
  wait on the one-line Drive confirmation; part 4 on the owner's go.

  ✅ **Part 1 done 2026-10-02 (`faves-4f`, PR #87).** `check_provenance.py
  --rebuild` writes a `sha256` per evidence row (88 files, 15 venues); every
  run verifies each against local material (88/88 on the primary checkout),
  reports absent material without failing (CI, worktrees), fails a mismatch
  by name and fails a row with no hash; `--rebuild` refuses to re-bless
  changed bytes without `--accept-changed`. Self-test 15/15; break-probed by
  the orchestrator (mismatch counted as verified ⇒ the one-byte case fails).
  🚩 `.leakscanignore` gained `data/intake/menu-sources.json`: leakscan's
  `nz-phone` rule matches digit runs inside hex digests (its lookarounds
  refuse only a neighbouring digit, not a hex letter). The rule defect is
  atelier's and is filed there.
  📌 **Claim released** after part 1. Parts 2–3 wait on the owner's one-line
  Drive confirmation; part 4 (deleting `evidence-stripped/`) on his go.

  ✅ **Owner ruled 2026-10-02: yes to parts 2–4.** The destination is his
  Google Workspace Drive (the only Drive on this machine), and
  `evidence-stripped/` (derived copies) may be deleted once part 3's re-hash
  of the Drive copies passes. The health transcripts and food-log exports
  are still never opened or copied. Ready to take; do it in a fresh session
  and verify before the delete, which cannot be undone.

  📌 **Claimed 2026-10-02 04:12 UTC (`faves-77`): parts 2–4 (Drive copy,
  re-hash, then the delete), inline on the primary checkout, which is the only
  one holding `intake/`.**

  ✅ **Parts 2–3 done 2026-10-02 (`faves-77`).** 294 files copied, with
  their GPS, to `My Drive/Faves evidence/intake/`, mirroring `intake/`:
  `menus/` 87, `recipes/` 23 (two HEIC included), `ingredients/
  raw_food_photos/` 183, and the one fetched web page whose fingerprint
  `recipe-sources.json` carries. Selection was an ALLOW-list of those three
  trees, not "every image": `ingredients/Healthy Mike_files/` holds 105 images
  that are the saved transcript's own assets, and an images-only filter
  would have copied them. Nothing from that transcript, the Gemini file or
  the food-log exports was opened or copied.
  **Verified three ways:** every copy re-hashed equal to its source
  (294/294); every committed fingerprint matched its copy (89/89: 88 menu
  rows + the recipe snapshot; none fingerprinted-but-unselected; nothing
  extra in the Drive folder); and upload, not just the local cache — Drive
  for desktop stamps a cloud item id on each file once uploaded (294/294
  carry one), and three ids were resolved through the Drive API to the same
  name and byte size. The scripts were session scratch, not committed.
  🛑 **Part 4 is NOT done: the permission system refused `rm -rf` of
  `evidence-stripped/`**, and it was not routed around. Checked before the
  attempt: all 406 files in it are derived copies whose originals are in
  `intake/` (two are HEIC transcodes of `recipes/Archive/Attachments/`), and
  nothing in `tools/` reads it — so deleting it loses nothing.
  🎯 **Owed: the owner deletes it himself
  (`rm -rf ~/.pets/faves/evidence-stripped`, 1.7 GB), or allows the command
  for a session.** Claim released.
  💡 **Not built, noted:** photos added to `intake/` after today are not
  backed up by anything; a re-run copies only what is new or changed in size.

  ✅ **Owner ruled 2026-10-03 (asked by `faves-77`): he runs the delete
  himself** (`rm -rf ~/.pets/faves/evidence-stripped`). A session does not
  take this; the item closes when he says it is done.

  ✅ **Part 4 done 2026-10-03: the owner deleted `evidence-stripped/`
  himself**, as ruled; `faves-77` confirmed the folder is gone. All four
  parts are complete. **Closed.** (The 💡 above — nothing backs up intake
  photos added after 2026-10-02 — is filed as
  [`500/070`](../500-intake-harvest-audit-owner-raised-2026-09-08/070-new-intake-photos-are-not-backed-up.md).)
