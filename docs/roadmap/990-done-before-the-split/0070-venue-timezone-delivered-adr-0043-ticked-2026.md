- [x] ✅ **Venue timezone — DELIVERED (ADR 0043), ticked 2026-08-16 by audit.**
  Every named deliverable landed and nobody ticked the box: `place.js`
  `venueTimezone()`/`branchTimezone()` resolve per branch then venue then
  `HOME_TIMEZONE`; `hours.nowIn(tz)` and `temporal.todayIn(tz)` replaced
  `nzNow`/`todayNZ`, which no longer exist; `menu.js` renders
  `Hours · ${zoneLabel(tz)}`; `app.js` computes the timezone note and **names no
  zone when the list spans several**; `viewerOnNzTime` became
  `viewerOnVenueTime(tz)`; `validate.py` checks IANA zones at card and branch
  level. Residue is **data, not code**: no record carries a `timezone` yet
  because all 55 are in New Zealand, so the fallback does the work. Original
  text kept below for the record.
  🗄 `[M][schema]` — `hours.js` computes open/closed in `Pacific/Auckland` and
  `temporal.js` reads the current date the same way (ADR 0006). A London venue
  would render open/closed against Wellington's clock, off by roughly half a
  day, with nothing on screen saying so. Needs an optional per-venue `timezone`
  (IANA) defaulting to `Pacific/Auckland`, `nzNow`/`todayNZ` taking a zone, an
  ADR superseding 0006, and the two visible strings that hard-code the claim —
  `Hours · NZ time` and *"Open/closed times are New Zealand time"* — becoming
  the venue's own zone. `viewerOnNzTime` generalises to a per-venue comparison.
