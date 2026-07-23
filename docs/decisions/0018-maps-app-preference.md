# 0018 — Maps app is a user preference (not just platform detection)

**Status**: accepted
**Date**: 2026-07-23

## Context

The address-tap handoff (ADR 0016) and the route-via handoff (ADR 0014) pick a
maps provider by **platform detection** (ADR 0005): Apple hardware → Apple Maps,
Android/desktop → Google Maps. The owner, on a Mac, tapped an address and got
Apple Maps and asked: *is there a system/device preference we can use for the
user's preferred mapping app?*

There is not. The web has **no API that exposes the OS default-maps-app**:
browsers deliberately hide installed apps and default-handler choices as a
fingerprinting/privacy surface. The nearest OS-honouring mechanism is the
Android `geo:` URI (fires an intent → the user's default maps app), but it has
no iOS handler and no desktop meaning, so it can't be the whole answer.

Owner ruling (2026-07-23): expose a **setting** that applies on every platform,
defaulting to the current device-based guess.

## Decision

Add a device-local **"Maps app"** preference (`settings.mapsApp`, per-profile
like the rest of the settings store):

- **`auto`** (default) — follow the device: Apple Maps on Apple hardware, Google
  Maps on Android/desktop. This is the pre-existing behaviour, unchanged for
  anyone who never opens the setting.
- **`apple` / `google` / `waze`** — force that provider on **every** platform.

`geo.js` gains a pure `resolveMapsTarget(pref, nav)` that maps the preference to
a concrete provider (`auto`/unknown → `detectPlatform`), and the URL builders
`mapsUrlFor` / `routeMapsUrlFor` gain a **Waze** target:

- pin → `https://waze.com/ul?q=<address>` (q geocodes to a pin)
- route → `https://waze.com/ul?q=<address>&navigate=yes` — Waze's universal link
  takes a single destination and has **no waypoint param**, so it mirrors Apple:
  navigate to the venue, the route destination is dropped (still routed, ADR 0014).

The street-address targeting of ADR 0016 is unchanged — every provider is handed
the address string, not coordinates.

The builders stay pure (target passed in); the two callers (`menu.js` address
row, `app.js` route-via) read `settings.get().mapsApp` and pass it. No import
cycle: `geo.js` does not import `settings`.

## Rejected

- **Auto-detect the user's preferred maps app.** Impossible on the web — no API.
  This is *why* it's an explicit setting.
- **Android `geo:` handoff (honour the OS default for free).** A real win on
  Android, but partial (no iOS/desktop) and it would give two different mental
  models (Android honours the OS, everyone else a setting). A single
  everywhere-setting was the owner's call for predictability. `geo:` on Android
  remains a possible future refinement layered *under* `auto`.
- **Platform-only, no setting (status quo).** The complaint that prompted this —
  a Mac/iPhone user who prefers Google/Waze had no override.
- **Waze waypoint route.** Waze's URL scheme exposes no intermediate stop, so
  the route can't be faked; mirror Apple's honest single-destination form.

## Consequences

- New `settings.mapsApp` (sanitised against `MAPS_APPS`; `auto` default). Adds a
  "Maps app" `<select>` to the Settings dialog (same control as the language
  picker). Older stored payloads without the key sanitise to `auto`.
- `geo.js` `mapsUrlFor`/`routeMapsUrlFor` now take a **provider target**
  (`apple`/`google`/`waze`; `android`/`other` alias Google for back-compat) and
  the convenience wrappers `mapsUrl`/`routeMapsUrl` take the preference.
- Waze is now a third outbound handoff host (like `maps.apple.com` /
  `google.com/maps`) — a user-initiated link, not a code dependency
  (`check_no_deps` unaffected).
- Builds on ADR 0005 (platform detection, still the `auto` engine), ADR 0014
  (route-via), ADR 0016 (address-string targeting).
