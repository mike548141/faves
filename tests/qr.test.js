// Unit tests for the byte-mode QR encoder (site/js/qr.js).
//
// A QR encoder can't be meaningfully checked by "does it round-trip" without
// also writing a decoder, so instead we pin the error-prone maths to the
// constants ISO/IEC 18004 publishes: the Galois field, the generator
// polynomials (as α exponents), and both BCH codes (format + version info).
// If those are right and the module placement follows the spec, the code
// scans — which a real phone camera confirms as the acceptance test.
//
// Pure — no DOM. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeQR, _internals } from "../site/js/qr.js";

const { EXP, LOG, generatorPoly, rsEncodeBlock, chooseVersion, totalDataCodewords, formatBits, versionBits } =
  _internals;

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255]);

test("GF(256) exp/log tables match the primitive-polynomial field", () => {
  assert.equal(EXP[0], 1);
  assert.equal(EXP[1], 2);
  assert.equal(EXP[7], 128);
  assert.equal(EXP[8], 29); // x^8 reduces mod 0x11d to 0b00011101
  // exp and log are inverses across the whole field
  for (let i = 1; i < 256; i++) assert.equal(EXP[LOG[i]], i);
});

test("generator polynomials match the spec's published α exponents", () => {
  // The α exponents (LOG of each coefficient) for common EC codeword counts.
  const asExponents = (degree) => generatorPoly(degree).map((c) => LOG[c]);
  assert.deepEqual(asExponents(7), [0, 87, 229, 146, 149, 238, 102, 21]);
  assert.deepEqual(asExponents(10), [0, 251, 67, 46, 61, 118, 70, 64, 94, 32, 45]);
});

test("format-information bits match the published level-M table", () => {
  // Level M, every mask; mask 0 is exactly the spec's 0x5412 XOR seed.
  assert.equal(formatBits(0), 0b101010000010010);
  assert.equal(formatBits(1), 0b101000100100101);
  assert.equal(formatBits(5), 0b100000011001110);
  assert.equal(formatBits(7), 0b100101010100000);
});

test("version-information bits match the published BCH table", () => {
  assert.equal(versionBits(7), 0x07c94);
  assert.equal(versionBits(10), 0x0a4d3);
  assert.equal(versionBits(20), 0x149a6);
});

test("data-codeword totals and version selection are correct", () => {
  assert.equal(totalDataCodewords(1), 16);
  assert.equal(totalDataCodewords(10), 216);
  assert.equal(totalDataCodewords(20), 669);
  // v1-M byte capacity is 14 bytes (16 codewords − 4-bit mode − 8-bit count).
  assert.equal(chooseVersion(14), 1);
  assert.equal(chooseVersion(15), 2);
  // A realistic ~370-char order URL still fits under the version-20 ceiling.
  assert.ok(chooseVersion(370) <= 20);
  assert.throws(() => chooseVersion(700), /too long/);
});

test("Reed–Solomon parity verifies — the codeword stream has zero syndromes", () => {
  // A valid RS codeword C(x) = data ‖ parity evaluates to 0 at α^0…α^(ec−1).
  // This is precisely the check a scanner's error-correction stage performs,
  // so passing it means the EC codewords we emit are genuinely correctable.
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]; // 13 bytes
  const ecLen = 22;
  const codeword = [...data, ...rsEncodeBlock(data, ecLen)];
  for (let i = 0; i < ecLen; i++) {
    let syndrome = 0;
    for (const c of codeword) syndrome = gfMul(syndrome, EXP[i]) ^ c; // Horner at α^i
    assert.equal(syndrome, 0, `syndrome ${i} must be zero`);
  }
});

test("encodeQR produces a well-formed matrix", () => {
  const { size, version, modules } = encodeQR("https://lets-eat.myspot.nz/#share=abc123");
  assert.equal(size, version * 4 + 17);
  assert.equal(modules.length, size);
  // Every module is a resolved boolean — no unpopulated (null) cells left.
  for (const row of modules) {
    assert.equal(row.length, size);
    for (const m of row) assert.equal(typeof m, "boolean");
  }

  // Top-left finder: a 7×7 dark ring with a 3×3 dark core.
  for (let i = 0; i < 7; i++) {
    assert.equal(modules[0][i], true, `finder top edge ${i}`);
    assert.equal(modules[6][i], true, `finder bottom edge ${i}`);
    assert.equal(modules[i][0], true, `finder left edge ${i}`);
    assert.equal(modules[i][6], true, `finder right edge ${i}`);
  }
  assert.equal(modules[1][1], false); // inside the ring is light
  assert.equal(modules[3][3], true); // core centre is dark

  // Horizontal timing pattern alternates on row 6.
  for (let c = 8; c < size - 8; c++) assert.equal(modules[6][c], c % 2 === 0);
});

test("encodeQR is deterministic for the same input", () => {
  const a = encodeQR("kia ora");
  const b = encodeQR("kia ora");
  assert.deepEqual(a.modules, b.modules);
  assert.equal(a.version, b.version);
});

test("macron-carrying text encodes without throwing (UTF-8 byte mode)", () => {
  assert.doesNotThrow(() => encodeQR("Māori kai — Ōtaki"));
});
