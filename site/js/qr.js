// A tiny, zero-dependency QR encoder — byte mode, error-correction level M,
// versions 1–20. It exists so group ordering (Theme 1b, ADR 0009) can offer a
// scan-me fallback when the OS share sheet isn't the right path: two phones,
// one not Apple, no shared network. A family order URL is ~300–400 ASCII
// characters, which fits comfortably below the v20-M ceiling (666 bytes).
//
// Byte mode only: our payload is a URL (ASCII), so there's no gain from
// numeric/alphanumeric modes and a lot less code without them. Level M is the
// sweet spot for a code read off a glossy phone screen at arm's length — more
// resilient than L, denser (smaller) than Q/H.
//
// Pure: encodeQR(text) returns { size, modules } where `modules[r][c]` is true
// for a dark module. No DOM, no canvas — the renderer lives in cart-ui.js so
// this stays unit-testable under `node --test`. Throws if the text is too long
// for v20-M; the caller falls back to the copy-link path that already exists.
//
// The algorithm is the standard one (ISO/IEC 18004): Reed–Solomon over GF(256),
// block interleaving, the eight data masks scored by the four penalty rules,
// BCH-protected format and version information. The error-prone maths (Galois
// field, generator polynomials, both BCH codes) is checked against the spec's
// published constants in tests/qr.test.js; a rendered code still wants a real
// camera scan, which is the honest acceptance test for any QR feature.

// ---- Galois field GF(256), primitive polynomial 0x11d ---------------------

const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // reduce modulo the primitive polynomial
  }
  for (let i = 255; i < 256; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[(LOG[a] + LOG[b]) % 255]);

// Generator polynomial for `degree` error-correction codewords: the product
// (x − α^0)(x − α^1)…(x − α^(degree−1)). Returns all degree+1 coefficients,
// highest power first, with the leading 1 included.
function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

// Reed–Solomon EC codewords for one data block (polynomial division remainder).
function rsEncodeBlock(data, ecLen) {
  const gen = generatorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    // gen[0] is the leading 1; the remainder uses coefficients gen[1..ecLen].
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

// ---- Version tables (error-correction level M) ----------------------------
// Per version: EC codewords per block, and the block groups [count, dataPerBlock].
// Straight from ISO/IEC 18004 Table 9. Interleaving relies on these being exact.

const EC_M = {
  1: { ec: 10, groups: [[1, 16]] },
  2: { ec: 16, groups: [[1, 28]] },
  3: { ec: 26, groups: [[1, 44]] },
  4: { ec: 18, groups: [[2, 32]] },
  5: { ec: 24, groups: [[2, 43]] },
  6: { ec: 16, groups: [[4, 27]] },
  7: { ec: 18, groups: [[4, 31]] },
  8: { ec: 22, groups: [[2, 38], [2, 39]] },
  9: { ec: 22, groups: [[3, 36], [2, 37]] },
  10: { ec: 26, groups: [[4, 43], [1, 44]] },
  11: { ec: 30, groups: [[1, 50], [4, 51]] },
  12: { ec: 22, groups: [[6, 36], [2, 37]] },
  13: { ec: 22, groups: [[8, 37], [1, 38]] },
  14: { ec: 24, groups: [[4, 40], [5, 41]] },
  15: { ec: 24, groups: [[5, 41], [5, 42]] },
  16: { ec: 28, groups: [[7, 45], [3, 46]] },
  17: { ec: 28, groups: [[10, 46], [1, 47]] },
  18: { ec: 26, groups: [[9, 43], [4, 44]] },
  19: { ec: 26, groups: [[3, 44], [11, 45]] },
  20: { ec: 26, groups: [[3, 41], [13, 42]] },
};

// Alignment-pattern centre coordinates per version (row == col candidates).
// Version 1 has none. ISO/IEC 18004 Annex E.
const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
  15: [6, 26, 48, 70], 16: [6, 26, 50, 74], 17: [6, 30, 54, 78],
  18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90],
};

const MAX_VERSION = 20;

const totalDataCodewords = (version) =>
  EC_M[version].groups.reduce((s, [count, data]) => s + count * data, 0);

// Character-count indicator width for byte mode: 8 bits up to v9, 16 bits after.
const countBits = (version) => (version <= 9 ? 8 : 16);

// Smallest version whose data capacity holds `byteLen` bytes plus the 4-bit
// mode indicator and the count indicator. Throws past v20 — caller falls back.
function chooseVersion(byteLen) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const capacityBits = totalDataCodewords(v) * 8 - 4 - countBits(v);
    if (byteLen * 8 <= capacityBits) return v;
  }
  throw new Error(`data too long for QR (${byteLen} bytes exceeds version ${MAX_VERSION})`);
}

// ---- Bit buffer -----------------------------------------------------------

class BitBuffer {
  constructor() {
    this.bits = [];
  }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
}

// ---- Data encoding: mode + count + bytes, padding, block interleaving ------

function encodeData(bytes, version) {
  const buf = new BitBuffer();
  buf.put(0b0100, 4); // byte mode
  buf.put(bytes.length, countBits(version));
  for (const b of bytes) buf.put(b, 8);

  const capacityCodewords = totalDataCodewords(version);
  const capacityBits = capacityCodewords * 8;

  // Terminator: up to four 0 bits, but not past capacity.
  const terminator = Math.min(4, capacityBits - buf.length);
  buf.put(0, terminator);
  // Pad to a byte boundary.
  while (buf.length % 8 !== 0) buf.bits.push(0);

  // Convert to codewords, then pad with the spec's alternating bytes.
  const dataCodewords = [];
  for (let i = 0; i < buf.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | buf.bits[i + j];
    dataCodewords.push(byte);
  }
  const PAD = [0xec, 0x11];
  for (let i = 0; dataCodewords.length < capacityCodewords; i++) {
    dataCodewords.push(PAD[i % 2]);
  }

  return interleave(dataCodewords, version);
}

// Split data into blocks, compute each block's EC codewords, then interleave
// column-wise (all blocks' first data codeword, then second, …, then EC).
function interleave(dataCodewords, version) {
  const { ec, groups } = EC_M[version];
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (const [count, dataPerBlock] of groups) {
    for (let b = 0; b < count; b++) {
      const block = dataCodewords.slice(offset, offset + dataPerBlock);
      offset += dataPerBlock;
      dataBlocks.push(block);
      ecBlocks.push(rsEncodeBlock(block, ec));
    }
  }

  const result = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const block of ecBlocks) result.push(block[i]);
  }
  return result;
}

// ---- Matrix construction --------------------------------------------------

function makeMatrix(version, codewords) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const set = (r, c, dark) => {
    modules[r][c] = dark;
    reserved[r][c] = true;
  };

  // Finder patterns (top-left, top-right, bottom-left) with separators.
  const placeFinder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing =
          (dr === 0 || dr === 6 || dc === 0 || dc === 6) && dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        set(rr, cc, inRing || inCore);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) set(6, i, i % 2 === 0);
    if (!reserved[i][6]) set(i, 6, i % 2 === 0);
  }

  // Alignment patterns (skip any overlapping a finder).
  const centres = ALIGN[version];
  for (const r of centres) {
    for (const c of centres) {
      if (reserved[r][c]) continue; // corner overlaps with a finder
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          set(r + dr, c + dc, ring !== 1);
        }
      }
    }
  }

  // Dark module (always set) and reserve the format-info strips.
  set(size - 8, 8, true);
  reserveFormatAreas(reserved, size);
  if (version >= 7) reserveVersionAreas(reserved, size);

  // Lay the data+EC bitstream into the free modules, upward zigzag from the
  // bottom-right, two columns at a time, skipping the vertical timing column.
  const bits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);

  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5; // shift left past the timing column
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (reserved[row][cc]) continue;
        modules[row][cc] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex++;
      }
    }
    upward = !upward;
  }

  return { size, modules, reserved };
}

// Reserve the two format-information regions (around the finders).
function reserveFormatAreas(reserved, size) {
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      reserved[8][i] = true; // top strip, horizontal
      reserved[i][8] = true; // left strip, vertical
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true; // top-right, horizontal
    reserved[size - 1 - i][8] = true; // bottom-left, vertical
  }
  reserved[8][6] = true; // timing-adjacent cell that still carries a format bit
  reserved[6][8] = true;
}

function reserveVersionAreas(reserved, size) {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      reserved[i][size - 11 + j] = true;
      reserved[size - 11 + j][i] = true;
    }
  }
}

// ---- Data masks and penalty scoring ---------------------------------------

const MASK_FN = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(modules, reserved, size, maskId) {
  const out = modules.map((row) => row.slice());
  const fn = MASK_FN[maskId];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && fn(r, c)) out[r][c] = !out[r][c];
    }
  }
  return out;
}

// The four penalty rules (ISO/IEC 18004 §8.8.2), summed; lower is better.
function penalty(modules, size) {
  let score = 0;
  const dark = (r, c) => modules[r][c] === true;

  // Rule 1: runs of five or more same-colour modules in a row/column.
  for (let r = 0; r < size; r++) {
    let runColor = null;
    let run = 0;
    let runColorV = null;
    let runV = 0;
    for (let c = 0; c < size; c++) {
      const v = dark(r, c);
      if (v === runColor) run++;
      else {
        if (run >= 5) score += run - 2;
        runColor = v;
        run = 1;
      }
      const vv = dark(c, r);
      if (vv === runColorV) runV++;
      else {
        if (runV >= 5) score += runV - 2;
        runColorV = vv;
        runV = 1;
      }
    }
    if (run >= 5) score += run - 2;
    if (runV >= 5) score += runV - 2;
  }

  // Rule 2: 2×2 blocks of the same colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = dark(r, c);
      if (v === dark(r, c + 1) && v === dark(r + 1, c) && v === dark(r + 1, c + 1)) score += 3;
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns, horizontal and vertical. // leakscan:allow: QR finder-pattern ratio, ipv6-shaped by accident
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get, i) => {
    let a = true;
    let b = true;
    for (let k = 0; k < 11; k++) {
      const v = get(i + k);
      if (v !== pat1[k]) a = false;
      if (v !== pat2[k]) b = false;
    }
    return a || b;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (matches((k) => dark(r, k), c)) score += 40;
      if (matches((k) => dark(k, r), c)) score += 40;
    }
  }

  // Rule 4: overall dark/light balance.
  let darkCount = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (dark(r, c)) darkCount++;
  const percent = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  score += k * 10;

  return score;
}

// ---- BCH-protected format and version information -------------------------

// 15-bit format info: 2-bit EC level (M = 0b00) + 3-bit mask, BCH(15,5), then
// XOR with the spec mask 0x5412 so an all-zero format never yields all-zero.
function formatBits(maskId) {
  const data = (0b00 << 3) | maskId; // level M
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

// 18-bit version info: 6-bit version + BCH(18,6). Only used for v ≥ 7.
function versionBits(version) {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) rem ^= 0b1111100100101 << (i - 12);
  }
  return (version << 12) | rem;
}

function placeFormat(modules, size, maskId) {
  const bits = formatBits(maskId);
  const bit = (i) => ((bits >> i) & 1) === 1;
  // Copy 1: around the top-left finder.
  for (let i = 0; i <= 5; i++) modules[8][i] = bit(i);
  modules[8][7] = bit(6);
  modules[8][8] = bit(7);
  modules[7][8] = bit(8);
  for (let i = 9; i <= 14; i++) modules[14 - i][8] = bit(i);
  // Copy 2: split across top-right and bottom-left, redundant for robustness.
  for (let i = 0; i <= 7; i++) modules[size - 1 - i][8] = bit(i);
  for (let i = 8; i <= 14; i++) modules[8][size - 15 + i] = bit(i);
}

function placeVersion(modules, size, version) {
  if (version < 7) return;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >> i) & 1) === 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    modules[r][size - 11 + c] = bit;
    modules[size - 11 + c][r] = bit;
  }
}

// ---- Public API -----------------------------------------------------------

/**
 * Encode `text` as a byte-mode, level-M QR code. Returns `{ size, modules }`
 * with `modules[row][col] === true` for dark modules (no quiet zone — the
 * renderer adds it). Throws if the text is too long for version 20.
 */
export function encodeQR(text) {
  const bytes = new TextEncoder().encode(String(text));
  const version = chooseVersion(bytes.length);
  const codewords = encodeData(bytes, version);
  const { size, modules, reserved } = makeMatrix(version, codewords);

  let best = null;
  for (let maskId = 0; maskId < 8; maskId++) {
    const masked = applyMask(modules, reserved, size, maskId);
    placeFormat(masked, size, maskId);
    placeVersion(masked, size, version);
    const score = penalty(masked, size);
    if (best === null || score < best.score) best = { score, maskId, masked };
  }

  return { size, version, modules: best.masked.map((row) => row.map((v) => v === true)) };
}

// Exported for unit tests only — not part of the rendering path.
export const _internals = {
  EXP,
  LOG,
  generatorPoly,
  rsEncodeBlock,
  chooseVersion,
  totalDataCodewords,
  formatBits,
  versionBits,
};
