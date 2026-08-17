# Theme 18 — Metric or imperial, the reader's choice (owner-raised 2026-08-09)

**The ask, raw (owner):** *"In the settings let people choose between imperial
and metric measures for wherever they are used in the app e.g. miles vs
kilometers, litres, grams."*

A per-profile Settings preference, sitting beside the existing dials, applied at
**render** time — never stored converted, so the data keeps one true unit and
the display adapts. Three surfaces use units today: **distance** (the two
Distance dials, Near-me, the drive/walk hint), **recipe quantities** (17a), and
**oven temperatures** (°C).

- ✅ **18a — Distance** `[S]` — **shipped 2026-08-09** (ADR 0029, `units.js`).
  Every rendered distance goes through one formatter: the Near-me card, the
  branch chips on a menu, the route detour figure. Imperial short distances
  read in yards to the nearest 50, mirroring the metric metres ladder, then
  `0.6 mi`, then whole miles. The two Distance dials run on a round mile grid
  (½ mi and 5 mi steps) while still **storing kilometres**, and the walking
  pace, urban speed and walk/drive crossover all stay metric internally.
- ✅ **18c — Oven temperatures** `[S]` — **shipped 2026-08-09** (ADR 0029).
  Temperatures live inside free-text method steps, so this is a render-time
  rewrite of the step text, guarded by the literal ° sign — proven against all
  459 strings in `cook-at-home.json`: exactly the 14 oven temperatures change,
  every other string byte-identical. The figure is swapped, not appended
  (`Bake at 355°F for 2 hours`), and rounded to the nearest 5°F. Gas marks
  skipped — not trivial, and nothing asked for them. **Owner ratified the 5°F
  rounding 2026-08-09** (over nearest-25 US dial stops), and ruled the two
  hand-written `(NNN°F)` brackets out of `cook-at-home.json` — removed as a
  correction (we wrote the redundancy, the recipe didn't change).

**Default stays metric** — the app is New Zealand-first and the data is metric.
This is a display preference for visitors, not a change of source of truth.
Lockstep with **Theme 15b**'s wording sweep: both change user-facing unit copy,
and `reo.js` holds the strings.

🎯 **Open with the owner (2026-08-09):** oven temperatures now round to the
**nearest 5°F**, so 170°C reads 340°F rather than the conversion chart's 350°F.
Rounding to the nearest 25°F instead would land on the classic US dial stops
and would reproduce both hand-written brackets in the recipe data exactly — but
it can serve a 170°C bake 12°F hot, and in baking an overshoot burns while an
undershoot only takes longer. One constant in `units.js` (`OVEN_STEP_F`) if he
prefers dial stops. Also his call: the two `(NNN°F)` brackets hand-written into
`cook-at-home.json` are now redundant, and a metric reader sees `220°C (425°F)`
where an imperial reader sees `430°F`.
