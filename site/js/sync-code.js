// The bearer sync-code (Theme 9 v2, ADR 0017, ADR 0060) — the secret a
// person carries from one device to another to pair cross-device sync. It
// does two jobs at once (ADR 0017's "claim mechanism" addendum): it is the
// CLAIM ("which encrypted blob in the Worker's KV store is mine") and it is
// the SEED the E2E encryption key is derived from (in sync-crypto.js). Its
// entropy is therefore the whole security of the feature — anyone who
// reads or guesses this string can read and write the same blob.
//
// Pure and DOM-free: no storage, no network, no crypto.subtle. Just string
// <-> string. Tests run under `node --test`.
//
// --- Deviation from ADR 0017: Crockford base32, not a word-list ------------
// ADR 0017 suggests "friendly word-codes". We ship Crockford base32
// (digits + unambiguous letters) instead. This is a deliberate deviation,
// not an oversight: a word-list long enough to carry ~60+ bits per
// reasonably-short code needs a dictionary of several thousand words to
// keep the code short, and that dictionary ships as JSON/JS inside the
// precached app shell — CLAUDE.md's 300 KB first-visit budget has no room
// for it, and ADR 0047 says the app ships only what it renders. Crockford's
// alphabet is a fixed 32-character string (this file, no data file) and is
// already unambiguous by construction: it drops 0/O, 1/I/L, and U (reserved
// so accidental substrings don't spell something unfortunate), so the
// characters left over don't get confused for one another when read aloud
// or handwritten. See https://www.crockford.com/base32.html.
//
// --- Randomness -------------------------------------------------------------
// Generated ONLY from crypto.getRandomValues (a CSPRNG). The rest of this
// repo uses Math.random() for profile/order ids (favourites.js, profiles.js,
// personal-data.js) and that is fine there — an id only needs to be
// distinct, not unguessable, and nothing sensitive hangs off it. A sync
// code is different in kind: it is a bearer credential to another person's
// data, so a predictable PRNG (Math.random() is NOT cryptographically
// secure, and V8's implementation is a public, reconstructible xorshift
// state) would make codes/blobs guessable. Do not "simplify" this to
// Math.random() later.
//
// --- Entropy -----------------------------------------------------------
// 13 random Crockford characters at 5 bits each = 65 bits (SYNC_CODE_BITS
// below). ADR 0017 asks for "~44+ bits"; the KV keyspace must not be
// enumerable so we go well past that floor — 65 bits is astronomically
// unguessable (2^65 ≈ 3.7×10^19 codes) at essentially zero UX cost: one
// extra character over a 60-bit (12-char) code. A 14th, non-random
// character (the check symbol, below) is appended for display/validation
// but carries no entropy of its own — it is fully determined by the 13
// data characters, so it is deliberately NOT counted in SYNC_CODE_BITS.
//
// --- Display format ----------------------------------------------------
// 14 characters (13 data + 1 check), grouped 5-5-4 and dash-joined, e.g.
// "K7F29-DMX4Q-RA37B". 14 doesn't split into groups of *only* 4s (4×3=12,
// 4×4=16) or *only* 5s (5×2=10, 5×3=15), so it's a 5-5-4 mix — still inside
// the brief's "groups of 4 or 5", just not uniform.
//
// --- Check symbol --------------------------------------------------------
// Crockford defines an optional mod-37 check symbol: read the data as one
// big base-32 integer, take it mod 37, and encode the remainder (0-36)
// using the 32-symbol alphabet plus five extra symbols ("*~$=U") for
// remainders 32-36. We use a DOCUMENTED EQUIVALENT instead: mod 29.
//
// Why 29, not 37, and why it's not a downgrade in the way it looks:
//   - 29 is prime and coprime with 32 (the alphabet size), same as 37 —
//     that's what gives a checksum good error-detection properties in the
//     first place (see checkSymbol() below for how).
//   - Crucially, 29 < 32, so every possible remainder (0-28) already has a
//     symbol in the *existing* alphabet. No extra symbols needed — no
//     punctuation, no reuse of a letter (like Crockford's own reuse of the
//     excluded "U") that would sit oddly in a code otherwise built from a
//     deliberately unambiguous 32-symbol set. For a code a person types on
//     a phone keyboard, "*", "~", "$" and "=" are a worse typing experience
//     than the digits/letters either side of them, on a roughly 1-in-7
//     chance (5/37) per minted code. Staying inside the 32-symbol alphabet
//     avoids that entirely.
//   - The cost: 32 mod 29 = 3, and 3 has multiplicative order 28 modulo 29
//     (28 = 29-1, so 3 is a primitive root — verified by direct computation,
//     not assumed). That means 32^i mod 29 takes 28 distinct values before
//     repeating, so for our 13-character data field (positions 0..12, all
//     well inside that period) swapping any two DIFFERENT-valued characters,
//     adjacent or not, always changes the checksum — every transposition is
//     caught. Single-character substitutions are caught unless the two
//     digit values differ by exactly 29 (three such pairs exist among the
//     32 possible values: 0<->29, 1<->30, 2<->31) — a small, honestly-named
//     gap true mod-37 doesn't have (max digit difference is 31, so 37 never
//     divides it). That gap is a fair trade for never asking someone to
//     type "*" or "$" as part of a bearer code.

/** Crockford's base32 alphabet: 0-9 and A-Z minus I, L, O, U. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const DATA_CHARS = 13; // random characters -> the code's actual entropy
const CHECK_CHARS = 1; // one derived check character, see above
const TOTAL_CHARS = DATA_CHARS + CHECK_CHARS;
const GROUP_SIZES = [5, 5, 4]; // 14 chars, no all-4 or all-5 split exists

/** The code's real entropy in bits. Asserted directly by a test. */
export const SYNC_CODE_BITS = DATA_CHARS * 5; // 65

const CHECK_MODULUS = 29n;

/** Derive the single check character for a run of Crockford data characters. */
function checkSymbol(dataChars) {
  let value = 0n;
  for (const ch of dataChars) {
    value = value * 32n + BigInt(ALPHABET.indexOf(ch));
  }
  return ALPHABET[Number(value % CHECK_MODULUS)];
}

/** Group a flat run of characters as GROUP_SIZES, dash-joined. */
function formatGroups(flat) {
  const groups = [];
  let i = 0;
  for (const size of GROUP_SIZES) {
    groups.push(flat.slice(i, i + size));
    i += size;
  }
  return groups.join("-");
}

/**
 * Mint a fresh sync code: 13 CSPRNG characters + 1 check character,
 * formatted for display. Every call is independent — nothing is reused or
 * derived from a previous code.
 */
export function mintSyncCode() {
  const bytes = new Uint8Array(DATA_CHARS);
  crypto.getRandomValues(bytes);
  // Each byte is uniform over 0-255, and 256 is an exact multiple of 32
  // (=8), so masking to the low 5 bits (`& 0x1f`) is uniform over 0-31 with
  // zero modulo bias — no rejection sampling needed.
  const data = Array.from(bytes, (b) => ALPHABET[b & 0x1f]).join("");
  return formatGroups(data + checkSymbol(data));
}

/**
 * Tolerantly parse whatever a person typed or pasted back into the
 * canonical, dash-grouped, upper-case form — or null if it isn't a
 * well-formed, checksum-valid sync code.
 */
export function normaliseSyncCode(input) {
  if (typeof input !== "string") return null;

  let flat = input.toUpperCase();
  flat = flat.replace(/[\s-]+/g, ""); // drop dashes/whitespace from retyping
  // Crockford's standard look-alike confusions: these letters are excluded
  // from the alphabet precisely so a person can retype the digit they
  // resemble, and a code is not "wrong" just because someone did.
  flat = flat.replace(/[IL]/g, "1").replace(/O/g, "0");

  if (flat.length !== TOTAL_CHARS) return null;
  for (const ch of flat) {
    if (!ALPHABET.includes(ch)) return null;
  }

  const data = flat.slice(0, DATA_CHARS);
  const check = flat.slice(DATA_CHARS);
  if (checkSymbol(data) !== check) return null; // catches mistypes locally,
  // before ever asking the Worker for a blob that either doesn't exist or —
  // worse — silently belongs to someone else.

  return formatGroups(flat);
}

/** Whether `input` normalises to a well-formed sync code. */
export function isValidSyncCode(input) {
  return normaliseSyncCode(input) !== null;
}
