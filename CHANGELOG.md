# Changelog

Notable changes to Faves, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This is a
curated site, not a released package, so there are no version tags yet —
everything sits under _Unreleased_ until the first public launch.
Per-restaurant "verified on" dates in the menu data track content
freshness separately from this file.

## [Unreleased]

### Added
- "Open now" filter: a toggle in the home results head narrows the list
  to venues open right now (or closing soon), using the hours engine.
  Combines with the service/area/cuisine filters and the "Pick for us"
  shuffle; venues with unknown hours drop out (the honest reading of
  "open").
- Recommended pairings: a menu item can carry a `goesWith` list ("goes
  well with…") shown as deep-link chips to the paired dishes, in the same
  record or cross-record. Seeded on Cook-at-Home mains (e.g. Shane's Ribs
  → Creamy Mushrooms, Turkish Flatbread, Sticky Date Pudding). See ADR
  0007 (chosen over reorganising Cook-at-Home around meals).
- Dish & venue photos: schema + rendering are in place — an optional
  `image` (+ required `alt`) on a venue shows a card photo, and on a menu
  item a dish photo, both lazy-loaded with a reserved aspect box (no
  layout shift) and self-hosted (offline-safe). Rolls out per venue as
  the owner adds photos to `intake/`.
- Live opening-hours status: home cards and the menu screen now show
  "Open · until 9pm" / "Closing soon · closes in 30 min" / "Closed ·
  opens 5pm", computed in New Zealand time (not the viewer's clock) so
  it's right for a guest browsing from anywhere (hours are stored as
  venue-local time, never UTC — a fixed UTC instant would drift across
  NZ's daylight-saving switch; a viewer whose device isn't on NZ time
  sees an unobtrusive "NZ time" label rather than a misleading
  conversion). The menu screen also
  shows the week grouped into ranges with today highlighted, and
  lunch/dinner splits rendered inline ("12pm–3pm, 5pm–9pm"). Backed by a
  new machine-readable hours model and a pure engine (`site/js/hours.js`)
  with unit tests.
- "Near me" distance sort (roadmap Theme 2): a home-screen toggle that
  uses the device location (`navigator.geolocation`) + haversine to sort
  venues nearest-first, showing each one's distance ("1.2 km") on its
  card. No tile map, no map library, no external request — offline-safe
  and zero-dependency; declining the location permission just keeps the
  usual order. Pure logic in `site/js/distance.js` with unit tests.
- Native maps handoff (roadmap Theme 2): tapping a venue's address on the
  menu screen now opens the device's own maps app — Apple Maps on
  iOS/macOS, the default maps app via a `geo:` link on Android, Google
  Maps on desktop — at exact coordinates. Added `lat`/`lng` (WGS84) to
  every venue in the schema, geocoded from their addresses, with
  validation and unit tests (`site/js/geo.js`).
- "Pick for us" (Phase 4): a shuffle over the filtered set that lands on
  one place with a deep link; instant under reduced-motion.
- Offline PWA (Phase 5): service worker precaches the app shell and all
  menus; network-first data, cache-first shell, capped image cache.
- Share/SEO polish (Phase 6): Open Graph + Twitter card + canonical meta
  on both screens, and a 1200×630 share image.
- Development conventions adopted from the `ros`/`tiki` repos: decision
  records under `docs/decisions/`, an append-only `docs/SESSIONS.md`,
  `CONTRIBUTING.md`, and this changelog.
- JS unit tests for the pure filter logic (`node --test`), run in CI
  alongside menu-data validation.
- Zero-dependency guard (`tools/check_no_deps.py`, a CI job) enforcing
  the no-third-party-components invariant from ADR 0001.

### Changed
- Menu section headings now stick under the jump-nav while you scroll a
  long menu, so which section you're in ("Pub Snacks", "Pub Mains") stays
  visible instead of scrolling away; the next heading pushes it up. Dish
  deep-links (picks, "goes well with") account for the taller sticky
  stack.
- Restaurant cards now respond to hover: the whole card lifts with a
  deeper shadow, an accent border, and the name tints to accent. Only on
  cards that link somewhere (not "coming soon" stubs), only on true-hover
  devices (no sticky state after a touch tap), and motion-free under
  `prefers-reduced-motion`; keyboard focus gets the same accent border.
- Corrected the `CLAUDE.md` zero-build wording: Node may be used for dev
  tooling (Lighthouse, tests) but is never a build or runtime dependency;
  the site still ships build-less.

### Fixed
- Dark-mode colour contrast on the "Call to order" label (WCAG 2.2 AA),
  bringing the menu screen to Lighthouse Accessibility 100.
