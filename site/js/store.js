// Shared storage primitive for the device-local personal layer (the order
// tally, favourites, and whatever local-only feature comes next). Keeps the
// "never throws" guarantee in one place: a locked-down browser (Safari
// private mode, storage disabled) transparently gets an in-memory shim, so
// the feature degrades to session-only rather than crashing.
export function safeStorage() {
  try {
    const probe = "__faves_probe__";
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
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
