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

- **2026-07-08 (nest dishes under their place in Favourites, Theme 3)**:
  Replaced the flat "Places / Dishes" favourites view with a **nested one**:
  group by `venueId` (first-seen order), each place a parent header
  (accent-soft, emoji + name, own venue heart) with its hearted dishes on an
  indented rail beneath. Key behaviour (owner's spec): a venue shows **even
  when only a dish of it is hearted** — parent heart then empty (tap to also
  save the place), filled when the venue itself is favourited; each dish
  keeps its inline un-heart; dish sub no longer repeats the venue name.
  Bespoke `favVenueGroup` renderer in `app.js` reusing `resultRow` from
  `results-view.js` (search view still uses `groupSection`, untouched). Kept
  the existing no-live-rerender behaviour (heartButton flips in place; the
  list rebuilds on reopen) to avoid focus churn. Summary → "N places, M
  dishes saved". Browser-verified via CDP at 390px with a seeded mix
  (KK Malaysian venue+2 dishes filled; Sprig+Fern dish-only, empty parent
  heart; Cook at Home recipe): 3 groups, correct hrefs, correct heart states.
  node --test 108 pass; check_no_deps clean. VERSION → 2026-07-08.26
  (app.js/css only). CHANGELOG + ROADMAP updated (item done).

- **2026-07-08 (cheap-eats picker mode, Theme 5)**: Finished the last open
  piece of the price work — a **💸 "Cheap eats" toggle inside "Pick for us"**
  that narrows the shuffle to the **$** band. New pure predicate
  `isCheapEats(record)` in `price.js` (`priceBand()?.band === "$"`, so it's
  self-consistent with the card chip; a null-band venue is deliberately *not*
  cheap — "no tag = not stated", we can't vouch it is). The `initPicker`
  candidate closure now takes `{ cheapOnly }` and filters the *filtered* set
  before the availability preference, so a closed cheap place still beats an
  open pricey one within the mode; flipping the toggle re-rolls immediately;
  an empty cheap set gets its own "turn off Cheap eats or widen" nudge.
  Reused `.list-toggle` styling (aria-pressed) — one small `.picker-opts` row,
  positioned to clear the absolute close button. Against real data the cheap
  set is 3 venues (Khandallah Trading Co, Takeaway @ Churton, Thai Tara
  Express); 18 signal-less stubs correctly excluded. Browser-verified via CDP
  at 390px (reduced-motion for deterministic instant lands): toggle ≥44px and
  clear of the close button; 40 rolls with cheap ON landed *only* on $ venues
  (the open ones), 60 rolls with it OFF spread across 21. node --test
  108→110 pass; validate + check_no_deps clean. VERSION → 2026-07-08.27
  (price.js/picker.js/app.js/css/html). CHANGELOG + ROADMAP updated (item
  done; curated price override still open).

- **2026-07-08 (relocate cheap-eats to a list filter + Fable UX review +
  owner decisions)**: Owner (rightly) flagged that "Cheap eats" belongs as a
  **main-list filter**, not buried in the picker. **Moved it**: `cheap` added
  to `DEFAULT_FILTERS` + an `isCheapEats` clause in `applyFilters`
  (`filters.js` now imports `price.js`); a 💸 `list-toggle` sits beside
  "Open now" in the home results head; `wireOpenNow`/`wireCheapEats` now share
  a small `wireListToggle`. **"Pick for us" inherits it for free** via the
  existing `applyFilters` call, so all the picker-specific cheap plumbing
  (`#picker-cheap`, `.picker-opts`, the `cheapOnly` closure param, the
  cheap-aware empty state) was removed — picker.js back to its clean shape.
  Browser-verified via CDP at 390px: toggle 44px; OFF 26 → ON "3 of 26"
  showing exactly the $ venues (Thai Tara Express, Takeaway @ Churton,
  Khandallah Trading Co); home no horizontal overflow; picker with cheap on
  only rolled the cheap+open venue. node --test 108→112; validate +
  check_no_deps clean. VERSION → 2026-07-08.28. CHANGELOG/ROADMAP updated
  (supersedes the .27 picker-mode entry, all still Unreleased).

  **Owner decisions recorded this session (see ROADMAP):** (1) *Ratings* —
  show the live Google number when online via a Cloudflare Pages Function
  proxy, link-out when offline; dish ratings curated; ADR + build after the
  Phase 7 deploy (first external service — noted). (2) *Feedback intake* — no
  email; parked ("decide later"), deploy first; GitHub Issues (public
  `faves-feedback` repo) or a Pages form are the future candidates. (3) *SBOM*
  — CycloneDX JSON at `/.well-known/sbom.json`, stdlib `tools/` generator,
  built at deploy.

  **Fable UX review landed (scoped, at 390px, both schemes).** P1 bugs to fix
  next, in priority order: (a) **menu screen scrolls sideways** (423px vs 390
  — `.section-nav`/`.menu-toolbar > *` needs `min-width: 0`); (b) **Area &
  Cuisine selects collapse to ~39px stubs** at 390px (the sticky filter bar
  needs to wrap to two rows, and `--bar-h`/both FAB offsets move in lockstep);
  (c) **`prefers-reduced-motion` still gets `scroll-behavior: smooth`** — an
  unconditional `html{scroll-behavior:smooth}` at ~app.css:1317-1328 wins over
  the reduce override; wrap it in `@media (prefers-reduced-motion:
  no-preference)`; (d) **touch targets < 44px**: `.section-link` (30),
  `.diet-chip` (40), `.stepper-add`/`.stepper-btn` (40), `.pair-chip` (32).
  P2: the **derived price band misbands** (KTC gastropub → "$", R & S Satay →
  "$$$"), which the new cheap filter amplifies → build the curated `priceBand`
  override (Theme 5). Full findings incl. P3 nits in the task output; the
  standouts are verified real. Next session: knock out the P1 batch.

- **2026-07-08 (P1 batch + P2 price override + two-column panel + overflow
  menu)**: Cleared the queued work in four commits, each verified in a real
  browser via CDP (Chrome headless, SW bypassed for fresh code).
  1. **P1 mobile fixes** (`.29`, css-only): menu screen no longer scrolls
     sideways (was 423px — grid children in `.menu-toolbar` needed
     `min-width:0` so the jump-nav strip scrolls itself); home filter bar
     **wraps to two rows** on a phone (service toggle full-width row, Area/
     Cuisine selects share the row below — they were collapsing to ~39px),
     with `--bar-h` bumped to 7.6rem on `body:not(.menu-page)` so body padding
     + both FABs clear it in lockstep, resetting to 4.6rem at ≥34rem;
     reduced-motion now truly kills smooth scroll (gated the smooth rule
     behind `no-preference` rather than being outranked by source order);
     touch targets to 44px (`.section-link`, `.diet-chip`, steppers,
     `.pair-chip`).
  2. **P2 curated price override** (`.30`): the median misbands where menus mix
     mains with cheap sides (KTC gastropub → "$") or a few pricey combos
     (R & S → "$$$"). `price.js` now honours a curated `priceBand`
     ("$"|"$$"|"$$$") and optional `pricePerPerson` that win over the median;
     `perPerson` is null when no figure agrees with the band (band shown
     alone, no contradictory "~$Npp"); result carries `curated` so the UI
     captions it "our estimate"/"typical price band" not "estimated from the
     menu". Set `priceBand:"$$"` on KTC + R & S (band only — no invented
     figure; mechanism supports one later). Both now read "$$"; KTC drops out
     of Cheap eats. `validate.py` + ARCHITECTURE schema updated; 9 new tests
     (112→119).
  3. **Two-column info panel** (`.31`, ROADMAP Theme 3): `.menu-twocol` grid at
     `min-width:48rem` — header spans the top, menu left, a **sticky info
     column** (contact card + stacked order buttons) right. New `renderAside`
     in `menu.js`; opt-in per page (venue + real menu only — stubs/recipes
     stay single-column); mobile unchanged (grid just doesn't apply).
     *Deferred:* per-platform order logos (self-hosted SVGs).
  4. **Overflow "⋯" menu** (`.32`, Theme 3): Favourites + Settings consolidated
     under one header button (new `overflow-ui.js` owns open/close + keyboard
     model; the two items keep their IDs so app.js/settings-ui wire them
     unchanged), freeing the search field to span the row. Per the owner's
     steer the Open-now/Cheap-eats/Near-me list toggles and the per-restaurant
     dish filters stayed put. Added to the SW SHELL.

  node --test 119 pass throughout; validate + check_no_deps clean. Everything
  is committed to `main`, not pushed (no deploy yet — Phase 7).

  *(The earlier note above mentions Fable's "P3 nits" as a follow-up — dropped:
  that list was never recorded and only lived in the prior review's scratch
  output, now gone. Not worth chasing; a fresh review would reflect today's UI
  anyway. Do not re-open it as a task.)*

- **2026-07-09 (queue batch: order-codes, SBOM, more allergens, food
  preferences)**: Worked through four ROADMAP items end-to-end, each committed
  separately with a real-browser check.
  1. **Dish order-numbers** (`.33`, Theme 5): venues that take orders by number
     get an optional item `code` (non-empty string), rendered as a muted `#14`
     badge *beside* the name (`.dish-code` + a new `.dish-name-text` span) and
     matched by search. Migrated KC Cafe: stripped the `N.` prefix baked into
     159 dish names into `code` via a surgical line-level text edit (preserved
     the file's formatting; no stripped-name collisions). Schema rule +
     validate.py (picks/goesWith still match the *stripped* name). Badge
     render-verified via headless-Chrome DOM dump.
  2. **Published SBOM** (`.34`, Theme 7, ADR 0008): `tools/gen_sbom.py` (stdlib)
     emits a CycloneDX 1.5 JSON with an empty third-party component list, at
     `site/.well-known/sbom.json`. **Deterministic** — no wall-clock timestamp
     (git dates it), serialNumber is a uuid5 of the doc's own canonical body —
     so `gen_sbom.py --check` is a stable CI gate (new job) and any future
     third-party entry shows as a diff. Reads package.json through the same
     dependency-key set as check_no_deps.py so the two can't disagree.
     Committed (not deploy-generated) because Pages runs no build command.
  3. **More allergen tags** (`.35`, Theme 5): extended the closed allergen
     vocabulary with contains-egg/dairy/gluten/soy/sesame (ARCHITECTURE.md,
     validate.py, the ALLERGEN maps in menu.js + recipe.js). **No dishes
     tagged** — "no tag = not stated" means population is an owner/intake task.
  4. **Personal dietary + allergy preferences** (`.36`, Theme 5): a "Food
     preferences" section in the Settings dialog — pick dietary needs
     (veg/vegan/GF/DF) and allergens to flag, device-local in settings.js
     (`diet:{dietary,avoid}`, sanitised to the closed vocab, +5 tests). Applied
     on every menu: dietary needs pre-select the matching chips (non-matching
     dishes dim on load), a flagged allergen's ⚠ chip shouts (filled-red
     `is-flagged`) with a warning rail down the row (`.dish-flagged`); recipes
     too. Load-bearing safety copy shipped ("always confirm for allergies; no
     tag = not stated, not free of it — a highlight, not a guarantee"). Avoided
     allergens read red, dietary needs accent. **Fixed en route:** the diet
     chip's `aria-pressed` was set as an ineffective el() JS property, not the
     attribute the CSS matches — pre-selected chips never looked pressed; now
     setAttribute. Verified via a seeded headless-Chrome profile at 390px.

  node --test 119→125 throughout; validate + check_no_deps + gen_sbom --check
  clean. Five commits on `main`, not pushed (no deploy yet — Phase 7).

  **Stopped here to save session cost.** Remaining buildable queue items are
  larger or need an owner steer: *Pick along a route* and *Personal tag
  overrides (local)* (both bigger, want a design call); *multi-location schema*
  (speculative — no chain records in the data yet); and the owner-blocked ones
  (security.txt role-inbox address, feedback intake, order-platform logos).

- **2026-07-09 (queue batch: surface favourites + te reo Māori toggle)**:
  Picked up where the prior session stopped and cleared the two smallest
  "still open" favourites sub-items, then built the parked te reo toggle after
  an owner steer. Four feature commits + docs, each real-browser verified via
  CDP (headless Chrome over the DevTools protocol, driven by a Node stdlib
  script from /tmp so nothing touched the repo).
  1. **Heart from the home card** (`.37`, Theme 5): the ♥ toggle now sits on
     each browse card, top-right, as a *sibling* of the card link (a button
     nested in an `<a>` is invalid/untappable) — absolutely positioned inside
     the now-`position:relative` `.card`, card name padded right so a long
     title never runs under it. Reuses the shared `heartButton`. CDP-verified:
     9 hearts at 48px within the viewport, **zero horizontal overflow**
     (scrollWidth 390 = clientWidth), toggle persists the venue entry.
  2. **"Pick for us" favours the usual** (`.38`, Theme 5): extracted a pure
     `weightedPick` (7 tests) — a hearted venue counts `FAV_WEIGHT` (3) in the
     draw, leaning toward favourites without excluding the rest; the flicker
     still cycles every candidate. Guarded picker.js's top-level
     `window.matchMedia` so the module imports under `node --test`.
  3. **Name it when the roll lands on a favourite** (`.39`): a "♥ one of your
     usuals" note on the picker result, so the weighting is visible not silent.
     CDP-verified: narrowing to a set with a seeded favourite lands on it and
     shows the note.
  4. **Te reo Māori UI toggle** (`.40`, ROADMAP parked; owner chose it from a
     next-build steer): a device-local language switch in Settings. New
     `site/js/reo.js` i18n engine — static chrome carries `data-i18n` /
     `-i18n-aria` / `-i18n-ph`; `translate()` swaps them and captures the
     English source so switch-back is lossless; JS strings call `t(key, en)`;
     `settings.lang` (sanitised, +1 test) drives it; reo re-translates the
     document off the store subscription and sets `<html lang>` (en-NZ / mi).
     Scope this pass: home screen + Pick-for-us/Settings dialogs + menu/recipe
     back-links. CDP-verified at 390px: every tagged string + `<html lang>`
     flips to mi and back losslessly, persists, macrons render. **Wording is a
     first pass wanting a reo review before launch** (Phase 7); safety prose
     (privacy note, allergy copy) and generated menu-screen chrome stay English
     for now, flagged in reo.js, covered by the English fallback. Extending is
     purely additive (add a key + a `data-i18n`).

  node --test 125→133 throughout; validate + check_no_deps + gen_sbom --check
  clean. Five commits on `main`, not pushed (no deploy yet — Phase 7).

  **Stopped here to save session cost.** The remaining queue all needs an owner
  call before building: te reo *follow-ups* (menu-screen chrome, prose, the
  reo wording review); *Shareable shortlist links* and *Pick along a route*
  (both want a design/UX call — what's the shortlist; how is a route
  destination entered offline); *Personal tag overrides* and *multi-location
  schema* (bigger); and the owner-blocked ones (security.txt address, feedback
  intake, order-platform logos).

- **2026-07-09 (te reo second pass: menu + recipe screens)**: Owner steer
  chose finishing the te reo coverage from the queue. Two feature commits,
  CDP-verified (headless Chrome at 390px, scripts from the scratchpad).
  1. **a11y fix found en route**: the `el()` helpers in menu.js, recipe.js
     and cart-ui.js passed `"aria-label"` / `"aria-hidden"` /
     `"aria-labelledby"` through `Object.assign`, which sets inert JS
     expandos — the attributes never existed, so screen readers saw none of
     them (same class of bug as yesterday's `aria-pressed` fix). `el()` now
     routes hyphenated keys through `setAttribute`, which is also what lets
     `data-i18n` ride in as a prop. Verified in the live DOM.
  2. **Te reo menu/recipe chrome** (`.42`): generated chrome now carries
     `data-i18n` and gets a `translate(root)` after render — contact labels
     (call/pickup/hours), order-online block, picks heading, search
     placeholder/aria, section-nav/diet-chips/aside aria labels, "no dishes
     match", both stub-note variants, loading notes, recipe
     ingredients/method headings, and the Cook at Home collection view.
     **Deliberately still English:** all safety text (allergen/dietary
     tags + filter chips, refresh caveat, allergy framing, error prose —
     policy listed in reo.js's header), interpolated strings ("Serves 4",
     "Verified {date}", hours badges, order-sheet counts; the engine swaps
     whole strings only), and the recipe back-link (JS owns its text — a
     tagged element whose text JS mutates would be clobbered on
     re-translate). CDP: 33 checks — mi on menu/collection/recipe/stub
     screens, lossless mid-page switch-back via `settings.set`, menu content
     untranslated, no horizontal overflow. New MI keys are flagged `draft`
     for the Phase 7 reo review.

  node --test 133 throughout; validate + check_no_deps + gen_sbom --check
  clean. Commits on `main`, not pushed (no deploy yet — Phase 7).

  Remaining queue unchanged from yesterday: te reo *order-sheet/favourites
  chrome* wants string interpolation in the engine first; the reo wording
  review, *Shareable shortlist links*, *Pick along a route*, *Personal tag
  overrides*, *multi-location schema*, and the owner-blocked items all still
  need owner input.

- **2026-07-09 (design: group ordering + backend stance)**: Owner floated
  "five people picking dishes on their own phones, landing on my order
  list" and asked about Bluetooth/WiFi sharing. Wrote it up rather than
  built it (economics: this session is Fable; the build is Opus work):
  **ADR 0009** — group ordering shares *finished picks* as URL fragments
  via the OS share sheet (AirDrop/Messages) + QR fallback, merging into
  `cart.js` on the host's phone; rejected Web Bluetooth (impossible
  browser-to-browser, absent on iOS), serverless WebRTC (QR-scan
  handshake per guest, dies on phone lock), and a backend room (breaks
  no-backend — deferred). The ADR also records an **owner steer: "no
  backend" softened to "not yet"** — a lightweight Cloudflare Worker is
  an acceptable future direction, gated behind its own ADR. ROADMAP:
  note under the legend about the softened stance; new **Theme 1b**
  (full design sketch + acceptance criteria, effort M); the parked
  "shareable shortlist links" folds into the Theme 1b codec. Also
  backfilled ADR 0008 into the decisions index (was missing).

  **Next session (Opus, fresh):** build Theme 1b from the ROADMAP sketch
  + ADR 0009 — codec first (pure, unit-tested), then send UI (share
  sheet + local QR), then receive/merge with confirmation. No schema
  changes; bump sw VERSION; CDP-verify at 390px.

- **2026-07-10 (Opus: Theme 1b group ordering — send/receive)**: Built the
  bulk of Theme 1b per ADR 0009. New pure `site/js/share-codec.js`: a
  versioned codec that packs an order into `#share=<base64url(JSON)>` — terse
  keys, UTF-8-safe (macrons survive), every field re-sanitised on decode
  (clip/clamp/phone-charset, ≤200 lines) since the payload is
  attacker-authorable, and fail-soft to `null` on bad base64 / bad JSON /
  unknown version / unknown type / no usable lines. Carries a `shortlist`
  type too (parked feature folds in later). `cart.js` gained a pure
  `mergeItems` + an `order.merge()` store method (sum matching lines, preserve
  `collected`, never mutate inputs). `cart-ui.js`: a "Send to the orderer"
  action on the order sheet → a send dialog (optional name, `navigator.share`
  + Copy-link fallback, reveals a selectable link field if the clipboard is
  blocked); and a receive path that reads the fragment on load (any screen,
  via `initOrderUI`), `history.replaceState`s it away so a refresh can't
  re-prompt, and shows a confirmation ("Add Ruth's 6 items?", grouped) —
  merge only on confirm, graceful "that link didn't work" on a dud.

  **Deliberately deferred: the QR-code fallback.** A zero-dep local QR
  renderer is ~600+ lines (Reed-Solomon + masking) — a clean, separable
  chunk. The all-Apple household is covered by the share sheet (AirDrop), so
  the honest call was to ship the proven core this session and leave QR as the
  next well-scoped piece, rather than blow the session on the encoder before
  the core was verified. ROADMAP Theme 1b marked "mostly done — QR still to
  build".

  Order-sheet chrome stays English (the te reo pass for it is still deferred —
  its strings, e.g. "Add Ruth's 6 items", need interpolation reo.js doesn't
  have yet). Verified: `node --test` **155 pass** (133 + new codec/merge; the
  suite caught a real `Number(null)===0` price bug pre-commit); validate +
  check_no_deps + gen_sbom --check clean; sw VERSION → `.43` with
  share-codec.js added to the precache shell. Browser (real Chrome): home
  boots clean (imports don't break it); a valid share URL renders the correct
  grouped confirmation; a corrupt token renders the fail-soft error. Send's
  click-wiring wasn't headlessly click-driven — it rests on the unit-tested
  codec, proven cross-environment encode↔decode symmetry, and markup mirroring
  the already-verified order sheet. Committed on `main` (not pushed).

  **Next session:** the QR fallback — a small zero-dep byte-mode QR encoder
  (URLs are ASCII; a family order is ~320 chars, well inside a mid-version
  symbol) rendered to canvas/SVG in the send dialog, with a matching unit
  test on the encoder. Then the parked shareable-shortlist links via the
  `shortlist` payload type the codec already carries.

- **2026-07-10 (Opus: Theme 1b QR fallback — the last piece)**: Built the
  deferred QR-code fallback, completing Theme 1b. New pure `site/js/qr.js`: a
  zero-dependency byte-mode QR encoder, error-correction level M, versions 1–20
  (covers up to 666 bytes; a family order URL is ~300–400). The full standard
  pipeline — Reed–Solomon over GF(256), block interleaving, all eight data
  masks scored by the four penalty rules, BCH-protected format and version
  info. Returns `{ size, modules }`; the renderer stays in `cart-ui.js` so the
  encoder is unit-testable.

  **Verification went deep, because a QR you can't scan is worse than none.**
  A QR encoder can't be checked by round-tripping without also writing a
  decoder, so `tests/qr.test.js` pins the error-prone maths to the ISO/IEC
  18004 published constants: the GF(256) field, generator polynomials as α
  exponents (degrees 7 and 10), both BCH codes (all format bits for level M,
  version bits for v7/v10/v20), and an RS-syndrome check proving the emitted
  parity is genuinely correctable. Then — decisively — a throwaway decoder in
  the scratchpad reconstructed finders/timing/alignment independently, read the
  format info, unmasked, de-interleaved, verified syndromes and parsed byte
  mode, and **round-tripped every version cleanly** (v1–v15, incl. macron UTF-8
  and a 405-byte v15 payload). Two bugs surfaced and were fixed *in the
  scratch decoder* along the way (reversed format-bit read; re-interleaving
  data blocks instead of concatenating) — the shipped encoder was correct
  throughout, which the codeword-stream comparison confirmed before I touched
  anything. Caught and fixed one real encoder bug pre-test: the RS division
  indexed the generator polynomial's leading `1` instead of skipping it.

  UI: a **Show QR code** toggle in the send dialog draws the current order link
  to a `<canvas>` with a 4-module quiet zone, hard-coded dark-on-light (a
  scanner needs that regardless of the page's dark mode), `role="img"` +
  aria-label, `aria-expanded` on the button, reset on dialog open/close. Throws
  → an honest "too big for a QR code — use Copy link" (only trips past the v20
  ceiling). Browser-verified end-to-end via headless CDP: seed a 3-item order,
  open order sheet → send → Show QR; canvas paints bimodal (260×260), the QR's
  own encoded URL decodes back to exactly "2× Mee Goreng, 1× Roti Canai",
  aria toggles, zero console errors. `node --test` **164 pass** (155 + 9 QR);
  validate + check_no_deps + gen_sbom --check clean; sw VERSION → `.44` with
  `js/qr.js` added to the precache shell. Committed on `main` (not pushed).
  **Remaining acceptance: a real phone-camera scan (owner)** — inherent to any
  QR feature; the decode round-trip makes scan confidence very high.

  **Next session:** the parked **shareable shortlist links** — wire send/receive
  for the `shortlist` payload type the codec already carries (no new codec
  work). After that, Theme 1b is fully closed and Phase 7 (deploy) is the main
  unblocked track, pending two owner calls: host confirmation + hostname.

- **2026-07-10 (Opus: shareable shortlist links — Theme 1b fully closed)**:
  Built the last parked Theme 1b piece — sharing a shortlist of favourites. The
  "codec already carries the type" turned out optimistic: the order shape
  (name/price/qty triples) can't represent a *whole-venue* favourite or the
  recipe flag a received favourite needs to deep-link correctly, so the codec
  got a real second payload. `share-codec.js` now has `encodeShortlist` (groups
  of `{venueId, venueName, isRecipe, sub, venueFav, dishes[]}`) and a
  type-branched `decodeShare` returning flat favourites entries; `encodeShare`
  is now explicitly **order-only** (throws on other types, pointing at
  encodeShortlist) so the two wire shapes can never cross. Every field is still
  re-sanitised on decode. `favourites.js` gained a pure `groupForShare(items)`
  (venue-grouped, mirrors the Favourites view's own grouping) and a store
  `merge(entries)` (adds only absent, dedupes the incoming list, commits once,
  returns the count added).

  **Refactor to avoid duplication:** the order send dialog (name → share sheet /
  copy link / QR) was inline in cart-ui.js. Rather than clone ~80 lines for the
  shortlist, extracted it to **`site/js/share-ui.js`** as `openShareDialog({
  heading, blurb, buildUrl(name), … })` — created-on-demand, removed on close,
  with the QR renderer moved along too. cart-ui's order send and app.js's
  shortlist send both call it. cart-ui's receive path now branches by
  `decoded.type`: an order merges into the cart as before; a shortlist shows
  "Add Ruth's N favourites?" (grouped, recipe/venue-heart shown) and merges into
  the favourites store on confirm, then swaps to an "Added / already had these"
  result. Send entry point: a **Share these** button under the favourites
  summary (hidden when empty; `fav.share` te reo key added). sw VERSION → `.45`,
  `js/share-ui.js` in the precache shell.

  Verified: `node --test` **172 pass** (+5 shortlist codec, +3 favourites
  merge/group; one stale test that encoded a shortlist via `encodeShare` updated
  to assert the new order-only guard). validate + check_no_deps + gen_sbom clean.
  **Real-browser headless CDP, all three flows, zero console errors:** (A) order
  send still works through the extracted dialog — QR paints, decodes back to the
  order (no regression); (B) Favourites → Share these → dialog decodes to a
  shortlist of 3 with venue-heart + recipe flag intact; (C) opening a shortlist
  link on a fresh load shows "Add Ruth's 3 favourites?", confirm merges 3 into
  an empty favourites set, and the recipe favourite deep-links to recipe.html
  (proving isRecipe survived the URL). Committed on `main` (not pushed).

  **Next session:** Theme 1b is done. **Phase 7 (deploy)** is now the main
  unblocked track — needs two owner calls: host (Cloudflare Pages) + hostname
  (OG tags baked for `lets-eat.myspot.nz`). Everything else queued is owner-
  blocked (menu photos/prices, picks, promoting venues to `verified`) or wants
  reo-engine string interpolation (order-sheet/favourites-share te reo).

- **2026-07-10 (Opus: Phase 7 deploy — prep + push; owner steps remain)**:
  Owner chose to deploy to **Cloudflare Pages at `lets-eat.myspot.nz`**. Found
  the hosting was already config-as-code from 2026-07-07 (`tools/deploy.json`,
  `tools/deploy.py` reconciling the CF API, `docs/DEPLOY.md` runbook) and the
  OG/canonical URLs already baked for that host — so no app changes needed.
  Pushed `main` (28 commits, incl. all of Theme 1b) to GitHub
  `mike548141/faves` so Pages has a source to build; safe because the project
  isn't connected yet (no auto-deploy fires). Added a **Deploy** section to the
  README (live URL + everyday `git push` flow) and pointed the doc index at
  DEPLOY.md; annotated WORKPLAN Phase 7 with what's ready vs owner-blocked.

  **Blocked on the owner (browser/token, genuinely not scriptable):** authorise
  the Cloudflare GitHub App on the repo; create a scoped API token
  (`Account·Pages Edit`, `Zone·DNS Edit`, `Zone·Zone Read`, restricted to
  `myspot.nz`) → `export CLOUDFLARE_API_TOKEN=…`; then `python3 tools/deploy.py
  apply` creates the git-connected project and attaches the domain. After that
  every push to `main` deploys. `CLOUDFLARE_API_TOKEN` is not in this shell's
  env, so I couldn't even run `deploy.py plan` — it's the owner's to run.

  **Next session:** once the owner has run `apply`, confirm the live site
  (`https://lets-eat.myspot.nz` + `faves.pages.dev`), re-check Lighthouse on the
  real URL (localhost had no Brotli/HTTP-2, so scores can only improve), and do
  the deferred real-device passes (iOS/Android install + flight-mode; QR
  phone-camera scan). Then the app is genuinely shipped.

- **2026-07-11 (Fable: Phase 7 deploy — the site is LIVE)**: Repo re-checked
  post-atelier-adoption: verify suite green, pin bumped `1588fda → dfd5aec`
  (new RECORD.md doctrine: public records keep private repos generic — faves'
  docs scanned, compliant). Owner set up the estate credential pattern:
  an account-owned **parent minting token** (Account API Tokens: Edit, in the
  login keychain) from which a **faves-scoped child** was minted in code —
  Pages Edit (account) + DNS Edit + Zone Read (`myspot.nz` only), stored as
  `cloudflare-faves-deploy` in the keychain. `deploy.py plan → apply` created
  the git-connected Pages project and attached the domain; first deployment
  triggered via API, all stages green. Two tool fixes landed along the way:
  plan-mode 404 when the project didn't exist yet, and — bigger — the API
  domain-attach does **not** auto-create the CNAME (the dashboard does; the
  runbook's assumption was wrong live), so `deploy.py` now reconciles the
  proxied CNAME itself and DEPLOY.md was corrected. Also noted there: the
  python.org 3.14 install lacks CA certs, use `/usr/bin/python3`.
  **Live:** <https://faves.pages.dev> (HTTP 200, verified);
  <https://lets-eat.myspot.nz> attached, certificate provisioning pending at
  session close. Estate-wide credential governance (where the registry lives —
  atelier can't hold it, it's public) left as an open owner question.

  **Next session:** confirm `lets-eat.myspot.nz` serves (cert usually minutes),
  re-run Lighthouse against the real URL, then the deferred real-device passes
  (iOS/Android install + flight mode; QR camera scan). The owner also queued:
  GitHub token refresh (current PAT is classic + broad), then AWS/Google/
  TrueNAS credential roots, and publishing Nova + the CEL MTA-STS record with
  tokens minted from the same parent.

- **2026-07-12 (Opus: UX queue — mobile contact bar collapse)**: First of the
  queued UX polish items. On a phone the tall contact card (call/pickup/hours)
  used to scroll off with the header, taking "call to order" with it down a long
  menu. Added a slim fixed bar that pins to the top once the full `.contact-card`
  leaves the viewport (IntersectionObserver, not a scroll listener), showing the
  open-now status badge + a compact `tel:` "Call to order" button. The sticky
  search/section toolbar offsets below it via a `.contact-bar-open` body class
  (`--contact-bar-h` + notch inset); desktop keeps its sticky aside column so the
  bar is `display:none` there. Body-level like the FAB (viewport-relative fixed);
  translated on create since boot's `translate()` scopes to `root`. Verified over
  CDP at 390px on the Hell Pizza menu (hidden at top → shown on scroll, toolbar
  pushed to 48px, call+status present → re-hidden on scroll back; `display:none`
  at desktop width; zero console errors); full verify suite green. SW `.55→.56`.
  **Queue remaining:** Footer privacy → About surface [M]; Share-this-app menu
  item [S]; Pick-for-us relocation/hide-on-scroll [S].

- **2026-07-12 (Opus: UX queue — About surface, Share this app, Pick-FAB
  auto-hide)**: Cleared the rest of the queued UX block. **About surface**
  (`about-ui.js`): the footer's inline privacy paragraph moved into an About
  dialog (Settings-sheet pattern) covering what Faves is, "Private by design",
  and "Works offline"; opened from a new ⋯ menu item and a footer "About &
  privacy" link. Progressive-enhanced — the privacy note still ships as static
  footer HTML for no-JS, and JS swaps it for the link. **Share this app**
  (`share-app.js` + reusable `toast.js`): a ⋯ item that hands the branded
  canonical URL to `navigator.share`, falling back to clipboard-copy + a toast
  on desktop; kept separate from the shortlist share in `share-ui.js`.
  **Pick-FAB auto-hide** (`picker.js`): the "Pick for us" button slides off the
  bottom on scroll-down and back on scroll-up (rAF-throttled, `.is-tucked`
  transform so it never fights the search/favourites display rules; reduced
  motion drops the slide). All verified over CDP at 390px (dialog open/close
  from both entry points; native-share payload + clipboard/toast fallback; FAB
  tuck/untuck across repeated passes — no console errors); full verify suite
  green. Three new reo keys (all draft). SW `.56→.58`. The whole UX queue block
  (contact bar + these three) is now shipped.

- **2026-07-12 (Opus: real-device UX fixes — menu + home chrome)**: A batch of
  seven fixes from device review. **Menu search** gained the home search's clear
  ✕ (wrapped in `.menu-search-field`; Esc clears). **Pinned toolbar** got
  `padding-top` so the search pill stops clipping against `top:0` (desktop
  0→10px; clear of the mobile contact bar). **Section jump-nav** now follows the
  scroll — scroll-spy centres the active chip in the horizontal strip so the
  section you're reading stays visible/highlighted deep in a menu. **Back-to-top**
  extracted to a shared `to-top.js` and added to the home list (was menu-only);
  on home it stacks above the "Pick for us" pill + filter bar (10px gap, verified
  no overlap on scroll-up) and hides in search/favourites. **Footer** now puts
  "About & privacy" + "Made by cakeIT" on one centred row (also simplified the
  about-ui footer swap). **Collapsed allergen chips**: removed the fade gradient
  that bled over a selected chip's fill (the clamp already hides row 2 cleanly).
  **Settings gear ⚙** bumped to 1.35rem to match ♥/⤴/ⓘ. All verified over CDP at
  390px + 1440px; verify suite green. SW `.58→.59`. Note: `code-review` deferred
  — a good candidate before the next content push given the volume of chrome
  churn this session.

- **2026-07-12 (Fable: code review of the UX/chrome block)**: The deferred
  review, scoped to `8706f23~1..HEAD` under `site/` (~1.19k insertions, 17
  files). Eight finder angles fanned out on Opus, every candidate verified
  independently; 16 of 17 confirmed. **Findings, most severe first — fixes to
  apply on Opus, none applied this session:**
  1. `sw.js:73` — install swapped `cache.addAll(SHELL)` for per-URL
     `cache.put(await fetchClean(u))`, losing addAll's `response.ok` guard: a
     404/500 during a deploy race gets cached as a shell asset, install still
     resolves, and offline visitors serve the broken file until the next
     VERSION bump.
  2. `to-top.js:6` + `about-ui.js:13` — both new modules cloned the naive
     `Object.assign` `el()` instead of the hyphen-aware one (`menu.js:20-25`
     has the guard + warning comment), so `aria-label`/`aria-labelledby`/
     `data-i18n(-aria)` become inert expandos: the ↑ button is an unnamed
     control to screen readers and untranslatable; the About dialog has no
     accessible name; "Made by" can't reach its existing `footer.made` = "Nā"
     key. Repo-wide there are now 11 private `el()` copies (7 naive, 4
     hyphen-aware) — the root-cause fix is one shared hyphen-aware export.
  3. `settings-ui.js:109` — the chip-group `.fits` state is a one-way latch:
     `.fits` removes the max-height clamp, and `refresh()` measures without
     stripping it first, so once chips fit (e.g. landscape) the clamp/"Show
     all" toggle can never return after rotating narrower.
  4. `picker.js:189` — `.is-tucked` is only ever cleared by a scroll event;
     the scroll listener keeps running while the FAB is `display:none` in
     search, so exiting search can restore "Pick for us" still translated
     off-screen.
  5. `app.css:2195` — the unconditional `.contact-bar-open .menu-toolbar`
     top-offset comes after the equal-specificity desktop `top:0` rule, and
     `initContactBar` (`menu.js:733`) has no width guard, so on a short
     desktop window the toolbar drops ~3rem while the bar itself is
     `display:none`.
  6. `app.css:1828` — `.chips-toggle` computes to ~29px tall (no min-height):
     breaks the 44px target rule.
  7. Cleanup (all confirmed): `sw.js:118` cacheFirst re-inlines fetchClean
     (`return hit || fetchClean(req)`); search-clear ✕ wiring duplicated
     `app.js:1030` vs `menu.js:610`; share-app vs share-ui duplicate the
     share/clipboard/AbortError flow; three divergent hand-rolled `<dialog>`
     lifecycles; to-top's scroll listener is unthrottled (picker's is
     rAF-gated) and home now boots two scroll listeners; settings resize →
     forced reflow per chip group; `centerNavLink` builds a fresh matchMedia
     per call and reads rects after class writes; About dialog DOM built
     eagerly on every home boot; `--contact-bar-h: 3rem` is assumed, never
     measured (overlap risk at large font settings).
  Refuted (don't re-raise): disclosure.js leaving orphaned listeners when
  Settings closes with the ⓘ note open — the capture-phase click listener
  fires before the ✕/backdrop handlers and self-closes cleanly.

- **2026-07-12 (Opus: fixed the six confirmed review bugs)**: Worked the
  numbered findings from the Fable review above; the #7 cleanup set is left for
  next time. **1** `sw.js` install now keeps `addAll`'s guard by hand — a shell
  URL that returns non-200 throws and rejects the install rather than caching a
  broken asset that offline visitors then serve. **2** `to-top.js` +
  `about-ui.js` `el()` made hyphen-aware (mirroring `menu.js`), so
  `aria-label`/`aria-labelledby`/`data-i18n(-aria)` land as real attributes: the
  ↑ button and About dialog now have accessible names and translate. (Targeted
  fix, not the shared-`el()` module the review floated — that's a #7 cleanup.)
  **3** `settings-ui.js` `refresh()` strips `.fits` before measuring, so the
  "Show all" clamp/toggle returns after the group is narrowed again (was a
  one-way latch). **4** `picker.js` gained a `MutationObserver` on `<body>` class
  that clears a stale `.is-tucked` when browse returns — the FAB is `display:none`
  during search/faves so a scroll event may never fire to reset it. **5**
  contact-bar CSS reordered so the desktop `top:0` reset wins (equal
  specificity, later rule), plus `initContactBar` now width-guards on the 48rem
  breakpoint (matchMedia + a resize handler) so `.contact-bar-open` is never set
  on desktop. **6** `.chips-toggle` given `min-height:44px` (+ inline-flex
  centring). SW `.59→.60`. **Verified over CDP** (headless Chrome, zero-dep WS
  driver) at 390px + desktop: SW cached 71 entries incl. all 27 menus and served
  a deep link offline; ↑/About accessible names + data-i18n present; latch
  toggle returned on re-narrow; FAB `is-tucked` cleared on search-exit
  (`transform:none,opacity:1`); desktop toolbar stayed `top:0px` while the bar
  was `display:none`, mobile `top:48px`; chips-toggle 44px; zero console errors
  on home/menu/stub. Static suite green (validate 27, no-deps, SBOM, 176 tests).
  Note: the working tree also carries unrelated in-flight edits (atelier pin
  bump, `qr.js`/`serve.py` leakscan annotations, `.github/workflows/floor.yml`)
  left untouched and uncommitted this session.

- **2026-07-12 (Opus: the #7 cleanup block from the Fable review)**: Cleared the
  quality/dedup set the review deferred, in five focused commits (each verified
  over CDP with the SW bypassed so tests hit current files, not stale cache — a
  trap the first run fell into). **1 Shared `el()`** (`dom.js`): retired 11
  private copies (5 the naive `Object.assign` form that drops aria-*/data-*) for
  one imported hyphen-aware helper; fixed the latent bug the review predicted —
  the Settings dialog's `aria-labelledby` was inert, so it had no accessible
  name (now does). **2 Shared `<dialog>` lifecycle** (`dialog.js`): one
  `wireDialog()` (✕ + backdrop; Escape native) + `closeButton()` across
  Settings/About/picker; Settings' ✕ gained `data-i18n-aria`; About now builds
  its DOM on first open (not every boot) and `translate()`s the fresh subtree
  (verified in te reo: Made by→Nā, Close→Katia). `sw` cacheFirst reuses
  `fetchClean`. **3 Share primitives** (`share-core.js`): `tryNativeShare`
  (shared/dismissed/unavailable) + `copyText` so share-app and share-ui stop
  hand-rolling the AbortError/clipboard dance; share-ui adopts `wireDialog`.
  **4 Search-clear** (`search-clear.js`): one `wireSearchClear()` for the home
  and in-menu ✕. **5 Perf**: rAF-throttle to-top's scroll and settings' resize;
  scroll-spy batches class writes before the rect read and reuses one
  reduced-motion mq; contact bar measures its inner's real height into
  `--contact-bar-h` (measuring the *inner*, not the bar, dodges a safe-area
  feedback loop) so the toolbar can't overlap at large fonts. Four new tiny
  modules added to the SW shell. **Verified over CDP** at 390px + desktop: all
  three dialogs open/close via ✕/backdrop/Escape; About lazy + translated; both
  share flows fall back cleanly; search ✕ clears + refocuses on both screens;
  to-top tracks real scrollY; `--contact-bar-h` measured to 48px with no
  overlap; settings latch still returns; zero console errors throughout. SW
  `.59→.65` across the session; static suite green (validate 27, no-deps, SBOM,
  176 tests). The unrelated in-flight edits noted above remain untouched.
