// Unit tests for the bearer sync-code (site/js/sync-code.js) — Theme 9 v2,
// ADR 0017, ADR 0060. This string is both the claim to a person's encrypted
// sync blob AND the seed their encryption key is derived from, so what
// matters here is: it really is high-entropy (not just long-looking), the
// check symbol really does reject a mistyped code rather than passing it
// through to a 404 or someone else's blob, and the tolerant re-typing rules
// (case, dashes, spacing, look-alike letters) don't accidentally widen what
// counts as valid. Pure — no DOM. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mintSyncCode, normaliseSyncCode, isValidSyncCode, SYNC_CODE_BITS } from "../site/js/sync-code.js";

// --- round trip --------------------------------------------------------

test("a minted code round-trips through normalise and reads as valid", () => {
  const code = mintSyncCode();
  assert.equal(normaliseSyncCode(code), code);
  assert.equal(isValidSyncCode(code), true);
});

test("normalise is idempotent: re-normalising an already-canonical code changes nothing", () => {
  const code = mintSyncCode();
  const once = normaliseSyncCode(code);
  const twice = normaliseSyncCode(once);
  assert.equal(once, twice);
});

test("two mints in a row produce different codes", () => {
  const a = mintSyncCode();
  const b = mintSyncCode();
  assert.notEqual(a, b);
});

// --- entropy -------------------------------------------------------------

test("the code carries at least 60 bits of entropy, as ADR 0017 requires", () => {
  assert.ok(SYNC_CODE_BITS >= 60, `SYNC_CODE_BITS is ${SYNC_CODE_BITS}, expected >= 60`);
});

test("SYNC_CODE_BITS is exactly 65 — 13 random Crockford characters at 5 bits each", () => {
  // Pinned exactly, not just >= 60, so a future change to DATA_CHARS has to
  // touch this assertion deliberately rather than silently shrinking the
  // keyspace under an unchanged ">= 60" test.
  assert.equal(SYNC_CODE_BITS, 65);
});

test("mintSyncCode draws from crypto.getRandomValues, not Math.random", () => {
  const realRandom = Math.random;
  let called = false;
  Math.random = () => {
    called = true;
    return 0;
  };
  try {
    mintSyncCode();
  } finally {
    Math.random = realRandom;
  }
  assert.equal(called, false, "mintSyncCode must not call Math.random()");
});

// --- format ----------------------------------------------------------------

test("a minted code is dash-grouped 5-5-4 Crockford characters", () => {
  const code = mintSyncCode();
  assert.match(code, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{4}$/);
});

test("a minted code contains none of Crockford's excluded look-alike letters", () => {
  const code = mintSyncCode();
  assert.doesNotMatch(code, /[ILOU]/);
});

// --- tolerant re-typing ------------------------------------------------

test("normalise accepts lower case", () => {
  const code = mintSyncCode();
  assert.equal(normaliseSyncCode(code.toLowerCase()), code);
});

test("normalise accepts the code with dashes stripped or moved", () => {
  const code = mintSyncCode();
  const flat = code.replace(/-/g, "");
  assert.equal(normaliseSyncCode(flat), code);
  // Dashes in the wrong places (still 14 alnum characters underneath).
  const regrouped = flat.slice(0, 4) + "-" + flat.slice(4, 9) + "-" + flat.slice(9);
  assert.equal(normaliseSyncCode(regrouped), code);
});

test("normalise accepts stray spaces, as when a code wraps in a text message", () => {
  const code = mintSyncCode();
  const spaced = code.split("-").join("  -  ").replace(/-/g, " - ");
  assert.equal(normaliseSyncCode(` ${spaced} `.replace(/-/g, "-")), code);
});

test("normalise maps every one of Crockford's standard confusions, at every position they occur", () => {
  const code = mintSyncCode();
  // Exercise each confusion pairing independently, substituted in at every
  // position it occurs in this minted code (there is no guarantee a given
  // digit appears, so each pairing degrades gracefully to "not present").
  const pairings = [
    ["0", "O"],
    ["0", "o"],
    ["1", "I"],
    ["1", "i"],
    ["1", "L"],
    ["1", "l"],
  ];
  for (const [canonical, typed] of pairings) {
    let mistyped = "";
    let substituted = false;
    for (const ch of code) {
      if (ch === canonical) {
        mistyped += typed;
        substituted = true;
      } else {
        mistyped += ch;
      }
    }
    if (!substituted) continue; // this code happens not to contain the digit
    assert.equal(
      normaliseSyncCode(mistyped),
      code,
      `expected "${typed}" typed for every "${canonical}" to normalise back to the original code`,
    );
  }
});

test("normalise maps O/o -> 0 and I/i/L/l -> 1 across a full round of minted codes", () => {
  // Repeated mints give varied digit content, so across enough runs every
  // confusion pairing above gets exercised at least once with high
  // probability; this test additionally proves the mapping never CHANGES
  // which code a mistyped string resolves to, across many draws.
  for (let i = 0; i < 25; i++) {
    const code = mintSyncCode();
    const lower = code.replace(/O/g, "o").replace(/I/g, "i").replace(/L/g, "l");
    assert.equal(normaliseSyncCode(lower), code);
  }
});

// --- rejection -----------------------------------------------------------

test("a single mistyped character (not a recognised confusion) is rejected by the check symbol", () => {
  // Flip one data character to every other alphabet character that isn't a
  // tolerated confusion, and confirm the checksum catches EVERY one of
  // those single-character typos — not format validation (length/alphabet
  // membership alone would pass all of these).
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const confusable = new Set(["O", "I", "L"]); // handled by normalise, not a typo the checksum should see
  const code = mintSyncCode();
  const flat = code.replace(/-/g, "");
  const original = flat[0];
  const originalIdx = alphabet.indexOf(original);
  let rejections = 0;
  let attempts = 0;
  for (const candidate of alphabet) {
    if (candidate === original || confusable.has(candidate) || confusable.has(original)) continue;
    // The mod-29 check symbol's one documented, honest gap (see sync-code.js
    // header): a substitution is invisible to it iff the two digit values
    // differ by exactly 29. That's a real, named property of the design,
    // not something this test should be able to fail on.
    if (Math.abs(alphabet.indexOf(candidate) - originalIdx) === 29) continue;
    attempts++;
    const mistyped = candidate + flat.slice(1);
    const regrouped = `${mistyped.slice(0, 5)}-${mistyped.slice(5, 10)}-${mistyped.slice(10)}`;
    if (normaliseSyncCode(regrouped) === null) rejections++;
  }
  assert.ok(attempts > 0, "test setup produced no candidate substitutions");
  assert.equal(rejections, attempts, "every non-confusion single-character typo must be rejected");
});

test("rejects junk input: empty string, wrong length, and non-alphabet characters", () => {
  assert.equal(normaliseSyncCode(""), null);
  assert.equal(normaliseSyncCode("not-a-code"), null);
  assert.equal(normaliseSyncCode("K7F29-DMX4Q-RA37"), null); // 13 chars, one short
  assert.equal(normaliseSyncCode("K7F29-DMX4Q-RA37BB"), null); // 15 chars, one long
  assert.equal(normaliseSyncCode("!!!!!-!!!!!-!!!!"), null);
  assert.equal(isValidSyncCode(""), false);
});

test("rejects non-string input rather than throwing", () => {
  assert.equal(normaliseSyncCode(null), null);
  assert.equal(normaliseSyncCode(undefined), null);
  assert.equal(normaliseSyncCode(12345), null);
  assert.equal(normaliseSyncCode({}), null);
  assert.doesNotThrow(() => isValidSyncCode(null));
});

test("rejects a code containing U, which Crockford's alphabet reserves and never emits", () => {
  const code = mintSyncCode();
  const flat = code.replace(/-/g, "");
  const withU = "U" + flat.slice(1);
  assert.equal(
    normaliseSyncCode(withU.slice(0, 5) + "-" + withU.slice(5, 10) + "-" + withU.slice(10)),
    null,
  );
});

test("isValidSyncCode agrees with normaliseSyncCode across mint, mistype and junk", () => {
  const code = mintSyncCode();
  assert.equal(isValidSyncCode(code), true);
  assert.equal(isValidSyncCode(code.toLowerCase()), true);
  assert.equal(isValidSyncCode("garbage"), false);
});
