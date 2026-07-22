# Architecture

## Shape

A **zero-build, static, installable web app (PWA)**. The `site/`
directory is the complete deployable artifact: hand-written HTML, one
CSS design system, vanilla ES-module JavaScript, and JSON data files.

```
site/
  index.html            app shell (list, filters, global search, picker)
  restaurant.html       menu view (?id=<restaurant-id>)
  css/app.css           design tokens + components (single file)
  js/                   ES modules, one per concern (data, filters, ranking,
                        hours, search, cart, favourites, settings, …) — model
                        split from *-ui.js where a feature has both
  data/index.json       ordered list of restaurant ids
  data/restaurants/     <id>.json — one file per restaurant, menu included
  img/                  icons, photos (lazy-loaded)
  manifest.webmanifest  PWA manifest
  sw.js                 service worker (precache shell + data)
```

## Decisions and rationale

This table is the compact current truth. The fuller deliberation behind
the significant calls — the alternatives weighed and why they lost —
lives as ADRs in [`decisions/`](decisions/); write a new one before
deviating from the architecture.

| Decision | Choice | Why |
|---|---|---|
| Framework | **None** (vanilla) | 7–20 restaurants is trivially small. No toolchain exists on the dev machine (no Node/brew) and none is wanted: nothing to install, nothing to rot, instant onboarding for any future editor (human or AI). Performance ceiling is higher than any framework. |
| Build step | **None** | `site/` is what ships. Removes a whole class of failure. |
| Data | **JSON, one file per restaurant** | Adding a restaurant = add one file + one id in `index.json`. Git is the CMS: history, review, rollback for free. |
| Offline | **Service worker precache** | Menus are small text; precache everything. Whole app works in flight mode / dodgy reception outside the takeaway. |
| Hosting | **Cloudflare Pages** (`lets-eat.myspot.nz`) | Decided 2026-07-07 (ADR 0004); AWS S3 + CloudFront is the host-agnostic fallback. See "Hosting" below. |
| Rendering | **Client-side from JSON** | Two tiny HTML shells + fetch. Precached data makes it instant; no SSG needed at this scale. |
| Repo | Private; site public | Curation and picks are ours; the URL is shareable with guests. |

## Hosting

**Cloudflare Pages at `lets-eat.myspot.nz` (decided 2026-07-07, ADR 0004).**
Connects to the private GitHub repo: push to `main` → deployed (no build
command, output dir `site/`); free tier, global CDN, automatic HTTPS, custom
domain via the existing Cloudflare DNS, per-branch preview URLs. Provisioned as
code — [`tools/deploy.json`](../tools/deploy.json) declares the Pages project,
build config and domain; [`tools/deploy.py`](../tools/deploy.py) reconciles it
idempotently against the Cloudflare API (stdlib only). A **subdomain**, not a
`myspot.nz/lets-eat` path, because a Pages project serves a whole hostname at
root (a path prefix would need a Worker router); the app is already
origin-portable (relative paths, `./`-scoped manifest), so the subdomain needs
no app changes. Runbook: [`docs/DEPLOY.md`](DEPLOY.md).

**Fallback:** a public AWS S3 bucket (cents/month) fronted by CloudFront or
Cloudflare — the PWA's service worker requires HTTPS, so a bare S3 website
endpoint won't do, and a bare bucket has no custom domain or repo integration
(`aws s3 sync site/ …` to deploy). The app is host-agnostic, so the choice is
reversible in an afternoon.

## Data model

`site/data/restaurants/<id>.json`:

```jsonc
{
  "id": "kk-malaysian",              // kebab-case, matches filename
  "name": "KK Malaysian",
  "cuisine": ["Malaysian"],          // 1..n, sentence case
  "area": "Te Aro",                  // suburb-level grouping for filters
  "city": "Wellington",
  "address": "Ghuznee St, Wellington",
  "lat": -41.29310,                  // optional decimal degrees (WGS84); both or neither
  "lng": 174.77551,                  // feeds the native-maps handoff + (later) distance sort
  "phone": "+64 4 ...",              // tel: link for ordering
  "website": null,                   // or URL (the venue's own site)
  "ordering": [                      // 0..n online-order links (link out, never build)
    { "platform": "Uber Eats", "url": "https://..." }
  ],
  "services": ["dine-in", "takeaway"],
  "hours": null,                     // null, or a full week (see below)
  "locations": [                     // OPTIONAL: for a venue with several branches
    { "label": "Courtenay Place",    //   sharing this name/menu (see "Multi-location"
      "address": "…", "lat": -41.29, //   below + ADR 0011). When present, the branches
      "lng": 174.78, "phone": "…",   //   carry address/lat/lng/phone/hours — those five
      "hours": { /* week */ } }       //   fields must then be ABSENT at the top level.
  ],

  "image": null,                     // optional self-hosted card photo, e.g. "img/kk/hero.jpg"
  "alt": null,                       // required when image is set (a11y)
  "vibe": ["cheap-and-cheerful"],    // free-form chips shown on cards
  "picks": ["Char kway teow"],       // "our picks" — dish names, must exist in menu
  "priceBand": null,                 // optional curated "$"|"$$"|"$$$" — overrides the
  "pricePerPerson": null,            // median (price.js) when it misleads; figure optional
  "verified": null,                  // ISO date the menu was last checked, e.g. "2026-07-10"
  "rating": null,                    // optional curated household rating, integer 1..3 (ours,
                                     //   static). Distinct from device-local personal ratings.
  "status": "stub",                  // stub | menu-complete | verified
  "menu": [
    {
      "section": "Noodles",
      "items": [
        {
          "name": "Char kway teow",
          "code": null,              // optional: the venue's own order number ("14"), if it takes orders by number
          "desc": "Flat rice noodles wok-fried with egg, bean sprouts and soy.",
          "price": 18.5,             // NZD; null if market/varies
          "tags": ["spicy-1"],       // see tag vocabulary
          "image": null,             // optional self-hosted dish photo (lazy-loaded)
          "alt": null,               // required when image is set
          "rating": null,            // optional curated household rating, integer 1..3 (ours)
          "goesWith": ["Roti"]       // optional pairings: dish names, or "id#Dish" cross-record
        }
      ]
    }
  ]
}
```

### Cook at Home (recipes) — `kind: "recipes"`

The one non-venue record type. A single collection,
`data/restaurants/cook-at-home.json`, holds home recipes so "cook
tonight" sits in the same list (and the "pick for us" shuffle) as the
takeaways. It reuses the restaurant shape with a `kind` discriminator:

- `kind`: `"venue"` (default when absent) or `"recipes"`.
- For `"recipes"`, the venue-only fields relax: `area`/`city`/`address`
  may be `null`, `services` is an empty list (a recipe is neither
  dine-in nor takeaway), and there is no contact/order card.
- Each menu item may carry recipe fields, all optional:
  - `serves`: integer (shown where a dish price would be).
  - `time`: string, e.g. `"40 min"`.
  - `ingredients`: list of strings.
  - `steps`: list of strings (the method, rendered as an ordered list).
- `section` groups recipes (e.g. "Weeknight dinners"); `picks`, `tags`, `desc`, search and dietary chips all work unchanged.

Rendering: the menu screen shows ingredients + method in a collapsed
`<details>` per recipe; the home card is an accent-tinted pin with a recipe
count; the collection is excluded from the area/cuisine facets. Each recipe
name also links to a focused page `recipe.html?id=<collection>&dish=<slug>`
(`site/js/recipe.js`) — the whole recipe + pairings, deep-linkable, SW-served
via `ignoreSearch` like `restaurant.html`, and the one sanctioned extra page
type (recorded per the docs-as-code rule; no others planned).

### Tag vocabulary (closed set — extend here, not ad hoc)

- Dietary: `v` (vegetarian), `vg` (vegan), `gf`, `df`
- Allergens (warnings, rendered prominently): `contains-nuts`,
  `contains-peanuts`, `contains-shellfish`, `contains-egg`,
  `contains-dairy`, `contains-gluten`, `contains-soy`, `contains-sesame`
- Heat: `spicy-1` … `spicy-3`
- Options: `gf-option`, `v-option`

Unknown is distinct from safe: **no tag means "not stated"**, and the
UI must never present absence of an allergen tag as "allergen-free".

### Rules

- `data/index.json` is the display order (an array of ids).
- Every id in `index.json` has a matching file; every `picks` entry
  matches a menu item `name` exactly.
- Prices are numbers (NZD) or null — never strings.
- `status` gates UI: `stub` restaurants render as "menu coming soon"
  cards, never as empty menus.
- `ordering` is a (possibly empty) list of `{platform, url}` — external
  online-order links (Uber Eats, Delivereasy, the venue's own ordering page):
  where a customer can buy, distinct from `website` (the venue's own site).
  Keep these owner-confirmed — delivery links rot.
- `hours` is `null` (not stated) or a **full week** keyed `mon`…`sun`
  (all seven keys required). Each day is a list of `[open, close]`
  intervals in `"HH:MM"` 24h local time: `[]` = closed that day; two or
  more intervals express a lunch/dinner split, e.g.
  `"mon": [["12:00","15:00"],["17:00","21:00"]]`. `close` may be `null`
  meaning open-ended ("late"). `close`, when given, must be after `open`
  — past-midnight is expressed with a `null` close, never a wrap. The
  hours engine (`site/js/hours.js`) computes a live open/closed status
  from this in **Pacific/Auckland** time (not the viewer's clock), and a
  grouped weekly display; see ADR 0006. That status also drives the home
  list ordering (`site/js/ranking.js`), whose **primary key depends on mode**:
  the **default order** (no location) is reachable → availability →
  favourite-boosted distance → favourite tiebreak → curated, floating the
  places you can order from *now* up; but with **"Nearest first"** on (a known
  origin) distance leads — reachable → favourite-boosted distance →
  availability → tiebreak → curated — so the toggle honours its label rather
  than floating a farther-but-open venue above a nearer one. Favourites lift
  via a *weighted* metric (a favourite counts as `favBoostKm` nearer, not an
  outright win), and a known location sinks anything past a reachable radius
  (`farKm`). Both distances are viewer-tunable (`settings.js`, device-local);
  "Pick for us" shuffles only the available set.
- `image` (venue card photo, or a menu item's dish photo) is an optional
  **self-hosted** path — no hotlinking (offline / no-external-request
  rule); store under `site/img/`. Photos are excluded from the transfer
  budget and lazy-loaded. When `image` is set, `alt` is **required**
  (accessibility). Prefer the owner's photo of the real dish; generic
  stock only as a captioned fallback, properly licensed.
- `code` (menu item) is an optional **non-empty string** — the venue's own
  order number for the dish, where it takes orders by number ("two number
  14s"). It is distinct from the `name`: never bake the number into the name
  (it breaks search, slugs, picks and sort). Only set it where the venue
  actually orders by number ("no code = not stated"); most venues have none.
  Rendered as a muted `#code` badge on the dish row, and matched by search.
  Picks and `goesWith` still reference the stripped `name`, never the code.
- `goesWith` (menu item) is an optional list of pairing references —
  "goes well with" suggestions shown on the dish. Each is either a dish
  `name` in the **same** record, or a cross-record `"restaurant-id#Dish
  Name"`. Every reference must resolve to a real dish (validated), the
  same discipline as `picks`. It's our curation — no backend, no crowd ratings.
- `rating` (venue top-level and/or menu item) is an optional **curated
  household rating** — our own static integer `1..3` (validated; a bool/float/
  out-of-range is rejected). Absent = not rated; the field ships **dormant**
  (no data yet — owner supplies real values). It renders where picks render (a
  "Our rating ★★☆" pill) and on the venue header, styled distinctly from the
  device-local **personal ratings** (`site/js/ratings.js`, per-profile
  `localStorage`) so ours-verified never reads as the viewer's-own-unverified.
  **Public / crowd ratings stay rejected** (backend + moderation + accounts
  break three non-goals — ADR 0013); the online Google-rating edge function is
  a separate, owner-gated item (ROADMAP Theme 5).
- `lat`/`lng` are optional decimal degrees (WGS84), set together or not
  at all. When present, the menu screen's address row hands off to the
  device's native maps app at those exact coordinates (`site/js/geo.js`);
  when absent it falls back to an address search. They also seed the
  distance-sorted "what's close" list (roadmap Theme 2). Geocode from the
  address with a dev-time tool (OpenStreetMap Nominatim) — never invent
  them; a wrong pin is worse than no pin (an absent pair just searches by
  text). `validate.py` warns when a venue has none.
- `locations` (**multi-location venues**, ADR 0011) is an optional array of
  branches that share this record's name/menu/cuisine, each `{ label?,
  address, lat, lng, phone, hours }` — same field rules as the top-level
  equivalents (`label` an optional non-empty string). When present it is the
  source of truth: the per-branch fields (`address`/`lat`/`lng`/`phone`/
  `hours`) must **not** also sit at the top level, and `area`/`city` stay
  shared at the top. A single-location venue omits `locations` entirely and
  keeps those fields at the top level — fully backward compatible. Resolution
  (`site/js/locations.js`): the loader (`data.js`) projects the first (primary)
  branch to the top level so every consumer keeps working; "Near me" distance,
  the drive-time hint, the card's open/closed status and the maps handoff then
  use the **nearest** branch when the viewer's location is known, and the
  **primary** branch when it isn't (never "any branch open" — that would
  contradict the distance shown). The menu screen lists every branch, nearest
  first, each with its own directions link, phone and hours; a one-branch array
  renders identically to a flat single-location venue.

### Client-side personal layer (order tally, favourites, ratings, profiles)

**Device-local** state kept in `localStorage`, never in the repo and never
sent anywhere. All of it sits on `site/js/store.js` — a `safeStorage()`
that transparently falls back to an in-memory shim when storage is blocked
(Safari private mode), so features degrade to session-only rather than
crashing. Each feature is split model (DOM-free, unit-tested) / UI.

**Profiles** (`profiles.js`, ADR 0012) let several people share one phone,
each with their own hearts. A device-level registry `faves.profiles.v1`
(`{v, activeId, profiles:[{id,name}]}`) names them; per-profile stores keep
their KEY constant but read through `profileScopedStorage()`, which rewrites
the key to `faves.p.<activeId>.<base>` (`scopeKey`). So a switch + `reload()`
re-points the whole layer with no consumer rewrite. **Per-profile:** favourites,
personal ratings, and *all* of settings (dietary/allergen prefs — safety-critical;
ranking dials; reo language). **Shared/device:** the order tally (one order for the table) and
the ephemeral Near-me origin. `migrate()` folds pre-profiles data into a default
profile on upgrade (copies, doesn't move, so a briefly-cached old asset still
works; idempotent). The switcher lives in the ⚙ Settings dialog; the menu/recipe
screens `location.reload()` on a cross-tab profile change so a stale allergen
filter can't linger. No accounts, no sync — cross-device is a separate app
(Theme 6). The feature stores:

- **Order tally** (`faves.order.v1`): `cart.js` — pure grouping/total maths
  (`groupByVenue`, `orderTotal`) + a thin injectable store; `cart-ui.js`
  injects a floating order button + dialog on every screen and a `+ / −`
  stepper on restaurant dish rows. A single shared `order` singleton keeps
  the menu steppers and the dialog in sync. Deliberately **not** ordering:
  no payment, no account, no backend — it hands off to phone/website
  (STRATEGY non-goal). Prices are an *estimate* (menu data flagged for an
  in-store refresh), captioned as such.
- **Favourites** (`faves.favourites.v1`): `favourites.js` — a set of
  hearted venues + dishes (denormalised so the view renders from storage
  alone; the deep-link href is derived from the shared `slug`).
  `favourites-ui.js` is the `♥` toggle; the home "Favourites" view reuses
  the search panel's grouped renderer (`results-view.js`).
- **Ratings** (`faves.ratings.v1`): `ratings.js` — the viewer's own 1–3 marks
  on venues + dishes, a flat `{ key: 1..3 }` map keyed like favourites,
  clamped/sanitised on read. `ratings-ui.js` is the keyboard-operable ☆☆☆
  control (personal, `--personal` violet) plus the static curated "Our rating"
  badge (`--accent`); rendered on the menu header + dish rows. Per-profile (a
  rating is personal); no averaging, no sharing, no public ratings (ADR 0013).
- **Settings** (`faves.settings.v1`): `settings.js` — dietary/allergen prefs
  (`diet`), the two ranking distances (`favBoostKm`, `farKm`) and the reo
  language, clamped/sanitised on read so a bad value can't break the sort;
  `settings-ui.js` is the ⚙ dialog (also home to the profile switcher).
- **Profiles** (`faves.profiles.v1`): `profiles.js` — the registry + the
  profile-scoped storage wrapper the two stores above read through. See the
  profiles paragraph and ADR 0012.

A `storage` event keeps other tabs in step (favourites/settings keys are now
namespaced by the active profile; a registry change re-points them). Recipes (Cook at Home) can be
*favourited* but carry no order stepper — that collection is for cooking,
not an order to read down the phone. This layer is the reusable seam for
later local-only features and the bridge to the health app (roadmap Themes 5–6).

## Service worker strategy

- **Precache** on install: both HTML shells, CSS, JS, `index.json`,
  every restaurant JSON, icons.
- **Network-first with cache fallback** for data (so menu edits appear
  promptly), **cache-first** for shell assets, versioned cache name
  bumped by a `VERSION` constant in `sw.js` (updating it is part of the
  data-edit checklist).
- Photos: cache-on-demand with a size-capped runtime cache.

## Constraints

- No external requests at runtime: no CDNs, no web fonts (system font
  stack), no analytics in v1. Everything self-contained → fast, private,
  offline-safe.
- JavaScript is enhancement-heavy but the shells must still render a
  usable restaurant list if a module fails: fail soft, show data.
