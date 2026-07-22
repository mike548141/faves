# Decision records

Short ADRs preserving the *deliberation* behind significant decisions —
the alternatives weighed, why they lost, and the evidence — which
`ARCHITECTURE.md` (current truth, compact) deliberately compresses away.

Write one when a decision (a) rejected a plausible alternative a future
session might re-propose, or (b) rests on evidence that took real work
to gather. Don't write one for reversible implementation choices — a
code comment covers those (the "comments say why" rule).

Format: one file, numbered `NNNN-slug.md`, about half a page. Sections:
**Status** (accepted / superseded-by-NNNN), **Date**, **Context**,
**Decision**, **Rejected** (each alternative + why it lost),
**Consequences**. Never edit an accepted ADR's substance — supersede it
with a new one.

Records 0001–0004 were backfilled 2026-07-08 from decisions already made
and recorded in `ARCHITECTURE.md`/`STRATEGY.md`; they capture the
deliberation those compact docs omit.

## Index

- [0001](0001-zero-build-vanilla.md) — zero build step, vanilla
  HTML/CSS/ES-modules, no framework
- [0002](0002-json-per-restaurant-git-as-cms.md) — one JSON file per
  restaurant, git as the CMS (no database, no admin UI)
- [0003](0003-recipes-as-kind-not-separate-type.md) — Cook at Home as a
  `kind:"recipes"` record reusing the venue shape
- [0004](0004-cloudflare-pages-subdomain.md) — Cloudflare Pages at a
  subdomain, not S3 and not a path prefix
- [0005](0005-native-maps-handoff.md) — native maps handoff (Apple
  Maps / Android `geo:` / desktop Google) at exact coordinates, not one
  vendor's web map
- [0006](0006-hours-model-and-timezone.md) — structured per-day hours
  (intervals, splits, "late"), live status computed in NZ time not the
  device clock
- [0007](0007-pairings-not-meal-reorg.md) — recommended pairings
  (`goesWith` deep-links) instead of reorganising Cook-at-Home around
  meals
- [0008](0008-sbom-committed-and-deterministic.md) — SBOM committed at
  `/.well-known/sbom.json`, deterministic and CI-checked
- [0009](0009-group-orders-share-urls-not-connections.md) — group
  ordering shares finished picks as URL fragments (share sheet / QR),
  not live connections (Bluetooth / WebRTC / backend-room rejected);
  records the owner's softened stance on a future lightweight backend
- [0010](0010-drive-time-directions-handoff.md) — the address maps
  handoff requests driving directions from the viewer's location (real
  live drive time), plus a rough straight-line "~N min" card hint
- [0011](0011-multi-location-venues.md) — venues with several branches as
  one record + an optional `locations` array (shared menu), resolved by
  the nearest branch for distance / status / maps; not separate records
- [0012](0012-device-local-profiles.md) — device-local profiles (per-person
  hearts on a shared phone): a registry + profile-scoped storage wrapper,
  scoping favourites + settings by whole store; migration copies old data into
  the default profile; cross-device sync stays out of scope (Theme 6)
- [0013](0013-ratings-curated-and-local.md) — ratings: a curated household 1–3
  rating (optional data field, schema+render only, ships dormant) + device-local
  per-profile personal ratings; public/crowd ratings stay rejected (three
  non-goals), the online Google-rating edge function is a separate owner-gated
  item; direction ⚑ awaits owner ratification
- [0014](0014-pick-along-a-route.md) — pick along a route: an offline
  least-detour sort (added-distance haversine cost, best-branch resolution,
  detour leads / availability secondary) with suburb-or-place destinations (no
  geocoder, no stored address), plus a routed maps handoff (Google waypoint;
  Apple has none → venue-as-destination); live routed corridor stays rejected
