// Venue ids that have changed, and the one place anything resolves an old one.
//
// A venue id is not private plumbing: it is in every shared link, every
// bookmark, and every heart, rating and order line stored on a family phone.
// So an id can be corrected — but it can never simply be *replaced*, or a
// link someone sent last week 404s and their favourites quietly detach from
// the venue they belong to. Both failures are silent, which is what makes them
// worth the twenty lines below.
//
// 2026-08-16: five records carried a suburb in a national chain's name —
// "BurgerFuel Johnsonville", "Hell Pizza Newlands". That is a *branch*, and the
// data model has had branches since ADR 0011; the suburb belongs in
// `locations[].label`, not in the name or the id. "Takeaway @ Churton" and
// "Khandallah Trading Company" keep theirs, because there the place name really
// does contain the place (owner, 2026-08-16).
//
// 2026-08-16, later the same day: the Sprig + Fern entry is REVERSED. The
// taverns turned out to be separate franchises with separate kitchens and
// different food menus, so one shared record was showing Tawa's allergen tags
// against four kitchens that don't cook that food; the owner ruled one record
// per tavern. The suburb there is not a branch label — it is the venue. So Tawa
// takes its own id back and the entry flips to point the other way. It is
// REPLACED, never added alongside: two entries pointing at each other is a
// cycle, and the live id must never appear as a KEY here or it would resolve
// away from itself before the record is ever fetched.
//
// The map is written here rather than derived from each record's `formerIds`
// because it has to answer BEFORE any record is fetched — resolving
// `restaurant.html?id=<old>` is what decides which file to ask for. `formerIds`
// stays on the records as the human-readable half of the same fact, and
// `validate.py` holds the two in step so neither can drift.

export const RENAMED = Object.freeze({
  "burgerfuel-johnsonville": "burgerfuel",
  "noodle-canteen-johnsonville": "noodle-canteen",
  "hell-pizza-newlands": "hell-pizza",
  "pizza-hut-johnsonville": "pizza-hut",
  "sprig-and-fern": "sprig-and-fern-tawa",
});

/**
 * The current id for a venue id of any age. Unknown ids pass straight through —
 * this resolves renames, it does not validate existence.
 *
 * Deliberately single-hop, not a chain-follower: a rename OF a rename should be
 * written here as one entry pointing at the final id, so that a cycle in the
 * table can never become an infinite loop at boot.
 */
export function canonicalVenueId(id) {
  return (typeof id === "string" && RENAMED[id]) || id;
}

/**
 * Rewrite the `venueId` on stored personal entries (favourites, order lines) to
 * their current ids. Non-destructive: entries whose id hasn't moved are returned
 * as-is, and nothing is dropped — an entry for a venue we no longer hold keeps
 * its id and simply stops matching, exactly as it did before.
 */
export function migrateEntries(entries) {
  if (!Array.isArray(entries)) return entries;
  return entries.map((e) => {
    const id = canonicalVenueId(e?.venueId);
    return id === e?.venueId ? e : { ...e, venueId: id };
  });
}

/**
 * The same for the favourites/ratings key shape, which is not a bare id:
 *   `v:<venueId>`            a hearted/rated venue
 *   `d:<venueId> <dishName>` a hearted/rated dish
 * (`favKey` in favourites.js and `ratingKey` in ratings.js build both.)
 *
 * A collision — an entry already under the new id — keeps the NEW one. The
 * renamed venue is the same shop, so the two entries describe the same thing,
 * and preferring what the viewer set most recently is the honest tiebreak.
 */
export function migrateRatingKeys(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return map;
  let moved = false;
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const m = /^([vd]):([^\s]+)(.*)$/s.exec(key);
    if (!m) {
      out[key] = value;
      continue;
    }
    const [, kind, id, rest] = m;
    const canonical = canonicalVenueId(id);
    if (canonical === id) {
      out[key] = value;
      continue;
    }
    moved = true;
    const next = `${kind}:${canonical}${rest}`;
    if (!(next in map)) out[next] = value; // never clobber a newer entry
  }
  return moved ? out : map;
}
