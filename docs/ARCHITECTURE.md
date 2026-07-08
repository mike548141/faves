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
  js/                   ES modules (data.js, filters.js, ranking.js,
                        distance.js, hours.js, picker.js, menu.js, search.js,
                        slug.js, store.js, settings.js, settings-ui.js,
                        cart.js, cart-ui.js, favourites.js, favourites-ui.js,
                        results-view.js, sw-register.js)
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
| Hosting | **Cloudflare Pages** (recommended) or a public **AWS S3 bucket** | See "Hosting options" below. Either works because the artifact is plain static files — the decision is deferrable to Phase 7 without touching the app. |
| Rendering | **Client-side from JSON** | Two tiny HTML shells + fetch. Precached data makes it instant; no SSG needed at this scale. |
| Repo | Private; site public | Curation and picks are ours; the URL is shareable with guests. |

## Hosting options

Two viable targets; both are in the existing estate (Cloudflare and AWS).

**Cloudflare Pages — recommended.** Connects directly to the private
GitHub repo: push to `main` → deployed (build command none, output dir
`site/`). Free tier, global CDN, automatic HTTPS, custom domain via the
existing Cloudflare DNS, and preview URLs per branch for free. Zero
moving parts on our side.

**Decision (2026-07-07): Cloudflare Pages at `lets-eat.myspot.nz`.**
Hosting is provisioned as code — [`tools/deploy.json`](../tools/deploy.json)
declares the Pages project, build config and custom domain;
[`tools/deploy.py`](../tools/deploy.py) reconciles it idempotently
against the Cloudflare API (stdlib only). A **subdomain**, not the path
`myspot.nz/lets-eat`, because a Pages project serves a whole hostname at
its root; a path prefix would need a repo restructure or a Worker
router. The app is already origin-portable (relative paths, `./`-scoped
manifest), so the subdomain needs no app changes. Runbook: [`docs/DEPLOY.md`](DEPLOY.md).

**AWS S3 public bucket — fallback/alternative.** Static website hosting
on a public-read bucket. Costs cents/month at this size, but is more
assembly required: no HTTPS or custom domain without CloudFront (or
Cloudflare proxied in front of the bucket), no repo integration (deploy
is `aws s3 sync site/ s3://<bucket> --delete`, manual or via GitHub
Actions), and S3 website endpoints don't serve HTTP/2. Choose this only
if there's a reason to keep the artifact in AWS.

Note the PWA constraint either way: service workers require HTTPS, so a
bare S3 website endpoint (HTTP-only) is not sufficient on its own —
S3 hosting in practice means S3 + CloudFront or S3 + Cloudflare.

The app is host-agnostic (plain files, relative paths, no server
logic), so this decision is made in Phase 7 and reversible in an
afternoon.

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
  "image": null,                     // optional self-hosted card photo, e.g. "img/kk/hero.jpg"
  "alt": null,                       // required when image is set (a11y)
  "vibe": ["cheap-and-cheerful"],    // free-form chips shown on cards
  "picks": ["Char kway teow"],       // "our picks" — dish names, must exist in menu
  "verified": null,                  // ISO date the menu was last checked, e.g. "2026-07-10"
  "status": "stub",                  // stub | menu-complete | verified
  "menu": [
    {
      "section": "Noodles",
      "items": [
        {
          "name": "Char kway teow",
          "desc": "Flat rice noodles wok-fried with egg, bean sprouts and soy.",
          "price": 18.5,             // NZD; null if market/varies
          "tags": ["spicy-1"],       // see tag vocabulary
          "image": null,             // optional self-hosted dish photo (lazy-loaded)
          "alt": null,               // required when image is set
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
- `section` groups recipes (e.g. "Weeknight dinners"); `picks`,
  `tags`, `desc`, search and dietary chips all work unchanged.

Rendering: the menu screen shows ingredients + method in a collapsed
`<details>` per recipe; the home card is an accent-tinted pin showing a
recipe count; the collection is excluded from the area/cuisine filter
facets. Each recipe's name also links to a focused full page,
`recipe.html?id=<collection>&dish=<slug>` (`site/js/recipe.js`), showing
the whole recipe + pairings — deep-linkable and shareable; the SW serves
it via `ignoreSearch` like `restaurant.html`. This is the recorded
deviation permitted by the "record it here first" rule — no other content
types are planned.

### Tag vocabulary (closed set — extend here, not ad hoc)

- Dietary: `v` (vegetarian), `vg` (vegan), `gf`, `df`
- Allergens (warnings, rendered prominently): `contains-nuts`,
  `contains-peanuts`, `contains-shellfish`
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
  online-order links only (Uber Eats, Delivereasy, the venue's own
  ordering page …). We link out; we never take payment. `website` is
  the venue's own site; `ordering` is where a customer can buy. Keep
  these URLs owner-confirmed — delivery links rot.
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
  list's **default order** (`site/js/ranking.js`): open/opening-soon
  venues float up, closed ones sink, favourites (a hearted venue or one
  holding a hearted dish) lift within a tier via a *weighted* metric — a
  favourite counts as `favBoostKm` nearer, so it doesn't simply always beat
  distance — and, when a location is known, anything past a reachable
  radius (`farKm`, gated on actual distance) sinks too. Sort key: reachable
  → availability → effective (favourite-boosted) distance → favourite
  tiebreak → curated. Both distances are viewer-tunable (`settings.js`,
  device-local); "Pick for us" shuffles only the available set.
- `image` (venue card photo, or a menu item's dish photo) is an optional
  **self-hosted** path — no hotlinking (offline / no-external-request
  rule); store under `site/img/`. Photos are excluded from the transfer
  budget and lazy-loaded. When `image` is set, `alt` is **required**
  (accessibility). Prefer the owner's photo of the real dish; generic
  stock only as a captioned fallback, properly licensed.
- `goesWith` (menu item) is an optional list of pairing references —
  "goes well with" suggestions shown on the dish. Each is either a dish
  `name` in the **same** record, or a cross-record `"restaurant-id#Dish
  Name"`. Every reference must resolve to a real dish (validated), the
  same discipline as `picks`. It's our curation — no backend, no ratings.
- `lat`/`lng` are optional decimal degrees (WGS84), set together or not
  at all. When present, the menu screen's address row hands off to the
  device's native maps app at those exact coordinates (`site/js/geo.js`);
  when absent it falls back to an address search. They also seed the
  distance-sorted "what's close" list (roadmap Theme 2). Geocode from the
  address with a dev-time tool (OpenStreetMap Nominatim) — never invent
  them; a wrong pin is worse than no pin (an absent pair just searches by
  text). `validate.py` warns when a venue has none.

### Client-side personal layer (order tally, favourites)

**Device-local** state kept in `localStorage`, never in the repo and never
sent anywhere. All of it sits on `site/js/store.js` — a `safeStorage()`
that transparently falls back to an in-memory shim when storage is blocked
(Safari private mode), so features degrade to session-only rather than
crashing. Each feature is split model (DOM-free, unit-tested) / UI:

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
- **Settings** (`faves.settings.v1`): `settings.js` — the viewer's two
  ranking distances (`favBoostKm`, `farKm`), clamped/sanitised on read so a
  bad value can't break the sort; `settings-ui.js` is the ⚙ dialog. The
  first preferences surface, and the seam for future per-user options.

A `storage` event keeps other tabs in step. Recipes (Cook at Home) can be
*favourited* but carry no order stepper — that collection is for cooking,
not an order to read down the phone. This layer is the reusable seam for
later local-only features (ratings, per-person profiles) and the bridge to
the health app's eating diary (roadmap Themes 5–6).

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
