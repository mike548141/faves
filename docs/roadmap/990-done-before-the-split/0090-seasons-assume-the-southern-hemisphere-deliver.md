- [x] ✅ **Seasons assume the southern hemisphere — DELIVERED, ticked 2026-08-16
  by audit.** `place.venueHemisphere()` derives north/south from the branch's or
  venue's latitude (never stored — a coordinate already answers it, and a stored
  copy can disagree with the pin); `seasonMonths`/`isAvailable`/`resolveRecord`
  all take a `hemisphere`, and `data.js` passes it on every load. Tested in
  `tests/place.test.js`. 🔎 One residue worth naming: `venueHemisphere` returns
  `null` for a coordless venue *so the caller can decline to guess*, and
  `data.js` then guesses `"south"` anyway. Defensible for an NZ-home collection,
  dishonest the day it isn't. Original text: `[XS][js]` — `temporal.js` maps
  `summer` to Dec–Feb, which inverts north of the equator. Smallest of the
  three, and it falls out of the timezone work: a zone implies a hemisphere.
