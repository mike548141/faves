## 2026-07-23 — Pick along a route (Theme 2, wt: faves-wave6-along-route)

Built the ROADMAP's recorded recommendation for **Pick along a route** —
"grab dinner on the drive home" — as (a) an offline least-detour sort + (b) a
routed maps handoff. A live routed corridor stays **✗** (routing API =
external/keyed/paid → offline/zero-dep wall, same as live drive-time); deferred,
not refused. ADR **0014**.

**(a) Maths (`site/js/route.js`, pure/tested).** Detour cost =
`dist(o,v)+dist(v,d)−dist(o,d)` (haversine, clamped ≥0) — the ROADMAP's
preferred added-distance cost: ~0 on the line, honestly positive behind-origin /
past-destination / off-to-the-side, where perpendicular-to-segment misleads.
Multi-location venues resolve their **best branch for the trip** (least detour,
not nearest to origin). `rankByDetour` **leads with detour**, availability
secondary (headline-metric-leads, matching the just-landed "Nearest first" key
order); favourites tiebreak only (no off-route boost); recipes pinned,
stubs/coordless sink. `areaCentroids` gives suburb destinations from data we hold.

**Destination input call:** a **suburb centroid** or a **specific place**, both
from existing coords — **no geocoder** (that's an online API) and **no persisted
"Home" preset** (a new personal-location surface; the Near-me origin stays
ephemeral). Both rejections recorded in the ADR.

**(b) Handoff (`geo.routeMapsUrlFor`).** Waypoint reality checked, not assumed:
**Google `/maps/dir/?api=1` honours `waypoints=`** → real origin→venue→dest road
route (Android/desktop); **Apple Maps' URL scheme has no waypoint param** → it
honestly routes to the venue. Per-card "🧭 Route via maps" action.

**UI.** A list-toggle beside "Near me" arms the mode + reveals a dismissible
destination `<select>`; the two share one origin as mutually exclusive sort
modes. 44px targets, labelled controls, live-region status announces the mode +
the straight-line caveat. Draft te reo chrome added (safety boundary respected).

**Verified:** `validate.py`, `check_no_deps`, `gen_sbom --check`, `node --test`
(**262 pass**, +23 route cases: on-line ≈0, behind-origin, past-destination,
branch resolution, sort composition, waypoint reality), `node --check app.js`;
served locally (new controls + route.js + CSS present, 200). **SW VERSION
`.72 → .73`** (bumped once, site-touching commit; route.js precached). **NOT
browser-exercised** (no headless browser): the geolocation flow, detour cards and
maps handoff are logic/unit-verified only — worth a device pass at 390px.

🎯 **Owner call outstanding:** none blocking. Two things to flag if you want them
different — (1) route-off drops back to plain Near me (origin persists), not full
off; (2) suburb destinations use the centroid of that suburb's venues, so a
one-venue suburb centres on that venue. Branch pushed, **not merged**.

Commits: route maths+tests+handoff; home wiring+sw bump; docs close (ADR 0014).

