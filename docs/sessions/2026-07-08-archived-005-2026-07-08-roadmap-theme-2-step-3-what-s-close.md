**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 49+1 -->
- [2026-07-08 · 2026-07-08 (roadmap Theme 2, step 3 — "what's close")](2026-07-08-archived-005-2026-07-08-roadmap-theme-2-step-3-what-s-close.md) — archived entry, verbatim in its file

- **2026-07-08 (roadmap Theme 2, step 3 — "what's close")**: Cashed in the
  coordinates with the distance-sorted list. New `site/js/distance.js`
  (pure: haversine + `sortByDistance` + `formatDistance`) and a "📍 Near
  me" toggle in the home results-head, JS+geolocation-gated (hidden when
  unavailable). On tap it requests the device location, sorts venues
  nearest-first and shows each one's distance on its card; coordless
  records (Cook-at-Home, un-geocoded stubs) sink to the end keeping order;
  a second tap restores the curated order. Declining the permission is a
  first-class path — a matter-of-fact status line, list unchanged. No tile
  map by design (needs a CDN library + external tiles → breaks three
  constraints; see ADR 0005). 9 new JS tests (29 total) using real
  Wellington coords; VERSION → 2026-07-08.5; `distance.js` precached.
  Real-browser check (Chrome): `app-ready`, the Near-me button renders
  unhidden, 13 cards, no errors. Docs: CHANGELOG, ROADMAP Theme 2 all
  three items ticked. This closes Theme 2; Theme 3 (design pass — sticky
  search, right-hand info panel) is the next unblocked work.
