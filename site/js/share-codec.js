// Group ordering (Theme 1b, ADR 0009): a compact, versioned codec that
// packs a finished order — or, later, a shortlist — into a URL *fragment*
// so a guest can hand their picks to the host via the OS share sheet or a
// QR code. No backend, no account, and nothing in a server log: a fragment
// (`#…`) is never sent to the server by construction. The same encode/decode
// carries a "shortlist" payload type for the parked shareable-shortlist idea;
// only the `t` tag differs. Pure and unit-tested; the UI lives in cart-ui.js.
//
// Wire format: `#share=<base64url(JSON)>`. The JSON uses terse keys to stay
// short — a family order is well under any practical URL limit. Anything we
// can't read (bad base64, bad JSON, unknown version, unknown type, no usable
// lines) fails soft to `null`, so the UI can say "this link didn't work — ask
// them to resend" rather than merging garbage.

const PARAM = "share";
export const CODEC_VERSION = 1;

// Long names of the payload types <-> the single-letter tags stored on the wire.
const TYPE_OF_TAG = { o: "order", s: "shortlist" };
const TAG_OF_TYPE = { order: "o", shortlist: "s" };

// Sanity ceilings. The payload is attacker-authorable (anyone can craft a
// link), so every string is clipped and every number clamped before it can
// reach storage or the DOM.
const MAX_LABEL = 40;
const MAX_NAME = 120;
const MAX_QTY = 99;
const MAX_ITEMS = 200; // guard against a hostile or accidentally huge link

// ---- base64url over UTF-8 -------------------------------------------------
// btoa/atob are Latin-1 only, but venue names carry macrons (te reo) and other
// non-ASCII, so round-trip through TextEncoder/TextDecoder. All four globals
// exist in browsers and in Node ≥ 16, so the tests need no shim.

const bytesToBinary = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
};

function toB64url(str) {
  const b64 = btoa(bytesToBinary(new TextEncoder().encode(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(token) {
  // atob throws on invalid characters/length — the caller catches it.
  const bin = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ---- field cleaners -------------------------------------------------------

const clip = (v, n) => (typeof v === "string" ? v : String(v ?? "")).slice(0, n);

const cleanLabel = (v) =>
  clip(String(v ?? "").replace(/[\u0000-\u001f]/g, ""), MAX_LABEL).trim();

// Keep only characters a real phone number uses. Prevents a crafted value from
// smuggling anything odd into the `tel:` href the order sheet builds.
const cleanPhone = (v) => {
  if (v == null) return null;
  const s = String(v)
    .replace(/[^0-9+()\s-]/g, "")
    .trim()
    .slice(0, 32);
  return s || null;
};

const clampQty = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_QTY) : 0;
};

const priceOrNull = (v) => {
  if (v == null || v === "") return null; // Number(null) is 0 — guard before coercing
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// ---- encode ---------------------------------------------------------------

/**
 * Encode an order (or shortlist) into a base64url token for the URL fragment.
 * `groups` is groupByVenue()-shaped: `{ venueId, venueName, phone, items:
 * [{ name, price, qty }] }`. `label` is the optional guest-typed sender name.
 * Returns the token string (no `#share=` prefix — see buildShareUrl).
 */
export function encodeShare({ type = "order", label = "", groups = [] }) {
  const tag = TAG_OF_TYPE[type];
  if (!tag) throw new Error(`unknown share type: ${type}`);

  const payload = { v: CODEC_VERSION, t: tag };
  const l = cleanLabel(label);
  if (l) payload.l = l;

  payload.g = groups.map((g) => ({
    v: clip(g.venueId, MAX_NAME),
    n: clip(g.venueName, MAX_NAME),
    p: cleanPhone(g.phone),
    // Each line is a positional [name, price, qty] triple to keep it short.
    i: (g.items || []).map((it) => [clip(it.name, MAX_NAME), priceOrNull(it.price), clampQty(it.qty)]),
  }));

  return toB64url(JSON.stringify(payload));
}

// ---- decode ---------------------------------------------------------------

/**
 * Decode a share token back to `{ version, type, label, items }`, where
 * `items` is a flat cart-shaped list ready for order.merge(). Returns `null`
 * for anything unreadable or empty — the UI treats null as "this link didn't
 * work". Every field is re-sanitised on the way in; never trust the wire.
 */
export function decodeShare(token) {
  if (typeof token !== "string" || !token) return null;

  let json;
  try {
    json = fromB64url(token);
  } catch {
    return null;
  }

  let p;
  try {
    p = JSON.parse(json);
  } catch {
    return null;
  }

  if (!p || typeof p !== "object") return null;
  if (p.v !== CODEC_VERSION) return null; // older/newer codec → ask them to resend
  const type = TYPE_OF_TAG[p.t];
  if (!type) return null;

  const items = [];
  const groups = Array.isArray(p.g) ? p.g : [];
  outer: for (const g of groups) {
    if (!g || typeof g !== "object") continue;
    const venueId = clip(g.v ?? "", MAX_NAME).trim();
    const venueName = clip(g.n ?? "", MAX_NAME).trim();
    const phone = cleanPhone(g.p);
    const lines = Array.isArray(g.i) ? g.i : [];
    for (const line of lines) {
      if (!Array.isArray(line)) continue;
      const name = clip(line[0] ?? "", MAX_NAME).trim();
      const qty = clampQty(line[2]);
      if (!name || qty <= 0) continue;
      items.push({ venueId, venueName, phone, name, price: priceOrNull(line[1]), qty });
      if (items.length >= MAX_ITEMS) break outer;
    }
  }

  if (items.length === 0) return null; // a share with no usable lines is a dud
  return { version: p.v, type, label: cleanLabel(p.l ?? ""), items };
}

// ---- URL glue -------------------------------------------------------------

/** Build a shareable URL: the given base with a `#share=<token>` fragment.
 *  Any existing fragment on the base is dropped. */
export function buildShareUrl(token, baseUrl) {
  const base = String(baseUrl).split("#")[0];
  return `${base}#${PARAM}=${token}`;
}

/** Pull the share token out of a location hash or full URL, or null if none.
 *  Accepts `#share=xyz`, `share=xyz`, or a whole URL containing either. */
export function readShareToken(hashOrUrl) {
  const s = String(hashOrUrl ?? "");
  const hash = s.includes("#") ? s.slice(s.indexOf("#") + 1) : s;
  const m = new RegExp(`(?:^|&)${PARAM}=([^&]+)`).exec(hash);
  return m ? m[1] : null;
}
