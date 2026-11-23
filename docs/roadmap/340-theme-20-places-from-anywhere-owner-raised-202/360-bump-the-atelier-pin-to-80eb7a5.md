- [x] **Bump the atelier pin `2a6d7a4` → `80eb7a5` and re-copy the floor
      verbatim** `[S][docs]` — raised 2026-11-23 by `ccopen` at the open of
      queue run f9ee6733 (*"recover first: pin or floor copy not current"*),
      436 commits behind, floor changed. Deferred by three earlier sessions
      (2026-11-20 ×2, 2026-11-21) as "its own session's work".

  (claimed 2026-11-23, session f9ee6733, worktree faves-qr-f9ee-pin; the claim
  first read 1210 UTC, but the claim commit landed about 1158 UTC)

  **What the floor region changed** (`2a6d7a4..80eb7a5`, region diff read in
  full): *Asking* now writes the account and puts the device in the same turn;
  *Source & drift* reads the atelier path from `hooks.atelierTools`, so it
  resolves from a worktree; *Estate resources* adds a write-up duty to the
  root; *visibility* splits into `<visibility fact>` and a new
  `<visibility check>` placeholder. The onramp below the block carries text
  each of these makes stale.

  ✅ **Done 2026-11-23 (queue run f9ee6733).** The floor block in `CLAUDE.md`
  is re-copied word for word from atelier's `floor` region at `80eb7a5`, the
  four placeholders filled. `pins.py --floor --child` reads `identical` at the
  pin, and the `CLAUDE.md` hand check prints no drift, no residual placeholder
  and no line of 86 columns or more. Below the block: the placeholder list,
  the worktree trap marked closed upstream, and § *Checking the stamp above*
  now names `pins.py` as the tool verdict (atelier `320/160`, closed
  2026-11-18). `.githooks/pre-commit` is re-copied from atelier's
  `tools/pre-commit.sample`, which adds the missing-`python3` guard; the <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tree, not this repo's -->
  other two hooks were already identical to their samples.

  **The rest of the delta**, read for what newly binds a child (a read-only
  digest of the `docs/method/` diff, hook samples and floor runs under the old <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tree, not this repo's -->
  and new tools): everything is met except `docs/PERSONAL-DATA.md`, which is <!-- pathscan:allow: the missing file is the finding (340/350) -->
  [`350`](350-write-the-personal-data-closed-list-before-2027-03-08.md) and
  needs the owner's grants. Dated gates checked: 2026-12-04 (board index
  form) passes; 2026-12-09 (`pins.py --check`, malformed allow-markers,
  `sizescan` declarations) passes; 2027-03-08 (`pdlistscan`) would fail
  today. atelier `310/060` and `310/070` are still open, so the dated
  pending-upstream line in `docs/roadmap/README.md` stays.

