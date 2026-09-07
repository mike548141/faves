- [ ] 🔎 **A branch has no id, and every per-branch plan needs to name one**
      `[S][schema][tools]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §6 C4, §7 E1).
      Engineering call; recommended, and a precondition for `210/040`.

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
  record; a `tools/seed_branch_ids.py --check` beside the dish and section seeds. <!-- pathscan:allow: a PROPOSED tool this item would create — it deliberately does not exist yet -->
  Cost: about 1 KB gzipped across the corpus. The screen that reads it is the one
  `210/040` will build, and until then it is the key the record store and the
  order line (which stores the primary's phone, `menu.js:1479`) can carry.
