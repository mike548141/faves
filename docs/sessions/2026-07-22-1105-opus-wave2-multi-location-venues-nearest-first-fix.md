- **2026-07-22 (Opus: wave2 — multi-location venues + "Nearest first" fix)**:
  Worktree `faves-wave2-multi-location`. **Multi-location (Theme 2, ADR 0011):**
  shape (a) — one record + an optional `locations:[{label?, address, lat, lng,
  phone, hours}]` array sharing name/menu/cuisine; single-location records
  untouched (backward compatible). New `site/js/locations.js` is the one seam
  that reconciles both shapes and resolves the **nearest** branch; `data.js`
  normalises the primary branch to the top level so every existing consumer
  keeps working. Distance/drive-time/open-now/maps all use the nearest branch
  (primary when location unknown — decided *against* "any branch open", which
  would fight the distance shown). Menu screen lists every branch nearest-first
  (`menu.js`); the viewer's Near-me location is remembered per session
  (`geo.js` `rememberOrigin`/`recallOrigin`, sessionStorage, device-local) so
  the menu can order branches without a second prompt. `validate.py` gains
  reusable `check_coords`/`check_hours` + per-branch rules. Kaffee Eis + Gong
  Cha converted to their **one verified branch each** — second branches NOT
  fabricated (need real addresses + dev-time geocode; a content session appends
  to `locations`, no code change). **"Nearest first" sort bug (owner-reported):**
  root cause was *not* a text sort (every distance compare was already numeric)
  — availability tier + favourite boost ranked ahead of distance, so a
  farther-open venue floated above a nearer one, contradicting the label. Fix:
  with "Nearest first" on (origin known) distance leads; default order (no
  location) unchanged. 3 regression tests added. **Also:** `serve.py --help` no
  longer crashes (argparse; the old unconditional `int(sys.argv[1])`). Verified:
  `node --test` 203 pass; `validate.py` (27 valid), `check_no_deps`, `gen_sbom
  --check` all green; served locally — home + venue shells + `locations.js` all
  200, kaffee-eis.json parses to the new shape. SW VERSION 2026-07-22.67 → .69
  (two site commits; tip .69 covers all). Owner calls: (1) second branches for
  the two chains await real data; (2) "Nearest first" still applies the
  favourite boost — flag if hearts should be ignored in that mode; (3) menu's
  compact mobile call-bar uses the primary branch (not nearest) — minor.

