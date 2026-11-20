- **2026-07-08 (roadmap Theme 2, step 1 — coords + native maps)**: Started
  the post-launch roadmap. Added optional `lat`/`lng` (WGS84) to the venue
  schema and geocoded all 12 venues from their addresses via OpenStreetMap
  Nominatim (a dev-time tool — nothing shipped; the awkward ones —
  Khandallah Trading Co's corner, Charley Noble — pinned by business name).
  Built the native-maps handoff (`site/js/geo.js`, [ADR 0005]): the menu
  screen's address row now opens the device's *own* maps app — Apple Maps
  on iOS/macOS, a `geo:` link to the default app on Android, Google Maps on
  desktop — at exact coordinates, replacing the hardcoded Google web link.
  Split into a testable `detectPlatform(nav)` + pure `mapsUrlFor()`; 20 JS
  tests pass. `validate.py` now range-checks coords and warns when a venue
  lacks them; `geo.js` added to the SW precache; VERSION → 2026-07-08.4.
  Real-browser check (Chrome/Mac): Pickup row renders a maps.apple.com pin
  at the exact lat,lng. Docs: ARCHITECTURE schema + rule, CHANGELOG, ADR
  0005 (rejected: one Google link for all; a tile map; runtime geocoding).
  This `lat`/`lng` also seeds the Theme 2 distance-sorted "what's close"
  list. **Owner still to decide:** whether the flagship Order tally
  (Theme 1) is in — that unlocks its STRATEGY non-goal clarification — and
  the SBOM format/location (Theme 7 remainder).
