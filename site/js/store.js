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
