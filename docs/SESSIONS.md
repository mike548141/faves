# Faves session log (append-only)

One entry per working session, newest LAST. Append only — never edit or
rewrite prior entries. At session start, read only the last few entries
(e.g. `tail -60 docs/SESSIONS.md`); the full history is for grepping, not
for loading into context. Convention adopted from `ros`/`tiki`
(2026-07-08).

- **2026-07-06 and earlier (backfilled from git history)**: Phase 0
  foundation — strategy/architecture/design/workplan + restaurant stubs.
  Built the home and menu screens (Phase 2/3), added five more venues and
  the Cook at Home recipes collection ([ADR 0003]). Created `intake/` for
  menu/recipe source material; transcribed menus (Spices, Takeaway, Thai
  Tara) and 24 home recipes from paper/scan sources — prices from paper
  menus, not delivery apps. Flagged every venue's `verified` null so the
  menu screen shows a "needs a refresh" caveat. Added `tools/serve.py`
  (laptop + phone dev server), the favicon/PWA icon set + `site.webmanifest`,
  `docs/ROADMAP.md`, the Apache-2.0 LICENSE, and the Cloudflare Pages
  hosting-as-code (`tools/deploy.py` + `docs/DEPLOY.md`, [ADR 0004]).

- **2026-07-07 → 08**: **Phases 4–6.** Built "Pick for us" (Phase 4) —
  a 🎲 FAB opens a `<dialog>` that shuffles the *filtered* set, easing out
  to land on one place with a deep link; reduced-motion = instant. Built
  the offline PWA (Phase 5): `site/sw.js` precaches the shell + all 13
  menus, network-first data / cache-first shell (`ignoreSearch` so one
  cached `restaurant.html` answers every `?id=` deep link) + capped image
  cache; documented the "bump `VERSION` on data edits" rule. Phase 6
  polish: og:/twitter: + canonical meta on both shells, a 1200×630
  `og-image.png`, first-visit transfer measured at 45.3 KB gzipped
  (< 300 KB). Ran mobile Lighthouse via `npx lighthouse` (Node is now on
  the machine) against the dev server — home 97/100/100/100, menu
  100/100/100/100; fixed one dark-mode contrast fail on the "Call to
  order" label to reach A11y 100. Remaining: real-device smoke test
  (owner) and Phase 7 deploy (needs owner's Cloudflare OAuth + API token).

- **2026-07-08 (conventions)**: Adopted the `ros`/`tiki` working
  conventions, adapted to a build-less static site — commit-as-you-work +
  `area: subject` messages, documentation-as-code (this log + ADRs in
  `docs/decisions/`, backfilled 0001–0004), `CONTRIBUTING.md`, TODO
  markers, and lockstep rules in `CLAUDE.md`. Corrected the stale "no
  Node/brew" wording (Node now exists for dev tooling only; the site
  still ships build-less). No `man` page — faves is a website, not a CLI.
  Added JS unit tests (`node --test`, zero-dep, in CI) for the pure
  filter logic, `CHANGELOG.md`, and `docs/MODEL-ECONOMICS.md` (adapted
  from ros: Opus builds / Fable reviews, session hygiene, ~27k read-path
  budget). Not adopted (N/A here): ros's secrets/sops tooling, the
  immutable `archive/`, and ruff/mypy on the four stdlib `tools/` scripts.

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

- **2026-07-08 (live opening hours — the parked "Open now", expanded)**:
  Owner asked for relative-time hours ("open for another 40 min"),
  open/closed status on the home list, and easy navigation of split
  (lunch/dinner) hours. All three needed a machine-readable hours model,
  so redesigned `hours` from `[{days,open,close}]` (free-text days, single
  interval — can't express a split or be computed) to a full week keyed
  `mon`…`sun`, each day a list of `[open, close]` intervals (`[]` =
  closed, `null` close = "late"); see [ADR 0006]. Migrated all 8 venues
  with hours in place (surgical text edit — a naive json.dump reserialise
  blew the diff to 4.5k lines and was reverted). New pure engine
  `site/js/hours.js`: `nzNow()` (the only impure bit — reads the clock in
  **Pacific/Auckland**, not the device tz, so it's right for a guest
  anywhere), `openStatus(hours, now)` → open/closing-soon/closed/
  opening-soon/unknown with relative detail, and `groupWeek()` merging
  identical days into ranges + carrying dow indices for "today". Home
  cards gained a live badge; the menu screen a status line + grouped week
  (splits inline "12pm–3pm, 5pm–9pm", today highlighted). 15 new JS tests
  (44 total) covering the afternoon gap, closing-soon, week-wrap, "late".
  validate.py enforces the 7 keys / HH:MM / close>open. VERSION →
  2026-07-08.7; `hours.js` precached. Browser-verified both screens at
  Wed 05:30 NZ (all "Closed · opens …" with correct next-open times;
  KTC's Tue–Wed row highlighted). Data still owner-unverified — the badge
  is only as right as the hours held. Follow-on teed up: an "Open now"
  *filter*. Note: distance sort (the owner's other bullet) already shipped
  earlier this session as "📍 Near me".
