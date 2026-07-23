# 0010 — Drive time via directions handoff + a rough in-app hint

**Status**: part (a) superseded by 0016; part (b) stands
**Date**: 2026-07-22

## Context

Owners asked for the drive time from where they are to a venue (ROADMAP
Theme 2). A *live, in-app* routed drive time needs a routing/directions
API (Google/Mapbox Directions) — an external, keyed, usually-paid call
on every menu open — which breaks the offline / no-external-request /
zero-dependency hard constraints. The owner steer recorded on the item
ruled that option out. What we *can* do with only the data we already
hold (the venue's `lat`/`lng` and, in "Near me" mode, the haversine
distance): let the phone's own maps app compute the real drive time, and
optionally show a crude straight-line hint in-app.

This supersedes the *behaviour* of ADR 0005 (which handed off a dropped
**pin** at the venue). The platform detection and coords-vs-address
fallback from 0005 are unchanged.

## Decision

**(a) The maps handoff now requests driving directions**, from the
viewer's current location to the venue, so the maps app shows the real,
live drive time:

- **Apple** → `https://maps.apple.com/?daddr=<lat,lng>&dirflg=d`
  (`dirflg=d` = drive; no `saddr` → routes from current location).
- **Android** → `https://www.google.com/maps/dir/?api=1&destination=<lat,lng>&travelmode=driving`.
- **Other/desktop** → the same Google Maps directions link.

No coordinates → the same directions links routed to the address text.

**(b) A rough in-app "~N min drive" hint** on the home card in "Near me"
mode, beside the measured distance. Derived from the haversine distance
we already compute: padded by a road-winding factor (1.3) and divided by
a conservative urban speed (30 km/h). It is `distance.js`'
`estimateDriveMinutes()` / `formatDriveTime()` — pure and unit-tested —
always rendered with a leading `~`, in the muted meta colour (not the
accent), so it never reads as confidently as the measured distance.

## Rejected

- **Live in-app routed drive time:** needs a keyed external directions
  API → breaks offline / no-external-request / no-dependency. The owner
  ruled it out. The maps-app handoff gives the same figure for free.
- **Keeping the Android `geo:` pin (ADR 0005):** `geo:` is vendor-neutral
  (a maps-app chooser) but has **no directions mode** — it can only drop a
  pin, which shows no drive time. Directions is the thing owners asked
  for, so on Android we accept the Google Maps directions URL. In
  practice Google Maps is the near-universal default there, and the link
  still opens the installed app.
- **`google.navigation:q=…` on Android:** launches turn-by-turn
  navigation *immediately*. Too aggressive — the viewer wanted to see the
  drive time, not start driving. The `maps/dir/` link shows the route
  overview with ETA and a Start button.
- **Dropping the in-app hint (b):** the maps handoff (a) alone closes the
  item. But the hint is one compact line with no layout shift and answers
  "how far, roughly?" at a glance, so it earns its place. It is
  explicitly approximate; the handoff remains the source of the real
  number.

## Consequences

All handoffs are now `http(s)` universal links (Android dropped `geo:`),
so `menu.js` gives every one `target`/`rel`. The hint only appears in
"Near me" mode, where a `distanceKm` exists. The estimate is
straight-line with no traffic model — honest as a `~` hint, never a
promise; ADR 0005 stays the record of the original pin handoff and the
platform-detection rationale, which this builds on rather than replaces.
