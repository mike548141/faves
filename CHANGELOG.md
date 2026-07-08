# Changelog

Notable changes to Faves, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This is a
curated site, not a released package, so there are no version tags yet —
everything sits under _Unreleased_ until the first public launch.
Per-restaurant "verified on" dates in the menu data track content
freshness separately from this file.

## [Unreleased]

### Added
- **Cheap eats mode in "Pick for us":** a 💸 toggle in the shuffle dialog
  narrows the roll to the **$** places (the ones already chip-flagged as
  cheap on their cards), so a broke-but-hungry group can still let the dice
  decide. It respects the current filters and prefers somewhere open, just
  like a normal roll; if nothing cheap fits, it nudges you to widen.
- Typical price per person: each place with a menu now shows a small
  **$/$$/$$$ chip with a "~$Npp" estimate** (on the home card and the menu
  header), worked out from that venue's own listed prices — no external
  source. It's a ballpark ("estimated from the menu", and our prices are
  already flagged as needing an in-store refresh), handy for "cheap eats or
  a treat tonight?".
- Two more places in the pizza department: **Hell Pizza Newlands** and
  **Pizza Hut Johnsonville**. Menus still to capture (they show as "Menu
  coming soon"), but they carry address, phone, hours and coordinates, so
  they rank by "open now" and distance like everywhere else.
- Page footer on the home screen: a short privacy note — no accounts, no
  tracking, no third-party scripts, your favourites, order and settings
  stay on your device — and a "Made by cakeIT" attribution.
- Smarter default order: the home list now floats the places you can
  actually order from *right now* to the top and sinks the rest — open
  (right up to closing time) and opening-within-the-hour venues lead;
  closed ones drop to the bottom. Your **favourites** lift within that
  order — a hearted venue, or one holding a dish you've hearted, is treated
  as ~10 km nearer rather than always winning, so a favourite 8 km away
  beats a place 2 km away but a favourite 30 km away doesn't (a *closed*
  favourite still stays below anywhere open — it lifts, it doesn't
  override). With "Near me" on, distance refines the rest and a venue too
  far to reach tonight (a favourite in another town) sinks below everything
  nearby. "Pick for us" draws from the available set too, so the dice won't
  land on somewhere closed or unreachable.
- Distance settings (⚙ on the home screen): tune how much nearer a
  favourite counts (default 10 km) and how far is "too far to reach
  tonight" (default 50 km), with live sliders. Saved on the device; they
  reshape the order the moment you change them.
- Hearted favourites: tap **♡** on any dish (restaurant menus *and* Cook at
  Home) or on a whole venue to save it. A **Favourites** toggle beside the
  home search opens a view that gathers everything you've saved — Places
  and Dishes — each linking straight there, with an inline heart to remove
  it. Kept on the device only (`localStorage`), like the order tally; works
  offline, no account.
- Order tally: as people call out what they want, tap **＋** on a dish to
  build one running order. A floating order button (on every screen) opens
  a list grouped by restaurant — each with a subtotal and a **Call** link
  — plus an estimated grand total (captioned "confirm at the till", since
  our prices need an in-store refresh). **Collect mode** ticks items off at
  pickup. Kept on the device only (`localStorage`) — no account, no
  backend, no payment; it still hands off to phone/website to actually
  order. Cook-at-Home recipes carry no stepper (that's for cooking, not an
  order).
- Global search on the home screen: one box finds a **place or a dish**
  by name (also matching area, cuisine and — for dishes — description and
  ingredients) across every venue and Cook at Home. Results group into
  "Places" and "Dishes"; a dish links straight to its row on the menu
  (or its full recipe page). Runs entirely over the already-loaded data,
  so it's offline and zero-dependency. While a query is live the browse
  cards, filters and shuffle step aside; clearing the box restores them.
- Full recipe pages: tapping a Cook at Home dish name opens its own
  focused, shareable page (`recipe.html?id=…&dish=…`) — ingredients,
  method, serves/time, photo, allergen/dietary tags and "goes well with"
  links to the other recipes. The inline quick-expand stays on the list.
- 11 more Wellington venues as stubs (facts web-researched + geocoded;
  menus to follow): Regal Chinese, Babaili Malatang, New Chapter, Gold
  Lining, Pizza Pomodoro, Gong Cha, Satay Kingdom Cafe, Rock Yard
  Vietnamese, Cozy Cake Shop, The Catch Sushi Bar, Kaffee Eis. Adds new
  areas (Pipitea, Wellington Central) and cuisines (bubble tea, gelato,
  hotpot, sushi, yum cha…) to the filters.
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
- The **Favourites view now nests dishes under their place** instead of
  separate "Places" and "Dishes" lists — each spot is a heading with the
  dishes you've hearted there beneath it (the place shows even if you've
  only hearted a dish of it, with a heart to also save the whole place).
  Reads like "my usual at each spot".
- The **← All restaurants** back link on a menu or recipe page is now a
  clear bordered button instead of a faint text link — it was easy to miss,
  especially on desktop.
- On a long menu, the **search box now stays pinned** at the top alongside
  the section jump-nav, so you can filter the menu without scrolling back
  up. The dietary chips sit just below and scroll with the dishes.
- The menu "needs a refresh" caveat is no longer an always-on banner: it's
  tucked behind a small **ⓘ beside the venue name** that reveals the note
  on tap (and on hover for mouse users), so the header reads clean. An
  accessible disclosure — a real button with `aria-expanded`, closes on
  Escape or an outside tap — not a bare tooltip, so it works on touch.
- Clearer navigation on the home screen: the **"Faves" wordmark is now a
  home button** — already on the home screen it exits any open search or
  favourites view and scrolls to the top (a plain link to the home page if
  JavaScript's off). The favourites view gained an obvious **"‹ All places"**
  button, since pressing the Favourites toggle again to get back wasn't
  discoverable.
- Favourite hearts are larger and higher-contrast — a clear outline heart
  when unsaved, a filled accent heart when saved — with a springy pop when
  you save and a hover scale on pointer devices (motion-free under
  prefers-reduced-motion).
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
