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
- [~] **McDonald's — finish the flesh-out** `[M][content]` (part (a) ✅ done
  2026-08-09; b/c/d stay open) — added 2026-07-23 as
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
missing price stays `null` and renders "varies"; nothing is inferred from a
neighbouring card or a delivery app.** Clear one by bringing back the fact.

- [ ] **Gold Lining — two unread prices** `[S][content]`. From the 2026-08-07
      cabinet photos: the **Falafel Wrap** (label sat behind the cabinet
      frame) and the **Bliss Balls** (no price card in shot). Both `null`
      today. One photo of each label clears it.
- [ ] **Gold Lining — the juice fridge** `[S][content]`. Not itemised at all:
      no legible prices and only one brand partly readable. Needs a shelf
      photo before anything can be recorded.
- [ ] **Gold Lining — bliss-ball label: flavours or ingredients?**
      `[S][content]`. The jar reads "cashew, almonds, matcha, apricot, dates,
      chocolate, chia, coconut, sunflower"; owner unsure which it is. Stored
      as ingredients on one item, because that reading holds either way —
      cashew and almond are present on both, so `contains-nuts` is correct
      regardless. If they are nine flavours, this splits into nine items and
      nothing already written has to be undone.
- [ ] **Gold Lining — brunch window vs opening hours** `[S][content]`. The
      printed card says brunch 7.30am–2.30pm; the record holds 07:30–15:30
      weekdays. Left as a *service* window on the assumption the cabinet
      carries on after brunch stops — worth one glance in-store to confirm
      closing hasn't moved.
- [ ] **`picks` are empty on most venues** `[S][content]` — including the two
      newly menu-complete ones (Gold Lining, Takeaway @ Churton). `picks`
      drives the "our picks" surface and `validate.py` warns on each empty
      one, so the warnings are the worklist. Owner-supplied only: these are
      *our* favourites, not a guess from the menu.
- [ ] **17 venues are still `stub`** `[M][content]` — they render as "menu
      coming soon" cards and never as empty menus, so this is a backlog, not
      a defect. Same `intake/` pipeline. **Re-counted 2026-08-09 from the
      data**, correcting "16 … 12 menu-complete": it is **17 stub and 14
      menu-complete across 31 records**. Of those 14, only **two** carry a
      `verified` date (Gold Lining, Takeaway @ Churton) — which is the
      concrete cost behind Theme 13g below: the "needs a refresh" caveat
      currently fires on 29 of 31 records, so it tells the reader nothing.

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

- [ ] **14a — Structured add-ons** `[L][schema][content]` — optional `addOns` on
  a dish (`{ name, price, tags }`) plus a **reusable group** defined once per
  section or venue that dishes reference, so "brunch sides" attaches to eight
  brunch dishes without being written eight times. Design calls: single-select vs
  multi-select per group (the Garden Salad's "chicken, halloumi, prawns **or**
  beef" is a pick-one; brunch sides are pick-many); whether an add-on may itself
  be an existing menu item by id (the brunch sides *are* menu items) or is always
  a standalone record. Record in `ARCHITECTURE.md` + enforce in `validate.py`
  when it lands.
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
- [ ] **14d — Safety: an add-on carries its own tags** `[M]` 🚩 — **the
  load-bearing point.** Adding halloumi to a dairy-free dish makes it not
  dairy-free; a satay add-on makes a dish contain peanuts. So `dietary.js`'s
  `dishFlagged` / `dishSatisfiesDiet` must evaluate **dish + selected add-ons**,
  not the dish alone, and the order line must show the resulting warning — a
  dish that was safe when you tapped it can stop being safe when you configure
  it. This is not optional polish on 14a; it ships with it.
- [ ] **14e — Order-tally knock-ons** `[M]` — a dish added twice with different
  add-ons is **two lines, not a quantity of 2**; the subtotal maths takes add-on
  prices; and the group-order share codec (ADR 0009) has to carry the
  configuration, which means a **versioned codec bump** and a receive-side path
  for links minted before it. Audit these together before building 14a, not after.

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

**c. Home screen: one place for filters** `[M][design]` — **owner, raw:**
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
  - 🚩 **Still worth doing, found while building:** cook mode has no real-browser
    regression guard of its own. `device_check.mjs` is scoped to the allergen
    re-apply, and the 28-assertion Chrome run that caught two wake-lock leaks was
    a throwaway script. Either widen that tool's remit or give cook mode a
    sibling — the leaks it found were invisible to `node --test`.
- [ ] **17e — The rest of what the research turned up** `[S]`–`[M]` each,
  ordered by how well they fit a zero-dependency offline app:
  - **Tick off ingredients and steps as you go** — a checklist with state that
    survives a phone call. Cheap, and every app tested has it.
  - **Ingredient-first search** — "what can I make with mince and a lemon?".
    Faves already has a search index; recipes just aren't in it by ingredient.
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
  - **Oven temperature conversion** (°C/°F) — falls out of Theme 18 for free.

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

## Also parked (small)

✅ **A negative dish price validated clean — fixed 2026-08-09.** Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- [~] **`pathscan` is decorative here — 25 standing findings** `[S][docs]` —
  **our two classes done 2026-08-09** (wt: `faves-pathscan`): 34 findings
  down to 14, and every one of the 14 is the upstream defect. The item stays
  open only for that class, which is blocked on the owner call below.
  Found 2026-08-09. It runs warn-only in our floor and has accumulated
  standing findings, which means nobody reads it, which means a *real* stale
  path now hides in the noise. That is the whole cost: a guard with standing
  false positives is a guard switched off. Triaged into three classes; **the
  "25" in this item's own title was already stale by fix time — the real
  count at fix time was 34** (findings accrue between the roadmap note and
  the fix landing; title left as the original identifier, not corrected).
  Corrected triage, verified against the live scan:
  - **16 are an upstream scanner defect, not ours — still open, untouched.**
    A root-anchored path whose first segment starts with a dot is mangled:
    `/.well-known/x` is extracted as `known/x`, losing `.well-` and the
    leading slash, so it reports missing while the file plainly exists.
    Minimal repro in a clean throwaway repo: `site/.well-known/sbom.json`
    and `site/.well-known/security.txt` both **pass**;
    `/.well-known/security.txt` on its own line **fails** as
    `known/security.txt`. So the trigger is the leading-slash-plus-dot form,
    not dot-directories in general. Ours are honest URL references to files
    that exist — this is atelier's `pathscan` to fix. ✅ **RULED and queued
    upstream 2026-08-09.** The owner resolved the tension in favour of the
    CONCURRENCY rule: **a child repo may queue a *finding* in the target
    repo's own roadmap — queue, never deliver.** The standing correction
    (faves lives within the doctrine and does not create it) still holds and
    is not weakened: a finding is not doctrine, and no fix, test or marker
    was written upstream. Filed as **atelier `ROADMAP.md` Track E, item E8**
    (`atelier@88a54a3`), with the minimal repro. Track E's own premise is
    verbatim this defect — *"every false positive on a correct line trains
    someone to allow-marker it, and that is how a scanner's output stops
    being read"*. Left flagging here, no allow-markers added: masking these
    would hide the exact signal a future real `.well-known` typo needs to
    surface, and would keep the count dishonest while the fix is pending.
  - ✅ **10 were ours and genuinely loose — fixed 2026-08-09.** Prose
    shorthand that omitted the real path (`data/index.json` → <!-- pathscan:allow: the pre-fix shorthand this bullet documents, not a live reference -->
    `site/data/index.json` in `ARCHITECTURE.md`, `WORKPLAN.md`, ADR 0015's
    table and prose; `data/restaurants/cook-at-home.json` → <!-- pathscan:allow: the pre-fix shorthand this bullet documents, not a live reference -->
    `site/data/restaurants/cook-at-home.json` here and in
    `ARCHITECTURE.md`), one reworded non-path collision each in this file
    (`docs/records` → "our records", a slash that read as a path but meant <!-- pathscan:allow: the pre-fix wording this bullet documents, not a live reference -->
    "and") and in ADR 0019 (`Docs/tests` → "Docs and tests", same shape — <!-- pathscan:allow: the pre-fix wording this bullet documents, not a live reference -->
    the ADR's decision content is unchanged, only the accidental path-shaped
    slash). No target was invented; every fix pointed at a file confirmed to
    exist.
  - ✅ **8 were correct as written — marked 2026-08-09.** Cross-repo atelier
    paths (`docs/method/ECONOMICS.md` in `CLAUDE.md` and <!-- pathscan:allow: atelier cross-repo path, correct as written -->
    `MODEL-ECONOMICS.md`, `docs/method/PROPAGATION.md` here), a cross-repo <!-- pathscan:allow: atelier cross-repo path, correct as written -->
    pointer to the `rpi` repo's own ADR 0009 here, the
    `mike548141/atelier/.github/workflows/floor.yml` Actions slug in <!-- pathscan:allow: GitHub Actions reusable-workflow slug, not a local path -->
    `GO-PUBLIC.md`, and three historical references inside the append-only
    `SESSIONS.md` (an atelier `docs/method/` drift note, a since-removed <!-- pathscan:allow: atelier cross-repo path, correct as written -->
    `__pycache__` artefact, and the `faves-allergen-inference` worktree) —
    each got a `pathscan:allow` marker stating why it resolves outside this
    repo or only at the time it was written; no history was rewritten.
    Two more findings sat inside this very bullet's own prose, quoting
    `data/index.json` and `docs/decisions/0009` as *examples* of the loose <!-- pathscan:allow: quoted as an example of the defect, not a live reference -->
    class above — marked `pathscan:allow: quoted as an example of the
    defect, not a live reference` rather than rewritten, since rewriting
    the example would have destroyed it.
  Re-scan after the fix: 16 findings, all class 1, matching exactly.
  Verification: `tools/validate.py`, `check_no_deps.py`,
  `check_visibility.py`, `gen_sbom.py --check`, `node --test` (505/505) and
  atelier's `linkscan.py` all still pass.
- [ ] **`plainscan` arrived with 1177 findings and no decided scope**
  `[M][docs]` ⚑ — found 2026-08-09 bumping the pin to `atelier@5c16a59`.
  Atelier withdrew its long-standing claim that write-time discipline is the
  *only* control over communication prose, and shipped `plainscan` to enforce
  the machine-decidable half. Our floor picked it up through the shared
  registry, warn-only. Day-one count here: **1177** — P1 undefined reference
  ×28, P2 unexpanded acronym ×126, P3 long sentence ×549, P4 buried aside
  ×474. **This is not yet the decorative-guard failure `pathscan` had** — it
  is one day old and nothing has been swept. It becomes that failure if it
  sits.
  🚩 **The scope question is the whole item, and it is not obviously ours to
  answer.** The three heaviest files are `SESSIONS.md` (341),
  `SESSIONS-ARCHIVE.md` (176) and `ROADMAP.md` (190) — and the two session
  logs are **append-only records**. Sweeping them means rewriting history to
  please a scanner, which the house forbids on the same grounds that stopped
  the `pathscan` sweep touching them. So the plausible scopes are: (a) the
  live current-truth docs only (`ARCHITECTURE`, `DESIGN`, `STRATEGY`,
  `CLAUDE.md`, `README`, the ADRs) and records exempted by an ignore rule;
  (b) everything, accepting history gets marked not edited; or (c) leave it
  advisory and treat the count as a write-time nudge. 🎯 **Owner call**, and
  worth pairing with the P3 word limit — atelier's own docstring says the
  35-word cap is a **house call, not a published standard**, and "the one
  number in this file the principal should rule on".
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
  adopt the markers here. Until then the check is by hand: **verified
  2026-08-09** — the canonical floor region is byte-identical to the pinned
  version, so our copy has not drifted.

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
the live site ships with a provenance artefact from day one.

**Owner calls — resolved 2026-07-08:**
1. Order tally: **in** (shipped); STRATEGY non-goal clarification landed.
2. Ratings: **show the live number when online (edge-function proxy),
   link-out when offline; dish ratings curated** — see Theme 5.
3. Feedback intake: **no email; parked** — deploy first (Theme 4c).
4. SBOM: **CycloneDX JSON at `/.well-known/sbom.json`** — see Theme 7.
