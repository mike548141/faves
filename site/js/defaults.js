// Product defaults that more than one module needs, in a leaf module.
//
// Another cycle-breaker, same shape as `home.js`: `settings.js` needs these two
// numbers as its defaults, `ranking.js` needs them as its own, and `ranking.js`
// also needs `place.js`, which needs `settings.js`. Owning them here means
// nothing on that path imports anything on that path. (Without this, the
// ranking tests died with "Cannot access FAV_BOOST_KM before initialization".)

/**
 * Straight-line km beyond which a venue is "another town" — 50 km keeps a whole
 * metropolitan region reachable while catching a favourite in another city or
 * country. Only applies when we know the viewer's location.
 */
export const FAR_KM = 50;

/**
 * How much nearer a favourite is treated as being. A legacy Near-me distance
 * boost that the 2026-07-23 owner ruling neutralised for ranking; it survives
 * as the "show a place's branches within" dial (see settings.js).
 */
export const FAV_BOOST_KM = 10;

/**
 * The band inside which two venues count as "the same sort of distance away",
 * so a heart may break the tie between them (ranking.js). 400 m — a couple of
 * blocks, which is the size the owner asked for: *"where distance is similar
 * (say a few hundred metres) the favourite would push one restaurant above
 * another"*.
 *
 * It is a **separate constant from `FAV_BOOST_KM`, not a re-tuning of it**, for
 * two independent reasons (ADR 0068, findings 1–2):
 *  - `FAV_BOOST_KM` is no longer a favourites dial at all. Since 2026-07-23 it
 *    is the branch-proximity cutoff behind Settings' "Show branches within",
 *    and it keeps its 10 km because dropping that to 0.4 would hide almost
 *    every branch of every chain. Its storage key kept the old name so saved
 *    values wouldn't reset; the `#!##` in settings.js tracks the rename.
 *  - 10 km was a *preference weighting* ("a favourite 8 km away beats a plain
 *    place 2 km away"), not a tiebreak. This number has to be small enough
 *    that the heart can only ever separate near-equals.
 */
export const FAV_TIE_KM = 0.4;
