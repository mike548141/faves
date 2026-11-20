**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 65+1 -->
- [2026-07-08 · 2026-07-08 (smart default order + heart polish)](2026-07-08-archived-013-2026-07-08-smart-default-order-heart-polish.md) — archived entry, verbatim in its file

- **2026-07-08 (smart default order + heart polish)**: Owner idea — the
  home list should surface places you can actually order from now and sink
  the rest. New pure module `site/js/ranking.js`: `availabilityTier`
  (0 open incl. closing-soon + recipes / 1 opening-soon / 2 unknown-hours /
  3 closed), `rankVenues` (sort key: reachable-before-far → tier → nearest
  → curated index; attaches `distanceKm` when origin known), and
  `isAvailableNow` for the picker. Key nuances the owner called out, all
  honoured: "closing soon" still counts as open (you might be 2 min away);
  opening within the hour counts; a faraway favourite (Queenstown) sinks
  below everything reachable, but only when we know your location (`FAR_KM`
  = 50 km straight-line). Wired into app.js (replaced the `state.origin`-only
  distance sort with `rankVenues` on every render) and the picker (draws
  from the available set, falls back to all filtered if none). Removed the
  now-superseded `sortByDistance` from distance.js + its 3 tests; added
  `tests/ranking.test.js` (12 tests). Browser-verified at 390px in headless
  Chrome: card order is tier-monotonic (Cook at Home + open on top → unknown
  → closed at the very bottom, Spices Indian last); over 12 reduced-motion
  picker runs it never landed on the one closed venue. **Also** (owner
  follow-up): made the favourite ♥ larger (48/52 px, ~1.7–2.1 rem) and
  higher-contrast — grey outline unsaved, filled accent saved — with a
  hover scale (pointer devices) and a springy save-pop, motion-free under
  reduced-motion; verified via screenshots. node --test 77→85 all pass;
  validate.py + check_no_deps.py clean. VERSION → 2026-07-08.17; ranking.js
  precached. CHANGELOG + ROADMAP + ARCHITECTURE updated.
