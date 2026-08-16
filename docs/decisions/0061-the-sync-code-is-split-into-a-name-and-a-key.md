# 0061 — The sync code is split into a name and a key

**Status:** accepted
**Date:** 2026-08-16
**Implements:** [ADR 0017](0017-cross-device-sync-encrypted-blob-bearer-code.md) —
the bearer sync-code and the E2E store. Nothing here reverses it; this records
the three choices 0017 left open and the one it named that we did not take.

## Context

ADR 0017 promises that neither Cloudflare nor the owner can read a user's data,
and rests that promise on a bearer sync-code plus `crypto.subtle`. It does not
say how the code becomes a key, how the code is generated or written down, or
what the server is told. Those are where the promise is actually kept or lost —
and the way it is lost is silent, because the app works perfectly either way.

## Decision

**The code does two jobs, so it is split into two derived secrets.** It is a
*claim* ("which blob is mine") and an *encryption key*. The claim must be sent
to the server, which has to know which key in KV to read. The encryption key
must never be. Using the code itself as either would hand the server the other.

So `deriveSyncKeys()` derives both from the code with **HKDF-SHA-256 under
different `info` labels**: a 128-bit `blobId` rendered as hex, and a 256-bit
non-extractable AES-GCM key. Different labels make the outputs independent, so
handing the id to Cloudflare on every request costs nothing. The Worker
validates that exact shape (`worker/sync-worker.js`) and never sees anything
else.

**The code is 65 bits, Crockford base32, with a mod-29 check symbol.**
`crypto.getRandomValues` only — this repo uses `Math.random()` for profile ids,
which is fine there and would be catastrophic here. 65 bits against 0017's ~44+
floor, because the keyspace is what makes online guessing infeasible and the
extra bits cost one typed character.

**The blob is `[version byte][12-byte IV][ciphertext‖tag]`**, AES-GCM, a fresh
random IV per seal. `openBlob` returns `null` — never throws — for a wrong key,
altered bytes, a truncated response or an unknown version, because all four are
ordinary conditions in a pairing flow rather than exceptions.

## Rejected

- **A word-list code**, which ADR 0017 suggested. A list large enough to carry
  this entropy in a few words is kilobytes shipped into a precache this repo
  holds under a 300 KB first-visit budget, and Crockford base32 is already
  unambiguous by construction (no I, L, O, U). Recorded so the deviation does
  not read as an oversight. Revisit if the code ever has to be read aloud.
- **Crockford's literal mod-37 check symbol.** Its remainders 32–36 map to
  `*~$=U`, so roughly one mint in seven produces punctuation in something people
  retype on a phone. Mod 29 keeps every check inside the existing alphabet;
  32 mod 29 = 3, and 3 is a primitive root mod 29 (order 28), so every
  transposition in a 13-character field changes the check. **The gap this leaves
  is named rather than glossed:** substitutions whose digit values differ by
  exactly 29 pass, which is 3 pairs out of 32. Mod 37 has no such gap.
- **PBKDF2 or Argon2 as the KDF.** Those exist to make *low-entropy* secrets
  expensive to guess. The code is machine-generated at 65 bits, so there is
  nothing to slow an attacker down for and a work factor only costs the user's
  phone time on every open. **This is contingent on 0017's rejection of a
  user-chosen passphrase**: if a user-chosen code is ever introduced, this must
  be revisited in the same change.
- **A per-user random HKDF salt.** It would have to live somewhere both devices
  can reach — the server — which means fetching it before we know which blob to
  fetch. The `info` labels already separate the two outputs and the input is
  high-entropy, which is what the salt would have been for.
- **An extractable key.** Nothing needs the raw bytes, so refusing to produce
  them means a future bug cannot log or transmit them. Defence in depth, not a
  guarantee — see 0017's honest limit on on-device encryption.

## Consequences

- **Neither derivation label may change without re-pairing every device**, since
  both the blob's name and its key move if either does. They are versioned in
  the string itself (`.v1`) so a future change is a deliberate migration.
- 🔎 **The test for the split was decorative when first written, and this is the
  reason the labels are exported.** All 13 tests passed with both labels set to
  the *same* string — i.e. with the server holding the decryption key. The test
  named for the separation derived a key from the blob id, which differs from
  the real key whether or not the labels match, so it asserted nothing. It now
  derives both HKDF streams by hand and compares them, and fails under that
  sabotage. **A property nothing can observe is a property nothing is
  guarding** — the labels are exported for testability and no other reason.
- **One assertion crosses the client/Worker boundary.** Both agree on the blobId
  shape in two files that cannot see each other; without a test that derives an
  id and runs it through the Worker's own validator, a change to either would
  ship a client that 400s on every request with both suites green. That very
  mismatch occurred during the build (a 64-char id assumed against a 32-char
  contract) and was caught by reading, not by a test — which is why there is now
  a test.
- **The Worker's compare-and-swap is not airtight and says so.** Workers KV is
  eventually consistent with no atomic CAS, so `If-Match` narrows the
  stale-clobber window without closing it. A Durable Object per blob is the real
  fix, named in the source so it is a known deferral rather than a discovery.
