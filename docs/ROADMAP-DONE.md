# Roadmap — resolved detail (archive)

Verbatim design records for the roadmap items that are **resolved** — shipped,
decided-against, or owner-parked — moved out of [`ROADMAP.md`](ROADMAP.md) on
2026-07-18 to keep the always-loaded roadmap to what's *open*. Each block is the
original write-up (the *why*, the deferrals, the rejected alternatives) — grep it
when a one-line pointer in the roadmap isn't enough; do not load it whole.
Sections follow the roadmap's own theme order. The current-truth/history split,
same as `SESSIONS`→`SESSIONS-ARCHIVE`.

## Theme 1 — From *decided* to *ordered*: the Order tally ★ flagship

> ✅ **Shipped 2026-07-08.** Built as designed below (`site/js/cart.js`
> model + `cart-ui.js`): a `+ / −` stepper on restaurant dish rows, a
> floating order button on every screen, a dialog grouped by venue with
> subtotals + a per-venue Call link, an estimated grand total (captioned
> "confirm at the till"), collect mode, and clear. `localStorage`-backed
> with a private-mode memory fallback; cross-tab synced. The STRATEGY
> non-goal clarification landed (⚑ resolved). **Deferred from v1:** the
> stepper on Cook-at-Home (that's cooking, not ordering — it's the
> eating-diary hook for the health app, Theme 6) and multi-person local
> profiles (single shared order for now). Owner to hallway-test at a real
> family order.

**The reframe.** Strategy names two jobs (*what shall we get?* and
*what's on their menu?*). This is the missing **Job 3 — "right, let's
order"**: as people call out what they want, build one running list
grouped by restaurant, then use it to (a) read the order down the phone
or hand it over the counter, (b) tick items off at pickup ("have I got it
all?"), and (c) sanity-check the total ("was I charged right?").

**Why it does *not* break the "no ordering/payments" non-goal.** There is
no transaction, no integration, no account — it's a local notepad that
tallies and groups. We still link out to phone/website to actually order.
**⚑ This needs a one-line clarification to STRATEGY's non-goal** so the
distinction is on the record.

**Design sketch.**
- Dish rows gain a quantity stepper (`− n +`, ≥44 px targets). Add from
  any venue *and* from Cook-at-Home.
- Persistent cart badge → a cart view grouped by restaurant, each with a
  subtotal + item count, plus a grand total.
- **Collect mode**: tick items off as they're handed over.
- **Price check**: the subtotal is an *estimate* from our menu data — and
  our prices are already flagged as needing an in-store refresh — so
  caption it "estimated from our menu; confirm at the till". Honest, and
  still catches gross mischarges.
- **Storage: `localStorage` only.** No names in the repo, but runtime
  local naming ("Booth", "Ruth") never leaves the device — this absorbs
  the parked "per-person shortlists" idea.
- **Multi-restaurant by design** (Indian mains + a Sprig + Fern drink run
  in one sitting).

Effort **M**. Client-side only, offline-native, zero backend.
**Accept when**: at a real family order, one person takes everyone's
requests, reads the list down the phone, ticks it off at pickup, and
sanity-checks the total — on a phone, offline.

## Theme 1b — Group ordering: send your picks to the orderer

**Done 2026-07-10** — codec + send (share sheet / copy link) +
receive-with-confirmation shipped and verified, and the **QR-code fallback
now shipped too**: a zero-dep byte-mode QR encoder (`site/js/qr.js`, level M,
versions 1–20) drawn to canvas in the send dialog, dark-on-light so it scans
in dark mode. Encoder maths pinned to the ISO/IEC 18004 constants in tests and
proven by an independent decode round-trip across versions; browser-verified
end-to-end (order → Show QR → the code's own link decodes back to the order).
The parked **shareable shortlist links** shipped the same day: the Favourites
view shares its list through the same dialog, encoding a `shortlist` payload
that merges into the receiver's favourites on confirm. **Theme 1b is fully
closed**; the only remaining acceptance is a real phone-camera scan (owner).
What follows is the original sketch.

Owner ask (2026-07-09), decision in **[ADR 0009]**. The scenario: five
people at the house, each picking dishes in Faves on their own phone;
everything lands on the host's order list so one person phones it in
and collects. Extends Theme 1, which shipped a *single shared* order
and explicitly deferred multi-person.

**Shape (per ADR 0009): share the finished picks, not a live session.**
Bluetooth is impossible browser-to-browser (and absent from iOS Safari);
serverless WebRTC needs ~2 QR scans per guest and dies when phones lock;
a backend room breaks no-backend (deferred — see the steer note up top).
Instead:

- **Send**: a "Send to the orderer" action on the order sheet encodes
  the guest's order into a **URL fragment** and hands it to the OS
  share sheet (AirDrop / Messages), with a **QR code** fallback
  (rendered locally — zero-dep, no chart API).
- **Receive**: opening the link merges those lines into the host's
  existing `cart.js` order, grouped by venue as today, with a
  confirmation ("Add Ruth's 4 items?") rather than a silent merge.
  An optional guest-typed label ("Ruth") rides along — device-local,
  never in the repo, same posture as favourites.
- **Codec**: one compact, versioned URL scheme (venue id + dish name or
  code + qty; compressed). **Design it once to also carry the parked
  "shareable shortlist links"** — same encode/decode, different payload
  type. Fragment (`#…`) not query string, so picks never appear in any
  server log. Unknown versions / malformed payloads fail soft to "this
  link didn't work — ask them to resend".

Effort **M** (codec + share/QR UI + merge flow + tests). Client-side
only, offline at the house once loaded. **Accept when**: at a real
five-person dinner, every guest's picks reach the host's phone without
anyone pairing, installing, or reading out a dish name — and one bad
link inconveniences only its sender.

## Theme 2 — Location & maps (ranking, coords, maps handoff)

- **Smart default order (availability + reachability)** `[M]` ✅ **done
  2026-07-08** — owner idea. The home list no longer sits in fixed curated
  order; it ranks by whether you can *order from a place right now*
  (`site/js/ranking.js`, pure + unit-tested). Open (right up to closing
  time — you might be 2 minutes away) and opening-within-the-hour venues
  float to the top; unknown-hours sit above definitely-closed; closed sinks
  to the bottom. **Favourites** lift within a tier via a *weighted* metric,
  not a hard win: a favourite (a hearted venue, or one holding a hearted
  dish — dish favourites flatten to their venue id) is treated as
  `favBoostKm` (default 10 km) nearer, so a favourite 8 km away beats a
  plain place 2 km away, but a favourite 30 km away (→ 20) sits below it.
  Never overrides availability (a closed favourite stays below anywhere
  open). When "Near me" is on, a venue past a "reachable tonight" radius
  (`farKm`, default 50 km straight-line — the Queenstown case, gated on
  *actual* distance) sinks below everything nearby. Full sort key: reachable
  → availability → effective (boosted) distance → favourite-tiebreak →
  curated. "Pick for us" shuffles only the available set (falling back to
  all if none). Both distances are **user-tunable** (see below). Superseded
  the plain distance sort (`sortByDistance` removed). Cook at Home ranks as
  always-available.
- **User settings for the distance dials** `[S]` ✅ **done 2026-07-08** —
  owner ask. A ⚙ on the home header opens a settings dialog with two live
  sliders: how much nearer a favourite counts (`favBoostKm`, 0–30) and the
  reachable radius (`farKm`, 5–100). Device-local (`site/js/settings.js`,
  `faves.settings.v1`, clamped/sanitised on read, unit-tested); the list
  re-ranks the instant you drag. First real **preferences** surface — the
  seam for future per-user options (te reo toggle, default filters).

## Theme 2 — Location & maps (cont.: what's close)

- **Coordinates in the schema** `[S][schema]` ✅ **done 2026-07-08** —
  `lat`/`lng` on every venue, geocoded from addresses (Nominatim,
  dev-time only). Unblocked the two below.
- **Native maps handoff** `[S]` ✅ **done 2026-07-08** (ADR 0005) — the
  menu screen's address row opens the device's *default* maps app: Apple
  Maps on iOS/macOS, a `geo:` link to the default app on Android, Google
  Maps on desktop, via platform detection (`site/js/geo.js`).
- **"What's close" = distance-sorted list** `[M][constraint]` ✅ **done
  2026-07-08** — a "📍 Near me" home-screen toggle uses
  `navigator.geolocation` + haversine (`site/js/distance.js`) to sort the
  list by distance ("1.2 km" on each card). No tiles, no map library →
  offline-safe and zero-dep. Delivers ~80% of the "what's near me" value.

## Theme 2 — decided against: a real tile map view

- **A real tile map view** `[L][constraint ✗]` — tile maps need an
  external tile source *and* a map library (CDN), which breaks "no
  external requests / offline-safe / no CDN". Recommend **not** building
  it; if ever, only as an online-only progressive enhancement. The
  distance list is the 80/20.

## Theme 2 — Location & maps (cont.: route, drive time, multi-location)

Shipped 2026-07-22/23; moved here verbatim from `ROADMAP.md` on 2026-07-23.

- ✅ **Pick along a route** `[L][constraint]` — **shipped 2026-07-23** (ADR
  0014), both recommended parts. **(a) Offline least-detour sort** (`site/js/
  route.js`): rank venues by added distance `dist(o,v)+dist(v,d)−dist(o,d)`
  (pure haversine, clamped ≥0 — the ROADMAP's preferred cost, honest at the
  behind-origin / past-destination edges perpendicular distance mishandles).
  Multi-location venues use their **best branch for the trip** (least detour, not
  nearest to origin). Detour **leads** the sort, availability is the secondary
  key (headline-metric-leads, like "Nearest first"); favourites are tiebreak only
  (no off-route boost); recipes pinned, stubs/coordless sink. Cards show "↩ +1.2
  km detour" / "On your way" + "~N min added", flagged straight-line. **(b)
  Routed maps handoff** (`geo.routeMapsUrlFor`): a per-card "🧭 Route via maps"
  hands origin→venue→dest to the maps app — **Google honours an intermediate
  waypoint** (real three-point road route); **Apple Maps' URL scheme has no
  waypoint param**, so it honestly routes to the venue. **Destination input:** a
  suburb (its venues' **centroid**) or a specific place, from data we already
  hold — **no geocoder, no stored address** (free-text and a persisted "Home"
  preset both rejected, ADR 0014). UI: a list-toggle beside "Near me" + a
  dismissible destination `<select>`; the two share one origin as mutually
  exclusive sort modes. **Live routed corridor stays ✗** (routing API =
  external/keyed/paid → breaks offline/zero-dep; deferred with the no-backend
  items). The "Pick for us" shuffle is unchanged (still the Near-me pool). New
  JS precached; `node --test` +23 route cases.

- ✅ **Drive time from me to a venue** `[M]` — **shipped 2026-07-22**. Both
  recommended parts: (a) the address-row maps handoff now requests *driving
  directions* from the viewer's location (Apple `daddr=…&dirflg=d`; Android/
  desktop Google Maps `dir/?…&travelmode=driving`), so the maps app shows the
  real, live drive time (`site/js/geo.js`, `site/js/menu.js`); (b) a rough
  "~N min drive" hint on Near-me home cards from the haversine distance
  (`estimateDriveMinutes`/`formatDriveTime` in `site/js/distance.js`, rendered
  muted + "~"). A live in-app routed time stays **✗** on the offline/keyed-API
  constraint. Rationale + rejected alternatives → ADR 0010. Android dropped the
  vendor-neutral `geo:` pin (it has no directions mode).
- ✅ **Restaurants with multiple locations** `[M][schema]` — **shipped
  2026-07-22** (shape (a), ADR 0011). One record per venue with an optional
  `locations: [{label?, address, lat, lng, phone, hours}]` array sharing the
  name/menu/cuisine; single-location records unchanged. `site/js/locations.js`
  reconciles both shapes and resolves the **nearest** branch, so "Near me"
  distance, the drive-time hint, the card's open/closed badge and the maps
  handoff all use it (the **primary** branch when location is unknown — not
  "any branch open", which would fight the distance shown). The menu screen
  lists every branch, nearest first, each with its own directions link, phone
  and hours (`site/js/menu.js`); `data.js` normalises the primary branch to the
  top level so existing consumers keep working; `validate.py` validates the
  branches. Kaffee Eis + Gong Cha converted to their one verified branch each —
  **second branches deferred** (need real addresses + a dev-time geocode; a
  content session appends them, no code change). `ba4fdea`, `eb23bbf`,
  `8739e7a`.

## Owner-reported — 2026-07-22 (raw notes, stored verbatim)

Resolved; moved here verbatim from `ROADMAP.md` on 2026-07-23. The owner's raw
quotes are kept intact.

- ✅ **Bug: "Nearest first" sorts 10 km above 2.5 km** — **fixed 2026-07-22**
  (`566aa20`). Owner report: "Selected 'Nearest first' and restaurants 10km are
  sorted higher on the list than restaurants 2.5km away. I suspect it is sorting
  as text rather than as a number." **Root cause was NOT a text sort** — every
  distance compare was already numeric. The sort-key *order* put availability
  (and the favourite boost) ahead of distance, so a farther-but-open (or
  hearted) venue floated above a nearer one, contradicting the "Nearest first"
  label. Fix: when "Nearest first" is on (origin known), distance leads;
  availability + favourite tiebreak follow. Default order (no location) is
  unchanged (open still floats up). Open/closed still shows as a badge + the
  "Open now" filter; favourites keep their `favBoostKm` pull.
  ⚠️ **Owner note:** if a *hearted* 10 km venue still shows above a plain 2.5 km
  one, that's the (deliberate, tested) favourite weighting — say if you'd rather
  "Nearest first" ignore hearts entirely.
- ✅ **Split versioning: app vs config vs data** `[M]` — **shipped 2026-07-23**
  (claimed 2026-07-22-1209, wt: faves-wave7-split-versioning; ADR 0015). Owner
  idea: "Should have a different version for the app vs the data it holds vs the
  configuration so that it can trigger a refresh based of any of them changing
  but only download the part(s) that change." `sw.js` now has two version
  constants — `SHELL_VERSION` (html/css/js/icons/webmanifest) and `DATA_VERSION`
  (index.json + restaurant JSON) — each naming its own cache. Bumping one
  rebuilds only that cache on install; the other survives, so a data-only menu
  edit refetches just `site/data/*` and no longer re-downloads the shell.
  **"Config" axis maps to shell** (`site.webmanifest`); `index.json` is data —
  no third cache warranted (reasoned in ADR 0015). Upgrade from the pre-split
  single cache builds-new-before-deleting-old so offline never breaks. Lockstep
  rule updated everywhere (CLAUDE.md/README/CONTRIBUTING/ARCHITECTURE);
  `validate.py` warns when data is dirty but `sw.js` isn't; static-shape test
  guards the split. Runtime upgrade behaviour needs a device pass (steps in
  ADR 0015).

## Theme 3 — UX & design pass

The umbrella "better UX and design", with your concrete asks:

- **Info panel on the right when there's room** `[M][design]` ✅ **done
  2026-07-08** — a `.menu-twocol` CSS grid (`min-width: 48rem`): the header
  spans the top, the menu sits left, and a **sticky** info column (contact
  card — call/pickup/hours — plus the Order-online buttons) rides on the
  right. Opt-in per page (venues with a real menu only; stubs and recipe
  collections stay single-column). Mobile is untouched — the grid just
  doesn't apply, so the header → aside → main DOM order reads as the old
  stack. `renderAside` in `menu.js`; verified via CDP at 1024 px + 390 px.
  - **Order-online buttons in that right column** `[S][design]` — owner ask
    (2026-07-08): on a wide screen, move the "Order online" buttons (Uber
    Eats, Delivereasy, the venue site) to the right of the phone/address/
    hours block as a **column of buttons with each platform's icon/logo**.
    *The column-of-buttons layout ✅ landed with the two-column panel above
    (`.menu-twocol .order-links` stacks them).* **Still open:** the
    per-platform **logos** — must be **self-hosted** (offline / no-hotlink
    rule), bundle small SVG/PNG marks under `site/img/` (mind each
    platform's brand-usage terms). Mobile keeps the current stacked layout.
- **Navigation & wayfinding** ✅ **done 2026-07-08** — the "Faves" wordmark
  is a home button (exits any open view + scrolls top on the home screen;
  a plain link to `index.html` otherwise), and the favourites view gained
  an explicit "‹ All places" exit (the toggle-again gesture wasn't
  discoverable). The menu/recipe **"← All restaurants" back link** ✅ **done
  2026-07-08** is now a proper bordered pill button (≥44 px, hover tint)
  instead of a faint text link — it was easy to miss on desktop
  (`.skip a`).
- **Overflow "⋯" / menu button** `[M][design]` ✅ **done 2026-07-08** — a ⋯
  button top-right of the home header opens a small popup holding
  **Favourites + Settings** (`overflow-ui.js`); the search field reclaims the
  full row. The two items keep their IDs so app.js / settings-ui.js wire them
  unchanged — the module only owns open/close + the keyboard model (arrows,
  Escape, outside-tap). Per the owner's steer the **Open-now / Cheap-eats /
  Near-me toggles stayed with the list**, and the per-restaurant dish filters
  are untouched. Room for future chrome (te reo toggle, about) in the same
  menu. Verified via CDP at 390px.
- **Nest dishes under their place in Favourites** `[M]` ✅ **done
  2026-07-08** — the favourites view groups by `venueId` (first-seen order):
  each place is a parent header (accent-soft, its own venue heart) with the
  hearted dishes nested on an indented rail beneath. The venue shows **even
  when only a dish of it is hearted** — its heart is then empty (tap to also
  save the place); a favourited venue shows it filled. Each dish keeps its
  inline un-heart, and the dish sub no longer repeats the venue name.
  Bespoke renderer in `app.js` reusing `resultRow` from `results-view.js`;
  summary now "N places, M dishes saved". Browser-verified at 390px with a
  seeded mix (favourited venue + dishes, a dish-only venue, a recipe).
- **Collapse the "needs a refresh" caveat into an info icon** `[S][design]`
  ✅ **done 2026-07-08** — the menu screen's always-on "Menu items and
  prices need a refresh…" banner is now a small **ⓘ beside the venue name**
  (`caveatDisclosure` in `menu.js`): a real `<button aria-expanded>` that
  reveals the note as a popover on tap, and on hover for pointer devices via
  CSS; closes on Escape (returning focus) or an outside tap. Not a bare
  `title`, so it works on touch. Sits between the venue name and its ♥; the
  popover is anchored within the title group so it never overflows the
  viewport (verified via CDP at 390 px: left 16 → right 359 of 390).
  Declutters the header.
- **Sticky search on phones** `[S][design]` ✅ **done 2026-07-08** — the
  menu search box and the section jump-nav now share one **sticky
  `.menu-toolbar`** pinned at the top (search above, nav below), so both
  stay reachable while scrolling a long menu. Section headings pin just
  under the toolbar (its height is JS-measured into `--toolbar-h`, so the
  offsets stay exact whatever the render); dish deep-links (`#dish-…`,
  picks, "goes well with") clear it too. Dietary chips dropped out of the
  pin to a row just below (they filter the sections and scroll away),
  keeping the pinned chrome light. Chose search-above-nav over the
  literal "under the section nav" so search (the primary action) leads and
  the reading/tab order stays natural.
- **Global search from the home screen** `[M]` ✅ **done 2026-07-08** —
  one search box on the home page that jumps straight to a **restaurant or
  a dish** by name ("mee goreng" → the dish across every venue; "sprig" →
  the venue; "gastropub" → venues by cuisine). All client-side over the
  already-loaded data (`site/js/search.js`, pure + unit-tested), so it's
  offline-safe and zero-dep — an index built once at load, results grouped
  "Places / Dishes", each linking to the venue (dish results deep-link to
  `#dish-…` via the shared `slug.js`, or to the recipe page for Cook at
  Home). While a query is live the browse cards, filters and shuffle hide
  (`body.searching`); clearing restores them. Superseded the older "does
  the home screen need a persistent search field?" question — yes, and it
  searches dish names + descriptions + ingredients, not just venue names.
- **Page footer** `[S]` ✅ **done 2026-07-08** — a `.site-footer` on the
  home screen: a short **privacy note** (no accounts, no tracking, no
  third-party scripts; favourites, order and settings stay on your device —
  the only thing fetched is the site's own pages) and a "Made by **cakeIT**"
  attribution. Static HTML so it shows without JS; lives inside `<main>` so
  the fixed filter bar's bottom padding keeps it clear of the bar (verified:
  footer bottom 702 ≤ bar top 732 at an 800 px viewport). Business
  attribution only — no contact details (personal-data rule). Still to do
  from the original note: a **role inbox** contact once the Theme 4c mailto
  lands. Pairs with the
  `/.well-known/security.txt` + provenance work in **Theme 7** (same "here's
  how this site treats you" surface). Keep it light and it stays within the
  no-personal-data rule (a business attribution is fine; no contact details
  beyond a role inbox if the Theme 4c mailto lands). Note: the app already
  ships a full **favicon / icon set** (`favicon.ico`, `icons/favicon.svg`,
  `apple-touch-icon.png`, PWA 192/512 + maskable, and a 1200×630 og-image).
- General polish to the "oh, this is nice" bar (`DESIGN.md` mood):
  spacing, motion, empty states, and the new cart UI.

**Accept when**: judged against `DESIGN.md` at 390 px, tablet and
desktop; Lighthouse a11y stays 100.

### Test-drive fixes — owner, 2026-07-10

From driving the test server. Two trivial ones fixed same day; the rest
sit here. Effort in `[S/M]`.

- ✅ **Home wordmark hover** `[S]` — **done 2026-07-10**. Dropped the
  underline; the "Faves" wordmark now warms to the accent and lifts 1 px on
  hover (reduced-motion drops the lift). `.app-home-link`.
- ✅ **"Needs a refresh" ⓘ more prominent** `[S]` — **done 2026-07-10**. The
  disclosure ⓘ beside an unverified venue's name is now orange (`--warn`) by
  default and a touch larger (1.45rem), with a soft halo on hover/open — it
  reads as a caution, not a passive hint. `.caveat-btn`.
- **Home ranking pass** `[M]` ✅ **done 2026-07-12** — added two sort keys to
  `ranking.js` ahead of the existing ones: `pinned` (the Cook-at-Home recipes
  collection always anchors the top) and `stub` (menu-less "coming soon" venues
  sink below everything orderable). Availability tier is zeroed for stubs so
  they order by distance, and `isAvailableNow` now excludes stubs so "Pick for
  us" won't land on one. 4 new unit tests; verified live over CDP with a
  geolocated origin. Still open: the **top-right** grid-position idea for Cook
  at Home (a CSS grid-order question, not ranking) — left for later.
  - **Near-me finding (Simmer/Marigold) resolved by the above.** With stubs
    ordered by distance, the closed café 400 m away now outranks the
    unknown-hours one 2.4 km away. (Content gap remains: Marigold's hours are
    still missing — worth filling.)
- **Restaurant page: contact block collapses on scroll** `[M]` ✅ **done
  2026-07-12** (`f33ff42`) — on phones, once the contact card scrolls out of
  view a compact `.contact-bar` (open-now status + a Call button) slides in,
  driven by an IntersectionObserver on the card (cheaper + jitter-free vs a
  scroll listener). Phone-only — never toggled on desktop, where the sticky
  two-column aside already parks contact. Its real height is measured into
  `--contact-bar-h` (`c5dc185`) so the toolbar offset can't overlap it at
  large font settings. Original sketch below.
  - _Sketch:_ as you scroll the dishes, shrink the contact card upward to a
    compact Call button, letting the dish list + category nav use the full
    width. The narrow-screen analogue of the wide two-column sticky aside.
- **Restaurant page: back-to-top button** `[S]` ✅ **done 2026-07-12**
  (`5f5a456`; scroll listener rAF-throttled in `c5dc185`) — a body-level
  floating "↑" control (`to-top.js`) shared by the menu screen and the home
  list, revealed only after scrolling down a bit, instant scroll under
  prefers-reduced-motion. Guarded against a double-append so either caller
  can init it safely.
- **Footer privacy line → behind an "About" surface** `[M]` ✅ **done
  2026-07-12** (`78a2cc4`) — the privacy blurb now lives in an **About**
  `<dialog>` (`about-ui.js`, modelled on the Settings sheet), opened from both
  the ⋯ menu (`#about-btn`) and a compact footer "About & privacy" link
  (`#about-open`). Progressive enhancement: no-JS visitors keep the full
  privacy paragraph inline; JS hides it and reveals the link, so the footer
  slims without losing the fail-soft copy.
- **Settings: language control shouldn't look like tabs** `[S]` ✅ **done
  2026-07-12** — replaced the segmented pill with a compact `<select>` dropdown
  (`.lang-select`, styled like the home Area/Cuisine selects); reads as "choose
  one language", stays tidy, and scales by adding an `<option>`. (Briefly a
  radio group; switched to a dropdown on owner feedback that it took too much
  space.)
- **Settings: collapsible chip groups** `[S]` ✅ **done 2026-07-12** — dietary
  and allergen chip groups clamp to one row behind a "Show all N" toggle
  (`collapsible()` in settings-ui.js), shown only when the chips actually
  overflow (measured on open/resize).
- **Settings: allergen caveat → ⓘ info tip** `[S]` ✅ **done 2026-07-12** —
  the always-confirm caveat now sits behind an ⓘ beside "Allergens to flag",
  via a shared `disclosure.js` extracted from menu.js's caveat pattern.
- **Overflow menu "stuck open"** `[S]` — **RESOLVED 2026-07-12.** The
  2026-07-10 "not reproducible" call was a misdiagnosis: CDP checked the
  `hidden` *attribute* (which the JS toggles correctly) but not the *computed
  style*. Real cause was CSS — `.overflow-menu { display: flex }` (author rule)
  overrides the UA `[hidden] { display: none }` at equal specificity, so the
  attribute could never hide the popup and it rendered open on load. Fixed with
  a `.overflow-menu[hidden] { display: none }` guard in `app.css`.

### Test-drive fixes — owner, 2026-07-12

Second device pass, after the site went live. Effort in `[S/M]`.

- **Home: "Pick for us" FAB eats phone real estate** `[S]` ✅ **done
  2026-07-12** (`5f2b618`) — took the hide-on-scroll route (kept in place, not
  relocated): the FAB gains `.is-tucked` while scrolling *down* past ~160 px
  and returns on scroll-up or near the top (`picker.js`, rAF-throttled). The
  ≥44 px target and reduced-motion behaviour are untouched; it also un-tucks
  when a browse view reopens.
- **⋯ menu: "Share this app"** `[S]` ✅ **done 2026-07-12** (`5f2b618`) — a
  "Share this app" item in the ⋯ menu (`#share-app-btn`, `share-app.js`) hands
  the app's own canonical URL to `navigator.share`, falling back to copy-link
  + a toast where native share is absent. Shares the *app* (so others can
  install it), distinct from the favourites/picks flows that share *content*;
  reuses the `share-core.js` share/clipboard primitives.

### Cook-at-Home grid position — owner, 2026-07-22

Moved here from `ROADMAP.md`'s Theme 3 "Still open (small)" blockquote on
2026-07-23 (the order-online-logos item in that blockquote stays open).

- ✅ **Cook-at-Home top-right grid position — shipped
  2026-07-22:** pure-CSS grid placement puts the recipes card in the top-right
  cell on the multi-column layout (≥34rem), leaving the prime top-left slot to
  the first restaurant; ranking still pins it first in the DOM, so on the
  single-column mobile layout it stays anchored at the top (unchanged). Negative
  column lines keep it top-right if a third column is ever added.
  `.card-grid .card-recipes` in `site/css/app.css`.

## Theme 4 — Content growth: dish-photo rendering

- **Dish photos** `[L][schema]` ✅ **rendering done 2026-07-08** — the
  `image`/`alt` field + lazy-loaded `<img>` with an aspect-ratio box (no
  layout shift) ships on both placements: a venue **card photo** and a
  menu **dish photo**, self-hosted (offline-safe), the SW's capped image
  cache already covering them. *Now purely a sourcing task*: drop owner
  photos into `intake/` → they light up per venue. Generic stock only as a
  captioned, licensed fallback.

- **Drinks** `[S][content]` ✅ **owner ruled 2026-08-15: add them all.** Asked
  as a product question (does a "what shall we eat" app want a wine list?);
  answered yes. Done for The Borough (81 drinks) and Southern Cross (85);
  1841 publishes no beverage list at all, which stays open under Theme 4.
  **The trap, for whoever adds the next one:** drinks are mostly cheaper than
  mains, so they drag `priceBand`'s median down — here from ~$24 to exactly
  $14.00, under the `$` band's inclusive $15 ceiling, turning two gastropubs
  into takeaway-priced cards on the home list and in the ranking. Nothing in
  the diff hints at it. Both venues now carry a curated `priceBand: "$$"` and
  a `pricePerPerson` from the **food-only** median; `price.js` suppresses the
  contradictory derived figure itself. Serving sizes were recorded only where
  the menu labels them — unlabelled tap columns say so rather than inventing
  a pint or a jug.

## Theme 4b — Meals vs dishes: recommended pairings

- **(b) Recommended pairings** `[M][schema]` ✅ **done 2026-07-08** (ADR
  0007) — optional `goesWith` per item (dish names, same record or
  `id#dish` cross-record) → "Goes well with …" deep-link chips. Seeded on
  Cook-at-Home mains. Light, additive, our curation (no backend), and it
  **generalises to restaurant dishes** ("add a Sprig + Fern drink to
  this"). Bridge to the order tally (Theme 1) and the "meal" seed for the
  health app (Theme 6).

## Theme 4c — User contributions: pre-decision analysis (owner parked it)

Owner idea (2026-07-08): let people **request a restaurant be added**, and
**report changes** — a new dish, a price that's moved, a photo of the menu
or a dish. This is the public-facing front door to the existing `intake/`
pipeline (drop material in → transcribe to schema).

The honest shape within the constraints (no backend, no accounts, no
external requests in the artefact):

- **`mailto:` links** `[S]` — *recommended.* A "Suggest a place" and a
  per-venue "Something changed? Tell us" link that opens the user's mail
  app pre-filled (subject + a template body, the venue id baked in). Zero
  backend, zero dependency, works from the installed PWA. Photos: the user
  attaches them in their mail app (mailto can't carry attachments), which
  is exactly what feeds `intake/`. The only cost is exposing the owner's
  contact email — a `role`-style inbox (not personal) keeps the no-
  personal-data line clean, and pairs with the `security.txt` in Theme 7.
- **A tiny prefill form** `[M]` — a `<form>` that assembles the report and
  opens the `mailto:` with the body filled from the fields (still no
  backend). Nicer UX; more code. Do only if the bare links prove too
  blunt.
- **Third-party form (Google Form / Formspree)** `[M]` **⚑ ✗ by default** —
  would capture submissions *with* photo uploads, but sends user data to a
  third party and adds an external destination. It's a link-out (not a
  bundled dependency, so it doesn't break offline), but it dilutes the
  "no third-party, no accounts" stance. Only if the owner explicitly wants
  managed intake with image uploads.

**⚑ owner decided 2026-07-08: no email, and parked ("decide later") — ship
the deploy first.** So `mailto:` is out. When revisited, the honest candidates
are: **GitHub Issues** (a pre-filled `issues/new` link to a *public*
`faves-feedback` repo — keeps the code repo private; free, no backend, natural
triage; the sender needs a GitHub account); or a **Cloudflare Pages form +
edge function** (no account/third-party for the sender, supports photo uploads
to R2, but adds serverless code + a spam guard). Third-party forms remain
✗-by-default. Original (now superseded) recommendation below.

~~Recommend the **`mailto:` links** first — smallest, honest, and it already
has a home in `intake/`. **⚑ owner to supply the intake email address.**~~
**Named / personalised feedback** (owner ask, 2026-07-08) is free here: the
mailto template (or the prefill form) can include an optional "your name"
field, so a report arrives attributed — no account needed, the sender just
types it. (Their email address comes with the message anyway.)

## Theme 5 — Richer dish data (price, codes, allergens, dietary)

- **Typical price per person** `[S]` ✅ **done 2026-07-08** — a $/$$/$$$
  chip with a "~$Npp" estimate on the home card and the menu header,
  computed from the venue's *own* listed prices (`site/js/price.js`, pure +
  unit-tested). The signal is the **median** of a venue's priced items
  (~one dish per person; median, not mean, so a couple of pricey specials or
  cheap sides don't skew it), banded $ ≤ $15, $$ ≤ $30, $$$ above; hidden
  when there are < 3 priced items (stubs, recipes, thin menus). Captioned
  "estimated from the menu" and honest that our prices need an in-store
  refresh. The **cheap-eats filter** ✅ **done 2026-07-08** — a 💸 toggle in the
  home list-toggles row (beside "Open now") narrows the list to the **$** band
  (`isCheapEats` in `price.js`, self-consistent with the card chip; a null-band
  venue is *not* cheap — we can't vouch it is). AND-ed in `applyFilters`, so
  **"Pick for us" inherits it for free** (no picker-specific plumbing). First
  built inside the picker dialog, then moved to the main list — a filter is a
  list question, not a dice question (owner + Fable UX review agreed).
  The curated `priceBand` override ✅ **done 2026-07-08** — a record may carry
  an authoritative `priceBand` (+ optional `pricePerPerson`) that wins over the
  median where it misleads; set "$$" on Khandallah Trading Co (was "$") and
  R & S Satay (was "$$$"), which also corrects the cheap-eats filter.
- **Dish order-codes, separate from the name** `[S][schema]` ✅ **done
  2026-07-09** — owner ask. Some venues number their dishes on the board and
  take orders by number ("two number 14s and one 22"). KC Cafe's menu was
  transcribed from a photo with the numbers **baked into the name** ("1.
  Chicken Curry on Rice", 159/169 items) — useful only if the venue recognises
  the number, but wrong as part of the dish name (broke search, slugs, picks
  matching, and sort). Added an optional item field `code` (non-empty string,
  e.g. `"14"`); **stripped the leading `N.`/`N)` prefix out of `name` into
  `code`** for KC Cafe (159 items, surgical text edit preserving formatting; no
  stripped-name collisions); renders as a muted `#14` badge on the dish row
  (a `.dish-code` span before a new `.dish-name-text` span, so it never runs
  into the title), and **search matches it** (`code` joins the dish haystack).
  Only populated where the venue actually orders by number ("no code = not
  stated"). Schema + rule in `ARCHITECTURE.md`, `validate.py` (optional string;
  picks still match the *stripped* name), `menu.js` dish row, `search.js` +
  test. KC Cafe was the only affected file. node --test 119→120; validate +
  check_no_deps clean; badge render-verified via headless Chrome DOM dump at
  390px.
- **More allergens** `[S][schema]` ✅ **vocabulary done 2026-07-09** —
  extended the closed allergen tag set with `contains-egg`,
  `contains-dairy`, `contains-gluten`, `contains-soy`, `contains-sesame`
  (ARCHITECTURE.md, `validate.py`, and the `ALLERGEN` display maps in
  `menu.js` + `recipe.js`; they render as the same ⚠ warning chips). The
  honest part remains *populating* it — "no tag = not stated" means owner or
  menu confirmation, never guesses — so **no existing dishes were tagged**;
  that lands via `intake/`. Makes the personal allergy preference below more
  useful.
- **Dietary / allergy preferences (personal)** `[M]` ✅ **done 2026-07-09** —
  owner ask. The Settings dialog (⋯ menu) gained a **Food preferences**
  section: pick your **dietary needs** (veg/vegan/GF/DF) and the **allergens
  to flag** (the full 8-tag set), device-local in the same `settings.js`
  store (`diet: {dietary, avoid}`, sanitised to the closed vocabulary,
  unit-tested). Applied on every menu: dietary needs **pre-select the
  matching dietary chips** (so non-matching dishes dim on load), and a
  flagged allergen makes the matching ⚠ warning **shout** (filled-red
  `is-flagged` chip) with a warning rail down the whole dish row
  (`.dish-flagged`); recipe pages foreground flagged allergens too. **Safety
  framing is load-bearing and shipped:** a note reads "Always confirm for
  allergies — we only show what venues told us; no tag means not stated, not
  free of it. This highlights and filters; it isn't a guarantee." Avoided
  allergens read red (danger), dietary needs read accent. Verified via
  headless Chrome at 390px with a seeded profile (contains-nuts flagged +
  rails, veg chip pre-pressed, 161 non-veg dishes dimmed). Pairs with "More
  allergens" (the richer tag set makes it more useful). *Fixed en route: the
  diet chip's `aria-pressed` was set as an ineffective JS property, never the
  attribute the CSS matches — pre-selected chips didn't look pressed.*

## Theme 5 — decided against: popular / busy times

- **Popular / busy times** `[M][constraint ✗]` — owner ask. Google's
  "popular times" has **no official public API**; the only ways to get it
  are unsupported scraping or unofficial libraries (against ToS, fragile).
  Recommend **not** ingesting it. If wanted, the "See reviews" link-out to
  the Google listing already surfaces busy times there. A legitimate
  in-app alternative *later*: infer rough busyness from our own order-tally
  usage once that exists (Theme 1) — but that's a weak signal at our scale.

## Theme 5 — hearted favourites

- **Hearted favourites (local-only)** `[M]` ✅ **done 2026-07-08** — a
  ♥ toggle on any dish (restaurant menus *and* Cook at Home) *and* on a
  whole venue saves it to `localStorage` (`site/js/favourites.js` model +
  `favourites-ui.js` heart, both unit-tested/DOM-free split). A
  **Favourites** toggle beside the home search opens a view (shares the
  search panel's grouped renderer, `results-view.js`) that gathers saved
  Places + Dishes, each deep-linking there via the shared `slug`, with an
  inline heart to remove. Built the shared `store.js` (`safeStorage` with a
  private-mode fallback) and refactored the order tally onto it too. No
  account, no backend, stays on the device — the same personal-layer store
  as the order tally (Theme 1) and local ratings above; nothing personal
  enters the repo. It built the `localStorage` plumbing (`store.js`) that
  local ratings and profiles will reuse. **Surface hearts in "Pick for us"
  (favour the usual)** ✅ **done 2026-07-09** — the shuffle draws with a small
  weight (`FAV_WEIGHT`) on favourited venues (`weightedPick`, pure +
  unit-tested), leaning toward the usual without excluding the rest.
  **Heart-from-the-home-card** ✅ **done 2026-07-09** — the ♥ toggle sits on
  each browse card as a sibling of the link (not nested in the `<a>`),
  absolutely positioned top-right. **Still open:** feed the health app's
  eating diary (Theme 6). Pairs neatly with `goesWith` (Theme 4b) — a
  favourite dish can suggest its usual companions.

## Theme 7 — Provenance: SBOM + zero-dependency CI guard

- **SBOM publishing** `[S]` ✅ **done 2026-07-09** (ADR 0008) — CycloneDX 1.5
  JSON at `site/.well-known/sbom.json` (served at `/.well-known/sbom.json`),
  generated by `tools/gen_sbom.py` (stdlib only). Third-party `components` is
  **empty by construction** — the whole point. **Deterministic**: no wall-clock
  timestamp (git supplies the date), `serialNumber` is a uuid5 of the doc's own
  canonical body, so an unchanged tree regenerates byte-for-byte. That makes
  `gen_sbom.py --check` a reliable CI gate (wired in as its own job) — a stale
  commit fails, and any future third-party entry shows up as a diff. Reads
  `package.json` through the *same* dependency-key set as `check_no_deps.py` so
  the two can't disagree. Committed rather than deploy-generated because
  Cloudflare Pages runs no build command (ADR 0004). Dev toolchain (Node, test
  runner) is out of the shipped SBOM.
- **Zero-dependency CI guard** `[S]` ✅ **done 2026-07-08** —
  `tools/check_no_deps.py` fails if `package.json` gains any dependency
  key, or a lockfile/`node_modules` appears; wired into CI as its own
  job. Machine-enforces the invariant ADR 0001 rests on, so the "no
  dependencies" promise can't rot silently — and it's what protects the
  SBOM's emptiness. Pulled forward pre-launch since it guards the
  `package.json` introduced for tests.

## Theme 7 — acceptance (met)

Effort **S** overall, no runtime/offline impact. **Accept when**: an SBOM
is published for the deployed site and CI fails on an unexpected
dependency.

## Also parked (small) — shipped

- ~~**"Open now"** from the `hours` data on cards.~~ ✅ **done
  2026-07-08** — grew into a full live status (open/closing-soon/closed +
  relative time) on cards and the menu screen, on a structured per-day
  hours model computed in NZ time ([ADR 0006]), **plus an "Open now"
  filter toggle** in the home results head.
- ~~**Shareable group shortlist links** (encode the shortlist in the URL —
  no backend needed).~~ ✅ **done 2026-07-10** — a "Share these" button in the
  Favourites view sends the shortlist through the same share dialog as an
  order (share sheet / copy link / QR), encoding a `shortlist` payload
  ([ADR 0009]); opening the link offers to merge the places and dishes into
  the receiver's own favourites, recipe flag preserved so recipe favourites
  still deep-link correctly.
- ~~**Te reo Māori UI toggle.**~~ ✅ **first pass done 2026-07-09** — a
  device-local language switch in Settings (English / Te Reo Māori). A small
  i18n engine (`site/js/reo.js`) translates the app *chrome* via `data-i18n`
  attributes (+ `t()` for JS-built strings), capturing the English source so
  the switch is lossless, and sets `<html lang>`. Menu content stays as venues
  wrote it. Store-backed (`settings.lang`, sanitised). **Scope:** home screen +
  the Pick-for-us/Settings dialogs + menu/recipe back-links; **2026-07-09
  (same day, second pass): the generated menu + recipe screen chrome too** —
  contact/order labels, picks heading, search, stub/loading notes, recipe
  headings, and the screens' aria labels (JS-built nodes carry `data-i18n`
  and are translated after render). **Still English deliberately:** all
  safety text (allergen/dietary tags + filters, the refresh caveat, allergy
  framing, privacy note, error prose), interpolated strings ("Serves 4",
  hours badges, order-sheet counts — the engine swaps whole strings only),
  and venue content. **Follow-ups:** the order sheet + favourites chrome
  (wants string interpolation), and a **reo review of the wording** before
  the public launch (Phase 7). Missing keys fall back to English, so
  extending is purely additive.

- **Te reo Māori wording review** ✅ **ran 2026-07-22** — moved here from
  `ROADMAP.md` on 2026-07-23. The pre-launch reo **wording review ran**
  (2026-07-22,
  [`docs/reviews/2026-07-22-1148-reo-wording-review.md`](reviews/2026-07-22-1148-reo-wording-review.md)):
  all 68 strings reviewed — macrons clean, 59 kept, 0 wording changes, 9
  flagged, plus a `lang="mi"` per-part a11y fix. ⚠ **honest caveat:** an AI
  pass, not a fluent-speaker sign-off — a native review of the 9 flagged
  strings remains the owner option before public launch.

## Theme 15 — UI consistency, navigation & layout

- ~~**`.order-head` is defined twice in `app.css`**~~ ✅ **fixed 2026-08-09**
  (wt: faves-orderhead) — confirmed the collision: the order/share/recv/
  transfer sheet family's header bar and the menu screen's small uppercase
  "Order online" label were both `.order-head`, and the later rule won, so
  sheet titles rendered uppercase and shrunk on the menu screen (found
  2026-08-09 building the report sheet, which had dodged the collision with
  its own `.report-head` — ADR 0028). Renamed the menu label to
  `.order-block-head`; the sheet family keeps `.order-head` unchanged.
  Checked every other duplicate selector in `app.css` (`.pick-fab`,
  `.share-link`, `.settings-back`, `.update-notice-dismiss`, `.report-text`)
  — all are adjacent, additive split rules for the same element, not
  collisions; none touched. Verified live in headless Chrome: the order
  sheet and share sheet titles render with `text-transform: none`, and
  `.order-block-head` keeps its own uppercase label styling untouched.
- ~~**"Your data" panel is outgrowing its sheet**~~ ✅ **fixed 2026-08-09**
  (wt: faves-yourdata) — measured first (390 px, real Chrome via
  `device_check.mjs`'s CDP harness): **1009 px, 15 children**, not the
  roadmap's ~980 px estimate — grown further since ADR 0030 flagged it at
  778 px. Split by data model, not the roadmap's file/cache-shaped "Your
  data" / "Storage & refresh": export, import and transfer stay together
  under "Your data" (all three move the personal data blob, none
  destructive without its own confirm); refresh (app cache) and reset
  (preferences) move to a new "Refresh & reset" row — they share no data
  model, but both are destructive-with-confirm housekeeping distinct from
  backup/restore/transfer. Measured after: **607 px** and **449 px**, both
  well under the ~790 px the sheet shows. New row summaries name only their
  own panel's actions ("Save a copy, bring it back, or hand it to another
  device"; "Refresh the offline copy, or reset your preferences") — neither
  needs an "and the rest". Every confirm guard (import review, replace,
  reset, refresh) verified working post-move: 13/13 functional checks and
  the existing `device_check.mjs` safety-reapply suite (15/15) both pass in
  headless Chrome; 483 unit tests unaffected (no pure logic changed). New
  reo key `settings.refreshResetTitle` left `// draft` for the Phase 7
  review. Full reasoning, including the rejected splits, in ADR 0033.

## Theme 13 — What the time dimension unlocks

Resolved items only; the open ones stay in [`ROADMAP.md`](ROADMAP.md).

- [x] **f. `verified` must carry its derivation** `[M][schema]` — shipped
  2026-08-09 (ADR 0031). `verified` keeps its shape and gains a sibling
  **`verifiedBy`** naming one of six **source classes**: `in-store` ·
  `paper-menu` · `official-site` · `phone` · `delivery-app` ·
  `third-party`. Granularity is the **record**, argued rather than assumed —
  acquisition here is a session act (one person, one source, a whole menu),
  and where a menu genuinely has two readings the schema already separates
  them as two price-series entries, so an optional per-entry `method`
  override ships too and inherits the venue's when absent. Per-price as the
  primary level was rejected: with no backfill it would ship 100% empty
  (§9's own "more dimension than the questions justify"). `verified` as an
  object was rejected too — four live consumers read it as a bare string on
  installed phones. `validate.py` errors on an off-vocabulary method, a
  method with no date, and `status: "verified"` without both; it **warns**
  on a date with no method, so nothing is invented. Applied to the only two
  records with a date, from provenance `SESSIONS.md` states: Gold Lining
  `in-store`, Churton `paper-menu`. Menu header reads "Read from a paper
  menu, 8 Aug 2026". Verified: node --test 491 pass, validate 31 files, <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  headless-Chrome check on the two records at 390 px.

## Tooling — the gates themselves

- [x] **A negative dish price validated clean** `[S][schema]` — fixed
  2026-08-09. Found by mutation-testing `validate.py`: 8 deliberate
  corruptions of a real record, 7 caught, this one through. `price` was
  type-checked (number, not bool, not string, series values checked
  identically under ADR 0023) but never **sign**-checked, while
  `pricePerPerson` ten lines above it had always required `> 0`. One
  rule in the file guarded its sign and its neighbour did not.
  The bound shipped is `>= 0`, not `> 0`: a genuinely free item is a
  real thing a menu can say, and refusing it would push the value to
  `null`, which already means "no price recorded" — a different fact.
  No data changed (checked: no zero and no negative prices across all
  31 records; the lowest real price is $0.90).
  **The durable half is `tools/test_validate.py`** — the harness made
  permanent and wired into CI. It copies the data + tools to a temp
  dir, breaks one real record 14 specific ways, and asserts the gate
  errors, warns or accepts as specified. Self-checked by deleting the
  new sign check and confirming the harness exits 1 naming the hole,
  then restoring it and confirming exit 0 — a harness that cannot fail
  would have been worthless. It is this repo's **first Python test**:
  483 JS tests and zero Python ones meant every `tools/*.py` gate was
  itself unexercised, and a validator's failure mode is silence — a
  check that never fires looks exactly like data that is always clean.

### One noun for one thing — the wording sweep (Theme 15b, 2026-08-09)

Shipped on `faves-one-noun`, [ADR 0035](decisions/0035-one-noun-place-and-branch.md).
The decision, the calls made inside it, and what it deliberately left alone.

**The two nouns.** *place* for a venue as the reader sees it; *branch* for one
location of a place that has several. Chosen over *venue* / *restaurant* /
*spot*, all now retired from user-facing copy (they survive as code identifiers
and inside real business names). Two grounds beyond the owner's own steer:
*place* was already the commonest noun, so fewest strings moved; and it is the
only candidate that is not false for **Cook at Home** — your own kitchen is a
place, it is not a venue or a restaurant.

**The trap, and why "replace branches with places" could not be taken
literally.** The owner's raw words were *"I would prefer to replace branches
with places"*. Applied to both dials that would have been a regression: they do
different jobs — `farKm` filters **which places you see at all**, `favBoostKm`
picks **which branches of one place** its contact card shows. Two labels reading
"places" would present one job twice. The resolution is that each label names
its own subject, and the possessive carries it: "Hide **places** further than"
over "Show **a place's** branches within" — the second says plainly that it
works *inside* one of the things the first filters. Measured at 390 px in
headless Chrome on a fresh profile: both labels sit on one line beside their
readout, `scrollWidth 390 == clientWidth`, no horizontal overflow.

**The reo lockstep held, and it was a real risk not a theoretical one.**
Exactly one keyed English string changed: `nav.allRestaurants`, "← All
restaurants" → "← All places". Its Māori was `← Ngā wharekai katoa`, and
*wharekai* means specifically a restaurant/eating-house — it desynced the
instant the English stopped saying "restaurants". Resolved by re-using the
already-reviewed value of `fav.allPlaces` (identical English, identical Māori)
rather than drafting a fresh string, so no new `// draft` was warranted.
Verified live: switching Language to Te Reo Māori through the real Settings UI
renders `← Ngā wāhi katoa` on the menu page, macron intact.

🎯 **Three calls the owner may want to overrule.**
1. **"Branch" was kept**, not folded into "places" — the roadmap's own trap
   paragraph says merging them is a regression. This is the line to push back on
   if one word everywhere is genuinely wanted.
2. **The two dials were reordered**, `farKm` first. Layout, not copy; done
   because "which places, then which branches within one" is the order the
   sentence reads in, and it matches the index-row summary. Two lines to revert.
3. **Safety-adjacent copy was touched**: the allergen caveat's *"Some tags come
   from the venue"* → *"…the place"*, despite a code comment saying it stays
   verbatim. Meaning is identical; "verbatim" was read as *don't paraphrase or
   shorten*, which this does not.

**Deliberately left alone.** The meta/manifest descriptions still say
*"Wellington restaurants and takeaways"* — that is a category description for a
search engine, not the interface's noun, and "places" there is vaguer and worse
against the SEO ≥ 95 bar. The idiom *"in one place"* survives in the tagline,
the About lede and "put this data in its place": context disambiguates
completely, and purging it costs charm plus a fresh te reo draft of `app.sub`
for no reader gain.

🚩 **A pre-existing te reo collision found, flagged not fixed.** `service.all`
("Everywhere", the home segmented control) translates to `Ngā wāhi katoa` —
word-for-word identical to the "All places" keys, which are a different job. Not
created by this change. Left with a comment in `reo.js` for the reo review
queue; whether it wants *ngā momo katoa* (all kinds) or something else is a
speaker's call, not a non-speaker's guess. Separately, `menu.branches`
("Branches") still has no reo entry and falls through to English, as before —
the obvious word *peka* is already spoken for by `route.detour`.

**Not verified:** no real phone (headless Chrome at 390 px only, not iOS Safari
or Chrome Android); Lighthouse not re-run (copy-only, meta untouched, so no
movement expected — but that is reasoning, not a measurement); te reo
correctness rests on re-using a reviewed string, not on a speaker's review.

## Theme 19 — from the 2026-08-15 Johnsonville intake

**Street numbers, hours, phones and pins for the three new venues** `[S][data]`
— **done 2026-08-15**, in the session that raised them the same morning.

Round one recorded the three new Johnsonville venues with street-level addresses
and null coordinates, because the photos' GPS put four different venues inside a
**25 m** circle — phone error, not separation — and the coordinate audit's rule
is that a wrong pin is worse than an imprecise one. The blocking input was the
street number, not the geocoder.

Found online and confirmed: **103** BurgerFuel, **105** Noodle Canteen, **109**
The Ramen Shop, Johnsonville Road. Each geocoded through `audit_coords.py`'s
Nominatim client to **house-number level** — the standard the audit set — and
each landing within **~20 m** of the photo GPS. That agreement is the useful
part: the address lookup and the photo sort were independent, and they concur.

Hours and phones were taken from the strongest source each venue had, and the
record says which rather than flattening them: BurgerFuel and The Ramen Shop
from their **own sites** (`official-site`), Noodle Canteen only from a
**directory listing** (`third-party`). The Ramen Shop's published phone matches
the number read off its shopfront sign in the round-one photos — independent
agreement between a first-party site and a first-party photograph.

This is what drove the `menu.js` change in the same session: the two untrusted
methods can never head the *menu* half of the confidence note, but they reach
the *details* half, and without their own phrasing they inherited the bare
"checked" fallback and read as first-party.

**Thai Tara "Prawns twister"** `[XS][data]` — **done 2026-08-15**. Round one
left the dish out because its handwritten price sticker was unreadable at native
resolution (leading digit 3 or 5, both implausible beside its $12.90
neighbours). The owner overruled that, and was right: the dish now exists with
`price: null` and the reason in its description. It degrades correctly —
`menu.js` renders "—" and `cart.js` already sets `hasUnpriced` — so the honest
gap is visible where the absence was invisible. The general lesson is worth
keeping: *flagged-not-guessed* should mean the record carries the gap, not that
the record omits the thing.

## Also parked (small) — `pathscan` goes from decorative back to green

✅ **Closed 2026-08-15.** The item ran from 2026-08-09 (25 standing warn-only
findings, i.e. a guard nobody reads) to a clean scan today. Three classes were
triaged; two were ours and closed on 2026-08-09, the third was upstream's and
closed by upstream on 2026-08-10.

**The two classes that were ours (fixed 2026-08-09, wt `faves-pathscan`).**
34 findings at fix time — the "25" in the original item title was already stale
when the work started, and was deliberately left as the item's identifier rather
than corrected.

- **10 were genuinely loose.** Prose shorthand that omitted the real path
  (`data/index.json` → `site/data/index.json` in `ARCHITECTURE.md`, <!-- pathscan:allow: the pre-fix shorthand this bullet documents, not a live reference -->
  `WORKPLAN.md` and ADR 0015; `data/restaurants/cook-at-home.json` → <!-- pathscan:allow: the pre-fix shorthand this bullet documents, not a live reference -->
  `site/data/restaurants/cook-at-home.json`), plus two non-path collisions
  reworded (`docs/records` → "our records"; `Docs/tests` → "Docs and tests" <!-- pathscan:allow: the pre-fix wording this bullet documents, not a live reference --> <!-- pathscan:allow: the pre-fix wording this bullet documents, not a live reference -->
  in ADR 0019 — decision content untouched, only the accidental slash). No
  target was invented; every fix pointed at a file confirmed to exist.
- **8 were correct as written** and got `pathscan:allow` markers stating why
  they resolve outside this repo: cross-repo atelier paths, a pointer to the
  `rpi` repo's ADR 0009, the reusable-workflow Actions slug in `GO-PUBLIC.md`,
  and three historical references inside the append-only `SESSIONS.md`. No
  history was rewritten — a marker annotates a line, it does not restate it.

**The class that was upstream's — and the diagnosis we got wrong.**
16 findings were a real defect in atelier's `pathscan`, correctly identified as
*not ours to fix*. Per the owner's 2026-08-09 ruling (**a child repo may queue a
finding in the target repo's own roadmap — queue, never deliver**) it was filed
as atelier Track E item E8 (`atelier@88a54a3`) with a minimal repro, and left
flagging here rather than allow-markered, so the count stayed honest while the
fix was pending.

🔎 **Our stated root cause was wrong, and the correction is the useful half.**
We reported the trigger as *"the leading-slash-plus-dot form"* — a root-anchored
path whose first segment starts with a dot. The repro supported that honestly,
because `/.well-known/security.txt` was the only failing shape we had. Upstream's
fix (`atelier@ab74014`) found the actual trigger is **a hyphen anywhere before
the token's last `/`** — `/docs/some-dir/x.md` truncates to `dir/x.md` with no <!-- pathscan:allow: quoted as an example of the defect, not a live reference -->
dot involved. `_PATH_TOKEN`'s lookbehind excluded `\w`, `.`, `/`, `*` and `?`
but not `-`, while the token class accepted `-`. `.well-known` merely happened
to contain a hyphen. **The lesson worth carrying:** a repro built from one
failing shape confirms the shape, not the cause — we generalised from a sample
of one, and named the one feature of that sample that caught the eye. When the
next cross-repo defect is queued, the repro should try to *vary* each suspected
feature independently before the diagnosis is written down.

**Verified 2026-08-15, not asserted.** The upstream fix was re-tested here in a
clean throwaway repo against all three shapes (`site/.well-known/sbom.json`,
`/.well-known/security.txt`, `/docs/some-dir/x.md`): all pass. In this tree the
16 findings went to **0**. The two that remained were this repo's own prose
quoting the mangled string `known/security.txt` as an example — the same class <!-- pathscan:allow: quoted as an example of the defect, not a live reference -->
already marked in 2026-08-09, and marked the same way rather than rewritten,
because rewriting the example would destroy it.

**Thai Tara: the leaflet and the in-store card disagree** `[S][data]` — **ruled
by the owner 2026-08-15**, same day it was raised.

Two menus read the same day disagreed. The laminated card photographed at the
counter carries handwritten price stickers over an older print; the takeaway
leaflet collected that afternoon is a newer print run with its prices printed.
They conflicted three ways: **item numbers permuted** (the fried-rice list runs
green curry / nasi goreng / tom yum on the card, nasi goreng / spicy / green
curry on the leaflet, and the stir-fry numbers differ too), **two prices $1
apart** (Thai basil and Thai chilli, $21.50 on the card against $22.50 printed),
and **the leaflet carried no duck dishes at all** while adding a laksa curry
noodle soup the card lacks.

The session deliberately did not resolve it, on the ground that a reading is not
evidence about a *different* reading. The owner's rule:

> **The dine-in card wins on contradictions** — differing prices, differing dish
> numbers. **Dishes are additive** — where either menu has something the other
> lacks, include it.

Both halves were already satisfied by what the session had recorded, which is
the useful confirmation: the card's prices and codes were stored, the laksa was
added, and the duck dishes were kept. The reasoning behind each half is worth
carrying forward, because it generalises past this venue:

- **Additive is safe in one direction only.** One menu listing a dish is
  evidence the dish exists. One menu *omitting* a dish is not evidence it is
  gone — and `available.offBy` is a dated claim that it is. Treating the
  leaflet's missing duck as a removal would have recorded absence of evidence as
  evidence of absence.
- **A same-day disagreement is a conflict, not a history.** Writing both prices
  into a dated series would have rendered as a price rise between two readings
  hours apart — the correction-versus-change error ADR 0023 exists to prevent.
  The rule now says which reading wins, so there is one value and no invented
  event.
- **The laksa carries no item code.** It appears only on the leaflet, whose
  numbering the rule discards; the card's S3 is already the wonton soup. A dish
  with no number is honest, a dish with a borrowed number is not.

## Theme 14 — add-ons & customisation (14a, 14d, 14e)

> ✅ **Shipped 2026-08-16** (ADR 0048). The verbatim records, moved out of
> ROADMAP.md on completion. 14b, 14c and 14f remain open there.

- [x] ✅ **14a — Structured add-ons** — **shipped 2026-08-16** (ADR 0048):
  venue-level `addOnGroups` referenced by id from a section or a dish,
  `select: one|many` with a `max` cap, group-level price default, required
  per-option `tags`. `site/js/addons.js` (resolver + composition, 25 unit
  tests) and `site/js/addons-ui.js` (the picker). Enforced in `validate.py`,
  including unknown-key rejection — `"prive": 2.5` inside a group defaulting
  to `0` would otherwise validate clean and sell the extra free. Two design
  calls deviate from the notes below and are recorded in the ADR: **free is
  written `0`, not implied by an absent price**, and **options are standalone
  records, not references to menu items** (that is Theme 25's question).
  Original note: optional `addOns` on
  a dish (`{ name, price, tags }`) plus a **reusable group** defined once per
  section or venue that dishes reference, so "brunch sides" attaches to eight
  brunch dishes without being written eight times. Design calls: single-select vs
  multi-select per group (the Garden Salad's "chicken, halloumi, prawns **or**
  beef" is a pick-one; brunch sides are pick-many); whether an add-on may itself
  be an existing menu item by id (the brunch sides *are* menu items) or is always
  a standalone record. Record in `ARCHITECTURE.md` + enforce in `validate.py`
  when it lands.

- [x] ✅ **14d — Safety: an add-on carries its own tags** — **shipped
  2026-08-16 with 14a**, as this item insisted. Composition rule: **allergens
  union, dietary claims intersect**. 🔎 The intersection half is the finding —
  a contradiction-only rule (drop `vg` only when an option states a clashing
  allergen) handles satay perfectly and **misses grilled chicken entirely**,
  because meat carries no `contains-*` at all, leaving a vegan dish plus
  chicken still reading vegan. The satay example alone could never have taught
  that. `tools/addon_check.mjs` asserts the whole path in a real browser.
  Original note: **the
  load-bearing point.** Adding halloumi to a dairy-free dish makes it not
  dairy-free; a satay add-on makes a dish contain peanuts. So `dietary.js`'s
  `dishFlagged` / `dishSatisfiesDiet` must evaluate **dish + selected add-ons**,
  not the dish alone, and the order line must show the resulting warning — a
  dish that was safe when you tapped it can stop being safe when you configure
  it. This is not optional polish on 14a; it ships with it.
- [x] ✅ **14e — Order-tally knock-ons** — **shipped 2026-08-16**. Line
  identity widened to `(venueId, name, selectionKey)`; a line's `price` is now
  the *configured* unit price, which is why the totals maths needed no change.
  🔎 **The codec did NOT bump, against this item's expectation.** Measured:
  `CODEC_VERSION` is shared by orders, shortlists *and* personal transfers and
  checked with a strict `!==`, so bumping it would invalidate every outstanding
  link of all three kinds for a change two of them never use. The selection is
  appended as a fourth positional slot, which every existing decoder ignores by
  construction. Original note: a dish added twice with different
  add-ons is **two lines, not a quantity of 2**; the subtotal maths takes add-on
  prices; and the group-order share codec (ADR 0009) has to carry the
  configuration, which means a **versioned codec bump** and a receive-side path
  for links minted before it. Audit these together before building 14a, not after.
