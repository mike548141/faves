// A dish's identity, and the one place anything resolves one.
//
// The dish-level twin of `renames.js`, and deliberately the same shape: one
// resolver, canonical before the lookup, a non-destructive rewrite on read, and
// a `validate.py` gate holding the data and this module in step.
//
// WHY a dish needs an id at all. A dish's `name` was doing four jobs at once
// (ADR 0044 called the name "its identity"; ADR 0051 replaces that):
//
//   URL anchor      `#dish-<slug(name)>`   — a rename 404s every shared link
//   Pick reference  `picks: ["Bastard"]`   — the pick silently stops matching
//   Stored heart    `d:<venueId> <name>`   — detaches, on every family phone
//   Stored rating   `d:<venueId> <name>`   — same
//   Order line      `<venueId>\n<name>\n…` — and this one costs money
//
// Three of those five fail silently. Worse, `slug(name)` is not unique WITHIN a
// venue and never was: measured 2026-08-16, 10 slugs collide across 22 rows in
// 3 records, every collision at a different price. Sprig & Fern prints
// `Cheeseburger` three times — Mains $28, Gold Card $21, Kids $15 — so the
// anchor reached only the first, one heart covered all three, and the order
// tally charged $56 for a $49 pair.
//
// REQUIRED IN THE DATA; DEFAULTED EVERYWHERE ELSE. Those are two different
// rules and the distinction is the whole design, so state both:
//
//   • In `site/data/`, `dishId` is REQUIRED and `validate.py` refuses a dish
//     without one. It was seeded once from `slug(name)` (tools/seed_dish_ids.py,
//     1743 rows) precisely so it would STOP being a function of the name — a
//     derived id moves when the shop renames a dish, and a moved id drops the
//     heart, rating, shared link and order line pointing at it. The owner ruled
//     on 2026-08-16 that must never happen again, so the id is now a stored
//     fact sitting on the line under the name a transcriber is about to edit.
//     Nothing moved on the day it was seeded: every row was written the id it
//     already resolved to.
//
//   • In `dishId()` below, the `slug(name)` fallback STAYS, and is not dead
//     code. It reads two things the repo does not control: entries stored on a
//     family phone (a heart saved before ids existed carries only a name), and
//     ids decoded out of a shared link. Both must keep resolving to what they
//     always meant, which is why hearts needed no migration.
//
// The 22 rows that collided under the old derived scheme (10 slugs across 3
// records, every collision at a different price — see above) are the only ones
// whose behaviour ever changed, and only the 2nd and 3rd of each: what moved was
// an anchor that could never be reached and a heart that was always the other
// dish's.
//
// FORMER IDS, not former names. When a shop renames a dish, pin its `dishId` to
// what it already was and the id never moves at all. `formerIds: []` is for the
// other case — an id that genuinely had to change — and it is named `formerIds`
// to match `formerIds` on a venue, because an old shared link and an old stored
// key both hold a *slug*, never a display name. (ADR 0051 records the deviation:
// the roadmap proposed `formerNames`.)

import { slug } from "./slug.js";

/**
 * The id of a dish, from its record. `dishId` where the data gives one,
 * `slug(name)` otherwise.
 *
 * Every dish in `site/data/` gives one — the field is required there and seeded
 * (see the header). The fallback is for what the repo cannot reach: stored
 * personal entries (`{ type, venueId, name, dishId? }`) saved on a phone before
 * ids existed, and ids decoded out of an old shared link. Both fall through to
 * the same `slug(name)` their key was always built from, which is why hearts
 * needed no migration. Removing it would silently orphan them.
 */
export function dishId(item) {
  if (!item || typeof item !== "object") return "";
  if (typeof item.dishId === "string" && item.dishId) return item.dishId;
  return typeof item.name === "string" ? slug(item.name) : "";
}

/**
 * Every dish in a record, flattened, each with the section that holds it.
 * Sections hidden from the menu (`addOnsOnly`, ADR 0049) are included: a row
 * that isn't rendered still has to answer to a link, a heart and a rating.
 */
export function eachDish(record) {
  const out = [];
  for (const section of record?.menu || [])
    for (const item of section?.items || []) out.push({ section, item });
  return out;
}

/**
 * Find a dish in a record by id, name, or a former id — the single resolver
 * every consumer goes through, so nobody learns a second way to point at a dish.
 *
 * Match order is deliberate and the reason is silent-failure: a LIVE id always
 * beats another dish's former one, so retiring an id can never hijack a link to
 * a dish that still exists. Names are tried last for the same reason — `picks`
 * are written as names, and a name must never outrank an explicit id.
 *
 * Returns `{ section, item }` or `null`. Ambiguity is not resolved here (the
 * first match wins, as it always did); `validate.py` refuses to ship data that
 * is ambiguous, which is the honest place to catch it.
 */
export function findDish(record, ref) {
  if (typeof ref !== "string" || !ref) return null;
  const dishes = eachDish(record);
  const as = slug(ref);
  for (const d of dishes) if (dishId(d.item) === ref) return d;
  for (const d of dishes) if (dishId(d.item) === as) return d;
  for (const d of dishes) if (d.item?.name === ref) return d;
  for (const d of dishes) {
    const former = d.item?.formerIds;
    if (Array.isArray(former) && (former.includes(ref) || former.includes(as)))
      return d;
  }
  return null;
}

/**
 * Rewrite the dish half of stored favourites/ratings keys from a dish NAME to a
 * dish id: `d:<venueId> Fish and Chips` → `d:<venueId> fish-and-chips`.
 *
 * Safe to run on every read, forever, for two reasons worth stating:
 *
 *  - `slug` is idempotent, so a key already in id form is returned unchanged.
 *    There is no "have I migrated yet" flag to get wrong, and no one-way door.
 *  - It cannot merge two hearts that were distinct. Measured across the whole
 *    corpus on 2026-08-16: within a venue, no two DIFFERENT dish names slug to
 *    the same value. Every slug collision that exists is a genuine duplicate
 *    name, which shared one key already.
 *
 * Venue-level migration (`migrateRatingKeys` in renames.js) runs FIRST — this
 * one leaves the venue id alone, so composing them in either order would work,
 * but running renames first keeps each module's regex answering for its own half.
 *
 * A collision keeps the entry ALREADY in id form, matching renames.js: it was
 * written more recently, by a build that understood ids.
 */
export function migrateDishKeys(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return map;
  let moved = false;
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const m = /^d:([^\s]+) (.+)$/s.exec(key);
    if (!m) {
      out[key] = value; // `v:` keys and anything unrecognised are left alone
      continue;
    }
    const [, venueId, rest] = m;
    const id = slug(rest);
    if (!id || id === rest) {
      out[key] = value;
      continue;
    }
    moved = true;
    const next = `d:${venueId} ${id}`;
    if (!(next in map)) out[next] = value;
  }
  return moved ? out : map;
}
