# Done before the split

The board's finished work from before it moved to one file per item,
cut from `docs/ROADMAP-DONE.md`
(last changed in `d57e359f`) into one `[x]` item file per entry by
`tools/archivecut.py`. Below the marker line this page is that file
verbatim: its preamble, its headings and every line that was not an
entry, in order, with each entry replaced by a link to the item file
that holds it, and links re-pointed for the new depth.
`python3 tools/archivecut.py --verify` rebuilds the original from these
files and compares it with the last committed copy.

<!-- archivecut:verbatim-below -->
# Roadmap — resolved detail (archive)

🛑 **FROZEN 2026-08-17 — nothing is added to this file again.** It is the
verbatim record of everything harvested while the roadmap was one file. The
board is now one file per item under [`roadmap/`](../README.md), and a done
item simply stays in its own file as `[x]`, carrying its own `git log` as
provenance — so the harvest step, and the half-landed window it opened between
finishing work and recording it, are both retired. Read this for the *why*
behind anything resolved before the split; write nothing into it.

Verbatim design records for the roadmap items that are **resolved** — shipped,
decided-against, or owner-parked — moved out of [`ROADMAP.md`](../../ROADMAP.md) on
2026-07-18 to keep the always-loaded roadmap to what's *open*. Each block is the
original write-up (the *why*, the deferrals, the rejected alternatives) — grep it
when a one-line pointer in the roadmap isn't enough; do not load it whole.
Sections follow the roadmap's own theme order. The current-truth/history split,
same as `SESSIONS`→`SESSIONS-ARCHIVE`.

## Theme 14c — Customise / omit: a note on the order line (shipped 2026-08-16)

The owner's ask was *"the ability to customise a dish e.g. no tomato in a big
breakfast"*. Two shapes were weighed: a **free-text note per order line**, or
**curated removable components** per dish. The note shipped; components did not,
and the reason is not squeamishness — restaurant dishes carry no ingredient
lists at all (only Cook-at-Home recipes do), so there is literally nothing
structured to remove *from* until the whole transcription problem is solved
across 55 venues. Components remain the right answer if a venue's data ever
justifies it.

**The note is part of LINE IDENTITY** — the fourth component of `lineKey` —
which is [ADR 0048] §4 applied consistently rather than a new rule: two notes
are two different things to make, exactly as two add-on selections are. Outside
the identity, adding a dish twice and then annotating it would produce one line
of quantity 2 carrying a note meant for one of them: wrong at the counter, and
wrong in a way nobody reading the tally would notice. `setNote` therefore takes
the note **twice** (the old one locates the line) and merges on collision.

**It travels in a shared order as slot 5, with no `CODEC_VERSION` bump.**
🚩 The codec's existing justification for appending is a *safety* argument —
*"dropping an add-on can never put something extra on a plate"* — and it does
**not** transfer. A note is characteristically a **removal**, so dropping one
leaves the unwanted thing **on** the plate. Carried anyway, because not carrying
it fails for everyone every time (a group order sends your friend to order the
exact dish you asked to have changed) while carrying it fails only against a
decoder older than the slot. Recorded in [ADR 0073].

**Verified:** 938 unit tests (23 net new), with 8 reintroduced bugs each seen to
fail first; `tools/note_check.mjs` 19/19 in real headless Chrome at 390 px —
the seventh of the browser-check family, and it exists because it caught the ±
stepper **operating the wrong line** when two lines differed only by a note,
which no unit test can see. Its own XSS assertion was verified by breaking the
render, and its payload was changed from `alert(1)` to a global-setter so that
regression fails as a named assertion rather than a 30-second timeout.


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
  [`docs/reviews/2026-07-22-1148-reo-wording-review.md`](../../reviews/2026-07-22-1148-reo-wording-review.md)):
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

Resolved items only; the open ones stay in [`ROADMAP.md`](../../ROADMAP.md).

- ✅ [0010-f-verified-must-carry-its-derivation](0010-f-verified-must-carry-its-derivation.md)

## Tooling — the gates themselves

- ✅ [0020-a-negative-dish-price-validated-clean](0020-a-negative-dish-price-validated-clean.md)

### One noun for one thing — the wording sweep (Theme 15b, 2026-08-09)

Shipped on `faves-one-noun`, [ADR 0035](../../decisions/0035-one-noun-place-and-branch.md).
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

- ✅ [0030-14a-structured-add-ons](0030-14a-structured-add-ons.md)

- ✅ [0040-14d-safety-an-add-on-carries-its-own-tags](0040-14d-safety-an-add-on-carries-its-own-tags.md)
- ✅ [0050-14e-order-tally-knock-ons](0050-14e-order-tally-knock-ons.md)

## Theme 29 — things pinned over the menu

- ✅ [0060-the-call-to-order-button-looked-cut-off](0060-the-call-to-order-button-looked-cut-off.md)

## Ticked 2026-08-16 by staleness audit (Themes 19–20 residue)

Found by auditing every open roadmap item against the tree rather than against
its own prose. Kept verbatim, including each item's original text, because the
value is in seeing what was asked for beside what landed.

- ✅ [0070-venue-timezone-delivered-adr-0043-ticked-2026](0070-venue-timezone-delivered-adr-0043-ticked-2026.md)
- ✅ [0080-currency-is-nzd-by-construction-delivered-tick](0080-currency-is-nzd-by-construction-delivered-tick.md)
- ✅ [0090-seasons-assume-the-southern-hemisphere-deliver](0090-seasons-assume-the-southern-hemisphere-deliver.md)

---

---

## Also parked (small)

---

## Theme 5 — the allergen sweep's two holes (closed 2026-08-16)

Harvested from `ROADMAP.md` by the following session, which found the box still
`[ ]` after the work had shipped in `eb9b38f`. The gap between *done* and
*ticked* is itself the note worth keeping: an open item that is silently already
closed sends the next session to redo it.

- ✅ [0100-tools-tag-allergens-py-has-two-holes-fixed-eb9](0100-tools-tag-allergens-py-has-two-holes-fixed-eb9.md)

---

## Theme 25 — the dish-id residue (closed 2026-08-16)

Harvested from `ROADMAP.md`. Three of the four items shipped; the fourth was
answered by measurement and deliberately not built. Original text kept, because
the value is in seeing what was asked for beside what landed.

- ✅ [0110-a-shared-shortlist-now-lands-on-the-dish-you-m](0110-a-shared-shortlist-now-lands-on-the-dish-you-m.md)
- ✅ [0120-temporal-js-no-longer-deletes-a-pick-written-a](0120-temporal-js-no-longer-deletes-a-pick-written-a.md)
- ✅ [0130-the-retired-sprig-and-fern-test-fixture-rename](0130-the-retired-sprig-and-fern-test-fixture-rename.md)
- ✅ [0140-cross-record-goeswith-refs-answered-2026-08-16](0140-cross-record-goeswith-refs-answered-2026-08-16.md)

## Theme 27 — 27b, say which field matched (shipped 2026-08-16)

- ✅ [0150-shipped](0150-shipped.md)

### Theme 28 — 28d, 28f, 28g (resolved 2026-08-16)

- ✅ [0160-28d-available-note-is-write-only](0160-28d-available-note-is-write-only.md)

- ✅ [0170-28f-the-qualifier-comes-out-of-the-heading](0170-28f-the-qualifier-comes-out-of-the-heading.md)

- ✅ [0180-28g-a-section-s-anchor-was-derived-from-its-he](0180-28g-a-section-s-anchor-was-derived-from-its-he.md)

---

## Theme 29 + Theme 15x — the floating controls (shipped 2026-08-16)

- ✅ [0190-the-back-to-top-button-covered-dish-content](0190-the-back-to-top-button-covered-dish-content.md)
- ✅ [0200-the-fixed-sticky-audit](0200-the-fixed-sticky-audit.md)
- ✅ [0210-15x-the-desktop-filter-row](0210-15x-the-desktop-filter-row.md)

**What a headless run at 390 px could not show, stated so nobody reads the green
as a phone test:** iOS Safari rubber-banding produces momentary negative `dy` at
the ends of a fling, and the 6 px jitter threshold guarding against it is a guess
until someone holds an iPhone; every scroll in the rig is an instant jump, so
momentum is untested; `env(safe-area-inset-*)` resolves to 0 in headless Chrome,
so every bottom offset measured is inset-free; nothing here says anything about
WebKit's `<dialog>` inertness or focus restoration, which the filter row leans on
hardest; and 🔎 **the 24 px text emulation is only half the real thing** — setting
the CSS root font size grows every `rem` box but does **not** move `rem`-based
*media queries*, which resolve against the browser's default. A real reader on
*Very large* gets both, so the 60 rem breakpoint measured at 960 px here would be
1440 px on a real device.

## Theme 15y — the ⓘ disclosure goes click-only (shipped 2026-08-16)

- ✅ [0220-15y-the-i-disclosure-failed-wcag-2-2-sc-1-4-13](0220-15y-the-i-disclosure-failed-wcag-2-2-sc-1-4-13.md)

## Theme 2 — the ratings control, settled (2026-08-16)

- ✅ [0230-ratings-ux-attempt-3-cancelled](0230-ratings-ux-attempt-3-cancelled.md)

## Per-branch details provenance — Theme 19 (2026-08-16)

- ✅ [0240-derivation-is-venue-level-but-provenance-is-no](0240-derivation-is-venue-level-but-provenance-is-no.md)
✅ **Reo: the confidence-note strings — drafted and queued 2026-08-16**

## 31d — a warning before a link leaves the site — Theme 31 (2026-08-16)

- ✅ [0250-31d-accessibility-wording](0250-31d-accessibility-wording.md)

### Theme 37 — cook mode and the recipe page (owner-raised 2026-08-16)

- ✅ **37a — the Clear ticks button goes** `[XS][js]` — **done 2026-08-16**.
  Owner: *"Get rid of the
      clear ticks button, its unnecessary"*. It renders twice — the recipe page
      (`recipe.js`, in a `tick-clear-row`) and cook mode's tool row
      (`cook-ui.js`) — from one factory in `checklist-ui.js`. Removed from both,
      with the store's now-unreferenced `clear()`.
      🚩 **The consequence, recorded rather than argued:** ticks expire on a
      12-hour clock (`checklist.js` `STALE_MS`) measured from the *last tick*,
      so a recipe cooked twice inside that window starts part-ticked with no
      one-tap reset — you untick line by line. The store's own comment
      ("a recipe cooked twice must not start half-ticked") named the button as
      the answer to exactly this. His call, made knowingly; if it bites, the
      cheaper fix is a shorter clock, not the button back.

- ✅ **37b — the timer's whole presentation is wrong** `[S][css][js][ux]` — **done 2026-08-16**.
      Owner: *"The whole timer UX is poorly designed… you keep producing poor
      UX by default."* Three named defects, and **all three have one cause** —
      the countdown numeral and its state word live inside the *same* button:
      - *not centred horizontally* — `.cook-timer-btn` centres the flex **pair**
        `[34:48][Pause]`, which puts the numeral left of centre by half the
        label's width. It can never look centred while the label shares its box.
      - *not centred vertically* — `align-items: baseline` sits a
        `var(--step-sub)` word on a `1.5rem` numeral's baseline.
      - *"Pause"/"Resume" text should not be required either way* — an explicit
        steer to an icon, and it also kills the *"does this say what it is, or
        what it will do"* ambiguity a swapping label always carries.
      - *the Reset button is ugly* — a transparent bordered box with different
        fill and weight from the control beside it, hugging the right edge.
      **Direction taken:** one row, three zones —
      `[⏸/▶ 56px] [ numeral, flex:1, truly centred ] [↺ 56px]`. Equal-width
      flankers are what actually centre the numeral. Icons carry pause/reset, so
      no text to misalign and Reset stops out-shouting its neighbour; the words
      survive in `aria-label`. A hairline progress bar on the card's bottom edge
      makes it glanceable from across the kitchen at no extra height.
      🔑 **It also retires a fragile hack.** Reset is `hidden` today until there
      is something to reset, and `paintTimer()` carries a focus-rescue for
      exactly that (`if (nowHidden && document.activeElement === timerReset)`).
      Always-present controls delete the rescue and the bug class with it — the
      same rule ADR 0039 drew, and the same one `clearTicksButton`'s own comment
      cited. Resetting an unstarted timer is a harmless no-op.

- ✅ **37f — "Along a route" is removed whole** `[M][js]` — **done
      2026-08-16**. Owner: *"I would not say that Khandallah Trading Company is
      on the route from my current location in Churton Park to Courtenay
      Place… remove it altogether and leave it until we build the proper along
      a route i.e. to a specific address."* [ADR 0014] is **superseded** by
      [ADR 0068]. 🔑 **The lesson is not "the estimate was imprecise".** ADR
      0014's own *Rejected* section already named the weakness — a suburb
      centroid is not a road — and judged it an acceptable offline
      approximation. What it could not foresee is that this approximation does
      not degrade gracefully: it returns **confident wrong answers**, and a
      confident wrong answer is worse than none. `areaCentroids` went with it
      (its only two callers were the destination picker; a roadmap line claiming
      `picker.js` used centroids did not hold against the tree). `geo.js` keeps
      `routeMapsUrlFor` with **zero callers** on purpose: its docblock records
      which maps providers honour a waypoint parameter and which silently drop
      it, and the real feature will need exactly that.

- ✅ **37g — the SORT BY section goes, and distance joins the one ranking**
      `[M][js][ux]` — **done 2026-08-17**, built to [ADR 0068] with its item 4
      superseded by [ADR 0069]. Owner: *"remove nearest first removes the need
      for the sort section of the filters altogether."* The `<select>`, its
      group, its heading, its note and four `body.filters-inline` CSS rules are
      gone; `rankVenues`' two branches are one comparator — pinned → orderable →
      reachable → **availability → distance band → favourite → exact distance**
      → curated.
      🔑 **The headline stays the finding, not the feature: his algorithm was
      built and had never once run.** `origin` was written in exactly one place,
      the sort control's own handler, so from 2026-07-08 until this change the
      distance term was `Infinity` for every venue on every render.
      🔎 **The no-origin path was proved unchanged rather than argued.** The old
      `ranking.js` was extracted from `HEAD` and run head-to-head against the new
      one over **4000 randomised lists** (mixed stubs, recipes, coordless and
      coordful venues, favourites, every `favBoostKm` and `farKm` value), no
      origin: **0 mismatches**. That path is what a refused permission gets, so
      "unchanged" had to be a measurement, not a reading of the diff.
      🔎 **And the guards were verified by breaking them** — four mutations, each
      caught by the tests that were supposed to catch it: distance leading
      availability (3 fail), the favourite tiebreak removed (3), raw distance in
      place of the bucket (1), the 10 km credit reinstated (3).
      🚩 **A property of bucketing worth knowing before it surprises someone.**
      `Math.round(dist / 0.4)` partitions space at **fixed edges** (0.2 km,
      0.6 km, 1.0 km…); it does not measure the gap *between* two venues. So two
      venues 20 m apart can straddle an edge — 0.19 km and 0.21 km land in
      different bands — and the heart on the farther one loses a tie a reader
      would call a tie. This was found by the agent building it, against a worked
      example in the brief that was arithmetically wrong. The error is
      **conservative in the safe direction**: bucketing can only ever
      *under*-apply the heart, never lift a favourite above something
      meaningfully nearer, which is the defect ADR 0068 existed to prevent. A
      tolerance ("within 400 m *of each other*") cannot replace it — proximity is
      not transitive, so it is not a sort key at all. `tests/ranking.test.js`
      pins the boundary case as a known property rather than leaving it to be
      rediscovered.
      🔑 **What the pure-logic lane could not do, and a session should not assume
      it did:** 915 unit tests say nothing about whether the button appears, is
      tappable at 390 px, or overlays anything. That needed a real browser, and
      the fixed-control precedent (Theme 29) is that a single sample proves
      nothing about a fixed element's victim.

- ✅ **37j — "Everywhere" is a place word on a service filter** `[XS][ux]` —
      **done 2026-08-17**, inside 37g's change because both edit `#filters` and
      `reo.js`. Owner: *"Everywhere does not make sense for a drop down to select
      dine-in vs takeaway."* Now **"Any service"**, the parallel form of its two
      neighbours ("All areas", "All cuisines"). The te reo went
      `Ngā wāhi katoa` → **`Ngā ratonga katoa`** — the same `Ngā … katoa` frame
      `filter.allAreas`/`filter.allCuisines` already use, over the noun this file
      already carries for this exact sense (`filter.service`: `Ratonga`).
      🔑 **Why this was in scope with the reo queue parked** (owner ruled
      2026-08-16, *"do not open new [reo] items without asking"*): it **closes** a
      queued item rather than opening one, and it applies the file's own
      established pattern rather than minting a translation. The old draft was
      not merely loose — it collided outright with `fav.allPlaces` /
      `nav.allRestaurants`, which mean "leave this panel", a different job.

- ✅ **37h — remove "Transfer to another device"** `[S][js]` — **done
      2026-08-16**; [ADR 0030]'s transfer half retired with it. Owner: *"Remove
      the 'Transfer to another device' feature all together as we already have
      a data backup and restore and a sync feature."*
      🚩 **Worth recording, not arguing:** transfer is the only one of the three
      that needs **neither a file nor the backend** — backup/restore needs a
      file, sync needs the Worker. He has weighed that. If it turns out sync
      reuses transfer's codec or its receive path, that is a finding to bring
      back, not a reason to keep the button.
- ✅ **37i — Sync lives inside "Your data"** `[S][js][ux]` — **done
      2026-08-16**. Owner: *"In
      settings the 'Sync across your devices' settings should be in the 'Your
      data' section."* Today they are two sibling rows in `settings-ui.js`'s
      `TOPICS`. 🚩 **The trap:** sync's row updates on the engine's own
      timetable, via a subscription that currently writes to *that row*. Fold
      the panel in and the subscription must drive the combined row's summary or
      be torn down — never left writing to a detached element.

## Scanner inflation from live worktrees — closed 2026-08-16 on measurement, not on the upstream fix

> ✅ **Closed 2026-08-16 by the faves-cook session, and closed for a *different
> reason than the one the item was waiting for*.** The item said to re-run the
> sweep and delete it "when E9 lands upstream". E9 has **not** landed
> (`atelier@1408d98`, zero drift at close). The local symptom went anyway,
> because **worktrees moved out of the tree**.

**What the item claimed.** Sessions take worktrees at `.claude/worktrees/<name>/` <!-- pathscan:allow: gitignored and untracked by design — present in a primary checkout, absent in a worktree, which is the point being made -->
— gitignored, but a full second checkout — and the scanners walk it. So a bare
`plainscan .` counted 2000 where the tree had 623, `pathscan .` counted 4 where
2 were real, and `leakscan .` reported **101 findings, commit blocked**, whenever
a sibling session had a worktree live. Standing advice: never a bare `.`; scope
the sweep by passing paths.

**What was measured, in the exact condition the claim requires.** Five sessions
were live at once (faves-recipe, faves-ranking, faves-allergens, faves-cook,
faves-menus), from a clean primary checkout:

| Bare run | Item predicts | Measured 2026-08-16 |
|---|---|---|
| `leakscan .` | 101 findings, commit blocked | ✅ **clean** — 45 allow-marker, 60 files by `.leakscanignore` |
| `plainscan .` | roughly 3× the true count | 652, heaviest `docs/ROADMAP.md ×402` — the real files, no doubling |
| `pathscan .` | 4 where 2 are real | clean (separately, on the hook plane) |

**Why it changed.** `git worktree list` puts all five at `~/worktrees/<name>`,
which atelier's own `CONCURRENCY.md:16` prescribes — *"worktrees live outside
iCloud (`~/worktrees/…`)"*. That path is **outside the repo**, so `.` no longer
contains a second checkout. `.claude/worktrees/` still exists here and is empty. <!-- pathscan:allow: gitignored and untracked by design — see the note below on pathscan's per-checkout verdict -->

🔎 **A bonus finding, met while writing this up.** `pathscan` reports these very
references as **missing paths in a worktree and as clean in the primary
checkout** — same commit, same file, two verdicts, because the directory is
untracked and only one checkout happens to have it on disk. That is this repo's
decorative-guard tell almost word for word: *a check that gives a different
verdict per checkout is a check nobody reads*. Both references now carry
allow-markers, so the verdict no longer depends on which directory you run it
from. 🚩 The general form is worth more than the fix: **a guard that consults
untracked state is not checking the commit, it is checking the machine.**

🔑 **Worth keeping, and it is the general lesson, not this item's detail.** The
finding was true when written and false when read, and **nothing about it
changed** — no code, no glob, no scanner. What moved was a *convention in a
neighbouring repo* that the finding never named as a premise. A recorded
measurement carries its conditions implicitly; when a condition is a convention
rather than a fact about the tree, it can move without anyone touching the
record. Same family as *"a permission granted by an old ADR is not evidence
about today's code"* (Theme 36) and *"a hand-check whose evidence is 'the source
did not move' degrades to nothing the moment the source moves"* (Theme 21) —
three sightings now of one shape: **a record's premise expiring silently.**

🚩 **It comes back if anyone takes a worktree inside the tree.** The mechanism is
untouched; only the location saved us. And **upstream E9 stays valid** — it is
about scanners walking nested checkouts, which is still true wherever they are
nested. Nothing was delivered upstream and nothing should be withdrawn there.

## `sync_check.mjs` — dead through a whole refactor, and the hazard it invented (closed 2026-08-16)

- ✅ [0260-sync-check-mjs-aborts-before-its-first-asserti](0260-sync-check-mjs-aborts-before-its-first-asserti.md)

## Theme 37 — the recipe-page pass: 37c, 37d, 37e, 37l, 37m (2026-08-16)

**Disposition 2026-08-16: all five DELIVERED**, in merge `cd6d30b` on `main` —
924 JS tests, 93 validate mutations, `recipe_check.mjs` 22/22, `cook_check`
60/60, `boot_check` 16/16. The five items below are reproduced verbatim as they
stood when claimed, with their checkboxes flipped to `[x]`; nothing in them is
open.

Five owner-raised presentation defects, taken together because all five move the
same rows. [ADR 0070] holds the schema and the tick-key rule;
`tools/recipe_check.mjs` (22 assertions) is the guard. Verbatim items as they
stood when claimed:

- ✅ [0270-37c-the-ingredients-section-should-collapse](0270-37c-the-ingredients-section-should-collapse.md)


- ✅ [0280-37d-two-columns-for-ingredients-when-there-is](0280-37d-two-columns-for-ingredients-when-there-is.md)


- ✅ [0290-37e-a-recipe-should-carry-its-attribution-as-a](0290-37e-a-recipe-should-carry-its-attribution-as-a.md)


- ✅ [0300-37l-a-recipe-with-components-needs-grouped-ing](0300-37l-a-recipe-with-components-needs-grouped-ing.md)


- ✅ [0310-37m-the-tick-boxes-do-not-line-up-in-two-diffe](0310-37m-the-tick-boxes-do-not-line-up-in-two-diffe.md)


### What the build added to them

🔑 **37l's tick trap dissolved, and the reason is worth more than the fix.** The
item recorded that splitting `"Sauce: 150g brown sugar"` into a field changes the
hashed text and detaches every tick, and offered two answers: hash the component
with the line, or accept the loss knowingly. The right answer turned out not to
be a compatibility choice at all. **Sticky Date Pudding lists `"60g butter"` in
the pudding and `"Sauce: 60g butter"` in the sauce.** Drop the component from the
key and those two lines collide on one hash — tick the butter for the sauce and
the pudding's butter ticks itself. So the component is part of the line's
identity on the merits, and keying on `"<component>: <text>"` then happens to
reproduce the old string byte-for-byte: 0 mismatches across all 24 recipes,
checked programmatically. **Ask what the identity IS and the migration question
often stops existing.**

🔎 **Every consumer had to move, and one of them was a validator.** Five places
read `item.ingredients`: the recipe page, the collection list's expanded body,
cook mode's per-step panel, and two search haystacks. A sixth was `tools/
tag_allergens.py`, which `validate.py` imports — so the grouped shape broke the
*validator* on the first run after the data landed, not the tagger.

🔎 **`cook.js` had already conceded the point.** Its `ingredientTerms` strips a
leading `"Label: "` with the comment *"a group label, not a thing"* — the code
was treating the prefix as structure while the schema insisted it was text. Feed
it the keys and its behaviour and tests are unchanged.

🔎 **37d was a *consider*, and the measure test said yes — with three guards.**
`column-width` rather than a bare `column-count`, so a second column appears only
where one genuinely fits; `:has(li:nth-child(6))`, because under six lines a
split reads as a broken list rather than a layout; and `break-inside: avoid`,
because a tick box and its line are one control. Proven at 390 px and 1100 px and
at 16/24/32 px text.

🔎 **37m's second bug was introduced by the fix for its first**, exactly as the
item predicted: `padding-left: 0` on ticked ingredients was added deliberately,
with a good comment, and it is what pulled the ingredient ticks 1.6em out of line
with the method's. A local improvement that breaks a global alignment is
invisible to the person making it, because they are looking at one list. The
ticked ingredients now take the method's own `1.6em` gutter and leave it empty —
an empty gutter reads as alignment, which is the thing that was asked for.

🚩 **37c's cost, accepted by the owner in advance:** the fold is remembered for
ALL recipes, so opening an unfamiliar one hides the ingredients you have not
bought yet. If that bites, the fix is per-recipe state, not abandoning the
memory. The preference rides `faves.settings.v1` rather than a new key, because
`personal-data.js` sweeps every other `faves.` key into the backup export and
never restores it — exported-but-unrestorable is a live defect elsewhere in the
roadmap and one instance of it is enough.

## Theme 4 — the menu fetch: all 18 authorised venues resolved (closed 2026-08-17)

**Closed on measurement, not on effort.** The owner authorised fetching the 18
venues that publish their own menu (the ruling is preserved in the block below).
All 18 are now resolved: **14 transcribed**, **4 proven to publish no menu at
all**. The corpus went from 23 venues with menus to **37 venues / 3,059 dishes**.

The item outlived three of its own titles — "six venues", then "the remaining
14", then the owner's brief naming 14 again — because each was written from
prose rather than from the reproducer. 🔑 **The count that was right every time
is the one nobody typed:** the zero-dish reproducer in the block below. The
three-way split it hides (*publishes nothing · publishes a site but no menu ·
publishes a menu*) is why a website count kept answering a different question
from a menu count, exactly as the chain/branch count did one item above.

**The 14 transcribed:** Sprig + Fern Petone · Berhampore · Thorndon · Little
Sprig Seatoun · The Catch Sushi Bar · Satay Kingdom · Charley Noble · Regal
Chinese · Rock Yard Vietnamese · Pizza Pomodoro · Gong Cha · Pizza Hut · Subway
· The Victoria Tavern.

**The 4 proven menuless** — `babaili-malatang`, `caffiend`, `kaffee-eis`,
`new-chapter-cafe`. Each was checked exhaustively (sitemap, soft-404 detection
by MD5, platform JSON endpoints, guessed paths, own social accounts) before
being called. They join the 14 that publish nothing, so **all 18 remaining stubs
are now blocked on a photo or an in-store visit** — research cannot clear one of
them, and a future session should not re-attempt them as if it could.

The original write-up follows verbatim: the owner's fetch authorisation, the
per-batch findings, the pilot's transcription recipe, and the traps it named.

- ✅ [0320-menus-still-owed-on-six-venues-and-where-each](0320-menus-still-owed-on-six-venues-and-where-each.md)

## Theme 36g — ticks must leave the backup export (shipped 2026-08-16)

🚩 **Ticks must leave the backup export** `[S][js]` — *"if it isn't
  restored, it shouldn't be exported."* ✅ **RULED AND BUILT** (claim released
  2026-08-17: `wt: faves-cook` no longer exists).
  ⚠️ **This header used to read "CLAIMED … Ruled, not yet built" while its own
  body below said "✅ BUILT 2026-08-16" — the item contradicted itself**, so a
  reader arriving at the top walked away from finished work. Corrected here
  rather than only clearing the claim, or the contradiction outlives the claim
  that explained it.
  Verified 2026-08-17 against the two things the item itself specified were
  needed: the exclusion is matched **by suffix** (`personal-data.js`,
  `key.endsWith("." + base…)`) rather than by base key — the item's own analysis
  showed a base-key match would have excluded *nothing at all while reading as
  complete* — and the unit test it demanded exists and passes: *"a cook-mode
  tick never reaches the export — for any profile"*, seeding ticks under two
  different profile ids and asserting neither reaches the JSON. Recorded as
  ADR 0074. The mechanism below is kept because the first analysis was wrong
  twice:

  🔎 **A tick reaches the backup through the CATCH-ALL, not the key list.**
  `faves.checklist.v1` is deliberately **not** in `SCOPED_BASE_KEYS`, so the
  named-field path in `collectPersonalData()` never sees it — which is why one
  report said it was absent. But `personal-data.js` then sweeps *every*
  remaining `faves.` key into `data.other` verbatim, precisely so that
  *"everything you put in"* stays true without that file being updated in
  lockstep with each new store. The sweep picks the ticks up. **Both halves of
  the contradictory report were true; they described different code paths.**

  So the fix is not "remove it from a list" — it is to add the checklist to the
  module's **`EXCLUDED`** set, the same mechanism that already keeps location
  out and, importantly, *declares* the exclusion to the user rather than
  silently dropping it. Note the comment guarding that set: *"an exclusion that
  only holds while nobody moves a key is not an exclusion"* — `EXCLUDED` is
  seeded into `known` before the sweep for exactly this reason, so the fix must
  go there and not into an ad-hoc skip.

  ⏳ **Deliberately not built at session close**: `personal-data.js` was being
  actively changed by the sync session the same day, and the export path is the
  wrong place to make a hurried, unguarded edit. Needs a unit test asserting a
  tick never appears in `collectPersonalData()`'s output, proved by breaking it.

  ✅ **BUILT 2026-08-16 (wt: faves-cook) — and the analysis above was wrong a
  THIRD time, in both directions. Recorded as ADR 0074 (lands with the cook-36 merge).**
  - 🔎 **"Never restored by import" is false.** `parsePersonalData` keeps the
    scoped key in `other` — watched directly, `['faves.p.default.checklist.v1',
    …]` — and `applyPersonalData` writes every `other` entry back. Ticks *were*
    restored: under the **exporting** device's profile id, which the import may
    have re-minted, with a twelve-hour expiry that voids them by the next day.
    The mechanism is *restored uselessly, or onto the wrong person*, not
    *silently dropped*. The owner's ruling lands either way.
  - 🔎 **They were also leaving the phone.** `sync.js` calls the same collector
    and `sync-merge.js` never reads `other`, so ticks were encrypted and shipped
    between devices in order to be discarded at the far end.
  - 🛑 **And the fix this item specified would have done nothing.** "Add the
    checklist to `EXCLUDED`" is right in spirit and inert in fact: `EXCLUDED` is
    matched with `key in EXCLUDED`, while `profileScopedStorage()` makes the real
    key `faves.p.<id>.checklist.v1`. The base key matches no stored key, so the
    exclusion would have excluded **nothing at all while reading as complete**.
    Matching is now a suffix test, which also catches keys orphaned from the
    registry — the case a registry-driven loop misses, and the one most likely
    to hold a stranger's ticks.
  - Also new: `spare` separates *excluded from a backup* from *exempt from a
    replace wipe*. The origin is both; a tick is only the first, because making a
    device match a file cannot mean keeping the last occupant's half-cooked
    recipe.
  - 🔑 **What actually caught all three: writing the test before the fix and
    watching it fail.** Four new tests failed against the old code; three failed
    again under a deliberate revert to the flat lookup, which is what proves the
    matcher rather than the table entry is load-bearing. **A fix nobody has seen
    fail first is a fix nobody has evidence for** — and note this item had
    already announced itself as *"wrong twice"* and was still wrong.

## Theme 20 — the browser summary names its tree (closed 2026-08-17)

✅ **SHIPPED `ecbc82e`.** Every one of the ten browser checks now prints a
second, indented line under its verdict:

```
OK — 24 passed, 0 failed
   tree /Users/mike/worktrees/faves-hygiene/site · shell 2026-08-16.98 · hygiene-20@1460bec
```

The `OK — N passed, N failed` first line is **byte-identical** to what it was,
which is load-bearing: `CLAUDE.md` instructs readers to check for the literal
string `OK — 16 passed, 0 failed` from `sync_check`, and a grep-based reader
would otherwise have broken.

🔑 **The item's own premise was false, and making it true was the fix.** It said
*"`tools/lib/browser.mjs` owns the summary, so it is one place."* It did not —
all ten checks hand-rolled the same `console.log` tail. Rather than patch ten
tails, `Report.summary(siteDir)` was added to `browser.mjs` and every tool now
calls it, so the next thing the verdict needs to carry is a one-place change.
This is the same argument that put the reaping in `browser.mjs`: a second copy
of a shared mechanism is a second place for a quirk to be fixed once and missed
once, which is why that library exists at all.

🔎 **Proven against a second tree, not asserted.** The same check code was
pointed at a different served tree and produced **identical verdicts** with
**three independent discriminators differing** — path, `SHELL_VERSION` (`.95`
vs `.97`) and `branch@sha`:

```
OK — 24 passed, 0 failed
   tree /Users/mike/worktrees/faves-hygiene/site · shell 2026-08-16.95 · hygiene-20@0d5c426
OK — 24 passed, 0 failed
   tree /.../wrongtree/site · shell 2026-08-16.97 · main@344adfb
```

**Why three discriminators rather than one.** Two worktrees of the same repo
have near-identical paths and are easy to misread at a glance; the version and
the sha disagree the moment either tree has moved. The original bug surfaced
only because someone noticed a passing run reporting **22** where an agent had
just said **25** — a coincidence of attention. Now it is one glance, in the
artefact everyone already reads.

**Bearing:** a session's shell cwd drifted out of its worktree via one compound
command containing a `cd`. Its *edits* used absolute paths and were safe; its
**verification** ran against a tree without the change. Everything green,
everything meaningless. Nobody interrogates a green run, which is exactly why
this wanted a mechanism and not a discipline.

## Theme 20 — the browser harness reaps its own Chrome (closed 2026-08-17)

✅ **SHIPPED `ecbc82e`.** Three mechanisms, all in `tools/lib/browser.mjs` so
they cover all **ten** checks rather than being patched once and missed once.

**Measured before and after, two reps per signal**, counting only that run's own
Chrome processes and its own profile directory:

| Signal | Chromes at +1s, before | after | Profile dir |
|---|---|---|---|
| `SIGTERM` | 10 / 10 | **0 / 0** | leaked → **cleaned** |
| `SIGINT` | 10 / 10 | **0 / 0** | leaked → **cleaned** |
| `SIGKILL` | 10 / 9 | 10 / 10 | leaked → **leaked** |

🛑 **`SIGKILL` still leaks both, and always will** — no handler can catch it.
That is precisely why the startup sweep exists. **The shutdown handlers are the
reliable half; the sweep is the opportunistic half**, and the code comment says
so in those words rather than presenting them as equals.

🔑 **The bigger half of the profile-dir leak was never abnormal exit at all.**
A *fully successful* run of `boot_check`, `to_top_check` or `filter_row_check`
left its profile directory behind — those three never removed theirs. That is
**178 of the 189** dirs measured on the morning of 2026-08-17 (128 + 33 + 17).
Moving the `rm` into `stopChrome` fixed all three at once; a per-tool patch
would have fixed it twice and missed it once, which is the whole argument for
the shared library.

🔎 **The sweep is proven to DISCRIMINATE, not merely proven not to delete.**
With the age guard neutralised so the process-table test stood alone, the *same
directory* survived a sweep while its check was live, and was removed once its
Chrome was killed. A sweep that simply never deletes passes the positive case
on its own — which is exactly how a peer's hand-rolled cleanup guard passed
while guarding nothing, a failure that session volunteered rather than banked.
Two independent guards, both failing closed: a live `--user-data-dir` in the
process table (re-checked immediately before each `rm`, never enumerated up
front, because the directory set is **not stable between two reads minutes
apart**), and a 30-minute age floor covering the window between a peer's
`mkdtemp` and its `spawn`.

🛑 **And a transport failure no longer impersonates a regression.** A CDP
timeout used to render as `FAIL <assertion name>` with exit 1 —
byte-indistinguishable from a real bug, and measured by a peer at **2 of 4**
`boot_check` runs and **4 of 8** `recipe_check` runs on a loaded five-session
machine. It now aborts as `HARNESS ERROR — the browser stopped answering` with
exit **2**, and never prints an assertion's name. The latch is set in the error
constructor and read in `Report.check` — the single funnel all ten tools'
assertions pass through — because the tools catch broadly by design and discard
the type, so a distinct error class alone would not have worked.
**No retry was built, deliberately:** CDP calls are not idempotent (re-issuing
`Input.dispatchMouseEvent` taps twice, `Page.navigate` reloads), so a transport
retry silently changes what the downstream assertion measures, which is one step
from running it again until green. `FAVES_CDP_TIMEOUT_MS` gives a loaded machine
rope instead.

🔑 **This also relocates the flakiness finding.** The 30-second timeout lives in
the **transport**, shared by all ten checks — not in `cook_check`. The owner's
CI ruling picked `boot_check` because it "makes no timing assumptions", which is
true of its *assertions* and does not survive contact with a transport timeout.
A body with zero timing assumptions inherits the flakiness anyway.

The original filing follows verbatim.

- ✅ [0330-a-killed-browser-check-leaks-its-chrome-and-th](0330-a-killed-browser-check-leaks-its-chrome-and-th.md)

## Theme 28c — a section's serving window (shipped 2026-08-16)

- ✅ [0340-28c-a-section-s-time-window-is-unreadable-pros](0340-28c-a-section-s-time-window-is-unreadable-pros.md)
