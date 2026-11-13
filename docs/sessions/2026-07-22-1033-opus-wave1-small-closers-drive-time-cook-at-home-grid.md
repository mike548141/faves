- **2026-07-22 (Opus: wave1 small closers — drive time + Cook-at-Home grid)**:
  Worktree `faves-wave1-small-closers`; two claimed ROADMAP items. **Drive time
  (Theme 2):** the address-row maps handoff now requests *driving directions*
  from the viewer's location instead of dropping a pin, so the maps app shows the
  real drive time — Apple `daddr=…&dirflg=d`, Android/desktop Google Maps
  `dir/?…&travelmode=driving` (`geo.js`, `menu.js`). Android gave up the
  vendor-neutral `geo:` chooser because `geo:` has no directions mode — recorded
  in **ADR 0010** (supersedes ADR 0005's pin behaviour). Plus the optional part
  (b): a rough "~N min drive" hint on Near-me home cards from the haversine
  distance (`distance.js` `estimateDriveMinutes`/`formatDriveTime`, muted + "~",
  no layout shift). **Cook-at-Home grid (Theme 3):** pure-CSS grid placement
  (`.card-grid .card-recipes`) puts the recipes card top-right on the ≥34rem
  layout; DOM order (ranking's pin) unchanged, so mobile keeps it anchored at the
  top. Verified: `node --test` 180 pass (geo tests rewritten for the directions
  form; 7 new distance assertions); `validate.py`/`check_no_deps.py`/`gen_sbom
  --check` all green; served locally, new URLs/CSS confirmed shipped. SW VERSION
  2026-07-12.66 → 2026-07-22.67. Two design calls for the owner: the address row
  keeps its "Pickup" label (tap = directions, not relabelled), and the "~N min
  drive" hint's speed/road-winding constants are a guess (30 km/h × 1.3).

