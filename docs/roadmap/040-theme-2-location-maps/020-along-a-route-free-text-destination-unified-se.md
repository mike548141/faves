- [ ] **"Along a route" → free-text destination + unified search bar**
  `[L][constraint][owner-ratified 2026-07-23]` — owner: the suburb/place
  **dropdown** (ADR 0014) is too limiting; wants to **type any address/area**,
  and to **fold it into the restaurants-page search bar** (type a dish/restaurant
  → results; type a place → "on the way to there"). Free text → coordinates needs
  a **geocoder = an external request**, which relaxes the offline/zero-dependency
  invariant (ADR 0001) — the exact wall ADR 0014 cited. **Owner has ratified
  crossing it** for destination entry (online-only; rest of site stays offline).
  Chosen: **Nominatim/OSM** (no key, attribution + usage-policy compliance),
  behind graceful offline degradation. 🎯 ~~**Owner GO 2026-07-24 — build it as a
  dedicated next session**~~ ⚠️ **[GO UNEVIDENCED — see §A below, 2026-09-09]**
  (not folded into a queue run; it's a new external
  **trust surface**). That session's build order: (1) write the ADR — relax the
  offline/zero-dep invariant *for destination entry only* + confirm Nominatim/OSM
  as provider (attribution + usage-policy); (2) add the **CSP `connect-src`**
  allowance (and confirm the SW/offline degradation path); (3) the geocode module
  (debounced, cached, graceful-offline); (4) search-bar intent detection (dish/
  venue vs place); (5) ~~re-wire `route.js` off the ADR-0014 dropdown~~
  🛑 **[STEP 5 NAMES A FILE THAT NO LONGER EXISTS — see §C below]**. The ADR is
  written and confirmed *before* any network code lands — trust surface = the
  informed-confirmation floor still applies to wiring the actual request.

---

## 🛑 THREE THINGS THIS ITEM ASSERTS THAT ARE NOT TRUE — checked 2026-09-09

**This item is NOT closed by this note and the feature is NOT declared dead.**
What follows corrects the item's *factual* claims only. The question of whether
the remaining scope survives is raised at §D and is the owner's alone.

### §A — "Owner GO 2026-07-24" has no supporting record, and the record that
exists says the opposite

- 🔎 The string **"Owner GO" appears nowhere in this repo but this item**
  (`grep -rn "Owner GO" docs/`).
- 🔎 **There is no 2026-07-24 session entry in `docs/SESSIONS.md` at all** — the
  log runs from several 2026-07-23 sessions straight to 2026-07-28. The only two
  occurrences of the date are *references* to rulings on unrelated subjects: the
  **Theme 8 pre-public gate** (`SESSIONS.md:782`) and a **device-check /
  allergen re-highlight** ruling being closed (`SESSIONS.md:1801`). Neither is
  about a geocoder, a route, or a search bar.
- 🛑 **And the last 2026-07-23 session closes by listing this very question as
  still owed.** `SESSIONS.md:773`, under **⏳ Owner-owed (surfaced at close)**:
  > free-text geocoder go/no-go (trust surface, its own ADR)

  So on the evening before the claimed GO, the go/no-go was **outstanding**.
  Nothing between there and 2026-07-28 records it being given.
- ✅ **What IS corroborated, and should not be lost with it:** the *ratification*
  in the item's header tag (`owner-ratified 2026-07-23`).
  `SESSIONS.md:618-621` records it plainly — **"Deferred (owner-ratified, next
  session): 'along a route' → free-text destination via an online geocoder
  (Nominatim) folded into the search bar — relaxes the offline invariant, so it
  needs its own ADR + a CSP connect-src allowance (new trust surface)."**
- 🔑 **The distinction is the whole of §A.** He ratified the *direction* on
  2026-07-23 and the record then says a **go/no-go was still owed**. This item
  turned that into an unqualified **GO** dated the following day. A ratified
  direction is not an authorisation to open an external trust surface — and
  opening one is on this repo's *always stop and confirm* floor.

### §B — the feature this item descends from was removed whole by the owner

[ADR 0014](../../decisions/0014-pick-along-a-route.md) — the dropdown this item
proposes to replace — now reads **`Status: superseded by`
[ADR 0068](../../decisions/0068-the-home-list-ranks-on-one-blend.md)**, and
records that *"the feature this record designed was **removed whole on
2026-08-16**, by the owner, unbuilt-replacement."* His words, quoted there:

> *"I would not say that Khandallah Trading Company is on the route from my
> current location in Churton Park to Courtenay Place."*

⚠️ **Read what he removed precisely: ROUTE RANKING.** ADR 0014's own diagnosis
is that a suburb-centroid approximation *"returns confident answers that are
wrong"*. That is an objection to the **ranking**, not to typing a destination
and not to one search bar.

### §C — step 5 names a deleted file

`site/js/route.js` **does not exist**. It was deleted by commit
[`1ba396d`](https://github.com/mike548141/faves/commit/1ba396d), *"home: remove
the Along a route sort whole"*, on **2026-08-17**. A session following this build
order literally would reach step 5 and find nothing to re-wire.

### §D — 🎯 SO THE REAL OWNER QUESTION IS NOW A DIFFERENT ONE, AND IT IS OPEN

This item is **broader than the feature that was removed**. Route *ranking* is
gone by his ruling. Two pieces of the original scope are untouched by that
ruling and neither has been built:

1. **A free-text destination** — typing any address or area instead of picking
   from a dropdown.
2. **A unified search bar** — one field that takes a dish, a venue **or** a
   place.

🎯 **Whether either is still wanted now that route ranking is gone is HIS CALL,
and this pass does not make it.** The honest position is that the item's parent
was removed and its stated authorisation does not exist, so **nobody should
build any of this on the strength of what this item currently says** — and
equally, nobody should close it, because he never ruled on this scope. Note that
1 and 2 are separable: the search bar needs **no geocoder and no trust surface**
if it only ever matches dishes and venues, and could be asked about on its own.
🛑 **Before any of it is built, the trust-surface confirmation is owed fresh.**
Whatever was or was not agreed in 2026-07, an external geocoder is a new trust
surface and this repo's floor requires an informed confirmation *before* the
act, not after.

🛑 **The bracket stays `- [ ]`:** nothing is built, and an unanswered owner
question is work owed, not work finished.
