## 2026-09-20-2254 — session `26e43c41` (Fable, cold review + merge): two of three worker branches merged, the pin bumped with the delta read, one branch left owed

**Tier stated, not asked:** Fable, because the owner asked for the work best
delivered on it and `REVIEW.md` rule 4 puts a cold pass there. Three worker
branches from 2026-09-20 sat pushed, green-ish, clean and unmerged with no PR
open. Each diff was read whole, its claims re-run from its worktree, and only
then merged. Owner-imposed hard stop at 11:00 NZST; this record is the safe
point.

### Merged and pushed (`9ae029e`)

- ✅ `stash-residue-check` (ADR 0119) — `--selftest` 14/14 re-run;
  `check_decisions` clean. Bracket flipped, index rebuilt, verify-list line
  landed, all in the merge commit as the worker asked.
- ✅ `floor-restamp` (ADR 0120) — hand check re-run against atelier
  `origin/main`: zero drift, six placeholder lines, none residual. 🔎 The
  branch bumped the pin to `09cd4d2` having read the **floor region**; the
  other 8 `docs/method` files that moved across `eb6449d..09cd4d2` (382
  lines) were read at merge and the pin set to `2b29bb7`, which a live
  atelier session pushed at 10:39 NZST while this was being written. Three
  merge-time corrections: BS1's cause closed upstream (`010/020`) and the
  relax question is atelier `010/160`, 🎯 the owner's — noted dated in the
  onramp, stop unchanged; the hand-check command named the worker's own
  worktree as `$F`; and `rebuild --from-index` adopted as the narrowing half.

### ⏳ Left owed: `spicy-option-chip` (ADR 0121, roadmap `200/080`)

Reviewed and **fit to merge**: `node --test` 1318/1318 and `addon_check`
64/64 from its worktree. Not merged only because the clock ran out — a merge
here costs one ~3-minute hook run plus two conflicts (`site/sw.js`: keep
`SHELL_VERSION 2026-09-21.1` from the branch AND `DATA_VERSION 2026-09-20.2`
from main; `docs/decisions/README.md`: append-tail, keep 0119, 0120, then
0121) and a `board.py rebuild` — its CI `floor` run was red for exactly that
stale index. Its worktree `faves-stashcheck`/`faves-floor` siblings are also
still present; delete all three worktrees and branches at that merge.
🚩 **One thing for the owner in that branch** (ADR 0121 says it too): it
centralises heat into `site/js/heat.js` — three tags, one regex — beside his
2026-09-07 `340/230` ruling that one shared source of truth for tag labels is
*"declined for today"*. Heat only; the DIETARY/ALLERGEN mirrors are untouched.

### 🔎 Read at the pin bump, worth knowing

Atelier since `eb6449d`: **"cheapest model that does the job well, for every
job"** (2026-09-19) — state your tier, never ask; Fable stays the cold-review
tier. `plainscan` destroyed 2026-09-18. Dispatch prompts must name each worker
an explicit, unique, absolute scratch directory — a worker told to write
nothing wrote five files into bare `/tmp`. Hand-up branches are
`report-<subject>-<HHMM>`, no repo token. "Verify the act, not the absence of
an error" — confirm a commit by `git log -1`, a push by the remote ref.
Faves' pending-upstream line in `docs/roadmap/README.md` survives this bump
legitimately: atelier `310/060` and `310/070` are still `[ ]`. The
corroboration to atelier `320/160` that ADR 0120 says is owed is **still
owed** — not started, on the clock rule.

