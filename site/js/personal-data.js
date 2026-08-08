// The whole device-local personal layer, gathered into one serialisable
// object — everything the user themselves put into Faves, as opposed to the
// curated data we ship in the repo (ROADMAP Theme 12).
//
// WHY THIS EXISTS AS ITS OWN MODULE. Three separate features need exactly
// this "gather the personal layer / hand it back" operation, and writing it
// three times guarantees they drift:
//   • data export (Theme 12a) — the only consumer today, via settings-ui.js;
//   • the cross-device sync blob (ADR 0017 / Theme 9 v2) — same object, then
//     encrypted before it leaves the device;
//   • cross-person share grants (Theme 10) — a *scoped subset* of the same.
// So this is deliberately built one step more general than export needs.
//
// There is NO apply/import counterpart yet, and that is on purpose: import
// (Theme 12b) has open design calls the roadmap records — merge vs replace,
// what to do when a file from another device carries a colliding profile id,
// and how allergen preferences may be overwritten (safety-relevant). Writing
// a speculative applier now would bake in answers nobody has chosen.
//
// WHAT IS DELIBERATELY NOT COLLECTED. The Near-me origin (`faves.origin.v1`)
// is the user's own location and lives in sessionStorage, so it never appears
// here even by accident. The exported file says so, because a backup that
// silently omitted something would be the dishonest kind of quiet.
//
// Pure and DOM-free (storage is injected), so it unit-tests without a browser.

import { PROFILES_KEY, SCOPED_BASE_KEYS, sanitiseRegistry, scopeKey } from "./profiles.js";

/** Marker + version of the on-disk shape. This is a contract we have to keep
 *  being able to read, which is exactly why the file is not a raw dump of
 *  localStorage: the internal key names are ours to change, this isn't. */
export const FORMAT = "faves.personal-data";
export const FORMAT_VERSION = 1;

/** Device-level (not per-profile) stores. The order tally is one order for
 *  the table, shared by whoever is using the phone — see ADR 0012. */
export const ORDER_KEY = "faves.order.v1";

const README =
  "Your own Faves data — favourites, ratings, settings, profiles and the order tally. " +
  "Faves keeps this in your browser only; this file is a copy you asked for, and " +
  "producing it sent nothing anywhere.";

const EXCLUDED = {
  "faves.origin.v1":
    "Your last “Near me” location. Deliberately not exported: it is your " +
    "whereabouts, and it is session-only anyway.",
};

function parse(raw) {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null; // corrupt/hand-edited value — record it as absent, never throw
  }
}

/**
 * Every `faves.`-prefixed key a storage backend can enumerate. Returns [] when
 * the backend can't enumerate (the in-memory shim `safeStorage()` falls back to
 * in a locked-down browser) — callers must treat it as best-effort, not proof.
 */
export function listStoredKeys(storage) {
  if (!storage || typeof storage.key !== "function" || typeof storage.length !== "number") return [];
  const out = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (typeof k === "string" && k.startsWith("faves.")) out.push(k);
  }
  return out.sort();
}

/**
 * Collect the whole personal layer.
 *
 * Reads the raw stores directly rather than going through the live
 * favourites/settings/ratings singletons, because those are scoped to whoever
 * is *active* — and a backup that silently held one person's data while three
 * people use the phone would be worse than no backup at all.
 *
 * `exportedAt` is injected (no clock in here) so the output is deterministic
 * and testable.
 */
export function collectPersonalData(storage, { exportedAt } = {}) {
  const registry = sanitiseRegistry(parse(storage.getItem(PROFILES_KEY)));
  // Seeded with the EXCLUDED keys as well as the known ones: without that, the
  // catch-all sweep below would happily re-collect the location this module
  // promises never to export, the moment it appeared in localStorage. An
  // exclusion that only holds while nobody moves a key is not an exclusion.
  const known = new Set([PROFILES_KEY, ORDER_KEY, ...Object.keys(EXCLUDED)]);

  const people = registry.profiles.map((p) => {
    const entry = { id: p.id, name: p.name, active: p.id === registry.activeId };
    for (const base of SCOPED_BASE_KEYS) {
      const key = scopeKey(p.id, base);
      known.add(key);
      // `faves.favourites.v1` → `favourites`; the field reads as what it is.
      const field = base.replace(/^faves\./, "").replace(/\.v\d+$/, "");
      entry[field] = parse(storage.getItem(key));
    }
    return entry;
  });

  // Anything else under the `faves.` namespace — a store added after this
  // module was last touched, or data left by an older version. Carried through
  // verbatim so "everything you put in" stays true without this file having to
  // be updated in lockstep with every new feature.
  const other = {};
  for (const key of listStoredKeys(storage)) {
    if (!known.has(key)) other[key] = storage.getItem(key);
  }

  const data = {
    format: FORMAT,
    v: FORMAT_VERSION,
    exportedAt: exportedAt ?? null,
    _readme: README,
    profiles: people,
    order: parse(storage.getItem(ORDER_KEY)) ?? [],
    excluded: EXCLUDED,
  };
  if (Object.keys(other).length) data.other = other;
  return data;
}

/** Counts for the "here's what you just saved" confirmation. Tolerant of a
 *  corrupt store: a missing/!array favourites list counts as 0, never throws. */
export function summarisePersonalData(data) {
  const people = Array.isArray(data?.profiles) ? data.profiles : [];
  const count = (v) => (Array.isArray(v) ? v.length : 0);
  return {
    profiles: people.length,
    favourites: people.reduce((n, p) => n + count(p.favourites), 0),
    ratings: people.reduce(
      (n, p) => n + (p.ratings && typeof p.ratings === "object" ? Object.keys(p.ratings).length : 0),
      0
    ),
    orderItems: count(data?.order),
  };
}

/** `faves-data-2026-08-08.json` — dated so successive backups don't overwrite
 *  each other in the Downloads folder. Falls back to an undated name rather
 *  than emitting something like `faves-data-undefined.json`. */
export function personalDataFilename(exportedAt) {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(String(exportedAt ?? ""))?.[0];
  return day ? `faves-data-${day}.json` : "faves-data.json";
}

/** Pretty-printed on purpose: "machine readable" was the ask, but a person
 *  opening their own backup should recognise their own favourites in it. */
export function personalDataJson(data) {
  return JSON.stringify(data, null, 2) + "\n";
}
