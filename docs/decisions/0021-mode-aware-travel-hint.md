# 0021 — Mode-aware travel hint (walk or drive) on the menu screen

**Status**: accepted
**Date**: 2026-07-23

## Context

The owner reopened Theme 2 (steer 2026-07-23, quoted in ROADMAP): he
wants the *travel time* shown in Faves **next to the address / opening
hours** on the menu screen — and crucially not always a *drive* time:
"I'm 100m walk away". ADR 0010(b) already ships a straight-line
`~N min drive` hint (`estimateDriveMinutes` / `formatDriveTime` in
`distance.js`), but on the home card and always framed as a drive. A
100 m "drive" reads as absurd.

The hard constraint is unchanged from 0010/0001: a live routed figure
needs a keyed, external directions API on every menu open, which breaks
the offline / no-external-request / zero-dependency invariant. We refine
the ask honestly into what the data we already hold can answer: a
**mode-aware in-app estimate** off the haversine distance — walk when
the viewer is close, drive when far — a `~` approximation, no network.

## Decision

**Pick the travel mode by distance, then estimate that mode's time**, all
in `distance.js` (pure, unit-tested, offline-safe):

- **`estimateWalkMinutes(km)`** — straight-line distance ÷ **5 km/h**
  (the standard adult walking-pace planning figure, ≈83 m/min), rounded
  to whole minutes, floor 1. Unlike the drive estimate it adds **no
  road-winding padding**: the owner asked for a straight-line `~` figure,
  and over short walking distances a footpath rarely detours far from the
  crow-line.
- **`travelHint(km)`** — returns `{ mode, minutes, text }`. Mode crosses
  over at a named constant **`WALK_MAX_KM = 2`**: under 2 km → walk,
  at/above → drive. 2 km ≈ a 24-minute walk at 5 km/h — about as far as
  most people will walk to a takeaway before a drive is the realistic
  mode; beyond it "walk" reads as a joke. The constant is named so it's
  tunable. The boundary is drive-inclusive (`km < WALK_MAX_KM` walks).
- The drive branch reuses the existing `estimateDriveMinutes`
  (winding × urban speed). A single `formatTravel(min, mode)` helper
  produces `~N min walk` / `~N min drive` so the wording can't diverge;
  `formatDriveTime` now routes through it too (no duplication).

**On the menu screen** (`menu.js`), the hint sits under the pickup
**address** in the contact card, for the **nearest branch the page
already resolves** (`orderedBranches(r, recallOrigin())` — so the hint
matches the branch shown). It renders **only when the branch carries a
finite `distanceKm`**, which holds exactly when Near-me captured an
origin this session *and* the branch has coordinates — no origin, no
hint, never a bogus number. Single-location venues now pass the origin
too (ordering is a no-op with one branch) so they get the hint as well.
Styled subtle + soft-ink (`.contact-travel`) with a leading `~` and the
mode word, so it never reads as an authoritative or live figure.

## Rejected

- **A routing/directions API for a real walk/drive time:** keyed,
  external, per-open network call → breaks offline / no-external-request
  / zero-dependency (ADR 0001), same reasoning that ruled out live routed
  drive time in ADR 0010. The maps-app handoff (ADR 0016) still gives the
  real live figure on tap.
- **Always "drive" (status quo, ADR 0010b):** fails the owner's explicit
  "100m walk away" case — a sub-kilometre drive time is nonsense.
- **A third "cycle" mode / an elevation model:** more modes and hills
  need data we don't hold and judgement the `~` can't honestly carry;
  two modes cover the ask. Deferred until asked for.
- **Showing the hint without a captured origin (e.g. a default city
  centroid):** would fabricate a number the viewer would read as real.
  Honesty floor — no origin, no hint.
- **Padding the walk estimate for footpath winding (as drive does):**
  the owner asked for a straight-line figure and short walks detour
  little; the `~` already signals approximation.

## Consequences

`distance.js` gains `estimateWalkMinutes` and `travelHint` (both pure,
unit-tested: rounding, the 2 km crossover boundary, tiny/zero and bad
inputs). `menu.js`'s `addressRow` takes the branch `distanceKm` and
appends the hint; single-location cards now resolve distance via
`recallOrigin()`. One new CSS class, `.contact-travel`, reusing existing
tokens. `WALK_KMH` and `WALK_MAX_KM` are the two tuning knobs.

**Deferred follow-on:** the collect/pick dialog is a "maybe" in the
ROADMAP for the same hint — left unbuilt this pass. `travelHint` is
already the reusable primitive if that lands. Real-browser placement and
feel were **not** verified here (logic tests only) — that's a manual
check when the change is exercised at mobile width.
