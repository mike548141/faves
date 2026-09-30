// The user-data schema NUMBER, and the key this device records it under — split
// out of user-schema.js (roadmap 510/110) so that store.js can refuse a write
// from a tab whose build is behind storage. store.js is imported by
// user-schema.js, so it could not import the number from there without a
// cycle; both now import it from here. Imports nothing, reads nothing.
//
// user-schema.js re-exports both, and is still where the chain, its rules and
// its steps live. Bump `USER_SCHEMA` only together with a step there.

/** The shape of the whole personal layer (roadmap 510/040). Bump it only
 *  together with a step in user-schema.js `UPGRADE_STEPS` from the old number,
 *  and a fixture pair for the new one under tests/fixtures/. */
export const USER_SCHEMA = 1;

/** Where this device's local storage records the `USER_SCHEMA` its data is in. */
export const SCHEMA_KEY = "faves.schema.v1";

/**
 * Does a stored stamp say the data is in a NEWER schema than `build`? Only a
 * well-formed whole number counts: an absent stamp (a fresh device, or data
 * from before the number existed) and an unreadable one prove nothing, and the
 * startup upgrade leaves both of those alone too.
 */
export function stampAhead(raw, build = USER_SCHEMA) {
  if (raw == null) return false;
  const n = Number(raw);
  return Number.isInteger(n) && n > build;
}
