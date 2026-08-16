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

import { dishId, migrateDishKeys } from "./dish-id.js";
import { slug } from "./slug.js";

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
const MAX_OPTIONS = 20; // add-ons per line — the widest real group is 20 rows

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
 * qty, options?, dishId? }] }`. `label` is the optional guest-typed sender name. Returns the token
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
    // Each line is a positional [name, price, qty] triple to keep it short,
    // with the add-on selection appended as an optional fourth slot (ADR 0048
    // §4) and the dish id as an optional fifth (ADR 0051). Deliberately NOT a
    // CODEC_VERSION bump: that field is shared by orders, shortlists AND
    // personal transfers and is checked with a strict `!==`, so bumping it
    // would invalidate every outstanding link of all three kinds for a change
    // two of them don't use. Appending is safe instead because a decoder that
    // predates either slot reads line[0..2] and ignores the rest by
    // construction — and `price` here is the CONFIGURED unit price, so that
    // older reader still totals correctly. It under-specifies the order rather
    // than mis-stating it: dropping an add-on can never put something extra on
    // a plate, which is the only degradation direction that is safe.
    i: (g.items || []).map((it) => {
      const name = clip(it.name, MAX_NAME);
      const line = [name, priceOrNull(it.price), clampQty(it.qty)];
      const opts = (it.options || []).slice(0, MAX_OPTIONS);
      // Emitted only where the id says something the name doesn't, so an
      // ordinary link — every link on the day this shipped — does not grow.
      // Resolved against the CLIPPED name, so encode and decode agree about
      // what "the name alone would have meant" even for an over-long one.
      const id = clip(dishId({ dishId: it.dishId, name: name.trim() }), MAX_NAME);
      const carryId = !!id && id !== slug(name.trim());
      if (opts.length || carryId)
        line.push(opts.length ? opts.map((o) => [clip(o.group, MAX_NAME), clip(o.name, MAX_NAME), priceOrNull(o.price)]) : null);
      if (carryId) line.push(id);
      return line;
    }),
  }));

  return toB64url(JSON.stringify(payload));
}

/**
 * Encode a shortlist (shared favourites) into a token. `groups` is grouped by
 * venue: `{ venueId, venueName, isRecipe, sub, venueFav, dishes }`, where
 * `venueFav` means the whole place is hearted (not just some dishes) and `sub`
 * is the venue's area/cuisine caption. Unlike an order, a shortlist has no
 * prices or quantities; it does carry the recipe flag, so a received recipe
 * favourite links to recipe.html rather than a 404 on restaurant.html.
 *
 * `dishes` entries may be a bare name string or `{ name, dishId }` — pass the
 * id and a shared shortlist naming a disambiguated row (the Gold Card
 * Cheeseburger, not the Mains one) lands on that row. See packGroups.
 */
export function encodeShortlist({ label = "", groups = [] }) {
  const payload = { v: CODEC_VERSION, t: TAG_OF_TYPE.shortlist, g: packGroups(groups) };
  const l = cleanLabel(label);
  if (l) payload.l = l;
  return toB64url(JSON.stringify(payload));
}

// Venue-grouped favourites on the wire. Shared by the shortlist share and the
// personal transfer so the two can never drift into two shapes for one thing.
//
// `d` stays a bare array of NAME strings, byte for byte, even though dishes now
// have ids (ADR 0051): changing that array's ELEMENT TYPE is the one change to
// this wire that an existing decoder cannot ignore — it reads each element
// through `clip(raw ?? "")`, so an array or object element would arrive as
// stringified garbage rather than degrading, and only a CODEC_VERSION bump
// could stop it. That bump is what the whole append-a-slot design exists to
// avoid: the version is shared by orders, shortlists AND personal transfers and
// checked with a strict `!==`, so bumping it invalidates every outstanding link
// of all three kinds.
//
// So the id rides BESIDE the name, in `k`: an optional array positionally
// parallel to `d`, holding the id at the same index where it says something the
// name doesn't, and `null` everywhere else. This is the order line's trick, in
// the container this payload actually has — a group is a KEYED object, not a
// positional array, so its "appended slot" is a new key. The guarantee is the
// same one and it is what makes the change safe: a decoder that predates `k`
// reads `g.d` and never looks at `g.k`, so a new code degrades in it to the
// bare slug — precisely what a shortlist did before ids existed. It
// under-specifies rather than mis-states, the only safe direction.
//
// `dishes` accepts a bare name string (what groupForShare hands us) or an
// entry-shaped `{ name, dishId }`. A group of bare strings encodes to the same
// bytes it always did, `k` and all — absent.
function packGroups(groups) {
  return (groups || []).map((g) => {
    const dishes = (g.dishes || []).map((d) => (typeof d === "string" ? { name: d } : d || {}));
    const names = dishes.map((d) => clip(d.name, MAX_NAME));
    // Resolved against the CLIPPED name, so encode and decode agree about what
    // "the name alone would have meant" even for an over-long one — the same
    // rule the order line's slot 4 uses.
    const ids = dishes.map((d, i) => {
      const id = clip(dishId({ dishId: d.dishId, name: names[i].trim() }), MAX_NAME);
      return id && id !== slug(names[i].trim()) ? id : null;
    });
    const out = {
      v: clip(g.venueId, MAX_NAME),
      n: clip(g.venueName, MAX_NAME),
      r: g.isRecipe ? 1 : 0,
      s: clip(g.sub ?? "", MAX_NAME),
      f: g.venueFav ? 1 : 0,
      d: names,
    };
    // Only where at least one id says something its name doesn't, so an
    // ordinary shortlist — every shortlist on the day this shipped — does not
    // grow by a single byte.
    if (ids.some(Boolean)) out.k = ids;
    return out;
  });
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

/**
 * The optional fourth slot: `[[group, name, price], …]`. Absent on every link
 * minted before add-ons existed, which is exactly why it is optional — an old
 * link decodes to a line with no selection, which is what it meant.
 *
 * Hostile input reaches here (anyone can craft a link), so it is clipped and
 * clamped like everything else, and a malformed entry is dropped rather than
 * trusted — an add-on that arrives half-read must not become an untagged
 * option on someone's plate.
 */
function decodeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const o of raw.slice(0, MAX_OPTIONS)) {
    if (!Array.isArray(o)) continue;
    const group = clip(o[0] ?? "", MAX_NAME).trim();
    const name = clip(o[1] ?? "", MAX_NAME).trim();
    if (!group || !name) continue;
    out.push({ group, name, price: priceOrNull(o[2]) });
  }
  return out;
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
      const item = { venueId, venueName, phone, name, price: priceOrNull(line[1]), qty };
      // Only when there is one: a link minted before add-ons existed decodes to
      // exactly the shape it always did, field for field.
      const options = decodeOptions(line[3]);
      if (options.length) item.options = options;
      // Slot 4, the dish id (ADR 0051). Absent on every link minted before ids
      // existed, and then the line means `slug(name)` — which is exactly what
      // it meant then, and what `dishId()` falls through to now. Carried only
      // when it says something the name doesn't, so an old link and a new one
      // for the same plain dish decode to identical objects. Clipped and
      // trimmed like every other string off the wire; it reaches a storage key
      // and never an href, so no further escaping is owed.
      const id = clip(line[4] ?? "", MAX_NAME).trim();
      if (id && id !== slug(name)) item.dishId = id;
      items.push(item);
      if (items.length >= MAX_ITEMS) break outer;
    }
  }
  return items;
}

// Shortlist → flat favourites entries (matching favourites.js: a `venue` entry
// for a whole-place heart, a `dish` entry per hearted dish). A group with
// neither a venue heart nor any dish is dropped.
//
// `dishId` comes off the parallel `k` array (see packGroups), and only where
// the wire carries one: a code minted before `k` existed sets no `dishId`, so
// favKey resolves the entry through `slug(name)` — the identity a received
// shortlist has always landed under, unchanged.
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
    // Attacker-authorable, like everything else here: a `k` that is the wrong
    // type, the wrong length or full of objects must degrade to "no ids", never
    // throw and never attach an id to the wrong row.
    const ids = Array.isArray(g.k) ? g.k : [];
    for (const [i, raw] of dishes.entries()) {
      const name = clip(raw ?? "", MAX_NAME).trim();
      if (!name) continue;
      const item = { type: "dish", name, ...base };
      // Carried only when it says something the name doesn't — so an old code
      // and a new one for the same plain dish decode to identical objects.
      // Reaches a storage key and never an href, so no further escaping is owed.
      const id = typeof ids[i] === "string" ? clip(ids[i], MAX_NAME).trim() : "";
      if (id && id !== slug(name)) item.dishId = id;
      items.push(item);
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
 * `groups` is groupForShare()-shaped, exactly as a shortlist (dish ids included
 * where the producer supplies them — see packGroups); `ratings` is the
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
  let ratings = {};
  if (p.r && typeof p.r === "object" && !Array.isArray(p.r)) {
    for (const [k, val] of Object.entries(p.r)) {
      const score = Math.round(Number(val));
      if (!k || !Number.isFinite(score) || score <= 0) continue;
      ratings[clip(k, MAX_NAME)] = Math.min(score, 5);
    }
    // Ratings ride as whole composite key strings, and a build that predates
    // dish ids exported them with the dish's NAME in them (ADR 0051). Migrated
    // here so a transfer from an older phone lands on the same marks a newer
    // one would write, rather than as a parallel set the next read discards.
    ratings = migrateDishKeys(ratings);
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
