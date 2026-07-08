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

- **Info panel on the right when there's room** `[M][design]` —
  responsive two-column on tablet/desktop (menu left; contact, hours, map
  link, order summary right). One CSS grid; mobile stays single-column.
- **Sticky search on phones** `[S][design]` — keep the menu search
  reachable while scrolling a long menu (sticky under the section nav).
  Partly addressed already: menu **section headings** now stick under the
  jump-nav (2026-07-08); the menu *search field* sticking is the remaining
  piece.
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
- General polish to the "oh, this is nice" bar (`DESIGN.md` mood):
  spacing, motion, empty states, and the new cart UI.

**Accept when**: judged against `DESIGN.md` at 390 px, tablet and
desktop; Lighthouse a11y stays 100.

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

Recommend the **`mailto:` links** first — smallest, honest, and it already
has a home in `intake/`. **⚑ owner to supply the intake email address.**
**Named / personalised feedback** (owner ask, 2026-07-08) is free here: the
mailto template (or the prefill form) can include an optional "your name"
field, so a report arrives attributed — no account needed, the sender just
types it. (Their email address comes with the message anyway.)

## Theme 5 — Richer dish data

- **Typical price per person** `[S]` — owner ask (2026-07-08). We already
  hold every menu price, so derive a band per venue — a $/$$/$$$ chip, or
  "~$25pp" from the mean main-course price — computed from our own data,
  no external source. Cheap, offline, honest (label it an estimate from
  our menu; prices are already flagged as needing an in-store refresh).
  Show it on the card and menu header; it also sharpens "Pick for us"
  ("cheap eats tonight"). Optionally a curated override field where the
  computed band misleads (e.g. a venue that's mains-only vs. banquet).
- **More allergens** `[S][schema]` — extend the closed tag set (egg,
  dairy/milk, gluten, soy, sesame) in `ARCHITECTURE.md`. Cheap to add;
  the honest part is *populating* it — "no tag = not stated" means owner
  or menu confirmation, never guesses.
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
- **See public ratings / reviews** `[S]` — owner ask (2026-07-08).
  *Embedding* Google/Tripadvisor ratings means their API (keys, ToS,
  external requests, breaks offline) or scraping (against ToS, brittle) —
  **✗**. The honest, zero-cost version: a **"See reviews" link-out** that
  opens the venue's Google Maps listing (same handoff pattern as the maps
  link — we already have coords/name). Live rating numbers in-app are not
  worth the constraint break; the link gets you the full, current reviews.
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
  local ratings and profiles will reuse. **Still open:** surface hearts in
  "Pick for us" (favour the usual), heart-from-the-home-card (needs the
  card restructure — a button can't nest in the card's `<a>`), and feed the
  health app's
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

- **SBOM publishing** `[S]` **⚑** — publish a machine-readable Software
  Bill of Materials (SPDX or CycloneDX) as a provenance attestation. It
  will be near-empty, which is the point: it *proves* the zero-dep claim
  and any future entry shows up as a diff. Generation options, cheapest
  first: GitHub's native dependency-graph SPDX export (zero tooling, via
  repo settings / API), or a CI step with a generator. Publish options:
  a CI build artifact, a committed `sbom.spdx.json`, served at
  `/.well-known/sbom` on the site, or attached to a tagged release. **⚑
  owner picks format + publish location** (and whether to cover just the
  shipped `site/` or also the dev toolchain — Node, the test runner).
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

## Also parked (small)

- ~~**"Open now"** from the `hours` data on cards.~~ ✅ **done
  2026-07-08** — grew into a full live status (open/closing-soon/closed +
  relative time) on cards and the menu screen, on a structured per-day
  hours model computed in NZ time ([ADR 0006]), **plus an "Open now"
  filter toggle** in the home results head.
- **Shareable group shortlist links** (encode the shortlist in the URL —
  no backend needed).
- **Te reo Māori UI toggle.**

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

**Two owner calls before starting:**
1. Confirm the **order tally** is in — then the one-line non-goal
   clarification lands in `STRATEGY.md`.
2. **Ratings = curated + local, not public** — agreed?
