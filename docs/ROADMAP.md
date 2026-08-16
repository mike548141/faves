# Roadmap (post-launch / vNext)

The current work plan (Phases 0–7 in `WORKPLAN.md`) takes us to a
launched, installable, offline menu browser. This is what comes **after**
— the owner's roadmap brain-dump, grouped into themes, sequenced, and
checked against the hard constraints (zero-build, offline, static, no
backend, no accounts, no personal data in the repo). Nothing here changes
v1 scope.

**Legend.** Effort **XS/S/M/L**. Checkbox: `- [ ]` open · `- [x]` / ✅ done,
harvested to [`ROADMAP-DONE.md`](ROADMAP-DONE.md) leaving a one-line pointer ·
`- [~]` **part-done or claimed**, and the two are told apart by what the item
says, not by the marker. A **claim** names a date and a worktree
(`CLAIMED YYYY-MM-DD HH:MM UTC (wt: …)`) — leave that item alone, even if told
to take it. Everything else marked `[~]` is simply partly delivered, with the
remaining parts named inline; that one is free to pick up.
Tags: `[schema]` needs a data-model change (record in `ARCHITECTURE.md` when
built); `[design]` needs a design call; `[constraint]` sits in tension with a
hard constraint or non-goal — resolution noted inline; `[content]`/`[data]`
needs facts we don't have yet, usually from the owner or an in-store visit;
`[docs]`, `[js]`, `[css]`, `[reo]`, `[ux]` name the surface that changes.
Marks: **⚑** a decision only the owner can make · **🎯** the specific ask now
sitting with the owner · **🚩** be aware of this · **🔎** a finding ·
**⏳** waiting on someone.

**On "no backend" (owner steer, 2026-07-09; updated 2026-07-23).** The
stance softened from *never* to *not yet*: a lightweight backend (e.g. a
Cloudflare Worker) is an acceptable **future** direction — live
group-order rooms, feedback intake — but adopting one is a deliberate
step that needs its own ADR first ([ADR 0009] records the steer).
**Now gated open for sync:** [ADR 0017] adopts a Cloudflare Worker + KV
for cross-device sync and formally softens the non-goal — a *serverless
backend is permitted*; *accounts are deliberately not adopted* (a bearer
sync-code carries it); off-device data *must* be end-to-end encrypted.
Other backend-gated items (live rooms, feedback intake, the Google-rating
edge proxy) revisit against that precedent — each still its own ADR.

---

## Theme 1 — From *decided* to *ordered*: the Order tally ★ flagship

> ✅ **Shipped 2026-07-08** — the Order tally (Job 3): a local, offline
> `cart.js` model, venue-grouped order sheet, subtotals + estimated total,
> collect mode. Design record + v1 deferrals → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

## Theme 1b — Group ordering: send your picks to the orderer

> ✅ **Shipped 2026-07-10, fully closed** — group ordering on a versioned
> URL-fragment codec (send / copy / **QR fallback** + receive-with-confirm
> merge), reused for shareable shortlists. Only acceptance left: a real
> phone-camera scan (owner). Record + ADR 0009 → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

## Theme 2 — Location & maps

✅ **Shipped 2026-07-08** — availability + favourite ranking (`ranking.js`) and
its tunable distance dials; schema coordinates, native-maps handoff (ADR 0005),
and the "📍 Near me" distance-sorted list. A real tile-map view was ruled out on
the offline/no-CDN constraint. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

**Now all shipped** — three route/reachability items landed 2026-07-22/23;
verbatim design records → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- ✅ **Pick along a route** `[L][constraint]` — **shipped 2026-07-23** (ADR
  0014): offline least-detour sort (`site/js/route.js`) + routed maps handoff
  (`geo.routeMapsUrlFor`); suburb-centroid or specific-place destination, no
  geocoder, no stored address. Live routed corridor stays ✗ (keyed/paid API).
  Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **Drive time from me to a venue** `[M]` — **shipped 2026-07-22** (ADR
  0010): driving-directions maps handoff + a "~N min drive" haversine hint on
  Near-me cards. Live in-app routed time stays ✗. Detail →
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **Restaurants with multiple locations** `[M][schema]` — **shipped
  2026-07-22** (ADR 0011, `site/js/locations.js`): optional per-venue
  `locations[]`, nearest-branch resolution across Near-me/drive-time/open-badge/
  maps-handoff. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
  **Still open:** Kaffee Eis + Gong Cha's **second branches** — need real
  addresses + a dev-time geocode; a content session appends them, no code change.
- [~] **McDonald's — finish the flesh-out** `[M][content]` (parts (a) ✅ done
  2026-08-09 and **(b) ✅ done 2026-08-16** — all 41 dishes now carry McDonald's
  own NZ product photography, ADR 0053, provenance in `data/images/`; **c/d stay
  open**: the record still has no allergen or dietary tags and no prices) —
  added 2026-07-23 as
  a 5-branch listing with the enduring menu (items only; **prices "varies"** —
  not published per-store, so null, no fabrication). Remaining, all content (no
  code): (a) ✅ **dev-time geocode the branches** — **done 2026-08-09**
  (wt: faves-coord-audit), so it now shows in Near-me **and the contact card
  shows the 2 *nearest* branches** rather than the first two in data order.
  4 of 5 filled at house-number level; **Courtenay Place stays null** — "200
  Courtenay Place" resolves only to the road centreline and no POI exists, and
  a guessed pin is worse than none. Detail →
  [`reviews/2026-08-09-0207-coordinate-audit.md`](reviews/2026-08-09-0207-coordinate-audit.md).
  (b) **self-hosted product photos** — **owner accepted the copyright/IP
  risk on the public site, 2026-07-23** (informed decision on record); needs the
  actual image files (the official site is a JS app — assets weren't scrapeable
  this session); (c) **allergen/dietary tags** from a reliable source
  (deliberately omitted for now — "not stated" ≠ free-of, safety floor); (d)
  revisit prices if a per-store source appears.
- ✅ **Branches list scrolls with the menu** `[S]` — **shipped 2026-07-23**
  (queue-run, `0917249`): dropped `position: sticky` + `top` from
  `.menu-twocol > .menu-aside` (kept `align-self: start`), CSS-only, SHELL bumped.
  The aside now scrolls with the menu column so a long branch list (McDonald's)
  isn't cut off. Trade-off owner-accepted: the contact card also scrolls away for
  short single-location asides. ⏳ Owner to eyeball the scroll on a real phone.

- ✅ **Choose your maps app** `[S]` — **shipped 2026-07-23** (ADR 0018). The web
  can't read the OS default-maps-app, so Settings → "Maps app" lets the viewer
  pick Apple / Google / Waze / "Match my device" (default = platform detection).
  `geo.resolveMapsTarget` + a Waze provider; per-profile like other settings.

**Open:**

- [ ] **"Along a route" → free-text destination + unified search bar**
  `[L][constraint][owner-ratified 2026-07-23]` — owner: the suburb/place
  **dropdown** (ADR 0014) is too limiting; wants to **type any address/area**,
  and to **fold it into the restaurants-page search bar** (type a dish/restaurant
  → results; type a place → "on the way to there"). Free text → coordinates needs
  a **geocoder = an external request**, which relaxes the offline/zero-dependency
  invariant (ADR 0001) — the exact wall ADR 0014 cited. **Owner has ratified
  crossing it** for destination entry (online-only; rest of site stays offline).
  Chosen: **Nominatim/OSM** (no key, attribution + usage-policy compliance),
  behind graceful offline degradation. 🎯 **Owner GO 2026-07-24 — build it as a
  dedicated next session** (not folded into a queue run; it's a new external
  **trust surface**). That session's build order: (1) write the ADR — relax the
  offline/zero-dep invariant *for destination entry only* + confirm Nominatim/OSM
  as provider (attribution + usage-policy); (2) add the **CSP `connect-src`**
  allowance (and confirm the SW/offline degradation path); (3) the geocode module
  (debounced, cached, graceful-offline); (4) search-bar intent detection (dish/
  venue vs place); (5) re-wire `route.js` off the ADR-0014 dropdown. The ADR is
  written and confirmed *before* any network code lands — trust surface = the
  informed-confirmation floor still applies to wiring the actual request.
- ✅ **Travel time next to the address / hours (mode-aware)** `[M]` — **shipped
  2026-07-23** (queue-run, `7dc6a42`, **ADR 0021**). A `~` walk/drive hint under
  the pickup address on the menu screen, for the nearest branch the page already
  resolves: **walk under 2 km** (5 km/h, no road-winding padding), **drive at/
  above** (`estimateWalkMinutes` / `travelHint` in `distance.js`). Only shows
  when Near-me has captured an origin this session (`recallOrigin`); no origin →
  no hint. No routing API (offline/zero-dep wall intact). **Collect-dialog
  placement deferred** as a noted follow-on in ADR 0021. ⏳ Owner to eyeball
  on-screen placement/feel at 390 px. Owner steer 2026-07-23, raw: *"keep the
  feature idea… I want the travel time (not necessarily drive e.g. I'm 100m walk
  away) shown next to the address/opening hours or maybe in the collect window"*.

**Parked idea** (from ADR 0014 consequences): a **"surprise me on the way"**
variant of the Pick-for-us shuffle that draws from the along-route pool rather
than the Near-me pool — parked, unclaimed, `[S/M]`.

## Owner rulings — 2026-07-23 (session Q&A, raw where quoted)

- ✅ **"Nearest first" goes pure distance** — **applied 2026-07-23** (`9a4ed78`,
  wt: faves-wave8-rulings-apply). `ranking.js` origin branch now leads on raw
  distance → availability tiebreak → curated; a hearted venue keeps its ♥ badge
  but earns no distance pull, so a nearer plain venue always outranks a farther
  hearted one (regression test: hearted 10 km vs plain 2.5 km → 2.5 km wins).
  Default no-location order unchanged (a heart still floats via the favTie
  tiebreak). ⚠️ Side effect: the `favBoostKm` settings dial went inert for
  ordering — **now repurposed 2026-07-23**: it's the **branch-proximity cutoff**
  for multi-location venues (show the 2 nearest branches within this distance;
  `locations.branchesToShow`). One dial, honest new job; the "favourites count
  as this much nearer" label may want a rename to match its dual meaning `[S]`.
  ✅ **Renamed 2026-07-23** (queue-run, `e65632a`): the dial's user-facing label
  is now "Show branches within" with a hint explaining the two-nearest-branches
  cutoff; storage key `favBoostKm` deliberately unchanged (renaming it would reset
  everyone's stored setting); stale code comments in `settings.js`/`locations.js`
  corrected to match.
- ✅ **Settings on the restaurant page** `[M]` — **shipped 2026-07-23**
  (queue-run, `399604e`). The safety-reactivity wiring was the task, and it's
  done: extracted the two per-dish safety predicates into a shared, unit-tested
  `site/js/dietary.js` (`dishFlagged` + `dishSatisfiesDiet`) that BOTH the initial
  render and the live re-apply call, so they can't diverge; `menu.js`'s `reapply`
  re-renders on `settings.subscribe` (any pref change) and on a
  profile switch (reloads favourites/ratings/settings), mirroring the home page's
  proven mechanism; `settings-btn` added to restaurant.html's ⋯ (markup identical
  to home) + `initSettingsUI()` in `initChrome`. **Adversarially safety-reviewed**
  (see reviews/). ✅ **Device-confirmed 2026-08-09** — scripted, not by hand:
  `tools/device_check.mjs` drives the real Settings UI in headless Chrome on a
  throwaway `--user-data-dir` at 390 px. Flipping the Peanuts allergen lights up
  all 10 tagged dishes on R & S Satay Noodle House live; adding a profile clears
  them and swaps the hearts/ratings; switching back restores both — 15
  assertions, `navigations since load = 0` throughout. 🚩 A **real-phone
  eyeball stays the owner's option**, never a blocker: headless Chrome proves the
  wiring, not how iOS Safari paints it. Known by-design trade-off: a
  settings/profile change
  re-renders the whole menu, so an in-progress **search query + scroll position
  reset** (and the ad-hoc dietary-chip toggle). 🎯 **Owner ruling 2026-07-25 —
  queue a refinement** `[M]`: a later session preserves in-session UI state
  (search query, scroll position, dietary-chip toggle) across the safety
  re-render. **Hard constraint:** the allergen/dietary re-apply MUST keep sharing
  the first-paint code path — preserving UI state must not fork the render, or it
  reintroduces exactly this session's stale-highlight race.
  ✅ **Shipped 2026-08-09** (wt: faves-ui-state). New `site/js/ui-state.js`
  brackets the re-render instead of touching it: capture before, restore after,
  and only ever through the handlers a tap would run (set the field + fire its
  `input` event; `.click()` the chips; scroll last). `render()` is byte-for-byte
  the call it was, so the constraint holds. Chip state is kept as a *delta* from
  the pre-selection that painted the row (stamped on `.diet-chips` as
  `data-preselect`, because by capture time the settings change has already
  committed) — so a dietary *preference* change still wins while an ad-hoc
  toggle survives. Every step degrades rather than throws; a bug here can only
  cost convenience, since the safety render has already completed. **Owner
  ratified the delta rule 2026-08-09** ("the option where you can see your
  settings did something").
  🔎 Two browser findings the reasoning would have missed: `showModal()` on the
  Settings sheet scrolls the document to 0 and the re-render destroys the anchor
  the browser would have restored from — so scroll is remembered separately,
  ignoring anything that moves while a dialog is up; and the app's smooth
  `scroll-behavior` means the restore has to ask for an instant one explicitly,
  or it animates. Pure logic unit-tested (`tests/ui-state.test.js`); browser-proven
  at 390 px on a fresh `--user-data-dir` (Chrome 151 headless over CDP) —
  **23/23** behavioural checks, the same harness scoring **9/23** against the
  pre-change tree served side by side. The recipe screen was checked and
  **left alone** — its render swaps the article atomically and no recipe carries
  an image, so it never lost scroll (measured); a recipe photo would change that.
  ✅ **Owner ruling 2026-07-24 — dedicated browser-tooling session: done
  2026-08-09** (wt: faves-device-check). `node tools/device_check.mjs` is the
  scripted, re-runnable device check the ruling asked for — a local static
  server, headless Chrome on a fresh `--user-data-dir` (the only reliable way
  past a stale SW), real mouse input through the real Settings UI, exit 0/1/2.
  Zero npm: it speaks the DevTools Protocol over Node's own WebSocket, and
  nothing it needs ships in `site/`. It has teeth — with
  `settings.subscribe(reapply)` removed from `menu.js` as a negative control,
  exactly the two allergen assertions fail. The live allergen re-highlight is
  therefore no longer "proven-by-tests only"; it is **device-confirmed**. Listed
  in the verify blocks in `CLAUDE.md` and `CONTRIBUTING.md`.
- ✅ **Language stays per-profile** — owner ratified the ADR 0012 scoping as
  shipped. No change.
- [ ] **Ratings UX — redesign (attempt 3)** `[M][design]` ⚑ — **two control
  designs rejected on owner review; a third is parked here by owner request.**
  History: (1) the original **1–3 three-button** control (ADR 0013) read
  ambiguously and crowded the ♥; (2) its replacement, a **1–5 star tap/drag
  slider** (ADR 0019, **currently live** — moved under the name, clear of the ♥,
  `role="slider"` + full keyboard, browser-verified 390px), the owner **also**
  rejected on review (2026-07-23). Three v3 paradigms were floated — plain
  tap-only 5 stars · emoji reaction faces · number pills 1–5 — and the owner
  **parked the choice** rather than have a third guess built now. The 1–5 slider
  **stays live** meanwhile (no revert requested). The underlying model is sound
  and unchanged (1–5, per-profile, curated-vs-personal split; ADR 0013/0019) —
  this is a **control/visual** redesign only. 🎯 **Owner ruling 2026-07-24 —
  redesign later, not now.** The slider stays live; no paradigm chosen; revisit
  when it next bothers him. Do not build a v3 until then. Next (when reopened):
  agree the direction with the owner, then supersede ADR 0019. What's shipped
  so far → `ROADMAP-DONE.md` is
  premature; keep the trail in ADR 0013 → 0019.
- ✅ **Directions handoff — backed out to a pin** — **applied 2026-07-23**
  (`9dad5f8`, ADR 0016, wt: faves-wave8-rulings-apply). Owner, raw: "I don't
  think this meets what I wanted for the feature. We need to review it and may
  back out the change. Also when I tapped on 'R & S Satay Noodle House' which is
  shown at the pickup address '148 Cuba St' the maps open on '1 Garrett St'." <!-- leakscan:allow: venue business address in a quoted bug report — same product class as site/data (ADR 0022 gate 1) -->
  Applied: the address tap now opens a map **pin** (not directions), targeting
  the **street address string** — `apple maps.apple.com/?q=<addr>`, `google
  maps/search/?api=1&query=<addr>` — so Maps geocodes 148 Cuba St exactly. Coords <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
  are a belt-and-braces fallback only (they stay the source for in-app distance
  maths). The along-route "🧭 Route via maps" handoff keeps its routed form but
  its venue leg targets the address too. ADR 0010 part (a) superseded; its "~N
  min drive" hint (b) stands. The underlying coord imprecision is still open —
  see the **Coordinate audit** `[S]` below.
- ✅ **Coordinate audit** `[S]` — **done 2026-08-09** (wt: faves-coord-audit,
  `tools/audit_coords.py`). All 46 coordinate slots re-geocoded against their
  own street addresses. **The premise was wrong:** R & S's pin is 1 m from
  148 Cuba St and has never been edited — the "1 Garrett St" bug was the maps  <!-- leakscan:allow: venue business addresses already in site/data and in the quoted bug report — same product class (ADR 0022 gate 1) -->
  app reverse-geocoding the point we handed it, which is what ADR 0016 already
  fixed by handing over the address string instead. Fleet-wide: **36 of 39
  stored pins within 30 m** (33 within 2 m), nothing past 100 m, **0
  corrections needed**. 2 rows carry a note (satay-kingdom-cafe, an in-mall
  address with no geocodable door; groundup-cafe at 33 m), 1 is unverifiable
  by this method (khandallah-trading-company, a street-corner address). Detail
  → [`reviews/2026-08-09-0207-coordinate-audit.md`](reviews/2026-08-09-0207-coordinate-audit.md).
- [ ] **Favourite/rating reference integrity** `[M][design]` — **ADR 0020**
  (proposed). A favourited/rated/shared dish or venue may be missing when the app
  opens — either **removed** from the data, or the local data is **stale** (a
  second device / a shared recipient hasn't refreshed). Today both silently 404
  to a generic error. Decided invariants: **never silently drop** an unresolved
  ref (mark it, offer refresh/remove); **never claim "removed"** without an
  online recheck (stale-vs-deleted is indistinguishable locally — an honesty
  floor point); honest menu-page not-found screen. **Build deferred +
  coordinated** with ADR 0017 (sync makes stale refs routine) and **Theme 10**
  (sharing) so the merge/refresh UX is built once.

## Owner-reported — 2026-07-22

Both resolved; verbatim raw-note records → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- ✅ **Bug: "Nearest first" sorts 10 km above 2.5 km** — **fixed 2026-07-22**
  (`566aa20`). Root cause was not a text sort: the sort-key order put
  availability + the favourite boost ahead of distance; the fix makes distance
  lead when "Nearest first" is on. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
  ⚠️ Hearts-in-Nearest-first question: **ruled + applied 2026-07-23** (pure
  distance, `9a4ed78`) — see Owner rulings above.
- ✅ **Split versioning: app vs config vs data** `[M]` — **shipped 2026-07-23**
  (ADR 0015): `sw.js` split into `SHELL_VERSION` + `DATA_VERSION`, each its own
  cache, so a data-only menu edit refetches just `site/data/*` and no longer
  re-downloads the shell. Runtime upgrade behaviour needs a device pass (steps
  in ADR 0015). Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

## Theme 3 — UX & design pass

> ✅ **Shipped 2026-07-08 → 12** — the design pass + both owner test-drive
> rounds: two-column info aside, wayfinding, overflow menu, favourites nesting,
> caveat/allergen ⓘ disclosures, sticky + global search, footer/About surface,
> contact-bar collapse, back-to-top, settings polish, "Share this app". Record →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
>
> **Still open (small):** self-hosted per-platform **order-online logos**
> (offline / no-hotlink). ✅ **Cook-at-Home top-right grid position — shipped
> 2026-07-22** (`.card-grid .card-recipes` in `site/css/app.css`): detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

## Theme 4 — Content growth (ongoing, in parallel)

- **More favourite restaurants.** The master list lives *outside* the
  repo — a paper list with the menus/recipe books, an Apple Note, or a
  photo in the library. Those aren't reachable from here; the fast path
  is the existing `intake/` pipeline: drop photos/screenshots/Notes
  exports into `intake/`, and they get transcribed to schema (prices from
  paper/in-store, **never** delivery apps).
- **More dishes & home recipes** — same pipeline; the placeholder recipes
  in `cook-at-home.json` get replaced from the Notes export.
- **Dish photos** `[L][schema]` — ✅ rendering shipped 2026-07-08 (self-hosted
  `image`/`alt`, SW-cached, no layout shift); now purely a sourcing task (drop
  owner photos into `intake/`). Render detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

### Per-venue content follow-ups

Small, known gaps left behind by a transcription session — each one needs a
fact nobody had at the time, not a decision. **The rule these all obey: a
missing price stays `null`; nothing is inferred from a neighbouring card or a
delivery app.** Clear one by bringing back the fact.

> 🎯 **Dish-level gaps are no longer listed here — they live on the dish**
> ([ADR 0041](decisions/0041-a-dish-carries-its-own-open-questions.md)). A dish
> carries `needs`, the app shows a **`?` pill** saying what would clear it, and
> the worklist is derived:
>
> ```sh
> python3 tools/needs.py            # everything outstanding, with the why
> python3 tools/needs.py --count    # one line per venue
> python3 tools/needs.py --what price
> ```
>
> This section keeps only what has **no dish to hang on** — a section that was
> never itemised, or a fact about the whole venue. Naming dishes in prose here
> is what went stale; don't start again.

- [ ] **Gold Lining — the juice fridge** `[S][content]`. Not itemised at all:
      no legible prices and only one brand partly readable, so there is no dish
      to carry a `needs` entry. Needs a shelf photo before anything can be
      recorded.
- [ ] **Gold Lining — brunch window vs opening hours** `[S][content]`. The
      printed card says brunch 7.30am–2.30pm; the record holds 07:30–15:30
      weekdays. Left as a *service* window on the assumption the cabinet
      carries on after brunch stops — worth one glance in-store to confirm
      closing hasn't moved.
- [ ] **1841 — the menu we have is a March 2025 document** `[S][content]`. The
      only published menu is a PDF on the venue's own site whose embedded
      `/CreationDate` is **2025-03-27**, and the prices are stored as a dated
      series carrying that date (ADR 0023). `verified` is the day we *read*
      it, so `refreshCaveat` treats it as fresh and shows no caveat — which is
      the known weakness of `paper-menu` (ADR 0031: "as old as the document").
      One in-store price check clears it. 🚩 The general gap — a freshly-read
      but staledly-dated document reads as current — is raised under Theme 13
      rather than patched for one venue.
- [ ] **1841 publishes no drinks list** `[S][content]`. Its site has a food
      menu PDF and a kids menu PDF; there is no beverage list anywhere, and
      the daily deals only reference "any tap beer" and "tap beer and wine by
      the glass" without naming or pricing one. Nothing to transcribe until a
      photo of the bar list or the tap board exists — `intake/` pipeline.
- [ ] **Other venues with drinks nobody has captured** `[M][content]`.
      Now that drinks are in scope, the obvious gap is any venue that sells
      them and has no drink rows. **Derive the list, don't re-type it:**
      compare `services`/cuisine against records whose sections carry no
      Beer/Wine/Coffee heading. Sprig + Fern Tawa is the standout — it is a
      brewery bar and its record is food-only. ⚠️ **Adding drinks silently
      breaks `priceBand`** — they are cheaper than mains and drag the median
      under the `$` ceiling. Curate the band from the food-only median, as
      the two 2026-08-15 pubs now do. Detail →
      [`ROADMAP-DONE.md`](ROADMAP-DONE.md), Theme 4.
- [ ] **1841 — kids menu not transcribed** `[S][content]`. It is a separate
      PDF (`Kids-Menu-2023.pdf`) and is dated **2023** by its own filename,
      two years older than the main menu. Worth a fresh copy rather than a
      transcription of that.
- [ ] **The Borough — phone is the one third-party detail** `[S][content]`.
      Address and hours come from the venue's own site; the number in the
      record comes from a directory listing, so `detailsVerifiedBy` is
      the weaker `third-party` for the whole record (the Press Hall
      precedent, 2026-08-15). The venue publishes only an email. One glance
      at a receipt or the door clears it — or the per-branch provenance pair
      that Theme 13 already owes would.
- [ ] ⏳ **Baylands — the food menu we hold is a festival menu** `[S][content]`.
      It is `WOAP_Menu_2026-1-Food_Menu.pdf`, a **Wellington on a Plate** menu
      whose embedded `/CreationDate` is **2026-08-04**. It is not the brewery's
      standing menu and it comes down when the festival ends, so this is a
      *scheduled re-read*, not a gap: go back once the festival is over and
      record whatever the kitchen returns to. Append, never overwrite — the
      departed festival dishes move whole to `data/history/dishes/baylands.json` <!-- pathscan:allow: the history file is created BY this item when the festival menu comes down — naming it before it exists is the point -->
      (ADR 0023 / ADR 0047), because a festival menu is exactly the kind of
      thing the history store exists to keep.

- [ ] 🚩 **Baylands has no drinks, and that is deliberate** `[content]`. The
      brewery advertises **"30+ taps"** and publishes no tap list anywhere. A
      board that rotates cannot be captured accurately, and a wrong beer on a
      brewery's own page is worse than none — so the gap is a decision, not an
      oversight. **Do not "fix" it by transcribing the retail can range**: that
      answers a different question ("what can I buy to take away", not "what is
      on tap") and would read as the tap list to anyone scanning it. Only a
      dated photo of the actual board clears it, and it starts going stale the
      moment it is taken. Same reasoning as the 1841 drinks item above, one step
      stronger.
- [ ] **Menus still owed on six venues — and where each one lives**
      `[M][content]`. Researched 2026-08-16 and written down here so a fresh
      session can start rather than repeat it.
      - **Four Sprig + Fern taverns**, all `stub`: `sprig-and-fern-petone`,
        `sprig-and-fern-berhampore`, `sprig-and-fern-thorndon`,
        `little-sprig-seatoun`. Each publishes **its own** food menu PDF at
        `sprigandfern.co.nz/pages/<slug>`. They are separate franchises with
        separate kitchens — which is why they are separate records and not
        branches of one, the ADR 0011 assumption having broken here (this
        session's `SESSIONS.md` entry records the finding).
      - **The Victoria Tavern** and **Caffiend** are blocked on their own broken
        web presence, not on our effort. Nothing to fetch until someone brings
        back a photo of the menu — the `intake/` pipeline.

      Two tool steps are **not optional** when any of these lands:
      `python3 tools/tag_allergens.py` for the allergen sweep (ADR 0025 — the
      burden falls on *not* tagging), and `python3 tools/seed_dish_ids.py`
      after, or `validate.py` fails with **one error per dish** (ADR 0051).
- [ ] 🚩 **Every chain we hold should carry all its Wellington-region
      branches** `[L][content]` — owner-directed 2026-08-16: *"Many of the
      restaurants are chains or at least have multiple branches/locations. Where
      that is true lets ensure that we at least have all their locations in the
      Wellington region added to Faves."* This is a standing instruction, not a
      one-off: a chain added later arrives with the same obligation.
      ⚠️ **The "5 records / 22 branches" figure this item used to carry was
      wrong, and wrong in the direction that hides work.** Re-derived
      2026-08-16 across all 55 records: **12** records carry a `locations`
      array, holding **29** branches — 19 with hours, 26 with a pin. The
      earlier count saw only the five *multi*-branch records (McDonald's 5,
      Subway 5, TJ Katsu 7, Sushi Bi 3, Pandan 2 = 22) and silently dropped
      every record whose `locations` array holds exactly **one** entry. Those
      seven are the point of this item, not a rounding error:
      **BurgerFuel, Gong Cha, Hell Pizza, Kaffee Eis, Noodle Canteen, Pizza
      Hut** and Sprig + Fern Tawa. Six of the seven are national chains with
      several Wellington-region branches each, all sitting in the corpus today
      as a single site. So the sweep is **eight chains, not two**, and the
      hidden six are the ones nothing has ever looked at. The five Sprig + Fern
      taverns remain separate records rather than branches, per the split that
      landed with ADR 0051.
      🔎 **The lesson is the measurement, not the number.** A count derived from
      "records with more than one branch" answers a different question from
      "records that are a chain", and reads identically in prose. Derive this
      one from `len(locations) >= 1` and re-derive it rather than quoting it —
      the same trap this file's `stub` count fell into three times.
      **What has to be true for each branch, or it is worse than absent:**
      `address`, `lat`/`lng` (geocoded from the address with the OSM tool —
      never invented; a wrong pin beats no pin only in the sense that both are
      bad), `phone`, and `hours` — the last because
      [ADR 0054](decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md)
      now picks the branch that leads a card by *"nearest, and open"*, so a
      branch with no hours can never lead on merit. Adding branches without
      hours makes that rule weaker, not stronger.
      🔎 **Sequence this after the hours gap below, not before it.** Ten
      branches already lack hours; going wide before going deep multiplies the
      hole rather than filling it. And note the count matters to the UI: past
      five branches a venue needs the two-step "Show all" again (ADR 0054's
      `NEAR_BRANCH_LIMIT`), so a chain going from 5 to 9 changes how its card
      behaves — worth re-checking `branch_check.mjs` against whichever venue
      grows the most.
      ✅ **First pass done 2026-08-16** (`9cae14e`) — **18 branches added across
      three chains, every one with address, phone AND hours.** BurgerFuel 1→4,
      **Hell Pizza 1→14**, Kaffee Eis 1→3.
      🔎 **The sequencing rule was read as "no branches without hours", not "no
      branches"** — a branch added *with* hours strictly improves the ratio ADR
      0054 depends on, so a blocked chain does not block a readable one. Three
      chains were left at 1 branch under exactly that rule: **Gong Cha**
      (addresses and phones exist first-party, no hours anywhere on the site),
      **Noodle Canteen** (only a chain-wide blurb, which demonstrably disagrees
      with the Johnsonville hours we already hold — so it is wrong per-branch,
      not merely coarse) and **Pizza Hut** (no static store directory; same class
      as McDonald's).
      🚩 **Hell Pizza is now the corpus's largest chain and the first venue where
      "Show all" hides nine branches.** `branch_check.mjs` now drives it by
      default — its fixture comment had claimed tj-katsu was "the only venue left
      that still needs the second step", true when written and false the moment a
      chain grew, with nothing to say so. 33 assertions across three venues.
      ⚠️ **Two source claims were checked rather than trusted.** BurgerFuel's site
      renders "Temporarily Closed" on every Wellington store — it is a Webflow
      `w-condition-invisible` field, hidden by the site's own CSS, that markdown
      conversion flattened into visible text; it appears identically on a store
      verified in person the day before. And past-midnight hours use the existing
      **null-close** convention (ADR 0006), already used by `pizza-hut` and
      `sprig-and-fern-tawa` with test coverage, rather than a new one.
      🔎 **Hell Pizza's hours came from its own JSON API**, found by reading the
      site's `config.js`/`hell_api_service.js` when the store finder turned out to
      be a JS SPA needing a click. That is the same wall McDonald's and Subway
      present — and the lesson is that it is worth one look at what the SPA itself
      calls before declaring a chain unreadable.
      **Still open:** the three refused chains, and the rest of the region for the
      chains already in. Claim released.

- [ ] 🚩 **No branch of McDonald's or Subway has opening hours** `[M][content]`
      — **10 of the corpus's 22 branches**, measured 2026-08-16. This is now
      load-bearing rather than cosmetic: [ADR 0054](decisions/0054-the-branch-offered-first-is-the-nearest-open-one.md)
      picks the branch that leads a chain's contact card by *"nearest, and
      open"*, and with no hours anywhere on those two chains the openness half
      of the rule can never fire for them. The three-state design means the card
      degrades honestly — no branch is labelled open or closed on a guess — but
      the feature the owner asked for is only half-alive until the hours land.
      Both chains publish per-store hours on their own store-finder pages.
      Capturing them makes ADR 0054 real and lets `branch_check.mjs` exercise
      tier 1 on a venue that has more than one state.
      🛑 **Attempted 2026-08-16 and BLOCKED — on tooling, not on the data
      existing.** Nothing was written; both records are untouched. What was
      established, so the next attempt starts here rather than repeating it:
      - **McDonald's has a real first-party per-store page** — e.g.
        `mcdonalds.com/nz/en-nz/location/wellington/lambton-quay/276-278-lambton-quay/640045.html`,
        address and phone confirmed against our stored branch. It renders a
        "Store Hours" section and even computes a live "We're closed now"
        status. **The weekly table never appears in the DOM** — not in a plain
        fetch, not in headless Chromium or WebKit at 15 s, no `<iframe>`, no
        JSON-LD, no state blob, nothing in the meta description. It reads as a
        widget that populates only on a genuine click. The `googleappsv2`
        geolocation endpoint and `mcdonalds.co.nz` both return
        `ERR_HTTP2_PROTOCOL_ERROR` to every engine tried.
      - **Subway NZ appears not to be on a readable first-party platform at
        all**: `subway.com/en-nz/findastore` is JS-only with no server-rendered
        results, `subway.co.nz` is dead (TLS mismatch onto a bare edge), and
        `restaurants.subway.com` serves other regions — a search for
        "Wellington" returned the one in Somerset.
      - **Third-party sources were found and deliberately refused.** Several
        aggregators carry confident-looking hours for both chains. Taking them
        would put a guess behind ADR 0054's "open" state, and a false "open"
        sends someone across town — the failure the three-state design exists to
        avoid. `unknown` remains the honest state.
      - **Coordinates:** the two branches missing a pin (McDonald's Courtenay
        Place, Subway Mulgrave Street) both geocode to a **street centroid**
        only, so both were left empty on the Pandan precedent. Also noted, not
        acted on: McDonald's Johnsonville's *existing* pin sits 359 m from a
        fresh geocode — but that geocode is street-level too, so it is not
        evidence to move it.
      🎯 **This needs an owner decision, and there are three honest options:**
      (a) he supplies the hours himself, or authorises someone to read them off
      the stores' own doors or by phone — the corpus already has an `in-store`
      and a `phone` provenance tier for exactly this; (b) a session runs with an
      interactive browser that can click, which is a tooling change, not a
      content one; or (c) he rules that a named third-party source is acceptable
      for opening hours specifically, recorded with its own provenance value so
      the weaker basis is visible on the record rather than laundered into
      first-party. **Option (c) changes a standing rule and is his call alone.**
      Claim released — this is not blocked on effort and re-attempting it with
      the same tools will produce the same result.

- [ ] **`picks` are empty on most venues** `[S][content]` — **44 of 55**
      (measured 2026-08-16). ⚠️ One of the two venues this line named was never
      true: Takeaway @ Churton has carried three picks since the commit that
      transcribed it, *before* this line was written — a transcription error at
      write time, not staleness, and it has been misdirecting the worklist ever
      since. Gold Lining is genuinely still empty. `picks`
      drives the "our picks" surface and `validate.py` warns on each empty
      one, so the warnings are the worklist. Owner-supplied only: these are
      *our* favourites, not a guess from the menu.
- [ ] **Venues still `stub`** `[M][content]` — they render as "menu
      coming soon" cards and never as empty menus, so this is a backlog, not
      a defect. Same `intake/` pipeline. **Derive the count, don't read it
      here:**
      `python3 -c "import json,glob,collections; print(collections.Counter(json.load(open(f))['status'] for f in glob.glob('site/data/restaurants/*.json')))"`
      — as of 2026-08-15 that returned **16 stub, 22 menu-complete across 38
      records**, of which **13** carry a `verified` date. 🚩 **This item's
      count has now been wrong three times** — "16 … 12" was corrected to
      "17 … 14" on 2026-08-09, re-counted to "16 … 18" earlier on 2026-08-15,
      and the three pubs added later the same day made that wrong again
      within hours. The heading no longer carries a number at all, because
      the heading was the part that kept going stale. A hand-copied tally in
      prose goes stale the moment data lands, which is exactly the trap the
      `pathscan` title fell into. **Do not re-type the numbers next time —
      derive them**, and treat any figure here as of its stated date only.
      The old note that this was "the concrete cost behind Theme 13g" no
      longer applies: 13g shipped, and the caveat now reads the method and
      its age rather than firing on everything undated (ADR 0036).

## Theme 4b — Meals vs dishes: pairings & "goes with"

Owner idea (2026-07-08): Cook-at-Home (and menus) are flat lists of
individual dishes, but people eat *meals*. Two shapes, not exclusive:

- **(b) Recommended pairings** `[M][schema]` — ✅ done 2026-07-08 (ADR 0007):
  optional `goesWith` → "Goes well with …" chips. Detail →
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- **(a) Reorganise around meals** `[L][schema][design]` — a `meal` becomes
  a first-class set (main + sides + dessert); Cook-at-Home sections become
  curated meals rather than dish categories. More expressive but a bigger
  reorg of the data + UI, and it hard-codes one grouping. Better *after*
  (b) exists, if flat-list-plus-pairings proves too loose.

Recommend **(b) now** (small, reversible, reusable), **(a) later** only if
needed. Both **⚑** need the owner to confirm the direction before schema
lands.

## Theme 4c — User contributions (request a place, report an update)

⚑ **Parked (owner, 2026-07-08): no email — deploy first.** A public front door to
the `intake/` pipeline (suggest a place / report a change). When revisited, the
honest candidates within the constraints: **GitHub Issues** (pre-filled
`issues/new` to a public `faves-feedback` repo) or a **Cloudflare Pages form + edge
function** (R2 photo uploads, adds serverless + a spam guard); third-party forms
stay ✗-by-default. Full pre-decision analysis → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

### Reactivated 2026-08-09 (owner) — "tell us what's wrong or missing"

**The ask, raw (owner):** *"feedback feature to add/improve features in the app
or the menus e.g. dish X is missing an allergen or update a price."* The
**park reason has lapsed** — "deploy first" was the 2026-07-08 gate, and the site
went live 2026-07-12. This is now open work, not a parked idea.

Two streams, deliberately separated because they land in different places:

- **Data corrections** — "this price is wrong", "this dish is missing an
  allergen", "they've stopped doing this". Destination: the `intake/` pipeline
  and a content session.
- **App feedback** — a bug or a feature idea about Faves itself. Destination:
  the roadmap / an issue.

- **4c-i — Report from where the problem is** `[M][design]` — ✅ done 2026-08-09
  ([ADR 0028](decisions/0028-report-compose-and-share.md)). A report raised **from
  the dish or venue itself** arrives with the venue id, dish name, the price and
  tags we're currently showing, the `verified` date and the device's own version
  stamps already attached — so the owner can act without a conversation. Three
  entry points shipped: a ⚑ on the dish row's action cluster, a "Something wrong
  here?" row closing the venue contact card, and "Suggest or report" in the ⋯ menu
  of both shells (home included). Recipes carry no dish ⚑ — nothing there has a
  price or a venue to correct. Entry-point placement and the report's format are
  **this session's calls, ⚑ owner eyeball**; the transport under them is ruled.
- **Transport — ✅ RULED 2026-08-09, shipped 2026-08-09: compose-and-share**
  `[M]` ([ADR 0028](decisions/0028-report-compose-and-share.md)). Built as ruled:
  `report.js` composes (pure, 16 unit tests), `report-ui.js` hands off. Share… and
  Copy are **two first-class buttons side by side** — Share shows exactly when
  `navigator.share` exists, a refused share chains on to the clipboard, and if both
  miss the composed text is revealed, focused and selected with the dialog still
  open. It sits in a disclosure the whole time, so it is never *not* on screen. No
  recipient is baked in. The owner
  took the recommendation: build the report client-side and hand it to the OS
  share sheet / clipboard (`navigator.share`, clipboard fallback) so it arrives
  as a message. **Zero infra, offline-capable, no trust surface, no accounts** —
  and for a family-and-friends audience the message *is* the channel. The other
  two are **not rejected, just not first**: a **pre-filled GitHub issue** needs
  the repo public (Theme 8) *and* a GitHub account most intended users don't
  have; a **Cloudflare Pages Function + spam guard** is the real front door for
  strangers, now permissible under [ADR 0017]'s softened stance, but it's a
  standing backend and needs its own ADR. Revisit (c) when the audience stops
  being people who can already message the owner. **Build note:**
  `navigator.share` needs a user gesture and isn't everywhere (no Firefox
  desktop), so clipboard-plus-visible-confirmation is a first-class path, not an
  afterthought — and the report has to stay on screen if both fail.
- **Safety rule, non-negotiable** — ✅ done 2026-08-09. The dialog carries the
  framing **always visible, not behind an ⓘ**, opening with the allergen caveat's
  own words ("Always confirm for allergies"), and every composed report repeats
  it. An allergen report with no tags says "no tag means not stated, not
  allergen-free". Both are unit-tested across *every* report type, so adding a
  type cannot lose them. As specified:
  an allergen correction is **a suggestion
  to the owner, never a live edit**. Nothing a reporter submits may change what
  the app flags; corrections land in the repo through a human. The reverse
  failure — someone "correcting away" a peanut tag — is a safety failure, not a
  data-quality one. Inherit the existing allergen framing verbatim.
- **Offline behaviour** — ✅ done 2026-08-09. Both modules join the SW shell
  precache and the feature makes no fetch at all, so composing and handing off
  work in flight mode. Verified with the network cut in headless Chrome: the menu
  renders, the ⚑ opens, and the report composes with full context and live version
  stamps. **No outbox** — the share sheet and clipboard both work offline, so
  there is nothing to queue, and a queue would add storage the owner can't see and
  the reporter can't cancel (rationale in ADR 0028).

## Theme 5 — Richer dish data

✅ **Shipped 2026-07-08 → 09** — price-per-person + cheap-eats filter (`price.js`,
curated `priceBand` override), dish order-codes, the extended allergen
**vocabulary** (populating stays an `intake/` content task — no tag = not stated),
device-local dietary/allergen preferences with load-bearing safety framing, and
hearted favourites (`favourites.js` + shared `store.js`). Popular/busy times ruled
out (no official API). Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

✅ **Allergen tag sweep — done 2026-08-08 ([ADR 0024](decisions/0024-derived-allergen-tags.md)),
owner-requested.** Two gaps closed at once: satay carried a peanut tag only at
the venues whose menus printed the words "peanut sauce" (so R & S Satay Noodle
House warned on nothing), and shellfish tagging was inconsistent inside single
records. **100 tags across 8 venues** — 64 read straight off the menu (the
STATED tier, incl. **oyster sauce**), 36 derived from an enumerated rule set
(satay → peanut, unnamed "seafood" → shellfish, laksa → shellfish). The
disclosure copy was changed in the same commit so the app stops claiming every
tag is venue-stated. `tools/tag_allergens.py` is re-runnable and now warns from
`validate.py`, because the gap was created by hand-tagging record by record.
✅ **Inference became the default — 2026-08-09
([ADR 0025](decisions/0025-infer-allergens-by-default.md), superseding 0024).**
🎯 **Owner ruling**, verbatim: *"it is preferable that we infer information like
allergens where the menu writer hasn't bothered to define it and we have a high
confidence that we are correct."* That inverts 0024's narrow exception — the
burden now falls on *not* tagging. **542 tags applied** (251 STATED, 291
DERIVED) across gluten, dairy, egg, soy, nuts and sesame; before this the corpus
had 45 gluten tags across 1,062 dishes, so the filter was near-useless for
anyone avoiding them. **The hard limit**: inference only ever *adds* a
`contains-*`, never `gf`/`df`/`v`/`vg` — inferring presence is fail-safe,
inferring absence asserts safety from a guess. Three guards, each earned from a
real dry-run false positive: per-rule exclusions ("rice noodles" aren't wheat,
"oat milk" isn't dairy, "pumpkin pie spice" isn't a pie), curation outranking a
pattern (a `gf` dish never gains `contains-gluten`), and paid add-ons not
counting as ingredients.
⚑ **Now the strongest queued follow-up here** — a `may-contain` tier that shows
a reader *which* tier a tag came from. Deferred at 36 derived tags (ADR 0024);
at 291 it is more attractive, and it's the right answer if generous flagging
ever reads as wallpaper. Still touches the vocabulary, the render and the
avoid-matching — all safety-critical — so it needs its own session. `[M]`,
unclaimed.

✅ **`tools/tag_allergens.py`'s two holes — closed 2026-08-16** (`eb9b38f`),
      ticked here 2026-08-16 by a second session that found the item still open
      after the work had landed. 6 real missing tags applied corpus-wide; a
      re-run now reports **0 missing**. Detail →
      [`ROADMAP-DONE.md`](ROADMAP-DONE.md). ⚠️ One residue stays open under
      Theme 4, not here: three `sprig-and-fern-tawa` Cheeseburger twin warnings
      that ADR 0025 forbids a rule from closing.

✅ **Menu prose tidy-up — Takeaway @ Churton, 2026-08-09** (owner steer: *"where
the menu writer has not used the best prose we should tidy that up… without
losing the definition"*). Six section headings shortened — "Curry on Steamed
Rice with Vegetables" → **"Curry on Rice"**, "Black Bean Sauce with Vegetable on
Rice" → **"Black Bean Dishes"**, "Chow Mein (noodles)" → **"Chow Mein"** — with
the detail moved into **41 dish descriptions** that had none, so nothing is
lost. Dish *names* were deliberately left alone: `cart.js` keys an order line by
name and the order sheet shows it without its section, so "Chicken Curry on
Rice" has to stand on its own. **Left alone on purpose**: "Sweet and Sour Sauce"
(item 128, Orange Beef, sits in it and isn't a sweet-and-sour dish, so a blanket
description would be false) and R & S's Malaysian headings ("Kua Teaw Dishes",
"Chew Kua Tew") — those are dish terms, and rewriting them risks mangling the
language rather than tidying prose. 🎯 **Owner call**: R & S's spelling looks
like *char kway teow*; worth confirming against the shop before touching. `[S]`

**Still open:**

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
- ✅ **Ratings / feedback** `[M]` **⚑ shipped, direction awaits owner
  ratification** (shipped 2026-07-22, wt: faves-wave4-local-ratings; ADR 0013) —
  built the recorded recommendation **(a)+(b), not public**: (b) **local-only
  personal ratings** in full — a keyboard-operable ☆☆☆ 1–3 control on venues +
  dishes, per-profile in `localStorage` (`faves.ratings.v1`), styled distinctly
  from our curation; (a) **curated household rating** as **schema + render only**
  — an optional integer `rating: 1..3` on venues/menu items (`validate.py`
  enforced), rendered where picks render, **no data invented** so it ships
  dormant. Public crowd ratings **stay rejected** (backend + moderation +
  accounts break three non-goals). **⚑ still stands:** the owner must ratify the
  (a)+(b)-not-public direction *and* supply the curated `rating` values before
  (a) shows anything. The live-Google-rating edge function below is a **separate,
  owner-gated** item (billing) — out of scope for this change.
- **See public ratings / reviews** `[M]` ⚑ **owner decided 2026-07-08:
  show the number when online, link-out when offline.** The honest read: a
  static site can't fetch a live Google rating (the Places API is keyed,
  billed, and its ToS govern display + caching; a public site can't hold the
  key safely). So the shape is a **progressive enhancement**: a small
  **Cloudflare Pages Function** proxies the key, fetches the rating on demand,
  caches it at the edge, and shows it inline with "powered by Google"
  attribution; **offline or on failure it degrades to a "See reviews"
  link-out** to the venue's Maps listing. This is the *first* external service
  in an otherwise zero-third-party app — the shipped `site/` artefact stays
  zero-dep (the fetch is runtime + optional), but the deployed *system* gains
  one billed online dependency. **Write an ADR when built; sequenced after the
  Cloudflare Pages deploy (Phase 7).** Dish-level ratings stay curated (Google
  rates places, not dishes).

- ✅ **Multiple people's favourites — device-local profiles** `[M]` (shipped
  2026-07-22, wt: faves-wave3-local-profiles; ADR 0012) — several people share
  one phone, each with their own hearts. A "who's using Faves?" switcher in
  Settings (add/rename/delete, first names only); favourites + all of settings
  (dietary/allergen prefs, ranking dials, reo language) are per-profile via a
  registry + profile-scoped storage wrapper; the order tally + Near-me origin
  stay device-shared. Existing data migrates into the default profile. Switching
  visibly re-applies the person's allergen filter (menu/recipe reload on a
  cross-tab switch) so no one browses under someone else's safety settings.
  ~~**Cross-device sync stays out of scope**~~ — **superseded 2026-07-23 by
  [ADR 0017] / Theme 9 below.** The original stance (sync needs an account +
  backend → belongs to a separate signed-in app) was half wrong: continual sync
  is reachable *without* accounts, via a bearer sync-code + an E2E-encrypted
  Worker+KV blob. The health app (Theme 6) stays its own project for
  personal/health data; it simply no longer owns "identity/sync" as its reason.

## Theme 6 — North star: the health tie-in

Treat this as a **separate, private, personal app that *consumes* Faves**
— not a feature bolted into Faves. Why the split is the right
architecture:

- Faves is public, account-free, and forbids personal/health data in the
  repo. An eating diary + exercise log is inherently personal, private
  and persistent — the opposite shape. Mixing them would drag exactly the
  data this repo bans into a public artefact.
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

Faves' defining property is that the shipped artefact has **no
third-party components** (ADR [0001](decisions/0001-zero-build-vanilla.md)):
no npm packages, no CDN, no framework. This theme makes that claim
*checkable* rather than merely stated. Note the honest framing: for a
zero-dependency site an SBOM is **not** vulnerability management (there's
nothing third-party to scan) — its value is attestation + a tripwire
against dependency creep.

✅ **Shipped** — **SBOM publishing** (2026-07-09, ADR 0008: deterministic
CycloneDX at `/.well-known/sbom.json`, `gen_sbom.py --check` CI gate) and the
**zero-dependency CI guard** (2026-07-08, `check_no_deps.py`). Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

**Still open:**

- **`security.txt` + provenance metadata** `[S]` — a `/.well-known/
  security.txt` (contact + policy) is cheap good-citizenship for a public
  site. 🎯 **Owner ruling 2026-07-25 — contact points at the repo's GitHub
  security advisories** (not an email). **Sequenced with go-public (Theme 8):**
  the advisories URL only resolves once the repo is public, so don't ship it to
  the already-live site pointing at a 404 — build it *as* the repo flips public.
  Build provenance/attestation (SLSA-style) is **N/A today** — Cloudflare Pages
  serves static files with no build to attest; revisit only if a real pipeline
  ever appears.

## Theme 8 — Making the repo public ✅ DONE 2026-08-09

🎉 **The repo is public**: <https://github.com/mike548141/faves>. Flipped at
`a207a15` on the owner's explicit instruction, hardened in the same sitting
(secret scanning + push protection, a `protect-main` ruleset, fork-PR approval
for all external contributors, Actions narrowed to selected), and
`/.well-known/security.txt` shipped and serving. Full runbook outcome and the
two commands that were wrong when run: [GO-PUBLIC.md](GO-PUBLIC.md).

The history below is kept as the record of how it was sequenced.

Assessed 2026-07-12: publishable, but sequenced. Flipping visibility is a
floor action (one-way door — forks/copies survive any later unpublish) and
stays the owner's explicit call. Order matters:

1. ✅ ~~**GitHub PAT refresh first**~~ — **discharged 2026-08-09
   ([ADR 0026](decisions/0026-pat-prerequisite-discharged.md))**. The session
   log (`docs/SESSIONS.md`, 2026-07-12 deploy entry) records the then-current
   PAT as classic + broad and lists unhardened credential roots
   (AWS/Google/TrueNAS); git history preserves that line forever, so the
   fix was making it *historical* rather than redacting the log. It already
   is: the account now carries **no classic tokens at all**. The
   AWS/Google/TrueNAS half is **decoupled** to the estate roadmap — it
   discloses nothing actionable and no longer gates this repo.
2. ~~**Branch protection before visibility**~~ — ⚠️ **superseded 2026-08-06
   by ADR 0022 gate 8: not achievable as written.** GitHub refuses branch
   protection on a private free-plan repo. The requirement stands, the
   *sequencing* doesn't: flip and harden in one sitting (GO-PUBLIC.md).
3. **Owner confirms the docs' family texture.** The 2026-07-06 approval
   covered recipe attributions in site data; the docs also use family
   first names in feature examples and acceptance notes (ROADMAP Themes
   1/1b, SESSIONS). Same first-names-only level, but publishing extends
   the approval from the site to the workshop notes — confirm or trim.
   🎯 **Owner ruling 2026-07-24 — do a full family-texture review before public**
   (a decided pre-public gate, not a piecemeal fix). Sweep **docs + site data +
   tests** for family first names and decide the whole set together. Concrete
   instance that triggered this: leakscan (owner's local term list, invisible to
   CI) flags a child's first name used as a **test fixture** in
   `tests/profiles.test.js` (pre-existing, from `5dfda33` 2026-07-22) and the
   "Churton" suburb across restaurant data (a real place name — likely fine). The
   owner-approved recipe attributions (2026-07-06) stay. **Review ran
   2026-07-28** (Fable session) — full inventory + recommendations in
   [reviews/2026-07-28-1138-family-texture-review.md](reviews/2026-07-28-1138-family-texture-review.md).
   ✅ **Ruled 2026-08-06, all four, and applied same day** (rulings + the
   one deviation stamped into the review record): Shane/Jesse kept with
   their OK (owner holds it; the 11e move-private option was offered and
   not taken), test fixtures renamed neutral (`ea4ccde`), all live docs
   neutralised (`5830081` + doc edits; SHELL_VERSION bumped), history
   published as-is, no rewrite. **This gate is closed.** The visibility
   flip stays owner-only.

Verified clean 2026-07-12 (tree + full history): no secrets (the one
token line reads from Keychain; "share tokens" are client-side codec),
Apache 2.0 licence present, only the owner's own `cxi.nz` work address in
commit metadata,
home-area inference no worse than the live site already allows.

**Re-assessed 2026-08-06** (pin bumped to `atelier@33a540a`). The estate
now has a proven flip procedure: `rpi` went public 2026-07-29 through a
six-gate publish-safety ADR — rpi's own
`docs/decisions/0009` <!-- pathscan:allow: rpi's own ADR, cross-repo --> —
leakscan 0, secretscan 0, full-history blob scan, licence, reconnaissance
sweep, docs-read-as-public — with the evidence produced by an agent and
the flip ruled by the owner. faves follows that template. What the
re-assessment adds to the list above:

- **Two upstream atelier items gate the flip.** P5 — the publish-safety
  checklist covers repo *content* but nothing covers GitHub *settings*
  (wiki, actions policy, fork-PR approval, rulesets); atelier's ROADMAP
  marks it owed *before the ros/faves flip*. P6 — the
  estate-internal-context ADR (drafted 2026-08-05, ruling owed) binds
  every repo heading public; faves records name private siblings, so the
  ruling lands here too.
- **Leakscan needs a disposition pass, not a cleanup.** Full-tree
  leakscan: 104 findings at the 2026-08-06 morning HEAD, 101 after the
  family-texture fixes. The bulk are the product — restaurant street
  addresses and phone numbers in `site/data/` and their echoes in our
  records — business data the site exists to publish, not personal
  data. Per GUARDS (narrow, noisy, reasoned) they want a scoped,
  reasoned allowance, not deletion. Gate 1 of the publish-safety ADR can
  only cite "leakscan 0" after that pass. 🚩 The pass must also settle
  the **suburb trap** found applying the rulings: the home suburb is
  product content (three venues, `site/index.html` fallbacks) *and* a
  term-list entry, and term hits are marker-non-exemptible (atelier D1)
  — the existing lines are grandfathered because leakscan judges changed
  lines, so the next edit touching one blocks with no hatch. Fix is a
  scoped carve-out (path-scoped ignore for venue data, or narrowing the
  term list), and it is an owner call either way.
- **Floor CI must be green before the flip.** Red since 2026-07-25
  (leakscan lacks cover in CI — no term list on the runner). The owning
  fix is atelier P4 (the ci plane calls leakscan without
  `--require-terms`), still open upstream. Post-flip every push is
  publication, so a red floor at flip time is not acceptable debt.
- **The flip artefact is a faves publish-safety ADR** modelled on rpi
  0009: six gates, evidence not assurance, full-history blob scan
  included, re-verified on the exact tree that flips. The visibility
  change itself stays an owner-only floor action.

✅ **Pre-flip decision pair — RULED 2026-08-06.** (1) **Full history**, no
fresh public root: the fresh-root option was costed (stranded doc SHAs,
lost build narrative, and it buys little because the texture ships at
HEAD anyway) and declined, reaffirming the family-texture ruling. (2)
**Records publish as-is**, with the PAT line made historical rather than
redacted. ⚠️ **Reasoning corrected 2026-08-09
([ADR 0026](decisions/0026-pat-prerequisite-discharged.md))**: the original
argument — redaction achieves nothing "since the text stays reachable in
every clone" — is **false for this repo** (private since 2026-07-06, zero
forks, the only cloners the owner's own machines). The conclusion still
holds, on cost: a rewrite strands the **44 commit SHAs** cited across the
ADRs, session logs and reviews.

✅ **Publish-safety review done 2026-08-06** →
[ADR 0022](decisions/0022-publish-safety-review.md), with the flip
sequence in [GO-PUBLIC.md](GO-PUBLIC.md). Verdict **safe to publish**,
two owner actions owed first. What that pass closed:

- **Leakscan disposition done: 101 → 0.** Every finding was restaurant
  business data — the product. Four reasoned `.leakscanignore` globs
  (`site/data/*` + three venue-mirroring test files, 32 files) and 18
  per-line markers on prose that quotes an address as a worked example.
  The **suburb trap is settled**: `"Churton Park"` is out of the
  machine-local term list (a public suburb name and product content;
  the street-level terms that actually pinpoint the house stay).
- **Advisory scanner debt cleared — this was a hidden flip blocker.**
  The floor *tightens* on a public repo (atelier P3): advisory checks
  lose their hatch. So the 21 datescan/wrapscan/spellscan findings
  declared advisory with a 2026-09-15 review-by would have gone red at
  the flip, which is *before* that date. All 21 fixed;
  `.atelier-floor.json` is down to the licence declaration and all
  twelve checks are enforced and green.
- **Platform-settings audit (this repo's instance of atelier P5).** 🚩
  **The roadmap's step 2 above — "branch protection before visibility"
  — is not achievable as written.** GitHub refuses branch protection,
  fork-PR approval and secret scanning on a *private free-plan* repo.
  Hardening can only happen after the flip, so flip and harden in **one
  sitting** (GO-PUBLIC.md steps 4–8). Going public is also a net gain:
  it turns on secret scanning + push protection, withheld while private.
- **Reads-as-public pass** — README opens with what the project is to a
  stranger and gained licence/contributing/security sections;
  `SECURITY.md` written; one reconnaissance hit (a `tools/deploy.py`
  docstring naming a private sibling tool and the estate's network
  vendor) removed.
- **Full-history evidence**: 979 blobs across 236 commits — secretscan
  clean; leakscan's only non-venue findings are the owner's own work
  email (34) and household first names in superseded test fixtures (see
  ADR 0022's residual risks, accepted with the fact in hand).

🎯 **Still owed before the flip — owner's:**

1. ✅ ~~**Rotate the GitHub PAT and confirm the AWS / Google / TrueNAS
   credential roots are hardened.**~~ — **closed 2026-08-09
   ([ADR 0026](decisions/0026-pat-prerequisite-discharged.md))**. No classic
   tokens exist on the account, so the line is already historical; the
   credential-root half is decoupled to the estate roadmap. 🎉 **No pre-flip
   blocker remains** — the sequence resumes at GO-PUBLIC step 3.
2. ✅ **Floor CI green at `8ba6218`** — first time since 2026-07-25,
   resolved as a side effect of the leakscan disposition (CI was
   blocking on the venue-data structural findings; the ignore took them
   to zero). ⚠️ **Not a fix of atelier P4**: CI still carries no term
   list and still reports "cover not guaranteed", so it cannot catch a
   term-list-only leak. Real cover stays the local `--require-terms`
   run. Post-flip, every push is publication — so this residual is worth
   closing upstream.
3. **atelier P5 / P6** still open upstream (the generic settings
   checklist; the estate-internal-context ruling). Neither blocks: P5's
   substance is discharged for this repo by ADR 0022 gate 8, and P6's
   ruling would bind the records convention going forward rather than
   gate this flip.

## Theme 9 — Cross-device preference sync (owner-approved 2026-07-23)

The same person's hearts, ratings, and settings, kept together across
their own devices. Full deliberation → [ADR 0017]; this is the sequenced
build view. Ethos updated with the owner: a **serverless backend is now
permitted**; **accounts are not** (a bearer sync-code carries it);
**off-device data must be E2E-encrypted** — no way for Cloudflare *or*
the owner to read it.

**Through-line (owner, 2026-07-23):** the backend shifts Faves from
**device-centric to user-centric** — a person's data belongs to *them* and
follows them across devices (Theme 9) and, with consent, to people they
choose (Theme 10), rather than being trapped in one browser's storage.

- ✅ **v1 — shareable-link seed** `[S]` — **shipped 2026-08-09**
  ([ADR 0030](decisions/0030-personal-data-import-and-transfer.md), proposed —
  owner to ratify). Settings → Your data → "Make a transfer link": the active
  profile's hearts + ratings + settings packed into a `#xfer=` fragment, with
  copy / share-sheet / QR through the existing share dialog, and a receive flow
  on every screen that goes through the *same* applier the file import uses —
  so the profile-collision and allergen questions are asked identically either
  way. Called **transfer** throughout, never sync. ⏳ **Owner ruling
  2026-08-09: ADR 0030 stays proposed until he has walked import + transfer on
  his own phone** — ratification rides on that device pass, not on this record.
  🔎 **The QR is a bonus, not the path.** Measured against `qr.js`'s v20-M
  ceiling (666 bytes): 3 favourites + 2 ratings + settings = a 568-char URL and
  a scannable code, but 5 favourites already overflows, 30 favourites is 3,107
  chars and the whole catalogue is 79,583. So the link is the primary hand-off
  and the QR degrades with an honest message. **Scope call: active profile
  only** — whole-device backup is the file's job (12b), and carrying every
  profile multiplies the one dimension that's already binding.
  ⏳ Owner to eyeball the wording and the 390 px layout; ADR 0030 wants
  ratifying.
- **v2 — continual sync (Cloudflare Worker + KV)** `[M][constraint]` ⚑ —
  a tiny Worker holds **one E2E-encrypted blob per user** in Workers KV.
  Design (all in ADR 0017):
  - **Continual bidirectional**, not a one-off migrate: each device keeps
    its offline-first local copy, pushes a **debounced** write (batch a
    flurry of changes into one write on a **5–30 s** idle/blur window —
    never per-tap; writes are the one scarce KV resource), pulls + **merges
    client-side** on open/foreground. KV blob = shared mirror, not source
    of record.
  - **Claim is pluggable over the one E2E store** (addendum, ADR 0017):
    **passkey + WebAuthn PRF** is the headline path — the passkey is the
    claim *and* PRF derives the E2E key on-device (server never sees it),
    platform-synced via **iCloud Keychain** / Google Password Manager, so it
    rides the user's existing Apple/Google with **no OAuth app, no Apple
    Developer fee, no email/PII**. Verified Q1 2026: Safari 18+/Chrome/Android
    ✅, Firefox ✗. The **bearer sync-code** (machine-generated ~44-bit word-code,
    QR *or* words) stays the **universal fallback** for Firefox / non-passkey /
    "just give me a code". OIDC "Sign in with Google/Apple" rejected — it
    claims but supplies no E2E key. No traditional accounts either way.
  - **E2E-encrypted** (`crypto.subtle`, key from the code): server stores
    only ciphertext, so merge (union hearts, last-write-wins settings,
    read-merge-write on push) is all client-side.
  - **Cost ≈ $0** on Cloudflare's free tier (blobs are KB; the debounce
    keeps writes far under the 1k/day cap); **$5/mo** soft floor only if it
    ever outgrows free. Opt-in, disposable (lose the code → mint a new one,
    re-seed), degrades to local-only offline.
  - Honest limit: **on-device at-rest encryption is the platform's job**
    (OS full-disk encryption) — a web app can't meaningfully encrypt its
    own `localStorage` against someone holding the unlocked device without
    prompting for the code every open. We won't overclaim it.
  - ⚑ v2 is the first standing backend — building it is the owner's go.
- **Reuse Theme 12's collector.** The push/pull blob is the same
  "gather the personal layer / apply it back" operation as data export; build
  `personal-data.js` once (Theme 12c) and encrypt its output here, rather than
  writing a second serialiser that can drift from the first.
- **May subsume queued items** — revisit when v2 is scoped: per-device
  profiles (ADR 0012) gain a cross-device dimension; the "separate
  signed-in app owns sync" assumption (Theme 6) is retired; the shareable
  shortlist links overlap v1's codec. Audit before building so nothing's
  built twice.
- **Terminology (addendum 2, ADR 0017):** once passkey sync ships, **don't
  say "no accounts"** — a passkey reads as an account to users. State what
  we *don't* collect (no email/password/identity/tracking; E2E so only you
  can read it). Lockstep: revisit the About line (`about-ui.js`) in the same
  change that ships passkey sync — it's true today (no passkey yet).

## Theme 10 — Cross-person sharing (ongoing, revocable) — owner-gated

Considered 2026-07-23, **not yet decided**. Distinct from Theme 9 (a
person's *own* devices) and from the one-shot group-order links (ADR 0009,
a snapshot). Builds on Theme 9's E2E store; **needs its own ADR when built.**

The capability: person A grants person B **ongoing, read-only, revocable**
access to a **scoped slice** of their personal layer — e.g. Alex shares their
favourites so the orderer can pick their usual when ordering for the family.

- **Scenario 1 (send picks to the family order) does *not* need this** —
  owner agreed 2026-07-23: ADR 0009's link already does the async "send my
  picks" job; live simultaneous *rooms* are a separate later polish, not a
  reason to build sharing. Don't build the backend for Scenario 1.
- **Why the backend earns its keep here (Scenario 2):** a v1 shareable-link
  of favourites is a **snapshot that goes stale**; "ongoing/live" forces the
  backend + a **pull** model. Additive — ADR 0009's link stays the
  zero-account floor.
- **Opt-in, per-scope** (owner steer 2026-07-23): the sharer chooses *what*
  they expose — **separate toggles for favourites / dietary needs /
  allergens**, not all-or-nothing. **Default shared scope = favourites**
  (owner-decided 2026-07-23); dietary + allergens are opt-in additions, off
  by default. Read-only for the recipient; one-way (mutual = two grants);
  revoke must be easy and obvious.
- **Crypto step-up — E2E sharing is key-sharing.** The server can't "grant
  access" (it can't decrypt). Each user needs a **keypair**; the sharer wraps
  a copy of their data-key to the recipient's public key (envelope
  encryption). **Revocation is forward-only** — the recipient may have cached
  what they already saw; state that limit to users. → **Lean Theme 9 the
  right way: give each user a keypair from the start**, even though self-sync
  only needs the symmetric secret, so sharing is a smaller later step.
- ⚑ **Allergen-safety framing is load-bearing.** Shared dietary/allergen
  data is health-adjacent; ordering off a **stale or wrong** shared list is a
  **safety** failure, not cosmetic. Frame as **"informational — confirm with
  the person,"** never authoritative; inherit the app's existing allergen
  safety framing. Given real household allergies, non-negotiable.
- ✅ **Owner calls — resolved 2026-07-23** (both, so this is direction-set,
  not open):
  1. **Share health-adjacent data across people? Yes** — but **only on
     explicit opt-in consent** from the sharer, per scope. So dietary/allergen
     sharing lives in Faves (not deferred to the Theme 6 health app), gated on
     consent + the load-bearing safety framing above.
  2. **Default scope = favourites** (dietary + allergens opt-in, off by
     default) — see the scope bullet.
  Still needs its own ADR when built (crypto model, consent UX, revocation).
- **Theme 11 extends this model** (2026-07-29): sharing *recipes* needs
  **per-item** grants rather than per-scope, and a family shared set would be
  **multi-writer** — neither is covered by the read-only design above.

## Theme 11 — Recipes as personal content (owner-raised 2026-07-29) — owner-gated

Today Cook at Home is **24 curated recipes shipped in the repo to
everyone** (`site/data/restaurants/cook-at-home.json`, `kind: "recipes"`). The
owner's steer: keep the feature and keep *publishing* some recipes, but stop
publishing *all* of them — recipes should also be able to live in the
**private personal layer** and be shared the way favourites, ratings,
dietary needs and allergens will be (Themes 9/10), rather than being
public-or-nothing. **Needs its own ADR when built.**

**The inversion to understand first.** This is Faves' **first user-authored
content**. Everything in the personal layer today is *small state pointing
at repo data* — a heart, a rating, a dial, a language. A recipe is the
payload itself: free text, ingredient and step lists, kilobytes not bytes.
That single change lands on storage, the sync blob, the share grant, *and*
the editing UI at once — which is why 11a below is deliberately severable
from the rest.

- **11a — Hide a published recipe, per recipe** `[S]` — the "not in a
  painful way" half. A profile-scoped hidden-set (same shape as favourites);
  the curated collection still ships and still precaches, the user just
  suppresses the ones they don't want. **No backend, no schema change, no
  dependency on Themes 9/10** — this can ship on its own at any time and is
  the cheapest real answer to "stop showing me everyone's recipes".
- **11b — Create/read/update/delete your own recipes** `[L][schema][design]`
  — the substantial one. Local-first, profile-scoped, **never enters the
  repo**. Design calls to make: mobile editor UX (ingredients and steps are
  *list* editors, not one textarea — 44 px targets throughout); whether user
  recipes merge into the Cook at Home collection or form their own "My
  recipes" record; a storage ceiling and what happens at it; and
  **export/import from day one** so a user's own cooking is never trapped in
  one browser — that half is now **Theme 12**, which can ship ahead of this and
  should be built so recipes slot into its collector rather than getting their
  own exporter.
- **11c — Share recipes: all / a set / individual** `[M][constraint]` —
  extends Theme 10's grant model from **per-scope** ("favourites",
  "allergens") to **per-item** selection. That's a real step up, not a
  parameter change: the grant has to carry *which* recipes, and stay
  revocable and re-scopeable after the fact. Otherwise it inherits Theme
  10 wholesale — opt-in, read-only, forward-only revocation.
- **11d — A family shared set** `[L][constraint]` ⚑ — the hardest item here
  and the one to scope last. Theme 10's model is a **one-way, read-only**
  grant; a family cookbook everyone can *add to* is **multi-writer**, which
  brings concurrent edits, conflict resolution, and "who may remove whose
  recipe" — none of which the E2E blob design answers today. Do not assume
  Theme 10 covers it.
- **11e — Which of today's 24 recipes stay public?** ⚑ **Owner call.** The
  steer was "publish some, move some private". 🚩 This intersects the
  **pending family-texture rulings** (Theme 8): the review's open question on
  the `Shane's Ribs` / `Jesse's ...` attributions (first names of people
  *outside* the immediate family, which the 2026-07-06 exception doesn't
  cover) currently has two answers on the table — keep, or rename. Moving
  those recipes into the private layer is a **third** answer, and a better
  one if this theme is being built anyway. Don't rule 11e and the
  family-texture item independently.

**Dependencies and constraints:**

- **11a needs nothing.** 11b needs nothing off-device either (local-first).
  **11c/11d require Theme 9's E2E store** and Theme 10's consent model —
  they cannot precede them.
- **The no-personal-data constraint gets *stronger*, not weaker.** User
  recipes live only in the user's own store, so the owner-approved
  family-attribution exception stops being load-bearing for anything new —
  it only ever has to cover what's deliberately published.
- **Sync-blob sizing needs revisiting** (ADR 0017). The debounced
  single-blob write model was sized for *preference state*; recipe bodies
  are orders of magnitude larger. Check the write/size envelope before
  assuming Theme 9's design carries this unchanged.
- **Offline is non-negotiable as ever** — authored recipes are local-first
  so they're fine by construction, but recipes *shared in* from someone else
  must be cached, not fetched on demand at the stove.
- **Publishing stays a separate act.** A recipe a user authors is theirs;
  nothing here creates a path from a user's device into the repo or the
  public site.

## Theme 12 — Export your data (owner-raised 2026-08-08)

**The ask, raw (owner):** *"save/export all data to a machine readable file.
That would include custom recipes, ratings, favourites etc. Absolutely anything
that the user provides."* Surfaced from the overflow **⋯ menu or Settings**.

**Why it earns its place before the sync themes.** Everything a person puts
into Faves lives in one browser's `localStorage` — a cleared cache, a reset
phone or a "clear site data" tap wipes it with no warning and no recovery.
Theme 9 (sync) eventually fixes that, but it needs a backend, an ADR and the
owner's go. Export needs **none of it**: it works offline, adds no dependency,
no trust surface and no schema change, and it's the honest answer to *"where
does my stuff actually live?"* — the same answer we'll want on record when the
About copy stops saying "no accounts" (Theme 9 addendum 2).

**What "everything the user provides" is today** (the personal layer, verified
against the code 2026-08-08):

| Store | Key | Scope |
| --- | --- | --- |
| Profiles (names + active) | `faves.profiles.v1` | device |
| Favourites (hearts) | `faves.p.<id>.favourites.v1` | per profile |
| Ratings (1–5) | `faves.p.<id>.ratings.v1` | per profile |
| Settings — dietary/allergen prefs, ranking dials, reo language, maps app | `faves.p.<id>.settings.v1` | per profile |
| Order tally | `faves.order.v1` | device-shared |

Plus, when their themes land: **user recipes** (11b — the big one, and 11b
already names export/import as day-one scope), the **hidden-recipe set** (11a),
and **personal tag overrides** (Theme 5). Build the collector so a new store is
one line, not a rewrite.

- ✅ **12a — Export** `[S]` — **shipped 2026-08-08** (owner GO same day).
  `site/js/personal-data.js` (pure, 20 unit tests) + a "Your data" section in
  Settings, directly under the profile switcher. Every design call below was
  built as recorded. Browser-verified end-to-end over CDP, not just unit
  tested: seeded two profiles, clicked the real button, and checked the file
  that landed on disk — both people's data present, the non-active one
  included, and the seeded Near-me coordinates absent from the bytes.
  🔎 **The exclusion had a hole the tests caught**: the catch-all sweep for
  unknown `faves.*` keys would have re-collected `faves.origin.v1` the moment
  it appeared in localStorage, silently defeating the "never export your
  location" promise. The excluded keys now seed the sweep's skip-set.
  ⏳ Owner to eyeball placement/wording at 390 px; iOS in-app browsers can
  refuse a download, which the UI reports rather than failing silently.
  ↪ **Placement superseded 2026-08-08** by the Settings redesign
  ([ADR 0025](decisions/0025-settings-index-and-panels.md)):
  "Your data" is now one of six index rows rather than a section under the
  profile switcher, and "Reset to defaults" moved in beside it behind an inline
  confirm. The owner's 390 px look is still owed and now covers both.
  Original spec, as built:
- ~~**12a — Export** `[S]`~~ — a "Download my data" action that serialises the whole
  personal layer to one versioned JSON file via `Blob` + `<a download>`
  (`faves-data-YYYY-MM-DD.json`). Vanilla, offline, zero-dep. Design calls
  already made, to save the build session re-deciding them:
  - **All profiles, not just the active one.** It's a backup, not a view.
  - **Versioned envelope** (`{ v: 1, exportedAt, profiles: [...], device: {...} }`),
    not a raw `localStorage` dump — the on-disk shape is a contract we have to
    keep reading, and the internal keys are not.
  - **Exclude the Near-me origin** (`faves.origin.v1`). It's ephemeral
    `sessionStorage`, it's the user's *location*, and nobody wants their
    coordinates in a file they email themselves. Note the omission in the file.
  - **Human-legible JSON** (pretty-printed, venue/dish **ids and names**). It's
    "machine readable" as asked, but a person opening it should recognise their
    own favourites. Ids alone rot silently when data changes (ADR 0020).
- ✅ **12b — Import** `[M][design]` — **shipped 2026-08-09**
  ([ADR 0030](decisions/0030-personal-data-import-and-transfer.md), proposed —
  owner to ratify). `parsePersonalData` → `planImport` → `applyPersonalData`
  in `personal-data.js` (pure, 30 new unit tests), and a file picker + preview
  in Settings → Your data. Every design call above was built as recorded:
  merge default reusing `favourites.merge()`, replace behind a confirm that
  names who it deletes, collisions asked rather than guessed, allergen prefs
  never moved without a deliberate choice showing both sides in full.
  🔎 **The collision rule needed widening mid-build.** "Same id = same person"
  is false here: `profiles.js` mints the first profile on every device as
  `default`, so a *friend's* export collides with yours by construction and
  would have silently merged two people's allergen settings. The rule is now
  "ask unless id **and** name both agree".
  Browser-verified end-to-end over CDP at 390 px, not just unit tested:
  exported a real file, imported it back (a no-op, and it says so), imported a
  doctored from-another-phone copy (both questions raised, Add disabled until
  answered, allergens combined on request), and replaced the device from it.
  ⏳ Owner to eyeball placement/wording at 390 px — the panel is now 778 px
  against ~790 px of sheet, so it fits but has no room left.
- ✅ **12c — Lean the sync themes on it** `[S]` — **done 2026-08-08 with 12a.**
  `collectPersonalData(storage, { exportedAt })` is the shared seam, built one
  step more general than export needed: it reads the raw device storage rather
  than the live per-profile singletons, so it sees *every* profile. ADR 0017's
  sync push encrypts its output; Theme 10's grant takes a subset of it.
  **No `apply` counterpart was written** — deliberately. Its semantics *are*
  12b's open design calls, so a speculative applier would have silently
  answered them. Original note:
- ~~**12c — Lean the sync themes on it** `[S]`~~ — the collector 12a needs
  (*gather the whole personal layer into one serialisable object; apply one
  back*) is **exactly** what ADR 0017's sync blob push/pull needs, and what
  Theme 10's share grant needs a scoped subset of. Build it once as a
  `personal-data.js` collect/apply pair rather than three near-identical
  serialisers. This is the cheap "lean the right way" move — do it in 12a even
  though 12a alone doesn't need the seam.

**Placement** — owner said "menu **or** settings"; ✅ **ruled Settings
2026-08-08** and built there, in a "Your data" section directly under the
profile switcher (the export covers every profile in that list, so it belongs
beside it). Cheap to move if it reads wrong on a real phone.

**Constraints check:** no backend, no accounts, no dependency, works offline,
no personal data enters the repo (the file is the *user's*, written to their
own device). ✅ Clear on all of them — which is why 12a is `[S]` and
unblocked, and can ship any time.

**Sequence:** ✅ 12a + 12c shipped 2026-08-08. 12b when there's enough in the
personal layer to be worth restoring — realistically alongside **11b** (user
recipes are the first data a person would genuinely mourn) or **Theme 9 v1**.

## Theme 13 — What the time dimension unlocks (owner-raised 2026-08-08)

The data model landed 2026-08-08 (ADR 0023): prices, menus, dishes and venues
all carry dates now, and `temporal.js` resolves them to "today" before the UI
sees anything.

**Owner's framing, 2026-08-09 (read this before building any of it).** Capturing
price history is **not a core function of this app** — Faves exists to answer
*what do I eat tonight*. The history is **valuable data gathered as a by-product** <!-- datescan:allow: product vocabulary — "eat tonight" is the question this app answers, not a dated claim -->
of work we do anyway: every menu refresh is already a dated reading. It accrues
at zero extra cost, and it is the one thing that **cannot** be added later —
hence the model now, the features whenever they earn their place.

The eventual use splits in two, and they are different products with different
bars:

| | Surface | Bar it must clear |
|---|---|---|
| **A** | A **dedicated section** — the research/analysis basis (trends, comparisons, what's risen fastest) | Opt-in, off the main path. Free to be denser, because nobody lands there by accident |
| **B** | **Inline in the primary flow**, where it helps the eat-tonight decision — the owner's example: *coffee is $6 from tomorrow* | Must earn its pixels against the core job. If it doesn't change what you order, it doesn't belong on the card | <!-- datescan:allow: owner's verbatim example of the feature ("$6 from tomorrow") — quoted product vocabulary, not a dated claim -->


⚑ **Owner's call, deliberately deferred: when there is enough data to be worth
using, and which surface goes first.** Baseline at adoption (2026-08-08):
**1 venue of 31** has more than one price reading (Churton, 174 dishes), and
only **2 of 31** carry a `verified` date at all. So: not yet, by a distance.

**What makes it accrue — the one operational rule.** A menu refresh must
**append** a price reading, never overwrite. This is not hypothetical: the
Churton refresh discarded seven years of prices in a single commit, and they
were only recoverable because git happened to hold them. Recorded in
`ARCHITECTURE.md` ("Refreshing a menu") and `CLAUDE.md`. Every refresh done that
way adds a reading to the corpus for free; every one done the old way silently
destroys one.

**a. Upcoming price changes (surface B)** — *owner's example: "coffee will be $6
from Wednesday".* Already a working data fact: an entry with a future `from`
resolves correctly (the current day keeps its price) and `pending()` returns the
announced one. Nothing renders it. Open design calls, the owner's:
- Where it shows — a quiet "→ $6 from Wed" beside the price, or only on the
  dish page? The dinner-choosing UX must not turn into a pricing dashboard.
- Does the order tally warn when a pending change lands before you'd collect?
- Who supplies the dates — a shop's posted notice is the honest source; we
  never extrapolate a rise we were not told about.

**b. Price trends (surface A)** — `priceSeries` already rides on every resolved
dish that has history. Churton is the proof case: 174 dishes with a 2019 and a
2026 price, median rise **50%** (mean 54%, range 16–120%). Possible shapes,
cheapest first: a per-dish "was $10.50 in 2019" line · a sparkline on the dish
page · a venue-level "prices up ~50% since 2019" · a cross-venue view of what
has risen fastest. **Honesty constraint, non-negotiable:** two readings seven
years apart is not a trend line — it is two points. Nothing drawn from them may
imply we watched the intervening years, and a `recorded`-dated entry ("we read
it then") must never render as a `from`-dated one ("it changed then").

**c. Menu seasons in the UI** — the model supports recurring NZ seasons on any
section or dish, so a winter menu is one fact that returns every year. Nothing
surfaces it yet: a "summer menu" badge, or a "back in winter" note on an
out-of-season favourite, would both read well. Needs real seasonal data first —
no venue in the corpus has any.

**d. Dish revisions on the page** — the `revisions` log (the muffin that went
vegan) is recorded but never rendered. A "changed 1 Aug: now vegan" note on a
dish is genuinely useful to a returning diner, and doubly so when the change is
an *allergen* one. Deliberately not shipped with the model: it is new UI, and
the owner's brief was that choosing dinner should look exactly as it did.

**e. Venue history** — `lifecycle` holds `opened` (world) and `added` (record).
`added` is populated for all 31 venues from git; **`opened` is empty everywhere**
because we have never established it for any venue. Filling it is content work
(the owner or a venue's own site), not a build. It would unlock "in Faves since
July 2026" and "trading since 1998" lines, and an honest "new to Faves" badge.

✅ **f. `verified` carries its derivation** — shipped 2026-08-09
(ADR [0031](decisions/0031-verified-carries-its-derivation.md)): a sibling
**`verifiedBy`** naming one of six source classes, at **record** granularity
with an optional per-reading `method` override on a price-series entry.
Per-price as the primary level, an object-valued `verified` and a confidence
score all rejected — reasoning in the ADR. No backfill; applied to the two
records whose provenance `SESSIONS.md` evidences. Design record →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

✅ **g. The "needs a refresh" caveat reads the method, not the date** — shipped
2026-08-09 (ADR [0036](decisions/0036-refresh-caveat-reads-the-method.md)).
Owner ruled the split: a reading counts as a check when it came from the shop
itself (`in-store` · `paper-menu` · `official-site` · `phone`), and *"not third
parties like delivereasy, uber etc"*. A **12-month** age limit rides on top —
a house default, flagged as such in `temporal.js` and retunable on one line.
`refreshCaveat()` returns four distinct reasons (`never` · `unknown-method` ·
`untrusted` · `stale`), so one null stops standing for two things, and the
untrusted wording names its source. TJ Katsu and Sushi Bi now carry the honest
`2026-08-08` / `official-site` the session log evidences.
🚩 **Owner call left open:** TJ Katsu's caveat switches *off*, because the
policy ages *our reading* (2026-08-08) and we have no field for how old the
*source document* is — its site is ©2017 with a 404ing nav. See the ADR's
consequences; the fix, if he wants one, is data, not a special case.

<details><summary>The item as raised by 13f, and the owner's ruling on it</summary>

- **g. The "needs a refresh" caveat should read the method, not the
  date** `[S][ux][content]` — raised 2026-08-09 by 13f, deliberately not
  fixed there. The menu screen shows its ⓘ "menu items and prices need a
  refresh" caveat when `verified` is null. Now that a reading states its
  method, the bare presence of a date is the weaker signal — a
  `third-party` or `delivery-app` reading should arguably still caveat,
  and a freshly dated `in-store` one should not. The concrete cost as
  things stand: **TJ Katsu and Sushi Bi sit at `verified: null`** although
  `SESSIONS.md` (2026-08-08) records exactly when and how both were read
  (`official-site`), *partly because* setting a date would silently switch
  off a caveat that is right — TJ Katsu's source site is visibly stale
  (©2017, its own nav 404s). That is §9's "unknown is not none" still live
  in this corpus: one null standing for "never read" and "read from a
  source we don't fully trust". The fix is a stated policy on which methods
  count as a check (and whether age enters it), then the two records gain
  honest dates. **Owner call, not a build call** — a threshold picked by an
  agent would change live UI on judgement rather than evidence.

</details>

## Theme 14 — Order it the way you eat it: add-ons & customisation (owner-raised 2026-08-09)

**The two asks, raw (owner):** *"the ability to customise a dish e.g. no tomato
in a big breakfast"* and *"re-interpret menus to align add-ons to a dish, making
it easy to specify add-ons… 'Thick Cut Fries' at Sprig + Fern Tawa has 'Add gravy
$3.' within its description, I want that to be an add-on you specify… similarly
their brunch sides are add-ons to all the brunch dishes — I should be able to
select 'Eggs on Toast' and add-on Halloumi and add that dish to the order."*

They are one feature with two halves: **what the menu offers** (structured
add-ons, priced) and **what you ask for** (customisation, usually a removal and
usually free). Both end in the same place — an order line that says what you'll
actually say at the counter.

**The prose is already there, it's just unstructured.** Verified in
`sprig-and-fern-tawa.json` 2026-08-09: `"Served with aioli. Add gravy $3."`,
`"Add chicken, halloumi, prawns or beef +$7."`, `"No gluten added bun +$2.5."`,
`"Gluten free toast +$2."` — plus a whole **brunch sides section** (Halloumi
$7 and friends) that is really an add-on group for every brunch dish, not a set
of things you'd order alone. The information is captured; only the *shape* is
wrong.

- ✅ **14a — Structured add-ons** — **shipped 2026-08-16** (ADR 0048):
  venue-level `addOnGroups`, `select: one|many` + `max`, group price default,
  required per-option `tags`. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **14d — an add-on carries its own tags** — **shipped with 14a**, as it
  insisted. Allergens union, dietary claims intersect. Detail →
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **14e — Order-tally knock-ons** — **shipped 2026-08-16**. Line identity is
  now `(venueId, name, selectionKey)`; the share codec deliberately did *not*
  bump. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- [ ] **14b — The content sweep** `[M][content]` — retro-fitting the corpus is
  the bulk of the work, not the code. Pattern-match `Add …$` / `+$` in every
  `desc` and convert; keep the prose only where it isn't an orderable choice.
  Model it on `tools/tag_allergens.py` (ADR 0024): a re-runnable script plus a
  `validate.py` warning, because a hand sweep across 31 venues is exactly how
  the allergen inconsistency got created in the first place.
- [ ] **14c — Customise / omit** `[M][design]` — "no tomato" is a *removal*, and
  we have no ingredient lists for restaurant dishes (only Cook-at-Home recipes
  carry ingredients), so there is nothing structured to remove **from**. Two
  honest options: a **free-text note per order line** (works everywhere, ships
  now, and is what you'd say out loud anyway) or **curated removable components**
  per dish (structured and safe, but it's the whole ingredient-transcription
  problem for 31 venues). Recommend the note now; components only if a venue's
  data ever justifies it.
- [ ] **14f — Combos: several dishes ordered as one** `[M][schema][design]`
  (owner-raised 2026-08-16) — *"the concept of Combo's e.g. coffee and scone,
  where multiple dishes are combined to make a dish to order them together with
  its own pricing."* Distinct from an add-on: an add-on modifies one dish, a
  combo **is** a dish assembled from others, at its own price. 🔎 **They already
  exist in the corpus, flattened.** `wellington-kebab-grill.json` carries a
  `Combos` section — "Kebab combo #1, $22.50, Your choice of kebab, chips and a
  330ml Coca-Cola drink" — as three plain dishes whose *composition lives in
  prose*. So the feature is not "add combos", it is "give the composition a
  shape". Design calls: does a combo reference member dishes by id (then the
  order line can itemise, and dietary tags compose — the Theme 14d problem
  again) or stay a standalone priced item with a description? Does "your choice
  of kebab" make a combo a **pick-one group over other dishes**, which is
  structurally the same machinery as 14a's single-select add-on group? If it
  is, build 14a first and 14f becomes small. Note the third case already in the
  same file: **"Combo upgrade, $6, Added to a kebab, mixed kebab, iskender or
  salad"** — that is an *add-on that turns a dish into a combo*, so 14a and 14f
  meet in one record.

**The worked example, transcribed from the counter board (2026-08-15, in
store).** The owner photographed Wellington Kebab Grill's "EXTRAS & SAUCES —
customize your meal" card. Everything **priced** on it is already in the payload <!-- spellscan:allow: verbatim quote of the venue's own printed card, which spells it the US way — correcting it would misquote the shop -->

(the three drinks, all five extras). The one part that is not is the part with
nowhere to go — which is the whole of this theme:

- **"Choose your kebab toasted or fresh"** — pick-one, free. A 14c
  customisation with exactly two options, so the "no structured thing to remove
  from" objection does not apply; it is a choice the venue itself offers.
- **"Our delicious sauces — choose up to 3"** — multi-select, free, **capped at
  three**: Garlic yogurt · Plain yogurt · Hot chilli · Mild chilli · Tomato
  sauce · Mayonnaise · Sweet chilli · Satay · Tahini · Garlic aioli · Mint
  sauce · BBQ sauce.

Three things this one card settles that the theme had left open:
- 🚩 **A free add-on is still an add-on.** Every design note above assumed a
  price (`Add gravy $3`). Twelve sauces at no charge are the commonest kind of
  add-on there is, so `price` must be optional in the 14a shape — and a missing
  price must mean **free**, not the `priceUnknown` "we don't know" state the app
  already uses for unpriced dishes. Those two are opposite claims and must not
  collide.
- 🚩 **A cap is part of the group, not the UI.** "Up to 3" is a rule the venue
  set; it belongs in the data (`max`), or the order sheet will happily produce
  something the shop will refuse to make.
- 🚩 **Satay is the 14d case, in the flesh.** Adding satay to a kebab makes it
  contain peanuts — the single most serious allergen in the app's vocabulary,
  on a dish that carried no warning when you tapped it. This is the concrete
  proof that 14d ships *with* 14a and not after it: an add-on layer without
  allergen composition would let the app show a clean dish that the reader then
  configures into an anaphylaxis risk, silently. **No add-on UI ships before
  `dishFlagged`/`dishSatisfiesDiet` evaluate dish + selections.**

✅ **The sauce list moved into `site/data/restaurants/wellington-kebab-grill.json`
on 2026-08-16**, discharging the ⏳ above exactly as it said it would: a screen
renders add-ons now, so ADR 0047 lets the payload carry them. The paragraph
stays as the design input it was.

**Three things 14a left open, named rather than hidden.**
- 🚩 **A group has a `max` but no `min`.** "Choose your kebab toasted or fresh"
  is not optional at the counter — you will be asked — and a pick-one group
  left unanswered produces a line the shop cannot fill without asking. That is
  the same class of defect as exceeding a cap, and `max` alone does not catch
  it. Left out of v1 deliberately to keep the shape small.
- 🚩 **A preparation-only option has to fake its tags.** "Toasted" adds no
  ingredient, but under the intersection rule an empty `tags` would strip `gf`
  off a gluten-free kebab for choosing it. The pilot data works around this by
  writing vacuously-true claims (`vg, gf, df`) on both options. It is fail-safe
  either way, but the honest fix is a group-level marker saying the group
  changes method rather than contents, so composition can skip it.
- ✅ **Converted rows existed twice; ruled and fixed the same day.** Wellington
  Kebab Grill's five `Extras` and Sprig & Fern's twelve `Brunch Sides` were
  each both an orderable dish and an add-on option. 🎯 **Owner ruled
  2026-08-16: hide the duplicated section** — given the stated cost, that a
  heart or rating saved against a hidden row stops appearing. `addOnsOnly` on
  the section (ADR 0049); the rows stay in the record so old links, hearts and
  `picks` still resolve, and `validate.py` refuses the flag unless every row it
  hides is reachable as an option. Theme 25 may retire it entirely.

**Sizing for 14b, measured 2026-08-16 rather than estimated.** Across the 48
records: **28** dish descriptions carry a priced add-on in prose, **63** carry
an unpriced choice, **17** dishes *are* add-ons wearing a dish's clothes, and
**11 sections across 9 venues** (92 rows) are add-on groups rather than things
you would order alone. Four of those venues are one pub group with near-
identical prose, so one modelling decision covers them all.

## Theme 27 — Search ranking: a name match is not a cuisine match (2026-08-16)

<!-- Numbered 27 after `grep '^## Theme' docs/ROADMAP.md`; 25 and 26 were taken
     by parallel sessions on the same day. Re-check at merge, not at write. -->

🔎 **A measurement, not a hunch.** Comparing, for every one of the 51 cuisines
and areas in the corpus, the venues `applyFilters` returns against the venues
`search()` returns for the same word: the two agree exactly on **45**, and on
the other **6 search never misses — it adds**. The haystack includes name,
address, city, service and phone as well as cuisine, so:

| Search for | Also returns | Because |
|---|---|---|
| "Pub" | 6 places, **5 of them not pubs** | the name contains "Pub" |
| "Bar" | 1841 Bar & Restaurant, Charley Noble, Southern Cross, The Catch Sushi Bar | the name contains "Bar" |
| "Cafe" | KC Cafe, Satay Kingdom Cafe — neither tagged Cafe | the name contains "Cafe" |
| "Courtenay Place" | Dragonfly, Regal Chinese, The Catch Sushi Bar | the address contains it |

**This is not a bug, and that is the point of recording it.** A wide haystack is
correct for free text — you typed "Pub", and a place called The Pub is a fair
hit. The question is one of **ranking, not matching**: today a venue that *is*
Malaysian and a venue merely *named* "…Malaysian" are indistinguishable in the
result list, so the reader cannot tell a property match from a spelling
coincidence. [ADR 0050](decisions/0050-a-facet-link-filters-the-list-rather-than-searching.md)
records why this kept the facet links off search; it did not settle what search
itself should do.

- [ ] **27a — Rank a facet match above a text match** `[M][design]` — weight a
  hit on `cuisine`/`area` above one on `name`/`address`, so the six above still
  *appear* but sort below the venues that genuinely carry the property. Cheaper
  and less surprising than narrowing the haystack, which would lose real finds
  ("Charley Noble" is a fair answer to "Noble").
✅ **27b — Say which field matched — SHIPPED 2026-08-16** (`80da634`). `search()`
now returns `matchField` (which field answered the query) and `matchText` (the
literal substring, correct casing, when that field is one the row displays). A
visible field gets a `<mark>` in the name or sub; a field the row never shows —
address, city, phone, service, a dish's description — gets plain text saying so
("Matched: address"). A hit is never left with no stated reason, and never claims
a property it did not match. Bold as well as background, so it never depends on
colour; the wrapped word is already inside the announced name, so a screen reader
hears identical text either way.
⚠️ **27a is now probably unnecessary, which was the point of trying 27b first** —
but that is a judgement to make against the running app, not from here.
🔎 **This item's own measurement has already gone stale.** Re-running the
roadmap's four queries in a real browser at 390 px: "Bar" reproduced its four
cited venues exactly, and "Courtenay Place" its three plus two more — but **"Pub"
no longer returns 6 places with 5 name-coincidences**, because the corpus has
moved since that measurement was taken. The mechanism handled it correctly
regardless. Treat every count in this file as of its stated date.

- **Owner steer, 2026-08-16:** recorded, not scheduled — *"roadmap it, don't fix
  now"*. Nothing here is blocking; it surfaced while measuring something else.

## Theme 26 — Saved orders: the usual (owner-raised 2026-08-16)

<!-- Numbered 26, not 25: a parallel session took 25 (dish ids) while this
     branch was open, exactly as the note on Theme 19 warns. Checked with
     `grep '^## Theme' ROADMAP.md` at merge, not at write. -->

**The ask, raw (owner):** *"Saved orders. For example saving an order for Subway
that I use each time."*

**What it is.** A named, reusable order for one venue — "my Subway" — recalled
into the tally in one tap instead of rebuilt dish by dish. The app already holds
every piece: `cart.js` is a local offline order model, `favourites.js` already
persists per-venue picks, and `share-codec.js` already serialises a whole order
to a URL fragment for group ordering. A saved order is that codec's payload,
kept locally under a name, rather than sent to someone.

**Why it is queued behind Theme 14, not beside it.** A saved order has to record
*what you actually order*, and for Subway that is nothing but add-ons — bread,
salads, sauces. Saving orders before add-ons exist would save a shape that is
about to change, then need a migration on a store that lives in people's
browsers where we cannot see it or fix it. Build 14a first, then save.

🔗 **Depends on Theme 25 (dish ids), and so does 14f.** A saved order and a
combo both need to *point at a dish* and still find it after a refresh. That is
the same question Theme 25 asks, arrived at from two directions — settle it once,
there, before either of these designs commits to a reference shape.

- [ ] **26a — Save and recall** `[M]` — name an order, list saved orders per
  venue, recall into the tally, delete. Local-first like every other personal
  store (`store.js`), so it works offline and never leaves the device.
- [ ] **26b — Carry it across devices** `[S]` — falls out of Theme 12's personal
  transfer/sync for free if the store is shaped like the others; check that
  before designing anything bespoke.
- [ ] **26c — What happens when the menu moves under it** `[M]` 🚩 **the real
  design problem.** A saved order references dishes and prices that a refresh
  can change, rename or remove — and `renames.js` already exists precisely
  because ids move. So recall has to answer honestly: *this dish is $2 dearer
  than when you saved it*, *this dish is gone*. Silently recalling a stale price
  into the tally would make the app lie about the total, which is the one thing
  the price work has been careful never to do. Model it on the refresh caveat
  (ADR 0036): say what changed, let the reader decide.

## Theme 15 — UI consistency, navigation & layout (owner-raised 2026-08-09)

✅ **`.order-head` collision — fixed 2026-08-09.** Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).
✅ **"Your data" panel split — fixed 2026-08-09.** Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

**a. Settings: alternatives to drill-in** `[M][design]` ⚑ — **owner, raw:**
*"With the new Settings UI I am considering alternative options to a sub-menu
design but I like the grouping/headings you have used. Perhaps accordion or
collapsing sections to make it easier."* The grouping stays either way; this is
about the *navigation*, not the taxonomy.

🚩 **Read [ADR 0025](decisions/0025-settings-index-and-panels.md) before
proposing anything** — "accordion sections in one sheet" is its **first rejected
alternative**, on measured grounds: several open sections rebuild the same
1578 px wall, and expanding one shifts everything below it, so the scroll-jump
lands hardest on the 390 px screen the redesign existed to fix. Reopening it is
the owner's call, but a rebuild must answer that, and if built it **supersedes
ADR 0025** (never edit an accepted one).

The shape most likely to satisfy both: keep the index exactly as it is —
including each row's **current-value subtitle**, which is what makes one screen
answer *"what have I set?"* — but have a row **expand in place with only one open
at a time**, auto-collapsing the others. That kills the wall and bounds the
scroll-jump while dropping the drill-in gesture. 🎯 **Owner call first:** the
drill-in only landed 2026-08-08 and its 390 px real-phone look is **still owed**
(it's the same pending eyeball as Theme 12a). Judge the current build on the
phone before commissioning a replacement for it.

✅ **b. One noun for one thing — shipped 2026-08-09**
([ADR 0035](decisions/0035-one-noun-place-and-branch.md), wt:
`faves-one-noun`). Two nouns and only two: **place** for a venue as the reader
sees it (the owner's steer, and the only candidate that isn't false for *Cook at
Home* — your own kitchen is a place, not a venue), **branch** for one location
of a place that has several. *venue*, *restaurant* and *spot* retired from
user-facing copy. The trap was resolved, not papered over: each dial now names
its own subject — "Hide **places** further than" over "Show **a place's**
branches within" — so two different jobs stop reading as one. 18 strings across
11 files; the reo lockstep held (one keyed string moved, and *wharekai* —
specifically an eating-house — would have desynced the moment the English
stopped saying "restaurants"). 🎯 **Two judgement calls the owner may want to
overrule, and one pre-existing flaw found:** detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

**c. Home screen: one place for filters** — ✅ **MEASURED AND BUILT 2026-08-16.**
The owner re-raised it from his own iPhone (*"On the iPhone its pretty bad"*),
so it was **measured in real headless Chrome** rather than reasoned about, and
then built on his ruling. What the measurement changed:

| At 390 × 844 | Before | After the redesign |
|---|---|---|
| Chrome above the first result | **50.7%** | see the build's own figures |
| …arriving via a facet link (`?cuisine=`) | **58.4%** | |
| Result cards fully visible | **3** | |
| Fixed bar, at every scroll depth, forever | 122.2 px = **14.5%** | |

At 1280 × 800 it is 36.1% — **one design, not two**: both rows wrap below 34rem,
same cause. 15c's own `--bar-h: 7.6rem` claim was confirmed exactly (122.2 px),
as was "six places" (exactly six).

🔎 **Two live defects fell out of the measurement, neither of them a design
question.** `.segmented button` was `min-height: 40px` — a standing breach of
CLAUDE.md's 44 px hard constraint, and fixing it *pushes `--bar-h` higher*,
which is its own argument for the redesign. And "Pick for us" covered
**48 × 30.3 px of a venue's heart — 63% of a 48 px control, unreachable**.

🔎 **The redundancy finding, which no amount of layout work would have found.**
The service segmented control returns **38 of 47 places for "Takeaway" (81%)**
and **37 of 47 for "Dine-in" (79%)**; 60% of places offer both. It removes a
fifth of the list — and it is the *sole* reason `--bar-h` was 7.6rem rather than
4.6rem (`.segmented { flex: 1 1 100% }`), costing **54.4 px of permanently fixed
screen**. The same argument was already accepted on 2026-08-16 when "Dine-in,
Takeaway" was dropped from every card (`app.js:45-49`). Also: two of the four
chips (Near me, Along a route) are **sort modes, not filters** (ADR 0014), sitting
in an undifferentiated row — which is why the sheet separates "Narrow to" from
"Sort by".

**Thumb reach — the trade 15c said would decide it, answered with evidence.**
The bar cost 14.5% of the viewport at every scroll depth across a 7.5-viewport
document, to save *one tap* on `to-top.js`, which already ships. Reach is bought
by having a control down there, not by 122 px of it: a 44 px entry in a 66 px bar
keeps 100% of the reach for 54% of the pixels. It stays a **bar, not a FAB** —
`main`'s padding reserves a bar's space, and the FAB overlap above is measured
proof of what a fourth floating control does.

**Original ask, for the record — owner, raw:**
*"I am considering moving the bottom section of the main page that filters
Everywhere vs takeaway vs dine-in, location/suburb, and cuisine to sit with the
other filters like Open now, cheap eats etc."*

The split is real and hard to justify to a first-timer. Today's home screen
filters live in **two places**: the sticky bottom `.filter-bar` (service
segmented control + Area + Cuisine selects) and the in-flow `.list-toggles`
row above the results (Open now · Cheap eats · Near me · Along a route). Same
job, two locations, and nothing on screen explains the division.

Three things the merge has to answer — the third is the one that will decide it:

- **Mixed control types.** The toggles are `aria-pressed` buttons; Area and
  Cuisine are `<select>`s. Dropping a dropdown into a chip row looks like a
  mistake unless they converge — either the selects become chip-style menus, or
  the chips move into the bar. Nine controls at 390 px is also, precisely, the
  wall the Settings redesign (`0025-settings-index-and-panels`) hit; a wrapping
  chip row handles it, a fixed bar does not.
- **`--bar-h` is load-bearing.** The bottom bar's height is referenced in six
  places — `main`'s bottom padding, the "Pick for us" FAB, back-to-top, the
  order bar. Removing the bar isn't a delete; it's re-anchoring everything that
  sits above it. **Points in the owner's favour:** at the narrowest widths
  `--bar-h` is **7.6rem** (the bar wraps to two rows), so it's eating a real
  slice of a 390 px screen for three controls.
- 🚩 **Thumb reach is what the bottom bar buys, and the merge spends it.** The
  bar is reachable at any scroll depth; `.list-toggles` sits above the results
  and scrolls away, so post-merge you'd scroll back to the top to change
  cuisine. That's the whole trade. Two ways to keep it: make the merged group
  **sticky** under the search field, or keep a slim bottom bar that collapses to
  a single **"Filters (2)"** button opening a sheet — thumb-reachable, one
  control, and it scales as filters keep being added (the same lesson the Settings
  redesign
  learnt about growth). Recommend deciding *this* first; the visual merge is
  easy once it's settled.

Low-risk otherwise: the selects are JS-populated so the no-JS fallback is
unaffected; watch the landmark change (`<nav aria-label="Filter restaurants">`
disappears) and keep the filters adjacent to the `role="status"` result count,
which is a genuine a11y gain — change a filter, hear the new count.

✅ **15x — The desktop filter row — SHIPPED 2026-08-16** (`f619722`), after
being asked for twice and living only in a session log's "owed" list. One
`#filter-controls` section now **moves** between the sheet and an inline host —
a DOM move, so state and listeners survive and there is never a second copy.
🔎 **The breakpoint lives in JS only.** A CSS media query carrying a second copy
of the number could disagree with the move, and that failure mode is a row
styled as an inline panel while it is actually inside a *closed* dialog.
🚩 **The quirk that bit was not the predicted one.** Focus surviving the
narrow→wide re-parent worked first time — Chrome kept it on `#filter-area`
across a `close()` and a re-parent. The hard case is going wide with the sheet
**open**: everything outside an open modal `<dialog>` is inert, so it must close
first — but `close()` parks focus on the very button the move then hides. Capture
`activeElement` **before** the close, restore **after** the hiding. Breaking that
one line fails two assertions in `tools/filter_row_check.mjs`.
⚠️ **Residual, not fixed:** on wide screens `<nav aria-label="Filter places">`
now holds only "Pick for us" and the order pill, so its label is slightly off.

- [ ] 🚩🎯 **15y — the ⓘ disclosure fails WCAG 2.2 SC 1.4.13 on its hover path**
  `[S][js][css][a11y]` — found 2026-08-16 while fixing the flicker below it, and
  **not** fixed in the same pass, because the fix is a design call the owner
  should make rather than a quiet edit.
  ⚠️ **Restored 2026-08-16 after being deleted while still open.** `caa588d`
  harvested the adjacent 15x and took this `- [ ]` item with it; it reached
  neither `ROADMAP-DONE.md` nor a fix, and survived only as prose in
  `SESSIONS.md`. **A harvest must move `[x]` items and nothing else** — an open
  item adjacent to a closed one is the easiest thing in this file to lose, and
  an unfixed accessibility failure is the worst thing to lose quietly.
  `disclosure()` (`site/js/disclosure.js`) is shared by the settings allergen
  caveat and the menu's freshness / "needs a fact" notes. Its **click** path is
  sound — Escape closes it, an outside click closes it, `aria-expanded` tracks.
  Its **hover** path is not, and SC 1.4.13 (Level AA — the repo's stated
  non-negotiable bar) asks for three things:
  - **Hoverable** ❌ the rule is `.caveat-btn:hover ~ .caveat-note`, keyed on the
    *button* alone, and `margin-top: var(--space-1)` puts a gap between the two.
    Move the pointer toward the note to read it and the note disappears. Text you
    cannot travel to is text a slow reader, a magnifier user or anyone with a
    tremor cannot finish.
  - **Dismissible** ❌ `setOpen()` attaches the Escape handler only when the note
    is *clicked* open, so a hover-revealed note cannot be dismissed without
    moving the pointer — which matters most for the magnifier user it is covering
    content for.
  - **Persistent** ✅ nothing times it out.
  🎯 **The call for the owner.** The cheap structural fix — close the gap so the
  button and note form one continuous hover target — changes the note's visible
  box, i.e. changes a shipped component's look. The zero-visual fix is a
  transparent bridge (`.caveat-note::before` spanning the gap) plus a hover-path
  Escape handler in `disclosure.js`: more machinery, no design change. The third
  option is to drop the hover reveal entirely and make every ⓘ click-only, which
  is what the settings one now is — one behaviour everywhere, nothing to get
  wrong, and mouse users lose a nicety they never had on a phone.
  **Recommend the third**: it is the only one that leaves a single ⓘ behaviour
  across the whole app, and consistency is the standing Theme 15 goal.

## Theme 16 — Staying current: PWA updates & a manual refresh (owner-raised 2026-08-09)

**The report, raw (owner):** *"the ability to force a full refresh of data
(restaurants, menus, codebase etc). I am finding the PWA on my phone is not
checking for new versions on open. I have to kill the PWA app (unload from
memory) and then it refreshes on next load. We should also fix the auto-refresh
for PWA."*

🔎 **Diagnosed 2026-08-09 — the symptom is exact and the cause is in our code,
not the platform.** [`sw-register.js`](../site/js/sw-register.js) is nine lines:
it calls `navigator.serviceWorker.register()` on `load` and **nothing else** —
no `registration.update()`, no `updatefound` handling, no reload path. A browser
only re-fetches `sw.js` on a **navigation** (plus a ~24 h background check), and
a standalone PWA resumed from memory performs no navigation. So "kill it and
relaunch" is the *only* thing that currently triggers an update check. That is
precisely what the owner is doing.

There is a **second** half, easy to miss: even once the new worker installs,
`sw.js` calls `skipWaiting()` + `clients.claim()`, so it takes control
immediately — but the page already on screen keeps the HTML, CSS and modules it
loaded. **Nothing reloads it.** So "check for updates" and "show the new
version" are two separate fixes, and doing only the first changes nothing
visible.

- ✅ **16a — Check on resume** — **shipped 2026-08-09** (`site/js/sw-update.js`
  + `sw-register.js`, 10 tests): `registration.update()` on `visibilitychange`
  (becoming visible) and `focus`, throttled to once every five minutes through
  one shared gate, so fifty app-switches in a minute cost one request. The
  throttle, the resume test and the reload guard are a pure module so
  `node --test` can execute them.
- ✅ **16b — Tell the user, then reload** — **shipped 2026-08-09**
  (`site/js/update-notice.js`): a dismissible banner, "A newer version of Faves
  is ready", with Refresh and Not now. Refresh activates the waiting worker and
  reloads; Not now leaves it for the next cold start. **The notice won**, as
  recommended — no auto-reload, since the search query, scroll position and
  dietary chips don't survive one. English + te reo strings both in `reo.js`
  (drafts, flagged for the reo review).
- ✅ **16c — "Force a full refresh"** — **shipped 2026-08-09**
  (`site/js/cache-refresh.js` + Settings → Your data, 8 tests): clears the shell
  and data caches, unregisters the worker, reloads — the fresh load re-registers
  and rebuilds from the network. Both rules held: **offline is a refusal**, not
  a warning, re-checked at the confirm as well as the first tap; and the
  personal layer is untouched — a test asserts the module never so much as names
  `localStorage`. Photos survive too (capped runtime cache, not what goes
  stale). Wording says plainly it refreshes menus and app code, not your stuff.
- ✅ **16e — About shows the installed versions** — **shipped 2026-08-09**
  (`site/js/versions.js`, 9 tests): an "App" and a "Menus & prices" stamp read
  from the service worker's cache names, so it reports what the device has
  actually stored rather than what the source claims. 🎯 **Owner asked for
  *"all the relevant versions… e.g. code base vs restaurant/menu data etc"* —
  the two named are shipped; the "etc" is left open deliberately.** An audit
  found the only other version stamps in the app are **internal storage-schema
  keys** (`faves.*.v1`, the export envelope's `v`, the share codec's) — they
  identify a data *shape*, never freshness, and would read as noise to a diner.
  Say the word if they should show anyway (they would help when debugging a
  weird device). The genuinely missing piece isn't another number: it's
  **"is this the latest?"**, which needs 16a's update check to answer.
- ✅ **16d — Version skew, named so it isn't discovered the hard way** —
  **decided and shipped 2026-08-09**
  ([ADR 0027](decisions/0027-pwa-update-flow.md)): the unconditional
  `skipWaiting()` is **gone**. A new worker holds in `waiting` until the page
  posts `{type:"SKIP_WAITING"}` on 16b's tap, so an old page is never served
  new assets from caches its own worker has just swept. Ignore the notice and
  the worker activates at the next cold start — the kill-and-relaunch behaviour
  that already worked, never worse.
  [ADR 0015](decisions/0015-split-precache-versioning.md)'s split caches and its
  build-new-then-delete-old activate order are untouched; `clients.claim()`
  stays, for the first-ever install. Two static tests pin the absence of
  `skipWaiting()` from install, because the temptation to put it back is real.
- ✅ **16f — About's version stamp can now run ahead of the page** `[S]` —
  **shipped 2026-08-09** ([ADR 0032](decisions/0032-ask-the-controller-for-its-version.md),
  `site/js/versions.js`, 13 new tests): About now asks the *controlling*
  worker directly for its own `SHELL_VERSION`/`DATA_VERSION` (a MessageChannel
  round-trip to a new `GET_VERSIONS` handler in `sw.js`) instead of inferring
  from cache names — the inference could show the newest **cached** version
  while the page was still running the previous one. A waiting worker's
  version is now reported separately ("an update is ready"), never merged
  into the headline number. Falls back to the old cache-name guess only for a
  controller that predates this protocol (mid-upgrade) or has none yet
  (first load). **Device-verified: none of the four SW-dependent states**
  (no controller yet, controller only, controller + waiting, a non-replying
  controller) **were reachable headlessly this session** — pinned by 13 unit
  tests against fake `ServiceWorker`-shaped objects instead; owed a real
  device pass, same as 16a–16d.

**Test honestly:** the service worker hides its own changes, so this needs a real
device or a headless run with a fresh browser profile — a hard-reload does not
bust it. The acceptance case is the owner's own:
leave the PWA backgrounded, push a data change, foreground it — the new menu
should appear without killing the app. **16a–16d ship with unit tests only:**
the resume check firing, the notice appearing, the tap activating the waiting
worker and the refresh rebuilding the caches are all unreachable from
`node --test`, and are owed a device pass before this theme is called done.

## Theme 17 — Cook mode: recipes you can actually cook from (owner-raised 2026-08-09)

Cook at Home renders a recipe well — ingredients, then a numbered method. That
is a recipe you can *read*. This theme is about a recipe you can *cook from*,
with wet hands, at the bench, mid-step. The owner raised four items; a research
pass over what current recipe apps do (sources at the end) adds a fifth group,
and moved one of them to the top.

🚩 **The data is the blocker, not the code.** Verified 2026-08-09 across the 24
recipes: **`serves` is set on 3** (Liège Waffles, the pudding, Tiramisu) and
<!-- count re-measured 2026-08-16: `time` is now 9, not 8. Conclusion unchanged. -->
**`time` on 8**. Every item below renders nothing until those fields exist, and
they can only come from the owner — the same shape as the empty `picks`
problem. Sequence the content with the build or the feature ships blank.

- [ ] **17a — Serves, and scaling it** `[M][schema][design]` — the owner's items
  1 and 4. `serves` already exists in the schema and renders where a price
  would; the ask is to make it **load-bearing**: show it clearly, then let the
  reader pick ½ / 1× / 2× (or type a number) and rescale the ingredients.
  - **Quantities have to become data.** Today an ingredient is a **string**
    (`"1½ cups (375 ml) white sugar"`). Scaling means parsing it, or splitting
    it into `{ qty, unit, item, note }`. Recommend **structured, with the
    original string kept** — parsing NZ home-recipe prose (`"2 tbsp"`, `"200g"`,
    `"a handful"`, `"Sauce: ½ cup"`) at render time will be wrong often enough
    to be worse than useless, and a wrong quantity in a recipe is a ruined
    dinner.
  - **Rounding is the whole UX.** ⅓ of 1½ cups is not a number anyone wants to
    read. Scaled amounts need friendly fractions and sensible unit hops
    (`0.5 tbsp` → `1½ tsp`), and eggs need honest handling — half an egg is a
    real problem, so say so rather than printing "1½ eggs".
  - 🚩 **Don't auto-scale cooking times — and the owner already said so.** His
    ask was *"adjust ingredients and **where we can** the timing for each step"*;
    this records where the line falls, because "where we can" is narrower than it
    looks. Bake and cook times **do not scale linearly** — a double mixture in a
    deeper dish takes longer, but not twice as long, and for anything meat-based
    an under-scaled time is a **food-safety failure**, not a disappointing
    dinner. So: ship a *hint* ("a deeper dish will take longer — test with a
    skewer"), and let a recipe carry an explicitly authored time for a given
    scale where the owner knows it. Never a computed one.
- [ ] **17b — Step timings and a tap-to-start timer** `[M][design]` — the
  owner's item 2. Per-step time where it is useful, and beside any step with a
  duration, a **Start timer** that counts down and sounds an alarm.
  - **Where the duration comes from:** authored per step (`{ text, minutes }`)
    beats parsing the prose, but parsing is what makes it work on the 24 recipes
    that already exist. Recommend **parse to suggest, author to confirm** — the
    parser proposes, the data records it, and the UI only ever shows an
    authored value.
  - 🚩 **The alarm is the hard part, and it is a platform limit, not a design
    choice.** A timer started by a tap can play sound reliably **while the page
    is in the foreground** (the tap unlocks audio). Once the phone locks or the
    app is backgrounded, iOS gives no dependable way for a web app to make a
    noise — Web Push needs a home-screen install, permission, and a network the
    kitchen may not have. So: pair the timer with **17d's wake lock** so the
    screen stays on and the alarm actually fires, and be honest in the UI rather
    than promising a background alarm we cannot deliver.
  - **A real kitchen runs three timers at once.** Design for multiple concurrent
    labelled timers ("rest the dough", "simmer") from the start; a single global
    timer will be rebuilt within a week of use.
- [ ] **17c — Quantities inside the step** `[M][design]` — the owner's item 3,
  and the best-judged of the five: *"add the sugar, eggs, and butter"* should
  not send the reader back up the page. Once 17a has structured quantities this
  is cheap: reference an ingredient from a step by id and render the amount
  inline — **"add the ¾ cup sugar, 1 egg and 100 g butter"** — and it stays
  correct when the recipe is scaled, which a hand-written amount would not.
  Keep the owner's balance: the steps read well now, so inline amounts should
  read as prose, not as a table bolted into a sentence. Worth a light visual
  treatment so an amount is scannable without shouting.
- ✅ **17d — Cook mode** `[M]` — **shipped 2026-08-09** (ADR 0034,
  `cook.js` + `cook-ui.js`). A modal full-screen `<dialog>` over the recipe: one
  step at a time, a "Step 3 of 9" counter, 56 px Back/Next plus arrow keys, and
  `navigator.wakeLock` holding the screen awake. The lock keeps a `wanted` flag
  and re-acquires on every `visibilitychange` — the OS releases it when the page
  hides and never gives it back — and degrades to silence where unsupported
  (iOS < 16.4) or refused. Ingredients open in place without moving the step
  index, which is the cheap half of 17c's problem. Entry points: the recipe page
  and the Cook at Home list, on the 23 of 24 recipes that have steps.
  **Deliberately left for their own items:** scaling (17a), timers (17b — cook
  mode is now the host the roadmap said they needed), inline quantities (17c),
  checklists/TTS (17e). **Not verified:** that the screen genuinely stays awake
  on a real iPhone — the lifecycle is proved against a fake and in headless
  Chrome, the platform behaviour needs a device.
  - ✅ **The real-browser regression guard — done 2026-08-15** (ADR 0039,
    `tools/cook_check.mjs`, **35 assertions**). Answered as a **sibling**, not a
    widening: the allergen safety verdict keeps its own line and its own exit
    code, and the CDP harness moved to `tools/lib/browser.mjs` so there is only
    one of it (`device_check.mjs` unchanged at 19/19). The wake lock is watched
    by **instrumenting the real API** — headless Chrome 151 grants genuine
    sentinels — and the guard was **proven to bite** by three deliberate breaks
    in `cook.js`, each reverted. Three gaps are declared rather than faked, in
    the tool's own header: that the screen truly stays on (needs a phone), leak
    (a)'s original form (this Chrome always releases on hide first, so removing
    that release is invisible here), and release on document teardown.
    - ✅ **Found by the guard, ruled and fixed the same day (2026-08-15).**
      Tapping **Back** until step 1 disabled the Back button while it held
      focus; Chrome then drops focus to `<body>`, outside the dialog, and the
      arrow keys, Home and End stopped working. ADR 0034 promises "focus stays
      on Back/Next so repeated taps keep working" — at the lower boundary it
      did not. **Owner ruled: hand focus to Next before disabling Back**, the
      only control that still does anything at step 1. Focusing the *step* was
      rejected (ADR 0034 already rejected that on every change, and a one-
      boundary exception is a rule nobody remembers); so was never disabling
      Back (a control that looks live and is not trades one accessibility
      fault for another). Guard **35 → 36 assertions**, the new one proved to
      bite. `SHELL_VERSION` bumped.
      🔎 **Worth keeping: 19 unit tests and a hand pass had both missed this.**
      A real browser found it on the first run, because "focus falls to
      `<body>`" is platform behaviour that a fake wake lock and a jsdom-shaped
      test cannot have. That is the argument for the guard existing, made by
      the guard itself within an hour of being written.
- [ ] **17e — The rest of what the research turned up** `[S]`–`[M]` each,
  ordered by how well they fit a zero-dependency offline app. ✅ **Ingredient-
  first search is delivered** and was struck from the list below on 2026-08-16
  by audit: `search.js buildIndex()` folds `item.ingredients` into the haystack
  (*"so 'lemon' finds the pasta"*), mirroring the menu screen, covered by
  `tests/search.test.js`, and reaching all 24 ingredient-bearing dishes:
  - **Tick off ingredients and steps as you go** — a checklist with state that
    survives a phone call. Cheap, and every app tested has it.
  - ~~**Ingredient-first search** — "what can I make with mince and a lemon?".
    Faves already has a search index; recipes just aren't in it by
    ingredient.~~ ✅ **Shipped** — see the note above the list.
  - **Shopping list from a recipe** — and note it is the same machinery as the
    order tally (`cart.js`), which already gathers, groups and totals. Build it
    as the tally's cook-at-home twin rather than a second list.
  - **Read the steps aloud** (`speechSynthesis`) — built into the browser, no
    dependency, and genuinely useful with your hands in a bowl. Voice
    *recognition* is the opposite: unreliable in a noisy kitchen and, on most
    platforms, a network round-trip. Recommend speech out, not in.
  - **Personal notes on a recipe** ("used half the sugar, better") — profile-
    scoped, and it slots straight into Theme 11's personal layer and Theme 12's
    export.
  - **Substitutions** ("no buttermilk → milk + lemon") — high value, but it is
    content the owner has to write, and a wrong substitution ruins a dinner.
    Curated only; never generated.
  - ✅ **Oven temperature conversion** (°C/°F) — **shipped 2026-08-09** as
    18c (ADR 0029), proven against all 459 strings in the recipe data. It did
    fall out of Theme 18 for free, exactly as predicted. Struck from this
    bundle 2026-08-15; nothing left to do here.

**Sources (research pass, 2026-08-09):** [Cook Mode step-by-step view][s1] ·
[Cook Mode and screen wake lock][s2] · [Best recipe apps tested][s3] ·
[ScaleRecipe — scaling, TTS, checklists][s4] ·
[Recipe Keeper — hands-free, unit conversion][s5] ·
[SuperCook — cook by ingredient][s6]

[s1]: https://www.drizzlelemons.com/blog/cook-mode-step-by-step-recipe-view
[s2]: https://bootstrapped.ventures/cook-mode/
[s3]: https://preplo.app/best-recipe-app-2026
[s4]: https://www.scale-recipe.com/
[s5]: https://apps.apple.com/us/app/recipe-keeper/id974683711
[s6]: https://apps.apple.com/us/app/supercook-recipe-by-ingredient/id1477747816

## Theme 18 — Metric or imperial, the reader's choice (owner-raised 2026-08-09)

**The ask, raw (owner):** *"In the settings let people choose between imperial
and metric measures for wherever they are used in the app e.g. miles vs
kilometers, litres, grams."*

A per-profile Settings preference, sitting beside the existing dials, applied at
**render** time — never stored converted, so the data keeps one true unit and
the display adapts. Three surfaces use units today: **distance** (the two
Distance dials, Near-me, the drive/walk hint), **recipe quantities** (17a), and
**oven temperatures** (°C).

- ✅ **18a — Distance** `[S]` — **shipped 2026-08-09** (ADR 0029, `units.js`).
  Every rendered distance goes through one formatter: the Near-me card, the
  branch chips on a menu, the route detour figure. Imperial short distances
  read in yards to the nearest 50, mirroring the metric metres ladder, then
  `0.6 mi`, then whole miles. The two Distance dials run on a round mile grid
  (½ mi and 5 mi steps) while still **storing kilometres**, and the walking
  pace, urban speed and walk/drive crossover all stay metric internally.
- [ ] **18b — Recipe quantities** `[M]` — **still blocked on 17a** and
  deliberately out of scope for the 18a/18c build: strings cannot be
  converted, only structured quantities can. Note the trap that makes this
  harder than it looks — **a US cup (240 ml) is not a NZ/metric cup (250 ml)**,
  and US tablespoons differ too, so "imperial" needs to mean a specific system
  and say which. Baking is also the one place where **weight beats volume**;
  offering grams for flour and sugar is arguably a bigger win than offering
  cups.
- ✅ **18c — Oven temperatures** `[S]` — **shipped 2026-08-09** (ADR 0029).
  Temperatures live inside free-text method steps, so this is a render-time
  rewrite of the step text, guarded by the literal ° sign — proven against all
  459 strings in `cook-at-home.json`: exactly the 14 oven temperatures change,
  every other string byte-identical. The figure is swapped, not appended
  (`Bake at 355°F for 2 hours`), and rounded to the nearest 5°F. Gas marks
  skipped — not trivial, and nothing asked for them. **Owner ratified the 5°F
  rounding 2026-08-09** (over nearest-25 US dial stops), and ruled the two
  hand-written `(NNN°F)` brackets out of `cook-at-home.json` — removed as a
  correction (we wrote the redundancy, the recipe didn't change).

**Default stays metric** — the app is New Zealand-first and the data is metric.
This is a display preference for visitors, not a change of source of truth.
Lockstep with **Theme 15b**'s wording sweep: both change user-facing unit copy,
and `reo.js` holds the strings.

🎯 **Open with the owner (2026-08-09):** oven temperatures now round to the
**nearest 5°F**, so 170°C reads 340°F rather than the conversion chart's 350°F.
Rounding to the nearest 25°F instead would land on the classic US dial stops
and would reproduce both hand-written brackets in the recipe data exactly — but
it can serve a 170°C bake 12°F hot, and in baking an overshoot burns while an
undershoot only takes longer. One constant in `units.js` (`OVEN_STEP_F`) if he
prefers dial stops. Also his call: the two `(NNN°F)` brackets hand-written into
`cook-at-home.json` are now redundant, and a metric reader sees `220°C (425°F)`
where an imperial reader sees `430°F`.

## Theme 19 — from the 2026-08-15 Johnsonville intake

<!-- Numbered 19, not 17: the 2026-08-15 session first appended this block as
     "Theme 17" without checking, colliding with Cook mode. Found and renumbered
     the same day. Check `grep '^## Theme' ROADMAP.md` before adding one. -->

✅ **Done 2026-08-15** — street numbers, hours, phones and house-level pins for
the three new venues; Thai Tara's *Prawns twister* restored with a null price.
Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

✅ **Thai Tara's leaflet-vs-card conflict — ruled 2026-08-15.** Owner's rule for
any two menus that disagree: **the dine-in card wins on contradictions** (prices,
dish numbers), and **dishes are additive** — anything on either menu is in.
Applied; detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- [ ] **Age `detailsVerified` the way `refreshCaveat` ages `verified`** `[S][js]`
  — today a venue whose details are stale and one whose details were never
  checked both render the same (the note simply omits them).
  🔎 **Measured 2026-08-16, and the stated reason for deferring it was wrong.**
  Not "too few records": **26 of 55 carry the field (47%)**, which is not thin.
  The real blocker is that **every one of those 26 dates lands inside a single
  48-hour window** — this repo's own intake — so there is **zero temporal
  spread** and **zero records currently in the "checked but stale" state**.
  Building it today would change nothing on any screen, and there is nothing to
  test a candidate threshold against. `refreshCaveat`'s own
  `VERIFY_MAX_AGE_MONTHS = 12` was never derived from the corpus either; ADR 0036
  states it as a house default from domain reasoning and flags it as the part of
  that ADR most open to being overruled.
  🚩 **And a second reason nobody had named:** "details" bundles phone and
  address (which rarely change) with opening hours (which change seasonally).
  One decay rate for both is the same "guesses dressed as precision" that ADR
  0036 rejected, one level down. The per-branch provenance item below is the
  same fault seen from another angle.
  🎯 **So this does not resolve by more intake — it resolves by waiting, or by
  an owner-supplied domain estimate** of how fast a venue's phone, address and
  hours actually drift, the way he ruled on the method-trust split in ADR 0036.
  Claim released; nothing built, deliberately.
- [ ] **Pandan's pin is a street centroid** `[XS][data]` — OSM carries no house
  number for that street address, so the stored pin is the street, not the door. Kept
  because the venue is ~15 km out, where the error cannot change a distance
  sort. Worth a house-level fix if OSM ever gains the number.
  🔎 **Re-checked 2026-08-16 with `tools/audit_coords.py` (77 live geocodes, 0
  errors): OSM still has no house number.** The live Nominatim response for the
  Melling branch's stored address returns `addresstype: road` with no
  `house_number` key, and geocodes to within a metre of the stored pin — because
  the stored pin *is* that same street centroid. Left exactly as it was; never
  invent a coordinate. Claim released: this stays open as a standing re-check,
  not as work, and the re-check is one `audit_coords.py` run.

✅ **Pandan's Press Hall hours — ruled 2026-08-15**: use the food hall's own
hours. Applied as **Mon–Fri 11:00–15:00**, the house standard it publishes.
Two consequences recorded rather than buried:
- **Weekends are the hall's silence, not a stated closure.** It publishes
  weekday hours only. They are stored as closed, which is the safe direction —
  a false "closed" hides the branch, a false "open" sends someone into town.
- **The venue's `detailsVerifiedBy` dropped to `third-party`.** The address and
  phone are Pandan's own, but these hours are the *building operator's*
  statement about its premises, and the venue-level field must read as weakly as
  its weakest input. The 🚩 below is the real fix.

- [ ] 🚩 **Derivation is venue-level, but provenance is now per-branch**
  `[S][schema]` — Pandan proves the gap: address and phone first-party from the
  venue's own site, one branch's hours third-party from its landlord, and one
  `detailsVerifiedBy` to describe both. The honest read (weakest wins) throws
  away true information about the stronger facts. A per-branch
  `detailsVerified`/`detailsVerifiedBy` would fix it; deferred because one record
  is not an evidence base for a schema change, which is the same restraint
  ADR 0037 applied to ageing the field.
✅ **Reo: the confidence-note strings — drafted and queued 2026-08-16**
(`c2e07fc`). 🔎 **The finding was bigger than the item.** The "fluent-speaker
review queue" that ADR 0037 and this file have both pointed at for weeks **did
not exist anywhere** — not a file, not a convention, not a list. It exists now, as
[`reo-review-queue.md`](reo-review-queue.md).
🚩 **And the obvious home for a draft was unsafe.** An `MI` entry marked
`// draft` is **not inert**: `translate()` renders it the instant a reader flips
the language toggle. For a nav label that is a fair trade; for the confidence and
caution copy — which tells a reader how much to trust a price — an unreviewed
draft that reads slightly wrong can cost someone money or a wasted trip.
⚠️ **The second attempt was wrong too, and measurement caught it:** an inert
export at the end of `reo.js`, never imported, cost **+2,171 bytes gzipped
shipped to every phone** for content nothing renders. ADR 0047's rule meets a JS
module. The deciding argument is neither of those, though — **a fluent speaker
reviewing te reo will not open a JavaScript module**, which is how a queue comes
to be empty and unnoticed at the same time.

---

## Automating the FX refresh — ✅ shipped 2026-08-16

`.github/workflows/fx.yml` refreshes the rates weekly (Sunday 14:10 UTC, Monday
~2am NZ) by opening a pull request that **merges itself** once the four required
checks pass. Proved end to end the same day: PR #3 opened, checks ran,
auto-merge landed it, branch deleted itself.

**Why a PR and not a push**, since this took three attempts and the dead ends are
worth keeping:

| Attempt | Outcome |
|---|---|
| Scheduled job pushes straight to `main` | Refused: `GH013 … 4 of 4 required status checks are expected … [remote rejected]`. A direct push can never satisfy a required check — the check runs on the push the rule is refusing. |
| Add a ruleset bypass for GitHub Actions | Weakens a protection on a public repo to buy a convenience. Rejected. |
| Stage the commit on a branch, poll for its checks, fast-forward `main` | Works, and is machinery a later reader must reverse-engineer before trusting it. Rejected by the owner, correctly. |
| **PR + `--auto` merge** | No bypass, no unusual git; a PR is how required checks were designed to be satisfied. **Shipped.** |

**Two repo settings were changed to make it work**, both disclosed to the owner:
`allow_auto_merge` on (weakens nothing — every merge still passes the same four
checks), and `can_approve_pull_request_reviews` on (needed for Actions to open a
PR at all).

- [ ] 🎯 **One click per refresh remains, until an `FX_TOKEN` secret exists**
  `[XS][ci][owner]`. A PR opened by the built-in `GITHUB_TOKEN` counts as coming
  from an *external contributor*, and this repo requires approval before
  workflows run for those (`approval_policy: all_external_contributors`). So the
  PR opens and arms itself, then waits for an "Approve and run" click.

  **Do not fix this by loosening `approval_policy`** — it governs every outside
  contributor's PR on a public repo, forever, so a stranger's workflow would run
  unreviewed. Far too broad for one convenience.

  The narrow fix is a repo secret **`FX_TOKEN`**: a fine-grained PAT scoped to
  this repository only, with `Contents: read & write` and
  `Pull requests: read & write`. The workflow already prefers it and falls back,
  so adding the secret is the whole change — no code edit. Only the owner can
  mint it (it is a credential, and a new trust surface).

- [ ] **Turn `can_approve_pull_request_reviews` back off once `FX_TOKEN` lands**
  `[XS][ci]` — with a PAT the PR is opened by a real user, so Actions no longer
  needs the permission. It grants nothing today (no rule here requires a review),
  but it is a latent trap: add a review requirement to the ruleset later and a
  workflow could approve its own PR.

---

## Theme 25 — Should a dish have an id? (owner-raised 2026-08-16)

✅ **BUILT 2026-08-16 (ADR 0051).** Claim cleared. `site/js/dish-id.js` is the
single resolver; `dishId` is **required and seeded** on all 1755 rows, not
optional-and-derived — the owner ruled mid-build that identity must be
**immutable**, and an id recomputed from a mutable display name is not. The 22
colliding rows are disambiguated with the first of each group keeping the bare
slug, so nothing that ever worked moved. Fixed with it: the `$56`-for-`$49`
overcharge, three elements sharing `id="dish-cheeseburger"`, a duplicate
`aria-controls` target, a shared add-on radio group, and an export/import round
trip that re-merged the two Cheeseburgers. Measured cost: **+12.6 KB gzipped**,
16.3% of the data cache. Detail → ADR 0051.

✅ **Theme 25's residue is closed — 2026-08-16** (`727cea9`, `b92270c`). Three
of the four items shipped and the fourth was answered by measurement. Full
original text and the evidence → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- ✅ **A shared shortlist now lands on the dish you meant.** The wire format
  gained an optional `k` array, positionally parallel to the existing bare-string
  `d` — old codes decode byte-identically, old decoders never look at `k`, and
  `CODEC_VERSION` did not move. 🔎 **The order-line trick did NOT transfer, and
  the reason generalises:** an order line is a *positional array*, so its id
  became slot 4; a shortlist group is a *keyed object*, so the equivalent is a
  new **key**. Same feature, same day, two mechanisms — and the wrong one looked
  obviously right. Proved end to end with a real click on the $21 Gold Card
  Cheeseburger, landing on its own key and never the $28 Mains one.
- ✅ **`temporal.js` no longer deletes a pick written as a `dishId`.** Filtered
  through `findDish` now. The gate still drops a pick whose dish is genuinely out
  of season, in every form, and returns it in December.
- ✅ **The retired `sprig-and-fern` fixture is renamed** — and it was worse than
  the item said. That id is not merely stale: it resolves *live* through
  `renames.js`, so those tests were exercising the venue-rename migration by
  accident. Now `fixture-venue`, except where a test exercises the migration on
  purpose.
- 🔎 **Cross-record `goesWith` refs — measured, and deliberately NOT built.**
  There are **zero** cross-record refs in the corpus (7 same-record ones, all
  resolving), so the gate has nothing to catch. More decisively, the roadmap's
  framing was wrong about the fix: widening `ALL_NAMES` would still not let you
  point at a disambiguated row, because the wire format is `id#Display Name` and
  `pairingLinks` renders the post-`#` text as the chip's **visible label**.
  Writing `id#cheeseburger-gold-card` would validate and even anchor correctly,
  and the chip would read "cheeseburger-gold-card" to the reader. So this is a
  **wire-format question** (a ref carrying both an id and a label), not an
  `ALL_NAMES` question. Reopen when a cross-record ref actually needs to reach
  one of the 3 venues with duplicate dish names.

<!-- Numbered 25, not 22: two other live sessions had already taken 22, 23 and
     24 while this branch was open. The note on Theme 19 says to check
     `grep '^## Theme' ROADMAP.md` before adding one — it is there because this
     keeps happening, and it happened again here. -->

Owner, on reading ADR 0044's "a dish's `name` is its identity": *"that is fine
but does a dish need a unique ID as well so it is referenceable when a name
changes, as menus tend to?"*

**The answer is yes, and the reason is sharper than it first looks.** A dish's
name is doing four jobs at once today:

| Job | Where | What a rename breaks |
|---|---|---|
| URL anchor | `#dish-<slug(name)>` | every link anyone has shared to that dish |
| Pick reference | `picks: ["Bastard"]` | the pick silently stops matching (validate.py catches this one) |
| Stored heart | `d:<venueId> <name>` | the heart detaches, on every family phone |
| Stored rating | `d:<venueId> <name>` | same |

Three of those four fail **silently**, which is the same shape of problem
`renames.js` was written for at the venue level (ADR 0042's consequences) — and
that is the precedent to follow, not reinvent.

There is a second reason the venue level didn't have: **a menu refresh is
append-only** (ADR 0023). A renamed dish is supposed to *carry its history over*
— its price series, its revisions, its `verified` dates. With the name as the
only identity, "carry it over" is a manual instruction a transcriber has to
remember, and nothing checks it. An id makes it mechanical.

**Recommended shape** — deliberately mirroring what already worked for venues:

- `dishId`, kebab-case, unique within the venue, **optional at first**. Absent =
  `slug(name)`, which is what every existing anchor already resolves to, so
  nothing moves on the day it lands.
- `formerNames: []` beside it, holding what the dish used to be called — the
  dish-level twin of `formerIds`, and the thing that lets an old shared link and
  an old stored heart still find it.
- One resolver module, the way `renames.js` is the single place a venue id is
  canonicalised, so no consumer learns two ways to identify a dish.
- `validate.py` enforces uniqueness within a venue and that `picks` resolve
  through the same path.

🎯 **Approved by the owner 2026-08-16 — and explicitly for a NEW session.** Not
started here, deliberately: it is a personal-data migration on every family
device, and it wants a session that is only doing this. Its own ADR.

🔎 **This is not hypothetical — the corpus already breaks it, today.** Found
while building Theme 14 on 2026-08-16, verified by measurement rather than
reasoning. `slug(name)` is **not unique within a venue**: 22 dish rows across 3
venues collide on 10 distinct names, and **every collision is at a different
price**. Sprig & Fern is the worst — `Cheeseburger` appears in Mains ($28),
Kids ($15) and Gold Card ($21); `Fish and Chips` likewise; five more names
appear twice. Southern Cross and The Borough each have a `Heineken` on tap and
in bottles at different prices.

All four jobs in the table above are already failing on that data:

- **URL anchor** — three elements share `id="dish-cheeseburger"`. Invalid HTML,
  and `#dish-cheeseburger` can only ever reach the first one, so the Gold Card
  price is unlinkable.
- **Stored heart / rating** — keyed `d:<venueId> <name>`, so hearting the kids'
  fish and chips hearts all three.
- **Pick reference** — a `picks` entry naming one of these resolves to whichever
  comes first.
- **The order tally overcharges.** `cart.js` matches a line on `(venueId, name)`
  and increments, so adding the $21 Gold Card Cheeseburger to a tally already
  holding the $28 Mains one produces **2× Cheeseburger at $28 = $56** instead of
  $49. Reproduced against the real module, not inferred:

```
lines: 1 [["Cheeseburger",28,2]]
total charged: 56  — correct would be: 49
```

  🚩 **A $7 error on a real venue, silently.** Deliberately **not fixed** in the
  Theme 14 session that found it — this is dish identity, which the owner
  reserved for a session of its own, and a partial fix here would have made the
  migration harder. Theme 14's own widening of the cart key (adding the add-on
  selection) neither helps nor worsens it: both Cheeseburgers carry an empty
  selection, so they still collide.

**Where a fresh session should start:** the four jobs table above is the brief;
`site/js/renames.js` is the working precedent to copy (single resolver, canonical
before the lookup, non-destructive rewrite on read, a `validate.py` gate holding
the data and the resolver in step); and `tests/renames.test.js` shows the shape
of the tests, including the one that matters most — *nothing moves on day one*.

---
## Theme 29 — things pinned over the menu (owner-raised 2026-08-16, from a phone)

- ✅ **The "Call to order" button looked cut off** — **fixed 2026-08-16**;
  3px of clearance under a pinned 44px button became 11.5px, measured in a
  real browser. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
✅ **Both items — SHIPPED 2026-08-16** (`f619722`). Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).
🔎 **Measured properly, it was worse than it looked, and the measurement chose
the fix.** A full-document sweep in 37 px steps at two widths and two text sizes
— because a fixed control's victim depends entirely on where you stop, and a
single sample is what every eyeball report of this had been. The back-to-top
button owned the tap on a dish price at **100%** of its width, **0 px
reachable**, at **96 of 547 scroll positions** on one menu; on the home screen it
covered **94.6%** of a venue's heart at 1280/24px, leaving 2.6 px.
**The roadmap offered two fixes and only one of them was live.** End padding was
*already sufficient* — at the document end the button overlapped nothing in all
eight width × text-size combinations, before and after. Every bit of the damage
was mid-scroll, which only "let the control get out of the way while the list is
moving" reaches. It now tucks while you scroll down, returns when you scroll up,
and **starts tucked**, so a deep link never opens with a button over a price.
⚠️ **Residual, stated rather than buried:** flick *up* and it returns and still
overlaps (91.8% worst). Unavoidable for any visible fixed control at 390 px —
there is nowhere for it to go that is not over the list. It now happens only
while the page moves upward, never during a downward read and never at rest.
Also fixed: the `Faves` wordmark was 81.7 × 31.9 px; now 44.

- [ ] 🚩 **The order pill eats a dietary chip's tap at large text** `[S][css]`
  ⚑ — **found by measurement 2026-08-16 and deliberately NOT fixed.** At 390 px
  with the browser's *Very large* text setting, the order FAB covers **82.5% of a
  "Gluten free" diet chip and owns its tap** — 0.0 × 8.3 px reachable. This is
  **not** the "pill is untappable" report, which was checked and is false: the
  pill is self-tappable at every combination measured. This is the pill eating
  *another* control's tap, and the control it eats is a **dietary** one, which is
  the class of thing this app exists to get right.
  🎯 **Left for the owner because any fix trades away availability of a primary
  action** — shrinking, moving or auto-hiding the order pill all make "how do I
  see my order?" harder in exchange. That is his call, not a quiet edit. Note the
  interaction: the back-to-top tuck above is one answer, and applying the same
  treatment to the pill would work — but the pill is a *destination*, not a
  return-to-top, so "summon it by scrolling up" reads differently.

## Theme 28 — one dish or three? sizes, portions and conditional prices (owner-raised 2026-08-16)

<!-- Numbered 28: 25/26/27 were taken by parallel sessions. Checked with
     `grep '^## Theme' ROADMAP.md` at write, per the note on Theme 19. -->

**The ask, raw (owner):** *"$28 (Mains), $21 (Gold Card) should be one dish… a
discount offered for gold card. However the $15 (Kids) dish is very likely
actually a different dish… Perhaps on each dish we could have (a) a serving
size e.g. kids vs adults, and (b) discounts available by dish, by menu, by
branch or restaurant chain?"*

🔎 **Measured before answering, and the measurement changes the answer.**

**The Gold Card rows are not a discount — they are a smaller dish.** Four of
the seven say exactly `"Gold Card portion."` and nothing else; the Sirloin says
`"150g."` against the Mains row's `"230g cooked to your liking"`. The price
ratios run 66%–79%, not one percentage — consistent with re-portioning, not a
card discount. Calling it a discount would tell a reader they get the 230g
steak for $27.

**There are no discounts in the corpus at all.** Across all 48 records: zero
occurrences of `%` off, `$X off`, "discount", "happy hour", "early bird",
"senior", "student", "member", "loyalty", or any dine-in/takeaway price
difference. The word "discount" does not appear once. A discount model would
be invented rather than observed — and the standing rule from 2026-08-16 is
that scope comes from what the owner hands over, not from a taxonomy drawn in
advance.

**The real pattern is size, and it is 13× bigger than the Gold Card case.**
- **41 variant groups · 96 rows · 13 venues** where a name collides exactly or
  near-exactly at a different price.
- **81 rows · 5 venues** carry a *second price inside the `desc` string* —
  **153 discrete price points** with nowhere to live, because `item.price` is a
  scalar. `"Regular $17.00; large $25.00; bottle $73.00."`
- **72 of those 81 are drinks** — wine by glass/bottle, beer pours, coffee cup
  sizes. This is overwhelmingly a *drinks* problem that food happens to share.
- Deduplicated, a size dimension touches **~210–230 of 1,755 rows (12–13%)**,
  ~70% of it in five venues.

🚩 **Collapsing on name would be actively wrong for 29 of those 96 rows.**
- `Heineken` at The Borough is on-tap 5% $15, bottle 5% $11, **and `Heineken
  0.0` alcohol-free $10**. A size ladder merges an alcohol-free drink into a
  beer.
- `sushi-bi`'s `Sushi Platter 1`–`9` are nine different compositions at
  $70–$90, not a ladder. Hell's `Splatter Platter 1` and `2` are **the same
  price** with different contents.
- Only **33 of 96 rows** collapse cleanly (pure quantity, no divergence).

🚩 **And the tags would not survive it.** 11 of the 41 groups carry divergent
allergen tags, and **5 have an empty intersection** — there is no safe tag to
keep. Union-merging would wrongly put `contains-shellfish` on two Sushi Bi
platters; intersection-merging would strip it off three rows that really do
contain shellfish.

**What that leaves.**

- [ ] **28a — Nothing to do about "one dish or three": they are three dishes**
  `[design]` — ✅ **its stated blocker is discharged**: Theme 25 landed
  2026-08-16 (ADR 0051) with exactly the two preconditions this item named — one
  id per **row**, and same-named rows **not** merged (the 22 colliding rows were
  disambiguated, the first of each group keeping the bare slug). The design
  conclusion still stands and the work is still open; only the "Blocked on
  Theme 25" clause below is now false. The same correction applies to the
  "Depends on Theme 25" preamble above 26a/26b/26c and 14f. — the evidence
  says a size variant needs its own desc, tags,
  section, availability and `addOns`, and once it needs all five it *is* a
  dish. The relationship is worth expressing, but as an optional **link
  between dish ids** ("also available as…"), not by merging records. Blocked on
  Theme 25, which must land one id per ROW and must not merge same-named rows.
- [ ] **28b — A second price has nowhere to live** `[L][schema]` — the 153
  prose price points. This is the item with real weight, and it is mostly
  drinks. Note 26 of the 81 rows explicitly record that the venue *does not
  label* the larger size (`"the menu doesn't label the larger sizes"`), so any
  shape must express "size unknown, price known", and Hell's 13 drink rows
  state two volumes at ONE price. A required price-per-size would force
  inventing prices the menu does not state.
- [ ] **28c — A section's time window is unreadable prose** `[M][schema]` 🔎 —
  the one clean, self-contained defect here. `available` accepts dates and
  seasons only, so "Mon–Fri 11:30–17:30" is **inexpressible**; six sections
  cram a time window into the section NAME and exactly one section in the
  corpus uses `available` at all. `hours.js` already does weekday+interval
  reasoning for the venue's own opening hours — the machinery exists and the
  section schema cannot reach it. Consequence today: nothing checks the clock,
  so a Gold Card price shows at 9pm on a Sunday with no indication it is not
  available.
- ✅ **28d, 28f, 28g — the section heading, its qualifier and its identity** —
  **done 2026-08-16** (`82ddb4b`, `b391f1b`, `2f0da85`), ADRs 0057 and 0058.
  The qualifier came out of eleven headings into a `note`; the anchor stopped
  being derived from the heading and became a stored `sectionId`. Full write-up,
  including the owner ruling that went against the recommendation, in
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **28g-tail — the last 25 sections, and the field made required** —
  **done 2026-08-16.** The six files landed (`9cae14e`), the seed finished the
  job — burgerfuel 9, hell-pizza 11, noodle-canteen 5 — and `validate.py` now
  **requires** `sectionId`. All 235 sections carry their own id;
  `seed_section_ids.py --check` is in the CLAUDE.md verify list. Proved by
  breaking it: a section with its id removed is refused (79 mutations).

- [ ] **28e — eligibility is unstated** `[S][design]` — "Gold Card" and "12 and
  under" are rules about *who may order*, recorded only inside a heading
  string. Worth a field only if 28c lands; and note a "show me Gold Card
  prices" preference would be the first thing in the app that asks the reader
  something about themselves beyond diet, which is a decision the owner should
  make explicitly rather than as a side effect.

## Theme 24 — cuisines the collection does not cover (owner-raised 2026-08-16)

Searching "mexican" returns nothing. Not a search defect — `cuisine` has always
been indexed — but a **coverage** one: the 38 cuisines held run Asian, Bakery,
Bar … Vietnamese, Yum cha, with **no Mexican, Spanish, Korean, Greek, Ethiopian
or Mexican-adjacent** entry at all. The owner asked to fill it.

✅ **Checked first, and it changes the answer: no re-tagging is justified.**
Before adding anything, every venue's menu text was audited against
cuisine-signature dishes to see whether a cuisine we already serve was simply
untagged. Seven venues matched, and **all but one are a single dish**:
"Korean-Fried Cauliflower" appears at Khandallah Trading Company (1 of 72
dishes), Southern Cross (1 of 141) and The Borough (1 of 132); KC Cafe has one
"Korean Style Chilli Beef" in 169. Tagging any of them *Korean* would be
straightforwardly false and would make the search worse, not better. The one
substantive match — Wellington Kebab Grill, 19 of 104 dishes carrying falafel —
is already described by its existing `Turkish` + `Mediterranean` + `Kebabs`.
**So the gap is real and cannot be closed from data we already hold.**

🎯 **RULED 2026-08-16 (Mike): leave the gap — coverage is not a goal.**
Offered three ways forward — we source candidates and he prunes, he names the
places, or leave it — he chose to leave it. That is an answer about what the
collection *is*, not a deferral: Faves is places he likes, so a cuisine arrives
when a place arrives, and "we hold no Mexican" is not a defect to close.
**Do not re-propose filling this by sourcing venues.** A future session reading
the missing-cuisine list above would otherwise read it as a worklist; the only
route in is the owner naming a place. Nothing is owed here, which is why this
theme carries no open item.

## Theme 21 — from the owner's Airbnb guidebook (2026-08-16)

Source: the host guidebook for the Cuba St apartment, "Food scene" section — 22
entries, 13 of which Faves already held. Owner's ask: add any that were missed.

✅ **Seven added 2026-08-16** as stubs — Golding's Free Dive, Dragonfly, Dirty
Little Secret, Garage Project Leeds Street, Abrakebabra, Wellington Sourdough and
Hotel Bristol. Address and pin from OpenStreetMap, so each carries
`detailsVerifiedBy: "third-party"` — the weakest honest label, because nobody has
stood in the shop.

✅ **The three missing addresses — owner supplied them, 2026-08-16.** Crepes A Go
Go (61 Manners St) and COSMIC Vape & Coffee (99 Cuba St) added, along with <!-- leakscan:allow: venue business addresses, the same class as site/data — this repo publishes them as its product (ADR 0022 gate 1) -->
**Moore Wilson's**. Chilly Pot was **not** added, and is now confirmed to be a
venue already held — see below.

✅ **"Chilly Pot" IS Babaili Malatang — owner confirmed 2026-08-16.** One shop,
already held, so no second record and nothing to add. The evidence agreed
independently: adjacent numbers on Dixon St, and a local food post describing
*"Ba Bai Li, Malatang Chilli Pot, Dixon Street"* — "chilli pot" being what
麻辣烫 *is*, rather than a second business. (Asked twice; the owner had already
said so the first time. Noted so a third session doesn't ask again.)

- [ ] **A venue could carry the other names people know it by** `[S][js]` — fell
  out of the above rather than being asked for. Someone who read "Chilly Pot" in
  the guidebook and types it into Faves finds nothing, because search only knows
  `name`. An `alsoKnownAs: []` joining the search haystack would fix it for a few
  lines. Not built: one venue is not an evidence base, and nobody has reported
  the miss.
- [ ] **COSMIC Vape & Coffee has no pin** `[XS][data]` — OSM has no entry at
  99 Cuba St for it, so the record carries the street address and no <!-- leakscan:allow: venue business addresses, the same class as site/data — this repo publishes them as its product (ADR 0022 gate 1) -->
  coordinates. Maps opens by address; distance sorting skips it.
✅ **Where Moore Wilson's stops being a place you eat — ruled 2026-08-16, and it
generalises.** Owner: *"whatever food/dishes I give you are to be included, if I
don't give them to you or tell you to fetch them they are not."*

So there is no line to draw per venue, because the line was never about the
venue: **menu content is owner-supplied or owner-directed, full stop.** Nobody
has to decide whether Moore Wilson's wholesale aisle counts — it isn't in the
menu unless the owner puts it there. That retires the `kind: "food-store"`
question too, which was only ever a way of guessing on his behalf.

Recorded as a standing rule in CLAUDE.md, because it governs every intake, not
this one.
- [ ] **The seven new stubs have no hours, phone or menu** `[M][data]` — they are
  findable by name and pin only. Hours and phone are a web-research pass; the
  menus want an in-store or official-site read (ADR 0036's trusted four).
✅ **Bars and bakeries are in — ruled 2026-08-16.** Owner: *"add them all, bars,
restaurants. Anything food and drink related."* So the collection's boundary is
food and drink, not eating specifically. A cuisine filter that mixes `Bar` with
`Malaysian` may still want a rethink once there are enough of them; that is a
UI question now, not a scope one.

**Deliberately not added.** The rest of the
guidebook (parking, gyms, the zoo, the cable car) is out of scope for a menu app.

---

## Theme 20 — Places from anywhere (owner-raised 2026-08-16)

Owner's intent, stated 2026-08-16: the collection is **not** scoped to
Wellington, or to New Zealand. A place loved anywhere in the world may be added.

✅ **The framing is fixed — 2026-08-16** (ADR 0042). Title, install name, About
lede, share text and the te reo subtitle name no city; README and CONTRIBUTING
follow. Venue data keeps its real areas and addresses.

What the rename exposed is below. All three are **correct for the venues held
as at 2026-08-16 and silently wrong for the first one outside NZ** — the failure
mode is a confident wrong answer, not a blank. Each is marked at the source
(`#!####` / `#!###`).

✅ **Three items ticked 2026-08-16 by a staleness audit** — all three were
fully delivered as side effects of other work and nobody ticked the box.
**Venue timezone** (ADR 0043): per-branch/per-venue IANA resolution, `nowIn(tz)`
/`todayIn(tz)`, `viewerOnVenueTime`, the zone named on screen, validated at both
levels — residue is data, not code, since all 55 records are in New Zealand.
**Currency is NZD by construction**: `currency` is now *required* on every
non-recipe record and About no longer claims a site currency; the second half —
"the bands stop being global" — was **answered by ruling, not built**, since ADR
0045 chose one NZD calibration reached by conversion. **Seasons assume the
southern hemisphere**: `venueHemisphere()` derives it from latitude and
`data.js` passes it on every load. Detail, and the honest residue in each →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- [ ] 🚩 **Whole-repo scanner runs here are inflated by every live worktree**
  `[S][docs]` — found 2026-08-15, **queued upstream as atelier Track E item E9**
  (`atelier@72cf216`) under the queue-never-deliver rule; no fix was written
  there. Sessions take worktrees at `.claude/worktrees/<name>/`, which is
  gitignored but is a **full second checkout of this repo**, and the scanners
  walk it. So an ad-hoc `plainscan .` counted **2000** where the tree had 623,
  and `pathscan .` counted 4 where 2 were real.
  **Two consequences that actually bite here:**
  - **A wrong number gets quoted into the record as fact.** This session nearly
    filed a fabricated upstream defect off the inflated count, and caught it
    only by re-running the scanner *the way the floor invokes it*. Treat any
    figure from a bare `scanner.py .` as unverified.
  - **Our `.leakscanignore` globs are root-relative, so they cannot reach
    inside the nested copy.** `leakscan .` reports **101 findings — commit
    blocked** whenever a sibling session has a worktree live. Every one is a
    venue address or phone already allowed by `site/data/*`. **This tree is
    clean**; nothing is wrong with our data or our globs.
  Nothing to fix locally: the pre-commit hook scans staged files and the floor
  passes explicit paths, so neither plane is affected. **When E9 lands upstream,
  re-run the close-of-session sweep and delete this item.** Until then, scope
  the sweep by hand — pass the paths, never a bare `.`.

✅ **Two accepted ADRs both numbered 0025 — ruled 2026-08-15.**
`0025-settings-index-and-panels.md` (2026-08-08) and
`0025-infer-allergens-by-default.md` (2026-08-09) are unrelated decisions
sharing one number, with 24 inbound references. **Owner ruled: both stay.**
Renumbering would rewrite an accepted record's identity and break every inbound
reference plus any external link, on a public repo — dearer than the oddity.
Delivered: a disambiguating note in each file's header, the rule in
[`decisions/README.md`](decisions/README.md) that a number is allocated **at
merge, never in a worktree**, and `0025` recorded as permanently ambiguous —
**cite an ADR by file path, never by bare number.**
🔎 **The root cause was not the number, it was the index.** The allergen record
had **never been added to the index** in `decisions/README.md` — the one place a
duplicate number is visible. That entry now exists, and the README carries the
rule that earned it: *add the index entry in the same commit as the record; an
unindexed ADR is invisible to the next person allocating a number.*

✅ **`pathscan` is decorative here — closed 2026-08-15.** Ran from 25 standing
warn-only findings to a **clean scan**. Our two classes were fixed 2026-08-09;
the third was an upstream defect, queued as atelier Track E item E8 under the
queue-never-deliver rule and fixed upstream in `atelier@ab74014`. Re-verified
here today: 16 findings → 0. 🔎 **Our stated root cause was wrong** — we named
the dot-directory, upstream found the hyphen — and the write-up carries why a
repro built from a single failing shape confirms the shape, not the cause.
Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
✅ **`plainscan` — scope and both sub-calls ruled, 2026-08-15.** Arrived
2026-08-09 with **1177** findings and no decided scope; **302 today**. The scope
question was answered twice over and independently: the owner ruled it here on
2026-08-09 ("live docs only, exempt the records"), and atelier ruled the same
way upstream on 2026-08-10 (`atelier@e390382`). Ours is the wider net, also
exempting `docs/reviews/` and `CHANGELOG.md`; both apply, both kept.
- ✅ **Accepted ADRs exempted (owner ruled 2026-08-15).** They carried the
  largest single block of findings, and "never edit an accepted one" means not
  one could ever be fixed — the exact definition upstream used to exempt
  records, and the exact way `pathscan` went decorative here. **The cost is
  stated, not hidden:** new ADRs are no longer checked at commit time, which is
  a real fail-open. Accepted because the **reply plane is untouched and has no
  scoping** — every reply an agent writes is scanned, including the prose that
  becomes a new ADR. The check moves to where the fix is possible.
  🔎 **The obvious glob was the wrong one.** `docs/decisions` exempts the whole
  directory including `README.md` — but that file is the live *index*, rewritten
  every time a record lands, so its prose *can* be fixed and the ruling's
  reasoning does not cover it. The glob is `docs/decisions/0*.md`: the numbered
  records only. Measured difference: 266 with the loose glob, **302** with the
  correct one. The looser number would have looked better and been wrong.
- ✅ **The P3 word limit: left alone, nothing swept (owner ruled 2026-08-15).**
  The 35-word sentence cap is the single largest rule, and atelier's own
  docstring calls it "a house call, not a published standard" and "the one
  number in this file the principal should rule on". Sweeping the P3+P4
  findings would be a mass rewrite of the live docs against a threshold nobody
  has ratified, with real risk of flattening meaning for no reader gain. The
  docs are dense because the subject is. **P3/P4 stay advisory.**
- ✅ **`docs/GLOSSARY.md` written 2026-08-15** — `plainscan`'s designed escape
  for P2, which this repo had never used. **P2 96 → 8**, no prose rewritten. It
  earns its place independently of the scanner: the repo is public and a
  stranger meets "PWA", "CDN" and "SBOM" cold in `ARCHITECTURE.md`. Two findings
  kept: a glossary **cannot** fix P1 (`_load_glossary` feeds only the acronym
  check; P1 needs a definition inside the same document), and **`D1` is a trap**
  — it sits beside `S3`, `R2` and `WGS84` and reads like Cloudflare D1, but
  every occurrence is `atelier D1`, a doctrine citation.
The residue is **302 advisory findings, all in live rewritable prose**, none of
them the unfixable class. That is a scanner whose output can still be read.

- [ ] **Our inlined floor is a stamped copy nothing watches** `[S][docs]` —
  found 2026-08-09 bumping the pin to `atelier@6887118`. `CLAUDE.md`'s
  doctrine block is the sanctioned *stamped copy* shape (it names atelier,
  carries a pin, and compresses without contradicting), but it is stamped in
  **prose only** — atelier's `stampscan` finds "no stamped blocks" here,
  because the machine-readable `<!-- stamp:begin source=… region=… -->`
  markers are absent. Atelier's own doctrine calls an unwatched convention
  "rung 1 territory, not rung 2". **We cannot fix this from here yet**: the
  markers pin `source=docs/method/PROPAGATION.md`, a path that exists only in <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
  atelier, so a child running the scanner exits 2 — and the child-side,
  pin-aware `source=` resolution is atelier's open ST3, already queued in its
  own roadmap (D2 residue). Nothing to deliver upstream. When ST3 lands,
  adopt the markers here. Until then the check is by hand.
  ⚠️ **Re-verified 2026-08-16 at the `atelier@1408d98` pin, and this time the
  source DID move** — `git diff bde4928..1408d98` over the four canonical floor
  files: `00-APEX` −42/+30, `CONCURRENCY` −5/+18, `RECORD` −21/+30, `ECONOMICS`
  unchanged. So the earlier all-clears were reporting "source unchanged", which
  is only the same thing as "copy has not drifted" while the source is still.
  **The check that matters is copy-versus-source, not source-versus-itself.**
  Done properly this time, clause by clause:
  - `00-APEX`'s two real changes — *the principal's authority is **absolute**,
    with the informed condition moved off the authority and onto the **ruling***,
    and *surface a genuine dilemma, never silently resolve it* — are **both
    already in our inlined block**, correctly. They arrived with the `1408d98`
    pin bump. No drift.
  - The Laws section was **removed** from `00-APEX`; we never inlined it. No
    drift.
  - 🔎 **`CONCURRENCY` gained a rule we do NOT carry, and a session hit the gap
    the same day.** Claiming at a *dirty primary checkout*: if the stranger's
    uncommitted edits don't touch the queue file, you stage and commit the claim
    line alone — explicitly the one sanctioned touch inside another session's
    tree. Our compressed copy said only "never work around or absorb them", so
    the session that found a foreign stage in the main checkout on 2026-08-16
    read it conservatively, declined to commit its claim there at all, and its
    claims went unpublished for the rest of the run while four sessions were
    live. **Compression dropped the one clause that tells you what you MAY do.**
    Now inlined.
  🚩 **The generalisable failure:** a hand-check whose recorded evidence is
  "the source did not move" degrades to nothing the moment the source moves —
  it never says whether the *copy* is right, only whether the question was easy.
  (First verified 2026-08-09; re-verified 2026-08-15 at `bde4928`.)

✅ **Done** — **"Open now"** live status + filter (2026-07-08, ADR 0006);
**shareable group shortlist links** (2026-07-10, ADR 0009); the **te reo Māori**
UI toggle first pass (2026-07-09, `reo.js` — chrome only; safety text stays
English); and the pre-launch reo **wording review** (✅ ran 2026-07-22 — an AI
pass over all 68 strings). ⚠ **honest caveat:** the AI pass is **not** a
fluent-speaker sign-off — a native review of the 9 flagged strings stays the
**owner option** before public launch
([review](reviews/2026-07-22-1148-reo-wording-review.md)). Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md). **2026-08-09 additions to that review
queue:** ~25 new `// draft` strings landed with the update notice, units,
report and import/transfer features (all flagged in `reo.js`); the dictionary
check flagged two existing choices worth a fluent speaker's eye — **`tahua
kai`** for "menu" in 7 pre-existing strings (Te Aka suggests `rārangi kai`;
`tahua` leans "fund/budget") and **`hapa`** for "error" (first gloss is the
loanword "supper" — unfortunate on a food app, though context resolves it).

---

## Theme 22 — the personal layer, holistically (owner-raised 2026-08-16)

Three items raised while the owner browsed the live site. They are filed
together because they are **one problem seen from three angles**: Faves has
grown a personal layer — favourites, ratings, profiles, transfer, sync — and
each capability arrived with its own button in its own place. The owner's
framing, verbatim: *"not buttons scattered all over the app"*, and the standing
bar, *"Faves MUST have the best UX, it must be intuitive (natural, easy), look
great, fast"*.

**Sequencing matters here and is not obvious.** 22c settles *what the model
is*; 22b settles *what the screen is*. Doing 22b first means moving the same
share button twice — so 22c's model call comes first, or at least alongside.
22a is independent and can go any time.

- **22a — search jumps to a setting or an action** `[M]`. The searchable
  surface was widened on 2026-08-16 (streets, services, phones, diets, plus a
  rotating placeholder that advertises them). The half deliberately **not**
  built is a **third result kind**: typing "map app" or "dark mode" should
  offer the setting itself, not a restaurant. That needs things the app does
  not have — a registry of settings with searchable labels and synonyms, a
  deep-link that opens Settings *at* a panel (`settings-ui.js` owns index and
  panels, ADR 0025), a result group that is visually a *verb* not a place, and
  a11y for a list whose rows now do two different things. Worth a session on
  its own. **Constraint carried forward, and it is a safety one:** no synonym
  may ever assert that an allergen is *absent* — "nut free" must keep returning
  nothing. `search.js` states this at the synonym map; the test
  `no synonym asserts the ABSENCE of an allergen` holds it.

- **22b — the Favourites screen strands you** `[M]` 🎯. Owner, 2026-08-16:
  *"It feels like it takes over the page without an obvious transition to it or
  how to get back, and we have repeated ways to navigate back because of it
  which should not be necessary if it was truly an intuitive UX… functional but
  disrupts the UX and leaves you feeling a little stranded."* Confirmed from
  his screenshot: the panel replaces the browse view outright, with **both** a
  "‹ All places" pill *and* the ⋯ menu offering a way back — two exits is the
  symptom, not the cure. The share control is a full-width filled slab, the
  heaviest element on a screen where it is not the point; he judges it *"ugly…
  and I don't think it is necessary"* (see 22c — the button may not survive the
  model call).
  **Research brief, not a chosen design.** Compare at 390 px: a bottom sheet
  that drags over the list and can be dismissed by dragging back; a right-hand
  drawer with a spring transition; an inline filtered state of the *same* list
  (favourites as a filter, not a destination — the cheapest and possibly the
  most intuitive, since it never leaves the page); and a segmented control
  above the list. Judge each on: is the transition legible, is there exactly
  **one** obvious way back, does it survive `prefers-reduced-motion`, does it
  keep focus order sane, and does it still work with search (the two views are
  mutually exclusive today — `app.js` `exitFavourites`). Whatever wins must
  keep the full feature set: per-venue and per-dish hearts, grouping by venue,
  counts, and the existing deep links.

- **22c — one model for a person's data, not buttons** `[L]` 🎯⚑. Owner,
  2026-08-16: take a holistic view of **(a)** a person with several devices
  keeping their data together, and **(b)** a person sharing their data — recipes,
  favourites — with family or a friend. Both already have deep design work:
  **Theme 9** (cross-device sync: transfer links shipped, continual E2E sync
  designed, ADR 0017/0030) and **Theme 10** (sharing with people). What is
  missing is the layer above them — a single coherent story a user can hold in
  their head, and **one place in the UI it lives**, instead of a share button on
  favourites, another in settings, another on a report, another on a recipe.
  The deliverable of this item is that model and its single surface: what is
  *mine*, what is *this device's*, what travels with me, what I hand to someone
  else, and what each of those is called in one consistent vocabulary. Only
  then does 22b know whether Favourites owns a share control at all.
  ⚑ Touches the first standing backend, which is the owner's go (Theme 9 v2).

  🎯 **Owner's verdict on the current answer, 2026-08-16 — the tech is fine,
  the UX is not.** On Settings → Your data: *"is 'Transfer to another device'
  really a good answer for UX or is this a dumping ground of features scattered
  in the app. We definitely want to be able to do this… but this is not a
  natural way to use or implement it. i.e. the tech is probably ok, the UX is
  bad."* That is a **scope ruling**, and it is the most useful sentence in this
  theme: ADR 0030's transfer link, the file export and the file import are not
  to be rebuilt — they are to be **re-fronted**. The panel presents three
  *mechanisms* ("Download my data", "Bring data back in", "Make a transfer
  link") where a person has one *intention*: **I want my stuff on my other
  device.** Nobody sets out to make a transfer link. The same panel also mixes
  in backup, which is a different intention again, under one heading.
  So 22c's deliverable sharpens: express the intentions, not the plumbing —
  something closer to *"Use Faves on another device"* and *"Keep a copy"* as
  two clearly separate jobs, with the link, the file and (later) continual sync
  as **implementations chosen for the user**, not menu items they must
  understand to pick between. Theme 9 v2's continual sync should then slot in
  underneath the *same* front, not arrive as a fourth button — which is exactly
  the trap this item exists to avoid. The vocabulary work above is what stops
  "transfer", "share", "export", "backup" and "sync" all meaning slightly
  different things on different screens.

## Theme 23 — what the app says, and where it says it (owner-raised 2026-08-16)

Owner, on the About dialog: *"looks like a dumping ground of information. Look
at why the info is there (e.g. the action/request/research that triggered the
work to create it) and find a better way… Consider what the right home is for
all this information, could be the about screen or somewhere else, and what
prose should be used for a consistent voice throughout Faves."*

**The diagnosis he is pointing at.** About is not a screen anyone designed; it
is a sediment. Each block was added by the item that needed somewhere to put
it — privacy by the no-tracking work, the currency line by ADR 0043, the
"how we read this menu" line by ADR 0036, the version rows by ROADMAP 16f /
ADR 0032, the update-ready line by the PWA refresh work. Every block was right
*at the time*; nobody has since asked whether About is where a reader would
look for it. That is why it reads as a list of answers to questions nobody
asked on this screen.

- ✅ **Delivered 2026-08-16 — the version caption sat in the wrong place.**
  The owner's worked example: *"why is the text 'What this page is currently
  running.' underneath the version numbers rather than under the heading"*. It
  now sits directly under the **Version** heading, before the numbers —
  heading → prose → detail, the order every other group in the dialog already
  used — and at body size rather than the 0.85rem that made it read as a stray
  footnote. `about-ui.js` + `app.css`.

- **23a — find each block its right home** `[M]` 🎯. Work backwards from the
  trigger, per the owner's steer: for every block in About, name the decision
  that created it, then ask where a reader would actually look. Strong
  candidates for moving rather than keeping: the **currency** and **"when we
  last read this menu"** lines belong on a menu page, where the question
  occurs — and partly already appear there (ADR 0037's ⓘ, ADR 0036's caveat),
  so About may be duplicating them. **Version** and **update-ready** are
  diagnostics, not "about" — they plausibly belong with Settings, or a small
  footer. **Privacy** and **works offline** are genuinely about the product and
  probably stay. What remains should be a short, confident statement of what
  Faves is, not a FAQ. Watch for the failure mode this repo has hit before: do
  not solve duplication by *adding* a third place.

- **23c — the same outcome answered on two screens** `[S→M]` 🎯. Owner's
  worked example, 2026-08-16: *"We have this feature in settings but the
  version details sit in the about screen? Makes no sense for UX."* Settings →
  **Refresh & reset** holds the *action* ("Refresh now"); About → **Version**
  holds the *evidence* ("App 2026-08-16.8", "An update is ready"). The user's
  outcome is one thing — **am I up to date, and if not, fix it** — and it is
  split across two screens reached by two different routes. His standing
  instruction with it: *"ALWAYS keep front of mind what the user is trying to
  achieve as an outcome."* So the test for 23a's rehoming is not "is this
  fact *about* the app" but "which outcome is someone chasing when they need
  it". Evidence and the action that acts on it belong together.

- ✅ **23d — the restaurant cards are getting busy — DELIVERED 2026-08-16.**
  The owner returned with a spec rather than leaving it open: drop the
  service line, move the open/closed badge up beside the suburb with a
  traffic-light dot, keep cuisine and the per-person estimate, and show the
  *nearest* branch for a multi-branch venue with that branch's own hours. All
  shipped. The branch half was the substantive one — `venueHours` already
  followed the nearest branch while the suburb came from the venue's top
  level, so one branch's hours could sit under another's name. Branches carry
  `label`, not `area`; reading `area` was a silent no-op caught only by
  checking the real corpus. What remains open from the original framing is the
  narrower question below, kept because it was never answered: whether `$$`
  *and* `~$16pp` are two answers to one question, and whether three cuisine
  chips beat one plus a count.

  Original framing, kept for the open part. Owner, 2026-08-16:
  each listing now carries name, suburb, services, open state and closing
  time, price band, per-person estimate and up to three cuisines — *"consider
  what is valuable to show on this page and what should be scaled based on
  screen size to hide or show info."* Two questions, and they are different:
  **which facts earn a place at all** (is `$$` *and* `~$16pp` two answers to
  one question? do three cuisine chips help, or would one plus the count?),
  and **which survive a narrow screen**. Note the existing responsive load —
  at 390 px the cards are already one column, so the busyness is per-card, not
  layout. Anything hidden at small sizes must still be **findable**: the
  searchable surface now indexes services and cuisine (2026-08-16), so hiding
  a chip no longer hides the fact. Judge against the card's job — *choose
  somewhere to eat* — not against completeness.

- ✅ **23e — the venue subheading was a dead end — DELIVERED 2026-08-16.**
  Owner, raw: *"In the sub heading that says 'Asian · Malaysian · Noodles —
  Johnsonville' I should be able to click on things like the word Malaysian or
  Johnsonville and jump to a search/filtered list of the restaurants that meet
  that criteria."* Every facet in that line is now a link into the home list
  filtered to it, carried as `index.html?cuisine=…` / `?area=…`; the dropdowns
  are set from the URL and the URL is rewritten as they change, so control and
  list can't disagree, and a filtered list is shareable. `filters.js` owns both
  ends (`filterHref` / `filtersFromQuery`), and an unknown value falls back to
  "all" rather than silently emptying the list under a control saying otherwise.
  🔎 **The adjacent one that doesn't work the same way** — the *cards* on the
  home screen carry cuisine chips too, but each card is already one big `<a>`,
  and a link inside a link is invalid HTML. Making those chips filter needs the
  card's hit area restructured (23d territory), so it is left for whoever takes
  23d rather than bolted on here.

- **23b — one voice, written down** `[S→M]` 🎯. There is no tone guide, so the
  voice drifts between blocks — some prose addresses "you", some describes the
  system, some is caption-shaped. Write the guide (plain New Zealand English,
  second person, no jargon, say the limit honestly rather than hedging — the
  voice the menu caveats already use well), then apply it. This is also where
  the **te reo** strings live: the rotating search hints landed on 2026-08-16
  untranslated by design, so `search.hint.*` is owed against the owner's
  nominated dictionary. Keep the guide short enough that it gets read.

## Theme 30 — a venue has *menus*, plural (owner-raised 2026-08-16)

> *"I think we need to allow for a restaurant (irrespective of single location
> or branches) having multiple menus. They could be seasonal (summer vs winter)
> or time of day (lunch vs dinner) where one finishes another starts. But they
> could also be over lapping e.g. a brunch menu that runs all day, or different
> menus for dine-in vs takeaway, or different areas of the restaurant that you
> can use. Lets at least ensure the data model supports all that … Again this is
> ensuring that future needs don't break the data model, and some of those needs
> might be things outside Faves core purpose, like keeping the historical
> pricing data, and permanently closed restaurants as historical/analytical/
> trend data to analyse outside of Faves."*

The ask is explicitly **model-first**: make the shape able to hold this, build
screens later. What follows is the answer to that, grounded in a survey of how
the industry actually does it rather than in invention.

### What the survey found — three convergences

Every serious commercial menu schema (Square, Toast, Uber Eats, Deliveroo,
DoorDash, Oracle Simphony, Lightspeed, Google's menu feed, schema.org) lands on
the same three decisions, and **all three are ones our tree cannot make.**

1. **Flat entity pools joined by id, not nested containment.** Deliveroo tells
   partners outright to *avoid duplicating categories, items and modifiers
   across mealtimes* and to reuse one item id. Containment forces duplication;
   the duplicate then drifts. 🎯 **We are already halfway there** — ADR 0051's
   `dishId` landed today, and it is precisely the primitive that makes this
   possible. A dish becomes an entity in the venue's catalogue and a menu
   becomes an *ordered list of references*.
2. **Price is a resolution over context, not a scalar on a dish.** Toast's
   `pricingStrategy` enum is the best real enumeration of why:
   `BASE_PRICE`, `MENU_SPECIFIC_PRICE` (*"an entree might cost $10 from the
   Lunch menu but $15 from the Dinner menu"*), `TIME_SPECIFIC_PRICE`,
   `SIZE_PRICE`, `SEQUENCE_PRICE` (1st topping vs 2nd), `SIZE_SEQUENCE_PRICE`,
   `GROUP_PRICE`, `OPEN_PRICE` (market price). Uber Eats and Deliveroo both
   name the field `price_info.overrides[]` with a `context_type`.
3. **Availability is a rule set with a conflict rule, not a boolean.** And here
   the survey settled the owner's hardest case for us — see below.

### The owner's "overlapping brunch menu" is the case that breaks the field

Deliveroo forbids overlap: mealtime schedules *"must not overlap"*, no gaps,
one active at a time. That is tenable only for a delivery-only catalogue.
Simphony — 30 years of real hospitality — allows overlap and resolves it by
**explicit priority, first match wins**: a "Free Drinks" rule at priority 1
beats "Early Bird" at priority 2 in the hour they share. Its documented
resolution order is Serving Period > Auto Menu Level > revenue-centre default >
fallback.

🎯 **So the owner's instinct is right and the tidier model is the wrong one.**
An all-day brunch menu genuinely does run alongside lunch. We should carry
`priority` on every availability rule and document first-match-wins, rather than
validating overlap away.

### "Different areas of the restaurant" already has an industry name

Simphony's **`Revenue Center`**: bar, dining room, garden bar, room service are
separate RVCs sharing enterprise-level dishes but carrying **their own prices,
their own serving periods and their own tax rates**. Lightspeed does the same
by binding a menu to a POS device. A `venue → menu` model cannot say "the same
Negroni is $18 in the dining room and $14 in the garden bar", which is ordinary.

### What our current model cannot represent — ranked, with our own evidence

`site/data/restaurants/<id>.json` is `venue → menu[] (sections) → items[]`, one
`price` per item, one `available` window per section or dish.

| # | Cannot represent | Already biting us? |
|---|---|---|
| 1 | One dish on two menus at two prices | Not yet — but Theme 28 found **81 rows carrying a second price inside a `desc` string**, 153 price points. That is this problem, already here, encoded as prose. |
| 2 | Dine-in vs takeaway vs delivery price for one dish | **Yes.** Phase 1 notes KK Malaysian and KC Cafe prices are *delivery/online-ordering, marked up*, with "prefer in-store" as an unresolved caveat. We have two prices and one field. |
| 3 | Per-branch price and per-branch existence | **Yes, latent.** 5 chains, 22 branches. McDonald's NZ franchisees set their own prices; the same is true of Subway. |
| 4 | Overlapping active menus needing priority | Not yet — no venue has two menus at all. |
| 5 | Menus/prices bounded by absolute dates (LTO, seasonal, Ramadan) | Partly — `available.from/to/season` exists on sections and dishes, but not on a *menu*, because there is no menu entity. |
| 6 | A dish's section membership being many-to-many | **Yes.** ADR 0049 exists because a row offered as an add-on was being printed twice; that is the many-to-many problem solved once, narrowly. |
| 7 | Price bands shared by many dishes (dim sum 小點/中點/大點) | Not yet — but it is how a whole cuisine prices itself, and we hold no dim sum venue *yet*. |
| 8 | Per-person / per-table pricing (tasting menus, thali, iftar) | Not yet. `pricePerPerson` exists but is a *curated estimate*, not a price. |
| 9 | Included, unpriced accompaniments (Korean banchan, bread with menú del día) | Not yet — and note a schema **requiring** a price per dish cannot show banchan at all. Ours allows `null`, so we are accidentally fine. |
| 10 | Non-dish charges that must appear on the menu (Italian *coperto*, Portuguese *couvert*, Japanese *otoshi*) | Not yet. All three are legally required to be printed on the menu in their jurisdictions. |

### The proposed shape — staged, backward-compatible, and ADR 0047-bounded

The governing constraint is **ADR 0047: the app ships only what it renders.**
`site/data/` is precached by every phone. So the staging below is not
gold-plating deferred — it is *the payload staying small while the record gets
rich*.

- **30a — `menus[]` as an optional layer above `menu[]`** `[L][schema]`. Today's
  `menu: [section, …]` becomes sugar for "one unnamed menu". A venue with more
  says:
  ```jsonc
  "menus": [
    { "id": "lunch", "name": "Lunch", "kind": "lunch",
      "available": [{ "days": ["mon","tue","wed","thu","fri"],
                      "from": "11:00", "to": "15:00", "priority": 2 }],
      "sections": [ … ] },
    { "id": "all-day", "name": "All day", "kind": "all_day",
      "available": [{ "priority": 5 }], "sections": [ … ] }
  ]
  ```
  Sections keep their present shape. **Backward compatible**: absent `menus`
  means today's behaviour exactly. `validate.py` rejects a record carrying both.
- **30b — a dish reference, not a dish copy** `[M][schema]` 🔗 **rests on ADR
  0051.** Where the same dish appears on two menus, the second carries
  `{ "dishId": "…", "price": … }` rather than a duplicated object. This is the
  single decision that stops two copies of one dish drifting apart, and it is
  only possible because `dishId` is now required and immutable.
- **30c — `kind` on a menu, driving optional schema** `[S][schema]`. Not a
  label: a wine list needs vintage/producer/format, a set menu needs a
  per-person price and course sequence, a kids menu changes legally-required
  calorie footer text in England. Closed set, extended when a real venue needs
  a value — never invented ahead of one (owner's 2026-08-16 scope ruling).
- **30d — the `channel` dimension** `[M][schema]`. `dine_in` / `takeaway` /
  `delivery`. This is the one with a **live** debt (row 2 above) and it is not
  only commercial: in the UK the same sandwich is 20% VAT eaten in and 0% taken
  away cold, so the *tax rate* is a function of (item × channel).
- **30e — per-branch overrides** `[M][schema]`. Square's shape is the one to
  copy, including its two modes: `present_at_all_locations` **plus**
  `absent_at_location_ids` (the "everywhere except these three" form), because
  a per-branch allow-list does not scale to a 400-store chain. We have 22
  branches, so this can wait — but the shape should be decided before a chain
  with a per-branch menu arrives.
- **30f — non-dish charges** `[S][schema]`. `charges[]` at venue or menu level:
  `{kind, amount|percent, basis: per_person|per_table|per_bill, mandatory,
  refusable, disclosure}`. Needed the day a non-NZ venue lands. Italy's Lazio
  region *bans* a line labelled `coperto`, so venues charge `pane` instead —
  which is exactly why `kind` must be data, not a hard-coded word.

### Metadata, reference data, and hierarchy-vs-ontology

The owner asked this explicitly. The survey's answers, and what we already do
right:

- ✅ **Already right.** ISO 8601 with **reduced precision** (`"2019"`,
  `"2019-05"`) — ADR 0023. Two clocks, world time vs record time, never
  collapsed — this *is* bitemporality (valid time vs transaction time,
  SQL:2011), arrived at independently. Dated lifecycle events rather than a
  `closed: true` flag — which is exactly what OpenStreetMap's lifecycle prefixes
  and Wikidata's `P576` + `replaced by` achieve. IANA timezones per venue and
  per branch (ADR 0043). ISO 4217 currency (ADR 0045). BCP-47 language tags
  including `th-Latn` (ADR 0044). Provenance with a *method* (`verifiedBy`) and
  a separate clock for details (ADR 0037). **This model is in better shape than
  the ask implies.**
- 🔎 **Cuisine is our one genuine ontology weakness.** `cuisine: []` is a flat
  multi-valued list, and it mixes *origin* ("Malaysian") with *dish form*
  ("Burgers") — the identical flaw OSM documents in its own `cuisine=` key and
  is trying to replace. The fix is cheap and worth doing before the corpus
  grows: give each value an **axis** (`origin` / `dish_form` / `service`).
  Yelp's model is a **DAG, not a tree** (`parent_aliases` is a list) and is
  **country-scoped**; Overture split "cognitively basic category" from the deep
  hierarchy. `[M][schema]`
- 🚩 **The null-vs-missing problem is a safety issue here, not a style one.**
  "No peanut declared" and "declared peanut-free" are different facts and our
  schema says both with an absent tag. ADR 0025's rule ("no tag = not stated")
  is the right *convention* but it is only a convention. HL7 FHIR's
  `dataAbsentReason` vocabulary is the mature answer (`unknown`, `asked-unknown`,
  `not-asked`, `asked-declined`, `not-applicable`, `masked`). We already have a
  partial version — ADR 0041's `needs[]` — which is genuinely the same idea.
  Extending `needs` to allergens would close it. `[M][schema]`
- 🔎 **Allergen lists differ by jurisdiction and ours is NZ-shaped.** AU/NZ PEAL
  (in force 2026-02-25) requires **each tree nut named individually** — almond,
  Brazil, cashew, hazelnut, macadamia, pecan, pine nut, pistachio, walnut — and
  has **no celery and no mustard**; the EU's 14 groups nuts and adds both, plus
  a numeric sulphites threshold (>10 mg/kg); the US has 9 and added sesame in
  2023; Japan mandates buckwheat, which nobody else does. *"Contains tree nuts"
  is a legal statement in the US and an illegal one in Australia.* Implication:
  tag at the **granular substance** level and derive the jurisdiction view —
  which is what `contains-peanuts` already does. Our vocabulary is closer to
  right than it looks; what is missing is the **regime** it is being read under.
  `[M][schema]` — matters the day a non-NZ venue lands.
- 💡 **`premises` as an entity distinct from `venue`** `[M][schema]`. The
  single highest-value structural idea in the survey for the owner's
  *"historical/analytical"* ask: *"what has operated at this address since 1998"*
  is unanswerable in a venue-only model. It is the join key when one address
  churns through six tenants, and it distinguishes four relations that a single
  `formerIds` cannot: same entity moved · same entity rebranded · **different
  business, same premises** · merged/split.
- **Certification is an assertion, not a property** `[S][schema]`. Halal and
  kosher are claims by a named body with a certificate number, a **scope**
  (whole premises vs specific products) and an **expiry** — so a lapsed claim
  can auto-demote to unknown. Google's own menu enum lumps `HALAL` and `KOSHER`
  in with `VEGAN`, conflating a certified legal claim with a self-declaration.
  Don't copy that.

### The out-of-scope-for-Faves half, which the owner named

*"…outside of Faves … keeping the historical pricing data, and permanently
closed restaurants as historical/analytical/trend data."*

✅ **This is already the architecture.** ADR 0047 split the two stores exactly
here: `site/data/` is the payload, `data/` is the record kept forever, and
`tools/split_data.py --check` proves the two still reconstruct the corpus. A
price that moves appends to `data/history/prices/`; a departed dish moves whole
to `data/history/dishes/`. So the owner's "outside Faves" store **exists**.
What the survey says is missing from it, for the analysis he describes:

- **`channel` and `tax_status` on a price observation.** Delivery menus run
  15–30% above dine-in; without the flag, any price trend silently mixes them
  and the series is worthless. This is the strongest single argument for 30d.
- **Decimal-as-string for money.** Floats corrode over a multi-decade series.
- **A `corrected` event distinct from a `price_changed` event** — we already
  make this distinction in prose ("did the shop change it, or did we?"); the
  record should make it in data.
- **Monthly snapshots derived from the event stream**, so "median main price by
  month" is not a correlated as-of join every time.

### Sizing, and the one thing to do first

The whole theme is `[XL]` and must not be attempted in one go. **30a is the
keystone** — everything else attaches to a menu entity that does not yet exist.
But the honest sequencing note is that **no venue in the corpus has two menus
today**, so 30a would ship a schema nothing exercises, which this repo has
learned to distrust.

> 🎯 **Owner decision:** do we (a) build 30a now against a venue you know has
> two menus and can supply — the shape then earns its keep immediately; or
> (b) hold 30a until such a venue arrives and meanwhile land the cheap,
> independently-useful pieces (the cuisine axis, the allergen regime field,
> `channel` on a price record in `data/`)? **Recommendation: (b) plus one
> exception** — write the ADR for 30a's *shape* now, while the survey is fresh,
> so the decision is recorded before a rushed venue forces it.

**Sources for the survey**: Square `Catalog` (`CatalogItemVariation`,
`location_overrides`, `present_at_location_ids`, `CatalogPricingRule`,
`CatalogAvailabilityPeriod`); Toast (`pricingStrategy`, `multiLocationId`,
`visibility[]`); Deliveroo Menu API (`mealtimes[]`, non-overlap rule, three-state
availability); Uber Eats (`price_info.overrides[]`, `menu_type`, `suspend_until`,
kcal *and* kJ); DoorDash (`price`/`base_price`); Oracle Simphony (Revenue
`Center`s, Menu Levels, Serving Periods, priority-ordered overlap); Lightspeed
(order profiles → price lists); Google Business Profile FoodMenus; schema.org
`Menu`/`MenuSection`/`MenuItem`/`Offer`; FoodOn and LanguaL's 14 facets; OSM
`cuisine=`, `diet:*` and lifecycle prefixes; Wikidata P576/P1366 and redirects;
Overture GERS and `taxonomy`; FSANZ PEAL, EU 1169/2011 Annex II, FASTER Act,
Natasha's Law; VITAL 4.0; HL7 FHIR `dataAbsentReason`; W3C PROV-O and DQV;
Kimball SCD type 2 and durable super-natural keys; EDTF / ISO 8601-2:2019.

---

## Theme 31 — the venue's own ordering app (owner-raised 2026-08-16)

> *"Where there is a specialised app to order from, like McDonalds has, Faves
> should have a link to open that app the same way we open uber, delivereasy
> etc"*

🎉 **The research turned this from a feature into a two-line data change, and
found that a third of it already works.**

**There is no such thing as an "app URL" to store.** The only mechanism safe
from a static, zero-dependency site is the **universal link / Android App
Link**: an ordinary `https://` URL that the OS silently routes to the installed
app, falling back to the website when it is absent. We do not "add an app link"
— we write `<a href="https://…">` and the OS upgrades it. Everything else was
checked and rejected:

- **Custom schemes (`mcdonalds://`) are unusable.** With the app absent, Safari
  shows *"cannot open the page because the address is invalid"* — a dead-end
  error dialog with a venue's name attached. Chrome doesn't navigate them at
  all. And Apple states there will never be an API to test one first, *"due to
  privacy concerns."*
- **`intent://` with a fallback works but is Android-Chrome-only** and buys
  nothing over a verified App Link.
- **We can never detect whether an app is installed.**
  `navigator.getInstalledRelatedApps()` requires a *mutual, cryptographically
  verified* relationship between our origin and the app — McDonald's would have
  to add our domain to their asset links. Safari has never supported it in any
  version. 🚩 **So no button may ever say "Open in app"**: it would be a claim
  we cannot back, and wrong for the majority of readers.

✅ **Three of our four aggregators already open their native apps today**, with
the plain URLs we already ship — verified against Apple's own AASA CDN and
Google's Digital Asset Links API, not against blog posts:

| Platform | Opens the app from our existing link? |
|---|---|
| Uber Eats | ✅ `/??/store/*/*` is claimed, so `/nz/store/…` matches |
| DoorDash | ✅ `*/store/*` claimed |
| Delivereasy | ✅ all paths claimed — but use the `www.` host; the apex 502s on `assetlinks.json` |
| Easy Eats | ❌ their `.well-known` serves an HTML redirect stub, so neither platform can verify |

**Of the chains, only KFC NZ has a clean, verified association** (both iOS and
Android, all paths but `/_/*`). The rest are worse than absent:

- 🛑 **Subway is actively dangerous.** `www.subway.com` claims **all paths** for
  the *global* Subway app, but NZ ordering lives in a completely different app
  (`nz.co.subcard.app`, published by Simplicity Technologies, not Subway). A
  `subway.com` link may hand an iPhone to the wrong app entirely. `subway.co.nz`
  does not resolve.
- ❌ **McDonald's NZ has no association at all** — `mcdonalds.co.nz` returns
  "Not Found" from Apple's CDN, and the `www.mcdonalds.com` file scopes only US
  paths to US apps, declaring a package that isn't even the one on the NZ Play
  listing. **The owner's own example is the one chain where this cannot work
  today.** Worth telling him plainly.
- ❌ **Domino's** has store pages on `www.dominos.co.nz/store/<id>` but the
  association lives only on `order.dominos.co.nz` and has **no `/store/`
  component** — no verifiable per-store deep link exists.
- ❌ **Hell Pizza** claims only `/password-reset/*` and `/voucher/*`; its
  `assetlinks.json` returns SPA HTML. Pizza Hut, Starbucks and BurgerFuel have
  no association files on any host probed.

### What to actually build

- **31a — a first-party ordering *category*, not a new mechanism** `[S][schema]`.
  `ordering[]` keeps its `{platform, url}` shape; add an optional
  `kind: "first-party" | "aggregator" | "app-store"` so the render can group
  "Order direct" above the aggregators. Where the OS can upgrade the link it
  silently will; where it can't, the reader gets the ordering site, which is the
  only thing we promised. **Label by brand and service — "Order from KFC" — not
  by mechanism.**
- **31b — the app-only case** `[S][design]`. Starbucks NZ ordering is in-app
  only, and McDonald's NZ may be (unverified — its site blocks scripted fetches;
  do not assert either way without checking in a browser). There a store link
  *is* the real entry point, but it must be worded as one — "Get the Starbucks
  NZ app" — never as ordering. That is `kind: "app-store"`.
- **31c — an association re-check** `[S][ci]` 💡. These are plain files on other
  people's servers and change without notice; two `curl` calls per domain
  confirm them. A cheap scheduled job in the mould of `fx.yml` would stop a
  silently-rotted link. Optional, and only worth it once we ship more than one.
- **31d — accessibility wording** `[XS][a11y]`. WCAG **G201** advises warning
  before a link opens a new window; there is **no** technique for "may switch to
  a native app" — the standard predates it. The defensible reading: warn about
  the guaranteed behaviour (leaving the site), never promise the app switch.
  Also note both platforms let the user permanently choose "open in browser"
  (Apple documents that iOS *"examines the user's recent choices"*), so **two
  people with identical phones can correctly get different behaviour.**

🚩 **Do not publish** any per-store Domino's link, `order.subway.com/en-nz/menu`,
`subway.co.nz`, `easyeats.nz`, or `hellpizza.com` — none verified or resolving.
Re-check `kfc.co.nz/find-a-kfc/<slug>` in a real browser first; a scripted fetch
gets 403 from its bot protection.

⚠️ **One unresolved unknown, flagged rather than papered over.** An installed
iOS PWA renders out-of-scope links in an in-app browser view, and no
authoritative Apple documentation says whether a universal link tapped *there*
still hands off to a third-party app. Community reports conflict and behaviour
has shifted across iOS versions. **This is the most likely place the feature
quietly does nothing, and it needs a real-device test on the owner's phone** —
not a headless check.

---

## Theme 32 — activity history: what changed, and what *you* changed (owner-raised 2026-08-16)

> *"an activity history that shows every change thats occurred. Include data
> refreshes to new versions of app or menu data, but more importantly user
> changes like adding/changing/removing a rating, a favourite, reporting an
> issue etc."*

Two logs wearing one name, and the theme is mostly about telling them apart.
The owner's own emphasis does it for us — *"but more importantly user
changes"* — so the personal half leads and the system half is the cheap
supporting act.

### What already exists, so we don't build it twice

- **Content history is already kept, and kept forever** — `data/history/prices/`
  and `data/history/dishes/`, under
  [ADR 0023](decisions/0023-time-dimension-in-the-data.md) and
  [ADR 0047](decisions/0047-the-app-ships-only-what-it-renders.md), plus
  `revisions[]` on a dish. That records *what the shop changed*. It is
  repo-side, never precached, and this theme must not duplicate it into the
  payload.
- **Version state is already computed** — `versions.js`, `sw-update.js`,
  `update-notice.js` and `cache-refresh.js` between them already know the shell
  and data versions, when an update is waiting and when one was taken. The
  system half of this feature is mostly *keeping* what those already compute
  rather than discarding it after the notice is dismissed.
- **The personal layer is already per-profile and device-local** — `store.js`
  with `profileScopedStorage()`
  ([ADR 0012](decisions/0012-device-local-profiles.md)). An activity log slots
  straight into that, and must, for the reason below.

So this is not a new subsystem. It is a **recorder** wired to events those
modules already raise, plus a screen.

### 🚩 The thing to decide before any of it is built

An activity log is the **most sensitive thing Faves would ever store**. Today
the app knows your favourites, your ratings and your allergen flags — all
current state. A log knows your *behaviour*: what you looked at, what you
liked and then unliked, and when you were doing it at 11pm. It is a different
category of data living in the same `localStorage`.

Three consequences, none optional:

1. **Per-profile, device-local, never sent, never precached.** It rides
   `profileScopedStorage()` so switching profile switches log, and a shared
   family phone does not leak one person's evening to another.
2. **It must be in the export and in the wipe.** Theme 12's export has to carry
   it, and the Reset flow — which now requires typing "I agree" — has to clear
   it. A record of your data that survives the button that destroys your data is
   a bug with a very bad name.
3. 🎯 **The deletion paradox is the owner's call.** If you remove a favourite,
   the log still says you added it. That is exactly what a history is *for*, and
   exactly what "remove" is supposed to mean. Options: (a) the log is the
   record, removals appear as removals and nothing is erased; (b) removing the
   thing removes its trail; (c) the log is the record, but a "forget this
   entry" action exists. **Recommend (a) plus (c)** — an honest log with an
   explicit escape hatch beats a log that quietly lies about what happened.
   Whichever it is, the screen must state it in one sentence.

### 32a — the recorder `[M][js]`

A small append-only ring buffer, `faves.activity.v1`, per profile. Fields kept
deliberately few:

```jsonc
{ "at": "2026-08-16T19:04:11Z",   // record time, ISO 8601 with the zone
  "kind": "rating.set",            // closed vocabulary, below
  "subject": { "venue": "kk-malaysian", "dish": "fried-won-tons",
               "label": "Fried Won Tons" },
  "from": null, "to": 4 }
```

Two design points that are not obvious:

- **The label is snapshotted at write time, never resolved at read time.** A
  dish can leave a menu, and a log entry that renders as "a dish that no longer
  exists" is useless. `dishId`
  ([ADR 0051](decisions/0051-a-dish-has-an-id-and-its-name-is-not-it.md))
  makes the *link* durable; the stored label makes the *sentence* durable when
  the link dangles. Keep both — the id to navigate, the label to read.
- **A ring buffer with a stated cap, not unbounded growth.** `localStorage` is
  a handful of megabytes shared with everything else the personal layer keeps,
  and the failure mode of filling it is that *favourites* stop saving. Cap it
  (500 entries is a starting guess, not a measurement), evict oldest, and say on
  screen that it is the last N rather than all of it. **No silent caps.**

**Closed event vocabulary**, extended only when a screen needs a value:
`favourite.add` · `favourite.remove` · `rating.set` · `rating.clear` ·
`report.sent` · `order.add` · `order.remove` · `order.clear` ·
`profile.switch` · `settings.change` · `data.updated` · `app.updated` ·
`cache.refreshed` · `reset.performed`.

⚠️ **`settings.change` needs a rule of its own.** Logging that someone flagged
`contains-peanuts` records a health fact about a named person, which is the one
class this repo never stores. Log that *a preference changed* and which dial —
never the value. The rest of the vocabulary is safe; this one is not.

### 32b — the screen `[M][design]`

A reverse-chronological list, day-grouped, reachable from Settings (it belongs
with "Your data", beside the export). Each row: the sentence, the time, and —
where the subject still exists — a link to it.

- **It starts empty and must say so.** There is no backfill: nothing before the
  day it ships was ever recorded. An empty history reads as a bug unless the
  screen says *"Faves started keeping this on <date>"*. This repo has shipped a
  feature whose emptiness looked like breakage before.
- **The system entries are the quiet ones.** `data.updated` and `app.updated`
  will outnumber everything a person does. Default to showing personal activity
  with system events behind a toggle, rather than burying the owner's stated
  priority under version bumps.
- Reo: every string needs a `data-i18n` key from the start, not retrofitted
  (`reo.js`) — the last three features all had to be swept afterwards.

### 32c — system events, wired to what already computes them `[S][js]`

`versions.js` / `sw-update.js` / `cache-refresh.js` already know when the shell
or data version moved and when a refresh was taken. Emit on those transitions.
Nothing new to detect; the work is not throwing the fact away.

### 32d — export and wipe `[S][js]` 🔗 **depends on 32a**

Add the log to Theme 12's export payload and to `personal-data.js`'s clear path,
and to whatever Reset ends up destroying. Do this **in the same change as 32a**,
not after: a personal store that the export and the wipe don't know about is the
kind of gap nobody finds until it matters.

### 32e — undo, deliberately out of scope for now `[L][design]`

A list of changes invites a button to reverse one, and "un-remove that
favourite" is genuinely useful. It is also a different feature: it needs every
event to be invertible, needs to define what undoing a `settings.change` means
when three more landed after it, and turns a recorder into a state machine.
**Park it, and note that 32a's `from`/`to` fields are what would make it
possible later** — which is why they are in the shape now, even though nothing
reads `from` yet.

### Sizing and sequence

`[L]` overall. 32a + 32d together first (the recorder is worthless without the
wipe, and dangerous without it), then 32c (cheapest, and it proves the recorder
against events we already have), then 32b. 32e stays parked.

🎯 **Blocking question for the owner before 32a:** the deletion paradox above —
does removing a favourite remove its history?

---

## Theme 33 — reservations (owner-raised 2026-08-16)

> *"ability to make a reservation with a restaurant from Faves. And the ability
> to see and update that reservation later. Manage multiple upcoming
> reservations"*

Three asks, and they are not the same size. Booking is easy. **Keeping track of
a booking is the hard one**, and it collides with what Faves is.

### The collision, stated first

A reservation is a **two-party agreement whose source of truth lives in someone
else's system**. Faves has no backend, no accounts and no network dependency at
runtime — that is the product
([ADR 0001](decisions/0001-zero-build-vanilla.md)), and it is why crowd ratings
were rejected in
[ADR 0013](decisions/0013-ratings-curated-and-local.md): backend, moderation and
accounts break three non-goals at once.

So "see and update that reservation later" splits cleanly:

- **We can always show what *you* recorded.** Device-local, offline, free.
- **We can never know what the *venue* did with it.** If they cancel, move you
  to 8pm, or shut for a refit, our copy still says Friday 7pm. That is the stale
  menu problem with someone standing on a footpath in the rain.

🚩 **The failure mode is worse than a wrong price.** A menu that is out of date
costs you a surprise at the counter. A reservation that is out of date costs you
a table. Any local record must therefore be **visibly a note you made, never a
confirmation Faves is standing behind** — and the wording is load-bearing, not
decoration.

### 33a — book it: link out, don't build it `[S][schema]`

🔗 **Shares Theme 31's shape.**

Same finding as Theme 31's ordering apps: the honest mechanism is an ordinary
`https` link the OS may upgrade to the venue's app. NZ venues mostly sit on a
handful of platforms — ResDiary, Now Book It, OpenTable, SevenRooms, First
Table — plus a Facebook page or a phone number for everyone else.

Data: extend the `ordering[]` pattern rather than inventing a parallel one —
`booking: [{ platform, url }]`, or `ordering[]` gaining
`kind: "booking"` alongside Theme 31's `"first-party"`/`"aggregator"`. **Decide
that once, in Theme 31, and let this inherit it.**

⚠️ **Do not verify these links the way we verified the ordering ones and then
forget.** A booking URL that 404s sends someone to a dead end at the moment they
are trying to commit. Worth the association/liveness re-check Theme 31 floated
(31c) more than ordering was.

For venues with no platform, the honest affordance is the phone number we
already have, labelled "Call to book" rather than dressed up as a booking flow.

### 33b — the reservation note, which is the actual feature `[M][js][design]`

A device-local, per-profile record the reader creates *themselves* after
booking: venue, date, time, party size, an optional note, and the booking
reference if they have one. No backend, no accounts, works in flight mode.

- **It rides `profileScopedStorage()`** with the rest of the personal layer
  ([ADR 0012](decisions/0012-device-local-profiles.md)), and inherits every rule
  Theme 32 sets out: in the export (Theme 12), in the wipe, never sent, never
  precached.
- 🚩 **It holds more personal data than anything Faves stores today** — a name,
  a party size, a place and a *future time you will be there*. That is a
  movement record. It never leaves the device, and the repo never sees it. Worth
  an ADR of its own before a line is written.
- **The offer to create one goes where the booking link is**, on the way back:
  tap "Book on ResDiary", come back, and Faves asks "did that work? want me to
  remember it?". Never assume the booking happened — we cannot know.
- **Hand the reminder to the phone, not to us.** A generated `.ics` the reader
  saves into their own calendar gets them a real alert with no notification
  permission, no push service and no backend. Reminders inside Faves would
  need a service worker push, which needs a server — out of scope by
  construction.

### 33c — several at once `[S][design]` 🔗 **depends on 33b**

Upcoming sorted soonest-first, past ones aged out of the main view rather than
deleted (the current-truth/history split this repo already uses everywhere).
Edit and cancel act **on your note** — and cancelling the note must say, in
words, that it does not cancel the booking. Then link out to the platform so the
real cancellation can happen where it actually lives.

An expired reservation should not simply vanish: "was that last Friday?" is a
question people ask.

### 33d — a real integration `[XL]` 🛑 **owner-gated, and against three non-goals**

Reading and writing a booking in the venue's system needs partner API access,
a backend to hold the credentials, and an account to tie the booking to. That is
a different product, and it is the thing ADR 0013 declined. **Not recommended.**
Recorded so a future session finds the reasoning rather than re-proposing it.

The middle option, if the pull is strong: many platforms email a confirmation
with a **stable manage-my-booking link**. Storing *that link* alongside the note
gets most of "update it later" for free — the reader taps through to the
platform's own page, which is always right. No API, no backend, no account.
🎯 **Recommend this as 33b's stretch, and it may be the whole answer.**

### Sizing and open questions

33a is `[S]` and independent. 33b is the theme (`[M]`, plus an ADR). 33c falls
out of 33b. 33d stays parked.

🎯 **For the owner:**
1. Is a **note you made** enough, given Faves can never confirm or update it
   from the venue's side — or is the manage-link stretch the minimum bar?
2. Faves currently stores no forward-looking personal data at all. A record of
   where you will be on Friday at 7pm is a new category. Comfortable?

---

## Theme 34 — every section addressable by URL (owner-raised 2026-08-16)

Owner, verbatim: *"Each section, maybe each configuration item, should be
addressable directly via URL. For example I should be able to send someone a
URL and it opens straight to the Food Preferences section of the Settings
screen."*

The use case is **handing someone a place in the app**, not bookmarking. That
matters, because it sets the bar: the link has to survive being pasted into
Messages by one person and cold-opened by another, on a phone that may have
never loaded Faves before, possibly offline after that first load.

### 🔎 The finding that has to be settled first: the hash is already full

Faves has four URL mechanisms today and **three of them share the hash**, with
no convention deciding who wins. This is not a hypothetical clash — it is the
reason this theme needs a design step rather than a patch.

| What | Form | Where | Kind |
|---|---|---|---|
| Venue page | `restaurant.html?id=<venue>` | `menu.js:1548` | query, resolved at load |
| Recipe page | `recipe.html?id=<slug>` | `recipe.js:185` | query, resolved at load |
| Filters | `index.html?area=…&cuisine=…` | `filters.js:45`, synced `app.js:352` | query, `replaceState`-tracked |
| Dish anchor | `#dish-<slug>` | `menu.js:1558` | hash, an *element anchor* (+ `formerIds` fallback) |
| Section anchor | `#section-<sectionId>` | `menu.js:1275` | hash, an *element anchor* — **stored id since ADR 0058**, no longer derived from the heading |
| Favourites view | `#faves` | `app.js:862` | hash, a *view toggle* |
| Share / transfer | `#<base64url payload>` | `cart-ui.js:422`, `personal-io-ui.js:436` | hash, an *opaque payload*, consumed then stripped |

So the hash is simultaneously an anchor, a view switch and a data envelope.
`#faves` is a bare word in the same namespace as a dish slug; a share token is a
long base64url blob distinguished only by "it parsed". Adding `#settings/diet`
to that pile without a rule is how a venue that one day sells a dish called
"faves" breaks the favourites view.

🎯 **The owner-facing question underneath:** does an addressable section live in
the **query** (`?panel=diet` — survives, is obviously state, doesn't fight
anchors) or the **hash** (`#settings/diet` — never hits the network, reads more
like a place)? Recommendation: **query for state, hash stays for anchors and
payloads.** It keeps the one namespace that already has three tenants from
getting a fourth, and Cloudflare Pages serves the same static file either way,
so the query costs nothing.

### The other three calls, which are UX not plumbing

1. **Does Back close it?** If opening Settings → Food preferences writes a
   history entry, the Android back gesture closes the panel — which is what a
   phone user expects of a sheet. If it doesn't, Back leaves the app entirely
   from a screen that looks like a page. Recommendation: **push on open, one
   entry for the whole dialog, not one per panel** — so Back closes Settings
   rather than walking backwards through six panels the reader tapped through.
2. **Does the URL track, or only resolve?** Tracking (the bar updates as you
   move) makes every link copyable but writes history constantly. Resolving
   only (the URL is honoured on arrival, then left alone) is quieter and is
   what `cart-ui.js`/`personal-io-ui.js` already do with tokens. Recommendation:
   **resolve on arrival, and give the reader an explicit way to copy the link**
   — which is 34e.
3. **Which surfaces are even addressable?** Eleven modal surfaces exist
   (`settings`, `about`, `cart`, cart-receive, `cook`, filter sheet,
   `personal-io`, `picker`, `report`, photo lightbox, `share`). Some should
   never be linkable: a photo lightbox is an anchor's job, and a confirm dialog
   arrived at cold is a trap — the reader lands on "Delete this profile?" with
   no idea what asked. 🚩 **Rule to hold: a URL may open a place, never a
   pending action.**

### The staging

- **34a — the convention, and one place that owns it** `[M][js][design]`.
  A single resolver that reads the URL once at boot, decides what it names, and
  hands off; plus the written rule for who owns the hash. Everything below
  depends on it. Includes the safety property that today is accidental: an
  unknown or hostile URL must **fail to the plain screen**, never to a broken
  one — the no-JS fallback `<ul>` in `index.html` still has to be what a reader
  gets when JS dies, and it can't parse routes.

- **34b — Settings panels, the owner's actual example** `[S][js]`. Cheap once
  34a exists, because the topic keys are already there: `settings-ui.js` has
  `TOPICS` with stable keys `people` · `diet` · `places` · `locale` · `data` ·
  `refreshReset` (`settings-ui.js:849`). "Food preferences" is `diet`. The work
  is opening the dialog *at* a panel rather than at the index, and getting
  focus right — the panel `<h2>` is already the dialog's accessible name and
  already a focus target on drill-in, so a deep link should land there too, not
  on the back button.

- **34c — the other linkable surfaces** `[M][js][design]`. Apply the rule from
  34a's third call. Likely in: the Order tally, About, the filter sheet (which
  is half-addressable already via `?area=`/`?cuisine=`, so this is really
  "finish it"), cook mode at a step. Likely out: lightbox, every confirm, the
  receive-a-transfer dialog (it is a payload, not a place).

- **34d — individual configuration items** `[L][js][design]` 🔗 **converges
  with 22a**. The owner's "maybe each configuration item" is a different order
  of magnitude from 34b: it needs a **stable id per control** plus a label and
  synonyms — which is exactly the *"registry of settings with searchable
  labels"* that Theme 22a named as the missing piece for search-jumps-to-a-
  setting. Build the registry once and both land. Open design question: does an
  item link **highlight and scroll** to the control, or *operate* it? Strong
  recommendation for highlight-only — a URL that flips someone's allergen
  settings on open is a safety surface, and the standing constraint from 22a
  applies here too: **nothing may ever assert an allergen is absent.**

- **34e — the outward half: getting the link** `[S][design]`. An address only
  helps if a reader can obtain it. Today the address bar is the only route, and
  on an installed PWA in standalone mode **there is no address bar** — so the
  owner's example is literally impossible for anyone who installed the app.
  🚩 This is the item that decides whether the theme delivers the stated use
  case at all; the rest is plumbing beneath it.

### Sizing and sequence

34a then 34b delivers the owner's own example and is the honest MVP — roughly
one session. 34e is small but is what makes it usable on an installed phone, so
it belongs in the same session, not later. 34c is a second session. 34d is its
own piece of work and should be scheduled **with 22a**, never separately.

🎯 **For the owner:** the three recommendations above (query not hash · Back
closes the dialog · links open a place, never an action) are the ones that are
awkward to reverse once links are in the wild — a link someone was sent has to
keep working.

---

## Owner rulings — 2026-08-16 (close of the in-flight-residue session)

Four decisions, put to him with the impact of each stated in plain language.

- 🎯 **A named third-party source IS acceptable for opening hours.** This
  changes a standing rule — the corpus has been first-party-only — and it was put
  to him as his alone to change. Ruled: take them. It unblocks McDonald's and
  Subway (10 of 22 branches) and makes ADR 0054's *"nearest, and open"* fully
  alive for the two chains that prompted it.
  **Bounded by these, which are ours to build rather than his to decide:**
  - The source must be **named on the record**, not merely "third-party" as a
    category. `detailsVerifiedBy: third-party` already exists as a value; what it
    does not carry is *which* third party, and an unnamed source cannot be
    re-checked or retired when it goes bad.
  - 🚩 **This ruling makes the deferred per-branch provenance item load-bearing,
    and that is the consequence worth stating out loud.** Today `detailsVerified`
    is **venue-level**, and the honest read is "weakest input wins". So one
    third-party branch would drag a whole chain's derivation down to
    `third-party` — including branches whose address and phone came from the
    company's own site. Pandan already proved the gap with one record; this
    ruling turns it from a curiosity into a blocker on doing the work honestly.
    **Build per-branch `detailsVerified`/`detailsVerifiedBy` first, then capture
    the hours.**
  - A third-party "open" must never read as strongly as a first-party one on
    screen. ADR 0054's three states were designed so nothing is labelled on a
    guess; this adds a fourth kind of knowing and the card should say so.
- 🎯 **The order pill covering a dietary chip: leave it, record it.**
  Recommendation was not offered as a preference and none was needed — he took
  the record-it option. It fires only at the browser's *Very large* text setting.
  It stays an open item under Theme 29 with its measurement (82.5% covered, 0.0 ×
  8.3 px reachable), **ruled deliberately deferred rather than unnoticed** — the
  distinction that matters when someone finds it again.
- 🎯 **`detailsVerified` ageing: split it — opening hours get their own limit,
  phone and address share another.** ⚠️ **This goes further than the analysis
  recommended.** The session's finding was that *no* limit could be chosen yet,
  because every dated record sits inside one 48-hour window and nothing has had
  the chance to go stale; the split was offered as the more honest but heavier of
  three options. He took it. So the shape is settled and the numbers are not —
  and the numbers still cannot come from this corpus. **Build the two-field shape;
  the limits themselves still need either elapsed time or an owner estimate.**
  Note it composes with the ruling above: per-branch provenance and per-kind
  ageing are the same field growing two dimensions at once, and doing them in one
  pass is cheaper than twice.
- 🎯 **The te reo review queue: parked, not scheduled.** Stop adding string
  families to it. [`reo-review-queue.md`](reo-review-queue.md) keeps what is
  already drafted, and the safety copy stays English — which was always the safe
  default and costs nothing but time. **The honest consequence:** the te reo
  chrome stays partial indefinitely, and that is now a decision rather than a
  backlog. Do not open new `[reo]` items without asking.

---

## Owner rulings — 2026-08-16 (end of the branch-picker session)

Four decisions taken at close, all put to him with a recommendation. **He went
against the recommendation on two of them, and both are recorded here as ruled,
not as argued.**

- 🎯 **Reset becomes TWO gated controls.** "Reset preferences" keeps today's
  narrow scope (one profile's dietary needs, flagged allergens, distance, units,
  language, maps app) and a second **"Delete everything"** wipes all profiles,
  favourites, ratings and the order tally. Each behind its own typed
  confirmation with *different* wording, so the two can never be confused at the
  moment of tapping. This resolves the mismatch flagged when the "I agree" gate
  shipped: his original wording asked the phrase to acknowledge the destruction
  of all personal data, and now there is a control for which that is true.
- 🎯 **Once sync exists, Reset propagates to every device.** *"Everywhere,
  always."* ⚠️ **Recommendation was device-only and was declined** — recorded so
  the next session does not re-propose it. The consequence is stated once and
  then built to: a mistap on a phone destroys allergen flags on every synced
  device at once, and sync cannot re-populate what no device still holds. So the
  confirmation on a propagating reset must **name the number of devices it will
  reach**, and Theme 9 must not ship sync before that wording exists. The
  ruling stands; the guard-rail is ours to build.
- 🎯 **Activity history: honest log, no escape hatch.** Nothing can be erased
  short of wiping the whole log — removals appear as removals, and there is no
  per-entry "forget this". ⚠️ **Recommendation included the escape hatch and was
  declined.** Simplifies Theme 32a: no per-entry deletion, no tombstones. The
  screen must still state the rule in one sentence, because "remove" meaning
  "recorded as removed" is a surprise unless it is said.
- 🎯 **Theme 30a: hold the build, write the ADR now.** No venue in the corpus has
  two menus, so building it would ship a schema nothing exercises. The shape gets
  recorded while the survey is fresh; the build waits for a real two-menu venue.
  The cheap independent pieces (cuisine axis, allergen regime field, `channel` on
  a price record in `data/`) can proceed meanwhile.

✅ **And one loose end closed:** the dead Filters button was a stale service
worker, confirmed by the owner after a Refresh. It was never a code fault — the
mechanism is ADR 0056's precache reading the browser's HTTP cache.

---

## Recommended sequence

⚠️ **The sequence below is the one set on 2026-07-08, and steps 1–4 plus the
first two of step 6 have all since shipped.** It is kept because it records
*why* the order was chosen, not because it describes what to do next — read
cold it implies nothing has landed. Reviewed 2026-08-15.

| # | The 2026-07-08 plan | Where it stands |
|---|---|---|
| 1 | Coordinates + native-maps handoff (S) | ✅ shipped — Theme 2 |
| 2 | Order tally (M) — the flagship | ✅ shipped 2026-07-08 — Theme 1 |
| 3 | Design pass (M) | ✅ shipped — Theme 3 |
| 4 | Distance-sorted "what's close" (M) | ✅ shipped — Theme 2 |
| 5 | Content growth + dish photos | 🔄 ongoing, in parallel — Theme 4 |
| 6 | Extended allergens (S) → curated/local ratings (M) → nutrition where owned (L) | ✅ first two shipped (Theme 5); **nutrition not started** |
| 7 | Health app — a separate project | ⏳ not started — Theme 6, still the north star |

**Parallel, any time (Theme 7):** ✅ both delivered — the zero-dependency CI
guard and the published SBOM shipped with the Phase 7 deploy, so the live site
has carried a provenance artefact since day one.

**What actually sequences the open work now** is the theme list above, not this
table. The live roadmap is Themes 1–19; the flagship open work is Theme 14
(add-ons), Theme 15 (UI consistency) and Theme 17 (cook mode), each with its
own internal ordering stated in the theme.

**Owner calls — resolved 2026-07-08** (kept as the record of what was decided
then; two have since moved):
1. Order tally: **in** (shipped); STRATEGY non-goal clarification landed.
2. Ratings: **show the live number when online (edge-function proxy),
   link-out when offline; dish ratings curated** — see Theme 5. *Ratings
   shipped; the UX is on attempt 3 and owner-gated.*
3. Feedback intake: **no email; parked** — deploy first (Theme 4c).
   ⚠️ **Reversed 2026-08-09** — Theme 4c was reactivated by the owner
   ("tell us what's wrong or missing"). This line is superseded.
4. SBOM: **CycloneDX JSON at `/.well-known/sbom.json`** — see Theme 7.
   ✅ Shipped and serving.

## Theme 35 — the search box as a split-flap board (owner-raised 2026-08-16)

**The ask, raw (owner):** *"An idea in the main page search bar that alternates
the prompt text like 'Search a place -- Southern Cross' rather than a fade in
and out I am thinking maybe the text wipes from left to right or vice versa
character by character… Or an animation like the old airport signs where the
characters would flip continuously until they showed the letter required — I
quite like that idea if you can make it look good."* Reference photo supplied:
a Solari departure board mid-flip.

🎯 **Owner ruled 2026-08-16: roadmap it, finish the section-id build first.** He
was offered "build it now" and "prototype it, don't ship it" and chose neither —
this is queued, not shelved, and he can reorder at any time.

### 🔎 The finding that makes this smaller than it looks

**This is a transition swap inside a module that already exists**, not a new
feature. `site/js/search-hints.js` already rotates the placeholder through
example hints and already carries the hard parts:

| Already built | Where |
|---|---|
| Rotation with an injectable timer, fully unit-tested (247 lines of tests) | `search-hints.js`, `tests/search-hints.test.js` |
| `prefers-reduced-motion: reduce` pins to the first hint and **never starts a timer** | `search-hints.js` |
| Stops on focus and while the field has text — it cannot change under someone reading or typing | `search-hints.js` |
| Accessible name comes from the `<label>`, never the placeholder, so nothing retitles the field mid-interaction (WCAG 2.5.3) | `index.html:126` |
| The honesty rule: a hint may only advertise something the index can actually find | `search-hints.js` header |

So the work is **replace the 450 ms cross-fade (`.hint-fading` + a
`::placeholder` opacity transition, `app.css:452`) with a per-character flip**,
and leave every accessibility guarantee where it is. Sizing on that basis:
`[M][design]`, not `[L]`.

### 🚩 The one real obstacle, and it decides the shape

**You cannot animate inside a `placeholder` attribute.** It is a string, not a
DOM tree — there is no per-character element to flip, and `::placeholder` styles
the whole run. Two ways out:

1. **Rewrite the attribute every frame** — `input.placeholder = frameText`. Zero
   new DOM, works with the existing module almost unchanged. **Rejected on
   accessibility:** the placeholder is exposed to assistive tech, and churning
   it 20×/second is a screen-reader hazard the current design specifically
   avoids. It also fights the reo language toggle, which sets `placeholder` from
   `data-i18n-ph` (`reo.js:309`).
2. **An `aria-hidden="true"` overlay span** positioned over the input, with the
   real `placeholder` left as one stable string underneath. **Recommended.**
   Assistive tech and the reo toggle keep reading a calm, translated string;
   the flap is decoration that never enters the accessibility tree. Hidden the
   moment the field has focus or text, so it can never sit under a caret.

### What "make it look good" actually requires

- **Flip through a real alphabet, not random glyphs.** A Solari board steps
  A→B→C→… to the target letter, which is why it looks mechanical rather than
  glitchy. Uppercase-only is authentic and also sidesteps the descender jitter
  that makes mixed case look broken mid-flip.
- **Stagger, don't sync.** Every character starting and stopping together reads
  as a fade. A small per-character delay (each letter settling a few frames
  after its neighbour) is the whole effect.
- **Settle, then stop.** The animation must reach a resting state and cancel its
  frame loop — a permanent `requestAnimationFrame` on the home screen is a
  battery cost on the device this app is designed for. Also pause on
  `document.visibilityState !== "visible"`.
- **Two candidate texts, and they are different jobs.** The owner's example
  pairs a prompt (*"Search a place"*) with a venue name (*"Southern Cross"*).
  The existing hints are capability examples. Whether the board flips between
  those two kinds, or the venue names come from `index.json`, is a content
  decision worth making before the animation is tuned.

### Owner decisions this needs before it is built

- 🎯 **Uppercase-only, or preserve the venue's own casing?** Authenticity vs
  reading "SOUTHERN CROSS" for a place written "Southern Cross" everywhere else
  in the app.
- 🎯 **Does the board flip venue names from the collection**, or only the
  capability hints it shows now? Naming real venues is a nice touch and it makes
  the placeholder content depend on data the home screen already loads.
- 🎯 **What does a reduced-motion reader get?** Recommendation: the current
  behaviour exactly — the first hint, static, no timer. That is already what the
  module does, so this is a confirmation rather than work.

### Out of scope unless asked

The same treatment on the menu-page search box (`Search this menu…`). One
animated placeholder is a flourish; two is a tic, and the menu box is used
mid-task where the home box is used on arrival.

---

## Theme 36 — cooking is not ordering (owner-raised 2026-08-16)

Owner, after a session on the live site: *"review the UX of the whole cook at
home and recipes because I think it can be better. Think holistically about the
UX across the app and recognise that cooking recipes is not identical to
ordering food from a restaurant."*

Four of his specifics shipped the same session (the cook button, the per-step
ingredients, the per-step timer, the recipe page's top bar — see CHANGELOG).
What is left is the structural half he was pointing at, plus the two asks that
turned out to be blocked on data rather than on design.

### 🔎 The finding, corrected against [ADR 0003] — this is DRIFT, not a design gap

⚠️ **First pass at this theme missed that the question was already decided.**
[ADR 0003] (accepted 2026-07-06) chose `kind: "recipes"` reusing the venue
shape, and its **Rejected** list already covers two of the three options below.
Anyone reading this theme must read that ADR first; the recommendation survives,
the framing needed fixing.

What ADR 0003 actually decided: venue-only fields **relax** for recipes —
`area`/`city`/`address` *may be null*, `services` empty, no contact or order
card. It explicitly rejected *"forcing recipes into a fake venue"* on the
grounds that it produces *"misleading contact/service semantics… and pollutes
the area/cuisine filter facets"*.

Measured against that, `site/data/restaurants/cook-at-home.json` is **partly
compliant and partly the very thing the ADR rejected**:

| Field | Value | Against ADR 0003 |
|---|---|---|
| `address`, `phone`, `website`, `hours`, `city`, `verified` | `null` | ✅ the relaxation the ADR granted |
| `services`, `ordering`, `vibe` | `[]` | ✅ as specified |
| `currency` | `"NZD"` | ✅ **owner ruling, 2026-08-16** — see below |
| `area` | `"Home"` | 🤔 an invented suburb rather than the `null` the ADR allowed — open question |

🎯 **Owner ruling on `currency`, 2026-08-16.** This analysis called it a fake
fact on a collection with no prices. He disagreed, and he is right: *"a recipe
may in the future include the total cost to make that dish."* The field is
**anticipatory, not spurious** — a recipe that one day carries a cost needs a
currency to carry it in, and NZD is the correct one. Corrected here rather than
quietly dropped, because the reasoning is the useful part: a field that looks
empty may be holding a place. See 36f, which is the feature behind it.

That leaves `area: "Home"` as the only open one, and it is a question rather
than a finding: ADR 0003 allowed `area` to be **null** for recipes, and the
facet pollution it feared is dodged in code rather than in data —
`filters.js` opens with `if (r.kind === "recipes") continue`. So `"Home"` is
inert today, on a guarantee held by a single line. Worth deciding deliberately:
either null it per the ADR, or keep it and say what reads it.

The code then subtracts what the data asserted: **`kind === "recipes"` is
special-cased in about twenty places** across `app.js`, `menu.js` and
`filters.js` — no hours badge, no distance, no contact card, no report button,
no price, a different search placeholder, a different card class, pinned to the
top of every ranking. A recipe row is `renderDish()` with an `isRecipes` flag
threaded through it.

None of that is *wrong* — it shipped a working screen cheaply, and reuse is why
recipes got favourites, ratings, allergen flagging, offline and search for free.
But it is why the owner can feel the seam. Every screen starts from "restaurant"
and reasons its way to "not that", and the leftovers show: the giant orange
order-style button, the back link that belonged to a menu page, the ⋯ menu that
was never added because a recipe was not thought of as a destination.

### The design question, stated once

**Is a recipe collection a `kind` of venue, or its own thing?** Three answers,
and the cheap one may well be right:

1. **Keep the shared shell, name the seam** `[M]`. Replace the twenty scattered
   `isRecipes` branches with one declared capability set per `kind` (has hours,
   has a location, has prices, can be ordered, can be reported). Same screens,
   same reuse, but a screen asks "does this have hours?" instead of "is this a
   recipe?". Cheapest, and it makes the next `kind` free.
2. ~~**A parallel screen for collections**~~ 🛑 **already rejected by
   [ADR 0003]** as *"a separate content type with its own route/renderer"* —
   it duplicates the menu screen, the filters and the card logic for a
   collection that is 95% the same shape, and forks the search/favourites/
   offline paths that currently come free. Do not re-propose without
   superseding that ADR.
3. **Leave it and keep patching** `[S]` — what today did. Fine once; the third
   time is a pattern.

Plus one cheap open question regardless of which is chosen: **`area: "Home"`** —
null it per ADR 0003, or keep it and name the screen that reads it. `[XS][data]`
(`currency` is settled and stays — owner ruling above.)

🎯 **Recommend 1**, and note it does not contradict [ADR 0003] — it *implements*
it. The ADR said venue-only fields relax for recipes; twenty `isRecipes`
branches are that relaxation expressed as scattered conditionals instead of as a
declared property of the `kind`. Option 1 turns the ADR's prose into something
the code can read. Do it before any further recipe UX, or the next fix lands on
the same sand.

[ADR 0003]: decisions/0003-recipes-as-kind-not-separate-type.md

### 36a — what the data says about time, and what it doesn't `[S][data]` 🎯

The owner asked for *"an estimate of time required for each step and each recipe
as a total"*. Measured across the corpus, 2026-08-16:

| | have it | missing |
|---|---|---|
| Steps stating their own duration | **28 of 118** (24%) | 90 |
| Recipes with a `time` total | **9 of 24** | 15 |
| Recipes with a `serves` count | **3 of 24** (Liège Waffles 12, Chocolate Self-Saucing Pudding 6, Tiramisu 6) | **21** |

The 28 stated step times now drive the timers, and they are read from the text,
never guessed. The other 90 steps have **no source**: how long "beat together
the sugar and butter" takes is not in the data, not on the page, and not
something this repo may invent — a wrong time on a cake is a burnt cake.

⚠️ **And the sum of stated steps is not a total.** Chocolate Self-Saucing
Pudding's steps state 35 minutes; its `time` is "~35 min" — but Perfectly Pretty
Hotcakes states 5 minutes across its steps against a `time` of "~50 min",
because prep is untimed. Publishing sum-of-steps as a recipe total would
understate most recipes by most of their length.

🎯 **For the owner — this one only you can close.** Per-step times and the 15
missing totals need to come from you (or from cooking them). Say the word and
the field goes in the schema and the screens read it; what will not happen is a
number being invented to fill a column.

### 36b — the quantity used *at this step* `[L][schema][data]` 🎯

The owner's example: *"lets say a recipe called for 2 cups of sugar in total,
but only 1 cup is used at this step… show just the 1 cup."*

Shipped today: the step shows the lines it names, at the recipe's **stated**
quantity. Correct whenever an ingredient is used all at once — which is every
case in the current corpus — and an overstatement when a recipe splits one line
across two steps.

**Not shipped, because it does not exist.** `ingredients` is a flat list of
free-text lines; `steps` is a flat list of sentences; nothing links the two and
no line records a split. Getting there means `steps` becomes objects carrying
`uses: [{ ingredient, amount }]`, an ADR for the schema, and a hand pass over
**all 23 recipes with a method** — the work is the data entry, not the code.
Note the corpus is already doing this by hand and badly: Chocolate Self-Saucing
Pudding has `"1 tbsp cocoa"` and `"Sauce: ¼ cup cocoa"` as two lines, and
Upside-Down Plum Cake prefixes every line `Topping:` or `Batter:`. The `"Sauce:"`
convention *is* a per-step grouping, invented by whoever typed it in. That is
the strongest argument that the model wants the structure.

### 36c — serving sizes `[M][data]` 🎯 ⚠️ **not researchable**

The owner asked me to research estimated serving sizes. **21 of 24 recipes have
none, and for most of them no source exists**: "Booth's Ginger Crunch",
"Shane's Ribs", "B's Dope-As Brownie", "Jesse's Garlic Chicken Thighs" and
"Famous Brade Green Chicken Curry" are family recipes. A few are adaptations of
published ones (the Edmonds cookbook is credited on the pudding), but a serving
count taken from a published recipe is a claim about *that* recipe, not this
variant of it — and this dataset is public.

What *is* honest, and is the recommendation:
- **Two are already stated in the data and simply not read**: Queen Cakes' step
  says "(makes 21)", and the pudding's "1.5–2L ovenproof dish" bounds it.
  Surface a yield where the text already carries one — no new facts.
- **Everything else comes from the owner.** He has cooked them.
- If he wants estimates rather than facts, they can be derived from tin size and
  batter volume and **shown as estimates** — but that is a labelling decision he
  should take deliberately, not one to slip into a public dataset.

### 36d — the timer's missing half `[M][design]` ⚠️

The timer shipped today is silent. It counts correctly through a sleeping phone,
and cook mode holds the screen awake so it is visible — but a phone face-down on
the bench while you do something else will not tell you the bell has gone.
A real alarm needs either audio (an asset, and autoplay policy) or a
notification (a permission prompt, and a service-worker path). Both are new
trust surfaces on a site that currently asks for nothing. Worth doing, worth
deciding deliberately.

### 36e — one place to look, not two `[M][ux]`

A recipe currently renders **twice**, through two code paths: expanded inside
the Cook at Home list (`menu.js` `<details>`) and on its own page (`recipe.js`).
The owner's screenshots show near-identical content in both. That is why the
cook button had to be fixed in two places, and why it had to be given two
weights. Decide what the list row is *for* — a preview that makes you choose, or
the whole recipe — and let the other path be the one that owns the detail.

### 36f — what it costs to make it `[L][schema][data]` — owner-signalled 2026-08-16

Raised by the owner while correcting this theme: *"a recipe may in the future
include the total cost to make that dish."* That is why `currency` sits on the
collection, and it is a stronger feature than it first looks — **Faves' whole
question is "order out, or cook?", and it currently answers only one half of it
with a number.** A recipe that says "$14 to make, serves 6" beside a takeaway
that says "$28" is the app finally comparing the two things it puts side by side
on the home screen.

**What makes it hard is not the arithmetic.** A cost needs a price per
ingredient, and:
- **We do not hold grocery prices, and they move.** Menu prices come from the
  owner or an owner-directed fetch (CLAUDE.md's standing rule); grocery prices
  are a different corpus entirely, with no first-party source and weekly drift.
  Every objection that blocked live menu scraping applies here with more force.
- **A recipe line is prose, not a quantity.** "Water or milk, as required for a
  thick batter" cannot be costed. The same ingredient/step structure 36b needs
  is the prerequisite here too — this is 36b's schema, used a second way.
- **Pack sizes, not recipe sizes.** A recipe wanting 100g of butter costs a
  500g block; "cost to make" and "cost to shop for" are different numbers and
  the app must not conflate them. Which one is wanted is a design call.
- **ADR 0047 applies.** A per-ingredient price is a field on every recipe line,
  precached to every phone. It ships only if a screen renders it.

🎯 **The staged version that is actually buildable:** an owner-supplied
`costToMake` on the recipe — one number, one date, his own figure — rendered
beside `serves` as "about $X, serves Y (priced <date>)". No grocery corpus, no
per-ingredient maths, no invented facts, and it answers the comparison question
today. Per-ingredient costing stays behind 36b's schema.
⚑ The full version needs a decision on where grocery prices come from, which is
a new content source and therefore the owner's alone.

### Sizing

36a and 36c are small in code and blocked on the owner. 36b is the big one and
is mostly data entry — and it is the prerequisite for the full 36f, so doing it
once buys both. 36f's staged version is `[S]` and independent of all of it. The
structural call above (1/2/3) should be taken before 36e, because 36e is a
symptom of it.
