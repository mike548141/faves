- [x] **Wire `allergen_disagreements.py --strict` into the gates, now the
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

  ✅ **Done 2026-11-23 (queue run f9ee6733).** After
  [`030`](030-37n-the-corpus-disagrees-with-itself-about-all.md) recorded the
  pizza slice the report was empty (`0 class/allergen split(s)`), so the gate
  was wired rather than stopped. `.github/workflows/ci.yml` gains the step
  *No dish class disagrees with itself about an allergen*
  (`python3 tools/allergen_disagreements.py --strict`) beside the existing
  allergen test steps; CLAUDE.md's verify list carries the same line beside
  `test_allergen_disagreements.py`; the tool's own EXIT CODE paragraph no
  longer says disagreements exist by construction.
  Evidence, the break-probe: with one `contains-dairy` removed from one pizza
  in a temporary copy of the corpus (outside the repo), `--strict` reported
  that row and exited 1, and the same copy without `--strict` still exited 0;
  on the real corpus `--strict` exits 0. The probe is now a standing case in
  `tools/test_allergen_disagreements.py` (*S1 --strict exits non-zero on a
  planted disagreement*, beside *S1 --strict exits 0 on the real corpus*),
  which CI already runs, and the two cases are listed as the outcome-level
  detector for every breaker that puts a disagreement back: all 14 breakers
  are still caught, each by its own cases alone (39 of 39 behave).
  Not verified here: the new CI step has not run on a runner, and CI is only
  the pushed result's to say (it needs no network or browser, and runs in
  under a second).
