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
