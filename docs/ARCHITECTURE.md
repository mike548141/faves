# Architecture

## Shape

A **zero-build, static, installable web app (PWA)**. The `site/`
directory is the complete deployable artifact: hand-written HTML, one
CSS design system, vanilla ES-module JavaScript, and JSON data files.

```
site/
  index.html            app shell (list, filters, picker)
  restaurant.html       menu view (?id=<restaurant-id>)
  css/app.css           design tokens + components (single file)
  js/                   ES modules (data.js, filters.js, picker.js, menu.js, sw-register.js)
  data/index.json       ordered list of restaurant ids
  data/restaurants/     <id>.json — one file per restaurant, menu included
  img/                  icons, photos (lazy-loaded)
  manifest.webmanifest  PWA manifest
  sw.js                 service worker (precache shell + data)
```

## Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Framework | **None** (vanilla) | 7–20 restaurants is trivially small. No toolchain exists on the dev machine (no Node/brew) and none is wanted: nothing to install, nothing to rot, instant onboarding for any future editor (human or AI). Performance ceiling is higher than any framework. |
| Build step | **None** | `site/` is what ships. Removes a whole class of failure. |
| Data | **JSON, one file per restaurant** | Adding a restaurant = add one file + one id in `index.json`. Git is the CMS: history, review, rollback for free. |
| Offline | **Service worker precache** | Menus are small text; precache everything. Whole app works in flight mode / dodgy reception outside the takeaway. |
| Hosting | **Cloudflare Pages** from the private GitHub repo | Free static hosting off a private repo (GitHub Pages would need a paid plan for that), global CDN, and it slots into the existing Cloudflare estate. Custom domain later via Cloudflare DNS. |
| Rendering | **Client-side from JSON** | Two tiny HTML shells + fetch. Precached data makes it instant; no SSG needed at this scale. |
| Repo | Private; site public | Curation and picks are ours; the URL is shareable with guests. |

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
  "phone": "+64 4 ...",              // tel: link for ordering
  "website": null,                   // or URL
  "services": ["dine-in", "takeaway"],
  "hours": null,                     // optional: [{"days":"Mon–Fri","open":"11:30","close":"21:00"}]
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
          "tags": ["spicy-1"]        // see tag vocabulary
        }
      ]
    }
  ]
}
```

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
