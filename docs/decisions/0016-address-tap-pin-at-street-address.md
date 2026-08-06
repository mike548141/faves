# 0016 — Address tap opens a pin at the street address (not directions)

**Status**: accepted
**Date**: 2026-07-23

## Context

ADR 0010 made tapping a venue's address launch **driving directions** from
the viewer's location, targeting the venue's stored `lat`/`lng`. On owner
review (2026-07-23) that behaviour was rejected on two grounds:

1. **Wrong feature shape.** The owner's intent for the address tap was "show me
   where this place is" — a pin on a map — not "start navigating there". Raw
   verbatim: *"I don't think this meets what I wanted for the feature."*
2. **Proven wrong-street bug.** Tapping R & S Satay Noodle House — listed at
   *148 Cuba St* — opened maps on *1 Garrett St*, one street over. Cause: the <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
   handoff targeted stored coordinates, and R & S's dev-time geocoded coords
   (`-41.29379, 174.7751`) sit ~100 m off, on Garrett St. Any coord-targeted <!-- leakscan:allow: venue geocoded coordinates as the worked example — same product class as site/data (ADR 0022 gate 1) -->
   maps link inherits that error fleet-wide (see the ROADMAP "Coordinate audit"
   follow-on). A maps app given a **street-address string** geocodes it exactly.

This supersedes **part (a)** of ADR 0010 (directions-on-tap). Part (b) — the
rough "~N min drive" haversine hint on Near-me cards — **stands**: it's an
in-app travel-time glance, the direction the owner actually wanted, and it never
launched anything.

## Decision

**(a) The address tap opens a map *pin* at the venue**, so you see the place and
can start directions yourself from there. It targets the **street address
string** (URL-encoded), not the stored coordinates, so Maps geocodes the exact
spot:

- **Apple** → `https://maps.apple.com/?q=<address>` — a `q` value is a search;
  an address string resolves to a pin (a bare `lat,lng` `q` is parsed as
  coordinates).
- **Google / desktop** → `https://www.google.com/maps/search/?api=1&query=<address>`
  — the documented Maps "search" URL; a full address resolves to one pinned
  place.

Coordinates are used **only** as a belt-and-braces fallback if a record somehow
carries no address (`validate.py` requires one). They remain the source of truth
for in-app distance/detour maths — the bug is that they're imprecise for
*display targeting*, not for relative ranking.

**(b) Address targeting adopted everywhere a maps link names a venue.** The
along-a-route "🧭 Route via maps" handoff (ADR 0014, `routeMapsUrlFor`) keeps its
**routed** form — that feature is explicitly about routing and was not objected
to — but its **venue leg** now targets the street address too (Google waypoint
and Apple `daddr` both accept an address), same wrong-street reasoning. The
route destination stays coordinates (a suburb centroid has no address).

**(c) The "~N min drive" Near-me hint stays** (ADR 0010 part (b), unchanged).

## Rejected

- **Keep directions-on-tap (ADR 0010 part a).** The owner reviewed and backed it
  out. A pin is the intended affordance; the driving ETA is already served by
  the Near-me hint (b) and by the user starting directions from the pin.
- **Target coordinates for the pin.** The direct cause of the Garrett St bug.
  Coords are dev-time geocoded and imprecise; the address string geocodes
  exactly in the maps app.
- **Apple `address=` instead of `q=`.** `address=` also drops an address pin, but
  `q=` is the general-purpose "find and show this" that handles both an address
  string and a `lat,lng` fallback uniformly, so one code path covers both.
- **Withdraw the Near-me drive hint too.** It was never the problem — it's an
  in-app glance, not a launch, and it's the travel-time direction the owner
  wants (see the ROADMAP travel-time refinement). Kept.

## Consequences

- `geo.js` `mapsUrlFor` is now a pin builder (was directions); `routeMapsUrlFor`
  keeps routing but targets the venue by address. `menu.js`'s address row is
  unchanged in wiring (still an http(s) universal link with `target`/`rel`).
- The `favBoostKm` dial is untouched by this ADR (see ADR-less ranking ruling /
  session log for the separate "Nearest first = pure distance" change).
- The wrong-street bug is now masked for R & S and any similarly-off venue,
  because Maps geocodes the address. The underlying coord imprecision still
  affects distance sort + detour accuracy — tracked by the ROADMAP "Coordinate
  audit" `[S]` item, which this does not close.
- ADR 0010 stays the record of the directions-handoff deliberation and the
  platform-detection rationale (itself from ADR 0005); this builds on both.
