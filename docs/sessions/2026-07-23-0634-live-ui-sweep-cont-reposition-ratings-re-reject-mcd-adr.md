- **2026-07-23 (live-UI sweep, cont.: reposition, ratings re-reject, McD, ADR
  0020)**: Continuation of the live-feedback stream (the "live-UI defect sweep"
  entry earlier covers batch 1). Shipped: (1) **back-to-top repositioned** — on a
  wide laptop it sat in the far viewport corner, out of eye line; anchored its
  right edge to the `.wrap` content column (`max(space-3, 50vw − 30rem +
  space-3)`) so it hugs the list/menu, pinning to the gutter on narrow screens;
  (2) **Settings "Maps app" moved below Distance** (owner pref); (3) **McDonald's
  → 5 branches** — added Bunny Street, Johnsonville, Porirua (real addresses/
  phones from web search; still a stub, coords omitted). Design/records: (4)
  **Ratings v3 reopened** — owner reviewed the shipped 1–5 slider (ADR 0019) and
  **rejected it too**; declined to pick a v3 paradigm (plain stars / emoji faces
  / number pills floated) and **parked** the choice as a ROADMAP redesign; the
  slider **stays live** meanwhile (no revert asked — flagged open). (5) **ADR
  0020 — favourite/rating reference integrity** (proposed, build deferred): owner
  asked how a favourited/shared dish/venue is handled when missing on open
  (removed vs stale-cache). Recorded the honest design — never silently drop,
  never claim "removed" without an online recheck (indistinguishable locally) —
  **coordinated with ADR 0017 (sync) + Theme 10 (sharing)** so the merge/refresh
  UX is built once. (6) **Decisions README hygiene** — indexed the previously-
  unlisted ADRs 0015, 0018, 0019, 0020 (index now matches files, no gaps).
  CHANGELOG topped up (favourites-hover + profile-panel fixes, back-to-top
  reposition). SW SHELL bumped through .82, DATA .76. **⚠️ Parallel session live
  throughout** — every commit was `pull --rebase` before + push immediately + an
  ADR-number collision guard; no collisions, linear history alongside the other
  session's Theme 10 / ADR 0017 work. **Open questions surfaced to the owner at
  close** (interim ratings slider keep vs remove; deep-link scroll instant vs
  smooth; McDonald's stub depth). Verify at close: `node --test` 278 pass,
  `validate.py` 28 files valid, `check_no_deps.py` holds; tree clean, all pushed.

