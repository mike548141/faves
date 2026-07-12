# Roadmap (post-launch / vNext)

The current work plan (Phases 0–7 in `WORKPLAN.md`) takes us to a
launched, installable, offline menu browser. This is what comes **after**
— the owner's roadmap brain-dump, grouped into themes, sequenced, and
checked against the hard constraints (zero-build, offline, static, no
backend, no accounts, no personal data in the repo). Nothing here changes
v1 scope.

**Legend.** Effort **S/M/L**. Tags: `[schema]` needs a data-model change
(record in `ARCHITECTURE.md` when built); `[design]` needs a design call;
`[constraint]` sits in tension with a hard constraint or non-goal —
resolution noted inline; **⚑** a decision only the owner can make.

**On "no backend" (owner steer, 2026-07-09).** The stance softened from
*never* to *not yet*: a lightweight backend (e.g. a Cloudflare Worker)
is an acceptable **future** direction — live group-order rooms, feedback
intake — but adopting one is a deliberate step that needs its own ADR
first ([ADR 0009] records the steer). Until that ADR exists, items
blocked on "breaks the no-backend non-goal" stay blocked; they are
deferred, not refused.

---

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

## Theme 2 — Location & maps

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
- **Pick along a route** `[L][constraint]` — owner idea (2026-07-08): pick a
  place *between where I am and a destination I name* (e.g. grab dinner on
  the drive home). The honest constraint read: a true "near the route"
  needs a **routing/directions API** (Google/Mapbox) to get the polyline —
  external, keyed, usually paid → breaks offline / no-dependency, same wall
  as live drive-time (Theme 5). Zero-dep approximations we *can* do with the
  coords we already hold: (a) rank venues by how little they **detour** the
  straight line origal→destination (perpendicular distance to the segment,
  or `dist(origin,v)+dist(v,dest) − dist(origin,dest)` as an added-distance
  cost) — pure haversine maths, offline, no API; crude vs real roads but
  useful; (b) hand the two endpoints to the **maps app** for a real routed
  search (the geo.js handoff pattern). The destination input could reuse the
  geocoder (dev-time) or accept a picked venue. Recommend (a) as an offline
  "least-detour" sort mode + (b) for accuracy — a live routed corridor is
  **✗** on constraints. Pairs with the availability ranking (only rank
  open/reachable candidates along the way).


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
- **A real tile map view** `[L][constraint ✗]` — tile maps need an
  external tile source *and* a map library (CDN), which breaks "no
  external requests / offline-safe / no CDN". Recommend **not** building
  it; if ever, only as an online-only progressive enhancement. The
  distance list is the 80/20.
- **Drive time from me to a venue** `[M]` — owner ask (2026-07-08). A live
  in-app drive time needs a routing API (Google/Mapbox Directions) — an
  external, keyed, usually-paid call → breaks offline / no-external /
  no-dependency. Two honest options: (a) **hand off to the maps app**,
  which already shows real-time drive time — one tweak to the maps link to
  request *directions* rather than a pin (we have coords); (b) a **rough
  in-app estimate** from the haversine distance we already compute (÷ an
  assumed urban speed) — free and offline, but crude (straight-line, no
  traffic), so label it "~". Recommend (a) for accuracy, optionally (b) as
  an at-a-glance hint. A live routed time in-app is **✗** on constraints.
- **Restaurants with multiple locations** `[M][schema]` — owner ask; real
  now (Kaffee Eis, Gong Cha). Two shapes: (a) one record with a
  `locations: [{address, lat, lng, phone, hours}]` array (shared
  name/menu/cuisine) — DRY, and "Near me"/"Open now" pick the *nearest*
  branch; (b) separate records per branch — simpler, but duplicates the
  menu and clutters the list. Recommend **(a)**: extend the schema so
  distance/maps/hours resolve per-branch while the menu stays single.
  Touches the hours engine (per-branch hours) and distance sort (nearest
  branch). Do it before adding many chains.

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

## Theme 4 — Content growth (ongoing, in parallel)

- **More favourite restaurants.** The master list lives *outside* the
  repo — a paper list with the menus/recipe books, an Apple Note, or a
  photo in the library. Those aren't reachable from here; the fast path
  is the existing `intake/` pipeline: drop photos/screenshots/Notes
  exports into `intake/`, and they get transcribed to schema (prices from
  paper/in-store, **never** delivery apps).
- **More dishes & home recipes** — same pipeline; the placeholder recipes
  in `cook-at-home.json` get replaced from the Notes export.
- **Dish photos** `[L][schema]` ✅ **rendering done 2026-07-08** — the
  `image`/`alt` field + lazy-loaded `<img>` with an aspect-ratio box (no
  layout shift) ships on both placements: a venue **card photo** and a
  menu **dish photo**, self-hosted (offline-safe), the SW's capped image
  cache already covering them. *Now purely a sourcing task*: drop owner
  photos into `intake/` → they light up per venue. Generic stock only as a
  captioned, licensed fallback.

## Theme 4b — Meals vs dishes: pairings & "goes with"

Owner idea (2026-07-08): Cook-at-Home (and menus) are flat lists of
individual dishes, but people eat *meals*. Two shapes, not exclusive:

- **(b) Recommended pairings** `[M][schema]` ✅ **done 2026-07-08** (ADR
  0007) — optional `goesWith` per item (dish names, same record or
  `id#dish` cross-record) → "Goes well with …" deep-link chips. Seeded on
  Cook-at-Home mains. Light, additive, our curation (no backend), and it
  **generalises to restaurant dishes** ("add a Sprig + Fern drink to
  this"). Bridge to the order tally (Theme 1) and the "meal" seed for the
  health app (Theme 6).
- **(a) Reorganise around meals** `[L][schema][design]` — a `meal` becomes
  a first-class set (main + sides + dessert); Cook-at-Home sections become
  curated meals rather than dish categories. More expressive but a bigger
  reorg of the data + UI, and it hard-codes one grouping. Better *after*
  (b) exists, if flat-list-plus-pairings proves too loose.

Recommend **(b) now** (small, reversible, reusable), **(a) later** only if
needed. Both **⚑** need the owner to confirm the direction before schema
lands.

## Theme 4c — User contributions (request a place, report an update)

Owner idea (2026-07-08): let people **request a restaurant be added**, and
**report changes** — a new dish, a price that's moved, a photo of the menu
or a dish. This is the public-facing front door to the existing `intake/`
pipeline (drop material in → transcribe to schema).

The honest shape within the constraints (no backend, no accounts, no
external requests in the artifact):

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

## Theme 5 — Richer dish data

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
- **Personal tag overrides (local)** `[M]` — owner idea (2026-07-08): let a
  user **add / edit / remove tags on a venue or dish for themselves** (e.g.
  tag Sprig + Fern as a "coffee" place), stored **locally** — our curated
  tags stay the source of truth in the repo; the user's overlay lives in
  `localStorage` (same personal layer as favourites/order). The home
  filters + search would fold in the user's tags too. Design calls: keep
  user tags visually distinct from ours (they're personal, unverified), and
  a clean merge model (add-to / hide ours?). A natural feeder for Theme 4c
  (a good personal tag could be *suggested* back via the report link). Bigger
  than favourites — an editing UI + a tag store + merge into filter/search.
- **Nutritional info** `[L][constraint-data]` — small suburban venues
  rarely publish reliable nutrition, and inventing it is both dishonest
  and a health-claim risk. Realistic path: compute it only where we own
  the recipe (Cook-at-Home) or the venue supplies it. Don't fake
  restaurant nutrition. Feeds Theme 6.
- **Ratings / feedback** `[M]` **⚑** — public crowd ratings need a
  backend + moderation + accounts, breaking three non-goals. Two honest
  options that don't: (a) **curated household rating** — extend `picks`
  into a 1–3 scale in the data (still ours, still static); (b)
  **local-only personal ratings** in `localStorage` (same store as the
  order tally). Recommend **(a)+(b), not public**.
- **See public ratings / reviews** `[M]` ⚑ **owner decided 2026-07-08:
  show the number when online, link-out when offline.** The honest read: a
  static site can't fetch a live Google rating (the Places API is keyed,
  billed, and its ToS govern display + caching; a public site can't hold the
  key safely). So the shape is a **progressive enhancement**: a small
  **Cloudflare Pages Function** proxies the key, fetches the rating on demand,
  caches it at the edge, and shows it inline with "powered by Google"
  attribution; **offline or on failure it degrades to a "See reviews"
  link-out** to the venue's Maps listing. This is the *first* external service
  in an otherwise zero-third-party app — the shipped `site/` artifact stays
  zero-dep (the fetch is runtime + optional), but the deployed *system* gains
  one billed online dependency. **Write an ADR when built; sequenced after the
  Cloudflare Pages deploy (Phase 7).** Dish-level ratings stay curated (Google
  rates places, not dishes).
- **Popular / busy times** `[M][constraint ✗]` — owner ask. Google's
  "popular times" has **no official public API**; the only ways to get it
  are unsupported scraping or unofficial libraries (against ToS, fragile).
  Recommend **not** ingesting it. If wanted, the "See reviews" link-out to
  the Google listing already surfaces busy times there. A legitimate
  in-app alternative *later*: infer rough busyness from our own order-tally
  usage once that exists (Theme 1) — but that's a weak signal at our scale.
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
  - **Multiple people's favourites** `[M]` **⚑ (account tension)** — owner
    asked (2026-07-08) whether several people could each keep their own
    hearts. On *one shared device*: yes, cheaply — local **profiles** (a
    "who's this?" name picker, each a separate `localStorage` bucket), no
    accounts. Across *different devices* the same person's hearts syncing:
    that needs an account + backend, which breaks the no-accounts /
    no-backend non-goals — out of scope for Faves. The honest split: local
    profiles here; anything cross-device belongs to a *separate signed-in
    app* (the same seam as the health app, Theme 6, which can own identity
    and sync). Constraint-free win now: device-local profiles.

## Theme 6 — North star: the health tie-in

Treat this as a **separate, private, personal app that *consumes* Faves**
— not a feature bolted into Faves. Why the split is the right
architecture:

- Faves is public, account-free, and forbids personal/health data in the
  repo. An eating diary + exercise log is inherently personal, private
  and persistent — the opposite shape. Mixing them would drag exactly the
  data this repo bans into a public artifact.
- Clean seam: Faves *publishes* structured dish data (portions, tags,
  nutrition where known); a downstream personal app *logs* what was eaten
  against it. **The order tally (Theme 1) is the natural bridge** — an
  order history is the seed of an eating diary.
- Keep the boundary absolute: nothing personal enters this repo. The
  health app is its own project (local-first, private store) that reads
  Faves' JSON.

This stays a *direction*, not a phase — but Themes 1 and 5 are the hooks
that make it possible later, so building them "leaning the right way"
costs nothing now.

## Theme 7 — Provenance & supply-chain: the verifiable zero-dependency claim

Faves' defining property is that the shipped artifact has **no
third-party components** (ADR [0001](decisions/0001-zero-build-vanilla.md)):
no npm packages, no CDN, no framework. This theme makes that claim
*checkable* rather than merely stated. Note the honest framing: for a
zero-dependency site an SBOM is **not** vulnerability management (there's
nothing third-party to scan) — its value is attestation + a tripwire
against dependency creep.

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
- **`security.txt` + provenance metadata** `[S]` — a `/.well-known/
  security.txt` (contact + policy) is cheap good-citizenship for a public
  site. Build provenance/attestation (SLSA-style) is **N/A today** —
  Cloudflare Pages serves static files with no build to attest; revisit
  only if a real pipeline ever appears.

Effort **S** overall, no runtime/offline impact. **Accept when**: an SBOM
is published for the deployed site and CI fails on an unexpected
dependency.

## Theme 8 — Making the repo public (parked; owner-gated)

Assessed 2026-07-12: publishable, but sequenced. Flipping visibility is a
floor action (one-way door — forks/copies survive any later unpublish) and
stays the owner's explicit call. Order matters:

1. **GitHub PAT refresh first** (already queued estate-side). The session
   log (`docs/SESSIONS.md`, 2026-07-12 deploy entry) records the current
   PAT as classic + broad and lists unhardened credential roots
   (AWS/Google/TrueNAS); git history preserves that line forever, so the
   fix is making it *historical* — refresh the credential, don't redact
   the log.
2. **Branch protection before visibility** — a push to `main` is a deploy;
   public means drive-by PRs/issues. Require review, restrict push.
3. **Owner confirms the docs' family texture.** The 2026-07-06 approval
   covered recipe attributions in site data; the docs also use family
   first names in feature examples and acceptance notes (ROADMAP Themes
   1/1b, SESSIONS). Same first-names-only level, but publishing extends
   the approval from the site to the workshop notes — confirm or trim.

Verified clean 2026-07-12 (tree + full history): no secrets (the one
token line reads from Keychain; "share tokens" are client-side codec),
Apache 2.0 licence present, only `mike@cxi.nz` in commit metadata,
home-area inference no worse than the live site already allows.

## Also parked (small)

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

---

## Recommended sequence

By value-per-effort and dependency order:

1. **Coordinates + native-maps handoff** (S) — tiny, daily payoff,
   unblocks maps.
2. **Order tally** (M) — the flagship; turns *decided* into *ordered &
   reconciled*.
3. **Design pass** — sticky search, right-hand info panel, cart polish (M).
4. **Distance-sorted "what's close"** (M) — needs coords from step 1.
5. **Content growth + dish photos** — ongoing, in parallel throughout.
6. **Extended allergens** (S) → **curated/local ratings** (M) →
   **nutrition where owned** (L).
7. **Health app** — a separate project once the above have matured.

**Parallel, any time (Theme 7):** the zero-dependency CI guard is a cheap
pre-launch win; SBOM publishing can land alongside the Phase 7 deploy so
the live site ships with a provenance artifact from day one.

**Owner calls — resolved 2026-07-08:**
1. Order tally: **in** (shipped); STRATEGY non-goal clarification landed.
2. Ratings: **show the live number when online (edge-function proxy),
   link-out when offline; dish ratings curated** — see Theme 5.
3. Feedback intake: **no email; parked** — deploy first (Theme 4c).
4. SBOM: **CycloneDX JSON at `/.well-known/sbom.json`** — see Theme 7.
