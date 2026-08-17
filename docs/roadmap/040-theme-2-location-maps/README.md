# Theme 2 — Location & maps

> ✅ **Shipped 2026-08-17 — the location ask explains itself** ([ADR 0083],
> superseding the surface half of [ADR 0069] the same day). The owner asked for
> an explained dialog stating that location never leaves the device, a "don't
> ask me about this again" tickbox binding **both** the dialog and a follow-up
> banner, and the **removal of the "Use my location" pill**. The list now loads
> and sorts as well as it can without location *first*, and the ask follows —
> his ruling: *"load the full page so they can see everything … then ask for
> location data sharing so they can see why its needed."*
> 🔑 **Two findings worth carrying.** A modal opening 900 ms in makes the whole
> page inert and steals focus — measured, when it broke `to_top_check` and
> `filter_row_check` — so the dialog now yields to the banner for anyone already
> scrolling or tapping. And **Settings → Location became load-bearing** rather
> than a convenience: with the pill gone, without it the tickbox is a trapdoor.
> Guarded by `tools/geo_check.mjs`, the eighth browser check.
> ⚑ **Seven English-only te reo keys are owed** (`docs/reo-review-queue.md`);
> `geo.private` is flagged there as the one that must not be approximately
> translated, being a privacy claim rather than a label.

✅ **Shipped 2026-07-08** — availability + favourite ranking (`ranking.js`) and
its tunable distance dials; schema coordinates, native-maps handoff (ADR 0005),
and the "📍 Near me" distance-sorted list. A real tile-map view was ruled out on
the offline/no-CDN constraint. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

**Now all shipped** — three route/reachability items landed 2026-07-22/23;
verbatim design records → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

- ✅ **Pick along a route** `[L][constraint]` — **shipped 2026-07-23** (ADR
  0014): offline least-detour sort (`site/js/route.js`) + routed maps handoff
  (`geo.routeMapsUrlFor`); suburb-centroid or specific-place destination, no
  geocoder, no stored address. Live routed corridor stays ✗ (keyed/paid API).
  Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **Drive time from me to a venue** `[M]` — **shipped 2026-07-22** (ADR
  0010): driving-directions maps handoff + a "~N min drive" haversine hint on
  Near-me cards. Live in-app routed time stays ✗. Detail →
  [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **Restaurants with multiple locations** `[M][schema]` — **shipped
  2026-07-22** (ADR 0011, `site/js/locations.js`): optional per-venue
  `locations[]`, nearest-branch resolution across Near-me/drive-time/open-badge/
  maps-handoff. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
  **Still open:** Kaffee Eis + Gong Cha's **second branches** — need real
  addresses + a dev-time geocode; a content session appends them, no code change.
- ✅ **Branches list scrolls with the menu** `[S]` — **shipped 2026-07-23**
  (queue-run, `0917249`): dropped `position: sticky` + `top` from
  `.menu-twocol > .menu-aside` (kept `align-self: start`), CSS-only, SHELL bumped.
  The aside now scrolls with the menu column so a long branch list (McDonald's)
  isn't cut off. Trade-off owner-accepted: the contact card also scrolls away for
  short single-location asides. ⏳ Owner to eyeball the scroll on a real phone.

- ✅ **Choose your maps app** `[S]` — **shipped 2026-07-23** (ADR 0018). The web
  can't read the OS default-maps-app, so Settings → "Maps app" lets the viewer
  pick Apple / Google / Waze / "Match my device" (default = platform detection).
  `geo.resolveMapsTarget` + a Waze provider; per-profile like other settings.

**Open:**

- ✅ **Travel time next to the address / hours (mode-aware)** `[M]` — **shipped
  2026-07-23** (queue-run, `7dc6a42`, **ADR 0021**). A `~` walk/drive hint under
  the pickup address on the menu screen, for the nearest branch the page already
  resolves: **walk under 2 km** (5 km/h, no road-winding padding), **drive at/
  above** (`estimateWalkMinutes` / `travelHint` in `distance.js`). Only shows
  when Near-me has captured an origin this session (`recallOrigin`); no origin →
  no hint. No routing API (offline/zero-dep wall intact). **Collect-dialog
  placement deferred** as a noted follow-on in ADR 0021. ⏳ Owner to eyeball
  on-screen placement/feel at 390 px. Owner steer 2026-07-23, raw: *"keep the
  feature idea… I want the travel time (not necessarily drive e.g. I'm 100m walk
  away) shown next to the address/opening hours or maybe in the collect window"*.

**Parked idea** (from ADR 0014 consequences): a **"surprise me on the way"**
variant of the Pick-for-us shuffle that draws from the along-route pool rather
than the Near-me pool — parked, unclaimed, `[S/M]`.
