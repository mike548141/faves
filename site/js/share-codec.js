// Group ordering (Theme 1b, ADR 0009): a compact, versioned codec that packs
// a finished order — or a shared shortlist of favourites — into a URL
// *fragment* so it can be handed over via the OS share sheet or a QR code. No
// backend, no account, and nothing in a server log: a fragment (`#…`) is never
// sent to the server by construction. Two payload types ride the same wire and
// the same base64url/UTF-8 machinery, distinguished by the `t` tag: `order`
// (venues → priced, quantified lines) and `shortlist` (venues → hearted dishes
// and whole-venue favourites, carrying the recipe flag so received favourites
// deep-link correctly). Pure and unit-tested; the UI lives in share-ui.js.
//
// Wire format: `#share=<base64url(JSON)>`. The JSON uses terse keys to stay
// short — a family order or shortlist is well under any practical URL limit.
// Anything we can't read (bad base64, bad JSON, unknown version, unknown type,
// no usable lines) fails soft to `null`, so the UI can say "this link didn't
// work — ask them to resend" rather than merging garbage.

const PARAM = "share";
export const CODEC_VERSION = 1;

// Long names of the payload types <-> the single-letter tags stored on the wire.
const TYPE_OF_TAG = { o: "order", s: "shortlist" };
const TAG_OF_TYPE = { order: "o", shortlist: "s" };

// The personal transfer (Theme 9 v1, ADR 0030) rides the same base64url wire and
// the same group packing, but under its OWN fragment parameter and its own tag —
// so a transfer link can never be read as a shortlist to merge into favourites,
// and cart-ui.js's `#share=` handler never sees it.
const XFER_PARAM = "xfer";
const XFER_TAG = "x";

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
 * Encode an order into a base64url token for the URL fragment. `groups` is
 * groupByVenue()-shaped: `{ venueId, venueName, phone, items: [{ name, price,
 * qty }] }`. `label` is the optional guest-typed sender name. Returns the token
 * string (no `#share=` prefix — see buildShareUrl). Shortlists have their own
 * shape — use encodeShortlist; only "order" is accepted here so the two wire
 * shapes never cross (a shortlist-tagged order payload wouldn't decode).
 */
export function encodeShare({ type = "order", label = "", groups = [] }) {
  if (type !== "order") throw new Error(`encodeShare is order-only (got "${type}"); use encodeShortlist`);

  const payload = { v: CODEC_VERSION, t: TAG_OF_TYPE.order };
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

/**
 * Encode a shortlist (shared favourites) into a token. `groups` is grouped by
 * venue: `{ venueId, venueName, isRecipe, sub, venueFav, dishes: [name, …] }`,
 * where `venueFav` means the whole place is hearted (not just some dishes) and
 * `sub` is the venue's area/cuisine caption. Unlike an order, a shortlist has
 * no prices or quantities; it does carry the recipe flag, so a received recipe
 * favourite links to recipe.html rather than a 404 on restaurant.html.
 */
export function encodeShortlist({ label = "", groups = [] }) {
  const payload = { v: CODEC_VERSION, t: TAG_OF_TYPE.shortlist, g: packGroups(groups) };
  const l = cleanLabel(label);
  if (l) payload.l = l;
  return toB64url(JSON.stringify(payload));
}

// Venue-grouped favourites on the wire. Shared by the shortlist share and the
// personal transfer so the two can never drift into two shapes for one thing.
function packGroups(groups) {
  return (groups || []).map((g) => ({
    v: clip(g.venueId, MAX_NAME),
    n: clip(g.venueName, MAX_NAME),
    r: g.isRecipe ? 1 : 0,
    s: clip(g.sub ?? "", MAX_NAME),
    f: g.venueFav ? 1 : 0,
    d: (g.dishes || []).map((name) => clip(name, MAX_NAME)),
  }));
}

// ---- decode ---------------------------------------------------------------

/**
 * Decode a share token back to `{ version, type, label, items }`. For an
 * `order`, `items` is a flat cart-shaped list ready for order.merge(); for a
 * `shortlist`, it's a flat list of favourites entries ready for
 * favourites.merge(). Returns `null` for anything unreadable or empty — the UI
 * treats null as "this link didn't work". Every field is re-sanitised on the
 * way in; never trust the wire.
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

  const groups = Array.isArray(p.g) ? p.g : [];
  const items = type === "shortlist" ? decodeShortlistItems(groups) : decodeOrderItems(groups);

  if (items.length === 0) return null; // a share with no usable lines is a dud
  return { version: p.v, type, label: cleanLabel(p.l ?? ""), items };
}

function decodeOrderItems(groups) {
  const items = [];
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
  return items;
}

// Shortlist → flat favourites entries (matching favourites.js: a `venue` entry
// for a whole-place heart, a `dish` entry per hearted dish). A group with
// neither a venue heart nor any dish is dropped.
function decodeShortlistItems(groups) {
  const items = [];
  outer: for (const g of groups) {
    if (!g || typeof g !== "object") continue;
    const venueId = clip(g.v ?? "", MAX_NAME).trim();
    if (!venueId) continue;
    const venueName = clip(g.n ?? "", MAX_NAME).trim();
    const isRecipe = g.r === 1;
    const sub = clip(g.s ?? "", MAX_NAME).trim();
    const base = { venueId, venueName, isRecipe, sub };
    if (g.f === 1) {
      items.push({ type: "venue", ...base });
      if (items.length >= MAX_ITEMS) break outer;
    }
    const dishes = Array.isArray(g.d) ? g.d : [];
    for (const raw of dishes) {
      const name = clip(raw ?? "", MAX_NAME).trim();
      if (!name) continue;
      items.push({ type: "dish", name, ...base });
      if (items.length >= MAX_ITEMS) break outer;
    }
  }
  return items;
}

// ---- personal transfer (Theme 9 v1) ---------------------------------------

/**
 * Encode one person's hearts, ratings and settings for a hand-off to their own
 * second device. Deliberately ONE profile (see ADR 0030): the whole-device
 * backup is the file export's job, and a URL fragment is a small pipe.
 *
 * `groups` is groupForShare()-shaped, exactly as a shortlist; `ratings` is the
 * flat `{ key: 1..5 }` map and `settings` the profile's settings object. The
 * profile's id and name ride along so the receiving device can tell "my own
 * other phone" from "someone else called Sam" (ADR 0030's collision rule).
 */
export function encodeTransfer({ profile = {}, groups = [], ratings = {}, settings = null } = {}) {
  const payload = {
    v: CODEC_VERSION,
    t: XFER_TAG,
    p: { i: clip(profile.id ?? "", 64), n: cleanLabel(profile.name ?? "") },
    g: packGroups(groups),
  };
  const r = {};
  if (ratings && typeof ratings === "object") {
    for (const [k, val] of Object.entries(ratings)) {
      const score = Math.round(Number(val));
      if (!k || !Number.isFinite(score) || score <= 0) continue;
      r[clip(k, MAX_NAME)] = Math.min(score, 5);
    }
  }
  if (Object.keys(r).length) payload.r = r;
  if (settings && typeof settings === "object") payload.s = settings;
  return toB64url(JSON.stringify(payload));
}

/**
 * Decode a transfer token to `{ profile, favourites, ratings, settings }` —
 * the *parts*, not a personal-data envelope: assembling that is
 * `envelopeFromTransfer` in personal-data.js, so this codec keeps no knowledge
 * of the personal layer. Returns null for anything unreadable, and for a
 * payload carrying nothing worth applying.
 */
export function decodeTransfer(token) {
  if (typeof token !== "string" || !token) return null;
  let p;
  try {
    p = JSON.parse(fromB64url(token));
  } catch {
    return null;
  }
  if (!p || typeof p !== "object") return null;
  if (p.v !== CODEC_VERSION || p.t !== XFER_TAG) return null;

  const favourites = decodeShortlistItems(Array.isArray(p.g) ? p.g : []);
  const ratings = {};
  if (p.r && typeof p.r === "object" && !Array.isArray(p.r)) {
    for (const [k, val] of Object.entries(p.r)) {
      const score = Math.round(Number(val));
      if (!k || !Number.isFinite(score) || score <= 0) continue;
      ratings[clip(k, MAX_NAME)] = Math.min(score, 5);
    }
  }
  const settings = p.s && typeof p.s === "object" && !Array.isArray(p.s) ? p.s : null;
  if (!favourites.length && !Object.keys(ratings).length && !settings) return null;

  return {
    profile: { id: clip(p.p?.i ?? "", 64), name: cleanLabel(p.p?.n ?? "") },
    favourites,
    ratings,
    settings,
  };
}

// ---- URL glue -------------------------------------------------------------

function withFragment(param, token, baseUrl) {
  const base = String(baseUrl).split("#")[0];
  return `${base}#${param}=${token}`;
}

function tokenFrom(param, hashOrUrl) {
  const s = String(hashOrUrl ?? "");
  const hash = s.includes("#") ? s.slice(s.indexOf("#") + 1) : s;
  const m = new RegExp(`(?:^|&)${param}=([^&]+)`).exec(hash);
  return m ? m[1] : null;
}

/** Build a shareable URL: the given base with a `#share=<token>` fragment.
 *  Any existing fragment on the base is dropped. */
export function buildShareUrl(token, baseUrl) {
  return withFragment(PARAM, token, baseUrl);
}

/** Pull the share token out of a location hash or full URL, or null if none.
 *  Accepts `#share=xyz`, `share=xyz`, or a whole URL containing either. */
export function readShareToken(hashOrUrl) {
  return tokenFrom(PARAM, hashOrUrl);
}

/** Transfer's own fragment parameter — `#xfer=<token>`. */
export function buildTransferUrl(token, baseUrl) {
  return withFragment(XFER_PARAM, token, baseUrl);
}

export function readTransferToken(hashOrUrl) {
  return tokenFrom(XFER_PARAM, hashOrUrl);
}
