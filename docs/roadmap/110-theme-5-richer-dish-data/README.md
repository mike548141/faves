# Theme 5 — Richer dish data

✅ **Shipped 2026-07-08 → 09** — price-per-person + cheap-eats filter (`price.js`,
curated `priceBand` override), dish order-codes, the extended allergen
**vocabulary** (populating stays an `intake/` content task — no tag = not stated),
device-local dietary/allergen preferences with load-bearing safety framing, and
hearted favourites (`favourites.js` + shared `store.js`). Popular/busy times ruled
out (no official API). Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **Allergen tag sweep — done 2026-08-08 ([ADR 0024](../../decisions/0024-derived-allergen-tags.md)),
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
([ADR 0025](../../decisions/0025-infer-allergens-by-default.md), superseding 0024).**
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
      [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md). ⚠️ One residue stays open under
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
