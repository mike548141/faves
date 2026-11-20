- **2026-07-08 (live opening hours — the parked "Open now", expanded)**:
  Owner asked for relative-time hours ("open for another 40 min"),
  open/closed status on the home list, and easy navigation of split
  (lunch/dinner) hours. All three needed a machine-readable hours model,
  so redesigned `hours` from `[{days,open,close}]` (free-text days, single
  interval — can't express a split or be computed) to a full week keyed
  `mon`…`sun`, each day a list of `[open, close]` intervals (`[]` =
  closed, `null` close = "late"); see [ADR 0006]. Migrated all 8 venues
  with hours in place (surgical text edit — a naive json.dump reserialise
  blew the diff to 4.5k lines and was reverted). New pure engine
  `site/js/hours.js`: `nzNow()` (the only impure bit — reads the clock in
  **Pacific/Auckland**, not the device tz, so it's right for a guest
  anywhere), `openStatus(hours, now)` → open/closing-soon/closed/
  opening-soon/unknown with relative detail, and `groupWeek()` merging
  identical days into ranges + carrying dow indices for "today". Home
  cards gained a live badge; the menu screen a status line + grouped week
  (splits inline "12pm–3pm, 5pm–9pm", today highlighted). 15 new JS tests
  (44 total) covering the afternoon gap, closing-soon, week-wrap, "late".
  validate.py enforces the 7 keys / HH:MM / close>open. VERSION →
  2026-07-08.7; `hours.js` precached. Browser-verified both screens at
  Wed 05:30 NZ (all "Closed · opens …" with correct next-open times;
  KTC's Tue–Wed row highlighted). Data still owner-unverified — the badge
  is only as right as the hours held. Follow-on teed up: an "Open now"
  *filter*. Note: distance sort (the owner's other bullet) already shipped
  earlier this session as "📍 Near me".
