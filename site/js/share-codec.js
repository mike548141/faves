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

import { dishId } from "./dish-id.js";
import { slug } from "./slug.js";

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
// A note is one spoken sentence — "no tomato", "sauce on the side" — so it gets
// its own, shorter ceiling rather than borrowing MAX_NAME's 120. 80 is the cap
// the order sheet's input enforces too, and the two must agree or a note typed
// on one phone would arrive truncated on another with nothing having said so.
const MAX_NOTE = 80;
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

// A per-line note (Theme 14c). Control characters become spaces first (a note
// is rendered as text, and a stray newline in an order line is nobody's
// customisation), then whitespace runs collapse and the ends trim — the SAME
// normalisation `normaliseNote` in cart.js applies, because a note that arrives
// spelt differently keys as a different line and quietly splits the order in
// two. tests/share-codec.test.js runs both over one table so they cannot drift.
//
// A non-string (a crafted number, object or null) becomes "" rather than going
// through String(): "[object Object]" on someone's plate is landing garbage,
// which is exactly what the clip-everything rule exists to prevent. Clipped
// LAST-but-one and trimmed again after, so a cut mid-word can't leave a
// trailing space that would key as a different line from the sender's.
const cleanNote = (v) => {
  if (typeof v !== "string") return "";
  // `\p{Cc}` — the whole C0/C1 control category — rather than cleanLabel's
  // explicit range, and mapped to a SPACE rather than deleted: a NUL between
  // two words must not weld them into one.
  const collapsed = v.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return clip(collapsed, MAX_NOTE).trim();
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
    // §4), the dish id as an optional fifth (ADR 0051) and the free-text note
    // as an optional sixth (Theme 14c). Deliberately NOT a
    // CODEC_VERSION bump: that field is shared by orders AND shortlists and is
    // checked with a strict `!==`, so bumping it would invalidate every
    // outstanding link of both kinds for a change one of them doesn't use.
    // Appending is safe instead because a decoder that
    // predates either slot reads line[0..2] and ignores the rest by
    // construction — and `price` here is the CONFIGURED unit price, so that
    // older reader still totals correctly. It under-specifies the order rather
    // than mis-stating it: dropping an add-on can never put something extra on
    // a plate, which is the only degradation direction that is safe.
    //
    // 🚩 THE NOTE IS THE EXCEPTION, AND THAT PARAGRAPH MUST NOT BE READ AS
    // COVERING IT. An add-on is an ADDITION, so an old decoder dropping it
    // takes something off the plate. A note is characteristically a REMOVAL —
    // "no tomato", "no onion", "sauce on the side" — so an old decoder dropping
    // it leaves the unwanted thing ON the plate. That is the other degradation
    // direction, and it is the unsafe one. The slot is appended anyway, with
    // eyes open, because the alternative is worse: a note that does not travel
    // sends your friend to the counter to order the exact dish you asked to
    // have changed, and that fails EVERY time. Carrying it fails only against a
    // decoder old enough to predate the slot — a link minted by a phone still
    // running a build from before this shipped. The choice is a guaranteed
    // failure against a shrinking one, not a safe option against a risky one.
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
      const note = cleanNote(it.note);
      // Positional slots need PLACEHOLDERS, not omission: a note on a line with
      // no add-ons and no distinguishing id would otherwise land at index 3 and
      // be read as an options array. So a later slot forces `null` into every
      // earlier optional one, and each condition is "mine, or anything after
      // mine".
      if (opts.length || carryId || note)
        line.push(opts.length ? opts.map((o) => [clip(o.group, MAX_NAME), clip(o.name, MAX_NAME), priceOrNull(o.price)]) : null);
      if (carryId || note) line.push(carryId ? id : null);
      if (note) line.push(note);
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

// Venue-grouped favourites on the wire.
//
// `d` stays a bare array of NAME strings, byte for byte, even though dishes now
// have ids (ADR 0051): changing that array's ELEMENT TYPE is the one change to
// this wire that an existing decoder cannot ignore — it reads each element
// through `clip(raw ?? "")`, so an array or object element would arrive as
// stringified garbage rather than degrading, and only a CODEC_VERSION bump
// could stop it. That bump is what the whole append-a-slot design exists to
// avoid: the version is shared by orders AND shortlists and checked with a
// strict `!==`, so bumping it invalidates every outstanding link of both kinds.
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
      // Slot 5, the free-text note (Theme 14c). Set only when there is one, so
      // a link minted before notes existed decodes to exactly the object it
      // always did, field for field.
      //
      // Unlike the dish id above — which "reaches a storage key and never an
      // href" — a note REACHES THE DOM: it is rendered as text to whoever is
      // reading the order out at the counter. cart-ui.js sets it with
      // `textContent`, never `innerHTML`, so markup in a crafted link is shown
      // as the characters someone typed rather than parsed. Sanitising here is
      // the belt; textContent there is the braces, and the braces are the part
      // that actually holds.
      const note = cleanNote(line[5]);
      if (note) item.note = note;
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
