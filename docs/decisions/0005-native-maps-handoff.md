# 0005 — Native maps handoff, not one vendor's web map

**Status**: accepted • **Date**: 2026-07-08

## Context

The menu screen's address row should let someone get directions to a
venue. The first cut hardcoded a `google.com/maps` web link for everyone.
On a phone that's the wrong default: an iPhone user is bounced to the
Google Maps site (or app, if installed) when Apple Maps is one tap away
and already their default. It also searches by free-text address, which
geocodes imprecisely for the awkward addresses in this dataset ("Corner
Agra Crescent & Ganges Road", "Ground Floor, Huddart Parker Building…").
Roadmap Theme 2 flagged this as an owner call (⚑).

The hard constraints rule out a real tile map: that needs an external
tile source *and* a map library (CDN), breaking zero-dependency / offline
/ no-external-request. So the question was only *which* maps app to hand
off to, and *how precisely*.

## Decision

Detect the platform and hand off to the device's **own** maps app at
**exact coordinates**:

- **Apple** (iOS/iPadOS/macOS) → `https://maps.apple.com/?ll=…&q=…`
  (a universal link Apple Maps intercepts; falls back to web on non-Apple).
- **Android** → `geo:lat,lng?q=lat,lng(Name)` — the platform's default
  maps-app chooser, not a vendor lock-in.
- **Everything else** (desktop) → Google Maps web with coordinates.

To make coordinates precise, add optional `lat`/`lng` (WGS84) to the venue
schema, geocoded once from each address with a dev-time tool (OpenStreetMap
Nominatim — not shipped). The logic lives in `site/js/geo.js`, split into a
testable `detectPlatform(nav)` + pure `mapsUrlFor(r, platform)`; when a
venue has no coordinates it degrades to an address-text search on the same
three platforms.

## Rejected

- **One Google Maps link for everyone (the first cut):** simplest, but
  the wrong default on the majority device (a phone), and it ties a
  vendor-neutral utility to one vendor for no reason. Detection is ~20
  lines of pure, tested logic — cheap insurance.
- **A real tile map view:** needs a CDN map library + external tile
  requests → breaks three hard constraints (offline, no-CDN,
  no-external-request). The distance-sorted list (Theme 2) is the 80/20;
  a tile map, if ever, is an online-only progressive enhancement.
- **Geocoding client-side at runtime:** an external request on every menu
  open, and offline-hostile. Geocode once at authoring time; bake the
  numbers into the data (they're static — a venue doesn't move).

## Consequences

Coordinates are now first-class data (`ARCHITECTURE.md` schema;
`validate.py` warns on a venue that lacks them) and unblock the
distance-sorted "what's close" list in Theme 2 — that work reuses the same
`lat`/`lng`, no re-geocoding. A wrong pin is worse than no pin, so the
authoring rule is: geocode from the real address, spot-check, never
invent; an absent pair simply searches by text. `geo.js` was added to the
service-worker precache list, so the handoff works offline too.
