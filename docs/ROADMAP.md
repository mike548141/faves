# Roadmap (post-launch / vNext)

## 🎯 TWO STRUCTURAL OWNER RULINGS — 2026-08-16 23:15 UTC

Taken by wt `faves-cook2` and recorded here rather than in a theme because both
cut across every session. **Neither is claimed by this session; both need an
owner of their own.** Rulings do not cross between sessions by themselves —
this block is how they cross.

### 1. 🛑 `service` is renamed to `order-mode`, INCLUDING the shipped filter

The word means **three** different things and three sessions collided with it
independently in one day:

| # | What it is | Status |
|---|---|---|
| 1 | `filters.js` `service` — the values `all` · `takeaway` · `dine-in`, a home-screen `<select>` on 55/55 venues | **shipped** |
| 2 | Theme 30's `channel` — `dine_in`/`takeaway`/`delivery`, a **price-and-tax** axis (delivery menus run 15–30% above dine-in) | proposed |
| 3 | Theme 30's proposed `service` **axis label** on `cuisine` values ("`Cafe` is a format word") | proposed |

He was offered the cheap option — keep the shipped one, rename only the two
proposals — and **ruled the other way: rename all three, the live filter
becomes `order-mode`.** ⇒ `service` stops being overloaded entirely rather than
being left as the one survivor that future readers still have to disambiguate.

🚩 **THE COST HE IS ACCEPTING, AND IT IS THE WHOLE OF THE WORK.** The filter is
**shipped and in URLs** — `filtersFromQuery` reads it, and a saved or shared
link carries `?service=takeaway`. Renaming the key without a shim makes every
existing shared link **silently lose its filter**: no error, no notice, just a
different set of venues than the sender saw. So this is not a rename, it is a
rename **plus a compatibility path**, and the compatibility path is the part
that must not be skipped:
- read the old key, write only the new one;
- `tests/filters.test.js` must assert an old-style URL still resolves;
- and per ADR 0072, that test must be **proven to fail** without the shim,
  or it is decorative.
Also in scope: `site/index.html`'s filter markup, `app.js`'s URL sync,
`reo.js`'s gloss, and `tools/boot_check.mjs` (it reads filter element ids).
✅ **The sequencing gate is DISCHARGED 2026-08-17.** This item was held behind
37k's style filter because that work was live in `filters.js`, `app.js` and
`index.html`. **37k has landed** (`9aa6071`…`62546b4`, wt removed, claim
released) — so `order-mode` is now unblocked and takeable. ⚠️ Note what it
inherited while it waited: `filters.js` gained a **fourth** axis (`style`), so
the rename touches one more select, one more `DEFAULT_FILTERS` key and one more
URL parameter than the description above assumed.

### 2. 🛑 The roadmap is SPLIT — one file per item

**This one is unsatisfiable-rule surgery, and it is the deeper of the two.**
Our claiming rule says *"if `ROADMAP.md` is dirty, another session is
queue-active — take the next open item, touch nothing."* That is a paraphrase of
atelier's *"if **the item's file** is dirty"*, and it is self-consistent
upstream **because atelier runs a split board**: item A's file dirty ⇒ go to
item B ⇒ B's file is clean ⇒ claim normally. We compressed "the item's file"
into "`ROADMAP.md`" — and with **one 5,300-line file holding ~53 claimable
items**, "the next item" lives in the file "touch nothing" just forbade. With
five sessions live somebody holds it nearly always, so read literally **nobody
can ever claim anything**. 🔎 Not theoretical: three sessions were blocked
simultaneously at open on 2026-08-16.

He was offered the cheap fix — reword the rule so the unit is the item's
**line**, which is what atelier itself says two paragraphs further down — and
**ruled the other way: adopt the structure, split the board.** ⇒ the inherited
rule becomes correct **as written** instead of correct-once-reworded, and the
two repos stop diverging.

🛑 **STATE: OWNER-RULED · UNCLAIMED · BLOCKED ON QUIESCENCE.** Those are three
different things and the third is not an invitation — `faves-hygiene` declined
it deliberately, on the ruling's own precondition, and was right to.
**Do NOT pick this up as free work.**

🎯 **THE PRECONDITION, in checkable terms:** *no other session holds a claim in
the monolith.* (`faves-hygiene`'s wording, adopted over "when the board is
quiet", because "quiet" is a judgement and this is a `grep` for `- [~]`.)
- A split executed while sessions hold claims in `ROADMAP.md` **will lose
  claims** — the one failure the ruling names. Announce, wait for peers to land
  and confirm, then migrate.
- ⚖️ **It also wants a FRESH session.** This is delicate, wide-blast-radius
  surgery — `ROADMAP.md`, `ROADMAP-DONE.md`, the harvest convention,
  `sizescan`'s special case, every cross-reference in `SESSIONS.md` and the
  ADRs, **and `CLAUDE.md`'s safety floor**. Two sessions have now declined it at
  the tail of a long run rather than do it badly, which is `ECONOMICS.md`
  working as intended and not a lack of takers.
- `tools/` already assumes the monolith: `sizescan` special-cases `ROADMAP.md`,
  and the floor's `board` gate currently reports *"not in scope — no
  `docs/roadmap/` directory (this repo does not use the split board)"*. **That
  gate is already written and waiting** — the split is what switches it on,
  which is a strong sign the upstream shape was always intended here.
  🔑 **And that gate is a THIRD FACE of ADR 0072's pattern, named by
  `faves-hygiene`: a LATENT guard.** Its verdict is perfectly honest — unlike a
  decorative guard, it is not lying — and it carries **zero information**,
  because its subject does not exist and never has. It has run clean in every
  commit since it was wired and would have run clean forever. *The tell is
  different: a decorative guard needs probing to expose; a latent one announces
  itself in plain text and nobody reads it.*
  🔎 **A fourth face turned up the same hour, from the other direction —
  DEGRADED.** 37k's vibe migration renamed `craft beer` → `craft-beer`, and
  `tools/drinks_gap.py` held `DEFINITE_VIBE = {"craft beer", "beer garden",
  "garden bar"}`. It did not fail. It did not warn. It **silently matched
  nothing**, and its derived worklist quietly lost 7 hits. Not decorative (it
  worked until the data moved) and not latent (its subject existed) — its
  correctness was coupled to a literal in another file with **nothing asserting
  the coupling**. Caught only because an agent went looking.
  🎯 **All three share one root and it is worth writing up as its own record:
  nothing asserts that the guard's SUBJECT is still real.**
- `CLAUDE.md`'s inlined floor quotes the compressed rule and must change **with**
  the split, not after it. That file is the safety floor: it is the owner's edit
  to approve, and this ruling is that approval for this specific change.
- ⚠️ `ROADMAP-DONE.md`, the harvest convention, and every `docs/ROADMAP.md`
  cross-reference in `SESSIONS.md` and the ADRs are all downstream. `linkscan`
  is enforced, so a half-done split fails the floor — which is the good outcome.


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

> ✅ **Shipped 2026-08-17 — the location ask explains itself** ([ADR 0083],
> superseding the surface half of [ADR 0069] the same day). The owner asked for
> an explained dialog stating that location never leaves the device, a "don't
> ask me about this again" tickbox binding **both** the dialog and a follow-up
> banner, and the **removal of the "Use my location" pill**. The list now loads
> and sorts as well as it can without location *first*, and the ask follows —
> his ruling: *"load the full page so they can see everything … then ask for
> location data sharing so they can see why its needed."*
> 🔑 **Two findings worth carrying.** A modal opening 900 ms in makes the whole
> page inert and steals focus — measured, when it broke `to_top_check` and
> `filter_row_check` — so the dialog now yields to the banner for anyone already
> scrolling or tapping. And **Settings → Location became load-bearing** rather
> than a convenience: with the pill gone, without it the tickbox is a trapdoor.
> Guarded by `tools/geo_check.mjs`, the eighth browser check.
> ⚑ **Seven English-only te reo keys are owed** (`docs/reo-review-queue.md`);
> `geo.private` is flagged there as the one that must not be approximately
> translated, being a privacy claim rather than a label.

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
> ✅ **Ratings UX — settled 2026-08-16.** Owner: *"I've decided to keep the
> current rating stars."* Attempt 3 is **cancelled, not parked** — ADR 0019's
> 1–5 slider is the answer, and no superseding ADR is needed. The two rejected
> designs and why they were rejected → [`ROADMAP-DONE.md`](ROADMAP-DONE.md), so
> neither is re-proposed.

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
- [~] **Other venues with drinks nobody has captured** `[M][content]` —
      ✅ **the derivation is done 2026-08-16** (`tools/drinks_gap.py`);
      transcribing what it finds stays open and owner-gated.
      **Derived, not re-typed** (same fix as ADR 0041 gave dish-level gaps):
      `python3 tools/drinks_gap.py --gaps` reads `cuisine`/`vibe`/name against
      each record's own section-heading vocabulary (no naive "Beer"/"Wine"
      string match — see the tool's docstring for the 175-heading harvest
      behind it) and finds **3** non-stub venues with a drink signal and no
      drink rows: **1841 Bar & Restaurant**, **Baylands Brewery**, and
      **Sprig + Fern Tawa** (a brewery bar; its record is food-only). Run
      `--count`/`--json` for the full 54-venue picture including the
      `probable`-tier venues (weaker signal — e.g. a bare "Bar" in the
      name, or a bakery/dessert cuisine tag) the strict list above doesn't
      include. ⚠️ **Adding drinks silently affects `priceBand`** — measured
      with `--price-effect`: of the 11 venues that already mix food and
      drink rows, **5 (45%)** get a cheaper blended median than their
      food-only median (never the other way), and 2 of those 5
      (BurgerFuel, Hell Pizza) shipped the cheaper blended band with
      **no curation** — a pre-existing mislabel this item didn't cause but
      did surface, and ✅ **fixed 2026-08-16**: both now carry a curated
      `priceBand: "$$"` and `pricePerPerson` taken from the food-only
      median (15.75 and 23.50 against a `$`/`$$` boundary of 15), matching
      the two 2026-08-15 pubs (Southern Cross, The Borough) plus Khandallah
      Trading Company. All five flippers are now curated; `--price-effect`
      is the regression check. Detail →
      [`ROADMAP-DONE.md`](ROADMAP-DONE.md), Theme 4.
      🔑 **Worth keeping:** the mislabel was invisible to every existing
      gate — `validate.py` passes a record with no `priceBand` because the
      field is optional and the app derives one. It took a tool built to
      answer a *different* question (which venues lack drinks?) to surface
      it, which is the argument for deriving worklists rather than eyeballing
      them.
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
> ✅ **Shipped 2026-08-17 — the menu fetch is DONE, all 18 authorised venues
> resolved.** 14 transcribed (4 Sprig + Fern taverns · The Catch Sushi Bar ·
> Satay Kingdom · Charley Noble · Regal Chinese · Rock Yard Vietnamese · Pizza
> Pomodoro · Gong Cha · Pizza Hut · Subway · The Victoria Tavern) and 4 proven
> to publish no menu anywhere (`babaili-malatang`, `caffiend`, `kaffee-eis`,
> `new-chapter-cafe`) — a decision reached by exhaustive check, not an
> oversight. Corpus: **37 venues with menus, 3,059 dishes**.
> 🔑 **The fetch authorisation is now exhausted**, so every one of the 18
> remaining stubs is blocked on a photo or an in-store visit. Do not re-attempt
> them as research — see "Venues still `stub`" below.
> Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- [ ] 🎯 **Owner calls the menu fetch left owing** `[XS][decision]` — three
      questions the batch raised and refused to settle alone, kept together
      because each one changes what a *future* intake does, not just a record.
      **One of the three is now ruled; two remain.**
      🔑 **The fetch recorded its own gaps rather than losing them** — as of
      2026-08-17 `python3 tools/needs.py --count` reports **188 open dish-level
      gaps across 6 venues** (Subway 162, Regal Chinese 14, Charley Noble 7,
      Gold Lining 3, Gong Cha 1, Southern Cross 1). Derive that list, never
      re-type it. Question 1 below was most of it.
      1. ✅ **RULED 2026-08-17 — an unpriced row is a RECORD. Always keep it,
         flagged as a gap.** Never drop a menu row for lacking a price: keep it
         and mark `needs: price`, so the row is simultaneously the record of
         what the venue sells and an entry on the derived worklist
         (`tools/needs.py`). 🔑 **The reasoning that decided it: dropping is
         lossy and keeping is not.** A dropped row destroys the fact that the
         venue sells the thing, permanently and invisibly; a kept row costs one
         field and *reports itself* until someone prices it. The two halves of
         the split were never really a disagreement about value — Subway
         publishes no price anywhere by franchise design (so dropping would
         have deleted its entire 141-row menu), while The Victoria Tavern's
         ~40 spirits were dropped on a corpus convention read from
         `southern-cross` and `the-borough-tawa`. **That convention is now
         overruled**; those two venues are not evidence of a rule, they are
         venues that happened to have no unpriced lines.
         **This binds every future intake** — spirits lists, specials boards,
         market-price seafood, anything a venue lists without a number.
         ✅ **Nothing has to be built to obey it, and two sessions nearly
         re-derived that.** `needs` is not a new field: **166 dishes already
         carry it**, `price` is already in its vocabulary, `validate.py`
         already errors if a row claims `needs.what='price'` while holding a
         price, and the screen that renders it already exists —
         `site/js/needs.js` `priceUnknown()` drives `menu.js`, which prints
         **`?`** in class `dish-price is-unknown` where a bare missing price
         prints `—`. So [ADR 0047]'s *name the screen that renders it* is
         satisfied by a screen that has been shipping for some time, and the
         ruling is a **convention change, not a schema change**.
- [ ] **Restore The Victoria Tavern's dropped spirits** `[S][data]` — the
      direct consequence of the ruling above. Roughly **40 unpriced spirits**
      were dropped from `the-victoria-tavern` during the fetch on the
      now-overruled convention; they are recoverable from the venue's own
      drinks PDF, which the fetch session confirmed is reachable (the HTTP 000
      is a self-signed Plesk placeholder certificate, not a dead domain — its
      mains PDF is dated 2025-11-24). Restore each row with
      `needs: [{what: "price", note: …, since: …}]` and it renders `?` rather
      than vanishing. Run `tag_allergens.py`, `seed_dish_ids.py` and
      `validate.py` after, per the fetch recipe.
      2. ⚠️ **Pizza Hut's prices may not be Johnsonville's.** Its order pages
         quote prices without ever asking for an address, and the store page's
         "View menu" is a Vue handler with no `href`, so the branch flow could
         not be driven. What we hold is **Pizza Hut NZ's default online
         pricing**; whether this branch matches is unestablished. One phone
         call or one in-store look clears it.
      3. ⚑ **Little Sprig Seatoun's menu date is contested**, left at
         **2026-06-29**. The PDF's Canva `/Title` says *"Bar Snacks Menu (Oct
         2025)"* but it was exported 2026-06-29 and the venue's own filename
         calls it the 2026 menu. The export date is the only full-precision
         date the document supports; the conservative read is older. It only
         matters through the staleness caveat — the owner's call whether that
         is worth aging.
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
- [ ] 📸 **Venues still `stub`** `[M][content]` — they render as "menu
      coming soon" cards and never as empty menus, so this is a backlog, not
      a defect. Same `intake/` pipeline.
      🛑 **Measured 2026-08-17: 18 stubs remain and NOT ONE is fetchable.**
      With the menu fetch closed above, the research route is exhausted — the
      four that publish a website (`babaili-malatang`, `caffiend`,
      `kaffee-eis`, `new-chapter-cafe`) publish no menu *on* it, and the other
      fourteen publish nothing at all. **Only a photo or an in-store visit
      clears any of them**, so this item is no longer session work: it is an
      owner errand list. A future session that "researches the stubs" is
      repeating a search already run exhaustively and written up.
      🔑 **Why the count kept lying: "publishes a website" is not "publishes a
      menu".** The stub population splits three ways — publishes nothing ·
      publishes a site but no menu · publishes a menu — and the middle group is
      invisible to a website count. That is what made 18 read as fetchable when
      only 14 were.
      **Derive the count, don't read it here:**
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

- [ ] ✅ **RULED 2026-08-16 — ADD `contains-fish`, and land it WITH 37n.**
      Owner's call, asked with the cost stated. The reasoning he took: fish is a
      major declarable allergen we currently warn about **zero** times, and
      landing it alongside the 37n consistency sweep means the corpus gets
      swept once rather than twice. So this is now **blocked on 37n's report
      existing**, not on a decision.
      **What it needs:** the tag in `ARCHITECTURE.md`'s closed vocabulary · a
      rule in `tools/tag_allergens.py` (**fish sauce · anchovy · unagi ·
      bonito/dashi · Worcestershire sauce** — that last is the one people miss) ·
      a corpus sweep · and the dishes already found and left untagged for want
      of it, listed here so nothing is re-derived: **Rock Yard** (fish sauce
      named in a dozen dishes, its own badge printed literally as "Fish", plus
      "Yin & Yang Pan-fried Salmon"), **Pizza Pomodoro** (anchovy on Romana and
      Inferno), **Regal** (spicy fish sauce), **Subway** (tuna — and 🚩 note it
      must NOT be `contains-shellfish`, which is the wrong-tag trap here).
      ⚠️ **`vg-option` and `df-option` were NOT ruled on** and stay open below —
      they are a different, much lower-stakes question and should not ride in
      on this decision's coat-tails.
- [ ] ✅ **RULED 2026-08-16 — capture PRESENT and TRACE separately in the data,
      but keep tagging only PRESENT.** `[M][schema]` Owner's call, and it split
      the question in two rather than answering it as asked.
      **The case that raised it:** Pizza Hut publishes its own allergen PDF
      grading each allergen `P` (present) against `T` (*"stored or used to
      manufacture other items at the site"*). `T` is near-universal across the
      whole pizza line for nuts, peanuts, sesame and shellfish. [ADR 0025]'s
      *"when unsure, tag"* points at tagging it — but this is **not**
      uncertainty, it is the venue stating two different things, and a warning
      that fires on every item carries no information (the decorative-guard
      shape, [ADR 0072]).
      **His ruling:** the displayed tag stays `P`-only — so nothing about the
      current screens changes — **and the data model gains the ability to hold
      the trace tier**, so the venue's own graded statement stops being thrown
      away at intake. Re-reading 55 menus to recover it later is the expensive
      alternative this avoids.
      🚩 **The design question this has to answer first, and it is not a
      detail: WHERE does the trace tier live?** [ADR 0047] is explicit —
      `site/data/` is a **precached payload**, so a field added there is
      downloaded by every phone whether a screen reads it or not, and *"before
      adding a field to a venue file, name the screen that renders it"*. Under
      the same ruling no screen renders trace. The two readings:
      - **`data/` (the repo-only record)** — obeys ADR 0047 as written, costs
        the phone nothing, and is where "kept forever, not rendered" already
        lives. ⚠️ But it splits one menu reading across two stores, and every
        future refresh has to remember to update both.
      - **`site/data/`, unrendered for now** — keeps one dish's allergen facts
        in one place, at the cost of precaching a field nothing shows, which is
        the exact thing ADR 0047 was written to stop.
      🎯 **Recommend the record (`data/`)**, because ADR 0047 is accepted and
      the payload cost is paid by every phone on every visit — but flag that it
      makes the split-store rule load-bearing for safety data for the first
      time, which is a genuine escalation of what `split_data.py --check` is
      protecting. **Put this to the owner before building it.**
      🔎 **It will recur.** Every venue publishing a first-party allergen chart
      is likely to grade it this way; Subway's own NZ Allergen Web Guide is the
      next one to check.

- [ ] 🎯 ⚑ **The tag vocabulary has no `contains-fish`, and three sub-agents
      found it independently on one day** `[S][schema]` (2026-08-16). The closed
      set carries `contains-shellfish` and **nothing for finned fish** — one of
      the major declarable allergens, and the one this corpus meets constantly.
      Rock Yard names **fish sauce** in a dozen dishes (dipping sauces,
      dressings, marinades) and prints its own badge literally as **"Fish"**;
      Pizza Pomodoro has anchovy on two pizzas; Regal has a spicy fish sauce.
      All of it is currently **untagged**, because the honest alternative is
      inventing a tag, which the vocabulary's own header forbids
      (*"extend here, not ad hoc"*).
      🚩 **This is not a tidiness gap — it is a silent safety hole**, and worse
      than a missing tag on one dish: a reader with a fish allergy gets a corpus
      that never once warns them, which reads as "no dish here contains fish".
      Adding it is a schema change plus a corpus sweep plus a rule in
      `tools/tag_allergens.py` (fish sauce · anchovy · unagi · bonito/dashi ·
      Worcestershire sauce, which is the one people miss), and it should land
      with 37n rather than beside it.
      **Two smaller holes found the same way, same day, lower stakes:** there is
      `gf-option` and `v-option` but no **`vg-option`** or **`df-option`**. Gong
      Cha offers a free soy/oat swap on 15 drinks and Rock Yard prints "Vegan
      Optional" on two — genuinely useful to the people the dietary filters
      exist for, and currently unrecordable.
      ⚑ **Owner's call**, because it widens a closed set that safety copy leans
      on. Recorded, not acted on.

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
✅ **RULED 2026-08-16: record the tier in the DATA, do not show it yet.**
Each derived tag carries where it came from (menu-stated vs inferred) so the
information exists when it is needed, and every screen stays exactly as it is —
one tier, every warning equally serious. How to show a confidence level *while
someone decides what is safe to eat* is deferred, not answered. ⚠️ Nothing may
render the tier without a fresh ruling: a warning that looks softer is a warning
people act on differently.
~~⚑ a `may-contain` tier that shows
a reader *which* tier a tag came from.~~ Deferred at 36 derived tags (ADR 0024);
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
  dormant. Public crowd ratings *of our own* **stay rejected**
  (backend + moderation + accounts break three non-goals) — which is NOT the
  same as displaying someone else's aggregate; see the next item.
  🛑 **RULED 2026-08-16 — the curated household rating (a) is WITHDRAWN.**
  Owner, verbatim: *"It was never supposed to be curated ratings. We keep the
  personal ratings as they are, that is done. What I asked for was using
  publicly available review/ratings/feedback services/websites like yelp,
  Google etc that aggregate feedback to give a restaurant a rating."*
  So **(b) personal ratings are DONE** and need no ratification, and **(a) is
  withdrawn** — retire the dormant `rating: 1..3` field and its render path
  rather than leaving a schema field nobody will ever fill. The want was always
  the item below. ⚠️ This misreading was anchored in the 2026-07-08 owner-calls
  line "dish ratings curated", now marked superseded there; left unmarked it
  would have re-proposed itself. The live-Google-rating edge function below is a **separate,
  owner-gated** item (billing) — out of scope for this change.
- **See public ratings / reviews** `[M]` 🎯 **RULED 2026-08-16: build it, and
  cache the ratings into the repo.** This is what he was asking for all along
  (see the withdrawn curated rating above).
  🛑 **BLOCKED ON A BRIEFING, NOT ON A DECISION — do not build yet.** Caching
  into this repo means **permanent storage in public git history**, and both
  candidate providers restrict exactly that: Google's Places terms permit
  caching place *ids* but not the content around them beyond a short window,
  and Yelp's Fusion terms are stricter again on storage and re-display. That is
  a licence question on a **public** repo, so it needs re-putting with the
  current terms in front of him — the informed-confirmation floor in
  `CLAUDE.md`. Options to re-put: **(a)** on-demand edge proxy caching at the
  edge only, nothing committed (the original 2026-07-08 shape); **(b)** cache
  only what the terms allow (place ids), fetch the number live; **(c)**
  link-out only — zero cost, zero exposure; **(d)** repo-cache as a knowingly
  accepted risk, which is his to accept but must be accepted with the terms in
  hand. **Original: owner decided 2026-07-08:
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
- [~] **v2 — continual sync (Cloudflare Worker + KV)** `[M][constraint]` ⚑ —
  **part-done, claim released 2026-08-16.** The **merge engine is built, tested
  and shipped** (`site/js/sync-merge.js`, 26 tests, **ADR 0060**) — owner-directed
  this session ("so my iphone and laptop show the same favourites, ratings etc").
  🔎 **The finding was bigger than the item: both halves of the merge bullet
  below are wrong against the code.** "Union hearts" makes un-hearting impossible
  — `favourites.merge()` never removes, by design and by docstring — and
  "last-write-wins per scalar" is unimplementable because **nothing in the
  personal layer carries a timestamp**, verified across all five modules. ADR
  0060 supersedes that bullet with a three-way merge against the last-agreed
  snapshot, which buys deletion propagation at **no schema change**. Two shipped
  bugs fell out of the same read and are fixed: a transfer link that destroyed
  the "follow me" localisation preference, and a merge import that silently
  dropped `units` and `currency`.
  ✅ **Also built 2026-08-16, claim released:** the **E2E crypto and the bearer
  sync-code** (`sync-crypto.js`, `sync-code.js`, **ADR 0061** — the code is split
  by HKDF into a blob id the server may hold and a key it must never see), and
  the **Worker source, config and README** (`worker/`, 19 tests against a fake
  KV). The owner authorised the backend (ADR 0060 addendum).
  ✅ **DEPLOYED 2026-08-16** at `https://faves-sync.cakeit.workers.dev`, on the
  owner's go, and **verified live** — ten checks against the running Worker, not
  inferred from the unit tests: 404 before write, 204 PUT, 200 GET with ETag,
  ciphertext decrypting identical, no plaintext on the wire, stale `If-Match`
  412, correct `If-Match` 204, another code's id 404, malformed id 400, and a
  300 KiB body refused 413. Deployed with a purpose-minted Cloudflare child
  token scoped to two account groups and **no zone scope at all**, held only in
  the macOS keychain; `worker/wrangler.toml` keeps its placeholders on purpose,
  because this repo is public and the real ids live in the estate root.
  ✅ **SYNC IS LIVE — 2026-08-16.** The engine (`sync.js`), the ignition
  (`sync-start.js`, imported by all three screens) and the pairing screen
  (`sync-ui.js`, Settings → *Sync across your devices*) all shipped. **Verified
  two-device against the deployed Worker**, not against a stub: two devices with
  different hearts converge, a rating crosses, and **un-hearting on one device
  removes it on the other** rather than being resurrected — the failure the
  original ADR 0017 design could never have avoided.
  🔎 **The finding that made it worth wiring rather than declaring done:** every
  part — the code, the crypto, the merge, the deployed Worker — was built,
  tested and green while **nothing imported any of it**. The parts were correct
  in isolation and the feature did not exist. See ADR 0060 addendum 2 for the
  sharper one: the allergen question was asked and the answer discarded.
  ~~**Was open:** the push/pull/debounce client; the
  pairing UI; and the base-snapshot store the merge needs~~ — that last is
  the only remaining piece of the *offline* half, and without it the merge
  silently degrades to the additive behaviour ADR 0060 exists to replace.
  🚩 **The endpoint being live is not the feature being live**: nothing under
  `site/` calls it yet, so sync does not work for a user today.
  🚩 **Two gates before any of it
  ships:** the Reset-propagation wording (owner's ruling, Theme 32 — and ADR
  0060's last consequence shows that ruling cannot be met as stated, because an
  E2E blob cannot count devices); and the About-screen "no accounts" line, in
  lockstep with a passkey path.
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
- ✅ **RULED 2026-08-16 — a shared list is LIVE, and staleness is not our
  problem to solve.** Owner, verbatim: *"It will never stale because the point
  is that it will stay in sync. We are not going to try and address the issue
  of someone not updating their own allergens. So if I share my allergen
  settings with someone then they will get the latest data that I configure in
  faves and as it changes."*
  🚩 **This is a bigger ruling than it reads.** It changes Theme 10 from a
  **one-way snapshot grant** to a **live subscription**, which means sharing
  cannot ship before **Theme 9 v2's backend** — a snapshot needs no server, a
  live feed does. It also draws the responsibility line: Faves guarantees the
  recipient sees *what the sharer currently has configured*, and does **not**
  attempt to police whether the sharer keeps their own allergens current. So the
  copy must say whose configuration it is and when it last synced, not "this is
  safe". Re-scope 10 against 9 v2 before building any of it.
  ⚑ ~~**Allergen-safety framing is load-bearing.**~~ (Superseded by the ruling
  above; the reasoning is kept because the *class* of risk is unchanged.) Shared dietary/allergen
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
- **11d — A family shared set** `[L][constraint]` ✅ **RULED 2026-08-16: build
  it, once sync exists.** Queued behind **Theme 9 v2's backend** rather than
  decided now or dropped. It shares that dependency with **Theme 10** (a shared
  list is live, not a snapshot), so 9 v2 gates both. ⚑ discharged as a
  *sequencing* answer; the conflict and permission model below is still unbuilt
  design, not a blocker. — the hardest item here
  and the one to scope last. Theme 10's model is a **one-way, read-only**
  grant; a family cookbook everyone can *add to* is **multi-writer**, which
  brings concurrent edits, conflict resolution, and "who may remove whose
  recipe" — none of which the E2E blob design answers today. Do not assume
  Theme 10 covers it.
- **11e — Which of today's 24 recipes stay public?** ✅ **RULED 2026-08-16 —
  family-attributed recipes go PRIVATE by default.** Any recipe whose title
  carries a person's name moves out of `site/data/`; the rest stay public. The
  owner may override per recipe. 🚩 **Name the affected set before building
  anything** — on a first read that is at least *Booth's Ginger Crunch*,
  *B's Dope-As Brownie*, *Shane's Ribs*, *Jesse's Garlic Chicken Thighs* and
  *Famous Brade Green Chicken Curry*, which includes several of the collection's
  best. This ruling also settles the pending family-texture question from Theme
  8's review: first names in titles leave the public site with the recipes.
  ~~⚑ **Owner call.**~~ The
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


🛑 **RULED 2026-08-16 — THERE IS NO SURFACE. Not "not yet": not ever.** Owner,
verbatim, noting he has said this repeatedly: *"The trends data will never be
shown in the faves app as I've told you a couple of times before in other
sessions. It is for analysis etc outside of the faves app, faves is just what
builds up the data over time."*
`data/history/prices/` and `data/history/dishes/` keep accruing exactly as ADR
0047 describes — that machinery is **wanted, correct and already shipped**. Out
of scope permanently: a trends screen, a "was $X" chip on a dish, any in-app
rendering of `data/history/*`. The analysis happens outside Faves.
⚠️ **Why this keeps being re-proposed, which is the useful part:** the wording
below reads as a *sequencing* gate ("not enough data yet"), and the
1-venue-of-31 stat invites "revisit when it grows". Read cold, it looks like it
is waiting. **It is not waiting.** Kept only as the record of what was measured.
~~⚑ Owner's call, deliberately deferred: when there is enough data to be worth
using, and which surface goes first.~~ Baseline at adoption (2026-08-08):
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
- [~] **14b — The content sweep** `[M][content]` — ✅ **the TOOL half is DONE
  2026-08-16** (wt: faves-schema30): `tools/find_addons.py` + 44 test cases +
  17 breakers, and a `validate.py` **warning** on the 15 high-confidence
  convertible rows. **The conversion half stays open and is the bulk of it** —
  converting a row is a judgement and the tool deliberately refuses to make it.
  🔑 **It became a CLASSIFIER rather than a matcher**, because 14b and 28b were
  reading the same field with two regexes written a month apart. It reports 12
  classes and names the theme each routes to: **14b owns 136, 28b owns 220,
  14f 28, 14c 82.** Convertible-now is **15 rows**, not the 28 this item
  assumed. It prints where its numbers differ from the roadmap's rather than
  letting the gap be forgotten, and it exits 0 always — a reporter over prose
  that never fully drains, and a check that always fires is one nobody reads.
  Retro-fitting the corpus is
  the bulk of the work, not the code. Pattern-match `Add …$` / `+$` in every
  `desc` and convert; keep the prose only where it isn't an orderable choice.
  Model it on `tools/tag_allergens.py` (ADR 0024): a re-runnable script plus a
  `validate.py` warning, because a hand sweep across 31 venues is exactly how
  the allergen inconsistency got created in the first place.
  🔎 **Measured 2026-08-16, and it changes the shape of the tool: 14b and 28b
  are reading the same field with no shared classifier.** 152 dish descs carry a
  `$`; only ~24 are add-ons. The rest are size ladders (~101), per-head prices,
  discounts and priced pairings — **an 84% false-positive rate on a bare `$`
  match**. The two themes were sized independently off overlapping counts. So
  the tool classifies every prose offer and *routes* it to its theme (14b add-on
  · 28b size · 14f combo · 14c customisation) rather than pattern-matching for
  add-ons alone. ⚠️ **And the note above about `tag_allergens.py` writing
  nothing on a record with `addOnGroups` is now HISTORICAL** — `e42b343` made
  the scanner structure-aware; a dry run reports 0 missing and 0 skipped today.
  The bail is still there and is now a correct guard rather than a silent
  refusal.
- ✅ **14c — Customise / omit — SHIPPED 2026-08-16** ([ADR 0073]) as the
  recommended half: a free-text note per order line, part of line identity.
  The **components** half stays unbuilt and is still the right answer *if* a
  venue's data ever justifies it. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
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

**a. Settings: alternatives to drill-in** ✅ **RULED 2026-08-16 — keep the
drill-in.** Owner asked the question and answered it: the index-of-rows into
single-topic panels stays. No accordion, no collapsing sections. Worth keeping
the reasoning: the sheet never changes size that way, which is the geometry that
caused the ⓘ flicker (ADR 0059), and every row already shows its current value
as a subtitle. The text below is the original brief, retained so the alternative
is not re-proposed. ~~`[M][design]` ⚑~~ — **owner, raw:**
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

> ✅ **15y — the ⓘ disclosure is click-only** (2026-08-16). It failed WCAG 2.2
> SC 1.4.13 on its hover path; the owner accepted the recommendation to delete
> the reveal rather than patch it. [ADR 0059]; record, and why its regression
> guard is a source test rather than a headless one →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

> ✅ **15z — the desktop filter row IS a row** (2026-08-16, `58432eb`,
> [ADR 0062]). Owner, raw, on seeing 15x shipped: *"truly horrible UI, it wastes
> a ton of screen space, it makes no sense i.e. not intuitive… There are two
> clear groups some filters and some sorting controls. And it should only be the
> height of the Open Now button UI element roughly as a row of UI elements."*
> 15x had moved the sheet's controls inline and kept the **sheet's** vertical
> stacking. Measured before touching it: **284 px in five bands** beside a 44 px
> chip, and **63.9% of a 960 × 800 viewport was chrome before the first card —
> against 25.1% on the phone the sheet was written for.** Now **67 px in one
> band** at every width from 960 px up; 36.8% chrome. Service became a
> `<select>` and the two location toggles became one "Sort by" select — both are
> one-of-N choices that were not shaped like one — and no capability was
> dropped. Three defects only measurement found, the guards that now catch each
> (`filter_row_check` 18 → 22, every new one proved to fail on the reintroduced
> defect), and the rejected alternatives → [ADR 0062].
> ✅ **Both open questions ruled by the owner, 2026-08-16, at the close of the
> session that built it. Recorded so neither is re-proposed:**
> 1. 🎯 **The Service filter stays exactly as it is.** He was shown Theme 15c's
>    own measurement — it returns **81% of the list for "Takeaway" and 79% for
>    "Dine-in"**, so it barely narrows anything — and was offered *drop it*
>    (freeing 160 px of a 928 px row), *keep it*, or *sheet-only*. **He kept
>    it.** Do not re-open this on the "it barely filters" argument; that argument
>    has been made, with numbers, and declined. The 160 px is spent deliberately.
> 2. 🎯 **Both control-shape changes stand**, and he was told plainly that
>    neither was asked for: Service segmented → `<select>`, and the two location
>    toggles → one "Sort by" `<select>`. Offered the revert of either and took
>    neither.

[ADR 0062]: decisions/0062-a-toolbar-is-not-a-sheet-lying-down.md

[ADR 0059]: decisions/0059-the-info-disclosure-is-click-only.md

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

> ✅ **17a — THE SCALING HALF SHIPPED 2026-08-16** (wt: faves-cook2, `f4c65e8` +
> `fe88d20`). Recorded as **ADR 0076**. `site/js/quantity.js` is new; the
> recipe page carries a ½ · 1× · 2× · 3× radiogroup above the ingredients.
> 23 unit tests, `recipe_check` **22 → 29 assertions**, `node --test` 995 pass.
> 🔑 **The roadmap's recommendation was overridden, with evidence.** It said
> make quantities structured data because render-time parsing "will be wrong
> often enough to be worse than useless". Both options share one defect —
> **neither is a check**: structured data is trusted because a human typed it,
> a parse because a regex matched, and neither can tell you it got a line
> wrong. So a line is scaled only if the parser **rebuilds the author's
> characters byte for byte at 1×**. 204/204 byte-identical.
> 🔎 **Every refusal in it printed a wrong number first, and none was
> predicted by reading the file** — they were found by RUNNING a parser over
> the corpus. `6–8 garlic cloves` doubled to `12–8`; `2 shallots (or 1 medium
> red onion)` doubled the shallots and left the bracket offering one onion.
> 🚩 **The design crux, which is not the parsing:** a line that HAS a quantity
> and is refused makes a **half-scaled recipe** — flour doubled, chocolate not,
> nothing on screen saying so. Worse than not scaling, because it looks
> finished. So there are three statuses, not two: `none` (no quantity — 42
> lines, correct unchanged, silent), `scaled`, and `blocked` (marked in words,
> not colour alone, and counted in a note). 2× blocks 4 lines; ½× blocks 16.
> **20 of 24 recipes double clean, 14 halve.**
> 🎯 **STILL OWED, and it is his:** `serves` is set on **3 of 24**, so "scale
> to serve 8" cannot ship. But **4 more recipes state a yield in prose** —
> Hotcakes "Makes 10–15", Queen Cakes "Makes 21" (twice, in `desc` AND
> `steps[1]`), Turkish Flatbread "Makes 1 large flatbread" — so real coverage
> is 7 of 24, not 3, and surfacing those needs no new facts.
> ⚠️ **A trap for whoever does that:** Liège Waffles states 12 in `serves` AND
> "divide the dough into 12 portions" in `steps[3]`, so a scaled recipe
> contradicts its own method. Steps are not scaled and should not be.
> ✅ **18b is NOT blocked on this any more.** It was recorded as waiting on
> 17a's schema; the seam it needs is the one now built. Its own measurement is
> on the table too: **cup and spoon units are 55% of all unit-bearing lines**
> (47 cup/cups, 55 spoons, of 135), a US cup is 240 ml against NZ's 250 ml, and
> the ONLY in-corpus evidence of which the owner means is a parenthesis —
> `¾ cup (190 ml)` implies a 253 ml cup. 🎯 18b needs that as **data, not
> inference**. 36b's `uses:[{ingredient, amount}]` is unaffected and still
> needs its own schema — and note only **2 steps in the whole corpus** carry a
> scalable amount, so 36b has almost nothing to bind to today.

- [ ] **17a — Serves, and scaling it** `[M][schema][design]` — ⚠️ **CLAIM
  RELEASED 2026-08-16 22:59 UTC. The scaling half is SHIPPED (see the block
  above); what is left is the `serves` half and it is OWNER-BLOCKED, not
  unclaimed work** — `serves` is on 3 of 24 recipes and can only come from him.
  🎯 The one piece anyone may take without him: surface the **4 yields already
  stated in prose** (`"Makes 21"`, `"Makes 10–15"`), which invents no facts.
  Former claim (wt: faves-cook2, branch `cook-recipes-17`). Files:
  `site/data/restaurants/cook-at-home.json`, `site/js/ingredients.js`,
  `site/js/recipe.js`, `tools/recipe_check.mjs`, `docs/decisions/`.
  🔎 **Taking it in two halves, because the header's "the data is the blocker"
  is only half true.** Scaling the *ingredients* needs no owner input at all —
  a ½/1×/2× multiplier is meaningful without knowing the yield ("double the
  recipe" is a complete thought). Only *"serve N people"* needs `serves`, which
  is on 3 of 24. So the multiplier half ships now and the target-serves half
  waits on him. 🚩 **17c, 18b and 36b all ride on the quantity schema this
  lands** — coordinate with this worktree before starting any of them.
  The owner's items
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
- [~] **17e — The rest of what the research turned up** `[S]`–`[M]` each,
  ✅ **The checklist and read-aloud bullets are SHIPPED** (claim released
  2026-08-17: `wt: faves-cook-checklist` no longer exists and both bullets are
  in the tree with tests). **Checklist** — `site/js/checklist.js` +
  `checklist-ui.js`, 17 unit tests in `tests/checklist.test.js`, and
  `tools/recipe_check.mjs` asserts in a real browser that every line is
  tickable and that the ingredient and method tick columns share a left edge
  (37m). **Read aloud** — `createSpeaker()` in `cook.js` with `synth`/
  `Utterance` injected, wired to a real "Read aloud" button in `cook-ui.js`,
  omitted entirely where the browser has no `speechSynthesis`, stopped on every
  exit path, and never speaking unprompted; covered by `tests/cook.test.js`
  including the unsupported-browser and user-initiated cases.
  **Still open and unclaimed:** the shopping list, personal notes and
  substitutions bullets. Files: `cook.js`, `cook-ui.js`,
  `tools/cook_check.mjs`, `tests/cook*.test.js`.
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

> ✅ **Per-branch details provenance — DONE 2026-08-16** (`434f6b1`,
> [ADR 0063](decisions/0063-details-provenance-belongs-to-a-branch.md)). Branch
> wins, venue is the default, and the date/method pair moves whole. Unblocks the
> McDonald's/Subway third-party hours capture. Per-kind ageing deliberately
> **not** built — the shape is ruled, the numbers still cannot come from this
> corpus. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
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

✅ **Done 2026-08-17 — the owner minted `FX_TOKEN` and it is in this repo's
Actions secrets.** Fine-grained PAT scoped to `mike548141/faves` alone: Metadata
read, Contents read+write, Pull requests read+write, **no user permissions** —
the narrowest shape that can do the job. No code change was needed; the workflow
reads the secret by name. **Registered in the estate root's credential registry**
with its permissions and expiry read from the console rather than transcribed
from a comment, so the roll story exists before the roll does.
🛑 **It expires 2026-11-15, and the failure then is LOUD, not graceful — which
is the opposite of what the code reads like.** `${{ secrets.FX_TOKEN ||
secrets.GITHUB_TOKEN }}` looks like a fallback; it is not. **An expired token's
secret is still a non-empty string, so the `||` never fires** — the dead value
is used, `gh` returns 401, and `set -euo pipefail` takes the run red. Good
outcome (the red run *is* the rotation reminder), and it was checked in the
workflow rather than assumed: the first reading of this was that expiry would
silently revert to the weekly click, and that reading was wrong. The registry's
expiry check warns 30 days out as well.
🚩 **A 401 will read misleadingly on the way past.** `gh pr create` is guarded by
`|| echo "PR already open … reusing it"`, so an auth failure prints that
reassuring line before the run actually dies on the following `gh pr merge`. If
this workflow ever fails, look for a 401 before believing the message.
⚠️ **Honest limit: the token's auth path is UNPROVEN.** A `workflow_dispatch`
run on 2026-08-17 went green — which proves the file still parses and runs after
the header edits — but it reported *"already refreshed today — nothing to do"*,
and every step that actually uses `GH_TOKEN` is gated on `changed == 'true'`. So
nothing has yet exercised the credential. **The first real rate movement is the
proof**, and the item below is sequenced behind it for exactly that reason.

  The account of why it exists, kept because it explains the design: a PR opened
  by the built-in `GITHUB_TOKEN` counts as coming
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

- [ ] **Turn `can_approve_pull_request_reviews` back off — UNBLOCKED 2026-08-17,
  but NOT YET SAFE** `[XS][ci]` — with a PAT the PR is opened by a real user, so
  Actions no longer needs the permission. It grants nothing today (no rule here
  requires a review), but it is a latent trap: add a review requirement to the
  ruleset later and a workflow could approve its own PR.
  🛑 **The precondition, and it is checkable: wait for ONE successful refresh
  actually opened by `FX_TOKEN`.** `FX_TOKEN` landing is necessary and not
  sufficient. This permission is what lets the **`GITHUB_TOKEN` fallback path**
  open a PR at all, so removing it now would take away the safety net *before*
  anything has demonstrated the net is no longer needed — and the token's auth
  path is currently unexercised (the dispatch run had no rate movement, and
  every `GH_TOKEN` step is gated behind `changed == 'true'`). Turning it off
  first converts a recoverable "the PAT didn't work, click Approve" into a
  silently skipped weekly refresh.
  ✅ **So the trigger is: the first Sunday a rate moves, confirm the PR was
  opened by the owner's account rather than `github-actions[bot]`, then turn it
  off.** That is one `gh pr list --json author` away and needs no judgement.

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
  ✅ **RULED 2026-08-16 (relayed via faves-71, recorded `ed4845f`): leave it,
  record it** — deliberately deferred, not unnoticed. ⚑ discharged.
  — **found by measurement 2026-08-16 and deliberately NOT fixed.** At 390 px
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
- ✅ **28c — a section's serving window** — **done 2026-08-16**, [ADR 0081](decisions/0081-a-serving-window-annotates-it-never-filters.md).
  `served` on a section, in the shape of a venue's `hours`; it **annotates,
  it never filters**, because a filtered section breaks a link someone was
  *sent* as a function of the clock. Full write-up, including the two
  decorative assertions found inside the new check itself, in
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **28d, 28f, 28g — the section heading, its qualifier and its identity** —
  **done 2026-08-16** (`82ddb4b`, `b391f1b`, `2f0da85`), ADRs 0057 and 0058.
  The qualifier came out of eleven headings into a `note`; the anchor stopped
  being derived from the heading and became a stored `sectionId`. Full write-up,
  including the owner ruling that went against the recommendation, in
  [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
- ✅ **28g-tail — the last 25 sections, and the field made required** —
  **done 2026-08-16.** The six files landed (`9cae14e`), the seed finished the
  job — burgerfuel 9, hell-pizza 11, noodle-canteen 5 — and `validate.py` now
  **requires** `sectionId`. Every section carries its own id;
  `seed_section_ids.py --check` is in the CLAUDE.md verify list. Proved by
  breaking it: a section with its id removed is refused (79 mutations).
  ⚠️ **This line said "All 235 sections" until 2026-08-17, when the corpus held
  374** — the menu fetch added 139 sections and the hand-typed tally did not
  follow. The number is **removed rather than corrected**, because the claim
  that matters ("every section, no exceptions") is the one the gate actually
  enforces, and a count re-typed here goes stale on the next intake exactly as
  this one did. Derive it if you need it — the same lesson as the stub count,
  which went stale three times before its heading dropped its number too.

- [ ] 🎯 **28e — OWNER RULED 2026-08-16: yes, Faves may ask who the reader is.**
      Put to him as the decision it is — this would be the first thing the app
      knows about a reader beyond dietary needs. Ruled:
      > *"Yes happy to collect more info on the user like age, gold card etc to
      > get discounts or help them use Faves."*
      ⇒ **28e is unblocked and grows beyond a schema field into a personal-layer
      feature.** It belongs with Theme 22 (the personal layer) rather than
      standing alone, and it is `[M]`+ now, not `[S]`.
      🚩 **A concern raised for him, not a refusal — his call stands either way.**
      **Collect the ENTITLEMENT, not the ATTRIBUTE.** *"Has a Gold Card"* and
      *"ordering for a child"* are what every use he named actually needs; **age
      and date of birth are not**, and they are a different sensitivity class —
      especially for children's profiles, which this app already supports. Three
      reasons the narrower field is better on its own merits, before privacy is
      even mentioned:
      - **It cannot go stale.** An age needs a birth date to stay true, and a
        stored age silently rots. An entitlement flag does not.
      - **It matches the venue's own rule.** The menu says *"Gold Card"* and
        *"12 and under"* — a door test, not a database field. `eligible: true`
        is the same claim the counter makes.
      - **It survives Theme 9 sync unchanged.** Sync pushes an E2E blob to a
        Worker; a birth date in that blob is a materially bigger promise to keep
        than a boolean, and ADR 0017's "no PII" framing would need revisiting.
      **The estate's standing rule bars a person's date of birth even in the
      research store** (ADR 0046), so DOB specifically should not be the shape
      whatever else is decided. 🎯 **If he wants true age anyway — for something
      an entitlement flag cannot do — that is his to say, and this note is the
      briefing, not an objection to it.**
- [ ] **28e (original filing) — eligibility is unstated** `[S][design]` —
  "Gold Card" and "12 and
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

> ✅ **FIXED 2026-08-16 (wt: faves-cook)** — `sync_check.mjs` reaches its own
> `OK — 16 passed, 0 failed` again, five consecutive green runs, and three
> deliberately re-broken selectors each named the step they broke. **Nothing in
> `site/js/` was changed to achieve it.** Three things it taught, all of which
> outlive the fix:
> - 🛑 **The "real person could hit this" hazard is RETIRED — it was the
>   check's own bug, twice over.** The overflow-menu race did not reproduce
>   once the selector was fixed. Both causes were in the tool: `window.scrollTo(0, 0)`
>   (the two-argument form) obeys `app.css`'s `html { scroll-behavior: smooth }`
>   and returned mid-animation — which fully explains the old trace's mystery
>   reading of *"scrollY:879 immediately after scrollTo(0,0), then scrollY:0 on
>   the next read"*: **one unfinished scroll, not a second scroller.** And
>   scrolling to the top makes `initContactBar()`'s IntersectionObserver drop
>   `body.contact-bar-open` a frame later, moving the layout between
>   `d.click()`'s rect read and its mouse dispatch — the click landed on
>   `#menu-page`, 39 ms apart, while a programmatic `.click()` on the same
>   button worked instantly. **The button was fine; the coordinates went stale
>   under it.** `waitQuiet()` is now wired and shown to change the outcome
>   (9 passes → 16). ⚠️ **Honest residue:** the old trace's third observation —
>   `aria-expanded` reporting two open/close cycles from one click — never
>   reproduced. Unexplained, not disproved.
>   ✅ **Narrowed 2026-08-17 (second look, re-verified green: `OK — 16 passed,
>   0 failed`).** Still not reproduced, but it now has **nowhere to live in the
>   shipped app**: one activation cannot move `aria-expanded` twice, because
>   `overflow-ui.js`'s `setOpen()` returns early on `open === isOpen()`, so two
>   cycles need **two click listeners** on the button — and there is exactly one
>   binding, reachable exactly once per page (one entry module each, one
>   `initOverflowMenu()` call each, no re-init path). The mechanism the original
>   diagnosis named is specifically ruled out: `menu.js`'s `reapply()` is a
>   settings *subscriber* that re-renders dishes and never re-runs
>   `initChrome()`, and `sync-ui.js`'s `render()` rebuilds only its own panel.
>   🔑 **"Unexplained" and "a hazard" are not the same claim** — an unreproduced
>   reading with no possible mechanism is a tooling question, not a product one.
> - 🔎 **A second dead assertion, found while fixing the first.** The landing
>   check `!!document.querySelector(".sync-body")` would have passed **on the
>   index screen**: `sync-ui.js` builds that node once at construction and the
>   panel only un-hides it. It now requires a laid-out box. A guard that passes
>   before you have navigated anywhere is not checking navigation.
> - 🔑 **Why it stayed dead for a whole refactor:** see the CLAUDE.md note added
>   with this fix — **CI runs none of the browser checks.** Nothing was calling
>   it. Every Settings selector now lives in one `NAV` block so the next
>   refactor breaks one line loudly.
> Detail in the tool's own header and → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

✅ **Shipped 2026-08-17 (`ecbc82e`)** — **a killed browser check no longer
leaks its Chrome.** `tools/lib/browser.mjs` reaps its registered children and
their profile directories on `exit`/`SIGINT`/`SIGTERM`/`uncaughtException`, and
sweeps unheld `faves-*-check-*` profiles from `$TMPDIR` on first launch. 🛑
`SIGKILL` still orphans both and always will, which is what the sweep is for.
🔑 The bigger half was never abnormal exit: three checks never removed their
profile dir on the **happy** path — 178 of the 189 measured that morning. And a
CDP transport timeout now aborts as a harness error with exit 2 instead of
printing `FAIL <assertion>` with exit 1. Detail →
[`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- [ ] 🚩 **~~`cook_check.mjs` is~~ THE SHARED HARNESS is FLAKY under machine
      load, and flakiness is the failure mode that defeats every other guard
      rule we have** `[S][js]` — **RE-FILED 2026-08-17: this was never
      `cook_check`'s.**
      🛑 **The 30-second timeout is in the TRANSPORT**, `tools/lib/browser.mjs`'s
      `send()`, shared by all **ten** checks. Measured by a peer on this laptop
      with five sessions live: `boot_check` **2 of 4 runs failed**,
      `recipe_check` **4 of 8 aborted**, every failure on that one timeout, from
      two tools that are not this one. So scoping it to `cook_check` was reading
      the tool that happened to be under the microscope, not the fault.
      ✅ **The half that could be fixed by mechanism is fixed** (`ecbc82e`): a
      transport timeout is now a `HARNESS ERROR` with exit **2** and never
      prints `FAIL <assertion name>` with exit 1. That does not make the machine
      less loaded; it makes a flake **structurally unable to impersonate a
      regression**, which was the dangerous half. `FAVES_CDP_TIMEOUT_MS` gives a
      loaded machine rope. What remains open is the underlying contention.
      ❌ **The `:1301`/`:1353` diagnosis in this item is WRONG and is struck.**
      It said `:1353` calls `setNotifications("granted")` on an origin already
      pinned to `denied`. It does not: **line 1327, `await
      setNotifications("prompt")`, added in the same commit `3eb3d86b` as the
      pin**, restores the permission one line before the `longTimer` block opens.
      The named mechanism cannot occur in this tree.
      🛑 **So the "candidate fix, one line, deliberately not applied" is now
      REJECTED ON EVIDENCE, not deferred** — and the original reason for not
      applying it stands and is stronger. Flipping `:1301` to `"granted"` would
      delete the only coverage of the notifications-**blocked** path (the
      block's own comment: *"A blocked browser still sounds and buzzes, which is
      the only thing this scenario is about"*) in order to fix something that is
      not there. Three consecutive `cook_check` runs at load 8.6–10.0 on
      2026-08-17 returned `OK — 75 passed, 0 failed` with both named assertions
      passing.
      🔑 **The transferable lesson, which is worth more than the item:** an
      agent reported this correctly as a *measurement* and wrongly as a
      *diagnosis*, twice over — first the tool, then the mechanism. **Separate a
      report's measurement from its diagnosis; the measurements were sound every
      time.**
      Original filing follows —
      measured 2026-08-16 while integrating 36d. Four completed runs of the same
      commit: **75/0, 73/2, 75/0, 75/0.** One run in four failed two assertions;
      the tree did not change between them.
      🔎 **Load is the best explanation and it is not proven.** Six sessions
      were live; 1-minute load average ran 5.9–15.8 across the runs, and the
      failing run was at the high end. The building agent independently hit a
      harder version of this — **seven consecutive runs stalling** in the
      *pre-existing* section 4b, ~30 assertions before its own new code, with
      the audio path disabled and a different fixture, and only five lines of
      *comment* changed since the last green run. It could not get its
      replacement ring-once assertion observed at all; it passed here, later,
      on a quieter machine.
      🛑 **Why this outranks its size.** This repo's whole guard discipline is
      *"a wall of PASS then an error is not a pass — check the summary line"*.
      Flakiness defeats that rule specifically, because the summary line **is**
      there and it says FAILED, and the correct response looks identical to the
      wrong one: run it again. **I ran it again. It went green. That is exactly
      the behaviour that trains a session to re-run until green**, and it is why
      this is written down instead of quietly enjoyed. ⚠️ **The two failing
      assertions were not captured** — the failing run predated the run that
      tee'd its output, and I chose not to burn a load-generating reproduction
      attempt to recover them. That is a real gap in this evidence, not a
      rounding error.
      🔑 **Sequence it with the CI item below, not separately.** They are the
      same decision from two sides: a check too flaky to gate is also a check
      too flaky to *trust when typed by hand*, and "leave them manual" quietly
      assumes the manual runs are believed.

- [ ] 🚩 **CI runs NONE of the browser checks** `[M][docs]` — found 2026-08-16
      while closing the item above, and it is the reason that one could sit dead
      through a whole settings refactor. `.github/workflows/ci.yml` runs
      `node --test` and the Python gates. It does **not** run `sync_check`,
      `cook_check`, `device_check`, `boot_check`, `addon_check`, `branch_check`,
      `to_top_check` or `filter_row_check` — **eight** browser guards, every one
      of them written *because* unit tests had already missed something real (a
      leaked wake lock, a silent `init()` throw, a mistapped price, an unsafe
      add-on). They run only when a person or an agent types them from
      CLAUDE.md's list.
      🔑 **The asymmetry is the point:** the cheap guards that catch the least
      are automated, and the expensive guards that catch the most are on the
      honour system. So "CI is green" is not evidence about anything on that
      list, and the checks most likely to be skipped under time pressure are
      exactly the ones nothing else covers.
      🤔 **Not obviously a "wire them into CI" job, which is why this is an item
      and not a fix.** They need headless Chrome, a throwaway profile and a live
      server; `sync_check` drives **two** browsers and takes minutes; several are
      timing-sensitive, and a flaky required check trains people to re-run until
      green, which is worse than no check. Options worth costing before choosing:
      a nightly/pre-deploy job rather than per-push; a fast subset
      (`boot_check` alone is seconds and catches the worst class); or leaving
      them manual and making the *list* impossible to skip. ⚑ Owner's call on
      whether CI minutes get spent here.
      ✅ **RULED 2026-08-16: the FAST SUBSET, per push. `[S][tools]` — DONE
      2026-08-17 (`344adfb`), claim discharged.** Wire **`boot_check.mjs` into
      `.github/workflows/ci.yml` on every push**; the other seven stay manual on
      CLAUDE.md's list. The full-CI and nightly options were both put to him with
      their costs and both declined.
      🔑 **Why this is the right subset and not a compromise:** `boot_check` runs
      in seconds, needs no timing assumptions, and catches the single worst class
      — *a screen whose JavaScript does not run at all*. That is the exact failure
      it was written for (2026-08-16: `app.js` threw on a missing import, the home
      screen silently served its no-JS fallback, and **570 unit tests,
      `device_check` 19/19 and `cook_check` 36/36 were all green**).
      🛑 **And it is the one that is safe to make REQUIRED**, which is the whole
      point: `cook_check` is measurably contention-flaky (see the item above) and
      `sync_check` drives two browsers for minutes. A flaky required check trains
      everyone to hit re-run, which is worse than no check. Do **not** quietly
      add the others later without re-testing that assumption.
      ⚠️ **This does not close the item.** Seven guards remain on the honour
      system, so *"CI is green"* still is not evidence about most browser
      behaviour. Keep the 🛑 note in CLAUDE.md's verify list saying so.

- [ ] 🚩 **Two CI jobs run on every push and cannot block one** `[S][owner]` —
      found 2026-08-16 (wt: faves-schema30), verified against the ruleset API,
      not read off the workflow file. `protect-main` (ruleset 20597160, active)
      requires exactly **four** contexts: `floor / scanner floor` ·
      `menu data validates` · `zero dependencies` · `JS unit tests`.
      **Not required: `service-worker version lockstep` and `every screen
      boots`.** Both run; neither gates.
      🛑 **The version one is the sharp end, because on this repo a push IS a
      deploy.** That gate exists *because* an unbumped `SHELL_VERSION` shipped to
      the owner's own phone with CI green — an unchanged constant makes the
      install step skip the cache, so old files serve forever. Advisory, the only
      thing between that recurring and a reader is somebody noticing a red badge
      **after** the deploy has gone out. `every screen boots` was just wired in
      and deliberately chosen as *"the one that is safe to make REQUIRED"* — it
      is not yet required, which is a one-line settings change, not new work.
      🛑 **AND A LAYER ABOVE BOTH, which changes what the fix even is.** Raised
      by faves-ea, verified here directly against the ruleset API rather than
      inferred: `protect-main` carries
      `bypass_actors: [{actor_type: RepositoryRole, actor_id: 5, bypass_mode:
      always}]`. **Admin bypass is unconditional**, so even the four *required*
      checks cannot block a push from the owner's own machine — which is where
      most pushes come from. Three sessions saw
      `Bypassed rule violations for refs/heads/main` on their pushes tonight and
      read it as noise. **So promoting the two advisory jobs to required buys
      less than it appears to**, and the honest framing of the ask is two
      questions, not one.
      🎯 **Owner's call, and it is genuinely two decisions** — both repo
      settings, both his:
      ✅ **(a) RULED AND DONE 2026-08-16 — required checks went 4 → 6.** Both
      `service-worker version lockstep` and `every screen boots` are now in
      `protect-main`'s required list; verified directly against the ruleset API,
      not taken on report. Do **not** extend it to `cook_check`/`sync_check` —
      both are measurably contention-flaky and a flaky required check trains
      everyone to hit re-run, which is worse than no check.
      ⚠️ **And the honest limit, which must stay attached to (a) wherever it is
      quoted: the practical effect today is NIL.** `bypass_actors` is unchanged,
      so pushes from the owner's machine still bypass all six. (a) takes effect
      only if (b) moves. A session first reported this change as *"closing the
      stale-menu hole"* and had to correct itself to the owner — on its own it
      does not.
      🔑 **What moved this, worth reusing:** the abstract argument about guard
      layers had been in front of him for a while and did not land. What landed
      was the concrete pairing — *the gate written because an unbumped
      `SHELL_VERSION` shipped stale files to his own phone is the specific one
      that cannot stop it happening again*, on a repo where a push is a deploy.
      **A named past incident beat a principle.**
      ⏳ **(b) Decide whether admin bypass should stay `always`** — deliberately
      deferred by the owner, not overlooked. It is defensible
      — a solo owner locking himself out of his own default branch is a real
      cost, and the doctrine floor names lockout-class changes as
      stop-and-confirm. But while it stands, *every* required check on this repo
      is advisory for the person who pushes most, and (a) is close to cosmetic
      without it. `evaluate` mode, or bypass on pull-request only, are the
      middle options. **This one is his alone and must not be changed for him.**
      🔑 **And a second-order finding worth more than the first, from faves-
      hygiene: this was nearly reported wrong, and the reason generalises.**
      The required list is read **by job name**, and the job displayed as
      *"zero dependencies"* also runs `check_decisions`, `check_fallback`,
      `gen_sbom --check` and `check_visibility` — four steps its name does not
      describe. Auditing coverage by job name therefore reports the **ADR-index
      allocator as ungated when it is properly gated**. This is not a decorative
      *guard* (ADR 0072) — the guard works — it is a **decorative label**, and
      the damage lands on the auditor rather than the code. The cheap fix is a
      rename (`repo invariants`), not another check. Same family as the
      all-clear that cannot be falsified: **the observable output does not
      distinguish the two states an honest reader needs to tell apart.**

      ✅ **SHIPPED 2026-08-17 (`344adfb`, wt: faves-hyg-ci).** Job `every screen
      boots` in `.github/workflows/ci.yml`, on every push to `main` and every
      PR. `CLAUDE.md`'s notes are corrected (`4fcb05e`).
      🔎 **Chrome was measured on the runner, not read from documentation.** A
      throwaway probe job reported Google Chrome **151.0.7922.108 preinstalled**
      at `/usr/bin/google-chrome` on `ubuntu-24.04` image `20260810.271.1` —
      the same major version this laptop runs, so CI and a local run measure the
      same browser. `FAVES_CHROME` is the only hook needed; `browser.mjs` was
      not edited, **no marketplace action was added** (a public repo's workflow
      is a trust surface) and **no `--no-sandbox` / `--disable-dev-shm-usage`
      flags were needed** — that advice is container folklore and these runners
      are VMs (`/dev/shm` 7.9 GB, headless launches clean as unprivileged
      `runner`, despite `apparmor_restrict_unprivileged_userns=1`).
      🔑 **A preflight step asserts the browser exists BEFORE the check runs**,
      so an image that drops Chrome reads as *"the runner lost its browser"* and
      not as *"a screen failed to boot"*. Costs two seconds; it is the
      difference between a guard and a guard pointing at the wrong thing.
      ✅ **Burn-in: 7 runs on the runner, 7 green, 0 failures**, every one
      reaching `OK — 24 passed, 0 failed` with N checked, not just the verdict.
      **8–12 s** per check step, 16–21 s per job. **Added wall-clock per push: 0
      s** — it runs in parallel and finishes before the longest existing job.
      **Actions minutes: nil** — public repo, standard runners are free; that
      changes only if this repo ever goes private. The `pull_request` path is
      proven too (PR #4, since closed). The number and the failure count are
      recorded rather than "burned in clean", because the latter is testimony.
      ✅ **And it is proven NOT decorative, by reintroducing the exact bug it
      was written for** — `venueTimezone` dropped from `app.js`'s import list.
      **Every other job stayed green** (unit tests, data validation, zero-deps,
      version lockstep) and the boot job alone went red, naming the symbol, the
      file, the line and the call chain into `init()`.
      🛑 **What it CANNOT do, stated because everyone including this session had
      been claiming otherwise.** `protect-main` lets a repository admin bypass
      required checks (`bypass_mode: always`), and **the last 100 ruleset
      evaluations on `main` were 100 bypasses** — measured, not one anecdote. On
      the normal path a push to `main` **is** the Cloudflare Pages deploy, so
      the sequence is **push → deploy → red afterwards**. The job is not in the
      required-checks list either, so it does not block a PR merge. A peer
      cleared this change with *"if I ship a change that makes a screen's JS
      throw, I want the push to fail"* — **it will not fail; it will go red
      after the broken site is live.** Still worth having, and a materially
      weaker claim than the one being made.
      🚩 **`service-worker version lockstep` is ALSO absent from the required
      list** — the gate written *because* an unbumped `SHELL_VERSION` shipped to
      the owner's own phone is advisory on every path. 🎯 Whether either becomes
      required is repo settings and therefore the owner's; it is being put to
      him from the session holding the live version-bump instance, as one ask.

      ✅ **ANSWERED same day: the owner authorised it and a peer made the
      change — `protect-main` now requires SIX contexts**, adding `every screen
      boots` and `service-worker version lockstep`. Verified independently
      against the ruleset API rather than taken on report. 🔑 **The boot job had
      to exist before it could be required**, so the CI wiring above is what
      made the addition possible.
      🛑 **But `bypass_actors` is UNCHANGED — `RepositoryRole 5 → always`.** So
      a push from the owner's machine still bypasses all six, and **on its own
      this closes nothing in practice today.** The peer nearly overstated it to
      the owner and corrected itself; that correction is the load-bearing part
      and is preserved here rather than smoothed into a win. 🔑 The resting
      state is now **required-but-bypassable** — better than advisory, not the
      same as enforced, and it takes effect the moment the bypass is narrowed.
      🎯 **Narrowing the bypass is a separate owner decision he has NOT taken**;
      the peer recommended leaving it for now. Do not treat this item as
      protected by the requirement.
      🚩 **A near-miss worth more than the finding it came from:** a peer nearly
      reported `check_decisions.py` as ungated too. It is not — it, plus
      `check_fallback`, `gen_sbom --check` and `check_visibility`, are **steps
      inside the `guard` job, whose display name is "zero dependencies"**, and
      that job *is* required. The required list is read by **job name**, and a
      job name describing one of its five steps makes the other four invisible
      to anyone auditing coverage. Not a decorative guard — the guard works — a
      **decorative label**, whose victim is the auditor rather than the code.
      🛑 **The ruling's stated reason does not survive contact, and this is the
      correction that matters most.** `boot_check` was chosen because it "makes
      no timing assumptions" — true of its *assertions*, and **the 30-second CDP
      timeout is in the TRANSPORT**, in `tools/lib/browser.mjs`, shared by all
      ten checks. Measured by a peer on this laptop with five sessions live:
      `boot_check` **2 of 4 runs failed**, `recipe_check` **4 of 8 aborted**,
      every failure on that one timeout. So flakiness is a *harness* property,
      not `cook_check`'s, and freedom from timing assumptions in the body bought
      nothing. **Worse: `boot_check` renders a transport timeout as
      `FAIL <assertion name>` and exit 1** — byte-indistinguishable from a real
      regression, where `recipe_check` at least dies with exit 2 and *looks*
      like infrastructure. That is a fresh instance of the pattern in this
      theme, and the fix is one file above all ten checks: classify a transport
      timeout as a harness error with its own exit code so a flake is
      structurally unable to impersonate a regression. **Not observed on the
      runner (7/7)**; this is a loaded-machine finding, and it is machine-
      independent in principle.
      📌 **Count correction: there are TEN browser checks, not eight** — the
      family grew under the item (`recipe_check` and `note_check` joined). Nine
      remain on the honour system. `boot_check` was never on `CLAUDE.md`'s
      fenced verify list at all despite its own prose saying to run it; it is
      now.

> ✅ **OWNER RULING 2026-08-16 — FIVE parallel sessions stay. Recommendation
> overruled, deliberately.** A session proposed cutting to **three**, each given
> a *file territory* rather than a roadmap item, on the evidence that the fifth
> session was producing coordination overhead rather than throughput: a ready,
> owner-ruled item (36a) was declined purely for file contention; two sessions
> spent messages negotiating `SHELL_VERSION` ranges; and **twice, one session's
> entirely correct action hard-blocked every other session's commits**.
> **He heard all of that and kept five**, judging the raw parallel output worth
> the per-session friction. That is his call and it is now the operating model —
> do not re-propose the cut without new evidence.
> 🔑 **So the job is to make five work, not to argue about five.** The mechanisms
> that demonstrably paid for themselves on the day, and should be treated as
> standing practice rather than good manners:
> - **Broadcast your FILE SET on open, not just your roadmap claim.** A claim
>   does not say which files. This surfaced `cook.js`/`cook-ui.js` double-held by
>   two sessions who did not know about each other, and it was a *third* session
>   noticing two answers to one broadcast that found it.
> - **Announce version RANGES out loud and re-verify after every rebase.** Never
>   take "deployed + 1" — a rebase does not conflict on a version constant, it
>   **absorbs** it, leaving CI green and installed phones on the old shell.
> - **Ask peers what the owner has ruled at their end.** Rulings do not cross by
>   themselves; three arrived that way today.
> - 🚩 **Announce a change that makes the repo's GATES stricter** the way a
>   `SHELL_VERSION` is announced. Two of the day's four repo-wide stops came from
>   correct changes whose blast radius was everyone else's ability to commit.
> - **One worktree per agent**, or forbid `git add -A` in the brief — disjoint
>   *file ownership* does not make a shared worktree safe, because `git add -A`
>   is not file-scoped. That cost 101 lines of misattributed work today.

- [~] 🚩 **`linkscan` is blind to reference-style links, and it is an ENFORCED
      floor guard** `[S][docs]` — **claim DISCHARGED 2026-08-17: the local half
      is finished** (queued upstream, accepted as atelier `020/320`). The item
      stays open **blocked on that upstream fix**, not on anyone here; there is
      nothing to claim. ⏳ **owed upstream to atelier; nothing to fix
      locally.** Found 2026-08-16 when `pathscan` (warn-only) caught a broken ADR
      link in a commit that `linkscan` (enforced) had just passed.
      🔎 **Isolated with a two-line probe, not inferred.** A file containing both
      `[inline](does-not-exist-a.md)` and a `[refstyle]` whose definition is
      `[refstyle]: does-not-exist-b.md` reports **exactly one** broken link — the
      inline one. A file containing *only* the reference-style link reports
      `✓ linkscan clean — every internal link resolves`. The whole syntax class
      is invisible to it, and the all-clear says the opposite in as many words.
      🔎 **Exposure here, measured: 26 reference-style definitions across the
      repo's markdown, and `docs/ROADMAP.md` alone carries 10 of them — all its
      `[ADR 00xx]` links.** So the repo's densest cross-reference surface is the
      one the enforced guard cannot see. **Currently none of them are broken**
      (the only miss is this session's own ADR 0074, which resolves when
      `cook-36` merges), so this is exposure, not damage — say so plainly rather
      than dressing it up.
      🔑 **Why it is worth an item anyway.** `pathscan` does catch these, but
      `pathscan` is **warn-only** in this repo's hook plane while `linkscan` is
      enforced. So a broken ADR reference can never block a commit, and the one
      guard that would have blocked it prints a clean bill of health. Two guards
      whose union looks complete and whose *enforced* half has the hole is worse
      than one honest guard, because the green line is what gets quoted.
      🛑 **Do not "fix" this by making `linkscan` stricter from here** — it is
      atelier's tool at `../atelier/tools/linkscan.py`, shared by every repo on <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tools/, not this repo's tree -->
      the floor, and a local patch would fork it. Queue it upstream under the
      queue-never-deliver rule, the way atelier's Track E item E9 was. Until it
      lands, the honest local mitigation is to prefer inline `[text](path.md)`
      over reference-style in new records.

      ✅ **QUEUED UPSTREAM 2026-08-17 and ACCEPTED — atelier item `020/320`.**
      Handed to the live atelier session with the reproducer, the affected
      syntax forms and the suggested definitions-not-usages fix shape; it
      **re-reproduced the fault from its own probe rather than take ours on
      trust** before filing, and wrote the item itself on the ground that it is
      accountable for what lands in its tree. Nothing further is owed from here
      and nothing is to be fixed here. It also placed it as the first instance
      of a *vacuity* class already on its board: not silence, but **an
      affirmative claim naming the property it did not check**.
      🔎 **Measured here, beyond the original filing:** the blind spot covers
      **all** reference forms — full `[text][ref]`, collapsed `[ref][]`,
      shortcut `[ref]` — plus the **image** form `![alt][ref]`, and it swallows
      **both** finding kinds, `missing-file` *and* `missing-anchor`. Exposure
      re-measured 2026-08-17: **36 reference-style definitions repo-wide, 11 in
      `docs/ROADMAP.md`** (up from 26/10 the day before), all of them its
      `[ADR 00xx]` pointers — the densest cross-reference surface we have is the
      one the enforced guard cannot see. **Zero are broken.** Exposure, not
      damage; say it that way and do not dress it up.
      🛑 **CORRECTION, and it makes this WORSE: `pathscan` does not fully
      compensate.** This item recorded that `pathscan` catches these and is
      merely warn-only. Atelier probed it and found the cover is **partial** — a
      reference definition whose destination carries a slash is flagged, and one
      that is a bare filename is **missed**. It verified the control first (a
      bare path mentioned in prose fired correctly), so the silence is a real
      miss and not the probe sitting outside its scope. So the compensating
      guard is itself holed, in the same syntax class, *and* warn-only. **Two
      guards whose union was assumed complete are both partial** — which is a
      sharper version of this item's own point than the version it was filed
      with, and it was found only because a third party probed a claim nobody
      had reason to doubt.

> ✅ **Closed 2026-08-16** — whole-repo scanner runs inflated by live worktrees.
> **Stale, and re-measured with five worktrees live**: `leakscan .` clean (not
> 101-and-blocked), `plainscan .` 652 with no doubling. Worktrees moved to
> `~/worktrees/`, outside the tree, so `.` no longer holds a second checkout —
> the item's premise was a *neighbouring repo's convention*, and it moved.
> Bare sweeps are safe here again. 🚩 Returns if a worktree is ever taken inside
> the tree; upstream atelier E9 stays valid and untouched. Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

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

✅ **Shipped 2026-08-17 (`ecbc82e`)** — **a passing browser check now says which
tree it ran in.** All ten checks print a second indented line naming the served
tree, its `SHELL_VERSION` and its `branch@sha`; the `OK — N passed, N failed`
first line is byte-identical, so every existing grep still works. The item's own
premise — that `tools/lib/browser.mjs` owns the summary — was **false**, all ten
hand-rolled their own tail, so the fix made the premise true rather than working
around it. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

- [ ] 🛑 **CI runs none of the eight browser checks** `[M][ops]` — the structural
      face of [ADR 0072] and the one that undercuts the rest.
      `.github/workflows/ci.yml` runs `node --test` and the Python gates;
      `sync_check`, `cook_check`, `device_check`, `boot_check`, `addon_check`,
      `branch_check`, `to_top_check`, `filter_row_check` and now `recipe_check`
      run **only when a human types them**. Every guard in this repo written
      *because* unit tests missed something real is on the honour system, and
      that is the whole answer to how `sync_check.mjs` stayed dead through an
      entire refactor. 🔑 **The cheap guards that catch the least are automated;
      the expensive guards that catch the most are not.** ⚠️ Not free: they need
      Chrome in the runner and they are slow, and several are flaky under
      parallel load — two `cook_check` runs on one machine timed out on
      `Runtime.evaluate` and `Input.dispatchKeyEvent` while a third passed 60/60,
      which is contention, not a logic fault. So this needs a decision about
      which subset gates a merge and which run nightly, not just a workflow edit.

- [~] **Our inlined floor is a stamped copy nothing watches** `[S][docs]` —
  **claim DISCHARGED 2026-08-17: the copy-vs-source check was done properly**
  (results below). The item stays open on **three owner decisions** and on
  atelier's ST3, not on a session; there is nothing to claim. —
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
  ⚠️ **Re-checked 2026-08-17 at `atelier@1408d98` — pin CLEAN, copy is NOT.**
  Drift check run independently: `HEAD == main == origin/main == 1408d98`, so
  the stale-checkout confound was excluded before the range was believed, and
  `1408d98..origin/main` is genuinely empty. **The source did not move; the
  copy was still wrong** — which is the point the item exists to make, now
  demonstrated rather than asserted.
  🔑 **The comparison was being made against the wrong artefact.** The
  canonical thing a stamped copy copies is not the four method docs — it is the
  **floor region in `PROPAGATION.md`**, shipped between `floor:begin` /
  `floor:end` markers and the exact text `stampscan` would diff us against.
  Read that way the block splits three ways, and only the middle group is ours:
  - **Faithful to the region:** the floor stop-list, the informed-confirmation
    triple, the principal's-authority-is-absolute wording (the 2026-08-15
    correction), record naming, estate-resources, visibility. No drift.
  - 🚩 **Ours, and diverging from the region — three places.** (1) The apex
    bullet substitutes three `00-APEX` practice clauses for the region's
    *ordering rationale* ("adaptation runs on evidence, and honesty is what
    makes the evidence trustworthy"). Richer, not wrong — but it is a fork, and
    `stampscan` will red on it the day ST3 lands. (2) The
    **dirty-primary-checkout passage is not in the region at all** — we inlined
    it from `CONCURRENCY.md`'s body on 2026-08-16. (3) `Source & drift`
    rewrites the region's command.
  - **Absent from the region too, so inherited faithfully and owed UPSTREAM,
    not here:** `RECORD`'s *boundary is the balance* (a mid-sequence pause
    carries no close-obligation), `RECORD`'s *bulk deletion from a record store
    is show-first regardless of who made the mess*, `ECONOMICS` item 1 (*a task
    is a coherent line of work*). All three are dropped-MAY clauses; none is
    our fault.
  🛑 **The dirty-checkout rule DEADLOCKED THREE SESSIONS AT ONCE on
  2026-08-17 — and the defect is UPSTREAM, not in our copy.** Atelier's rule
  keys on the **item's file**: *"If the item's file itself is dirty: that is
  positive proof the other session is queue-active — sync, take the next open
  item, touch nothing."* This board is **monolithic** — `docs/ROADMAP.md`,
  5,402 lines, 53 claimable items, one file, no `docs/roadmap/`, no
  `board.py` — so the item's file simply **is** `ROADMAP.md`, and our inlined
  line is a *faithful* application. **The yield branch is what does not
  generalise:** "take the next open item, touch nothing" silently assumes the
  next open item lives in a *different* file, which is true on a split board
  and false on ours. So both halves point at one file and the rule collapses —
  *take the next open item* names the file *touch nothing* just forbade, and a
  session can claim nothing at all while any peer holds the queue file, which
  is most of the time at five live sessions.
  🔑 **An initial reading of this as "we mistranslated it" was WRONG and was
  corrected by a peer who went and read the source rather than taking the
  claim on trust.** Atelier's parenthetical — *"(the item's file, and **on a
  split board** the generated index with it)"* — is a conditional that
  contemplates both board shapes; it never completes the thought for the
  monolithic one. **Getting the attribution right is the whole practical
  difference:** filed as a local wording bug it sends the fix to the wrong
  file and leaves every other monolithic-board adopter in the same trap.
  🔎 **The strongest form of the argument is that atelier is internally
  inconsistent, not merely silent.** Its *first* branch already sanctions
  hunk granularity in as many words — *"stage and commit the claim alone,
  nothing else … safe because it stages only your own hunks"* — and its rebase
  guidance is line-granular (*"put the `[~]` on the item's checkbox line so a
  same-item collision always fires on one line"*). The yield branch is the one
  place the passage jumps to **file** granularity. ⚠️ That checkbox-line
  sentence is about *rebase-collision granularity*, not about whether a dirty
  file bars a write — it is evidence that the unit is coherent, not a
  statement of the yield rule. Say so when putting it up; it is an
  extrapolation, and a good one, but not a quotation.
  🔎 **Empirical, from the same day, and it cuts BOTH ways — neither half may
  be dropped.** *For* the line-level unit: a peer did exactly this, twice,
  writing four claim releases into `ROADMAP.md` while another session's hunks
  sat in the same file, staging its own alone via
  `git apply --cached --unidiff-zero`; the stranger's work was untouched and
  `78bd39e` landed clean. **Against it:** an index collision happened *anyway*
  — for about a minute the index held both sessions' work sets, and
  hunk-staging did not prevent it. What caught it was
  `git diff --cached -U0 | grep '^@@'`, and nothing else; `git status` looked
  normal throughout.
  🛑 **So the honest proposal is CONDITIONAL and weaker than "the line is the
  unit": the relaxation is safe only if a pre-commit index check ships WITH
  it.** The file-level rule was accidentally doing that protective work —
  crudely, by keeping everyone out. Relax it without making the index check
  compulsory and five sessions will land each other's half-written hunks under
  the wrong commit message. And make the test **mechanical, not spatial**:
  `git diff -U0 docs/ROADMAP.md`, then check whether any hunk header's line
  range intersects your item's line range. "Nowhere near" degrades as the file
  grows and gives different readers different answers; an intersection test
  gives every reader the same one, which is the property the current clause
  lacks.
  🔑 **The generalisation that matters more upstream than our instance does.**
  The yield branch's hidden assumption is not *"split board"* — it is *"the
  next open item lives in a different file"*. Read the first way it sounds like
  a niche gap; read the second it is universal, because an adopter comparing
  itself against the words "split board" may not recognise itself. 🚩 **And the
  timing is the trap:** a repo is most likely to be monolithic **early**, when
  it has one file, few items and one session — exactly when the rule looks
  theoretical and costs nothing to adopt. It bites when they scale to parallel
  work, the worst possible moment to find the concurrency rule does not close.
  This repo is that story: the clause was inlined 2026-08-16 and deadlocked
  three sessions the next morning, its first day under real parallel load.
  🔑 **Two method failures from the same episode, recorded because they are
  about how corroboration broke rather than about CF3.** (1) *Two sessions
  agreeing is not corroboration when the second never opened the source.* The
  mistranslation claim was asserted by one session, backed with fresh evidence
  by a second, and refuted by a third that actually read `CONCURRENCY.md`.
  Two-of-three agreement felt like confirmation and was one unread claim with
  an echo. (2) *A symptom count locates a fault's existence, never its site.*
  "Three independent readers all stalled on this clause" is strong evidence the
  deadlock is **real** — and no evidence at all about **which file** the defect
  lives in. It was offered, and received, as settling both.
  🤔 **And the framing to put to the owner honestly: the monolith is the root
  cause.** Every claim collision, the `SHELL_VERSION` collisions, the
  ADR-number collisions and this deadlock are one shape — a shared mutable
  file with no per-item granularity. A line-level patch makes the monolith
  *survivable*; it does not fix the rule. The split board is the fix atelier
  already has.
  🔎 **We also inlined half of `RECORD`'s CI rule.** Our close clause ("the
  all-clear cites the pushed CI result, or flags it pending") is beyond the
  region and faithful — but it drops the sub-rule that makes it work: *a
  cancelled run is not a result, and a concurrent session cancels yours as a
  matter of routine*. Under five parallel sessions that is the routine case,
  not the exotic one, so the clause we kept can be satisfied by evidence the
  source explicitly rejects. Enriching past the region means owning the whole
  clause.
  ✅ **`00-APEX`: no drift.** Both 2026-08-15 changes are correctly carried,
  and the removed Laws section left no residue (grepped: zero hits).
  🎯 **Three decisions, all the owner's — raised 2026-08-17, none actioned.**
  (a) Re-word the dirty-checkout clause for a monolithic board so claiming
  stays possible; the honest reading is that the *item's line* is the unit, not
  the file — which matches atelier's own instruction to put the `[~]` on the
  item's checkbox line. (b) Add the cancelled-run sub-clause, or drop our CI
  clause back to the region's wording. (c) Decide whether we keep forking the
  apex and `Source & drift` wording deliberately (and record why) or
  re-converge before ST3 lands and `stampscan` starts reding it.
  🚩 **ST3 is still OPEN** — re-checked 2026-08-17: atelier's own roadmap
  carries it as `- [ ]` (D2 residue), corroborated by its own tool
  documentation ("that is ST3, still open") and its changelog. Markers still
  cannot be adopted here; the hand-check remains the only mechanism.
  🛑 **And the documented drift command is INOPERABLE from a worktree, which is
  this repo's default mode for all write-heavy work.** `git -C "../atelier"`
  resolves to `/Users/mike/.pets/atelier` from the primary checkout and to
  `/Users/mike/worktrees/atelier` — which does not exist — from any worktree.
  It fails **loudly** (`fatal:`, rc=128) rather than silently, so it is not a
  textbook decorative guard; but **both** readings of its output are wrong.
  Read as stdout only — the commit list the instruction tells you to read — it
  is *empty*, byte-identical to a genuine clean run. Read as all output, the
  `fatal:` line trips the stated rule that *"any output means the house
  doctrine moved"*, a false positive. Worktrees live at `~/worktrees/`,
  outside the tree, by deliberate decision. Nothing automates this: there is no
  pin or drift script in `tools/` at all.
  🚩 **Three findings owed upstream to atelier** (queue-never-deliver; nothing
  to fix here), handed to the live atelier session 2026-08-17: the region's own
  `Source & drift` command is `git -C <path> log --oneline <SHA>..HEAD` — **no
  fetch, and `HEAD` not `origin/main`** — so every child on the floor ships the
  exact stale-checkout silent-pass this repo diagnosed and fixed locally on
  2026-08-09; the region's *"Everything recoverable — commit/push/PR included —
  just proceed"* sits against `RECORD.md`'s *"Recoverability of bytes is the
  wrong test for a record store"* with no boundary drawn between them; and CF3
  itself may want an explicit monolithic-board branch.
  🚩 **A FOURTH, queued 2026-08-17 — atelier's branch-protection check is
  specified to catch the wrong failure, and this repo is the counterexample.**
  AP1's open "machine-check half" (`docs/roadmap/140-…/010-the-machine-check-half…`)
  owes *"a parent-row check reading branch-protection/ruleset state and going
  **RED when absent**"*, on the reasoning that *"nothing would notice if the
  ruleset were deleted"*. **On faves that check would report GREEN today.**
  `protect-main` is present and `active` — so a presence test passes — while
  the **last 100 ruleset evaluations on `main` were 100 bypasses**, because
  `bypass_actors` carries `RepositoryRole 5 → always`. 🔑 **Present is not
  enforcing, and absence is the failure mode that already raises its hand** —
  a deleted ruleset is loud, a permanently-bypassed one is silent and looks
  identical to a working one from outside. The absences-raise-their-hands
  doctrine needs its second limb: **a control that exists but cannot change any
  outcome is the same defect as one that is gone**, which is ADR 0072's
  decorative-guard rule arriving at the branch-protection layer.
  ⚠️ **The interaction is the other half, and neither end records it.** C4
  (*"make the local bypass visible"*) reasons about `--no-verify` on the stated
  premise *"with CI as backstop rather than gate"* — and here CI is not a
  backstop either, since two of its six jobs could not block a push until this
  was found. **Two bypass layers, each of whose write-ups assumes the other one
  holds.** Evidence is this repo's own state on 2026-08-17, measured by three
  independent sessions, not testimony.

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

- [ ] 🚩 **A browser check that names an element by id is only as durable as
      that element — sweep all twelve** `[M][ci]`. Handed over 2026-08-17 by
      `faves-ea` at its session close, deliberately **flagged rather than
      half-started**, because it is fresh work across twelve tools rather than a
      tidy-up of anything already in flight. Unclaimed.
      🔎 **The concrete instance, which is worth more than the principle.**
      [ADR 0083] removed the `#geo-ask` location pill on the owner's word.
      `tools/filter_row_check.mjs` drove that id directly and **crashed on a
      null** the moment it went — `Cannot set properties of null (setting
      'hidden')`, mid-run, no summary line. One line to fix once seen.
      🔑 **That is the LOUD version, and it is the good one.** The silent
      version is a check that keeps *passing* against an element that no longer
      exists — green, meaningless, and indistinguishable from working. That is
      exactly the decorative-guard fault [ADR 0072] names, wearing yet another
      hat: the guard still runs, still reports, and no longer refers to
      anything. `sync_check` sitting dead through a whole settings refactor is
      the same disease.
      **What the sweep is:** across all twelve browser checks, find every
      assertion that reaches for a specific `id` or class, and decide for each
      whether a *missing* target should fail loudly or is a legitimate absence.
      🎯 **The judgement to make, per assertion, not globally:** an id that
      vanishes because a feature was removed should make the check fail with a
      sentence naming what it wanted — not throw, and not quietly pass. The
      question a retarget must answer first is whether the assertion's
      *question* is still live: `filter_row_check`'s was ("can something above
      own the pixels a tap would land on"), so it was pointed at `#geo-banner`
      rather than deleted. Where the question died with the element, delete the
      assertion — a check kept for an intent nobody holds any more is the same
      fault from the other end.
      🚩 **WIDEN IT TO COMMENTS AND PROSE — measured 2026-08-17, hours after
      this item was filed.** Asked to prove the session was ready to close, a
      sweep for `geo-ask` found **three** live references to the deleted pill
      that no gate sees, because none of them is code:
      `site/css/app.css` still said the ask *"reuses the single-chip
      `.list-toggle` look"* (the exact thing [ADR 0083] deliberately stopped
      doing — a permission must not read as a filter you can flip off), an
      `index.html` comment inside the retired Sort By block still pointed at it,
      and — the real one — **`docs/ARCHITECTURE.md`, the compact current-truth
      document, still described the whole location flow in terms of a button
      that no longer exists.** Every clause of that paragraph was false.
      🔑 **The gates cannot help here and it is worth being precise about why:**
      `linkscan` reads links, `pathscan` reads paths, `plainscan` reads prose
      style. **Nothing reads a CSS selector or an element id mentioned inside a
      comment**, so a comment naming a deleted element is invisible to every
      enforced check while sitting directly beside the code it misdescribes —
      which is where the next reader will trust it most. So the sweep is
      `grep` for every `#id` and `.class` named in a comment or a doc, not only
      those named in an assertion.
      ⚑ **Related but distinct, so do not merge them:** the CI item above is
      about which checks *run*; this is about whether a check that runs still
      *refers to anything*. A check can pass both and still be worthless.

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

✅ **RULED 2026-08-17 — 22b and 22c are ONE piece of work, not a sequence.**
The owner was offered all three shapes (22c first · 22b first · both together)
and took **both together**: the Favourites screen is designed *against* the new
personal-data model in a single pass. This **supersedes the paragraph above** —
"22c first, or at least alongside" was written here and never ratified, and the
ruling picks the "alongside" half of it and makes it binding.
🔑 **What the ruling buys, and what it costs.** It buys zero rework: no control
gets placed under today's model and moved under tomorrow's, which is the exact
waste the paragraph above was worried about. It costs **shipping latency** —
22c is `[L]`, so the Favourites screen goes on stranding people for the whole
duration rather than getting a cheap early fix. The owner was told that plainly
and chose it anyway, so **do not "helpfully" ship a 22b patch first**: a partial
fix is the one outcome the ruling rejects.
🚩 **Consequence for whoever takes it:** this is now a single `[L]` item, not an
`[M]` plus an `[L]`, and it does not fit a short session. Claim it as one unit
or leave it. 22a is untouched by the ruling and remains independent.

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

- ✅ **23a and 23c — DELIVERED 2026-08-16.** The version stamps and the
  "an update is ready" state moved out of About into Settings → **Refresh &
  reset**, beside the *Refresh now* button that acts on them — one outcome
  ("am I up to date, and if not, fix it") on one screen instead of two. About is
  now the lede plus *Private by design* and *Works offline*, and fits one screen
  at 390 px. Opening hours went entirely: `app.js`'s `timezoneNote()` and
  `menu.js`'s "Hours · NZ time" both state the clock rule, and both state it only
  when the viewer's clock differs — About told everyone, always, about a
  situation most readers are not in.
  🔑 **23a's delete case for Prices was only 29% true, and deleting it as written
  would have destroyed a fact.** The roadmap said the ⓘ beside a menu's prices
  already names the currency. It does — **in the blue tone only.** Applying
  `refreshCaveat`'s own rules to the corpus, **39 of 55 venues sit in the amber
  tone**, whose text never mentions currency. So for most of the corpus About was
  the *sole* statement of it. The rehoming was done by closing the amber gap
  first and only then deleting About's copy, so the fact is now stated in more
  places than before, not fewer. **A duplication claim is a measurement, not a
  reading** — this one was checked against the corpus and came back the other way.
  🎯 **[ADR 0037] §3 now needs superseding.** It decided currency is *"stated
  twice, in the two places it is asked about — the per-venue ⓘ, and the About
  dialog."* The build implements *stated once, where it is asked*.
  `docs/ARCHITECTURE.md` is amended; the ADR is not, because an accepted record
  is superseded and never edited. **Owner call, recorded in `SESSIONS.md`.**
  🚩 A once-at-boot read would have been wrong: About built its dialog lazily and
  asked the service worker when the reader asked, while Settings is built at
  boot — on a first visit no worker controls the page yet, so the panel would
  have said *"not yet serving this page"* for the whole session. An `onOpen`
  hook fixes it and `boot_check` fails without it.
  🚩 Pre-existing and NOT introduced here: closing About restores focus to
  `<body>` rather than the opener, because the overflow menu that opened it has
  already closed. Worth its own item.
  `boot_check.mjs` now asserts About's group list **by name**, so the sediment
  this theme is about cannot re-form silently. Original framing below.

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

- [ ] 💡 **30g — a delivery price is a SERVICE FEE, not a second price**
      `[M][schema][design]` — **owner-raised 2026-08-16, and he said "I would
      consider", not "build it".** Raised in the same breath as the 30d ruling,
      about the case that ruling deliberately excluded:
      > *"your Pizza hut example of delivered vs in-store is an interesting one
      > that I would consider adding to Faves, its essentially a dish(es) with a
      > service fee/alternate price to pay for that service and I would consider
      > including that in Faves. It may require choosing dine-in vs takeaway
      > (pickup) vs delivery?"*
      🔑 **This is a better framing than the one [ADR 0085](decisions/0085-a-delivery-price-fills-a-hole-it-is-not-a-feature.md)
      rejected, and it is not the same idea.** 0085 refused *"one dish shown at
      two prices"* because that productises a data gap. A **service fee** is a
      different claim: the dish is the same, the price differs because you are
      buying a *service* alongside it, and the reader chooses the service. That
      is honest, it is what the shop actually charges, and it does not ask the
      reader to compare two numbers for the same thing.
      🛑 **But NOTHING IN THE CORPUS EXERCISES IT — measured, not assumed.**
      Swept all 55 records for a dish priced twice by channel: **12 rows, 2
      venues.** `pizza-pomodoro`'s 2 are withdrawn (30d's ruling). `pizza-hut`'s
      10 are *"…Delivered"* rows, and the pairing test returns **ZERO true pairs**
      — every one is a delivery-only bundle with no in-store twin, so not one of
      them is the same dish at two prices. ⇒ **The idea has no instance.** By the
      owner's own 30a logic — *don't ship a schema nothing exercises* — this gets
      recorded and waits for a venue that genuinely prices one dish differently
      for dine-in, pickup and delivery.
      🎯 **What it needs when a venue arrives, so the design starts from the right
      question:** is it a **fee on the order** (one charge, whole basket — which
      is what a delivery fee usually is, and belongs with 30f `charges[]`), or a
      **per-dish price** (which is the `channel` axis 0085 declined)? Pizza Hut's
      own data suggests the first: its delivered rows are *bundles priced whole*,
      not dishes with a surcharge. **Answer that before writing any field** — the
      two shapes are not variants of each other, and 0085 already shows how
      easily a collection gap is mistaken for a modelling one.
      ⚠️ Also note this reaches the naming ruling: `order-mode` is now the settled
      word for the shipped venue filter, and *"dine-in vs takeaway (pickup) vs
      delivery"* is that same axis at dish level. Do not open a fourth word.

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
- ✅ **30d IS CLOSED AS A SCHEMA ITEM — owner ruled 2026-08-16,
  [ADR 0085](decisions/0085-a-delivery-price-fills-a-hole-it-is-not-a-feature.md).**
  He was given four options and answered none of them, restating the goal
  instead: *"Our goal is to show only in-store pricing, but if we don't have any
  other data to hand then we will at least show the app store pricing until an
  in-store menu can be collected. I do not want Faves to show both the in-store
  and in-app pricing as a feature, it's a way to fill a hole in the data not a
  feature."*
  ⇒ **One price per dish. Delivery is a captioned fallback, never a second
  price shown beside the first. `channel` is NOT admitted to `site/data/`.**
  🔑 **The inference that had to be retracted, worth keeping:** the evidence was
  sound and the conclusion drawn from it was wrong — **a duplicated row is a
  data-collection gap wearing the clothes of a modelling gap**, and an industry
  consensus is evidence about what a POS must model, not about what this app
  should show. ADR 0085 supersedes the channel half of ADR 0080 on that point.
  ⏳ **What survives is a CONTENT task, not a schema one:** collect in-store
  prices where only app prices are held. Two open pieces, both needing the
  owner because content is owner-directed — (1) `pizza-pomodoro` currently shows
  **both** an in-store $29.00 and an Online Deal $17.00 for one pizza, which the
  ruling forbids; the in-store price is the one to keep and the deal rows belong
  in `data/`. (2) `pizza-hut`'s five *"…Delivered"* rows are **NOT** the same
  case and must not be swept up with them — a delivery-only bundle is one
  product, not one dish at two prices.
  ✅ **KK Malaysian and KC Cafe are now correct rather than incomplete** — they
  hold a delivery-sourced price because no in-store reading exists, which is
  exactly the ruling, and since 2026-08-16 they say so (`verifiedBy:
  delivery-app`). Their fix is an in-store menu, at which point the fallback is
  replaced and the caveat retires itself.
- ⚠️ **CORRECTION, same session, 2026-08-16 (wt: faves-schema30). The block
  immediately below said the channel dimension is exercised by nothing. That is
  WRONG and it is corrected here rather than rewritten away.** It was arrived at
  by looking only at the record store, which is where the owner's greenlight
  pointed. Re-testing a *different* stale premise — Theme 28's *"there are no
  discounts in the corpus at all"*, measured at 48 records and now 55 — turned
  this up on the way past:
  🔑 **`pizza-pomodoro` sells the same pizza at two prices, right now, in the
  payload.** `Margherita - Large` is **$29.00**; `Large Margherita (Online Deal)`
  is **$17.00**, desc *"Large size only. Online ordering special price."* Same
  for Marinara. **A 41% spread on identical ingredients, in the same section of
  the same file**, distinguished only by a parenthetical in the dish NAME and a
  sentence of prose — which is precisely the pattern ADR 0057 spent a whole
  theme pulling out of section headings. `pizza-hut` has the same disease in a
  second form: five `Meal Deals` rows whose names end *"Delivered"*.
  So the honest statement is: **the channel dimension IS live, and it is live in
  `site/data/`, not in `data/`.** That is a different dilemma from the one below,
  not the absence of one — and it is sharper, because ADR 0047 says the payload
  ships only what it renders, and no screen renders a channel today. The two
  rows are also a Theme 25 case: `large-margherita-online-deal` and
  `margherita-large` are two `dishId`s for one dish in two channels.
  🚩 **And Theme 28's "no discounts" claim needs re-reading, not deleting.** On
  its own stated word list it is still true — no "% off", no "happy hour", no
  "senior". In substance it is not: `satay-kingdom-cafe` prints *"(Save $2.50)"*
  on two combo rows, and the Online Deal rows above are a channel discount by
  another name. The Gold Card rows remain correctly analysed as portions, not
  discounts. **A word-list measurement expires when the corpus grows; the
  finding was sound and its scope was not restated when 7 venues landed.**
- 🛑 **The part of the finding below that STANDS.** Checked 2026-08-16
  (wt: faves-schema30). The owner greenlit *"`channel` on a price record in
  `data/`"*. Three facts say that *specific* placement would ship a field
  nothing exercises — the correction above moves the need into the payload, it
  does not create one in the record store:
  - **Only 2 venues have any price history at all** — `takeaway-at-churton`
    (174 rows) and `thai-tara-express` (38 rows). Every one of those 212 entries
    is a paper menu or a 2019 scan. **None is delivery-sourced.**
  - **KK Malaysian and KC Cafe — the two venues this item exists for — have no
    price-history rows whatsoever.** The live debt is in their *current* price,
    not in the record store.
  - **`delivery-app` already exists as a `verifiedBy` value** (ADR 0031),
    already renders the "untrusted" caveat — *"These prices came from a delivery
    app, not the place itself"* — and is already precached. **It is used by zero
    venues.**
  🔎 **The real defect is one level down and needs no new field.** KK Malaysian
  and KC Cafe carry `verified: null` and no `verifiedBy` — no derivation at all
  — while `docs/STRATEGY.md` records in prose that their prices are
  Delivereasy's and marked up. **27 of 55 venues have no verification reading**,
  so the caveat machinery ADR 0037 built cannot fire for half the corpus. Two
  venues today show marked-up delivery prices with no caveat, using a field that
  already exists and already renders.
  🎯 **Owner's call, and it is a real fork** — (a) build `channel` in `data/` as
  greenlit, on the understanding that it lands on 212 rows that are all the same
  value and does nothing for KK/KC; (b) spend the same effort setting
  `verifiedBy: delivery-app` on the venues whose prices came from one, which is
  visible to readers immediately; or (c) both, in that order. Recommendation:
  **(b)**. Note (b) needs a `verified` date and `reading()` returns null without
  one — the git add-date (2026-07-06 for both) is defensible *record time*, but
  provenance on menu content is owner-directed, so it is asked rather than
  assumed.
  ⚠️ **Naming clash to settle before either:** this item spells it `dine_in`,
  the repo's house style everywhere else is kebab (`SERVICES = {"dine-in",
  "takeaway"}`, and every `verifiedBy` method). There is also already a venue
  filter facet called `service` and `docs/decisions/0071-…` already uses the word
  "channel" for notification channels. Three meanings, one word.
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

⚠️ **The sizing below is amended by measurement, 2026-08-16 (wt: faves-schema30).
The ADR discharging the owner's "write it now" ruling is drafted and committed.**
Its finding: this theme holds **two halves in opposite evidential states**, and
the roadmap puts them in one bucket. `menus[]` and the other *containers* are
exercised by nothing — the hold is right for them. **The pricing primitive is
exercised by 152 dish rows in 13 venues today**, all carrying a second price
inside a `desc` string, across at least six distinct context axes. So the reason
to hold 30a does not reach the pricing work, which belongs to Theme 28b and can
proceed on its own evidence.
Two further corrections to this theme's own table: **per-person pricing is
recorded above as "Not yet" and is in fact here** (`rock-yard-restaurant`, 8
rows, *"Min 2 people, $16/head"*); and a **seventh axis nobody named** — 19 rows
in 7 venues price a *dietary substitution* (`No gluten added bun +$2.50`,
`+$0.50 for oat milk`). 17 of the 19 already carry `gf-option`, which
`dietary.js` treats as satisfying the gluten-free claim, so the dish shows
correctly for a reader who needs it — only the option's **price** has nowhere to
live. Not a safety defect; an accuracy one, aimed at readers with no choice
about paying it.

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
- ✅ **31d — accessibility wording — DONE 2026-08-16** (`cfc9309`). Every
  off-site link the menu screen renders now carries a visually-hidden
  " (opens in a new window)" — the literal WCAG G201 wording, naming only the
  guaranteed behaviour. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

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

🔎 **Three mechanisms checked in the code 2026-08-16 (wt: faves-schema30), which
turn two of this theme's recommendations from preferences into positions.**

1. **The query is safe to share, and I expected it not to be.** The obvious
   objection to `?panel=diet` is that the filter sync owns the query string and
   would stamp on it. It does not: `app.js:325` builds from
   `new URLSearchParams(location.search)` and only ever `set`s or `delete`s
   `area` and `cuisine`, then re-appends `location.hash`. **An unknown param
   survives a filter change untouched.** So the recommendation costs nothing to
   adopt — verified rather than assumed.
2. **But it survives too well, and that decides call 2 below.** Nothing ever
   removes it, so a reader who opens a deep link to Settings → Food preferences,
   closes Settings, then filters by cuisine, still carries `?panel=diet` — and
   on reload Settings springs open again with no idea why. **That is the
   mechanism behind "resolve on arrival, don't track", and the repo already has
   the pattern:** `cart-ui.js:586` consumes a share token and immediately does
   `history.replaceState(null, "", location.pathname + location.search)` to
   strip it. The resolver must strip its own param the same way.
3. 🔑 **The hash-crowding hazard has already bitten this repo once, and the fix
   it chose supports the recommendation.** `report-ui.js:67`'s `pageUrl()`
   deliberately drops the fragment when building a report link, and says why:
   *"On the home screen the hash may be carrying a shared order or shortlist
   token — someone else's picks have no business riding along in a report."*
   A fourth tenant in that namespace is not hypothetical risk; it is the same
   accident, and last time it was solved by getting **out** of the hash.

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
  ✅ **Re-sized 2026-08-16 (wt: faves-schema30): the hard half is already built
  and shipped.** `site/js/share-core.js` is a complete two-transport share — the
  OS sheet via `navigator.share` with a clipboard fallback, a `canShare` probe,
  and a three-way outcome (`shared` / `unavailable` / failed) so a blocked
  clipboard is distinguishable from a declined sheet. It already carries the two
  constraints that make this fiddly: `navigator.share` **needs a user gesture**,
  so the payload must be composed synchronously before it is reached
  (`report-ui.js:250` is the worked example), and it does not exist on most
  desktops. Four callers already use it — report, share, share-app, sync.
  So 34e is **wiring an existing module to a new payload**, not building a share
  path. It stays `[S]`, and it stops being the item the theme's viability rests
  on. What is left is genuinely design: where the "copy a link to this" control
  lives on a Settings panel without cluttering it.

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
  ⚠️ **The "name the number" half was AMENDED by the owner the same day
  (2026-08-16, later), on evidence that it could not be met.** *"Everywhere,
  always"* is untouched and still governs. Building the merge established that
  an E2E blob **cannot count devices**: every device shares one bearer code, the
  server holds one opaque ciphertext, and asking the Worker to log arrivals is
  the tracking ADR 0017 refuses. A roster inside the blob is the only possible
  home, and a device that syncs once and is never opened again never leaves it —
  so any number is an **upper bound, not a count**, and a confidently wrong
  number on a destructive confirmation is worse than none (ADR 0060's last
  consequence). Put to him with three options; he chose **drop the number, name
  the scope**: the confirmation says it erases the data on *every device signed
  in with this sync code*, with no count. **Always true, never a wrong number.**
  So the gate on Theme 9 is now that *this* wording exists, not a device tally —
  and the roster the tally would have needed is no longer required at all.
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
   link-out when offline;** ~~dish ratings curated~~ — see Theme 5.
   ⚠️ **"dish ratings curated" is SUPERSEDED (owner, 2026-08-16):** *"It was
   never supposed to be curated ratings."* The live aggregate from Google/Yelp —
   the first half of this same line — is what he asked for. Personal ratings are
   shipped and **done**, and the control is settled (*"keep the current rating
   stars"*), which cancels the attempt-3 redesign in Theme 2.
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

### 🔎 Reported as a bug, checked, and it is not one — but a real question sits inside it `[S][design]`

A peer session measured in headless Chrome that **sorting by distance puts Cook
at Home first despite it having no coordinates**, and reported it as a live
`kind` bug on the render path. The measurement is right; the diagnosis is not.
Checked against the source and the record before acting on it:

- `ranking.js:153` — `pinned: r.kind === "recipes" ? 0 : 1`, commented *"Cook at
  Home always anchors the top"*, and `pinned` is the **first** sort key, ahead
  of `stub`, `far`, availability and distance alike.
- `ROADMAP-DONE.md` — *"Home ranking pass, done 2026-07-12 — added two sort
  keys ahead of the existing ones: `pinned` (the Cook-at-Home recipes collection
  always anchors the top)"*. **Deliberate, shipped, and documented.**
- `ranking.js:79` `availabilityTier` returns 0 for recipes with the reason
  stated: *"always an option"*. Also deliberate.

🎯 **The real question, which the 2026-07-12 pass may simply not have faced:**
the pin was added ahead of *every* key, including distance — but "Near me /
nearest first" is a question the reader asked **explicitly**, and answering it
with a coordinate-less collection at the top answers a different one. Cooking
genuinely is always available, so the pin is right in the default view; whether
it should survive an explicit *distance* sort is a design call nobody has taken.
The capability refactor makes it expressible ("has a location" → false) rather
than deciding it. ⚑ Owner's call; nothing is being changed on a peer's report.

🔑 **Worth keeping as method:** a peer's measurement and a peer's *diagnosis*
are different goods. The measurement was reproducible and valuable; the
diagnosis reversed a deliberate decision, and two greps (the source comment, the
done-record) separated them. Verify a report before you build on it — the same
lesson [ADR 0017]'s merge rule taught this repo from the other direction.

✅ **`area: "Home"` — SETTLED, owner ruling 2026-08-16: it stays.** The item
asked to null it per ADR 0003 *or* keep it and **name the screen that reads it**.
The screen was found by measuring rather than reasoning: the **global search
result** for Cook at Home renders `Home · Home cooking` — `search.js` copies
`r.area` onto each place entry and `app.js` joins `[p.area, cuisine]` into the
result row's subtitle. Nulling it would have made that row read "Home cooking".
Everything else that touches `area` is inert for this record (`cardArea()` is
overwritten by "Cook at home"; the facet is never selectable; `areaCentroids`
and `picker.js` skip recipes).
🔑 **Worth keeping: ADR 0003 permitted `null` on the assumption that nothing
rendered the field, and that assumption had quietly stopped being true.** A
permission granted by an old ADR is not evidence about today's code — check what
actually reads a field before acting on a record's licence to drop it. Same
family as *"an ADR is a design, not evidence"*. (`currency` likewise stays —
owner ruling above.)

🎯 **Recommend 1** — ✅ **DELIVERED** (claim released 2026-08-17: `wt:
faves-kind-capabilities` no longer exists and the refactor is on `main`).
Verified at code level, not by the file existing: `site/js/kinds.js` exports the
capability API (`kindOf`, `labelsOf`, `kindIds`, `isRecipeKind`) and is imported
by **all seven** surviving modules named below — `app.js`, `menu.js`,
`filters.js`, `ranking.js`, `search.js`, `price.js`, `picker.js`. `route.js` is
absent because 37f removed "Along a route" whole, so the eighth was deleted
rather than skipped. `site/data/restaurants/cook-at-home.json` carries
`kind: "recipes"`, and `tests/kinds.test.js` covers it.
🔑 **The measure that actually proves it: `isRecipes` is gone.** The item existed
because ~20 scattered `isRecipes` branches were the ADR's relaxation expressed as
conditionals. There is now **not one** in executable code — the single remaining
occurrence anywhere under `site/js/` is a comment in `menu.js` explaining that
the boolean was a second copy of a fact the record already stated.
And note it does not contradict [ADR 0003] — it *implements*
it. The ADR said venue-only fields relax for recipes; twenty `isRecipes`
branches are that relaxation expressed as scattered conditionals instead of as a
declared property of the `kind`. Option 1 turns the ADR's prose into something
the code can read. Do it before any further recipe UX, or the next fix lands on
the same sand.

[ADR 0003]: decisions/0003-recipes-as-kind-not-separate-type.md

### 36a — what the data says about time, and what it doesn't `[S][data]` 🎯

> 🎯 **Owner ruling 2026-08-16, relayed from a peer session:** *estimate the
> per-step and total times, and label them as estimates.* Same ruling for 36c.
> This **reverses** the position the rest of this item argues for, and it is his
> call to make. ✅ **The derivation is DONE 2026-08-16** — `data/estimates/`
> (the repo-only research store), all 24 recipes and 118 steps, every number
> carrying its **working**, guarded by `tools/recipe_estimates.py --check`
> and recorded as [ADR 0064]. It landed in the record first, not the payload,
> so the numbers are auditable before any of them reach a phone.
> 🎯 **A safety line was raised here and the owner OVERRULED it the same day —
> [ADR 0066] supersedes [ADR 0064]'s decision 2.** This build first held that an
> *estimated* duration must never drive a **timer**, on the grounds that an
> invented "simmer 20 min" on chicken is a food-safety failure rather than a
> disappointing dinner. That argument, and a middle option splitting on `phase`
> rather than on source, were both put to him. His ruling, verbatim:
> *"Estimates drive timers too, clearly marked — every step gets a countdown;
> estimated ones are labelled as estimates on the timer face."*
> So **`timerSafe` is retired, not inverted** — under the ruling every duration
> is timer-eligible, making the flag `true` everywhere and therefore
> information-free. `source` (`stated`/`estimated`) is what the timer face
> reads. **The gate was replaced, not dropped:** a step carrying `minutes` with
> **no `source`** now exits 1, because that is a countdown with no way to know
> whether to mark it. Proved by deleting a `source`: `🛑 SAFETY: … has minutes 5
> but source None … its countdown would run with no way to mark it an estimate`.
> ⚑ **"Clearly marked" means on the timer face itself** — `12:00 (estimate)` as
> real text, not a colour and not the step text alone. A countdown that looks
> identical whether the number was read or guessed is not marked.
> 🔑 **Worth keeping as method, not as grievance:** raising the concern *before*
> building to it was right, and so was complying the moment it was ruled. What
> made the reversal cheap was landing in `data/` rather than `site/` — no phone
> ever held the retired rule.
>
> 🔎 **The corpus is better than this item said: 32 steps state their time,
> not 28.** The extra four state it in *words* — "cook the garlic for a
> minute" (×3) and "marinate for at least an hour". 28 is the **digits-only**
> count, which is exactly what `cook.js`'s regex can see. Calling those four
> "estimates" would have mislabelled the data to match a tool's limitation.
>
> ✅ **Both ANSWERED by the owner, 2026-08-16 — and the weak-estimate question
> with them:**
> - **`serves` vs yield → SHOW BOTH, LABELLED** (e.g. *"Makes 12 waffles ·
>   serves 4"*). The record already keeps them apart, so this is a render job,
>   not a data one. `[S][ux]` and now unblocked.
> - **The nine weak estimates → SHIP AS THEY ARE.** He declined to supply his
>   own numbers, and the reasoning holds: every one is labelled an estimate and
>   carries its **working** in prose, so nothing is presented as fact. Do NOT
>   re-open this by asking him per recipe. The weak ones stay weaker, visibly.
> - **The five bake-only `time` values remain open** — see the question below.
>
> 🚩 **Two findings that need an owner call, neither resolved here:**
> - **`serves` and yield are conflated in the payload today.** Liège Waffles'
>   `serves: 12` is 12 *waffles*; the puddings' `serves: 6` is 6 *people*;
>   "makes 21" is 21 queen cakes. The record now keeps `yield` separately
>   rather than silently picking one — which the app shows is his call.
> - **Five stated `time` values are bake-only** (Orange Yoghurt Cake, Queen
>   Cakes, Chocolate Self-Saucing, B's Brownie, Chewy Cookies) and exclude
>   6–15 min of prep, yet the app renders `time` as if it were the total.

[ADR 0064]: decisions/0064-an-estimate-carries-its-working-and-never-a-timer.md
[ADR 0066]: decisions/0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md

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

### 36d — the timer's alarm ✅ SHIPPED 2026-08-16

> ✅ **BUILT AND MERGED 2026-08-16 (wt: faves-cook, merge `42b1a7a`)** — all
> three channels, exactly as ruled. Recorded as **ADR 0071**. `site/js/alarm.js`
> is new; `cook-ui.js` arms the audio context and raises the ask inside the
> start tap; `sw.js` answers `notificationclick`. 25 unit tests, 15 new
> `cook_check` assertions, **`cook_check` OK — 75 passed**.
> 🔎 **Three of the new assertions were proved by breaking them** — inverting
> the 15-minute guard failed exactly the two notification assertions, dropping
> the vibrate call failed exactly the five vibration ones and left the tone
> green. 🛑 **And one new assertion was found to be decorative and replaced:**
> the ring-once guard could not bite, because the tick that rings the last timer
> also stops the interval — so deleting the guard failed nothing. Replaced with
> a two-timer scenario. *An assertion nobody has watched fail is not yet a
> guard*, and this one was written in the same session that was hunting
> decorative guards elsewhere.
> ⚠️ **Three things a green run does not show, and the ADR says so:** no real
> speaker was heard, no real motor was felt, and iOS ignores `navigator.vibrate`
> entirely — so on the owner's own phone this feature is tone plus notification,
> never a buzz. He was told and chose it anyway.
> 🎯 **Three left for the owner** — see the questions at the end of this block.

**Ruling as given, for the record.** It lives in
`cook.js`/`cook-ui.js`/a new `alarm.js`/`sw.js`.

⚠️ **This claim originally asserted file-disjointness from the live peers, and
that sentence was false within the hour.** It read *"none of which 37c/d/e/j/l/m
(wt: faves-recipe), 37g (wt: faves-ranking) or 37n (wt: faves-allergens)
touch."* Then 37l's own ADR landed and pulled **`cook-ui.js`** into its
blast radius — one statement at ~line 116, where the ingredient array becomes a
call to a new `ingredients.js`. Corrected in place rather than quietly, because
a claim that states disjointness is precisely what the next session trusts
*instead of* re-checking. 🔑 **Disjointness is a measurement with a timestamp,
not a property of a claim** — the roadmap already says one level up that 36a and
37l are *"different roadmap items and the same edit"*, and this claim made the
same mistake about itself while citing it. Two sessions each holding a correct
map of their own files still had a collision neither could see; what found it
was a third session noticing they had both answered the same broadcast.
**Settled with faves-recipe:** `cook.js` is faves-cook's entirely; `cook-ui.js`
is faves-cook's outright *except* that one statement and its import, which
faves-recipe lands first so this session rebases onto a settled file.

Owner ruled the shape in full, going further than the recommendation:

- **A tone on every timer.** Generated in code (Web Audio `OscillatorNode`) —
  no asset, no precache entry, no network, and no permission. The tap that
  starts the timer is the gesture that unlocks the `AudioContext`, so autoplay
  policy is satisfied without asking for anything.
- **Vibration on every timer.** `navigator.vibrate`, also permission-free.
  ⚠️ **iOS Safari ignores it entirely**, so this half does nothing on the
  owner's own phone — an Android-only benefit. He was told and chose it anyway;
  recorded so it is not later read as an oversight.
- **A notification as well, for timers over 15 minutes.** This is the posture
  change: it needs `Notification.requestPermission()` — the **first permission
  prompt Faves has ever shown** — plus a service-worker path. Accepted
  knowingly.
  🚩 **Ask at the moment a long timer starts, never at page load.** A cold
  prompt on arrival is what trains people to refuse. And degrade silently: no
  permission means no notification, with tone and vibration still firing.

Write the ADR when built — first permission prompt, first audio, first
vibration, three firsts in one feature.
⚠️ **"First permission prompt" was not written into ADR 0071, deliberately.**
ADR 0069 (the location ask, wt: faves-ranking) claims the same superlative, and
the two were built **concurrently in different worktrees on the same day**.
🔑 **A superlative is a claim about every other change, including ones being
written in parallel that the author cannot see** — it is unverifiable from
inside the repo and it decays without anyone touching the file it sits in. 0071
says the two were concurrent and that merge order settles nothing worth
asserting. Peer sessions carried this into ADR 0072 as a face of the same
family.

**🎯 Three questions put to the owner — ✅ ALL THREE ANSWERED 2026-08-16:**
1. ✅ **A notification fires even when you are looking at the page — RULED: LEAVE
   IT, duration only.** The condition stays *over fifteen minutes* and nothing
   else. He took the redundant-notification cost knowingly, over an offered
   "only if the tab is hidden" alternative. 🔑 **His reasoning generalises and is
   worth keeping**: a rule with one condition is predictable; a second condition
   buys quiet and costs predictability, and "hidden" is a poor proxy anyway — a
   phone locking mid-bake counts as hidden. **Nothing to build.** ADR 0071's
   rejected-options list already records the alternative; it is now rejected by
   the owner rather than by the agent's restraint.
2. ✅ **No visible cue at all — RULED: BUILD IT, and style the blocked line
   too.** `[S][css]` **OPEN AND UNCLAIMED — the next session should take this.**
   Two parts, one small CSS pass in `app.css`:
   - a **finished timer's card visibly changes** (the timer face reaching zero
     must be legible without sound), and
   - the notifications-blocked line gets **its own styling** instead of borrowing
     `.cook-awake` via the `.cook-notify-blocked` hook already in the markup.
   🚩 **Why this is the highest-value of the three, in his own case:** iOS Safari
   ignores `navigator.vibrate` entirely, so on the owner's own phone the alarm is
   tone plus notification. **A silenced phone with notifications denied currently
   gives no alarm at all** — and a silenced phone in a kitchen is the likely
   case, not the edge case. Verify at 390 px and extend `cook_check.mjs`.
3. ✅ **`cook.notifyBlocked` has no te reo string — RULED: to the reo queue.**
   Add it to `docs/reo-review-queue.md` as a `// draft` string in `reo.js`; it
   falls back to English safely until then, so nothing is broken meanwhile.

⚠️ **Vibration is NOT gated on `prefers-reduced-motion`, and that was a
judgement call worth challenging.** `settings.js` has no quiet/haptics
precedent, and the preference is usually set for vestibular reasons — silencing
the buzz could leave a reader who cannot hear the tone with no perceivable
alarm at all. Recorded as a rejection in 0071 rather than taken silently.

### 36a/36c — estimates DO drive timers ✅ RULED 2026-08-16

⏳ **NOT taken 2026-08-16 13:59 UTC, and the reason is worth keeping.** The
faves-cook session wanted this and left it. Getting the estimated minutes into
the payload rewrites `steps` inside
`site/data/restaurants/cook-at-home.json` — the *same records*, adjacent keys,
that the live 37l build is rewriting `ingredients` in, and it lands the same
[ADR 0067] tick-rehash trap **twice, from two sessions, in one file**. A merge
conflict is the good outcome there; the bad one is a clean textual merge that
detaches every tick. 🔑 **File-disjointness is the real unit of parallel
safety, not item-disjointness** — 36a and 37l are different roadmap items and
the same edit. Take this once faves-recipe lands, in a session that can hash
component and step together in one pass.

Put to him because two sessions had independently built the cautious version:
estimates as text, only stated times driving countdowns, on the reasoning that
an estimated "simmer 20 min" on chicken is a food-safety failure rather than a
disappointing dinner. **He ruled the other way**, with that argument in front of
him and a middle option (split on risk, not on source) also offered.

**Every step with a duration gets a countdown; an estimated one is marked as an
estimate ON THE TIMER FACE**, not merely in the step text — a countdown that
looks identical whether the number was read or guessed is not "clearly marked".
So `timerSafe` is not a function of `stated` vs `estimated`.
✅ **Done 2026-08-16, and the gate was RETIRED rather than inverted** —
[ADR 0066]. Under the ruling every duration is timer-eligible, so a boolean
asking "may this drive a timer?" is `true` everywhere and carries nothing;
`source` is what the timer face reads. The replacement invariant is that a step
with `minutes` and **no `source`** exits 1. 🚩 **One trap for whoever builds the
render:** `stepDuration()` in `cook.js` re-parses the recipe *sentence* rather
than reading a stored number, so the per-step minutes must actually reach the
payload — otherwise the estimated steps stay silently untimed while every check
stays green.

### 36g — four rulings on the cook-mode checklist (owner, 2026-08-16)

The checklist and read-aloud shipped under [ADR 0067]. Four follow-ups were put
to the owner at close and answered:

- ✅ **The twelve-hour tick expiry stays.** It was the building agent's own
  number, declared as such; he ratified it. Nothing to do.
- ✅ **Read-aloud keeps the phone's default voice at `en-NZ` — no picker.**
  Consistent with the same day's ruling that Settings stays a drill-in rather
  than growing. Nothing to do.
- ✅ **Bake-only `time` values → show the estimated TOTAL instead.** Orange
  Yoghurt Cake, Queen Cakes, Chocolate Self-Saucing, B's Brownie and Chewy
  Cookies each state a bake time that excludes 6–15 min of prep, and the app
  renders it as if it were the total. `data/estimates/` already holds a full
  estimated total for each. `[S][ux]`, unblocked — and it lands with the
  serves/yield render above, since both change the same recipe meta line.
> ✅ **Shipped 2026-08-16 — 36g — ticks must leave the backup export**, on the
> owner's ruling *"if it isn't restored, it shouldn't be exported."* Claim
> released 2026-08-17 (`wt: faves-cook` gone) and the item's self-contradicting
> header — "Ruled, not yet built" above its own "✅ BUILT" — corrected with it.
> ADR 0074. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).


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
✅ **RULED 2026-08-16: park `costToMake`.** `currency` stays as the placeholder
it is. ⚑ discharged — the grocery-source question is not live until he unparks
this.

### Sizing

36a and 36c are small in code and blocked on the owner. 36b is the big one and
is mostly data entry — and it is the prerequisite for the full 36f, so doing it
once buys both. 36f's staged version is `[S]` and independent of all of it. The
structural call above (1/2/3) should be taken before 36e, because 36e is a
symptom of it.

---

## Theme 37 — cook mode and the recipe page, as the owner reads them (owner-raised 2026-08-16)

Five defects and asks, given live during the 2026-08-16 session while looking at
`recipe.html?id=cook-at-home&dish=chocolate-self-saucing-pudding` on a wide
screen and in cook mode. All five are **presentation**, not model: the timer,
the checklist and the recipe data are all sound underneath. ✅ **All five are
SHIPPED** — 37a, 37b and 37c/37d/37e each carry their own ✅ line below (claim
released 2026-08-17: `wt: faves-tidy` no longer exists).
⚠️ **Later items in this theme are a different matter and are NOT covered by
that release** — 37k is **shipped 2026-08-16** (claim released; build complete,
only the owner's tagging owed), and 37n is open.
The released claim only ever covered the owner's original five.

> ✅ **Shipped 2026-08-16** — 37a — the Clear ticks button goes. Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16** — 37b — the timer's whole presentation is wrong. Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16 — 37c, 37d and 37e**, with 37l and 37m below: the
> recipe-page pass, done together because all five move the same rows. The
> ingredient list folds and remembers, splits into two columns where two fit,
> and a recipe carries its source as a field. [ADR 0070] holds the schema.
> Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

> ✅ **Shipped 2026-08-16** — 37f — "Along a route" is removed whole. Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-17** — 37g — the SORT BY section goes, and distance joins
> the one ranking. Built to [ADR 0068], its item 4 superseded by [ADR 0069] (the
> location ask is primed, not sprung). Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

> ✅ **Shipped 2026-08-16** — 37h — remove "Transfer to another device". Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-16** — 37i — Sync lives inside "Your data". Detail →
> [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
> ✅ **Shipped 2026-08-17** — 37j — "Everywhere" → "Any service", and the te reo
> re-glossed with it. Landed inside 37g. Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

> ✅ **37k's BLOCKING 🚩 IS CLEARED 2026-08-16 — and nothing else is.** Recorded
> as **ADR 0077**. The owner's ruling was *check Theme 30's `service` axis
> first, enter no data until it's settled*. **Settled: style is NOT that axis.**
> They sit at different levels — Theme 30's `service` is metadata about a
> *vocabulary term* ("`Cafe` is a format word"), style is data about a *venue* —
> and it **cannot reach 33 of 55 venues**, which carry no service-axis cuisine
> value at all. On his own poles, "silver service" is *formality* and "quick
> eats" is *speed*; the axis captures **format**, which equals neither:
> `Gastropub`, the corpus's most-used cuisine value at 10 venues, implies
> neither. ⇒ **Theme 30 proceeds unblocked; 37k does not wait on it.**
> 🛑 **A NAMING DEFECT IN SHIPPED CODE, found by three sessions converging from
> three directions in one day, and it does not depend on 37k proceeding.**
> `filters.js` already ships `service: 'all'|'takeaway'|'dine-in'` (55/55
> venues, a `<select>` on the home screen). Theme 30's `channel`
> (`dine_in`/`takeaway`/`delivery`) is a **price-and-tax** axis — a third
> meaning of the same words. Whatever Theme 30's axis is called, it cannot be
> `service`. 🎯 Worth the owner's eye whether or not style is ever built.
> 🎯 **TWO OWNER QUESTIONS, both open, and 37k must not move until they close:**
> **(a) His own relayed ruling contradicts the item.** `SESSIONS.md` (`041a6ff`)
> carries a one-line relay — *"dining style folds into `vibe`"* — no primary
> quote, no record of what he was asked. 37k is titled a *filter* and says
> `vibe`'s free text "is neither [filterable nor comparable]". **Folding style
> into a free-text field yields no filter.** A session picking one quietly would
> be resolving his ruling for him.
> **(b) The measurement that predicts this feature never gets populated.**
> Every other filter derives from checkable evidence — `services` from what the
> venue states, `openNow` from hours, cheapness from menu medians. "Fine
> dining" is a judgement no menu photo verifies. The app's ONE curated
> venue-level judgement field is `priceBand`: **present on 10 of 55, non-null
> on 8**. A filter over 8 of 55 hides places for no stated reason.
> 🔎 **The corpus already makes the case for a vocabulary, without anyone
> arguing it.** Of 38 `vibe` taggings: 9 values are style (14 taggings), 11 are
> orthogonal amenities a style vocabulary must never swallow (21 taggings —
> `dog friendly`, `byo`, `quiz night`), 3 duplicate a `cuisine`. **Five strings
> already say one thing** — `quick` · `quick-eats` · `quick-lunch` ·
> `grab-and-go` · `counter-order`, across six venues — and no filter can
> aggregate them. `vibe` has no vocabulary check in `validate.py`; `priceBand`
> does.
> 🚩 **A prerequisite nobody had noticed: `vibe` is precached to every phone and
> NO SCREEN RENDERS IT.** `grep -rn "vibe" site/js site/*.html site/css` → zero
> hits, while ARCHITECTURE.md describes it as "free-form chips shown on cards".
> The design shipped; the render never did. So 37k proposes a filter on a field
> that fails ADR 0047's "name the screen that renders it" gate **today**.
> Inherited, not introduced (`vibe` predates ADR 0047), and it is 1,050 bytes of
> 1,087,040 — a principle problem, not a performance one.
> ⚠️ **And a fourth filter re-opens a constraint 15z paid to close:** the old
> segmented service control cost "256 px of a 928 px row — the single largest
> reason the inline row could not be one row". `filter_row_check.mjs` is the
> guard that would fail.

> 🎯 **FOUR OWNER RULINGS, 2026-08-16 23:08 UTC — 37k IS BUILT, and it is bigger
> than the item as written.** He was shown the case for parking it (the
> `priceBand` 8-of-55 measurement, the filter-row width cost, the
> unfalsifiability of a judgement field) and ruled the other way, in full
> knowledge of it. ⚑ **discharged.**
> 1. **BUILD IT FULLY. He supplies the values.** Not a vocabulary-only stub, not
>    "tag nothing yet" — the vocabulary, the filter control and the tagging pass.
>    🔑 This retires the 8-of-55 objection by removing its premise: the field is
>    not waiting on curation-in-general, it is waiting on **him**, which is the
>    same footing as menu content (*"whatever food/dishes I give you are to be
>    included"*).
> 2. **It lives INSIDE `vibe` — and VALIDATE ALL OF `vibe`, not just a style
>    subset.** This is a bigger ruling than the question asked and it is the
>    better answer. `vibe` has had **no vocabulary check at all** while
>    `priceBand` has had one; the corpus proved the cost by growing five strings
>    for one idea (`quick` · `quick-eats` · `quick-lunch` · `grab-and-go` ·
>    `counter-order`). Closing only the style subset would have left the other 21
>    taggings free to drift the same way. ⇒ **`vibe` becomes a closed vocabulary
>    with FACETS** — each value declares its facet (`style` | `amenity` | …); the
>    filter reads the `style` facet, the chips render all of them.
>    🚩 **The workflow consequence, stated so nobody is surprised:** a new vibe
>    value must be added to the vocabulary before it can be used, and
>    `validate.py` will refuse it otherwise. That is the point, and it is also
>    friction — the same friction `priceBand` already has.
> 3. **RENDER THE `vibe` CHIPS ON CARDS, as `ARCHITECTURE.md:138` always said.**
>    This closes an inherited ADR 0047 breach: `vibe` has been precached to every
>    phone since the original schema with **zero** references in `site/`. The
>    design shipped and the render never did — a **built-vs-never-runs** case,
>    not an abandoned field, which is why deleting it would have been the wrong
>    cheap answer. 38 taggings across 20 venues start earning their download.
> 4. **The amenity values are KEPT.** `dog friendly`, `byo`, `garden bar`,
>    `live sport`, `quiz night`, `Wellington icon` — 21 taggings no other field
>    holds. They are not swallowed into the style vocabulary; they get their own
>    facet.
> ⚠️ **Known consequence he accepted by choosing to render:** the five
> inconsistent "quick" strings become **visible on a card on day one**, so
> normalising the corpus is part of this work and not a follow-up.
> ⚠️ **ADR 0077 is NOT superseded** — its finding (style is not Theme 30's
> `service` axis, and `service` already means three things) stands unchanged.
> What these rulings close are the two questions 0077 explicitly left open.

> 🕳️ **Orphan stash, VERIFIED REDUNDANT 2026-08-17 — nobody needs to look at it
> again.** `stash@{0}` "WIP on faves-content-growth" (2026-08-16 23:31) survived
> an interrupted session whose worktree no longer exists, and was flagged to two
> sessions during the day without either taking it. Checked rather than left
> ambiguous: it holds `priceBand`/`pricePerPerson` for `burgerfuel` and
> `hell-pizza`, and **`main` already carries identical values** (`$$`/16 and
> `$$`/24) plus a superseded `sw.js` bump. **No work is lost in it.** Left in
> place rather than dropped — deleting another session's stash is not this
> session's call — but recorded so the next reader spends nothing on it.

> ✅ **37k BUILT AND SHIPPED 2026-08-16** (wt: faves-cook2, `9aa6071`…`62546b4`).
> Recorded as **ADR 0084**. `site/js/vibes.js` is new — 17 keys in three facets.
> **The build is done; only the TAGGING is owed, and it is his.**
> 🔑 **The vocabulary is stated ONCE and `tools/validate.py` READS that file**
> rather than holding a Python copy — two copies would drift silently. The parse
> **dies loudly on zero keys**: a regex that quietly matched nothing would make
> the gate pass every value, which is ADR 0072 exactly.
> 🔎 **Measured, not guessed — the chip cap is TWO.** Swept in a real browser
> over all 55 cards at 390 px: one chip wraps 5 cards (+3% list height), **two
> wraps 29 and never makes a third line**, three wraps **all 55** for **+26%**.
> Three is the cliff.
> ✅ **The fourth select FITS** — `filter_row_check` 25/25, narrowest select
> **134 px against a 104 px floor**. It fits *because* the row has since lost the
> Sort-by group (ADR 0068) **and** 256 px of segmented control (15z), so 15z's
> warning was true when written and is no longer binding. Worth knowing before
> anyone else declines a control on it.
> 🔎 **One design reading changed by evidence.** The filter matches **any** style
> value a venue carries, not the first in vocabulary order: `regal-chinese` is
> both `sit-down` and `banquet`, and picking one made "Banquet" render on the
> card while being **absent from the dropdown** — a dead end you could see but
> not select.
> 🚩 **TWO GUARDS WERE BROKEN BY THIS MIGRATION AND FIXED WITH IT** — both found
> by going to look, neither by any gate: `test_validate.py`'s sandbox did not
> copy `vibes.js`, so its baseline failed outright; and `drinks_gap.py`'s
> `DEFINITE_VIBE = {"craft beer", …}` **silently matched nothing** after the
> rename and lost 7 worklist hits without failing or warning. The second is the
> DEGRADED face recorded at the head of this file.
> ⚠️ `test_validate.py` is now **110 mutations** — CLAUDE.md said 93, then 99,
> then 104 within one hour as three sessions added to it. Read the tool's output,
> never the doc.
> 🎯 **STILL OWED AND HIS ALONE: the tagging.** 20 of 55 venues carry any `vibe`;
> **35 carry none**. Under CLAUDE.md's standing rule those are filled only as he
> supplies them — **never inferred** from a menu, a photo or a website's tone.
> ADR 0077's argument that a style value is unfalsifiable from what we hold is
> **not refuted** by this build; it is answered by making him the source.
> 📌 Also queued: the two te reo drafts (`filter.style` → *"Tāera kai"*) are in
> `reo-review-queue.md` and want a speaker — *tāera* may read as style-of-FOOD,
> which would name the cuisine filter sitting beside it.

- [ ] **37k — a "style of dining" filter** — ⚠️ **CLAIM RELEASED 2026-08-16
      23:32 UTC. Build complete; what remains is OWNER DATA ENTRY, not open
      work.** Former claim (wt: faves-cook2, branch `style-37k`). **RE-CLAIMED
      2026-08-16 23:08 UTC (wt: faves-cook2, branch `style-37k`)** on the four
      rulings above. Files: `site/data/restaurants/*.json` (vibe values only),
      `tools/validate.py`, `site/js/filters.js`, `site/js/app.js`,
      `site/index.html`, `site/js/reo.js`, `site/css/app.css`.
      🚩 **Overlaps everyone**: the venue files and `app.js` are wide surfaces.
      Shout before touching a venue file's `vibe` array or the home-card chip
      render. Superseded claim note below.
- [ ] **37k — SUPERSEDED CLAIM NOTE** ⚑ — 🛑 **CLAIM
      RELEASED 2026-08-16 22:59 UTC. The blocking 🚩 is CLEARED (ADR 0077,
      block above) and the item is now OWNER-BLOCKED on two questions — do NOT
      treat it as open work.** Entering data against an unratified vocabulary
      is the one thing the item says not to do. Former claim
      (wt: faves-cook2). It took only the 🚩 *decision*
      below — is this Theme 30's `service` axis under another name? — because
      the item says itself that deciding it is the whole job and that no data
      may be entered until it is settled. No data entry in this claim. owner
      idea, 2026-08-16: *"Another useful filter might be style of dining/food
      e.g. silver service vs quick eats."* Genuinely useful and genuinely
      under-specified, so it is recorded as an idea rather than a spec.
      🤔 **What has to be decided first:** this is a *third* axis over the same
      corpus, and the app already has `priceBand` (money), `cuisine` (food) and
      `vibe` (free-text atmosphere tags like "craft beer", "dog friendly").
      **Is style a new field, or is it `vibe` grown up?** A controlled
      vocabulary — say *quick eats · casual · relaxed · special occasion* — is
      filterable and comparable; `vibe`'s free text is neither. Deciding that
      before any data is entered is the whole job, because 55 records tagged
      against a vocabulary nobody ratified is 55 records to redo.
      🚩 **And it overlaps Theme 30's cuisine-axis work** (giving each `cuisine`
      value an `origin`/`dish_form`/`service` axis), which is already designed.
      Check whether "style" is simply that proposal's `service` axis under
      another name before opening a second front.

> ✅ **Shipped 2026-08-16 — 37l and 37m**, with 37c/37d/37e above.
> 🔑 **37l's stated trap did not happen, and the reason generalises.** Splitting
> `"Sauce: 150g brown sugar"` into a field was expected to detach every tick on
> the four affected recipes. It did not — because the question is *correctness*,
> not compatibility: **Sticky Date Pudding lists "60g butter" in the pudding and
> again in the sauce**, so the text alone is not an identity and the component
> belongs in the key. Keying on `"<component>: <text>"` is then byte-identical to
> what the corpus already held — 0 mismatches across all 24 recipes. **Ask what
> the identity IS and the migration question often stops existing.**
> 🔎 **37d was a *consider* and the answer was yes, with three guards** —
> `column-width` not `column-count`, `:has(li:nth-child(6))` so a short list is
> never split, and `break-inside: avoid`. Proven at 390/1100 px and 16/24/32 px
> text by the new `tools/recipe_check.mjs` (22 assertions, each verified by
> reintroducing its own bug). Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).

### 37n's owner rulings — taken 2026-08-16, all four, before the sweep runs

✅ **`contains-fish`, `vg-option` and `df-option` are ALL ADOPTED.** The two
option tags were ruled in a parallel session, alongside the fish tag and for the
same sweep, so taking them together is nearly free. 🚩 **`vgo` is NOT
`v-option`** — vegan-optional and vegetarian-optional are different claims, and
mapping one to the other misrepresents the venue. Data already found and
currently discarded at intake: **Gong Cha** (free soy/oat swap on 15 drinks),
**Rock Yard** ("Vegan Optional" on Vermicelli Noodles and Roti Rolls, "DF
optional" on Sizzling Shaking Beef), **The Victoria Tavern** (its own `vgo` and
`dfo` markers on 8+ dishes).

✅ **`contains-fish` is ADOPTED.** The vocabulary gains it. Three agents in a peer
session hit the gap independently: fish sauce runs through a dozen Rock Yard
dishes, that venue prints its own badge as literally "Fish", and anchovy is on
two Pizza Pomodoro pizzas — all untagged, because inventing a vocabulary entry
was not an agent's call. The set is closed in **three** places that must move
together (`docs/ARCHITECTURE.md`'s tag vocabulary, `tools/validate.py`'s `TAGS`,
`site/js/settings.js`'s `ALLERGEN_PREFS`), plus a settings-screen row, plus the
corpus sweep. 🛑 **Land it WITH the 37n sweep, not beside it** — the sweep is the
pass that would apply it, and doing them separately means walking 55 venues
twice.

✅ **The trace tier: keep the app's tags as they are, and extend the DATA MODEL to
carry both.** Owner ruling, consistent with one he had already given in a
parallel session. Pizza Hut's first-party allergen document grades `P` (present)
against `T` (*"stored or used to manufacture other items at the site"*), and `T`
is near-universal across its pizza line for nuts, peanuts, sesame and shellfish —
so collapsing the two tiers would fire four warnings on every pizza, which is a
warning carrying no information. **What ships is unchanged: only `P` becomes a
`contains-*` tag.** What changes is that the record can now hold the distinction
instead of discarding it. ✅ **AND HE RULED WHERE IT LIVES —
`site/data/`, not the record store.** A peer session recommended the repo-only
`data/` on ADR 0047's payload rule, and **he overruled the premise**: *"In ruling
47 I said it only holds data the screen shows, **or may with future features**.
This is an example of a likely future feature for Faves."* So the trace tier
ships in the payload.
🔎 **He is right about his own ADR, and the strict reading was still
reasonable — which is the interesting part.** ADR 0047's *Context* carries the
clause verbatim: *"data the app will never render — now or in a future feature —
must not be in the app's dataset"*. But its **Consequences** state the operative
rule narrowly (*"the payload can only grow by adding something a screen shows"*)
and `CLAUDE.md` restates it narrower still (*"Before adding a field to a venue
file, name the screen that renders it"*). **Two of the three places a builder
actually looks state the rule without the future clause**, which is why two
sessions independently read it strictly today.
🎯 **So this wants a superseding note on 0047 and an amendment to CLAUDE.md's
restatement.** The accepted text and the owner's intent agree; the two summaries
of it do not. Left for the owner rather than fixed here — 0047 is accepted, and
an accepted record is superseded, never edited.

✅ **`crumbed → contains-egg` SPLITS into two classes.** 30 of 42 disagreed, the
largest block in the report, and the disagreement is real rather than sloppy: a
house kitchen egg-washes its schnitzel, a commercial frozen nugget or crumbed
fish fillet often does not. Two honest classes beat one that is wrong 71% of the
time. `crumbed → contains-gluten` is untouched and holds at 39 of 45.

⏳ **Still owed, and cheap** — the three the report itself raised: the tier a
note-derived tag carries (kept as the firing rule's own, so "sesame bun" lands
STATED); whether *"dairy free cheese available"* should tag or only report
(currently reports); and whether add-on options belong in the report at all
(currently yes, and it found one real gap).

- [~] 🚩 **37n — the corpus disagrees with itself about allergens** `[M][data]`
      — **TOOLING DELIVERED 2026-08-16, THE DATA SWEEP IS NOT.** The report the
      item asked for exists: `tools/allergen_disagreements.py` groups dishes into
      ten declared classes across all 55 venues and names every row whose tagging
      disagrees with its class. It currently reports **7 class/allergen splits
      over 58 rows**. Read-only by design — it reports and never writes, because
      every class is right about the *typical* food and can be wrong about one
      kitchen. **The sweep itself is the open work**, and it is a human pass over
      those 58 rows against [ADR 0025], not a tool run.
      🔑 **`tools/tag_allergens.py`'s silent decline was worse than recorded, and
      measurement — not reasoning — found it.** The first diagnosis said 6 of 55
      files, all caused by add-on options inflating the positional `tags` count.
      A peer measured the corpus and found a **seventh with no add-ons at all**,
      breaking the count the other way: six of its 87 items carry no `tags` key.
      **And the two tags the tool identified and failed to write were both on
      items with no `tags` key** — an item with no tags array is simultaneously
      the most likely to be missing a tag and the thing that makes the whole file
      unpatchable. The decline is not spread across the corpus; it concentrates
      on exactly the records the tool exists to protect. Both causes are fixed
      (structure-aware patching, section notes read and sorted into
      tag/report/ignore), `--apply` now exits **non-zero** when it could not
      write, and `tools/test_tag_allergens.py` pins all of it by putting each bug
      back. This is face 4 of [ADR 0072].
      🎯 **Four calls for the owner before the sweep runs** — see the questions
      recorded with this session in `SESSIONS.md`: the tier a note-derived tag
      carries; whether *"dairy free cheese available"* should tag or only report;
      whether `crumbed → contains-egg` (30 of 42 disagree) is a real class or a
      bad one; and whether add-on options belong in the report at all.
      🚩 **Two live rule defects found and deliberately not fixed**, because a
      rules change touches every venue and belongs with the sweep: `\bmuffins?\b`
      cannot match "McMuffin" (no word boundary between "c" and "M"), so both
      McDonald's McMuffins can never be found; and the "wheat bakery item" rule
      fires on `slices`, which tagged *"Black Fungus Slices"* as gluten — a
      fail-safe tag for a wrong reason, and an EXCLUDE candidate.

## What the owner wants moved next (asked and answered 2026-08-16) — ✅ BOTH DONE

Given more queued than one session holds, he picked **two**. Both have since
landed, so **this section is a closed record, not a worklist** — a reader
arriving cold would otherwise take these as the next two jobs.

1. ✅ **The ranking rebuild — [ADR 0068], item 37g. SHIPPED 2026-08-17**, its
   item 4 superseded by [ADR 0069] (the location ask is primed, not sprung).
   Detail → [`ROADMAP-DONE.md`](ROADMAP-DONE.md).
2. ✅ **The venue menus — DONE 2026-08-17**, and the brief's own "remaining 14"
   was already stale when it was written. All **18** authorised venues are
   resolved: 14 transcribed, 4 proven to publish no menu. Detail → the fetch
   item under Theme 4. The Sprig + Fern pilot's recipe held up across all of
   them, including that the allergen pass is irreducibly human.

🎯 **Nothing here is owed but three owner decisions the fetch left behind** —
the unpriced-row rule, Pizza Hut's branch pricing, and Little Sprig Seatoun's
contested date. They sit under Theme 4 as their own item.

Not chosen then, and **also since shipped**: the timer's alarm (36d,
2026-08-16) and the recipe-page pass (37c/37d/37e/37l/37m, 2026-08-16). Every
job this section names is closed. What is genuinely next is decided from the
theme list above, not from here.
