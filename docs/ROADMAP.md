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
- [ ] **McDonald's — finish the flesh-out** `[M][content]` — added 2026-07-23 as
  a 5-branch listing with the enduring menu (items only; **prices "varies"** —
  not published per-store, so null, no fabrication). Remaining, all content (no
  code): (a) **dev-time geocode the 5 branches** so it shows in Near-me **and so
  the contact card shows the 2 *nearest* branches** — today, with no coords, the
  branch cap falls back to the first two in data order (Courtenay Pl + Lambton
  Quay show even when Johnsonville/Porirua are closer to the viewer). The sort
  logic already exists (`orderedBranches` → `branchesToShow`); it just needs the
  coords. (b) **self-hosted product photos** — **owner accepted the copyright/IP
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
  render and the live re-apply call, so they can't diverge; `menu.js`
  `wireLiveSafety()` re-renders on `settings.subscribe` (any pref change) and on a
  profile switch (reloads favourites/ratings/settings), mirroring the home page's
  proven mechanism; `settings-btn` added to restaurant.html's ⋯ (markup identical
  to home) + `initSettingsUI()` in `initChrome`. **Adversarially safety-reviewed**
  (see reviews/). 🚩 **Owner MUST confirm on a real device** (fresh browser /
  `--user-data-dir`; the SW hides changes otherwise): flip an allergen pref on a
  menu → warnings light up live without reload; switch profile → safety treatment
  + hearts/ratings re-apply. Known by-design trade-off: a settings/profile change
  re-renders the whole menu, so an in-progress **search query + scroll position
  reset** (and the ad-hoc dietary-chip toggle). 🎯 **Owner ruling 2026-07-25 —
  queue a refinement** `[M]`: a later session preserves in-session UI state
  (search query, scroll position, dietary-chip toggle) across the safety
  re-render. **Hard constraint:** the allergen/dietary re-apply MUST keep sharing
  the first-paint code path — preserving UI state must not fork the render, or it
  reintroduces exactly this session's stale-highlight race. `[~]` unclaimed.
  🎯 **Owner ruling 2026-07-24 — queue a
  dedicated browser-tooling session** to script this device check (headless Chrome
  with a fresh `--user-data-dir` to bust the SW), rather than a manual phone test.
  Until that passes, treat the live allergen re-highlight as **proven-by-tests,
  not yet device-confirmed**. [~] unclaimed — the verification session.
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
- [ ] **Coordinate audit** `[S]` — follow-on: dev-time geocoded coords are
  suspect fleet-wide (R & S proven ~100 m off). Sweep all venue coords against
  their street addresses; affects distance sort + detour maths accuracy.
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
- [ ] **16 venues are still `stub`** `[M][content]` — they render as "menu
      coming soon" cards and never as empty menus, so this is a backlog, not
      a defect. Same `intake/` pipeline; 12 are menu-complete as of
      2026-08-08.

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

- [ ] **4c-i — Report from where the problem is** `[M][design]` — the design
  call that makes or breaks this: a report raised **from the dish or venue
  itself** arrives with the venue id, dish name and the value we're currently
  showing already attached, so the owner can act on it without a conversation.
  A blank "contact us" form does not. Put the entry point on the dish row's ⓘ /
  overflow and on the venue contact card, plus one general "suggest a place" on
  the home screen.
- [ ] **Transport — ✅ RULED 2026-08-09: compose-and-share** `[M]`. The owner
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
- [ ] **Safety rule, non-negotiable** — an allergen correction is **a suggestion
  to the owner, never a live edit**. Nothing a reporter submits may change what
  the app flags; corrections land in the repo through a human. The reverse
  failure — someone "correcting away" a peanut tag — is a safety failure, not a
  data-quality one. Inherit the existing allergen framing verbatim.
- [ ] **Offline behaviour** — the whole app works in flight mode, so the report
  form must too: compose offline, queue or hand to the share sheet, never lose
  what was typed to a failed fetch.

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
⚑ **Deliberately deferred** (ADR 0024's rejected alternative): a `may-contain`
tier that shows a reader *which* tier a tag came from. Right in principle, but
it touches the vocabulary, the render and the avoid-matching — all
safety-critical. Revisit if per-dish provenance is ever wanted.

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

## Theme 8 — Making the repo public (parked; owner-gated)

Assessed 2026-07-12: publishable, but sequenced. Flipping visibility is a
floor action (one-way door — forks/copies survive any later unpublish) and
stays the owner's explicit call. Order matters:

1. **GitHub PAT refresh first** (already queued estate-side; still owed —
   see the 2026-08-06 close-out below). The session
   log (`docs/SESSIONS.md`, 2026-07-12 deploy entry) records the current
   PAT as classic + broad and lists unhardened credential roots
   (AWS/Google/TrueNAS); git history preserves that line forever, so the
   fix is making it *historical* — refresh the credential, don't redact
   the log.
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
six-gate publish-safety ADR (rpi `docs/decisions/0009` — leakscan 0,
secretscan 0, full-history blob scan, licence, reconnaissance sweep,
docs-read-as-public), with the evidence produced by an agent and the flip
ruled by the owner. faves follows that template. What the re-assessment
adds to the list above:

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
  addresses and phone numbers in `site/data/` and their echoes in
  docs/records — business data the site exists to publish, not personal
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
**Records publish as-is**, with the PAT made historical by rotation
rather than redacted — under full history redaction achieves nothing,
since the text stays reachable in every clone.

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

1. **Rotate the GitHub PAT and confirm the AWS / Google / TrueNAS
   credential roots are hardened.** The records name them as *queued*
   for hardening; publishing that while it is still true is a live
   disclosure, not a historical one. **This is now the only thing
   standing between the repo and a flip**, and it is estate-side work.
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

- **v1 — shareable-link seed** `[S]` — reuse the `share-codec.js` +
  `favourites.merge()` machinery (already built for group-order / shortlist
  links) to encode hearts+settings into a link/QR you open on a second
  device to seed it. **No infra, offline, ship-ready.** Manual one-shot
  transfer, not sync — the honest ceiling for a pure static site, and the
  foundation v2 builds on. **Agreed to ship as "cross-device" v1.**
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
everyone** (`data/restaurants/cook-at-home.json`, `kind: "recipes"`). The
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
- **12b — Import** `[M][design]` — the pair. Riskier than export: **merge or
  replace?** Recommend **merge**, reusing `favourites.merge()` +
  `share-codec.js` (built for the group-order links), with replace as an
  explicit destructive choice behind a confirm. Two traps: importing a file
  from a *different* device means **profile identity collision** (same name,
  different id — ask, don't guess), and an import carrying **allergen/dietary
  prefs** is safety data, so it inherits Theme 10's framing — never silently
  overwrite someone's allergen settings.
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
sees anything. These are the features that model exists to make possible. None
of them is built; all of them are now cheap, because the hard part — having the
data at all — is done and cannot be retrofitted later.

**a. Upcoming price changes** — *owner's own example: "coffee will be $6 from
Wednesday".* Already a working data fact: an entry with a future `from` resolves
correctly today (you still pay today's price) and `pending()` returns the
announced one. Nothing renders it. The open design calls are the owner's:
- Where it shows — a quiet "→ $6 from Wed" beside the price, or only on the
  dish page? The dinner-choosing UX must not turn into a pricing dashboard.
- Does the order tally warn when a pending change lands before you'd collect?
- Who supplies the dates — a shop's posted notice is the honest source; we
  should not extrapolate a rise we were not told about.

**b. Price trends over time** — *the owner's stated future want.* `priceSeries`
already rides on every resolved dish that has history. Churton is the proof
case: 174 dishes with a 2019 and a 2026 price — a median rise of **50%** (mean
54%, range 16–120%) across those seven years. Possible shapes, cheapest first:
a per-dish "was $10.50 in 2019" line · a sparkline on
the dish page · a venue-level "prices up ~50% since 2019" · a cross-venue view
of what has risen fastest. **Honesty constraint, non-negotiable:** two readings
seven years apart is not a trend line — it is two points. Anything drawn from
them must not imply we watched the intervening years, and a `recorded`-dated
entry ("we read it then") must never render as a `from`-dated one ("it changed
then").

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

**b. One noun for one thing — a wording consistency sweep** `[S]` — **owner,
raw:** *"check the consistency of wording across the app. For example in Settings
→ Distance it says 'Show branches within' vs 'Hide places further than'. I would
prefer to replace branches with places."* Confirmed at
[settings-ui.js:428](../site/js/settings-ui.js#L428) and
[:436](../site/js/settings-ui.js#L436). The app currently uses *venue*, *place*,
*restaurant*, *branch* and *spot* across its copy with no settled rule.

🚩 **One trap the sweep must resolve, not paper over:** those two dials mean
genuinely different things. "Hide places further than" filters **venues** by
reachability; "Show branches within" controls how many **branches of one
multi-branch venue** show on its contact card (the repurposed `favBoostKm` dial —
see the 2026-07-23 ruling above). Renaming both to "places" would make them read
as two settings for the same job. So the deliverable is a **term decision first**
(which noun the user sees for a venue, and what we call one of its locations),
then the sweep — not a find-and-replace.

Scope: every user-facing string, **including the te reo table in
`site/js/reo.js`** — the English and te reo strings are one table and move in
lockstep, so a rename that skips `reo.js` silently desyncs the translation. Code
identifiers stay as they are; this is copy, not a refactor.

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
  wall [ADR 0025] hit in Settings; a wrapping chip row handles it, a fixed bar
  does not.
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
  control, and it scales as filters keep being added (the same lesson ADR 0025
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

- [ ] **16a — Check on resume** `[S]` — call `registration.update()` when the
  page becomes visible (`visibilitychange`) and on `focus`, **throttled** (say,
  at most once every few minutes) so a phone flicking between apps doesn't
  hammer the origin. This is the whole fix for "it never notices", and it's a
  handful of lines in `sw-register.js`.
- [ ] **16b — Tell the user, then reload** `[M][design]` — on `updatefound` →
  the installing worker reaching `installed`, surface it. **Design call:**
  auto-reload vs a quiet "New menus available — tap to refresh" notice.
  Recommend the **notice**: an auto-reload can yank the page out from under
  someone mid-order. The order tally and favourites live in `localStorage` and
  survive, but the search query, scroll position and the dietary-chip toggle do
  not — the same in-session state the Settings re-render already loses (see the
  2026-07-25 refinement ruling). Reload on the user's tap, or silently on the
  next cold start.
- [ ] **16c — "Force a full refresh"** `[S][design]` — the owner's explicit ask,
  and the escape hatch for when 16a/16b still leave something stale. Clears the
  shell + data caches, re-registers the worker and reloads. Two rules it must
  obey: **refuse (or warn hard) when offline** — clearing the caches with no
  network strands the app with nothing to serve, which is the one way this
  feature can make things worse than doing nothing; and **never touch the
  personal layer** — hearts, ratings, settings, profiles and the order tally are
  the user's, not cache. Home: Settings → "Your data" is the honest place (it
  already holds export + reset behind [ADR 0025]'s index), with the wording
  making clear it refreshes *menus*, not *your stuff*.
- [ ] **16d — Version skew, named so it isn't discovered the hard way** `[S]` —
  `skipWaiting()` means a new worker serves new assets to an **old** page, so a
  module the old page lazily imports can arrive from a newer build. It has not
  bitten us (the app imports eagerly at load), but 16a makes updates land far
  more often, which raises the odds. Decide deliberately: keep `skipWaiting()`
  and accept it, or hold the new worker in `waiting` until the user takes 16b's
  refresh. Worth an ADR line either way, since it interacts with [ADR 0015]'s
  split caches.

**Test honestly:** the service worker hides its own changes, so this needs a real
device or a headless run with a fresh browser profile — a hard-reload does not
bust it. The acceptance case is the owner's own:
leave the PWA backgrounded, push a data change, foreground it — the new menu
should appear without killing the app.

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
  - 🚩 **Do not auto-scale cooking times.** The owner asked for it and it is the
    one part to refuse as specified: bake and cook times **do not scale
    linearly** — a double mixture in a deeper dish takes longer, but not twice
    as long, and for anything meat-based an under-scaled time is a **food-safety
    failure**, not a disappointing dinner. Ship a *hint* instead ("a deeper dish
    will take longer — test with a skewer"), and let a recipe carry an
    explicitly authored time for a given scale where the owner knows it.
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
- [ ] **17d — Cook mode** `[M]` — **the research pass's strongest finding, and
  it beats everything above on value-per-effort.** Every current recipe app has
  converged on the same thing: a full-screen, one-step-at-a-time view with a
  step counter, large text, and — the part that matters — **`navigator.wakeLock`
  so the screen never sleeps mid-recipe**. That is a plain Web API (Safari iOS
  16.4+), zero-dependency, works offline, and fixes the single most annoying
  thing about cooking from a phone. It is also the natural host for 17b's
  timers. If only one item in this theme is built, build this one.
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

- [ ] **18a — Distance** `[S]` — the cleanest half. Distances are already
  numbers in kilometres, so this is a formatter plus a label swap, and the
  Settings dials switch to miles with sensible steps rather than converted
  decimals.
- [ ] **18b — Recipe quantities** `[M]` — blocked on **17a**: strings cannot be
  converted, only structured quantities can. Note the trap that makes this
  harder than it looks — **a US cup (240 ml) is not a NZ/metric cup (250 ml)**,
  and US tablespoons differ too, so "imperial" needs to mean a specific system
  and say which. Baking is also the one place where **weight beats volume**;
  offering grams for flour and sugar is arguably a bigger win than offering
  cups.
- [ ] **18c — Oven temperatures** `[S]` — °C ↔ °F, and gas marks if the owner
  wants them. Rounding to the nearest sensible dial setting, not `356.0 °F`.

**Default stays metric** — the app is New Zealand-first and the data is metric.
This is a display preference for visitors, not a change of source of truth.
Lockstep with **Theme 15b**'s wording sweep: both change user-facing unit copy,
and `reo.js` holds the strings.

## Also parked (small)

✅ **Done** — **"Open now"** live status + filter (2026-07-08, ADR 0006);
**shareable group shortlist links** (2026-07-10, ADR 0009); the **te reo Māori**
UI toggle first pass (2026-07-09, `reo.js` — chrome only; safety text stays
English); and the pre-launch reo **wording review** (✅ ran 2026-07-22 — an AI
pass over all 68 strings). ⚠ **honest caveat:** the AI pass is **not** a
fluent-speaker sign-off — a native review of the 9 flagged strings stays the
**owner option** before public launch
([review](reviews/2026-07-22-1148-reo-wording-review.md)). Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

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
