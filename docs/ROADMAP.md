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

- [~] **Pick along a route** `[L][constraint]` (claimed 2026-07-22-1235, wt:
  faves-wave6-along-route — building the recorded recommendation: (a) offline
  least-detour sort + (b) maps-app routed handoff; live routed corridor stays
  ✗) — owner idea (2026-07-08): pick a
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

- ✅ **Drive time from me to a venue** `[M]` — **shipped 2026-07-22**. Both
  recommended parts: (a) the address-row maps handoff now requests *driving
  directions* from the viewer's location (Apple `daddr=…&dirflg=d`; Android/
  desktop Google Maps `dir/?…&travelmode=driving`), so the maps app shows the
  real, live drive time (`site/js/geo.js`, `site/js/menu.js`); (b) a rough
  "~N min drive" hint on Near-me home cards from the haversine distance
  (`estimateDriveMinutes`/`formatDriveTime` in `site/js/distance.js`, rendered
  muted + "~"). A live in-app routed time stays **✗** on the offline/keyed-API
  constraint. Rationale + rejected alternatives → ADR 0010. Android dropped the
  vendor-neutral `geo:` pin (it has no directions mode).
- ✅ **Restaurants with multiple locations** `[M][schema]` — **shipped
  2026-07-22** (shape (a), ADR 0011). One record per venue with an optional
  `locations: [{label?, address, lat, lng, phone, hours}]` array sharing the
  name/menu/cuisine; single-location records unchanged. `site/js/locations.js`
  reconciles both shapes and resolves the **nearest** branch, so "Near me"
  distance, the drive-time hint, the card's open/closed badge and the maps
  handoff all use it (the **primary** branch when location is unknown — not
  "any branch open", which would fight the distance shown). The menu screen
  lists every branch, nearest first, each with its own directions link, phone
  and hours (`site/js/menu.js`); `data.js` normalises the primary branch to the
  top level so existing consumers keep working; `validate.py` validates the
  branches. Kaffee Eis + Gong Cha converted to their one verified branch each —
  **second branches deferred** (need real addresses + a dev-time geocode; a
  content session appends them, no code change). `ba4fdea`, `eb23bbf`,
  `8739e7a`.

## Owner-reported — 2026-07-22 (raw notes, stored verbatim)

- ✅ **Bug: "Nearest first" sorts 10 km above 2.5 km** — **fixed 2026-07-22**
  (`566aa20`). Owner report: "Selected 'Nearest first' and restaurants 10km are
  sorted higher on the list than restaurants 2.5km away. I suspect it is sorting
  as text rather than as a number." **Root cause was NOT a text sort** — every
  distance compare was already numeric. The sort-key *order* put availability
  (and the favourite boost) ahead of distance, so a farther-but-open (or
  hearted) venue floated above a nearer one, contradicting the "Nearest first"
  label. Fix: when "Nearest first" is on (origin known), distance leads;
  availability + favourite tiebreak follow. Default order (no location) is
  unchanged (open still floats up). Open/closed still shows as a badge + the
  "Open now" filter; favourites keep their `favBoostKm` pull.
  ⚠️ **Owner note:** if a *hearted* 10 km venue still shows above a plain 2.5 km
  one, that's the (deliberate, tested) favourite weighting — say if you'd rather
  "Nearest first" ignore hearts entirely.
- [ ] **Split versioning: app vs config vs data** `[M]` — owner idea: "Should
  have a different version for the app vs the data it holds vs the
  configuration so that it can trigger a refresh based of any of them changing
  but only download the part(s) that change." Today one `VERSION` in `sw.js`
  invalidates the whole precache; a split would let a data-only change refresh
  just `site/data/*`. Touches the SW cache strategy (ADR-worthy when built).

## Theme 3 — UX & design pass

> ✅ **Shipped 2026-07-08 → 12** — the design pass + both owner test-drive
> rounds: two-column info aside, wayfinding, overflow menu, favourites nesting,
> caveat/allergen ⓘ disclosures, sticky + global search, footer/About surface,
> contact-bar collapse, back-to-top, settings polish, "Share this app". Record →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
>
> **Still open (small):** self-hosted per-platform **order-online logos**
> (offline / no-hotlink). ✅ **Cook-at-Home top-right grid position — shipped
> 2026-07-22:** pure-CSS grid placement puts the recipes card in the top-right
> cell on the multi-column layout (≥34rem), leaving the prime top-left slot to
> the first restaurant; ranking still pins it first in the DOM, so on the
> single-column mobile layout it stays anchored at the top (unchanged). Negative
> column lines keep it top-right if a third column is ever added.
> `.card-grid .card-recipes` in `site/css/app.css`.

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
  in an otherwise zero-third-party app — the shipped `site/` artifact stays
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
  **Cross-device sync stays out of scope** — the same person's hearts syncing
  across *different* devices needs an account + backend, which breaks the
  no-accounts / no-backend non-goals. That belongs to a *separate signed-in app*
  (the same seam as the health app, Theme 6, which can own identity and sync).

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
English). The pre-launch reo **wording review ran** (2026-07-22,
[`docs/reviews/2026-07-22-1148-reo-wording-review.md`](reviews/2026-07-22-1148-reo-wording-review.md)):
all 68 strings reviewed — macrons clean, 59 kept, 0 wording changes, 9 flagged,
plus a `lang="mi"` per-part a11y fix. ⚠ **honest caveat:** an AI pass, not a
fluent-speaker sign-off — a native review of the 9 flagged strings remains the
owner option before public launch. Detail →
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
