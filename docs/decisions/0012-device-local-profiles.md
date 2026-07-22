# 0012 — Device-local profiles (per-person hearts on a shared phone)

**Status:** accepted
**Date:** 2026-07-22

## Context

Several people share one phone and each wants their own hearts (owner steer,
2026-07-08; ROADMAP Theme 5, "Multiple people's favourites"). The honest split
recorded there: *on one device*, profiles are a cheap win; *across devices*,
the same person's data syncing needs an account + backend, which breaks the
no-accounts / no-backend non-goals and belongs to a separate signed-in app
(Theme 6). This ADR covers only the device-local half.

The personal layer already exists: `store.js`'s `safeStorage()` under three
localStorage keys — `faves.favourites.v1` (hearts), `faves.settings.v1`
(dietary/allergen prefs + ranking dials + reo language), `faves.order.v1` (the
order tally). Plus `faves.origin.v1` (Near-me location) in *sessionStorage*.

## Decision

A **profile** is a first name + an id. A device-level registry
`faves.profiles.v1` holds `{ v, activeId, profiles: [{id, name}] }`. Per-profile
stores keep their existing KEY constant but read through a **profile-scoped
storage wrapper** that rewrites the key to `faves.p.<activeId>.<base>`
(`scopeKey`). Switching profile + calling each store's `reload()` re-points the
whole personal layer — no consumer rewrite. `profiles.js` is the DOM-free,
unit-tested model; `settings-ui.js` owns the "who's using Faves?" switcher.

**Per-profile vs shared — scoped by whole store, not by field:**

| Data | Scope | Why |
|---|---|---|
| Favourites (`faves.favourites.v1`) | **per-profile** | Hearts are the whole point — clearly per-person. |
| Settings (`faves.settings.v1`) — dietary + allergen prefs | **per-profile** | Allergies differ per person; the safety framing ("no tag = not stated") is load-bearing. Wrong-person's filter is a safety risk, so this *must* be per-person. |
| Settings — ranking dials (`favBoostKm`, `farKm`) | **per-profile** | They tune the per-person favourites pull; ride along in the same store. |
| Settings — reo language (`lang`) | **per-profile** | A consequence of scoping by whole store (see Rejected). Defensible — each person reads their own tongue — and flagged for the owner to revisit. |
| Order tally (`faves.order.v1`) | **shared / device** | One order for the table; splitting it per-person would fragment a single shared shout. |
| Near-me origin (`faves.origin.v1`) | **shared / device** | Ephemeral device location (sessionStorage); not identity. |
| Theme (light/dark) | **device / OS** | Follows `prefers-color-scheme`; never stored, so nothing to scope. |

**Migration.** On first load of the new code with no registry, `migrate()`
creates a default profile (deterministic id `"default"`, name "Me") and **copies**
the old un-namespaced keys into its scoped keys. Copy, not move: a briefly-cached
old asset still reads the un-namespaced key, so leaving it keeps that stale tab
working until it refreshes. Idempotent (no-op once a registry exists;
copy-only-when-target-empty guards a partial/concurrent run). Deterministic
default id means two tabs migrating at once converge instead of minting rivals.

**Safety re-apply.** The menu/recipe screens read diet prefs once at render and
have no switcher (you switch on home, then navigate — a fresh read). The only
stale case is a cross-tab switch while a menu is open: those pages listen for a
registry change and `location.reload()` if the *active* profile changed, so
nobody browses under someone else's allergen filter. In the Settings dialog the
diet chips re-sync live on switch.

## Rejected

- **Cross-device sync / accounts.** Breaks the no-accounts / no-backend
  non-goals; belongs to the separate signed-in app (Theme 6). Explicitly out of
  scope.
- **Scope by field (lang + dials device-level, only diet per-profile).** The
  ideal split on paper, but it shatters one store (`faves.settings.v1`) across
  two scopes — a separate device-level key for `lang`, migration to split it out,
  and two write paths in one store. That is exactly where namespacing/migration
  bugs breed, and this is safety code. Scoping by whole store is far simpler and
  more robust; the cost is per-profile `lang`, which is mild and arguably nicer.
  Recorded as a revisit-if-it-bites call.
- **Rewrite every consumer to take a profile id.** Rejected for the storage-seam
  wrapper — the wrapper localises the change to the singleton construction lines.

## Consequences

- New per-profile store ⇒ add its base key to `SCOPED_BASE_KEYS` (one list drives
  both migration-copy and delete-purge).
- Deleting a profile purges its scoped keys and confirms first (destructive); the
  last profile can never be deleted.
- Old un-namespaced keys are left behind after migration (orphaned, tiny). A
  future cleanup could remove them once no old assets can still be cached.
- Language now varies per profile; if the owner wants it device-level, that's a
  follow-up (split `lang` into a device key) — superseding ADR, not an edit here.
