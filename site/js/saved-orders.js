// Saved orders — "my Subway" (Theme 26a, owner-raised 2026-08-16: "saving an
// order for Subway that I use each time"). A NAMED, reusable order for ONE
// venue, kept on this device and recalled into the tally in one tap.
//
// WHAT IT STORES, AND WHY IT IS NOT THE TALLY'S LINES. A saved line keeps the
// two things a recall has to RESOLVE against today's menu — the dish's id and
// each add-on option's id (ADR 0051, 0126: never a name, never a position) —
// plus the note, which is the reader's own text. The name, the configured unit
// price and each option's name/price ride along as a SNAPSHOT of what was saved:
// recall does not trust them (it re-prices from the live menu, saved-recall.js),
// but they let a line that no longer resolves be named to the reader, and they
// are what Theme 26c needs to say "this is $2 dearer than when you saved it".
// A snapshot is not an identity; nothing below ever matches on one.
//
//   faves.savedorders.v1  →  [{
//     id,                 // minted here; the handle for delete and for 26b
//     venueId, venueName, // the venue's id (renames.js follows a moved one)
//     name,               // what the reader called it, ≤ 40 characters
//     lines: [{ dishId, name, qty, price, currency, note?,
//               options?: [{ group, id, name, price }] }]
//   }]
//
// PER PERSON, NOT PER DEVICE. The order tally is one order for the table
// (ADR 0012); a saved order is somebody's usual, and recalled into a profile
// whose allergen flags differ it is the dish rows' warnings that must speak —
// so it follows favourites and notes through `profileScopedStorage()`.
//
// 🛑 DELIBERATELY NOT IN `SCOPED_BASE_KEYS` (profiles.js), the list sync merges
// and `migrate` copies. Theme 26a's brief is "never leaves the device" (26b is
// the item that would change that), and that list is precisely what makes a
// store travel. So, like the cook-mode ticks (ADR 0067), it sits beside it:
// sync's `writeSnapshot` writes four named keys and touches no others, and an
// older build's sync cannot erase what it cannot name. The BACKUP file is the
// user's own and does carry it, through a named per-person field rather than the
// catch-all bag (personal-data.js says why) — and only when the caller asks
// (`collectPersonalData(…, { localOnly: true })`), which sync never does.
//
// Pure model over an injected storage, like cart.js; the singleton is at the
// foot. Every write goes through `safeStorage()`'s guard (store.js), so a stale
// tab refuses to save.

import { profileScopedStorage, profiles, SAVED_ORDERS_BASE_KEY } from "./profiles.js";
import { rawOf } from "./store.js";
import { normaliseNote } from "./cart.js";
import { optionId } from "./addons.js";
import { dishId } from "./dish-id.js";
import { canonicalVenueId } from "./renames.js";

export const SAVED_ORDERS_KEY = SAVED_ORDERS_BASE_KEY;

export const MAX_NAME = 40;
export const MAX_SAVED = 60; // per person; a "usual" is a handful, not a database
const MAX_LINES = 40;
const MAX_OPTIONS = 20;
const MAX_STR = 200;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const clip = (v, n = MAX_STR) => (typeof v === "string" ? v : String(v ?? "")).slice(0, n).trim();

/** A saved order's name as the reader would type it: whitespace collapsed,
 *  trimmed, capped. `""` for anything that isn't a string. */
export function normaliseName(v) {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

const sameName = (a, b) => normaliseName(a).toLowerCase() === normaliseName(b).toLowerCase();

function cleanOptions(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const o of list.slice(0, MAX_OPTIONS)) {
    if (!isObj(o)) continue;
    const group = clip(o.group);
    const id = optionId({ id: typeof o.id === "string" ? clip(o.id) : "", name: clip(o.name) });
    if (!group || !id) continue;
    const price = Number(o.price);
    out.push({ group, id, name: clip(o.name), price: Number.isFinite(price) && price >= 0 ? price : 0 });
  }
  return out;
}

function cleanLine(l) {
  if (!isObj(l)) return null;
  const id = dishId({ dishId: typeof l.dishId === "string" ? clip(l.dishId) : "", name: clip(l.name) });
  const qty = Math.floor(Number(l.qty));
  if (!id || !Number.isFinite(qty) || qty <= 0) return null;
  const price = Number(l.price);
  const line = {
    dishId: id,
    name: clip(l.name),
    qty: Math.min(qty, 99),
    price: l.price != null && Number.isFinite(price) && price >= 0 ? price : null,
    currency: typeof l.currency === "string" && /^[A-Z]{3}$/.test(l.currency) ? l.currency : "NZD",
  };
  const note = normaliseNote(clip(l.note, 80));
  if (note) line.note = note;
  const options = cleanOptions(l.options);
  if (options.length) line.options = options;
  return line;
}

/**
 * Validate a stored or imported list: the one gate every read, every write and
 * every import passes through, so a hand-edited backup or a corrupt payload can
 * never reach the screen or the tally. Drops what it cannot trust rather than
 * repairing it; keeps the first of any duplicate id.
 */
export function sanitiseSavedOrders(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const e of list) {
    if (!isObj(e)) continue;
    const id = clip(e.id, 64);
    const venueId = clip(e.venueId);
    const name = normaliseName(e.name);
    if (!id || !venueId || !name || seen.has(id)) continue;
    const lines = (Array.isArray(e.lines) ? e.lines : []).slice(0, MAX_LINES).map(cleanLine).filter(Boolean);
    if (!lines.length) continue;
    seen.add(id);
    out.push({ id, venueId: canonicalVenueId(venueId), venueName: clip(e.venueName), name, lines });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

/**
 * One venue's tally lines (`order.groups()[n].items`) as saved lines. Drops what
 * is per-visit — `collected`, `phone` — and keeps what identifies and what the
 * reader said. Options are keyed by `optionId`, so a line stored before option
 * ids existed saves under the slug of its name, which is what every seeded id is.
 */
export function linesToSave(items) {
  return (items || [])
    .map((i) =>
      cleanLine({
        dishId: dishId(i),
        name: i.name,
        qty: i.qty,
        price: i.price,
        currency: i.currency,
        note: i.note,
        options: (i.options || []).map((o) => ({ group: o.group, id: optionId(o), name: o.name, price: o.price })),
      })
    )
    .filter(Boolean);
}

const mintId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Create the store over a storage backend (injectable for tests). Subscribers
 * are told on every change and on `reload()`.
 *
 * `fresh()` catches up with a write made by another tab before this one writes
 * the whole list back over it — the same lost-update guard favourites and notes
 * carry (roadmap 510/320): a whole-value store that writes from a stale copy
 * undoes whatever landed in between.
 */
export function createSavedOrders(storage) {
  const subs = new Set();
  let seen = null;

  function read() {
    seen = rawOf(storage, SAVED_ORDERS_KEY);
    try {
      return sanitiseSavedOrders(JSON.parse(seen || "[]"));
    } catch {
      return []; // corrupt payload → start clean rather than crash
    }
  }

  let list = read();

  function notify() {
    for (const fn of subs) fn(list);
  }

  function fresh() {
    if (rawOf(storage, SAVED_ORDERS_KEY) === seen) return;
    list = read();
    notify();
  }

  function commit() {
    try {
      const next = JSON.stringify(list);
      storage.setItem(SAVED_ORDERS_KEY, next);
      seen = next;
    } catch {
      /* blocked, over quota or a stale tab — the in-memory list drives the session */
    }
    notify();
  }

  return {
    all: () => list,
    count: () => list.length,

    /** This venue's saved orders, oldest first. A moved venue id still matches. */
    forVenue(venueId) {
      const want = canonicalVenueId(venueId);
      return list.filter((s) => canonicalVenueId(s.venueId) === want);
    },

    /**
     * Save `lines` (see `linesToSave`) under `name` for a venue. A name already
     * used for THIS venue (case aside) is the same order being updated — "my
     * Subway" saved again is the new "my Subway", not a second one beside it.
     * Returns `{ ok: true, saved, updated }`, or `{ ok: false, reason }` —
     * "name" (nothing usable typed), "empty" (no lines) or "full".
     */
    save({ venueId, venueName, name, lines }) {
      fresh();
      const nm = normaliseName(name);
      if (!nm) return { ok: false, reason: "name" };
      const clean = (Array.isArray(lines) ? lines : []).map(cleanLine).filter(Boolean);
      if (!clean.length || !venueId) return { ok: false, reason: "empty" };
      const vid = canonicalVenueId(String(venueId));
      const at = list.findIndex((s) => canonicalVenueId(s.venueId) === vid && sameName(s.name, nm));
      const entry = {
        id: at >= 0 ? list[at].id : mintId(),
        venueId: vid,
        venueName: clip(venueName),
        name: nm,
        lines: clean,
      };
      if (at < 0 && list.length >= MAX_SAVED) return { ok: false, reason: "full" };
      list = at >= 0 ? list.map((s, i) => (i === at ? entry : s)) : [...list, entry];
      commit();
      return { ok: true, saved: entry, updated: at >= 0 };
    },

    /** Delete one by id. Returns whether it was there. */
    remove(id) {
      fresh();
      if (!list.some((s) => s.id === id)) return false;
      list = list.filter((s) => s.id !== id);
      commit();
      return true;
    },

    /** Re-read from storage — after a profile switch or a cross-tab write. */
    reload() {
      list = read();
      notify();
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per-profile, over the same scoped wrapper favourites use, so a profile switch
// plus reload() re-points it.
export const savedOrders = createSavedOrders(profileScopedStorage());

// Follows the registry itself, as checklist.js does: nothing safety-critical
// repaints from a saved order, so the load-bearing reload ORDER that
// `reloadProfileStores` exists for does not apply, and this is correct on every
// screen rather than only on the ones that remembered to pass it along.
profiles.subscribe(() => savedOrders.reload());
