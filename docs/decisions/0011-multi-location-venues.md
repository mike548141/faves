# 0011 — Multi-location venues as a `locations` array, resolved by nearest branch

**Status:** accepted
**Date:** 2026-07-22

## Context

Some venues have several branches that share one name, menu and cuisine but sit
at different addresses with their own coordinates, phone and opening hours —
Kaffee Eis and Gong Cha are the owner's live cases. The schema (ADR 0002) had
exactly one address/lat/lng/phone/hours per record, so a chain couldn't be
represented without either duplicating the whole menu per branch or losing the
per-branch location that "Near me", the drive-time hint, "Open now" and the maps
handoff all depend on.

## Decision

**One record per venue, with an optional `locations` array** of branches:

```jsonc
"locations": [
  { "label": "Courtenay Place", "address": "…", "lat": …, "lng": …,
    "phone": "…", "hours": { … } }
]
```

- `locations` is **optional**. A single-location venue keeps its
  address/lat/lng/phone/hours at the top level exactly as before — fully
  backward compatible. When `locations` is present it **wins**, and those five
  per-branch fields must **not** also appear at the top level (validated).
- **One normalisation seam** (`data.js → normaliseVenue`): at load, the first
  (primary) branch is projected to the top level, so every existing consumer
  that reads `r.address`/`r.hours`/etc. keeps working unchanged. Branch-aware
  behaviour layers on top via `locations.js`.
- **Nearest-branch resolution** (`locations.js`) is the one place that turns
  both shapes into a canonical branch list and picks the branch nearest the
  viewer (haversine) for distance, drive-time, status and the maps handoff.

**"Open now" resolves to the *nearest* branch, not "any branch open".** When we
know the viewer's location the card's distance and its open/closed badge must
describe the *same* branch — the nearest one — or they'd contradict each other
("2 km away · Open" while the 2 km branch is actually shut). When we *don't*
know the location we can't claim a nearest, so the **primary** (first) branch's
hours stand. "Open if any branch is open" was rejected: it would mark a venue
open on the strength of a branch across town you're not going to.

`label` (optional, e.g. "Courtenay Place") names a branch in the multi-branch
UI; the menu screen lists every branch, nearest first when location is known,
each with its own directions link, phone and hours. A one-branch `locations`
array renders identically to a flat single-location venue (the per-branch
chrome only appears at 2+ branches).

## Rejected

- **(b) Separate record per branch.** Simpler schema (no change), but it
  duplicates the entire menu across branches (edit drift, N× the data) and
  clutters the browse list with near-identical cards. The menu is the shared
  thing; only the location differs — so the record should be shared and the
  location plural.
- **"Open now" = any branch open.** Dishonest against the distance shown (see
  above); a viewer reads the badge as "the place I'm being pointed at is open".
- **A branch-level `area`/`cuisine`.** Out of scope: branches share these today
  (both Kaffee Eis / Gong Cha branches are Te Aro-ish). Revisit only if a chain
  genuinely spans suburbs the facets should split on.

## Consequences

- `ranking.js` and `filters.js` resolve distance and open-now to the nearest
  branch (primary when location unknown); the card is handed that branch's
  distance + hours so they always agree.
- `validate.py` gains `check_coords`/`check_hours` helpers reused for the
  top-level venue and each branch, plus the "per-branch fields not at top level
  when `locations` is set" rule and per-branch coordinate warnings.
- The viewer's "Near me" location is remembered for the session
  (`sessionStorage`, `geo.js`) so the menu screen can order branches
  nearest-first without a second location prompt — device-local, never
  persisted to the repo, never sent anywhere.
- Kaffee Eis and Gong Cha are converted to the shape with their **one verified
  branch each**. Their real second branches are **not** fabricated — the
  addresses need transcribing and a dev-time geocode (a wrong pin is worse than
  no pin); a content session adds them by appending to `locations`, no code
  change.
