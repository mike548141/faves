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

- [ ] For each restaurant: confirm exact name, address, phone, website,
      services, hours (official site, Facebook, or a phone call — note
      the source in the commit message).
- [ ] Capture full menus with prices into the JSON schema
      (`docs/ARCHITECTURE.md`). Sources: restaurant websites, online
      ordering pages, or photos of paper menus supplied by the owner
      of this repo (ask for them — takeaway paper menus are often the
      only source of truth).
- [ ] Tag dishes: dietary, allergens (nuts/peanuts especially), heat.
      Only tag what the menu states or the restaurant confirms —
      remember "no tag = not stated", never guess allergens.
- [ ] Fill `picks` for each restaurant (ask the repo owner).
- [ ] Set `verified` date and `status` (`menu-complete` → `verified`).

**Accept when**: all 7 files validate against the schema; at least 5 of
7 reach `menu-complete`; no invented data (anything unconfirmed stays
null).

## Phase 2 — App shell and home screen

- [ ] `site/index.html` + `css/app.css`: design tokens (colour both
      schemes, type scale, spacing), restaurant cards from
      `data/index.json`, stub cards render "menu coming soon".
- [ ] Sticky bottom filter bar: service (takeaway/dine-in/all), area,
      cuisine — instant, combinable, result count announced.
- [ ] Fail-soft: if JS fails, a basic list of restaurants still shows.

**Accept when**: on a 390 px viewport it looks intentional and polished
(judge it against DESIGN.md's mood), filters work with keyboard and
touch, Lighthouse a11y = 100.

## Phase 3 — Menu screen

- [ ] `site/restaurant.html?id=…`: header with call/website/hours,
      sticky section nav tracking scroll, dish rows with price + tags.
- [ ] Allergen tags render as prominent warnings (text + icon).
- [ ] "Our picks" block up top; menu search; dietary chips that dim
      rather than hide.
- [ ] Deep-linkable: every restaurant has a stable shareable URL.

**Accept when**: a first-timer can pick a dish from KK Malaysian
unaided on a phone; a regular can find a known dish in < 5 s via search.

## Phase 4 — "Pick for us" (the party trick)

- [ ] Shuffle animation over the *filtered* set → lands on one card →
      "again" / "that's the one" (links to menu).
- [ ] Feels playful, < 3 s, respects reduced-motion (instant result).

**Accept when**: it makes someone smile in a hallway test.

## Phase 5 — PWA and offline

- [ ] `manifest.webmanifest` (icons 192/512 + maskable, theme colours
      both schemes, standalone).
- [ ] `sw.js` per ARCHITECTURE.md: precache shell + all data;
      network-first data, cache-first shell; versioned cache.
- [ ] Document the "bump `VERSION` when editing data" rule in README.

**Accept when**: installable on iOS Safari and Android Chrome; in
flight mode after one visit, every menu opens.

## Phase 6 — Polish and quality gate

- [ ] Lighthouse mobile: Perf ≥ 95, A11y 100, BP 100, SEO ≥ 95.
- [ ] First-visit transfer < 300 KB; test on a real phone and tablet,
      both colour schemes, portrait + landscape.
- [ ] OG/meta tags so the link unfurls nicely in Messages/WhatsApp.
- [ ] Cross-check every `picks` entry matches a menu item; add a tiny
      `python3` validation script (`tools/validate.py`, stdlib only) and
      run it in the pre-commit checklist.

**Accept when**: all numbers green and the owner has smoke-tested on
his devices.

## Phase 7 — Deploy

- [ ] Cloudflare Pages project connected to this private repo; build
      command none, output dir `site/`.
- [ ] Custom domain on existing Cloudflare DNS (owner to choose the
      hostname); HTTPS enforced.
- [ ] README updated with the live URL and the edit-→-deploy flow.

**Accept when**: a guest with nothing but the URL can browse menus on
their phone.

## Later (parked, not planned)

More restaurants; photos of signature dishes; "open now" from hours
data; per-person shortlists ("Booth's usuals" — names stay out of the
repo, so this needs local-only storage); shareable group shortlist
links; te reo Māori UI toggle.
