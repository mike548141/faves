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
| Time | **Dated in the data, resolved before the UI** | Prices, menus and venues change; git dates our *edits*, never the world. Optional dated primitives + one pure resolver (`temporal.js`) run in `data.js`, so the app stays time-blind and the dinner-choosing UX is untouched. Decided 2026-08-08 (ADR 0023); atelier PRINCIPLES §9. |

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

**Two stores, cut on rendered / not rendered (ADR 0047).** `site/data/` is a
**payload** — the service worker precaches every venue file, so a field added
there is downloaded by every phone whether a screen reads it or not. It holds
exactly what a screen can show. `data/` at the repo root is the **record** —
never served, never precached, never referenced from `site/` — and holds
everything else, kept forever: superseded prices (`data/history/prices/`),
departed dishes (`data/history/dishes/`), and the ownership graph
(`data/entities/`, `data/people/`, `data/ownership.json`, ADR 0046). The record
keys on the venue `id` from its own side only, so the payload needs no field to
gain an owner or a history. Before adding a field to a venue file, name the
screen that renders it; `data/README.md` has the full rule, and
`tools/split_data.py --check` proves the two stores still reconstruct the
pre-split corpus.

Personal data is barred from the payload absolutely. It is permitted in the
record only under ADR 0046's provenance rule — name, email and phone, sourced
either `public-record` or `given`, with `tools/registry.py` erroring on a
record that cannot say which. Home addresses of people and health detail are
excluded from both stores, always.

`site/data/restaurants/<id>.json`:

```jsonc
{
  "id": "kk-malaysian",              // kebab-case, matches filename
  "name": "KK Malaysian",
  "cuisine": ["Malaysian"],          // 1..n, sentence case
  "area": "Te Aro",                  // suburb-level grouping for filters
  "city": "Wellington",
  "address": "Ghuznee St, Wellington",
  "timezone": null,                  // optional IANA zone, e.g. "Europe/London".
                                     //   Absent = the collection's home,
                                     //   Pacific/Auckland. May also sit on a
                                     //   branch. Decides open/closed (ADR 0043)
  "currency": null,                  // optional ISO 4217, e.g. "GBP". Absent =
                                     //   NZD. Venue-level: one menu, one currency
                                     //   (hemisphere is DERIVED from lat, never stored)
  "language": null,                  // optional BCP-47 tag the record's own
                                     //   name/desc/section strings are written in,
                                     //   e.g. "th-Latn". Absent = "en-NZ" (ADR 0044)
  "formerIds": [],                   // optional: ids this record used to have.
                                     //   MUST agree with site/js/renames.js — an
                                     //   old shared link resolves through it
  "lat": -41.29310,                  // optional decimal degrees (WGS84); both or neither
  "lng": 174.77551,                  // feeds the native-maps handoff + (later) distance sort
  "phone": "+64 4 ...",              // tel: link for ordering. address/phone may
                                     //   also be a dated series — see "Time" below
  "lifecycle": {                     // REQUIRED. The venue's dated life (ADR 0023)
    "opened": null,                  //   world time: business started; absent = unknown
    "added": "2026-07-06",           //   record time: entered Faves (required)
    "events": [                      //   0..n dated transitions, oldest first
      { "type": "closed-temporarily", "date": "2026-06-01",
        "until": "2026-09-01", "note": "kitchen refit" },
      { "type": "reopened", "date": "2026-09-03" }
    ]
  },
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
      "hours": { /* week */ },       //   fields must then be ABSENT at the top level.
      "timezone": null,              //   `timezone`, `detailsVerified` and
      "detailsVerified": null,       //   `detailsVerifiedBy` are DIFFERENT: legal at
      "detailsVerifiedBy": null }    //   both levels, branch winning, top level the
  ],                                 //   default (ADR 0043; per-branch provenance)

  "image": null,                     // optional self-hosted card photo, e.g. "img/kk/hero.jpg"
  "alt": null,                       // required when image is set (a11y)
  "vibe": ["cheap-and-cheerful"],    // free-form chips shown on cards
  "picks": ["Char kway teow"],       // "our picks" — a dish name or a dishId; must
                                     //   resolve to EXACTLY one dish (ADR 0051)
  "priceBand": null,                 // optional curated "$"|"$$"|"$$$" — overrides the
  "pricePerPerson": null,            // median (price.js) when it misleads; figure optional
  "verified": null,                  // ISO date the MENU was last read, e.g. "2026-07-10"
  "verifiedBy": null,                // HOW it was read — closed set, see "Derivation" below.
                                     //   Required alongside `verified` on any NEW reading.
                                     //   Together these decide the "needs a refresh"
                                     //   caveat: first-party method + under 12 months
                                     //   old = no caveat (ADR 0036).
  "detailsVerified": null,           // ISO date the venue's DETAILS — phone, address,
  "detailsVerifiedBy": null,         //   opening hours — were last checked, and how.
                                     //   Same closed method set. Optional and usually
                                     //   absent: `verified` above dates the menu and
                                     //   says nothing about the hours printed beside
                                     //   it, so the menu screen only claims these were
                                     //   checked when this pair says so (ADR 0037).
                                     //   Unlike `verified`, a date here without a
                                     //   method is an ERROR — no legacy corpus.
                                     //   ALSO valid on a branch, which wins; here it
                                     //   is then the default for branches that omit
                                     //   it (per-branch provenance, below).
  "rating": null,                    // optional curated household rating, integer 1..5 (ours,
                                     //   static). Distinct from device-local personal ratings.
  "status": "stub",                  // stub | menu-complete | verified
  "addOnGroups": [                   // OPTIONAL: priced extras, defined ONCE per
    { "id": "sauces",                //   venue and named by id from a section or a
      "name": "Our sauces",          //   dish (ADR 0048) — see "Add-ons" below
      "select": "many",              //   "one" | "many"
      "max": 3,                      //   optional cap, "many" only, <= option count
      "price": 0,                    //   optional group default for its options
      "options": [                   //   1..n. tags is REQUIRED on every option and
        { "name": "Satay",           //   may be [] ("not stated"); a price must
          "price": 2.5,              //   resolve from the option or its group, and
          "tags": ["contains-peanuts"] }
      ] }                            //   is NEVER null — free is written as 0
  ],
  "menu": [
    {
      "section": "Noodles",
      "sectionId": "noodles",        // REQUIRED, immutable, unique in the venue.
                                     //   The anchor `#section-<id>` comes from
                                     //   THIS, never from the heading, so a
                                     //   rename no longer breaks every link to
                                     //   the section (ADR 0058). Seeded once by
                                     //   tools/seed_section_ids.py; after that,
                                     //   never rewritten
      "note": null,                  // optional subtext under the heading: the
                                     //   qualifier the venue prints beside it
                                     //   ("served till 2pm"). NEVER inside the
                                     //   name — the name is also the jump-nav
                                     //   chip (ADR 0057). Prose, because the
                                     //   machine-readable window is ROADMAP 28c
                                     //   and doesn't exist yet
      "available": null,             // optional window/season for a WHOLE section
      "addOns": [],                  // optional add-on group ids, offered on every
                                     //   dish in this section (ADR 0048)
      "addOnsOnly": false,           // optional: these rows are offered as add-ons,
                                     //   so don't print the section too (ADR 0049).
                                     //   The rows STAY — old hearts/links resolve;
                                     //   validate.py requires every one of them to
                                     //   be reachable as an option first
      "items": [
        {
          "name": "Char kway teow",
          "dishId": "char-kway-teow", // REQUIRED. The dish's IDENTITY (ADR 0051) —
                                     //   anchors, hearts, ratings, picks and order
                                     //   lines all key on it. Seeded ONCE from
                                     //   slug(name) — run tools/seed_dish_ids.py —
                                     //   and then IMMUTABLE: a rename changes the
                                     //   name and leaves this alone, which is what
                                     //   carries links, hearts, ratings and price
                                     //   history across it. Never recompute it from
                                     //   a name; that is the bug this field exists
                                     //   to prevent. Unique within the record.
          "formerIds": [],           // optional: ids this dish used to have, for the
                                     //   rarer case where the id itself had to move.
                                     //   A live id always wins over another dish's
                                     //   former one (ADR 0051)
          "code": null,              // optional: the venue's own order number ("14"), if it takes orders by number
          "desc": "Flat rice noodles wok-fried with egg, bean sprouts and soy.",
          "price": 18.5,             // NZD; null if market/varies. May instead be a
                                     //   dated series — see "Time" below
          "available": null,         // optional: on the menu only in this window/season
          "revisions": [],           // optional: dated log of what changed about the dish
          "needs": [                 // optional: what we know we DON'T know about it
            { "what": "price",       //   closed set — see "What we still owe a dish"
              "note": "The label sat behind the cabinet frame.",  // optional, why
              "since": "2026-08-07" }                             // optional, record time
          ],
          "tags": ["spicy-1"],       // see tag vocabulary
          "image": null,             // optional self-hosted dish photo (lazy-loaded)
          "alt": null,               // required when image is set
          "rating": null,            // optional curated household rating, integer 1..5 (ours)
          "goesWith": ["Roti"],      // optional pairings: dish names, or "id#Dish" cross-record
          "addOns": ["sauces"]       // optional add-on group ids for THIS dish, on
                                     //   top of any its section names (ADR 0048)
        }
      ]
    }
  ]
}
```

### Cook at Home (recipes) — `kind: "recipes"`

The one non-venue record type. A single collection,
`site/data/restaurants/cook-at-home.json`, holds home recipes so "cook
tonight" sits in the same list (and the "pick for us" shuffle) as the <!-- datescan:allow: product vocabulary — "open tonight" is the question this app answers, not a dated claim -->
takeaways. It reuses the restaurant shape with a `kind` discriminator:

- `kind`: `"venue"` (default when absent) or `"recipes"`.
- For `"recipes"`, the venue-only fields relax: `area`/`city`/`address`
  may be `null`, `services` is an empty list (a recipe is neither
  dine-in nor takeaway), and there is no contact/order card.
- **That relaxation is declared, not scattered (ADR 0064).**
  `site/js/kinds.js` is the one table saying what each `kind` has and can
  do — `hasLocation`, `hasHours`, `hasPrices`, `canOrder`, `canReport`,
  `hasFreshness`, `inFacets`, `pinnedFirst`, `hasContactCard`,
  `itemsHaveRecipeFields`, `itemPage` — plus the words the kind supplies
  for itself. Every screen asks it (`kindOf(r).hasHours`) rather than
  testing the discriminator, so `"recipes"` appears as a literal in that
  module alone. A capability goes in only when a call site reads it, and
  never derived from whether a field happens to be present: an unrecorded
  fact and an absent capability are different things. The one identity
  question left, `isRecipeKind()`, exists because that answer is
  **persisted** in hearts, ratings and share URLs.
- Each menu item may carry recipe fields, all optional:
  - `serves`: integer (shown where a dish price would be).
  - `time`: string, e.g. `"40 min"`.
  - `ingredients`: list of strings.
  - `steps`: list of strings (the method, rendered as an ordered list).
- `section` groups recipes (e.g. "Weeknight dinners"); `picks`, `tags`,
  `desc`, search and dietary chips all work unchanged.

Rendering: the menu screen shows ingredients + method in a collapsed
`<details>` per recipe; the home card is an accent-tinted pin with a recipe
count; the collection is excluded from the area/cuisine facets. Each recipe
name also links to a focused page `recipe.html?id=<collection>&dish=<slug>`
(`site/js/recipe.js`) — the whole recipe + pairings, deep-linkable, SW-served
via `ignoreSearch` like `restaurant.html`, and the one sanctioned extra page
type (recorded per the docs-as-code rule; no others planned).

**Cook mode** (ADR 0034) sits on top of that rendering, not beside it: a modal
full-screen `<dialog>` built by `site/js/cook-ui.js` over whatever page you are
on, offered from both the recipe page and the list's expanded detail wherever
`steps` is non-empty. One step at a time, a "Step _n_ of _m_" counter, saturating
Back/Next (no wrap) with arrow-key equivalents, and an ingredients panel that
toggles without moving the step index. `site/js/cook.js` holds the step machine
and a `navigator.wakeLock` lifecycle — request on open, re-acquire on every
`visibilitychange` (the OS releases the lock when the page hides and never
restores it), release on close — all dependency-injected and unit-tested.
Unsupported (iOS &lt; 16.4) and refused both degrade to silence.

### Time — every fact can say when (ADR 0023)

Doctrine: atelier `PRINCIPLES.md` §9. Data carries the time dimension its
domain implies. All four primitives below are **optional and additive** — a
record with no dates in it is still valid and resolves to itself — except
`lifecycle.added`, which every venue must have.

**Two clocks, never collapsed into one.**

| | Fields | Means |
|---|---|---|
| **World time** | `from` · `to` · `date` · `opened` | when it was true out there |
| **Record time** | `recorded` · `offBy` · `added` · `verified` | when we read or wrote it |

They diverge here as a rule, not an exception: we learn a price by reading a
printed menu, long after the shop changed it. So an entry takes effect on its
`from` when we know it, and otherwise on its `recorded` — the day we saw it, by
which it was demonstrably already true.

Dates are ISO 8601 and **may be reduced precision**: `"2019"`, `"2019-05"` and
`"2019-05-21"` are all valid. A menu scan dated only by its year is recorded as
`"2019"`; comparisons widen a partial date to its full interval, so it never
reads as 1 January by accident. Rounding an unknown day up to a precise one
would be inventing evidence.

1. **Temporal value** — `price`, `address` and `phone` (top level and per
   branch) are either the plain value, or a dated series written **oldest
   first**:
   ```jsonc
   "price": [
     { "value": 10.5, "recorded": "2019", "note": "2019 menu scan" },
     { "value": 17.5, "recorded": "2026-08-08", "method": "in-store" }
   ]
   ```
   An entry may carry its own `method` (same closed set as `verifiedBy`);
   omit it and the entry inherits the venue's. Only state it when *that*
   reading came from somewhere other than the venue's last reading.
   A plain value means "true now; we never established since when" — which is
   honest for most of this data, and cheap: the venue's `verified` date already
   supplies the record time. **Only a price that actually moved needs the
   series form.** A future-dated `from` is a scheduled change: the current day
   keeps its own price and `pending()` returns the announced one ("coffee is $6
   from Wednesday" — ROADMAP Theme 13).
2. **Lifecycle** — dated transitions (`closed-temporarily` · `reopened` ·
   `closed-permanently`), never a `closed: true` flag: a flag loses *when*,
   cannot express a reopening, and rewrites history as it flips. A temporary
   closure whose `until` has passed with no `reopened` event is reported
   `overdue` rather than silently assumed back.
3. **Availability** — `{from?, to?, offBy?, season?, note?}` on a section or a
   dish. `from`/`to` are world time and `to` is the **last day it was on the
   menu, inclusive**. `offBy` is record time — the day we confirmed it was gone,
   for the usual case where the real removal date is unknowable. `season` is
   `summer`/`autumn`/`winter`/`spring` in **NZ months** and recurs every year,
   so a winter menu is one fact rather than a row per year.
4. **Revisions** — `[{date?, recorded?, change}]` on a dish: the dated log of
   what changed about it (the muffin that went vegan). Needs at least one of
   the two dates. Data only at present; nothing renders it yet.
5. **Derivation** — `verifiedBy` beside `verified`: *how* the menu was read,
   not only when. See the next subsection.

#### Derivation — how we know, not only when (ADR 0031)

§9 again: *"a stored result carries how it came to be true, not only when"*.
A date alone cannot separate someone standing at the counter from a stale
directory listing, and those two are not equally likely to be wrong — so
`verified` (record time, **full** `YYYY-MM-DD` precision: a reading happens
on a day we know) gains **`verifiedBy`**, a closed set of **source classes**.
Never a person — the no-personal-data rule binds the schema too.

| `verifiedBy` | What it means | Why it can be wrong |
|---|---|---|
| `in-store` | Someone stood in the venue and read the board, card or cabinet (or photographed it there). | Least — first-party and current at the reading. Transcription only. |
| `paper-menu` | A physical or scanned menu document read away from the venue: takeaway card, PDF, photo of a menu. | As old as the document. A 2019 scan and a freshly printed card share this method and differ only by their date. |
| `official-site` | The venue's own website or its own online-ordering storefront. | Sites go stale silently and rarely carry a date; the venue's own claim, not a checked one. |
| `phone` | Someone rang the venue and was told. | First-party and current, but spoken, unrecorded, and usually covers only a few items. |
| `delivery-app` | A third-party ordering platform (Uber Eats, Delivereasy…). | Not the venue's own statement, and prices there are commonly marked up — a *biased* error, not a random one. |
| `third-party` | Any other second-hand listing: directory, aggregator, review site, article. | Weakest. This is where a scraper's guess lands, and the reason the field exists. |

**Three states stay distinguishable** — §9's "unknown is not none":

- no `verified` → we have never read this menu.
- `verified` with no `verifiedBy` → we read it then; how was never recorded.
  Pre-ADR-0031 only. `validate.py` **warns**, never errors: no backfill.
- `verified` + `verifiedBy` → the full derivation. Required on any new reading.

`status: "verified"` is a claim that this menu is current, so it **errors**
without both halves. Everything else is a warning, and `verifiedBy` without
`verified` is an error (a method with no date establishes nothing).

Rendering is deliberately small: the menu header's date line reads
"Read from a paper menu, 8 Aug 2026". <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->

**Where a reading comes from (ADR 0038).** Off the source file's own embedded
metadata, never off the import: EXIF `DateTimeOriginal` supplies `verified`
(the file's mtime never does — copying a photo rewrites it, which would claim
a *fresher* check than the evidence supports), GPS is evidence for `in-store`
rather than an assertion of it, and a PDF trailer's `/CreationDate` bounds a
`paper-menu` document's age. `tools/intake_exif.py` reports all of it, stdlib
only. It **suggests** a method and never writes one — the same card is
`in-store` at the counter and `paper-menu` on a kitchen table, and only a
human looking at the image can tell. GPS sorts loose files to a shopping
strip; it does not pin a shopfront (four Johnsonville venues fell inside one
25 m error circle), so coordinates still come from the geocoded address.

#### Details are a second reading, not the same one (ADR 0037)

`verified` dates the **menu**. `detailsVerified`/`detailsVerifiedBy` date the
**venue's details** — phone, address, opening hours — because they are
separately true and rot separately: a card photographed at the counter dates
the prices on it, and the hours printed alongside may be a year old. Same
shape, same closed method set, same full-date precision.

Absent means those were never checked as a distinct act — the honest majority
case, and the menu screen then declines to mention them at all rather than
letting the menu's date cover them.

#### Details belong to a branch, not to a chain

The pair is valid on a **branch** as well as the venue, and the branch wins —
the same default-and-override shape as `timezone`, not the
must-not-be-both rule that governs address / phone / hours. A venue-level value
is the default for branches that omit it, so every existing record is unchanged.

Because a chain's branches are not checked from one source. Pandan's Melling
address, phone and hours are all from Pandan's own site; Press Hall's hours are
its *landlord's* statement about its own building. One venue-level field must
read as weakly as its weakest input, which throws away the truth about the
stronger branch — Melling read as `third-party` for the sake of a fact about a
different address. The pair is taken **whole** from one level or the other: a
branch date welded to the venue's method would describe a reading nobody did.

`temporal.js` `detailsVerification(record, branch)` resolves it and reports a
`scope` of `"branch"` or `"venue"`. The menu screen's ⓘ passes the **nearest**
branch — the same one whose hours already drive the open/closed status — and
names it when the reading is that branch's own and there is more than one branch
to tell apart: *"Phone, address and opening hours at Melling checked against the
place's own site on 15 Aug 2026."* <!-- datescan:allow: quoted on-screen copy — niceDate's reader-facing format, not a stamp -->


Ageing this field per *kind* — one decay limit for hours, another for phone and
address — is a separate owner-ruled change whose numbers do not exist yet. It is
not built.

#### The "needs a refresh" caveat — the method decides, the date ages it (ADR 0036)

`temporal.js` `refreshCaveat(record, asOf)` is the single answer to *does this
menu still need a refresh?* — pure, and the only thing `menu.js` asks. **A
reading counts as a check when it came from the shop itself** (owner's ruling,
2026-08-09), and only until it ages out:

| `verifiedBy` | Counts as a check? |
|---|---|
| `in-store` · `paper-menu` · `official-site` · `phone` | ✅ first-party — no caveat while fresh |
| `delivery-app` · `third-party` | ❌ someone else's transcription — **always** caveats |

**Age limit: `VERIFY_MAX_AGE_MONTHS = 12`** — a house default, not an owner
number, and a one-line retune in `temporal.js`. NZ hospitality reprices roughly
annually; a shorter limit would re-flag the whole corpus within two refresh
cycles and put the caveat back on everything.

Four reasons, kept distinct so the screen can say which (§9, "unknown is not
none" — one null used to stand for the first two):

| `reason` | When | What the caveat says |
|---|---|---|
| `never` | no `verified` | "Menu items and prices need a refresh" |
| `unknown-method` | `verified`, no readable `verifiedBy` | same wording — absence of a method is not evidence of a trusted one |
| `untrusted` | `delivery-app` / `third-party` | names the source: "These prices came from a delivery app, not the place itself" |
| `stale` | trusted method, older than the limit | "It's been a while since we read this menu" |

Exactly *at* the limit is still fresh; a partial `verified` widens to its
**earliest** day, so "read sometime in 2025" cannot borrow 31 December's
freshness. Recipes (Cook at Home) never caveat — they are ours, and there is no
shop to check with. The caveat copy stays English like every other caution here
(`reo.js`'s safety note).

**Both answers are shown, from one control (ADR 0037).** The ⓘ beside the venue
name is always present and only its *tone* changes: ⚠ amber for the caution
above, ⓘ blue for "menu and prices checked in store on 15 Aug 2026" — because <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
showing it only on bad news made its absence ambiguous, and "we checked" and
"no comment" are not the same fact. `--info` and `--warn` sit 1.06:1 apart in
luminance, so the **glyph and the accessible name** carry the distinction and
colour only reinforces it; `--info` is deliberately not `--ok`, which already
means "open right now". The blue note is also where the **currency** is stated
(the About dialog carries the same fact) — never appended to individual prices.

**A dish is never deleted when it leaves the menu** — it keeps its record and
gains `available.offBy` (or `to`). A hard delete destroys every date attached to
it, including that it ever existed.

#### Refreshing a menu — append, never overwrite

**This is the rule the whole time dimension depends on.** A refresh is a dated
*reading* of the menu, not a replacement of what we knew.

**Where the append lands changed with ADR 0047.** The payload keeps *one*
price entry per dish — the current one, with its `recorded` date and
derivation, because the app renders how old a price is. The superseded entry
is appended to `data/history/prices/<venue>.json` in the record store, and a
dish confirmed off the menu moves whole to `data/history/dishes/<venue>.json`
instead of staying in the payload behind an `available.offBy` marker no screen
reads. Nothing is lost and nothing is deleted; it simply stops being
downloaded. `tools/split_data.py` performs the move, and `--check` proves the
two stores still reconstruct the pre-split corpus between them — run it after
any refresh.

When you transcribe a new menu for a venue that already has one:

1. **A price that changed** → make it a series (or add an entry to the existing
   one): keep the old value, add the new with `recorded` set to the day you read
   the new menu. Do **not** replace the number.
2. **A price that didn't change** → leave it as it is. There is no history to
   record, and the venue's `verified` date already says when we last looked.
3. **A dish that has gone** → add `available.offBy` (the day you confirmed it
   was gone). Do **not** delete it.
4. **A dish that was renamed** → change the `name` and **leave `dishId` exactly
   as it is** (ADR 0051). That is the whole procedure. The id is what carries
   the price history, every shared link, and every heart and rating on a family
   phone across the rename, so an id that never moves means none of them move
   either. Treating a rename as "one dish dropped, one added" is a false claim
   about the world and silently loses all four.
   🚩 **Never "correct" a `dishId` to match a new name.** It will look tidier
   and it will detach every heart, rating and shared link pointing at that dish,
   silently, on every phone. If an id genuinely must change, record the old one
   in the dish's `formerIds` so it still resolves.
5. **Correction vs change** — if you are fixing something we recorded *wrong*
   (a typo, a price we never knew), that is **not** a price change: overwrite it
   and add no entry. Recording a correction as a series fabricates a price rise.
   The test: *did the shop change it, or did we?*
6. Bump `verified` to the day you read the menu **and set `verifiedBy` to how
   you read it** (a refresh from a delivery app is not a refresh from the
   counter, and the record has to say which). Bump `DATA_VERSION` in `sw.js`.

Done this way every refresh adds a free, honest reading to the corpus. Done the
old way it destroys one — which is exactly what happened to Takeaway @ Churton's
2019 prices, recoverable only because git held them (ADR 0023).

**Resolution — why the UI never changed.** `site/js/temporal.js` is a pure
resolver; `data.js` runs `resolveRecord()` on every record as it loads, so the
rest of the app receives the same shape it always did: `item.price` is a number,
out-of-season and retired dishes are already gone, `picks` never dangles. Only
two things are added to the resolved record — `closure` (the folded lifecycle)
and, where real history exists, `priceSeries`/`priceNext` for the future trend
view. Time lives in the data and in that one module.

The single exception where time reaches the screen is a **closure**
(`closure-ui.js`): a badge on the card, a banner on the menu header, and
`ranking.js` treats a closed venue as unavailable whatever its posted hours
say. A stale price costs a dollar; a closed venue costs a wasted trip.

#### What we still owe a dish — `needs` (ADR 0041)

A dish may carry `needs`, a list of `{what, note?, since?}` naming the facts we
know are missing. It does two jobs at once.

**It splits a meaning `price: null` was carrying twice.** A null price meant
both "the shop prices this on application" (market fish) *and* "we tried to read
it and couldn't" — indistinguishable to a reader and to the next transcriber.
With a `needs: price` entry the menu screen shows **`?`**; without one it keeps
the **`—`** that has always meant *ask*. Same absence, two different admissions.

**It is the worklist.** These gaps used to be typed into `ROADMAP.md` by hand,
which goes stale the moment someone brings a fact back — the trap the stub count
fell into three times. `python3 tools/needs.py` derives the list from the data
instead (`--what`, `--venue`, `--count`, `--json`), so the roadmap points at a
command rather than naming dishes it cannot keep up with.

`what` is a closed set — `price` · `ingredients` · `allergens` · `name` ·
`availability` — written down in three places (`site/js/needs.js` holds the
labels and the *fix* text, `tools/validate.py` decides what is legal,
`tools/needs.py` reports). `test_validate.py` fails if the three drift: a kind
the renderer doesn't know is dropped silently, so the data would claim a gap no
reader ever sees. `since` is record time (the day we noticed), never world time
— nothing happened out there. A dish that has both a price and a `needs: price`
is an **error**, not a warning: the indicator would not render, so the stale
claim would sit in the data invisibly while `needs.py` kept reporting a job
already done.

Rendering (`needsRow` in `menu.js`): one small `?` pill per gap, sitting between
the description and the tag row, opening the same disclosure control the venue
header uses. Deliberately **not** in the tag row — two of those chips are
allergen warnings, and a record-keeping note among them would dilute exactly the
chips that must not be diluted. It never borrows the `⚠` glyph for the same
reason. English only, like the refresh caveat, per `reo.js`'s safety boundary.

### Tag vocabulary (closed set — extend here, not ad hoc)

- Dietary: `v` (vegetarian), `vg` (vegan), `gf`, `df`
- Allergens (warnings, rendered prominently): `contains-nuts`,
  `contains-peanuts`, `contains-shellfish`, `contains-egg`,
  `contains-dairy`, `contains-gluten`, `contains-soy`, `contains-sesame`
- Heat: `spicy-1` … `spicy-3`
- Options: `gf-option`, `v-option`

Unknown is distinct from safe: **no tag means "not stated"**, and the
UI must never present absence of an allergen tag as "allergen-free".

### Add-ons — what the menu offers on top of a dish (ADR 0048)

A venue defines its priced extras once, in `addOnGroups`, and a section
(`section.addOns`) or a dish (`item.addOns`) names the ids that apply. A
dish gets its section's groups first, then its own; a group named by both
is offered once. So "brunch sides" attaches to eight brunch dishes
without being written eight times, and a sauce board spanning every
section is written once.

- `id` is kebab-case and unique within the record. `name` is whatever the
  venue calls the group ("Our delicious sauces"), not a slug.
- `select` is `"one"` or `"many"`. `max` caps a pick-many group ("choose
  up to 3"); it is a rule the venue set, so it lives in the data rather
  than the UI, and it may not exceed the number of options.
- **A price must be resolvable** — the option's `price`, or its group's as
  a default. Absent at both levels is an **error**, not a zero: a
  forgotten price would otherwise become a silently free add-on and an
  under-stated total. **Free is written as `0`.**
- **An add-on price is never `null`.** A dish price uses `null` for two
  different unknowns — "priced on application" (`—`) and "we failed to
  read it" (`?`, with a `needs` entry). Nothing on the add-on screen tells
  those apart, so an extra whose price we do not know stays in the prose
  and is not structured yet.
- `tags` is **required** on every option, against the same closed
  vocabulary as a dish. It may be empty, which says "not stated" — a
  state composition treats differently from a stated clash.

Safety composes in `site/js/addons.js`: allergens **union** (present on
any part ⇒ present on the whole) and dietary claims **intersect** (the
whole is vegan only if every part is). Composition can therefore only add
a `contains-*` or remove a `gf`/`df`/`v`/`vg` — it can never invent a
safety claim. Its `CONTRADICTS` table is `CONTRADICTED_BY` in
`tools/tag_allergens.py` inverted, and `validate.py` errors if the two
ever stop agreeing.

Add-on prices never feed the venue's price band (`site/js/price.js` reads
dish prices only), and a group no section or dish names is a **warning**:
precached payload nothing on any screen can reach (ADR 0047).

### Rules

- `site/data/index.json` is the display order (an array of ids).
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
  from this in the **venue's own timezone** (not the viewer's clock) — its
  `timezone`, or the branch's, or `Pacific/Auckland` if neither says
  (ADR 0043) — and a
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
  household rating** — our own static integer `1..5` (validated; a bool/float/
  out-of-range is rejected). Absent = not rated; the field ships **dormant**
  (no data yet — owner supplies real values). It renders where picks render (a
  "Our rating ★★★★☆" pill) and on the venue header, styled distinctly from the
  device-local **personal ratings** (`site/js/ratings.js`, per-profile
  `localStorage`) so ours-verified never reads as the viewer's-own-unverified.
  **Public / crowd ratings stay rejected** (backend + moderation + accounts
  break three non-goals — ADR 0013); the online Google-rating edge function is
  a separate, owner-gated item (ROADMAP Theme 5).
- `lat`/`lng` are optional decimal degrees (WGS84), set together or not
  at all. When present, the menu screen's address row hands off to the
  device's native maps app at those exact coordinates (`site/js/geo.js`);
  when absent it falls back to an address search. They also seed the
  distance-sorted "what's close" list and the **"Along a route" least-detour
  sort** (`site/js/route.js`, ADR 0014): rank venues by added distance
  `dist(o,v)+dist(v,d)−dist(o,d)` toward a picked destination (a suburb centroid
  or another venue — no geocoder, no stored address), best-branch resolved,
  detour-leads-availability; a per-card "Route via maps" hands origin→venue→dest
  to the maps app (Google waypoint; Apple → venue). Roadmap Theme 2. Geocode from the
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
  contradict the distance shown). The menu screen shows **one branch expanded —
  the nearest that is open — up to four more as one-tap collapsed rows, and any
  remainder behind "Show all N"** (ADR 0054, `locations.leadBranch` /
  `branchCard`), each with its own directions link, phone and hours. Openness is
  three-state (`open`/`closed`/`unknown`): a branch with no `hours` is never
  given a status chip, and never ranks below one known to be shut. The viewer's
  branch distance limit (`favBoostKm`) filters both lists, the lead always
  survives it, and whatever it hid is counted on the card. A one-branch array
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
ranking dials; reo language). **Shared/device:** the order tally (one order
for the table) and
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
- **Ratings** (`faves.ratings.v1`): `ratings.js` — the viewer's own 1–5 marks
  on venues + dishes, a flat `{ key: 1..5 }` map keyed like favourites,
  clamped/sanitised on read. `ratings-ui.js` is the keyboard-operable ★★★☆☆
  slider control (tap/drag/arrows; personal, `--personal` violet) plus the
  static curated "Our rating"
  badge (`--accent`); rendered on the menu header + dish rows. Per-profile (a
  rating is personal); no averaging, no sharing, no public ratings (ADR 0013).
- **Settings** (`faves.settings.v1`): `settings.js` — dietary/allergen prefs
  (`diet`), the two ranking distances (`favBoostKm`, `farKm`), the reo
  language, the maps app, and `units` (metric | imperial), clamped/sanitised on
  read so a bad value can't break the sort. `units` is a **display** choice
  only: `units.js` converts km→miles and °C→°F at render, the stored dials stay
  kilometres and the recipe data stays °C, so nothing stored drifts (ADR 0029);
  `settings-ui.js` is the ⚙ dialog — an index of topic rows drilling into
  single-topic panels, each row subtitled with its current value, plus the
  profile switcher (ADR 0025). A new topic is one `TOPICS` entry + its panel.
- **Profiles** (`faves.profiles.v1`): `profiles.js` — the registry + the
  profile-scoped storage wrapper the two stores above read through. See the
  profiles paragraph and ADR 0012.

- **Export / import / transfer** (no key of its own): `personal-data.js` —
  `collectPersonalData` gathers the whole layer above into one versioned,
  serialisable object, reading the *device* storage directly so it sees
  **every** profile, not just the active one. Settings → "Your data" writes it
  out as a dated JSON file (`Blob` + `<a download>`). The Near-me origin is
  excluded by name, and the excluded keys also seed the skip-set of the sweep
  that catches unknown `faves.*` stores — otherwise the sweep would re-collect
  it. This is the same collect seam ADR 0017's sync blob and Theme 10's share
  grant reuse.
  The way back in is `parsePersonalData` → `planImport` → `applyPersonalData`
  (ADR 0030): merge by default, replace behind a confirm, and two things it
  refuses to guess — whether an incoming profile is an existing person (id
  alone is not proof: every device's first profile is `default`) and how a
  differing set of allergen/dietary prefs resolves. The plan returns those as
  `blocking` questions and apply errors rather than proceeding. **Both doors
  use it**: a file, and a `#xfer=` transfer link (Theme 9 v1) whose decoded
  parts `envelopeFromTransfer` wraps into the same envelope. `personal-io-ui.js`
  is the thin half — the file picker, the shared review, and the receive
  dialog wired on all three screens; `share-codec.js` gained
  `encodeTransfer`/`decodeTransfer` under their own tag and fragment parameter
  so a transfer can never be read as a group-order shortlist.

- **Cross-device merge** (no key of its own): `sync-merge.js` — the client half
  of Theme 9 v2 (ADR 0017), specified by **ADR 0060**. Pure and storage-free:
  `mergePersonal(base, mine, theirs)` over three `collectPersonalData()`
  snapshots, where `base` is the state at the last successful sync. It is **not**
  `applyPersonalData`: that path is additive on purpose (a watched, one-shot
  import), and applied continually the additive rules make un-hearting
  impossible. Keeping `base` is what tells a *deletion* from an
  *addition* — no timestamps, no tombstones, no stored-shape change. Every
  tie-break is a function of the values alone, **including the array order**,
  because both devices run the same merge and anything asymmetric never settles.
  Diet conflicts block and carry a union provisional so a pending question never
  leaves a device un-warned; the order tally and which-profile-is-active are
  deliberately not synced. **Nothing imports it yet** — the Worker and KV store
  are unbuilt and are the owner's go.

- **Sync's encryption and its code** (no key of their own): `sync-crypto.js` +
  `sync-code.js`, specified by **ADR 0061**. The sync code is a 65-bit
  Crockford-base32 bearer secret with a mod-29 check symbol, minted from
  `crypto.getRandomValues`. It is used directly as neither name nor key:
  HKDF-SHA-256 under two different labels derives a 128-bit `blobId` (which the
  server is told) and a non-extractable AES-GCM key (which never leaves the
  device), so the two are independent. Blob wire shape is
  `[version][12-byte IV][ciphertext‖tag]`, fresh IV per seal; `openBlob` returns
  `null` rather than throwing for a wrong key, altered bytes or a truncated
  read. **Nothing imports either yet.**
- **`worker/`** — the Cloudflare Worker + KV blob store (ADR 0017, authorised by
  the owner 2026-08-16). Outside `site/`, so it is not shipped, not precached and
  not covered by the zero-dependency rule, which governs the served artefact. It
  is a dumb ciphertext store: `GET`/`PUT /v1/blob/<blobId>`, strict id
  validation, a 256 KiB streamed body cap, a 180-day TTL refreshed on write,
  `If-Match` compare-and-swap, an origin allowlist, and no logging of anything.
  🚩 **Built, tested and NOT deployed** — this machine has no `wrangler` and no
  Cloudflare credential; `worker/README.md` holds the steps and the
  least-privilege token scope.

A `storage` event keeps other tabs in step (favourites/settings keys are now
namespaced by the active profile; a registry change re-points them). Recipes
(Cook at Home) can be
*favourited* but carry no order stepper — that collection is for cooking,
not an order to read down the phone. This layer is the reusable seam for
later local-only features and the bridge to the health app (roadmap Themes 5–6).

## Service worker strategy

- **Precache** on install, split into two independently-versioned caches
  (ADR 0015): a **shell cache** (`SHELL_VERSION` → both HTML shells, CSS,
  JS, `site.webmanifest`, icons) and a **data cache** (`DATA_VERSION` →
  `index.json` + every restaurant JSON). Bumping one constant rebuilds
  only that cache on the next install; the other survives untouched, so a
  data-only menu edit no longer re-downloads the whole shell. `index.json`
  is **data** (it lists which restaurants exist); `site.webmanifest` is
  shell; there is no separate "config" cache (see ADR 0015). Install skips
  an already-complete cache and uses a `__cache_ready__` sentinel so an
  interrupted install rebuilds rather than serving a half-filled cache.
- **Network-first with cache fallback** for data (so menu edits appear
  promptly), **cache-first** for shell assets. Any byte change to `sw.js`
  triggers the browser's SW update cycle; the version constants then
  decide which cache(s) rebuild. **Lockstep:** data-only change under
  `site/data/` → bump `DATA_VERSION`; any other `site/` change → bump
  `SHELL_VERSION`; both → both.
- Photos: cache-on-demand with a size-capped runtime cache
  (`faves-img-v1`, version-free so it survives every bump).
- **Update flow** (ADR 0027): `sw-register.js` calls `registration.update()`
  when the page becomes visible or regains focus, throttled to once every
  five minutes — a resumed standalone PWA performs no navigation, so nothing
  else would ever check. A new worker **holds in `waiting`**; a notice
  offers it, and the tap posts `{type:"SKIP_WAITING"}` and reloads on
  `controllerchange`. No unconditional `skipWaiting()`: that served new
  assets to a page still running old modules. Ignore the notice and the
  worker activates on the next cold start. Settings → Your data → **Refresh
  menus and app** is the escape hatch: clears the shell + data caches,
  unregisters the worker, reloads — refuses when offline, never touches
  `localStorage`.

## Constraints

- No external requests at runtime: no CDNs, no web fonts (system font
  stack), no analytics in v1. Everything self-contained → fast, private,
  offline-safe.
- JavaScript is enhancement-heavy but the shells must still render a
  usable restaurant list if a module fails: fail soft, show data.
