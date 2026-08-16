// Unit tests for the sync blob's encryption (site/js/sync-crypto.js). Real
// WebCrypto — Node 24 provides `globalThis.crypto.subtle`, so nothing is faked
// and nothing is stubbed. That matters here more than usual: a fake cipher will
// happily satisfy a round-trip test while the real promise (that the server
// cannot read the blob) is not being tested at all.
//
// The assertions are organised around what would actually go wrong. A
// round-trip passing proves almost nothing on its own — it passes for a "cipher"
// that returns its input. What the promise rests on is the SEPARATION of the
// blob id from the encryption key, the refusal of a wrong key, and the refusal
// of altered bytes. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveSyncKeys,
  sealBlob,
  openBlob,
  BLOB_FORMAT,
  INFO_BLOB_ID,
  INFO_ENC_KEY,
  SALT_LABEL,
} from "../site/js/sync-crypto.js";

const CODE_A = "K7F29DMX4QRA";
const CODE_B = "K7F29DMX4QRB"; // one character different

const snapshot = {
  format: "faves.personal-data",
  v: 1,
  profiles: [{ id: "default", name: "Me", favourites: [{ type: "venue", venueId: "kk" }], ratings: { "v:kk": 5 } }],
};

// --- the round trip, which is necessary and nowhere near sufficient --------

test("a snapshot survives seal and open unchanged", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const opened = await openBlob(key, await sealBlob(key, snapshot));
  assert.deepEqual(opened, snapshot);
});

test("derivation is deterministic — the same code on two devices agrees", async () => {
  const a = await deriveSyncKeys(CODE_A);
  const b = await deriveSyncKeys(CODE_A);
  assert.equal(a.blobId, b.blobId);
  // And the keys must agree too, which is only observable through the cipher.
  assert.deepEqual(await openBlob(b.key, await sealBlob(a.key, snapshot)), snapshot);
});

// --- the separation the whole promise rests on ----------------------------

test("the blob id is not the code, and does not contain it", async () => {
  const { blobId } = await deriveSyncKeys(CODE_A);
  assert.notEqual(blobId, CODE_A);
  assert.ok(!blobId.toUpperCase().includes(CODE_A), "the code must not survive into the id the server sees");
});

test("the blob id is safe to put in a URL path and is a fixed length", async () => {
  const { blobId } = await deriveSyncKeys(CODE_A);
  assert.match(blobId, /^[0-9a-f]{32}$/);
});

test("knowing the blob id does not give you the encryption key", async () => {
  // A weaker version of this test passed while both secrets were derived under
  // the SAME label — i.e. while the server was being handed the decryption key
  // on every request. It derived a key from the blob id, which differs from the
  // real key either way, so it never touched the property it was named for.
  // This asserts the separation where it actually lives: the two HKDF outputs.
  const material = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CODE_A),
    "HKDF",
    false,
    ["deriveBits"]
  );
  const bitsUnder = async (info) =>
    new Uint8Array(
      await globalThis.crypto.subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new TextEncoder().encode(SALT_LABEL),
          info: new TextEncoder().encode(info),
        },
        material,
        256
      )
    );

  assert.notEqual(INFO_BLOB_ID, INFO_ENC_KEY, "the two derivation labels must differ");
  const idStream = await bitsUnder(INFO_BLOB_ID);
  const keyStream = await bitsUnder(INFO_ENC_KEY);
  assert.notDeepEqual(idStream, keyStream, "blob id and encryption key derive to the same bits");

  // And the blob id really is the first 128 bits of the id-labelled stream, so
  // the value handed to the server is pinned to the label this test checks.
  const { blobId } = await deriveSyncKeys(CODE_A);
  const idHex = [...idStream.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.equal(blobId, idHex);
  // The key-labelled stream must not start with those same bytes, which is
  // exactly what happens when both labels are equal (HKDF is a prefix stream).
  const keyHex = [...keyStream.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.notEqual(blobId, keyHex, "the server's blob id is a prefix of the encryption key");
});

test("the encryption key is not extractable, so a later bug cannot leak it", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  assert.equal(key.extractable, false);
  await assert.rejects(() => globalThis.crypto.subtle.exportKey("raw", key));
});

// --- refusing what it must refuse -----------------------------------------

test("a different sync code cannot open the blob — it returns null, not junk", async () => {
  const a = await deriveSyncKeys(CODE_A);
  const b = await deriveSyncKeys(CODE_B);
  assert.notEqual(a.blobId, b.blobId);
  assert.equal(await openBlob(b.key, await sealBlob(a.key, snapshot)), null);
});

test("one flipped bit anywhere in the blob makes it refuse to open", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const sealed = await sealBlob(key, snapshot);
  for (const i of [1, 5, 13, sealed.length - 1]) {
    const tampered = Uint8Array.from(sealed);
    tampered[i] ^= 0x01;
    assert.equal(await openBlob(key, tampered), null, `byte ${i} was altered and the blob still opened`);
  }
});

test("a truncated response is refused rather than half-read", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const sealed = await sealBlob(key, snapshot);
  assert.equal(await openBlob(key, sealed.subarray(0, sealed.length - 4)), null);
  assert.equal(await openBlob(key, new Uint8Array(0)), null);
  assert.equal(await openBlob(key, null), null);
});

test("a blob from a future format version is refused, not guessed at", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const sealed = await sealBlob(key, snapshot);
  sealed[0] = BLOB_FORMAT + 1;
  assert.equal(await openBlob(key, sealed), null);
});

test("an empty code is refused outright rather than deriving from nothing", async () => {
  await assert.rejects(() => deriveSyncKeys(""));
  await assert.rejects(() => deriveSyncKeys(null));
});

// --- the nonce, which is the easiest thing to get quietly wrong -----------

test("every seal uses a fresh IV, so the same data never produces the same bytes", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const seen = new Set();
  for (let i = 0; i < 25; i += 1) {
    const sealed = await sealBlob(key, snapshot);
    const iv = [...sealed.subarray(1, 13)].join(",");
    assert.ok(!seen.has(iv), "an IV repeated under one key — this breaks AES-GCM outright");
    seen.add(iv);
  }
});

test("the envelope is version byte, then IV, then ciphertext", async () => {
  const { key } = await deriveSyncKeys(CODE_A);
  const sealed = await sealBlob(key, snapshot);
  assert.equal(sealed[0], BLOB_FORMAT);
  assert.ok(sealed.length > 13, "there must be a ciphertext after the header");
});

// --- the seam between the two halves -------------------------------------

test("the blob id the client derives is one the Worker will accept", async () => {
  // The client and the Worker agree on the blobId shape in two places that
  // cannot see each other — `deriveSyncKeys()` here and `BLOB_ID_RE` over in
  // worker/. Nothing else in either test suite crosses that line, so a change
  // to either one would ship a client that every request 400s against, and
  // both suites would stay green. This is the only assertion that fails first.
  const { isValidBlobId } = await import("../worker/sync-worker.js");
  for (const code of ["K7F29DMX4QRA", "0000000000000", "ZZZZZZZZZZZZZ"]) {
    const { blobId } = await deriveSyncKeys(code);
    assert.ok(isValidBlobId(blobId), `the Worker would reject the id derived from ${code}`);
  }
});
