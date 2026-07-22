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

**On "no backend" (owner steer, 2026-07-09).** The stance softened from
*never* to *not yet*: a lightweight backend (e.g. a Cloudflare Worker)
is an acceptable **future** direction — live group-order rooms, feedback
intake — but adopting one is a deliberate step that needs its own ADR
first ([ADR 0009] records the steer). Until that ADR exists, items
blocked on "breaks the no-backend non-goal" stay blocked; they are
deferred, not refused.

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

**Still open:**

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

- [~] **Drive time from me to a venue** `[M]` (claimed 2026-07-22-1023, wt: faves-wave1-small-closers) — owner ask (2026-07-08). A live
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

> ✅ **Shipped 2026-07-08 → 12** — the design pass + both owner test-drive
> rounds: two-column info aside, wayfinding, overflow menu, favourites nesting,
> caveat/allergen ⓘ disclosures, sticky + global search, footer/About surface,
> contact-bar collapse, back-to-top, settings polish, "Share this app". Record →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
>
> **Still open (small):** self-hosted per-platform **order-online logos**
> (offline / no-hotlink); [~] the Cook-at-Home **top-right grid position** idea
> (claimed 2026-07-22-1023, wt: faves-wave1-small-closers).

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

## Theme 5 — Richer dish data

✅ **Shipped 2026-07-08 → 09** — price-per-person + cheap-eats filter (`price.js`,
curated `priceBand` override), dish order-codes, the extended allergen
**vocabulary** (populating stays an `intake/` content task — no tag = not stated),
device-local dietary/allergen preferences with load-bearing safety framing, and
hearted favourites (`favourites.js` + shared `store.js`). Popular/busy times ruled
out (no official API). Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

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
- **Ratings / feedback** `[M]` **⚑** — public crowd ratings need a
  backend + moderation + accounts, breaking three non-goals. Two honest
  options that don't: (a) **curated household rating** — extend `picks`
  into a 1–3 scale in the data (still ours, still static); (b)
  **local-only personal ratings** in `localStorage` (same store as the
  order tally). Recommend **(a)+(b), not public**.
- **See public ratings / reviews** `[M]` ⚑ **owner decided 2026-07-08:
  show the number when online, link-out when offline.** The honest read: a
  static site can't fetch a live Google rating (the Places API is keyed,
  billed, and its ToS govern display + caching; a public site can't hold the
  key safely). So the shape is a **progressive enhancement**: a small
  **Cloudflare Pages Function** proxies the key, fetches the rating on demand,
  caches it at the edge, and shows it inline with "powered by Google"
  attribution; **offline or on failure it degrades to a "See reviews"
  link-out** to the venue's Maps listing. This is the *first* external service
  in an otherwise zero-third-party app — the shipped `site/` artifact stays
  zero-dep (the fetch is runtime + optional), but the deployed *system* gains
  one billed online dependency. **Write an ADR when built; sequenced after the
  Cloudflare Pages deploy (Phase 7).** Dish-level ratings stay curated (Google
  rates places, not dishes).

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

✅ **Shipped** — **SBOM publishing** (2026-07-09, ADR 0008: deterministic
CycloneDX at `/.well-known/sbom.json`, `gen_sbom.py --check` CI gate) and the
**zero-dependency CI guard** (2026-07-08, `check_no_deps.py`). Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

**Still open:**

- **`security.txt` + provenance metadata** `[S]` — a `/.well-known/
  security.txt` (contact + policy) is cheap good-citizenship for a public
  site. Build provenance/attestation (SLSA-style) is **N/A today** —
  Cloudflare Pages serves static files with no build to attest; revisit
  only if a real pipeline ever appears.

## Theme 8 — Making the repo public (parked; owner-gated)

Assessed 2026-07-12: publishable, but sequenced. Flipping visibility is a
floor action (one-way door — forks/copies survive any later unpublish) and
stays the owner's explicit call. Order matters:

1. **GitHub PAT refresh first** (already queued estate-side). The session
   log (`docs/SESSIONS.md`, 2026-07-12 deploy entry) records the current
   PAT as classic + broad and lists unhardened credential roots
   (AWS/Google/TrueNAS); git history preserves that line forever, so the
   fix is making it *historical* — refresh the credential, don't redact
   the log.
2. **Branch protection before visibility** — a push to `main` is a deploy;
   public means drive-by PRs/issues. Require review, restrict push.
3. **Owner confirms the docs' family texture.** The 2026-07-06 approval
   covered recipe attributions in site data; the docs also use family
   first names in feature examples and acceptance notes (ROADMAP Themes
   1/1b, SESSIONS). Same first-names-only level, but publishing extends
   the approval from the site to the workshop notes — confirm or trim.

Verified clean 2026-07-12 (tree + full history): no secrets (the one
token line reads from Keychain; "share tokens" are client-side codec),
Apache 2.0 licence present, only `mike@cxi.nz` in commit metadata,
home-area inference no worse than the live site already allows.

## Also parked (small)

✅ **Done** — **"Open now"** live status + filter (2026-07-08, ADR 0006);
**shareable group shortlist links** (2026-07-10, ADR 0009); the **te reo Māori**
UI toggle first pass (2026-07-09, `reo.js` — chrome only; safety text stays
English, a pre-launch reo **wording review** still owed). Detail →
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
the live site ships with a provenance artifact from day one.

**Owner calls — resolved 2026-07-08:**
1. Order tally: **in** (shipped); STRATEGY non-goal clarification landed.
2. Ratings: **show the live number when online (edge-function proxy),
   link-out when offline; dish ratings curated** — see Theme 5.
3. Feedback intake: **no email; parked** — deploy first (Theme 4c).
4. SBOM: **CycloneDX JSON at `/.well-known/sbom.json`** — see Theme 7.
