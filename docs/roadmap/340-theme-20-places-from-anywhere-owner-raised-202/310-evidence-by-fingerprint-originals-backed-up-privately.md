- [ ] 🔥 **Evidence by fingerprint, originals backed up privately — OWNER
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
