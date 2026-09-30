// The user-data schema: one version number and the chain that upgrades
// everything a person has put into Faves to it (roadmap 510/040, ADR 0145
// "Forward upgrades are guaranteed by tests", ADR 0146 §1).
//
// ONE NUMBER, FOUR COPIES. `USER_SCHEMA` is the shape of the whole personal
// layer. Every copy of that layer carries it and runs through this chain:
//   • this device's local storage — the number sits in `SCHEMA_KEY`, and
//     `upgradeStorage` runs at startup, before any store module reads a key
//     (upgrade-start.js is the first import of every page's entry module);
//   • a backup file, the sync copy on the server and the sync base — each
//     carries it as `v`, and `upgradePersonalData` upgrades it on the way in.
// The field is still called `v` on disk on purpose: every build that has ever
// shipped reads `v`, and renaming it would itself be a format change those
// builds would refuse.
//
// ONE NUMBER DRIVES THE CHAIN; EACH STORE'S OWN NUMBER DECIDES A PAUSE.
// `STORE_SCHEMA` (roadmap 510/010) stays beside `USER_SCHEMA`, because sync
// needs to tell "a store I read has changed shape" (pause) from "a store I have
// never heard of" (carry it) — ADR 0146 §3. The rule that ties them: **a step
// that changes a store's shape also bumps that store's number**. Each step says
// which stores it reshapes (`reshapes`), and tests/user-schema.test.js fails if
// `STORE_SCHEMA` has not caught up with what the steps declare.
//
// WHY A MODULE OF ITS OWN, WITH ONE IMPORT. Every store module (favourites,
// settings, profiles, ratings, notes, the order…) reads storage the moment it
// is evaluated. An ES module's imports are evaluated before its body, in import
// order, so the chain can only run "before any store is read" if it sits in a
// module whose own imports read nothing. That is this file: it imports
// store.js and schema-stamp.js, which read nothing when they load.
// tests/user-schema.test.js holds that line.
//
// Pure where it can be: storage and the clock are injected.

import { listStoredKeys } from "./store.js";
import { USER_SCHEMA, SCHEMA_KEY } from "./schema-stamp.js";

/** The shape of the whole personal layer, and where this device records it.
 *  Replaces `FORMAT_VERSION` (roadmap 510/040). DEFINED in schema-stamp.js
 *  since roadmap 510/110, so store.js can refuse writes from a tab whose build
 *  is behind storage without an import cycle; bump it there, only together
 *  with a step in `UPGRADE_STEPS` from the old number, and a fixture pair for
 *  the new one under tests/fixtures/. */
export { USER_SCHEMA, SCHEMA_KEY };

/**
 * Each store's own shape number (ADR 0146 §3, roadmap 510/010). Carried in
 * every snapshot as `stores`, so a device reading one can tell "a store I know
 * has changed shape since I was built" — the one case where it must stop and
 * ask to be updated — from "a store I have never heard of", which it carries
 * through untouched and keeps syncing. Bump a store's number only when its
 * SHAPE changes in a way this build's reader would misread; adding a store is
 * not a bump of anyone else's number. Frozen: a caller mutating the table
 * would silently change what every later snapshot claims.
 */
export const STORE_SCHEMA = Object.freeze({
  profiles: 1,
  favourites: 1,
  ratings: 1,
  notes: 1,
  settings: 1,
  order: 1,
  // Personal recipes (roadmap 510/050): one record per recipe, in the
  // published recipe shape, filed into sync buckets by a hash of the `u:` id
  // (sync-buckets.js). Changing RECIPE_BUCKETS, the hash or the record's shape
  // is a change of this store's shape: bump this with it.
  // 2 (roadmap 510/120, owner-ruled "Per person"): one cookbook per PERSON,
  // carried inside each profile in a backup and filed by person in a bucket.
  // A build at 1 would read that as an empty cookbook — a backup's recipes
  // silently skipped, a bucket's read as deleted — so it pauses instead.
  recipes: 2,
});

/** The stores in `snapshot.stores` that this build KNOWS and that are numbered
 *  newer than this build reads. A store it does not know is never in this list
 *  — that one is carried, not refused. An absent or malformed `stores` map is a
 *  snapshot from before the numbers existed, which is version 1 of everything. */
export function storesAhead(snapshot) {
  const stores = snapshot?.stores;
  if (!stores || typeof stores !== "object" || Array.isArray(stores)) return [];
  return Object.keys(STORE_SCHEMA).filter((name) => {
    const n = stores[name];
    return typeof n === "number" && Number.isFinite(n) && n > STORE_SCHEMA[name];
  });
}

// `SCHEMA_KEY` (schema-stamp.js) is where this device's local storage records
// the `USER_SCHEMA` its data is in. Excluded from backups (personal-data.js
// EXCLUDED): it is a fact about this device's storage, and a backup carries its
// own number as `v`.

/** The pre-upgrade copy of every `faves.` key, kept until the upgraded version
 *  has run successfully (see `upgradeRan`). Excluded from backups: it is this
 *  device's safety net, not data to carry somewhere else. */
export const UPGRADE_SNAPSHOT_KEY = "faves.upgrade.snapshot.v1";

/**
 * The upgrade chain: one step per schema version, keyed by the version it
 * upgrades FROM. EMPTY until a schema 2 exists, so today the chain is the
 * identity. A step has three parts, and tests/user-schema.test.js refuses a
 * step missing any of them:
 *
 *   {
 *     reshapes: { settings: 2 },  // stores whose SHAPE this step changes, and
 *                                 // the number each one reaches (may be {})
 *     snapshot(data) { … },       // a backup / sync copy / sync base → next
 *     storage(keys) { … },        // this device's `{ "faves.x": "<json>" }` → next
 *   }
 *
 * Both halves must CARRY every field and key they do not understand untouched —
 * the sync copy runs through `snapshot` (sync.js), and a step that rebuilt the
 * object field by field would reintroduce exactly the loss ADR 0146 §3 closed.
 * `storage` must leave `faves.sync.base.v1` alone: the base is a snapshot and is
 * upgraded by `snapshot` when sync next reads it (sync.js `upgradeSnapshot`).
 * Neither half may throw on data it did not expect; if one does, the whole
 * upgrade is abandoned and nothing is written (`upgradeStorage`).
 */
export const UPGRADE_STEPS = Object.freeze({});

/**
 * Bring a snapshot (a backup, the sync copy or the sync base) up to this
 * build's USER_SCHEMA. Never mutates its input. A snapshot already at or above
 * this version is returned as it is: an older build reading a newer one
 * carries it (ADR 0146 §3), and refusing is `storesAhead`'s call, not this
 * function's. A version below 1 predates every format that ever shipped, so
 * the chain starts at 1 for it.
 *
 * `steps` and `target` are injectable so the tests can prove the harness with a
 * synthetic step before any real one exists (roadmap 510/040's break-probe).
 *
 * Returns `{ ok: true, data, from }` or `{ ok: false }` when the input carries
 * no usable version, or a step is missing or throws.
 */
export function upgradePersonalData(raw, { steps = UPGRADE_STEPS, target = USER_SCHEMA } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  if (typeof raw.v !== "number" || !Number.isFinite(raw.v)) return { ok: false };
  const from = raw.v;
  if (from >= target) return { ok: true, data: raw, from };
  let data = { ...raw };
  try {
    for (let v = Math.max(1, Math.floor(from)); v < target; v += 1) {
      const step = steps[v];
      if (typeof step?.snapshot !== "function") return { ok: false };
      data = step.snapshot(data);
      if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false };
    }
  } catch {
    return { ok: false };
  }
  data = { ...data, v: target };
  return { ok: true, data, from };
}

// --- this device's own storage ---------------------------------------------

const parse = (raw) => {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/** The schema this device's storage says it is in: a whole number ≥ 1, null
 *  when nothing is recorded, or NaN when what is recorded cannot be read. */
export function readSchema(storage) {
  let raw;
  try {
    raw = storage.getItem(SCHEMA_KEY);
  } catch {
    return null;
  }
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : NaN;
}

function readSnapshot(storage) {
  let raw;
  try {
    raw = storage.getItem(UPGRADE_SNAPSHOT_KEY);
  } catch {
    return null;
  }
  const s = parse(raw);
  return s && typeof s === "object" && !Array.isArray(s) ? s : null;
}

/** Keys the chain works on: every `faves.` key but its own two. */
const isChainKey = (k) => k !== SCHEMA_KEY && k !== UPGRADE_SNAPSHOT_KEY;

/**
 * Run this device's storage up the chain. Called once per page load by
 * upgrade-start.js, before any store module is evaluated. Never throws.
 *
 * What it does, in order:
 *   1. Drops a pre-upgrade snapshot whose upgrade has since run successfully
 *      (`upgradeRan` marked it, and storage is still at or past its version).
 *   2. Reads `SCHEMA_KEY`. Nothing recorded and no data at all: a fresh device,
 *      stamped with the current number. Nothing recorded but data present: the
 *      data was written before the number existed, which is schema 1.
 *   3. Newer than this build, or unreadable: left exactly as it is. There is no
 *      downgrade (the owner's rule: no requirement to move back to older code),
 *      and guessing at an unreadable number could re-run steps on data they
 *      already upgraded.
 *   4. Older: runs every step on an in-memory copy. A missing step, a throw or
 *      a malformed result abandons the upgrade with NOTHING written.
 *   5. Saves the pre-upgrade snapshot. If it cannot be saved (storage full),
 *      the upgrade does not run: an upgrade with no way back is the one this
 *      design exists to prevent. The next load tries again.
 *   6. Writes the difference, then the new number. If a write fails part way,
 *      every key it touched is put back from the in-memory original.
 *
 * Returns `{ status, from, to }`, status one of: "fresh", "current",
 * "upgraded", "newer", "unreadable", "unavailable" (storage cannot be listed),
 * "missing-step", "failed", "no-room".
 */
export function upgradeStorage(
  storage,
  { steps = UPGRADE_STEPS, target = USER_SCHEMA, now = () => new Date().toISOString() } = {}
) {
  const done = (status, from = null) => ({ status, from, to: target });
  if (!storage || typeof storage.getItem !== "function") return done("unavailable");

  // 1. A snapshot whose upgrade has run successfully has done its job.
  const current = readSchema(storage);
  const held = readSnapshot(storage);
  if (held?.ok === true && Number.isInteger(current) && current >= held.to) {
    try {
      storage.removeItem(UPGRADE_SNAPSHOT_KEY);
    } catch {
      /* it will be dropped on a later load */
    }
  }

  // The common case, every load but the first after an update: one read.
  if (current === target) return done("current", current);

  // An in-memory shim (storage blocked) cannot be listed; it is empty at
  // startup anyway, so there is nothing to upgrade and nothing to stamp.
  if (typeof storage.key !== "function" || typeof storage.length !== "number") return done("unavailable");
  const keys = listStoredKeys(storage).filter(isChainKey);

  // 2. Where the data stands.
  let from = current;
  if (from === null) {
    if (!keys.length) {
      try {
        storage.setItem(SCHEMA_KEY, String(target));
      } catch {
        /* full or blocked: the next load stamps it */
      }
      return done("fresh");
    }
    from = 1;
  }
  // 3. Nothing this build may do.
  if (Number.isNaN(from)) return done("unreadable");
  if (from > target) return done("newer", from);
  if (from === target) {
    if (current === null) {
      try {
        storage.setItem(SCHEMA_KEY, String(target));
      } catch {
        /* the next load stamps it */
      }
    }
    return done("current", from);
  }

  // 4. Every step, on a copy. Storage is untouched until all of them succeed.
  const original = {};
  for (const k of keys) original[k] = storage.getItem(k);
  let next = { ...original };
  try {
    for (let v = from; v < target; v += 1) {
      const step = steps[v];
      if (typeof step?.storage !== "function") return done("missing-step", from);
      next = step.storage({ ...next });
      if (!validKeyMap(next)) return done("failed", from);
    }
  } catch {
    return done("failed", from);
  }

  // 5. The way back, before the way forward. A snapshot from an earlier
  //    upgrade that has NOT yet run successfully is kept as it is: the data
  //    before THAT upgrade is the last state known to work. Its `to` moves on,
  //    so it is dropped only once this new version has run.
  const snapshot =
    held && held.ok !== true && held.keys && typeof held.keys === "object"
      ? { ...held, to: target }
      : { from, to: target, at: now(), ok: false, keys: original };
  try {
    storage.setItem(UPGRADE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    return done("no-room", from);
  }

  // 6. The difference, then the number. Undone key by key if a write fails.
  const touched = [];
  try {
    for (const k of Object.keys(original)) {
      if (!(k in next)) {
        touched.push(k);
        storage.removeItem(k);
      }
    }
    for (const [k, v] of Object.entries(next)) {
      if (original[k] !== v) {
        touched.push(k);
        storage.setItem(k, v);
      }
    }
    storage.setItem(SCHEMA_KEY, String(target));
  } catch {
    for (const k of touched) {
      try {
        if (k in original) storage.setItem(k, original[k]);
        else storage.removeItem(k);
      } catch {
        /* best effort: the snapshot still holds every original value */
      }
    }
    try {
      if (current === null) storage.removeItem(SCHEMA_KEY);
      else storage.setItem(SCHEMA_KEY, String(current));
    } catch {
      /* as above */
    }
    return done("failed", from);
  }
  return done("upgraded", from);
}

/** A step's storage result must still be a map of `faves.` keys to strings. */
function validKeyMap(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return false;
  return Object.entries(m).every(([k, v]) => k.startsWith("faves.") && isChainKey(k) && typeof v === "string");
}

/**
 * The upgraded version has run successfully: the page's entry module was
 * evaluated — so every store it imports read the upgraded data without
 * throwing — and its first render finished (app.js, menu.js, recipe.js call
 * this at the end of that render). Marks a held snapshot as done; the NEXT
 * page load's `upgradeStorage` deletes it. So the snapshot outlives the first
 * successful page by one load, and a page whose render throws never marks it.
 * Never throws.
 */
export function upgradeRan(storage, { target = USER_SCHEMA } = {}) {
  try {
    const held = readSnapshot(storage);
    if (!held || held.ok === true || held.to !== target || readSchema(storage) !== target) return false;
    storage.setItem(UPGRADE_SNAPSHOT_KEY, JSON.stringify({ ...held, ok: true }));
    return true;
  } catch {
    return false;
  }
}

/**
 * How much of local storage Faves' own keys hold, in UTF-16 code units (what
 * `key.length + value.length` counts). The unit browsers' local-storage quota
 * is closest to; roadmap 510/080 is triggered when this passes
 * `STORAGE_THRESHOLD`.
 */
export function userStorageSize(storage) {
  let n = 0;
  for (const k of listStoredKeys(storage)) {
    const v = storage.getItem(k);
    n += k.length + (typeof v === "string" ? v.length : 0);
  }
  return n;
}

/**
 * When the move to IndexedDB (roadmap 510/080) is due, in the units of
 * `userStorageSize`. Set by 510/040 on 2026-09-30; the reasoning and the
 * measurements behind it are in that item's file. In short: an upgrade briefly
 * holds two copies of everything (the snapshot above), browsers allow about
 * 5 MB per site and the strictest count that in UTF-16 bytes (2.5 million code
 * units), so the data must stay under half of that with room to spare.
 */
export const STORAGE_THRESHOLD = 1_000_000;
