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
