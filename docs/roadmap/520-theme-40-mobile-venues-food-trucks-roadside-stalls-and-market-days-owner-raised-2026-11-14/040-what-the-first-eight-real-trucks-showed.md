- [ ] **What the first eight real trucks showed, and the two model gaps they prove**
      `[M][schema][ux][data]` — owner-raised 2026-11-14: *"Look at the design to
      see if faves data or general architecture needs to be extended at all to
      support these mobile food locations and temporary sites. And add the food
      trucks that are in the menu"* — from his own photographs, Frank Kitts Park,
      Saturday 2026-11-14, 15:38–15:42 NZDT. ⚑ Two owner calls; the data is in.

  **What landed the same day, under today's schema (no model change).** Eight
  records, each a single pitch at Frank Kitts Park with `hours: null`,
  `verifiedBy: in-store` and `detailsVerified` on the photo date:
  `yalla-fried-chicken`, `nonys-coffee-and-gelato`, `rock-yard-food-truck`,
  `taj-on-wheels`, `ah-mas-kitchen`, `garuda-truck`, `baxters-catering`,
  `ngon-spot`. That is `010`'s option 1 **minus the invented week**: one photo
  is evidence of a sighting, never of a timetable, so no hours were written.
  The coordinate is Frank Kitts Park's own (geocoded, never the photos' GPS).

  **What the photographs say, counted from the eight:**

  | Finding | Trucks | What it strains |
  |---|---|---|
  | No hours, days or schedule on the truck | 8 of 8 | the week model (`010`) |
  | A mobile arm of a fixed restaurant, with its **own shorter menu at its own prices** | 2 (Rock Yard, already in Faves; Taj on Wheels, of Taj Restaurants) | ADR 0011: branches share **one** menu |
  | Says it caters events | 3 (Rock Yard, Taj, Baxters) | where it is next is driven by bookings, not a week |
  | A truck-wide dietary banner that names no dish (*"Halal \| Gluten Free \| Dairy Free \| Vegan"*) | 1 (Garuda) | tags are dish-level; nothing holds a venue-level claim |
  | Two price boards disagreeing on the same day | 2 (Rock Yard roti $14/$13; Taj chicken tikka wrap $18/$20) | nothing new: written `null` + `needs` |
  | Eight trucks at one public place at once | the whole set | `030`'s "is a site a place?" |

  **Gap 1 — the contact card states the pitch as permanent.** The menu screen
  shows *"Pickup · Frank Kitts Park, Wellington waterfront"*, exactly as it
  would for a shop. Nothing on screen says *seen here on 14 Nov*. This is the
  smallest true thing `010`'s dated spot would carry, and it argues for a spot
  shape that admits a **sighting** — date, time seen, place, source — beside
  an **announced window**, because a sighting is the only kind of spot the
  first eight trucks gave us. Options: (a) build `010` option 2 with a
  sighting variant; (b) a cheaper interim, a branch `note`-like line (*"Seen
  trading here"* and the sighting's date) with no resolution logic; (c) leave
  it until a truck's schedule is known. **Recommendation: (a)**, because (b)
  is prose a phone cannot age and (c) leaves eight records saying something
  stronger than their evidence.

  **Gap 2 — a restaurant's truck is a branch with a different menu.** Rock
  Yard Food Truck sells seven dishes. Three share a name with the restaurant
  record's (baguette, vermicelli, roti rolls), three more are near variants
  (popcorn chicken, pork & prawn dumplings, spring rolls), and one is not on
  the restaurant menu at all (Saigon fried rice). Prices differ: vermicelli is
  $14 at the truck and $17 (lunch) or $29 in the restaurant; roti rolls $14 or
  $13 against $15; the baguette is $13 at both. Folding it in as a branch
  today would show the truck the restaurant's menu and prices, which is wrong;
  so it is its **own record** for now. Options: (a) per-branch menus — the
  branch names which menu it serves, which is Theme 30's "menus, plural"
  (`370`) arriving from a second direction; (b) keep trucks as separate
  records and link them to the parent (`formerIds` and `renames.js` already
  let a later merge keep hearts); (c) treat the truck as the restaurant's
  branch and accept the wrong prices. **Recommendation: (b) now, (a) when
  Theme 30 is taken** — (c) breaks the one thing the app promises, the price
  at the counter.

  **Also done in this session, because the intake needed it:**
  `tools/intake_exif.py` now reads EXIF from **HEIC**. It listed `.heic` as
  intake material and read nothing from it, so every photo taken straight from
  the Photos library came back undated and `check_provenance.py` called a
  same-day reading "unbounded". Verified against macOS's own HEIC→JPEG
  conversion on all 19 photos: capture date, time, offset, device and GPS
  identical.

  **Owner calls (put to him in the session; not decided here):**
  1. ⚑ Gap 1's shape — a sighting-capable dated spot (recommended), the
     interim line, or wait.
  2. ⚑ Gap 2 — Rock Yard's truck as its own record (as landed) until per-branch
     menus exist, or folded into the restaurant.
  3. ⚑ A **"Food truck"** vibe (`site/js/vibes.js`, closed vocabulary, ADR
     0084) so a reader can filter for them — not added, because extending a
     closed vocabulary is his call.
