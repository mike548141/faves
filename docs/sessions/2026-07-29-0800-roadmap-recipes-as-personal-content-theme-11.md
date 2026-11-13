- **2026-07-29 (roadmap: recipes as personal content — Theme 11)**: Owner
  steer captured — Cook at Home should stop publishing *all* 24 curated
  recipes to everyone; recipes should also live in the private personal layer
  and be shared like favourites/ratings/dietary/allergens (Themes 9/10),
  while still publishing *some* publicly. New **Theme 11** in `ROADMAP.md`
  with the four asks split by dependency: **11a** per-recipe hide `[S]` (no
  backend, no schema, severable — ships alone); **11b** own-recipe CRUD
  `[L][schema][design]` (local-first, never enters the repo, export/import
  from day one); **11c** per-item sharing `[M]`; **11d** family shared set
  `[L]` ⚑; **11e** which of the 24 stay public ⚑. **The load-bearing
  finding:** this is Faves' first *user-authored content* — everything in the
  personal layer today is small state pointing at repo data, so recipe bodies
  hit storage, the ADR 0017 sync blob, the Theme 10 grant model and the
  editor UI at once. Two grant-model gaps stated plainly rather than assumed
  covered: sharing recipes needs **per-item** grants (Theme 10 is per-scope),
  and a family set is **multi-writer** (Theme 10 is read-only one-way).
  Cross-refs added both ways. 🚩 **11e is coupled to the pending
  family-texture rulings** (Theme 8): moving the non-family attributions
  ("Shane's Ribs", "Jesse's ...") private is a *third* option beside
  keep/rename — flagged in both places so they aren't ruled independently.
  Docs-only; gates run anyway (validate ✅ 28 files, no-deps ✅, SBOM ✅).
  **⚑ Still flagged, still not done:** atelier pin `4f637b0` is now ~21+
  commits stale — the drift audit + pin bump remains queued.
  🛑 **New finding — the `floor` CI workflow has been red since 2026-07-25**
  and it is *not* this change: five consecutive failures starting at
  `aabb762` ("call atelier's scanner floor instead of copying it"). Cause is
  structural, not a content defect — **leakscan is enforced on the CI plane
  but CI has no local term list**, so it cannot guarantee cover and blocks
  (today's message: "cover not guaranteed — the ci plane does not pass
  `--require-terms`"; the 2026-07-28 run failed the same way with the older
  wording, "no local term list found ... 86 finding(s)"). The same commit
  passes leakscan *locally*, where the owner's term list is present, so the
  content is clean either way. **Not fixed here** — deciding how CI gets
  cover (ship a term list, downgrade the CI plane to advisory, or take
  atelier's newer answer) belongs with the queued drift audit, and the
  `CI` workflow itself is green (`30433814355`).

