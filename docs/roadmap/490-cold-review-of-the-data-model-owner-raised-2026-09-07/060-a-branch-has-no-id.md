- [x] 🔎 **A branch has no id, and every per-branch plan needs to name one**
      `[S][schema][tools]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §6 C4, §7 E1).
      Engineering call; recommended, and a precondition for `210/040`.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — worktree
  `/Users/mike/worktrees/faves-o1-branch-ids`, branch `branch-ids`, on
  `origin/main@89e66b2`. **ADR 0103**; `DATA_VERSION` → `2026-09-08.4`.

  **What landed.** `tools/seed_branch_ids.py` (`--check`/`--only`/`--skip`/`-v`,
  the section seeder's shape), 47 branches seeded across 12 records from their
  labels, `id` added to `BRANCH_KEYS`, and `check_branch_id` in `validate.py`
  gating presence, non-emptiness, slug form and uniqueness-within-record.

  **The count.** Re-verified rather than inherited: the tool's own `--check`
  reports 47, matching the item.

      ✗ 47 branch(es) across 12 file(s) have no "id".
      ✓ seeded 47 branch(es) across 12 file(s) (47 in 57 file(s) scanned).
      ✓ every one of 47 branch(es) in 57 file(s) carries its own "id".

  The diff is **47 insertions, 0 deletions** — a byte-exact text insertion, no
  reflow, no reorder, so `locations[0]` is the same branch it was. Measured
  cost against `origin/main`: **+1312 bytes raw, +330 gzipped** (the item
  estimated ~1 KB).

  🔎 **The gate was break-probed, not just asserted.** With
  `check_branch_id` removed, a `pandan-asian-cuisine` record whose two branches
  share the id `melling` validates **clean — exit 0, "All 57 restaurant
  file(s) valid"**. Restored, it errors. That matters more here than for
  `sectionId`: nothing renders a branch id, so a duplicate has no visible
  symptom anywhere and the gate is the only thing that can ever report one.
  `test_validate.py` carries four cases for it (140 → 144).

  ⚠️ **Immutability is a practice, not a guarantee, and that is not new.**
  Nothing in the repo compares an id against the committed tree — not for
  branches, and not for `dishId` or `sectionId` either. What enforces it is the
  seeder's refusal to overwrite plus the field sitting next to the label a
  renamer is editing. Stated plainly in ADR 0103 rather than implied.

  📌 **`split_data.py` deliberately untouched.** `data/history/` holds price
  and dish rows only, keyed on `sectionId` + `dishId` (ADR 0099); no row is
  per-branch, because no price in `site/data/` is per-branch yet. A branch
  component belongs in that key the day ADR 0080 D4's overrides land, and the
  id this delivers is what it will use.

  **The fact.** `BRANCH_KEYS` in `tools/validate.py:121-124` is `label, address,
  lat, lng, phone, hours, timezone, detailsVerified, detailsVerifiedBy`. No `id`.
  A branch is addressed by position (`locations[0]` is projected to the top level
  by `data.js:33-44`) and by `label`, which is optional in the schema, free text in
  the corpus, and universal only by habit (47 of 47 carry one).

  **What needs to name a branch.** Per-branch closure, owner-ruled 2026-08-22 and
  sized `[L]` (`210/040`); per-branch price overrides, held by ADR 0080 D4 in
  Square's `absent_at_location_ids` shape, which is a list of ids; the standing
  direction to carry every Wellington-region branch of every chain (`080/120`),
  which makes the lists grow and reorder; `080/100` Q2, which already suspects
  Pizza Hut's prices are not Johnsonville's. A relocated or renamed branch has no
  `formerIds` equivalent, so a reorder silently changes which branch is
  "primary" and a label edit is invisible to everything.

  📋 **The work, in ADR 0051's own shape.** Seed `id` on all 47 branches from the
  label, immutable thereafter, required by `validate.py`, unique within the
  record; a `tools/seed_branch_ids.py --check` beside the dish and section
  seeds. (The `pathscan:allow` that sat here — "a PROPOSED tool this item
  would create" — went when the tool did.)
  Cost: about 1 KB gzipped across the corpus. The screen that reads it is the one
  `210/040` will build, and until then it is the key the record store and the
  order line (which stores the primary's phone, `menu.js:1479`) can carry.
