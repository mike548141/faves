# 0161 — Google Maps is a source for opening hours on two chains

**Status:** accepted
**Date:** 2026-10-16
**Follows:**
[0037](0037-confidence-reads-both-ways.md) (details have their own reading) ·
[0054](0054-the-branch-offered-first-is-the-nearest-open-one.md)
(why the hours matter) ·
[0094](0094-a-close-before-its-open-means-the-next-day.md)
(how a close is read) ·
[0047](0047-the-app-ships-only-what-it-renders.md)
(what `site/data/` may carry)

## Context

No branch of McDonald's or Subway carried opening hours (roadmap `080/130`), which
left ADR 0054's "nearest, and open" rule unable to fire for either chain. Neither
chain's own pages could be read: McDonald's renders its weekly table only on a
genuine click, and Subway NZ has no readable first-party platform. Third-party
aggregators were refused in August because a false "open" sends someone across
town.

On 2026-10-03 the owner ruled option (c) of the item: a named third-party source
is acceptable for opening hours on these two chains, with its own provenance
value so the weaker basis is visible rather than laundered into first-party. He
named the source: each store's Google Maps listing. He extended it to closures
the same day. On 2026-10-16 he authorised a read-only session in his signed-in
Chrome, which is the only way Maps shows the weekly table.

## Decision

1. **`google-maps` is a value of `detailsVerifiedBy`, and of nothing else.** It
   speaks for **opening hours** (and, by the 2026-10-03 ruling, a closure
   status). Not phone, not address, not menu. `validate.py` fences it four ways,
   each with a mutation case in `tools/test_validate.py`:
   - on a **branch**, never as the venue's details (a venue-level value is the
     default every branch inherits, and a listing is read per place);
   - on **`mcdonalds` and `subway`** only (`HOURS_ONLY_VENUES`);
   - only on a branch that **has hours** to vouch for;
   - never as a menu `verifiedBy`, a price revision's method or a price
     channel's (`MENU_METHODS`).
2. **A listing is matched to our branch by address and by phone.** Where either
   disagrees, nothing is written. Subway's records hold no phone, so Subway is
   matched by address alone and says so in the record.
3. **It renders as what it is.** `temporal.js` carries the value in
   `VERIFY_METHODS` and `METHOD_PHRASE` and **not** in `TRUSTED_VERIFY_METHODS`.
   The menu's ⓘ says *"Opening hours at Tawa read from its Google Maps listing
   on 16 Oct 2026."* `detailsClaim()` makes the subject of that sentence <!-- datescan:allow: quoted on-screen copy, the reader-facing date format -->
   "Opening hours" for this method and the old "Phone, address and opening
   hours" for every other, so it cannot borrow credit for a phone it never saw.
   Where the menu was never read (all of McDonald's) the amber caution stays
   exactly as it was and the hours sentence is **added beside it**.
4. **A round-the-clock day is `["00:00", null]`.** The engine reads a null close
   as open to the end of the day with no countdown, and the next day opens at
   `00:00`, so no minute of the week is shut and the badge says "Open" at 03:00
   with no "until". `hours.js` `formatDay` reads that pair as "Open 24 hours"
   (it would otherwise print "12am–late", a different claim).
5. **Verbatim.** Hours are recorded exactly as Google printed them, including
   where we suspect Google is wrong. The date on the record is the date of the
   reading in UTC (2026-10-16); the venue's local date was the 17th, and the
   earlier date is the conservative direction for something that ages.
6. **The readings are kept in the repo, not the app:**
   `data/intake/maps-hours-readings.json` holds every listing read, matched or
   not, with what was printed. `site/data/` carries only the hours and the
   provenance pair, which the menu's ⓘ renders (ADR 0047's test).

## Rejected

- **A new key such as `hoursSource`.** It would be a second provenance mechanism
  beside one that already carries a date and a method, and would need its own
  screen to justify shipping.
- **Validating the value but not teaching `temporal.js`/`menu.js`.** Unknown
  methods render as "checked", which is the first-party voice. That is the
  laundering the owner ruled out.
- **Hours with no provenance on the site and the reading kept only in `data/`.**
  A shipped hour with no visible source.
- **`["00:00","23:59"]` for a 24-hour day.** Invents a one-minute shut gap.
  **`["00:00","00:00"]`** is refused as ambiguous (ADR 0094). **`"24:00"`** was
  declined there and still is.
- **Widening the exception to other chains or to Google Search.** The ruling
  names two chains and one source.
- **Correcting Google where it looks wrong** (Bunny Street, Friday, below).
  Recording something other than what the source said would make the provenance
  value a lie.

## Consequences

- Four branches gain hours: McDonald's Johnsonville (24 hours, all week) and
  Subway Johnsonville, Tawa and Karori.
- Six do not. Five are owner questions recorded on the roadmap item: McDonald's
  Bunny Street (Google's Friday "7 am–12 pm" closes at noon and contradicts the
  store's own window signage), Porirua (address and phone name two different
  stores), Courtenay Place (no matching listing), and Subway Courtenay Place and
  Mulgrave Street (street numbers differ from ours). The sixth, Lambton Quay,
  shows no hours while temporarily closed; its closure is already recorded and
  untouched.
- A Maps reading ages like any details reading; no decay limit exists for
  details yet (ADR 0037) and none is invented here.
- Any further chain needs its own ruling and a change to `HOURS_ONLY_VENUES`.
