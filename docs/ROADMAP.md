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

---

## Theme 1 — From *decided* to *ordered*: the Order tally ★ flagship

**The reframe.** Strategy names two jobs (*what shall we get?* and
*what's on their menu?*). This is the missing **Job 3 — "right, let's
order"**: as people call out what they want, build one running list
grouped by restaurant, then use it to (a) read the order down the phone
or hand it over the counter, (b) tick items off at pickup ("have I got it
all?"), and (c) sanity-check the total ("was I charged right?").

**Why it does *not* break the "no ordering/payments" non-goal.** There is
no transaction, no integration, no account — it's a local notepad that
tallies and groups. We still link out to phone/website to actually order.
**⚑ This needs a one-line clarification to STRATEGY's non-goal** so the
distinction is on the record.

**Design sketch.**
- Dish rows gain a quantity stepper (`− n +`, ≥44 px targets). Add from
  any venue *and* from Cook-at-Home.
- Persistent cart badge → a cart view grouped by restaurant, each with a
  subtotal + item count, plus a grand total.
- **Collect mode**: tick items off as they're handed over.
- **Price check**: the subtotal is an *estimate* from our menu data — and
  our prices are already flagged as needing an in-store refresh — so
  caption it "estimated from our menu; confirm at the till". Honest, and
  still catches gross mischarges.
- **Storage: `localStorage` only.** No names in the repo, but runtime
  local naming ("Booth", "Ruth") never leaves the device — this absorbs
  the parked "per-person shortlists" idea.
- **Multi-restaurant by design** (Indian mains + a Sprig + Fern drink run
  in one sitting).

Effort **M**. Client-side only, offline-native, zero backend.
**Accept when**: at a real family order, one person takes everyone's
requests, reads the list down the phone, ticks it off at pickup, and
sanity-checks the total — on a phone, offline.

## Theme 2 — Location & maps

- **Coordinates in the schema** `[S][schema]` — add `lat`/`lng` per venue.
  Tiny data chore; do it first, it unblocks the two below.
- **Native maps handoff** `[S]` **⚑** — tapping an address opens the
  device's *default* maps app: Apple Maps on iOS/macOS, Google or a
  `geo:` URI on Android, via platform detection. Cheap, daily payoff.
- **"What's close" = distance-sorted list** `[M][constraint]` — use
  `navigator.geolocation` + haversine to sort the home list by distance
  ("1.2 km"). No tiles, no map library → stays offline-safe and zero-dep.
  Delivers ~80% of the "what's near me" value.
- **A real tile map view** `[L][constraint ✗]` — tile maps need an
  external tile source *and* a map library (CDN), which breaks "no
  external requests / offline-safe / no CDN". Recommend **not** building
  it; if ever, only as an online-only progressive enhancement. The
  distance list is the 80/20.

## Theme 3 — UX & design pass

The umbrella "better UX and design", with your concrete asks:

- **Info panel on the right when there's room** `[M][design]` —
  responsive two-column on tablet/desktop (menu left; contact, hours, map
  link, order summary right). One CSS grid; mobile stays single-column.
- **Sticky search on phones** `[S][design]` — keep the menu search
  reachable while scrolling a long menu (sticky under the section nav).
  **⚑ minor**: decide whether the *home* screen also gains a persistent
  search field, or whether today's sticky bottom filter bar is enough.
- General polish to the "oh, this is nice" bar (`DESIGN.md` mood):
  spacing, motion, empty states, and the new cart UI.

**Accept when**: judged against `DESIGN.md` at 390 px, tablet and
desktop; Lighthouse a11y stays 100.

## Theme 4 — Content growth (ongoing, in parallel)

- **More favourite restaurants.** The master list lives *outside* the
  repo — a paper list with the menus/recipe books, an Apple Note, or a
  photo in the library. Those aren't reachable from here; the fast path
  is the existing `intake/` pipeline: drop photos/screenshots/Notes
  exports into `intake/`, and they get transcribed to schema (prices from
  paper/in-store, **never** delivery apps).
- **More dishes & home recipes** — same pipeline; the placeholder recipes
  in `cook-at-home.json` get replaced from the Notes export.
- **Dish photos** `[L][schema]` — add `image` per item, lazy-loaded (the
  transfer budget already excludes photos). *Owner photos of the actual
  dish* preferred; generic stock only as a fallback, captioned "serving
  suggestion", properly licensed and **self-hosted** (no hotlinking — the
  offline/no-external-request rule). Large sourcing effort; roll out
  per-restaurant as photos arrive.

## Theme 5 — Richer dish data

- **More allergens** `[S][schema]` — extend the closed tag set (egg,
  dairy/milk, gluten, soy, sesame) in `ARCHITECTURE.md`. Cheap to add;
  the honest part is *populating* it — "no tag = not stated" means owner
  or menu confirmation, never guesses.
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

- **SBOM publishing** `[S]` **⚑** — publish a machine-readable Software
  Bill of Materials (SPDX or CycloneDX) as a provenance attestation. It
  will be near-empty, which is the point: it *proves* the zero-dep claim
  and any future entry shows up as a diff. Generation options, cheapest
  first: GitHub's native dependency-graph SPDX export (zero tooling, via
  repo settings / API), or a CI step with a generator. Publish options:
  a CI build artifact, a committed `sbom.spdx.json`, served at
  `/.well-known/sbom` on the site, or attached to a tagged release. **⚑
  owner picks format + publish location** (and whether to cover just the
  shipped `site/` or also the dev toolchain — Node, the test runner).
- **Zero-dependency CI guard** `[S]` — a CI check that fails if
  `package.json` ever gains a `dependencies`/`devDependencies` entry, or
  a lockfile/`node_modules` appears. This machine-enforces the invariant
  ADR 0001 rests on, so the "no dependencies" promise can't rot silently.
  Cheap, and it's what actually protects the SBOM's emptiness. *(Small
  enough to pull forward pre-launch — it guards the `package.json` we
  just introduced for tests.)*
- **`security.txt` + provenance metadata** `[S]` — a `/.well-known/
  security.txt` (contact + policy) is cheap good-citizenship for a public
  site. Build provenance/attestation (SLSA-style) is **N/A today** —
  Cloudflare Pages serves static files with no build to attest; revisit
  only if a real pipeline ever appears.

Effort **S** overall, no runtime/offline impact. **Accept when**: an SBOM
is published for the deployed site and CI fails on an unexpected
dependency.

## Also parked (small)

- **"Open now"** from the `hours` data on cards.
- **Shareable group shortlist links** (encode the shortlist in the URL —
  no backend needed).
- **Te reo Māori UI toggle.**

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

**Two owner calls before starting:**
1. Confirm the **order tally** is in — then the one-line non-goal
   clarification lands in `STRATEGY.md`.
2. **Ratings = curated + local, not public** — agreed?
