// The collection's own defaults — where Faves started, and what a record that
// says nothing about itself inherits.
//
// A leaf module on purpose: it imports nothing. `place.js`, `locale.js` and
// `lang.js` all need these three constants, and `place.js` needs `locale.js`
// while `locale.js` needs the currency — which is a cycle the moment they live
// in either of those files. (It was: the home screen died with "Cannot access
// HOME_CURRENCY before initialization" until these moved here.)
//
// These are NOT claims about the world. An unstated venue is not *presumed to
// be in New Zealand*; it is presumed to be like the records that existed when
// the collection began (ADR 0042, ADR 0043).

/** The timezone whose clock decides open/closed for a venue that states none. */
export const HOME_TIMEZONE = "Pacific/Auckland";

/** The currency a venue's prices are in when it states none. */
export const HOME_CURRENCY = "NZD";

/** The language a record's own name/desc/section strings are in by default. */
export const HOME_LANGUAGE = "en-NZ";
