// End-to-end encryption for the cross-device sync blob (ROADMAP Theme 9 v2,
// ADR 0017; the merge that consumes the plaintext is ADR 0060). Pure WebCrypto,
// no dependencies, no DOM — `crypto.subtle` is the whole toolchain.
//
// THE ONE PROPERTY THIS FILE EXISTS TO HOLD: the sync code never reaches the
// server, and nothing the server holds can be turned back into a person's data.
// ADR 0017 promises the owner and Cloudflare cannot read a user's favourites.
// That promise is not a policy here, it is arithmetic — but only if the code is
// split correctly, which is the subtle part and the reason this is one module
// rather than three call sites.
//
// THE SPLIT. The sync code does two jobs, and handing the same bytes to both
// would give the whole thing away:
//   • CLAIM  — "which blob is mine". The server must be told this, because it
//     has to know which key in KV to read.
//   • ENCRYPT — the secret the blob is sealed with. The server must NEVER see
//     this, or it can read everything it stores.
// So the code is never used directly as either. Both are derived from it by
// HKDF-SHA-256 with *different* `info` strings, which makes them independent:
// holding the blob id tells you nothing about the encryption key, so handing
// the id to Cloudflare on every request costs nothing. Deriving them with the
// same info — or using the raw code as the KV key — would hand the server the
// decryption key on every single request, and the failure would be invisible:
// the app would work perfectly and the promise would simply be false.
//
// WHY HKDF AND NOT PBKDF2/ARGON2. Those exist to make *low-entropy* secrets
// expensive to guess. This code is machine-generated at 60+ bits from
// `crypto.getRandomValues` (sync-code.js), so there is nothing to slow an
// attacker down for — a work factor here would only cost the user's phone time
// on every open. ADR 0017 rejected a user-chosen passphrase for exactly this
// reason, and that rejection is what makes a cheap KDF the right one. If a
// user-chosen code is ever introduced, this choice must be revisited in the
// same change.
//
// WHAT THIS DELIBERATELY DOES NOT CLAIM. On-device at-rest encryption is the
// platform's job (ADR 0017's honest-limit consequence). Everything here
// protects the blob *off* the device. A page that can decrypt on load can be
// decrypted by anyone holding the unlocked phone, and no amount of WebCrypto
// changes that.

/** AES-GCM's nonce. 96 bits is the size the mode is specified for; anything
 *  else forces an internal re-hash and buys nothing. Random per seal — and it
 *  MUST be, because a repeated nonce under one key breaks GCM outright. */
const IV_BYTES = 12;

/** Version byte on the wire, so the envelope can change without a device that
 *  has not updated yet silently mis-reading a newer blob as corrupt. `open()`
 *  refuses an unknown version rather than guessing at it. */
export const BLOB_FORMAT = 1;

const enc = new TextEncoder();
const dec = new TextDecoder();

/** The two derivation labels. They are constants, and they are *different* —
 *  that difference is the whole separation described in the header, so neither
 *  string may be changed without re-pairing every device in the world.
 *
 *  EXPORTED SO THE SEPARATION CAN BE TESTED, and for no other reason. They are
 *  not secrets (they are in the shipped source either way). The first version of
 *  this module kept them private and the test suite "covering" the separation
 *  passed with both labels set to the SAME string — it derived a key from the
 *  blob id, which differs from the real key whether or not the labels match, so
 *  it was asserting nothing. A property nothing can observe is a property
 *  nothing is guarding. */
export const INFO_BLOB_ID = "faves.sync.blob-id.v1";
export const INFO_ENC_KEY = "faves.sync.enc-key.v1";
/** Exported for the same reason: the separation test has to derive by hand. */
export const SALT_LABEL = "faves.sync.v1";

/** A fixed salt. HKDF's salt exists to decorrelate derivations across contexts;
 *  it is not a secret and does not need to be random here, because the `info`
 *  strings already separate the two outputs and the input keying material is
 *  high-entropy to begin with. A per-user random salt would have to be stored
 *  somewhere both devices can reach — which is the server, which would mean
 *  fetching it before we know which blob to fetch. */
const SALT = enc.encode(SALT_LABEL);

function subtle() {
  const c = globalThis.crypto;
  // Named rather than left to throw as "cannot read property of undefined":
  // `crypto.subtle` is undefined on an insecure origin, so the realistic way to
  // meet this is someone serving the site over plain http on a LAN address, and
  // the message should point at that rather than look like a code fault.
  if (!c?.subtle) {
    throw new Error("Web Crypto is unavailable — sync needs a secure context (https, or localhost).");
  }
  return c.subtle;
}

/** Bytes → lowercase hex. Used only for the blob id, which is a URL path
 *  segment: hex is unambiguous in a path, needs no escaping, and matches the
 *  strict charset the Worker validates against before it touches KV. */
function toHex(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/**
 * Derive the pair of secrets from a sync code.
 *
 * Returns `{ blobId, key }` — `blobId` a 32-character hex string safe to put in
 * a URL and hand to the server, `key` a **non-extractable** AES-GCM CryptoKey.
 * Non-extractable is deliberate: nothing in the app ever needs the raw key
 * bytes, so refusing to produce them means a future bug cannot log or transmit
 * them. It is defence in depth, not a guarantee — see the header on what
 * on-device encryption cannot claim.
 *
 * `code` must be the canonical form from `normaliseSyncCode()`. Passing the
 * display form with its dashes would derive a *different* pair and silently
 * fail to find the user's blob, so the caller normalises first.
 */
export async function deriveSyncKeys(code) {
  if (typeof code !== "string" || !code) throw new Error("A sync code is required.");
  const s = subtle();
  const material = await s.importKey("raw", enc.encode(code), "HKDF", false, ["deriveBits", "deriveKey"]);

  // 128 bits of blob id. Far more than needed to avoid collisions, and the
  // point is not collisions: it is that the keyspace must be far too large to
  // sweep, because every valid id is somebody's (encrypted) data.
  const idBits = await s.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info: enc.encode(INFO_BLOB_ID) },
    material,
    128
  );

  const key = await s.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info: enc.encode(INFO_ENC_KEY) },
    material,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );

  return { blobId: toHex(new Uint8Array(idBits)), key };
}

/**
 * Seal a personal-layer snapshot into the bytes that go to the server.
 *
 * Wire shape: `[version byte][12-byte IV][ciphertext‖tag]`. The IV travels in
 * the clear, which is correct for GCM — it must be unique, not secret — and it
 * is generated fresh for every seal. Reusing one under the same key would let
 * an observer recover the XOR of two blobs, so it is never derived, never
 * counted, never cached.
 */
export async function sealBlob(key, data) {
  const s = subtle();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = enc.encode(JSON.stringify(data));
  const ct = new Uint8Array(await s.encrypt({ name: "AES-GCM", iv }, key, plaintext));

  const out = new Uint8Array(1 + IV_BYTES + ct.length);
  out[0] = BLOB_FORMAT;
  out.set(iv, 1);
  out.set(ct, 1 + IV_BYTES);
  return out;
}

/**
 * Open bytes fetched from the server. Returns the snapshot, or **null** for
 * anything that does not authenticate.
 *
 * Null rather than throw, and the distinction matters: the realistic causes are
 * a wrong sync code (the user typed someone else's, or their own with a typo
 * the check symbol happened to pass) and a truncated response — both of which
 * are ordinary conditions the pairing flow has to handle as "that didn't work",
 * not exceptions. GCM's tag is what makes this safe to be lenient about: a blob
 * that has been altered by so much as one bit fails to authenticate and lands
 * here, so a tampered blob can never be parsed as JSON at all.
 */
export async function openBlob(key, bytes) {
  const s = subtle();
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (buf.length <= 1 + IV_BYTES) return null;
  if (buf[0] !== BLOB_FORMAT) return null;

  const iv = buf.subarray(1, 1 + IV_BYTES);
  const ct = buf.subarray(1 + IV_BYTES);
  try {
    const plain = await s.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(dec.decode(plain));
  } catch {
    // Wrong key, altered bytes, or plaintext that isn't the JSON we wrote.
    return null;
  }
}
