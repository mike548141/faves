# 0020 — Favourite & rating reference integrity: honest stale-vs-removed handling

**Status**: proposed — design recorded for coordination with ADR 0017 (sync) and
ROADMAP Theme 10 (cross-person sharing); **build deferred** until that design is
agreed, so the merge/refresh UX is settled once, together.
**Date**: 2026-07-23

## Context

Favourites (and personal ratings) are **device-local**, stored **denormalised**
— each entry carries its own copy of the venue/dish name — and keyed by identity
(`v:<venueId>` / `d:<venueId> <name>`), see `favourites.js` / `ratings.js`. The
Favourites view renders straight from that stored copy and **never cross-checks
against the loaded restaurant list** (`app.js` render). `loadRestaurant(id)`
simply `fetch`es `data/restaurants/<id>.json` and throws on a non-200, which the
menu screen turns into a **generic error page**.

Owner raised two failure modes (2026-07-23) that must be handled gracefully and
**the user informed**:

1. **Genuinely removed** — you favourite a dish/venue, then it's deleted from the
   data mastered in the web app. The stored favourite now dangles.
2. **Stale local data** — you add a favourite for a *new* restaurant; another
   device (or a person you shared with) opens the app before its service-worker
   cache has refreshed, so its `index.json` / that `<id>.json` doesn't know the
   place yet — even though the place is perfectly valid.

**Today both look identical and neither is handled:** the favourite still shows
(denormalised), and tapping it either lands on a menu with the dish silently
absent, or 404s to a generic error — with no explanation and no distinction.

## The governing subtlety (honesty floor)

A client **cannot distinguish "removed" from "my data is stale"** from local
knowledge — both are just "id not in my data." So the honesty floor **forbids
stating "this was deleted"** from local knowledge alone: to a shared recipient
whose cache simply hasn't caught up, that would be a lie. The only truthful
resolution is a **fresh online re-fetch**: reappears → it was stale (fix
silently); still absent after a live check → *now* it can be called removed.
Offline → say "can't check right now," never guess.

## Decision (the invariants; specifics finalised with ADR 0017 / Theme 10)

1. **Never silently drop** an unresolved favourite/rating. It stays visible in
   the Favourites view but **marked** (e.g. dimmed + "Not on your current list"),
   with a **Refresh** action and a per-item **Remove**. Silent removal is data
   loss and leaves the user uninformed — the exact opposite of the requirement.
2. **Never claim "removed" locally.** Copy is honest about the two possibilities
   until an online recheck resolves it: *"This may have been removed, or your
   list may be out of date."*
3. **Resolution flow:** detect unresolved (venueId absent from the loaded index,
   or a dish absent from its venue's menu) → offer **Refresh** = a **cache-bust
   re-fetch** of `index.json` + files (needs service-worker cooperation to bypass
   the cache) → re-resolve. Reappears ⇒ stale, resolved silently. Still absent
   **after a successful online fetch** ⇒ genuinely removed ⇒ inform + offer to
   remove it.
4. **Menu page 404 → an honest screen**, not the dead generic error: the
   two-possibility message + **[Refresh] [Back]**.
5. **Share/merge accepts unknown refs.** A received favourite for a venue the
   recipient's data doesn't know is **flagged + prompts a refresh**, never
   rejected — the recipient is likely just stale (case 2). Rejecting it would
   silently drop a valid favourite.

Ratings inherit the same treatment (identical keying); wherever a rating's dish
is unresolved, the same "stale vs removed" rules apply.

## Rejected

- **Silently hide unresolved items.** Data loss, and the user is never informed —
  directly against the owner's "handled gracefully **and the user informed**."
- **Claim "deleted" from local state.** Dishonest under a stale cache; could lie
  to a shared recipient. The whole reason for the online-recheck step.
- **Normalise storage (re-resolve favourites against live data on read).** Would
  make an unresolved favourite simply vanish (silent) and couples the personal
  layer to live data. The denormalised design is *right* — it's what lets the
  view render offline and a share carry its own labels; the fix is resolution
  **UX**, not restructuring storage.
- **Validate only at favourite/merge time.** Doesn't catch data that changes
  *after* the favourite is saved (case 1) — resolution has to be at render/open.

## Consequences

- Needs a **forced-refresh / cache-bust** data path (service-worker cooperation
  — a message to bypass the data cache and re-fetch), reused by both the
  Favourites view and the menu-page 404 screen.
- Favourites view gains an "unresolved" item state; the menu screen gains an
  honest not-found screen; share/merge gains an unresolved flag + refresh prompt.
- **Coordinated, not standalone:** ADR 0017 sync makes case 2 routine (a synced
  favourite can land before its data), and Theme 10 sharing is the other source
  of cross-context refs — the merge/refresh UX is finalised there so it's built
  once. This ADR fixes the **invariants** those builds must honour.
- Until built, current behaviour stands (favourite renders; tap may 404 to the
  generic error). No code changes ship under this ADR yet.
