**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 69+1 -->
- [2026-07-08 · 2026-07-08 (weighted favourite/distance metric + user settings)](2026-07-08-archived-015-2026-07-08-weighted-favourite-distance-metric.md) — archived entry, verbatim in its file

- **2026-07-08 (weighted favourite/distance metric + user settings)**:
  Owner asked whether favourites vs distance was balanced (does a favourite
  2 km away beat one 30 km away — yes, distance was already the within-fav
  tie-break) and to make the dials user-controllable, defaulting the
  favourite pull to 10 km. Reworked `rankVenues`: instead of favourite as a
  hard sort dimension above distance, a favourite is now treated as
  `favBoostKm` (default 10) *nearer* — "effective distance = actual −
  boost". So a favourite 8 km beats a plain place 2 km, but a favourite
  30 km (→20) sits below it; between two favourites the nearer wins. The
  `farKm` reachability gate still measures *actual* distance (the boost is
  preference, not reach). Sort key: reachable → tier → effective distance →
  favourite-tiebreak → curated; used a safe `cmp` since Infinity−Infinity
  (coordless venues) is NaN. New `settings.js` model (device-local
  `faves.settings.v1`, clamp/sanitise on read, `FAV_BOOST_KM`/`FAR_KM`
  defaults sourced from ranking.js) + `settings-ui.js` (⚙ in the home
  header → dialog with two live sliders + reset). app.js passes the dials
  into `rankVenues`/`isAvailableNow` and re-ranks on `settings.subscribe`.
  First **preferences** surface in the app. 11 new tests (settings 7 +
  ranking weighted 4; 100 total). Browser-verified at 390px: ⚙ opens,
  sliders show 10/50, dragging writes {favBoostKm,farKm} + updates labels,
  reset restores, and Near-me (CDP geolocation at CBD) ranks 23 cards by
  distance with no errors. node --test 89→100 pass; validate.py +
  check_no_deps.py clean. VERSION → 2026-07-08.19; settings.js +
  settings-ui.js precached. Roadmap: logged **pick-along-a-route** (owner
  idea) under Theme 2 — least-detour haversine sort (offline) + maps
  handoff; a live routed corridor is ✗ on the no-API constraint. CHANGELOG
  + ROADMAP + ARCHITECTURE updated. (Prior batches 24c334f + 4eeeb17 were
  pushed to origin/main earlier this session.)
