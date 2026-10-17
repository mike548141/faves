// The activity log — what a person changed, kept as an append-only ring buffer
// (Theme 32a, owner-raised 2026-08-16: "user changes like adding/changing/
// removing a rating, a favourite…"; design ADR 0164).
//
//   faves.activity.v1  →  [{ at, kind, subject: { venue?, dish?, label? }, from, to }]
//
// THE MOST SENSITIVE THING FAVES STORES. Favourites and ratings are current
// state; a log is BEHAVIOUR — what you liked and then unliked, and when you were
// doing it. So it is per person (`profileScopedStorage()`, a shared family phone
// does not leak one person's evening to another), on this device only (NOT in
// `SCOPED_BASE_KEYS`, so it never syncs and never migrates — an older build's
// sync cannot erase what it cannot name), and never precached or sent anywhere.
// The backup file carries it as a named per-person field and Reset-class wipes
// destroy it (personal-data.js, profiles.js).
//
// HONEST LOG, NO ESCAPE HATCH (owner-ruled 2026-08-16, roadmap 430): nothing is
// erased short of wiping the whole log. A removal is recorded as a removal, and
// there is no per-entry "forget this". So this module has no way to delete or
// edit one entry: `record` appends, the ring evicts the oldest, and `clear()`
// empties the lot.
//
// 🛑 settings.change LOGS WHICH DIAL, NEVER THE VALUE. A flagged allergen is a
// health fact about a named person, the one class this repo never stores. That
// is enforced HERE, not trusted to the callers: `makeEntry` throws away `from`,
// `to`, `venue` and `dish` for that kind and accepts a `label` only if it is one
// of SETTINGS_DIALS, so an allergen key cannot reach the log by a caller's
// mistake, and an entry read back from storage or a file passes the same gate.
//
// THE LABEL IS SNAPSHOTTED AT WRITE TIME, never resolved when read: a dish can
// leave a menu, and an entry that renders as "a dish that no longer exists" is
// useless. `venue`/`dish` (ADR 0051 ids) keep the link; `label` keeps the
// sentence when the link dangles.
//
// A RING BUFFER WITH A STATED CAP. localStorage is a few megabytes shared with
// everything else the personal layer keeps, and the failure mode of filling it
// is that FAVOURITES stop saving. So the log keeps the last ACTIVITY_CAP entries
// and evicts the oldest; the screen (32b) states the cap from this constant.
//
// NEVER THROWS, AND NEVER GOES FIRST. Every caller records AFTER its own real
// write, and `record` swallows everything: a full, blocked or stale-tab storage
// must not stop a favourite saving. Pure model over an injected storage, like
// cart.js; the singleton is at the foot.

import { profileScopedStorage, profiles, ACTIVITY_BASE_KEY } from "./profiles.js";
import { rawOf } from "./store.js";
import { dishId } from "./dish-id.js";

export const ACTIVITY_KEY = ACTIVITY_BASE_KEY;

/** How many entries the log keeps. A starting figure, not a measurement
 *  (roadmap 390/010): ~160 bytes each, so ~80 KB at the cap (measured), per person. The
 *  screen states it ("the last N"); there are no silent caps. */
export const ACTIVITY_CAP = 500;

/** What a person does — the half the owner called "more importantly". */
export const PERSONAL_KINDS = Object.freeze([
  "favourite.add",
  "favourite.remove",
  "rating.set",
  "rating.clear",
  "report.sent",
  "order.add",
  "order.remove",
  "order.clear",
  "profile.switch",
  "settings.change",
  "reset.performed",
]);

/** What the app does to itself (32c). In the vocabulary now so a build that
 *  starts writing them is read by every older reader of the same store. */
export const SYSTEM_KINDS = Object.freeze(["data.updated", "app.updated", "cache.refreshed"]);

export const KINDS = Object.freeze([...PERSONAL_KINDS, ...SYSTEM_KINDS]);

/** The dials `settings.change` may name — the whole of what it may say. Not
 *  `picksClosed` (a remembered ✕ on a hint, not a preference) and not a field a
 *  newer build carries that this one has never heard of. */
export const SETTINGS_DIALS = Object.freeze([
  "favBoostKm",
  "farKm",
  "diet",
  "foodPrefs",
  "lang",
  "mapsApp",
  "units",
  "currency",
]);

/** `reset.performed` names what was reset, from a closed list as well. */
export const RESET_SCOPES = Object.freeze(["settings", "everything"]);

// Kinds whose from/to are counts or scores (rating 1..5, order quantity).
const NUMERIC = new Set(["rating.set", "rating.clear", "order.add", "order.remove", "order.clear"]);
// Kinds whose from/to are version stamps ("2026-10-18.2").
const VERSIONED = new Set(["data.updated", "app.updated", "cache.refreshed"]);

const MAX_STR = 200;
const MAX_VERSION = 40;
const MAX_NUMBER = 9999;
const AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const clip = (v, n = MAX_STR) => (typeof v === "string" ? v : "").trim().slice(0, n);

function cleanNumber(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 0 && n <= MAX_NUMBER ? n : null;
}

function cleanValue(kind, v) {
  if (NUMERIC.has(kind)) return cleanNumber(v);
  if (VERSIONED.has(kind)) return typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_VERSION) : null;
  return null; // every other kind carries no value at all
}

function cleanSubject(kind, s) {
  const src = isObj(s) ? s : {};
  if (kind === "settings.change") {
    return SETTINGS_DIALS.includes(src.label) ? { label: src.label } : null;
  }
  if (kind === "reset.performed") {
    return RESET_SCOPES.includes(src.label) ? { label: src.label } : null;
  }
  const out = {};
  const venue = clip(src.venue);
  const dish = clip(src.dish);
  const label = clip(src.label);
  if (venue) out.venue = venue;
  if (dish) out.dish = dish;
  if (label) out.label = label;
  return out;
}

/**
 * One entry as the log will hold it, or `null` when it cannot be a valid one.
 * The single gate every write, every read and every import passes through — so
 * the rules above (no value on a settings entry, a closed vocabulary, bounded
 * strings) hold for a hand-edited backup exactly as for the live recorder.
 */
export function makeEntry({ at, kind, subject, from, to } = {}) {
  if (!KINDS.includes(kind)) return null;
  if (typeof at !== "string" || !AT_RE.test(at) || !Number.isFinite(Date.parse(at))) return null;
  const subj = cleanSubject(kind, subject);
  if (!subj) return null;
  // Frozen, so the copy `entries()` hands out is read-only all the way down: an
  // entry cannot be edited through the log, only the whole log cleared.
  return Object.freeze({
    at,
    kind,
    subject: Object.freeze(subj),
    from: cleanValue(kind, from),
    to: cleanValue(kind, to),
  });
}

/** A stored or imported list, validated: junk dropped, newest ACTIVITY_CAP kept,
 *  order preserved. Idempotent. */
export function sanitiseActivity(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    const entry = isObj(e) ? makeEntry(e) : null;
    if (entry) out.push(entry);
  }
  return out.length > ACTIVITY_CAP ? out.slice(-ACTIVITY_CAP) : out;
}

const entryKey = (e) => JSON.stringify([e.at, e.kind, e.subject, e.from, e.to]);

/**
 * Fold an incoming list (a backup file) into this person's own: the union, in
 * time order, newest ACTIVITY_CAP kept. Nothing "wins", because there is no
 * conflict — an entry is a fact that happened. An entry already here (a
 * re-import of one's own file) is not added twice. Returns `{ merged, added }`
 * where `added` counts incoming entries that are in `merged` and were not in
 * `mine`.
 */
export function mergeActivity(mine, incoming) {
  const have = new Set(mine.map(entryKey));
  const fresh = [];
  for (const e of incoming) {
    const k = entryKey(e);
    if (have.has(k)) continue;
    have.add(k);
    fresh.push(e);
  }
  if (!fresh.length) return { merged: mine, added: 0 };
  // Array.prototype.sort is stable, so entries sharing a second keep the order
  // they were recorded in.
  const all = [...mine, ...fresh].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const merged = all.length > ACTIVITY_CAP ? all.slice(-ACTIVITY_CAP) : all;
  const mineKeys = new Set(mine.map(entryKey));
  return { merged, added: merged.filter((e) => !mineKeys.has(entryKey(e))).length };
}

/** The `subject` for a heart or rating `entry` (`{ type, venueId, venueName,
 *  name, dishId? }`), or for an order line (`{ venueId, venueName, name,
 *  dishId? }`) when `line` is true. A venue-level entry has no dish. */
export function subjectOf(entry, { line = false } = {}) {
  const e = entry || {};
  if (!line && e.type === "venue") return { venue: e.venueId, label: e.venueName || "" };
  return { venue: e.venueId, dish: dishId(e), label: e.name || "" };
}

/** Which dials differ between two settings states (the raw stored objects).
 *  Names only — the values are compared here and go no further. */
export function changedDials(before, after) {
  return SETTINGS_DIALS.filter((d) => JSON.stringify(before?.[d]) !== JSON.stringify(after?.[d]));
}

const stamp = (d) => d.toISOString().slice(0, 19) + "Z";

export function createActivity(storage, { now = () => new Date() } = {}) {
  const subs = new Set();
  // The raw string this page last read or wrote: the log REPLACES its whole
  // value on every append, so a page must never append to a copy older than
  // storage (another tab, an import, a profile switch re-pointing the scoped
  // key) — the same discipline favourites.js keeps (roadmap 510/320).
  let seen = null;

  function read() {
    seen = rawOf(storage, ACTIVITY_KEY);
    try {
      return sanitiseActivity(JSON.parse(seen || "[]"));
    } catch {
      return [];
    }
  }

  let items = read();

  function fresh() {
    if (rawOf(storage, ACTIVITY_KEY) !== seen) items = read();
  }

  function notify() {
    for (const fn of subs) {
      try {
        fn(items);
      } catch {
        /* a listener that fails must not stop the others hearing */
      }
    }
  }

  return {
    /** Oldest first. A copy: nothing outside can edit the log in place. */
    entries: () => {
      fresh();
      return items.slice();
    },
    count: () => {
      fresh();
      return items.length;
    },
    cap: ACTIVITY_CAP,

    /**
     * Append one event. Returns whether it was recorded. NEVER throws: a failed
     * write keeps the entry in memory for this session (as every store here
     * does) and the caller's own change is unaffected.
     */
    record(kind, subject, from = null, to = null) {
      try {
        const entry = makeEntry({ at: stamp(now()), kind, subject, from, to });
        if (!entry) return false;
        fresh();
        items = items.length >= ACTIVITY_CAP ? [...items.slice(items.length - ACTIVITY_CAP + 1), entry] : [...items, entry];
        try {
          const next = JSON.stringify(items);
          storage.setItem(ACTIVITY_KEY, next);
          seen = next;
        } catch {
          /* blocked / full / a stale tab — in-memory, this session only */
        }
        notify();
        return true;
      } catch {
        return false;
      }
    },

    /** Empty the whole log — the only deletion there is (the owner's ruling).
     *  For the wipe paths; nothing per-entry exists. Returns how many went. */
    clear() {
      fresh();
      const n = items.length;
      items = [];
      try {
        storage.removeItem(ACTIVITY_KEY);
        seen = null;
      } catch {
        /* blocked — nothing persisted to remove */
      }
      notify();
      return n;
    },

    reload() {
      items = read();
      notify();
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// Per person: whoever is active when something happens is who it is recorded
// against (the order tally is the device's, but WHO tapped "add" is a person).
export const activity = createActivity(profileScopedStorage());

// Choosing a profile is itself an event, recorded in the log of the profile
// chosen. `fresh()` in `record` re-reads the log the scoped key now points at,
// so no reload ordering has to be remembered here.
profiles.onSwitch(({ name }) => activity.record("profile.switch", { label: name }));
