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

- **2026-07-08 (dish/venue photos + recommended pairings)**: Two owner
  ideas, both taken as "build now" (recommended options). **Pairings**
  ([ADR 0007]): optional `goesWith` per menu item (same-record dish name
  or `id#Dish` cross-record) → "Goes well with" deep-link chips; chosen
  over a heavier reorg-around-meals. Seeded real pairings on Cook-at-Home
  mains (Shane's Ribs → Creamy Mushrooms, Turkish Flatbread, Sticky Date
  Pudding; etc.). `validate.py` resolves every ref via a new dataset-wide
  name pre-pass, so a broken pairing fails CI. **Photos**: schema
  (`image` + required `alt`, at venue and item level) + rendering — a card
  photo and a menu dish photo, `loading="lazy"` + `decoding="async"` with
  an aspect-ratio box so lazy-load causes no shift; self-hosted under
  `site/img/`. Engineering shipped; it's now a sourcing task (drop photos
  into `intake/`). Caught a real bug in verify: `li.append(null)`
  stringifies to a literal "null" text node — the dish-photo null slipped
  through because `li.append(...children)` bypasses the `el()` helper's
  null filter; fixed by pushing only real nodes. Browser-verified both:
  pairing chips deep-link to the right dish anchors, a temporarily-injected
  test image rendered, and no stray "null". VERSION → 2026-07-08.8. Also
  captured Theme 4b in the roadmap. **Owner still to decide:** the Order
  tally (Theme 1) go-ahead, and SBOM format/location (Theme 7).

- **2026-07-08 (batch 4: +11 venues, filters, sticky headings, roadmap)**:
  Built the **"Open now" filter** (results-head toggle, reuses the hours
  engine; unknown-hours venues drop out) and **sticky menu section
  headings** (pin under the jump-nav; dishes got scroll-margin so pick /
  goesWith links clear the stack). Added **11 Wellington venues as stubs**
  via 3 parallel research agents → verified facts, geocoded (Nominatim),
  everything unconfirmed left null. Corrections found: "Chilly Pot" is the
  nickname for **Babaili Malatang** (45 Dixon St, not 41/47); "Goldling" is
  **Gold Lining** (BNZ building); "Rock Yard" is **Rock Yard Vietnamese
  Restaurant**. Froyo: **none verifiable** in central Wgtn (Frogurt closed,
  KiwiYo not here, Kaffee Eis is gelato). Multi-location (Gong Cha,
  Babaili, Kaffee Eis) added as single flagship records pending the
  multi-location schema (roadmapped). Captured many roadmap ideas: hearted
  favourites (local-only; multi-person = device profiles, cross-device =
  out of scope), user contributions (mailto → intake/), drive time, price
  per person, public reviews (link-out), busy times (✗ no API), multiple
  locations, home global search. Low-confidence data flagged for owner
  check: The Catch phone (nulled), Gong Cha phone. VERSION → 2026-07-08.12.

- **2026-07-08 (Cook at Home full recipe pages)**: Owner wanted tapping a
  recipe name to open it in full, not just the inline expand. Added a new
  screen `recipe.html` + `site/js/recipe.js` (self-contained, like the
  other screen modules): reads `?id=&dish=`, renders the whole recipe —
  meta, photo, tags, ingredients, method, and "goes well with" chips
  linking to the other recipes' full pages; back-links to the collection.
  In `menu.js`, recipe dish names became links to it (restaurant dishes
  stay plain); the inline `<details>` quick-expand is kept. Deep-linkable
  and shareable; SW precaches `recipe.html`+`recipe.js`, served via
  `ignoreSearch`. Browser-verified: Shane's Ribs full page + every list
  name links correctly. VERSION → 2026-07-08.13. ARCHITECTURE updated.

- **2026-07-08 (global search on the home screen)**: Built the roadmapped
  home-screen global search (Theme 3) — one box that finds a **place or a
  dish** by name across every venue and Cook at Home. New pure module
  `site/js/search.js` (`buildIndex` + `search`): indexes places (name +
  area + cuisine) and dishes (name + desc + ingredients) from the already-
  loaded records, ranks name-start > later-word > substring > haystack,
  returns `{places, dishes}` each `{total, items}` (capped, total kept so
  the UI says "12 of 30"). Dish results deep-link to `#dish-…` (or the
  recipe page). To make those anchors provably match the menu/recipe
  screens, extracted the duplicated `slug()` into a shared `site/js/slug.js`
  and had menu.js + recipe.js import it (single source for the anchor
  scheme). Wired into app.js: `body.searching` hides the browse cards,
  filters and shuffle FAB while a query ≥2 chars is live; clearing restores
  browse. Search field + results are a JS-only enhancement (hidden until
  app.js unhides), so the no-JS fallback list is untouched. 10 new unit
  tests (place/dish/cuisine/ingredient match, recipe href, slug scheme,
  min-length, caps) — all 58 pass; validate.py + check_no_deps.py clean.
  Browser-verified in real headless Chrome at 390px via a zero-dep CDP
  driver (Node 24 global WebSocket): typed queries, confirmed grouped
  results, correct cross-venue deep-links, browse-view hide/restore.
  VERSION → 2026-07-08.14; search.js + slug.js precached. CHANGELOG +
  ROADMAP + ARCHITECTURE updated.

- **2026-07-08 (order tally — Theme 1 flagship)**: Built Job 3, "right,
  let's order" — the owner greenlit it (chose to continue this session
  rather than start fresh; continuing was cheaper since the data shapes,
  slug/deep-link and localStorage-layer context were already warm). New
  pure model `site/js/cart.js` (`createOrder` store + `groupByVenue` /
  `orderTotal` / `orderCount`, injectable storage, memory fallback for
  private mode, tolerant of corrupt payloads) with 11 unit tests. UI in
  `site/js/cart-ui.js`: a shared `dishStepper` (+/−/count bound to the
  singleton `order`, self-updating via subscribe) on restaurant dish rows,
  and an injected floating order FAB + dialog (grouped by venue, per-venue
  Call link + subtotal, estimated grand total captioned "confirm at the
  till", collect mode to tick off at pickup, two-tap Clear). `initOrderUI()`
  called from app.js/menu.js/recipe.js so the order is reachable from every
  screen; cross-tab synced via the `storage` event. **Scope calls:** v1 is
  a single shared order (multi-person local profiles deferred); recipes get
  no stepper (Cook at Home is for cooking, not an order — that's the health
  app's eating-diary hook). STRATEGY non-goal clarified so the notepad-vs-
  ordering distinction is on record (the ⚑). Browser-verified in headless
  Chrome at 390px: steppers add/increment, FAB count + aria-label, dialog
  groups/subtotal/total ($72 for 2× Chicken Satay + 1× Beef Satay), collect
  mode ticks lines, order persists across a navigation to the home screen,
  two-tap clear empties and hides the FAB. node --test 68→ (11 new) all
  pass; validate.py + check_no_deps.py clean. VERSION → 2026-07-08.15;
  cart.js + cart-ui.js precached. CHANGELOG + ROADMAP + STRATEGY +
  ARCHITECTURE updated.

- **2026-07-08 (hearted favourites — local personal layer, part 2)**:
  Built the ♥ favourites feature (roadmap Theme 5), extending the same
  device-local layer as the order tally. Extracted `site/js/store.js`
  (`safeStorage` with the private-mode memory fallback) and refactored
  cart.js onto it. New DOM-free model `site/js/favourites.js` (`createFav­
  ourites` store; `favKey`/`favHref` identity + deep-link; venues and
  dishes; denormalised so the view renders from storage alone) with 9 unit
  tests. `favourites-ui.js` is the self-syncing ♥ toggle (bound to the
  shared `favourites` singleton; `stopPropagation`/`preventDefault` so a
  heart inside a link/row toggles without navigating). Hearts added to
  every dish row + the venue/collection header (menu.js) and the full
  recipe page (recipe.js). Home gained a **Favourites** toggle beside the
  search box (placed *outside* the browse-only region so it stays reachable
  in the view) opening a panel that reuses a new shared grouped renderer
  `results-view.js` — which I refactored the global-search rendering onto
  too (Places/Dishes groups, now with an optional trailing node per row for
  the inline un-heart). Search and the favourites view are mutually
  exclusive (module-level `exitSearch`/`exitFavourites`). Caught a Write
  gotcha: a literal NUL crept into `favKey`'s separator; swapped to a space
  (venue ids are slugs, so unambiguous) and a test caught it. Browser-
  verified at 390px in headless Chrome: heart a dish + venue on the menu →
  home toggle shows count 2 → panel groups them with correct deep-links →
  un-heart from the view removes in place and drops the count → global
  search still renders correctly after the shared-renderer refactor.
  node --test 68→77 (9 new favourites tests; cart refactor intact) all
  pass; validate.py +
  check_no_deps.py clean. VERSION → 2026-07-08.16; store.js, favourites.js,
  favourites-ui.js, results-view.js precached. CHANGELOG + ROADMAP +
  ARCHITECTURE updated.

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

- **2026-07-08 (favourites influence the sort order)**: Owner follow-up:
  favourites should lift a place in the home order too — an open, nearby
  *favourite* (venue, or a venue holding a favourite dish) should sit
  higher. Added a `favouriteIds` Set param to `rankVenues` and slotted a
  favourite dimension into the sort key **between availability and
  distance**: reachable → tier → favourite → nearest → curated. Chosen so a
  favourite lifts within its tier but never overrides availability (a closed
  favourite you can't order from still sits below anywhere open), and beats
  distance within a tier so favourites have visible pull even with "Near me"
  on (`FAR_KM` still gates the genuinely-unreachable). app.js flattens both
  venue- and dish-hearts to venue ids (`new Set(favourites.items().map(e =>
  e.venueId))`) and re-ranks on any favourites change (`favourites.subscribe
  (render)`), so hearting re-orders live / across tabs. ranking.js stays
  pure (takes a plain Set, not the store). 4 new ranking tests (89 total).
  Browser-verified at 390px: favouriting the *last* open venue (Khandallah
  Trading Co) moved it 5→0; favouriting a *dish* in another (Sprig + Fern)
  moved that venue 5→0 too. node --test 85→89 pass; validate.py +
  check_no_deps.py clean. VERSION → 2026-07-08.18. Pushed the prior batch
  (24c334f) to origin/main at the owner's go — Cloudflare Pages deploys from
  main. CHANGELOG + ROADMAP + ARCHITECTURE updated.

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

- **2026-07-08 (navigation fixes + a batch of roadmap capture)**: Owner
  flagged that returning to the main list from the favourites view wasn't
  discoverable (pressing the toggle again works but isn't obvious) and
  wanted the "Faves" heading to act like an iPhone home button. Built both:
  the **"Faves" wordmark is now a home link** (`app-home-link`) — on the
  home screen it exits any open search/favourites view and smooth-scrolls
  to top (`wireHomeButton`), and it's a plain `index.html` link if JS is
  off — and the favourites panel gained an explicit **"‹ All places"** exit
  button (`favourites-done` → `open(false)`). Browser-verified at 390px:
  "All places" and the home wordmark both drop the favourites view back to
  the grid; toggle un-presses; href falls back to index.html. VERSION →
  2026-07-08.20 (no new modules). node --test 100 pass; validators clean.
  **Roadmapped a large owner brain-dump** (not built, captured with honest
  constraint analysis): dietary/allergy *preferences* + personal local
  **tag overrides** (Theme 5); **nest dishes under their venue** in the
  favourites view, an **overflow "⋯" menu** consolidating favourites +
  settings (leaving list filters as-is per owner), collapse the menu
  "needs a refresh" caveat into an **ⓘ disclosure icon**, **order-online
  buttons as a logo'd right-column** on wide screens, a more prominent
  **"← All restaurants"** back link, and a **page footer** (privacy note +
  "made by cakeIT") — plus **pick-along-a-route** (Theme 2, logged prior
  entry). Confirmed the app already ships a full favicon/icon set. Pushed
  earlier batches (702c572 etc.) to origin/main.

- **2026-07-08 (design declutter: ⓘ caveat disclosure + page footer)**:
  Owner picked the "design declutter" pair from the roadmap's ready-to-build
  queue. Two small Theme 3 wins. (1) The menu screen's always-on "Menu items
  and prices need a refresh…" banner is now an accessible **ⓘ disclosure**
  beside the venue name (`caveatDisclosure` in `menu.js`): a real
  `<button aria-expanded>` + `aria-controls` note, toggled on click, revealed
  on hover for pointer devices via CSS, closing on Escape (focus returns to
  the button) or an outside tap (a capture-phase document listener, added
  only while open). The note is a popover absolutely positioned inside the
  `.menu-title-group` (its positioning context) with `width: max-content` +
  `max-width: min(28rem, 88vw)` so it never overflows — verified. Replaced
  the old `.menu-caveat` banner CSS. (2) A `.site-footer` on the home page —
  a plain-language privacy note (no accounts / no tracking / no third-party
  scripts; favourites, order and settings stay on the device; only the
  site's own pages are fetched) + "Made by cakeIT". Static HTML (shows
  without JS), placed inside `<main>` so the fixed filter bar's bottom
  padding clears it. Business attribution only — no contact details.
  Browser-verified via headless Chrome + a CDP driver (Node 24's built-in
  WebSocket, zero install) at 390 px: ⓘ toggles open→close, Escape and
  outside-click both close, aria-expanded tracks state, popover stays in
  bounds (left 16 → right 359 of 390), the venue ♥ is untouched; and the
  footer clears the fixed bar at an 800 px viewport (footer bottom 702 ≤ bar
  top 732, the ~30 px = `--space-4` gap). node --test 100 pass; validate.py
  + check_no_deps.py clean. VERSION → 2026-07-08.21 (no new modules; edits to
  precached index.html + app.css + menu.js). CHANGELOG + ROADMAP updated
  (both items marked done). No ADR — reversible implementation choices.

- **2026-07-08 (add two pizza venues: Hell Pizza Newlands + Pizza Hut
  Johnsonville)**: Owner asked to add "Hell Pizza, Newlands" and "Pizza Hutt
  in Johnsonville". The latter resolves to the chain **Pizza Hut** (every
  source is the chain; "Hutt" read as a typo — flagged to owner). Added both
  as `status: "stub"` venues (menus still to capture) following the
  add-a-restaurant checklist: new `hell-pizza-newlands.json` +
  `pizza-hut-johnsonville.json`, both ids appended to `index.json`, matching
  "Menu coming soon" fallback `<li>`s in `index.html`. Facts web-researched
  (address/phone/hours) and coordinates geocoded dev-time via Nominatim:
  Hell = 225 Newlands Road (-41.22360, 174.82280), phone +64 4 478 6007,
  per-day hours (Mon/Tue/Wed evening-only, Thu–Sun from 11:30); Pizza Hut =
  88 Johnsonville Road (-41.22500, 174.80730), phone +64 4 478 8927
  (sources conflicted — one gave 04 478 9999; verify), 11:00–23:00 Sun–Thu,
  Fri/Sat late (null close per ADR 0006). Both `cuisine:["Pizza"]`,
  `services:["takeaway"]`, `verified:null` (needs in-store confirmation like
  the other stubs). Cards aren't links (stubs), so no menu page / ordering
  buttons yet; hours drive "open now" and coords drive distance. SW derives
  precache from index.json, so no SHELL edit — just VERSION → 2026-07-08.22.
  Browser-verified via CDP at 390 px: both cards render (26 total), correct
  area + "Takeaway" + "Menu coming soon", no console errors (null-close hours
  parsed cleanly). validate.py 24→26 files valid; check_no_deps clean.
  CHANGELOG updated. Owner granted standing push authorisation this session.

- **2026-07-08 (typical price per person, Theme 5)**: Continuing
  autonomously through the roadmap (owner: "keep going until it's time for a
  new session"). Added a **$/$$/$$$ + ~$Npp** chip on home cards and the
  menu header, derived from each venue's own listed prices — new pure module
  `site/js/price.js` (8 unit tests). The signal is the **median** of a
  venue's priced items (roughly one dish/person; median over mean so a few
  pricey specials or cheap sides don't skew it), banded $ ≤ 15, $$ ≤ 30, $$$
  above, and suppressed under 3 priced items (stubs, recipes, thin menus
  → null). Card chip is neutral (surface-2, bold band) so it reads distinct
  from the accent cuisine chips; menu header shows "$$ about $25 per person ·
  estimated from the menu". Honest framing throughout (our prices are
  already flagged as needing an in-store refresh). Browser-verified at 390px:
  8 venues show sensible bands (Spices Indian $$ ~$16pp, KK Malaysian $$
  ~$25pp, Takeaway @ Churton $ ~$10pp). node --test 100→108 pass; validate +
  check_no_deps clean. VERSION → 2026-07-08.23; price.js added to SW SHELL.
  CHANGELOG + ROADMAP updated (item done; curated override + a "Pick for us"
  cheap-eats mode noted still-open).

- **2026-07-08 (sticky menu search, Theme 3)**: Completed the last piece of
  the sticky-menu work — the search field now stays pinned. Wrapped the
  search + section jump-nav in one sticky `.menu-toolbar` (top:0, z 6);
  moved the dietary chips out of the pin to a non-sticky row below (they
  filter the sections and scroll away), keeping pinned chrome light. The
  toolbar height is measured once (rAF, + on resize) into `--toolbar-h` on
  `#menu-root`, and the section-title sticky `top` + section/dish
  `scroll-margin-top` now key off that var (fallback 6.6rem) instead of the
  old `--nav-h` — so section headings pin exactly under the toolbar and
  deep-links clear it, whatever the render height. Scroll-spy unchanged
  (percentage rootMargin). Search-above-nav chosen over the roadmap's
  literal "under the nav" so the primary action leads and reading order
  stays natural. Browser-verified via CDP at 390px: after scrolling 1600px
  the search is stuck at top:0, toolbar measured 108px, "Starters" heading
  pins at 107, a dish scrollIntoView lands clear of the toolbar. node --test
  108 pass; check_no_deps clean. VERSION → 2026-07-08.24 (menu.js/css only,
  no new module). CHANGELOG + ROADMAP updated (item done).

- **2026-07-08 (prominent back link, Theme 3)**: Made the menu/recipe
  "← All restaurants" back link a proper bordered pill button (`.skip a`:
  inline-flex, ≥44 px, border + surface bg, accent hover on pointer devices)
  instead of a faint muted text link — the owner flagged it easy to miss on
  desktop. CSS-only, applies to restaurant.html + recipe.html. Verified at
  1024 px and 390 px. VERSION → 2026-07-08.25. CHANGELOG + ROADMAP updated.
