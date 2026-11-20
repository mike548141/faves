**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 101+1 -->
- [2026-07-10 · 2026-07-10 (Opus: Theme 1b QR fallback — the last piece)](2026-07-10-archived-031-2026-07-10-opus-theme-1b-qr-fallback-the-last.md) — archived entry, verbatim in its file

- **2026-07-10 (Opus: Theme 1b QR fallback — the last piece)**: Built the
  deferred QR-code fallback, completing Theme 1b. New pure `site/js/qr.js`: a
  zero-dependency byte-mode QR encoder, error-correction level M, versions 1–20
  (covers up to 666 bytes; a family order URL is ~300–400). The full standard
  pipeline — Reed–Solomon over GF(256), block interleaving, all eight data
  masks scored by the four penalty rules, BCH-protected format and version
  info. Returns `{ size, modules }`; the renderer stays in `cart-ui.js` so the
  encoder is unit-testable.

  **Verification went deep, because a QR you can't scan is worse than none.**
  A QR encoder can't be checked by round-tripping without also writing a
  decoder, so `tests/qr.test.js` pins the error-prone maths to the ISO/IEC
  18004 published constants: the GF(256) field, generator polynomials as α
  exponents (degrees 7 and 10), both BCH codes (all format bits for level M,
  version bits for v7/v10/v20), and an RS-syndrome check proving the emitted
  parity is genuinely correctable. Then — decisively — a throwaway decoder in
  the scratchpad reconstructed finders/timing/alignment independently, read the
  format info, unmasked, de-interleaved, verified syndromes and parsed byte
  mode, and **round-tripped every version cleanly** (v1–v15, incl. macron UTF-8
  and a 405-byte v15 payload). Two bugs surfaced and were fixed *in the
  scratch decoder* along the way (reversed format-bit read; re-interleaving
  data blocks instead of concatenating) — the shipped encoder was correct
  throughout, which the codeword-stream comparison confirmed before I touched
  anything. Caught and fixed one real encoder bug pre-test: the RS division
  indexed the generator polynomial's leading `1` instead of skipping it.

  UI: a **Show QR code** toggle in the send dialog draws the current order link
  to a `<canvas>` with a 4-module quiet zone, hard-coded dark-on-light (a
  scanner needs that regardless of the page's dark mode), `role="img"` +
  aria-label, `aria-expanded` on the button, reset on dialog open/close. Throws
  → an honest "too big for a QR code — use Copy link" (only trips past the v20
  ceiling). Browser-verified end-to-end via headless CDP: seed a 3-item order,
  open order sheet → send → Show QR; canvas paints bimodal (260×260), the QR's
  own encoded URL decodes back to exactly "2× Mee Goreng, 1× Roti Canai",
  aria toggles, zero console errors. `node --test` **164 pass** (155 + 9 QR);
  validate + check_no_deps + gen_sbom --check clean; sw VERSION → `.44` with
  `js/qr.js` added to the precache shell. Committed on `main` (not pushed).
  **Remaining acceptance: a real phone-camera scan (owner)** — inherent to any
  QR feature; the decode round-trip makes scan confidence very high.

  **Next session:** the parked **shareable shortlist links** — wire send/receive
  for the `shortlist` payload type the codec already carries (no new codec
  work). After that, Theme 1b is fully closed and Phase 7 (deploy) is the main
  unblocked track, pending two owner calls: host confirmation + hostname.
