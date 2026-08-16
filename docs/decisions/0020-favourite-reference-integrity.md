# 0020 — Favourite & rating reference integrity: honest stale-vs-removed handling

**Status**: **accepted — built 2026-08-16** (`85ad322`), invariants 1–4 of 5.
Invariant 5 (share/merge flags an unknown ref) remains deferred to ROADMAP
Theme 10, which is owner-gated; nothing else waits on ADR 0017.
**Date**: 2026-07-23; built 2026-08-16.

> 🔎 **The deferral's stated technical blocker was already discharged, by work
> that landed for other reasons.** This ADR deferred its build partly for design
> coordination and partly on a Consequence — *"needs a forced-refresh /
> cache-bust data path (service-worker cooperation)"*. By 2026-08-16 `sw.js`
> served everything under `/data/` **network-first** with `cache: "no-cache"`, so
> while online a plain fetch already **is** the live file. The only gap left was
> *invisibility*, not staleness: the worker's offline fallback `cache.match(req)`
> is indistinguishable from a network hit at the page. A **unique query per
> check** closes it, because `cache.match` honours the query string — the busted
> URL is in no cache, the fallback misses, the fetch rejects. So a **resolved**
> response proves the network answered.
>
> **The lesson is not about caches.** A deferral records a blocker as it stood on
> the day it was written, and then goes on reading as current forever. Nobody
> re-checked this one for three weeks. **Re-verify a deferral's blocker before
> inheriting it** — the same correction this session had to make to Theme 19's
> `detailsVerified` item, whose stated reason ("too few records") was also false
> by the time anyone acted on it.

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
- **Built 2026-08-16.** What the invariants cost in practice, recorded because
  the wording *is* the feature:

  | State | Row label | Explanation |
  |---|---|---|
  | Unresolved (local only) | Not on your current list | This may have been removed, or your list may be out of date. |
  | Offline | Not on your current list | Can't check while you're offline — this may still be there. |
  | Reached nothing | Not on your current list | Couldn't reach the site just now, so this is still unchecked. |
  | **Confirmed removed** | No longer listed / No longer on the menu | Checked just now: this is no longer in the menu data. |
  | Restored (was stale) | *mark disappears* | toast: Still there — your list was just out of date. |

  Only a **completed live fetch that found nothing** unlocks the word "removed".
  A 500 is *unreachable*, never absence — asserted by a test, verified by
  reintroducing the bug.
- 🔎 **`forceRefresh()` was deliberately not reused**, though it existed. It
  clears both caches, unregisters the worker and reloads: it re-downloads the
  whole site to answer "is one dish still there?", destroys the open Favourites
  panel, and — disqualifying — **a page reload cannot return an answer to the
  code that asked**. A targeted `recheckReferences()` sits beside it in `data.js`.
- ⚠️ **The proof needed a counterfactual, and the first attempt at it passed for
  the wrong reason.** CDP's `Network.emulateNetworkConditions` is scoped to the
  **page** target, so the service worker kept fetching happily and the busted URL
  resolved 200 — a green result that proved nothing. Killing the HTTP server
  outright is the only honest way to take the network away from a worker.
  Recorded because it would fool the next person too.
- **Known cost, bounded:** the worker caches each 200 it sees, so a recheck
  leaves one never-served entry per URL in the data cache, cleared on the next
  `DATA_VERSION` bump. The permanent fix is one line in `sw.js` — skip
  `cache.put` when the URL carries `_fresh`.
- 🚩 **Not covered, and it needs a screen that does not exist:** a dish that was
  *rated* but never *hearted* has nowhere to appear, so an unresolved rating for
  it is invisible. Noted in `ratings.js`, not solved.
