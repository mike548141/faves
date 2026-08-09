# Work plan

Phased so every phase ends with something demonstrable on a phone.
Work top to bottom; don't start a phase until the previous one meets
its acceptance criteria. Update restaurant `status` fields and this
file's checkboxes as you go.

## Phase 0 — Foundation ✅ (done)

Repo, strategy, architecture, design direction, data schema, restaurant
stubs.

## Phase 1 — Data: verify facts and capture menus

The stubs in `site/data/restaurants/` contain only what we knew at
creation; details marked `null`/`stub` are unverified.

- [x] For each restaurant: confirm exact name, address, phone, website,
      services, hours (official site, Facebook, or a phone call — note
      the source in the commit message). *Done via web research
      2026-07-06; a handful of fields still need owner confirmation —
      see "Owner to confirm" below.*
- [~] Capture full menus with prices into the JSON schema
      (`docs/ARCHITECTURE.md`). Sources: restaurant websites, online
      ordering pages, or photos of paper menus supplied by the owner
      of this repo (ask for them — takeaway paper menus are often the
      only source of truth). *5 of 7 captured online. Takeaway @
      Churton and Spices Indian have no reliable online menu — need
      owner photos.*
- [x] Tag dishes: dietary, allergens (nuts/peanuts especially), heat.
      **Superseded 2026-08-09 by [ADR 0025](decisions/0025-infer-allergens-by-default.md)**:
      this said "only tag what the menu states … never guess allergens".
      The owner ruled the opposite — where a menu-writer hasn't stated an
      allergen and we can be highly confident, **infer it**. A dish with
      satay contains peanuts whether or not the menu says so. The rule
      that survives: inference may only ever ADD a `contains-*` tag,
      never `gf`/`df`/`v`/`vg` — inferring presence is fail-safe,
      inferring absence would assert safety from a guess. "No tag = not
      stated" still holds. Run `tools/tag_allergens.py` after any menu
      transcription; `validate.py` warns if it's owed.
- [ ] Fill `picks` for each restaurant (ask the repo owner).
- [~] Set `verified` date and `status` (`menu-complete` → `verified`).
      *5 set to `menu-complete` (verified 2026-07-06); 2 remain `stub`
      pending menus. None promoted to `verified` — that needs owner
      sign-off on prices + picks.*

**Owner to confirm (2026-07-06):** menu photos for Takeaway @ Churton &
Spices Indian. Picks: KK Malaysian & R & S done; Spices held until its
menu lands (Mild Chicken Korma, Garlic Naan); still need KC Cafe,
Sprig + Fern, KTC. Prices: KK Malaysian, KC
Cafe and R & S prices are delivery/online-ordering (KK & KC marked up)
— prefer in-store; hours conflicts (KK, KC, KTC, Takeaway); dine-in at
R & S and food-takeaway at Sprig + Fern; third-party phone numbers.
Name corrected: "Spring & Fern" → **Sprig + Fern**. Menu capture
verified via `tools/validate.py`.

**Accept when**: all 7 files validate against the schema; at least 5 of
7 reach `menu-complete`; no invented data (anything unconfirmed stays
null).

## Phase 2 — App shell and home screen

- [x] `site/index.html` + `css/app.css`: design tokens (colour both
      schemes, type scale, spacing), restaurant cards from
      `site/data/index.json`, stub cards render "menu coming soon".
- [x] Sticky bottom filter bar: service (takeaway/dine-in/all), area,
      cuisine — instant, combinable, result count announced.
- [x] Fail-soft: if JS fails, a basic list of restaurants still shows.
      *(Built alongside Phase 3; render-verified in real Chrome. The
      Lighthouse a11y = 100 acceptance check runs in Phase 6.)*

**Accept when**: on a 390 px viewport it looks intentional and polished
(judge it against DESIGN.md's mood), filters work with keyboard and
touch, Lighthouse a11y = 100.

## Phase 3 — Menu screen

- [x] `site/restaurant.html?id=…`: header with call/website/hours,
      sticky section nav tracking scroll, dish rows with price + tags.
- [x] Allergen tags render as prominent warnings (text + icon).
- [x] "Our picks" block up top; menu search; dietary chips that dim
      rather than hide.
- [x] Deep-linkable: every restaurant has a stable shareable URL.
      *Stub ids degrade to a "full menu coming soon" note.*

**Accept when**: a first-timer can pick a dish from KK Malaysian
unaided on a phone; a regular can find a known dish in < 5 s via search.
*Built and render-verified in real Chrome 2026-07-06 (picks, peanut
warnings, section nav, dietary chips). Owner to confirm search/scroll
feel on a phone.*

## Phase 4 — "Pick for us" (the party trick)

- [x] Shuffle animation over the *filtered* set → lands on one card →
      "again" / "that's the one" (links to menu).
- [x] Feels playful, < 3 s, respects reduced-motion (instant result).

**Accept when**: it makes someone smile in a hallway test.
*Built 2026-07-08: 🎲 "Pick for us" button above the filter bar opens a
dialog; names flick past easing out over ~1.8 s, land with a 🎉, then
"That's the one" (deep link) / "Go again". Empty filter set gets a 🤷
and a nudge to widen. Reduced motion = instant result. Owner to
hallway-test.*

## Phase 5 — PWA and offline

- [x] `site.webmanifest` (icons 192/512 + maskable, theme colours,
      standalone) — shipped earlier with the icon set.
- [x] `sw.js` per ARCHITECTURE.md: precache shell + all data;
      network-first data, cache-first shell (`ignoreSearch` so one
      cached `restaurant.html` answers every `?id=` deep link);
      versioned cache + capped runtime image cache.
- [x] Document the "bump `VERSION` when editing data" rule in README.

**Accept when**: installable on iOS Safari and Android Chrome; in
flight mode after one visit, every menu opens.
*Built 2026-07-08. Verified via the dev-server log: registration
triggers the install precache, which fetched the full shell and all 13
data files. **Owner installed on iPhone 2026-07-12** — saves to the
home screen and functions normally. Still pending: Android install,
flight-mode test.*

## Phase 6 — Polish and quality gate

- [x] Lighthouse mobile: Perf ≥ 95, A11y 100, BP 100, SEO ≥ 95.
      *Run 2026-07-08 via `npx lighthouse` (Node now on the machine)
      against the dev server, mobile emulation. Home: Perf 97 / A11y 100
      / BP 100 / SEO 100. Menu (kk-malaysian): Perf 100 / A11y 100 /
      BP 100 / SEO 100. One contrast fail (dark-mode "Call to order"
      label) fixed → A11y 100. Scores are a floor: localhost has no
      Brotli/HTTP-2, so the CDN will only do better. Re-confirm on the
      live URL post-deploy.*
- [~] First-visit transfer < 300 KB; test on a real phone and tablet,
      both colour schemes, portrait + landscape.
      *Measured 2026-07-08: shell + all menu data = 176.9 KB raw,
      45.3 KB gzipped — well under budget. Real-device pass = owner:
      iPhone general pass 2026-07-12 (site launched, link shared with
      family); detailed checks (both schemes, orientations, tablet)
      pending.*
- [x] OG/meta tags so the link unfurls nicely in Messages/WhatsApp.
      *og:/twitter: tags on both shells, canonical on the home page,
      1200×630 `icons/og-image.png` (padded from the app icon with
      `sips`). URLs baked for `lets-eat.myspot.nz`.*
- [x] Cross-check every `picks` entry matches a menu item; add a tiny
      `python3` validation script (`tools/validate.py`, stdlib only) and
      run it in the pre-commit checklist.
      *`tools/validate.py` already errors on any pick that doesn't match
      a menu item name exactly — shipped with the batch-3 menu work.*

**Accept when**: all numbers green and the owner has smoke-tested on
his devices.

## Phase 7 — Deploy

- [x] Pick the host per ARCHITECTURE.md "Hosting options". *Cloudflare
      Pages at `lets-eat.myspot.nz`, owner-confirmed 2026-07-10 (also
      recorded in ARCHITECTURE 2026-07-07). Hosting is config-as-code:
      `tools/deploy.json` + `tools/deploy.py` (stdlib, reconciles the CF
      API idempotently); runbook in `docs/DEPLOY.md`.*
- [x] Cloudflare Pages path: project connected to this private repo;
      build command none, output dir `site/`. *Live at
      `lets-eat.myspot.nz` (200, real site — verified 2026-07-12).
      Owner ran the one-time CF GitHub App authorise + scoped token +
      `deploy.py apply`; every push to `main` now deploys.*
- [ ] S3 path (only if chosen): N/A — Cloudflare Pages chosen.
- [x] Custom domain on existing Cloudflare DNS; HTTPS enforced.
      *`lets-eat.myspot.nz` serving over HTTPS (verified 2026-07-12).*
- [x] README updated with the live URL and the edit-→-deploy flow.
      *README "Deploy" section + `docs/DEPLOY.md`.*

**Done (2026-07-12):** owner authorised the Cloudflare GitHub App,
created a scoped API token, and ran `python3 tools/deploy.py apply`.
Every push to `main` now deploys. See `docs/DEPLOY.md` for the flow.

**Accept when**: a guest with nothing but the URL can browse menus on
their phone. ✅ Met — `lets-eat.myspot.nz` live and serving.

## Addendum — 2026-07-06 (batch 2)

Five venues added as stubs (facts web-researched, sources in agent
notes; menus still to capture): **Charley Noble Eatery & Bar** (Te Aro;
note the owner's list said "Charlie"), **Wellington Kebab Grill**
(Johnsonville), **Marigold Takeaway** (Johnsonville — Thai/Vietnamese,
*not* Indian; confirm it's the intended place), **Simmer** (Churton
Park), **Thai Tara Express** (Johnsonville).

**Cook at Home** shipped as the first `kind: "recipes"` record
(`cook-at-home.json`) — first-class recipes with ingredients + method,
rendered and browser-verified. Decision recorded in ARCHITECTURE.md.
The two recipes in it are generic placeholders to prove the UI; replace
them from the Apple Notes export.

Next: owner drops menu scans/board photos and Notes recipes into
`intake/` → transcribe into the schema. See `intake/README.md`.

## Addendum — 2026-07-06 (batch 3): menus in, all flagged for refresh

Menus transcribed from `intake/` scans (prices from paper menus, not
delivery apps). Every venue's `verified` is now `null`, which the menu
screen renders as a "menu items and prices need a refresh" caveat.
**All need a fresh in-store check of items + pricing before promoting to
`verified`:**

- **KC Cafe** — only scan is 2015; kept its current online menu. Needs a
  fresh board photo.
- **R & S Satay Noodle House** — board photo has no prices; kept the
  existing priced menu. Confirm items + prices.
- **Takeaway @ Churton** — scan is 2019; prices likely risen.
- **Spices Indian** — scan 2023; re-check prices.
- **Thai Tara Express** — undated PDF; confirm current.
- **KK Malaysian, Khandallah Trading Co, Sprig + Fern Tawa** — captured
  online 2026; confirm against in-store.
- **Charley Noble, Wellington Kebab Grill, Marigold, Simmer** — still
  stubs; need menus (owner photos).

Dev/testing: `python3 tools/serve.py` serves `site/` to the laptop and a
phone on the same Wi-Fi (prints both URLs).

## Later (parked, not planned)

Post-launch direction now lives in **`docs/ROADMAP.md`** — the order
tally (Job 3), location & maps, the design pass, content growth, richer
dish data, and the health-app north star, sequenced and checked against
the hard constraints. The small parked ideas (more restaurants, dish
photos, "open now", per-person shortlists → local-only, shareable
shortlist links, te reo Māori toggle) are folded in there.
