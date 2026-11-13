- **2026-07-28 (family-texture review — Fable session)**: The queued Theme 8
  pre-public gate (owner ruling 2026-07-24), run as scoped review work per
  MODEL-ECONOMICS (Fable reviews; findings, not rewrites). Claimed on `main`
  first (`03afa73`). **Method:** full-tree `leakscan --require-terms`
  (structural + the owner's local term list) + word-boundary sweep of
  household names, age markers, and address shapes across every tracked file.
  **Result:** 44 whole-word family-name instances in four classes — approved
  recipe attributions; test fixtures (incl. the leakscan-flagged name at
  `tests/profiles.test.js:162`, the review's trigger); doc/comment examples
  (one in shipped `cart.js`); and two **non-family** first-name attributions
  ("Shane's Ribs", "Jesse's Garlic Chicken Thighs") that sit *outside* the
  written 2026-07-06 exception. Nothing else found: no other household names,
  no ages/birthdays/personal addresses; `intake/` payloads untracked. Record
  → `docs/reviews/2026-07-28-1138-family-texture-review.md`. ⏳ **Owner-owed:**
  four rulings queued in the record (non-family attributions, fixture rename,
  live-doc examples, history stance — history rewrite recommended *against*);
  fixes after ruling = one small Opus session. **⚑ Flagged, not done here:**
  atelier doctrine has moved ~21 commits past pin `4f637b0` (floor/records
  work incl. a secretscan fragment-match fix) — queue a drift audit + pin
  bump for an Opus session; out of scope for a billed review. Verify: floor
  hook green on both commits; pushed CI result cited at close.

