// Shared storage primitive for the device-local personal layer (the order
// tally, favourites, and whatever local-only feature comes next). Keeps the
// "never throws" guarantee in one place: a locked-down browser (Safari
// private mode, storage disabled) transparently gets an in-memory shim, so
// the feature degrades to session-only rather than crashing.
//
// AND THE ONE PLACE A WRITE CAN BE REFUSED (roadmap 510/110, owner-ruled "Old
// tab stops writing"). A tab still running an older build can be open while a
// newer one upgrades storage (user-schema.js). If the old tab kept saving, it
// would write old-shape data into storage stamped as new — and the new build
// would read it as new. So every write through `safeStorage()` first reads the
// stored schema number, and refuses when it is ahead of this build's: it throws
// `StaleTabError`, which every store already treats like a full or blocked
// storage (its in-memory copy drives the rest of the session), and the tab is
// marked stale so the page can ask for a reload (stale-tab-ui.js). The owner
// rejected the old tab reloading itself, which could happen mid-note.
//
// Nothing else in site/js may reach `localStorage` directly — that would be a
// write this refusal cannot see. tests/storage-writers.test.js holds that line.
//
// Imports only schema-stamp.js, which imports nothing: the startup upgrade
// chain imports this module, and nothing it imports may read a store when it
// loads (user-schema.js).

import { USER_SCHEMA, SCHEMA_KEY, stampAhead } from "./schema-stamp.js";

/** Thrown by a guarded storage's `setItem`/`removeItem` in a tab whose build
 *  is behind the stored schema. Callers catch it with everything else a write
 *  can throw; the page learns of it through `onTabStale`. */
export class StaleTabError extends Error {
  constructor() {
    super("Faves was updated in another tab; changes here are not saved until this tab reloads.");
    this.name = "StaleTabError";
  }
}

// Page-wide, like the modules themselves: one tab is stale or it is not.
let stale = false;
const staleListeners = new Set();

function markStale() {
  if (stale) return;
  stale = true;
  for (const fn of staleListeners) {
    try {
      fn();
    } catch {
      /* a listener that fails must not stop the others hearing */
    }
  }
}

/** Has this tab learned that storage is in a newer schema than its build? */
export const isTabStale = () => stale;

/** Call `fn` once this tab is known to be stale — at once if it already is.
 *  Returns an unsubscribe. */
export function onTabStale(fn) {
  staleListeners.add(fn);
  if (stale) fn();
  return () => staleListeners.delete(fn);
}

/** Is this storage stamped with a newer user schema than `build`? Never throws. */
export function storageAhead(storage, build = USER_SCHEMA) {
  try {
    return stampAhead(storage?.getItem?.(SCHEMA_KEY), build);
  } catch {
    return false;
  }
}

/**
 * Wrap a storage backend so that no write lands once storage is ahead of this
 * build. Reads pass straight through. One extra `getItem` per write — the
 * check has to be at write time, because the tab that upgrades may be opened
 * at any moment after this one loaded.
 */
export function guardStorage(raw, { build = USER_SCHEMA } = {}) {
  const check = () => {
    if (storageAhead(raw, build)) {
      markStale();
      throw new StaleTabError();
    }
  };
  return {
    getItem: (k) => raw.getItem(k),
    setItem(k, v) {
      check();
      raw.setItem(k, v);
    },
    removeItem(k) {
      check();
      raw.removeItem(k);
    },
    key: (i) => raw.key(i),
    get length() {
      return raw.length;
    },
  };
}

/**
 * Notice the moment another tab moves storage to a newer schema — the
 * `storage` event, which fires in every OTHER tab of this origin — and check
 * once now, for a tab that loaded after the upgrade (an old build still served
 * from cache). The write-time check in `guardStorage` is the one that cannot
 * be missed; this one makes the page say so before anyone taps anything.
 * Called once per page by upgrade-start.js.
 */
export function watchStaleTab({ storage, win = globalThis.window, build = USER_SCHEMA } = {}) {
  if (storage && storageAhead(storage, build)) markStale();
  if (!win?.addEventListener) return () => {};
  const on = (e) => {
    if (e?.key === SCHEMA_KEY && stampAhead(e.newValue, build)) markStale();
  };
  win.addEventListener("storage", on);
  return () => win.removeEventListener("storage", on);
}

export function safeStorage() {
  let ls;
  try {
    ls = globalThis.localStorage;
    const probe = "__faves_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
  } catch {
    const mem = new Map();
    // No guard: an in-memory shim is this tab's alone, so no other tab can
    // upgrade it under this one.
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
  return guardStorage(ls);
}

/**
 * Every `faves.`-prefixed key a storage backend can enumerate. Returns [] when
 * the backend can't enumerate (the in-memory shim `safeStorage()` falls back to
 * in a locked-down browser) — callers must treat it as best-effort, not proof.
 *
 * Lives here, not in personal-data.js, because the startup upgrade chain
 * (user-schema.js) needs it and must import nothing that reads a store when it
 * loads: personal-data.js imports every store module, and each of those reads
 * storage the moment it is evaluated (roadmap 510/040).
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
