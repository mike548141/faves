# Menu-page Settings — allergen-reactivity safety review

**Date (UTC):** 2026-07-23 11:27
**Reviewer:** AI (Claude, adversarial review agent), working in worktree
`faves-queue-1053` during the orchestrated queue run.
**Scope reviewed:** commit `399604e` (Settings reachable on the menu page + live
allergen/dietary re-apply) and its blast radius — `site/js/dietary.js`,
`site/js/menu.js` (full), `site/js/settings.js`, `site/js/settings-ui.js`,
`site/js/profiles.js`, `site/js/favourites.js`, `site/js/recipe.js`,
`site/restaurant.html`, compared against the home screen (`site/js/app.js`).

## Why this got an adversarial pass

Settings changes the household's **allergen/dietary** preferences. On the menu
page those drive the ⚠ `dish-flagged` warning and the dietary dim. A **stale or
missing allergen highlight is a safety failure**, not a cosmetic bug (real
household allergies). Exposing Settings on the menu page — long deliberately
withheld for exactly this reason — is only safe if the menu reacts correctly and
atomically. So the diff was reviewed by an independent agent tasked to **break
it**, before it was allowed to reach `main` (a push deploys).

## Findings

### 🔎 Defect 1 — SEVERE (regression) — profile switch during page load baked in the wrong profile's allergen prefs

`initChrome()` runs synchronously at boot and makes the Settings dialog + profile
switcher interactive *before* `loadRestaurant(id)` resolves. The store-reload
subscribers (which re-read the newly-active profile's `settings`/`favourites`/
`ratings` from storage) lived in `wireLiveSafety(r)`, registered only *after* the
fetch and the first `render(r)`. In-memory caches only refresh on an explicit
`.reload()`.

**Failure:** Person A (avoids peanuts) has a menu on "Loading…"; hands the phone
to Person B, who switches profile (already clickable). Nothing reloads the stores
yet, so the first `render(r)` uses A's `avoid` set — a peanut dish flagged/
unflagged per **A, not B** — while the header already reads "Browsing as B". No
catch-up reconciliation, so the mismatch persists until the next settings change.
The home screen never had this gap: it wires the reload atomically with
`initSettingsUI()` after data loads; the menu page broke that symmetry.

### 🔎 Defect 2 — moderate (pre-existing) — recipe page ignored cross-tab allergen changes

`recipe.js` read allergen prefs once at render and its storage listener only
watched the profile key, so a cross-tab allergen/dietary change never recomputed
a recipe's ⚠ tags. Predates this commit, but "recipe detail" was in scope and the
gap is more reachable now that Settings is one tap from the menu.

### 🔎 Defect 3 — minor — full re-render resets in-session dietary chips / search / scroll

`reapply` re-runs the whole `render(r)` on *any* settings change, discarding the
session-only dietary-chip toggle (and search query + scroll). Convenience, not the
safety-critical ⚠ warning. **Left as an accepted trade-off** (see ROADMAP / owner
question at close) — deliberately not fixed to avoid a hand-rolled partial-update
path diverging from the shared render.

### ✅ Checked and found clean

- **Predicate equivalence** — the extracted `dishFlagged` / `dishSatisfiesDiet`
  (`dietary.js`) are byte-for-byte equivalent to the original inline logic:
  empty-set handling, AND-across-diet-filters, `v-option`/`gf-option` inclusion,
  and the "no tag = not stated" framing all match. Unit-tested.
- **No stale closure** in `render(r)` — `avoid`/`activeDiet` are rebuilt fresh
  from `settings.get()` at the top of every render.
- **`settings.subscribe` fires on allergen changes** — `settings.set()` always
  commits and notifies unconditionally.
- **Picks block** renders no tags → no staleness surface.

## Resolution

Fixed in **`152fedf`** (build agent, same worktree):

- **Defect 1 closed.** New injectable `reloadProfileStores({favourites, ratings,
  settings})` in `profiles.js` with **`settings.reload()` contractually LAST**
  (its subscription is what repaints, so favourites/ratings must be re-pointed
  first). Subscribers moved **early** into `initChrome()` — same synchronous pass
  as `initSettingsUI()`: `settings.subscribe(reapply)` +
  `profiles.subscribe(() => reloadProfileStores(...))`. A module-level `current`
  holds the loaded restaurant; `reapply()` no-ops until `current` is set
  (`current = r` before the first `render(r)`). `wireLiveSafety` removed (no
  double-render). Reload-before-render holds in both orderings:
  switch-before-first-render → caches already refreshed → first paint correct;
  switch-after-render → reload then single re-render. **A unit test
  (`tests/profiles.test.js`) pins the reload ordering** — the exact invariant the
  race violated.
- **Defect 2 closed.** `recipe.js` now `settings.subscribe(reRender)` and its
  storage listener handles the scoped settings key too, recomputing ⚠ tags.
- **Defect 3** — left as an accepted trade-off.

**Verify at fix:** `node --test` 301 pass (0 fail), `validate.py` 28 valid,
`check_no_deps` + `gen_sbom --check` green.

## 🚩 Still owed — real-browser confirmation

The wiring is proven by unit test + reasoning; the DOM behaviour is **not**
browser-verified. In a **fresh browser / fresh `--user-data-dir`** (the service
worker hides changes otherwise — a known repo gotcha), a human must confirm:

1. **Race fix:** with a menu on "Loading…", switch profile → first paint shows
   the **new** person's allergen highlights, not stale.
2. Change an allergen pref on a rendered menu → warnings update live; switch
   profile after render → re-applies (safety + hearts/ratings).
3. **Recipe:** open a recipe in one tab, change an allergen pref in another →
   the recipe's ⚠ tags update without reload.
