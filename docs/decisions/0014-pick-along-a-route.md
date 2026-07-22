# 0014 — Pick along a route: offline least-detour sort + routed maps handoff

**Status:** accepted
**Date:** 2026-07-23

## Context

Owner scenario (2026-07-08): "grab dinner on the drive home" — pick a venue
*between where I am and a destination I name*. A true "near the route" needs a
routing/directions API to fetch the road polyline, then measure each venue's
distance to it — external, keyed, usually paid. That breaks the offline /
zero-dependency / no-external-request invariants (ADR 0001), the same wall as a
live in-app drive time (ADR 0010). The ROADMAP recorded the recommendation:
**(a)** an offline least-detour sort we *can* do with the coordinates we already
hold, plus **(b)** a routed maps-app handoff for real-road accuracy. A live
routed corridor stays out.

## Decision

**(a) Offline least-detour sort (`site/js/route.js`).** With origin = the
device location (the existing geo seam) and a destination the viewer picks, rank
venues by **added distance**:

```
detour(v) = dist(origin, v) + dist(v, dest) − dist(origin, dest)   [haversine]
```

The ROADMAP named this the preferred cost over perpendicular-distance-to-segment:
it handles the edge cases honestly with no special-casing — ~0 for a venue on
the straight line, and genuinely positive for one *behind* the origin, *past*
the destination, or off to the side (all really out of the way). Clamped ≥ 0
(float noise / the sphere's slight non-additivity for near-collinear points). It
is a **straight-line** estimate, not roads — shown honestly ("↩ +1.2 km detour",
"~N min added", both flagged approximate), never presented as a routed figure.

- **Multi-location venues use their best branch *for the trip*** — the branch of
  least detour (`bestBranchForRoute`), which is not necessarily the one nearest
  the origin (a branch further from you but nearer your destination can detour
  you less). Its hours drive the card badge so the two agree.
- **Availability composition:** detour is the headline metric and **leads** the
  sort; availability ("prefer open along the way") is the **secondary** key —
  consistent with the "Nearest first" precedent, where a distance-type mode
  honours its label rather than floating a farther-but-open venue above a nearer
  one. So among near-equal detours the open venue wins, but a wide-detour open
  place never jumps a barely-detour closed one. Order: recipes pinned → orderable
  before menu-less stubs → detour → availability tier → favourite tiebreak →
  curated. Coordless venues (and recipes, which have no location) carry Infinity
  detour and sink to the bottom of their group.
- **Favourites are a tiebreak only** here — unlike the home list they earn no
  distance boost, because a hearted place well off your route isn't "on the way".

**Destination input:** the viewer picks **either a suburb** (the centroid of
that suburb's venues) **or a specific place** from the list — both derived from
coordinates we already carry. No new storage, no personal address, no geocoder.
"Drive home to Churton Park" is served by the suburb centroid; "on the way to KK"
by the venue.

**(b) Routed maps handoff (`geo.routeMapsUrlFor`).** A per-card "🧭 Route via
maps" action hands the trip to the maps app for the real road route. Waypoint
support was **checked, not assumed**:

- **Google Maps** (`/maps/dir/?api=1`) honours an intermediate `waypoints=`, so
  origin (current, omitted) → **venue (waypoint)** → destination is a real
  three-point route. Used on Android and desktop.
- **Apple Maps'** URL scheme exposes only `saddr`/`daddr` — **no waypoint
  parameter** — so on Apple we honestly route to the venue (origin→venue) and
  drop the destination rather than fake it. Same pattern as the plain handoff
  (ADR 0010).

**UI:** a sort/browse mode like "Nearest first" — a list-toggle beside "Near me"
that arms the mode, reveals a dismissible destination `<select>`, and re-ranks on
choice. Near me and Along a route share one origin and are mutually exclusive
sort modes. 390 px-first, ≥ 44 px targets, labelled controls, a live-region
status that announces the mode and the straight-line caveat, dark mode + reduced
motion inherited. Draft te reo chrome added within the safety boundary (neutral
chrome only; the interpolated detour figure stays English, as all interpolated
strings do).

## Rejected

- **Live routed corridor (routing/directions API).** The accurate answer, and
  the owner's original idea. External, keyed, usually paid → breaks offline /
  zero-dependency / no-external-request. This is the whole reason (a) is an
  approximation. Deferred with the other API-blocked items (no-backend steer,
  ADR 0009); revisit only if that stance changes.
- **Perpendicular distance to the origin→dest segment** as the cost. Cheaper
  intuition but mishandles the endpoints: a venue far *behind* the origin or
  *past* the destination can sit near the infinite line yet be a terrible detour.
  Added-distance gets those right for free — the ROADMAP's stated preference.
- **Free-text address / place-name destination.** The natural input, but turning
  text into coordinates needs a geocoder = an online API. Rejected on the same
  constraint as the routing API.
- **A persisted "Home"/"Work" destination preset.** Convenient for the core
  scenario, but a saved home coordinate is a new, *persistent* personal-location
  surface (the existing Near-me origin is deliberately ephemeral, sessionStorage
  only). Not worth adding when a suburb centroid serves "drive home" without
  storing anything. Reconsider only if the owner asks; it would want its own
  privacy note.
- **A separate "along a route" screen / map view.** A tile map needs a CDN map
  library + external tiles (already rejected, ADR 0005). A re-sort of the
  existing list is lower-clutter (DESIGN) and reuses the card, the ranking seam
  and the maps handoff.

## Consequences

- One new module (`site/js/route.js`, precached) and a `geo.js` handoff helper;
  `ranking.tierFromHours` is now exported so route.js tiers on the same scale.
  No schema change — it rides on existing `lat`/`lng`/`locations`/`area`.
- The detour and drive-hint figures are straight-line approximations by
  construction; the copy says so, and (b) is the accuracy escape hatch. A venue
  the router would deem "5 minutes off the motorway" can read as a small
  straight-line detour or vice-versa — acceptable for *ordering* candidates, not
  for turn-by-turn (which is what the maps handoff is for).
- Suburb destinations are only as good as the venues that define their centroid;
  a suburb with one venue centres on that venue. Honest and self-correcting as
  content grows.
- The "Pick for us" shuffle is unchanged — it still uses the Near-me
  availability/reach pool, not the detour ranking (route mode is a browse sort,
  not a new shuffle). Worth revisiting if the owner wants "surprise me *on the
  way*".
