// Device-local profiles — several people share one phone and each wants their
// own hearts. A profile is just a *name + an id*; its data lives in
// per-profile-namespaced localStorage keys. NO accounts, NO backend, NO
// cross-device sync — that would break the no-accounts / no-backend non-goals
// and belongs to a separate signed-in app (ROADMAP Theme 5/6). This is the
// constraint-free half: a "who's this?" name picker over the existing personal
// layer.
//
// WHAT IS PER-PROFILE vs SHARED (recorded in ADR 0012):
//   • Per-profile — favourites (`faves.favourites.v1`), personal ratings
//     (`faves.ratings.v1`: the viewer's own 1–3 marks) and *all* of settings
//     (`faves.settings.v1`: dietary/allergen prefs [safety-critical — allergies
//     differ per person], plus the ranking dials and the reo language). We
//     scope by whole store, not by field: shattering one store's fields across
//     two scopes is where migration/namespacing bugs breed, and this is safety
//     code. A consequence is the language toggle is per-profile — defensible
//     (each person reads their own tongue) and flagged for the owner to revisit.
//   • Shared (device-level, NOT namespaced) — the order tally
//     (`faves.order.v1`: one order for the table) and the ephemeral Near-me
//     origin (`faves.origin.v1`, sessionStorage). Theme follows the OS and is
//     never stored.
//
// STORAGE SHAPE. The registry lives at `faves.profiles.v1` (device-level):
//   { v: 1, activeId, profiles: [{ id, name }] }
// Per-profile keys are the base key namespaced by the active id via
// `scopeKey` → `faves.p.<id>.<base-without-faves-prefix>`. Consumers keep their
// existing KEY constant and read through `profileScopedStorage()`, which
// rewrites the key for whoever is active — so switching a profile + reload() is
// all it takes to re-point every per-profile store. Pure/DOM-free and
// unit-tested; the UI (settings-ui.js) owns the switcher and window wiring.

import { safeStorage } from "./store.js";

export const PROFILES_KEY = "faves.profiles.v1";

// The base keys that are per-profile. Add one here when a new per-profile store
// lands — this is the single list `migrate` copies forward and `remove` purges.
export const SCOPED_BASE_KEYS = ["faves.favourites.v1", "faves.settings.v1", "faves.ratings.v1"];

// The first profile's id is deterministic ("default") so two tabs migrating at
// once converge on the same key instead of minting two rival profiles.
const DEFAULT_ID = "default";
const DEFAULT_NAME = "Me";
const MAX_NAME = 24;

/** Namespaced storage key for `baseKey` under profile `id`. The `faves.`
 *  prefix is stripped so the result reads `faves.p.<id>.favourites.v1`, not a
 *  doubled `faves.p.<id>.faves.favourites.v1`. */
export function scopeKey(id, baseKey) {
  const base = baseKey.startsWith("faves.") ? baseKey.slice("faves.".length) : baseKey;
  return `faves.p.${id}.${base}`;
}

/** First name → trimmed, whitespace-collapsed, length-capped. Empty ⇒ "" (the
 *  caller rejects it). Never anything but a display name — no personal data. */
export function sanitiseName(raw) {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

function defaultRegistry() {
  return { v: 1, activeId: DEFAULT_ID, profiles: [{ id: DEFAULT_ID, name: DEFAULT_NAME }] };
}

/** Coerce any stored/incoming blob into a valid registry: ≥1 well-formed
 *  profile, unique ids, and an activeId that actually points at one. A
 *  hand-edited or corrupt value can never leave the app profile-less. */
export function sanitiseRegistry(obj) {
  const profiles = [];
  const seen = new Set();
  if (obj && Array.isArray(obj.profiles)) {
    for (const p of obj.profiles) {
      const id = typeof p?.id === "string" ? p.id : "";
      const name = sanitiseName(p?.name);
      if (id && name && !seen.has(id)) {
        seen.add(id);
        profiles.push({ id, name });
      }
    }
  }
  if (!profiles.length) return defaultRegistry();
  const activeId = profiles.some((p) => p.id === obj?.activeId) ? obj.activeId : profiles[0].id;
  return { v: 1, activeId, profiles };
}

function newId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Idempotently ensure a registry exists, folding any pre-profiles data into the
 * default profile. Safe under a mixed old/new asset window served by the SW:
 *   • If a registry already exists we return it untouched — never resurrect old
 *     data or reset an active choice.
 *   • We COPY the old un-namespaced keys forward, we don't move them: a briefly
 *     cached OLD asset still reads `faves.favourites.v1`, so leaving it keeps
 *     that stale tab working until it refreshes.
 *   • We copy only when the scoped target is empty, so a partial earlier run (or
 *     a concurrent tab) can't clobber newer data.
 * Returns the (sanitised) registry.
 */
export function migrate(storage) {
  let existing = null;
  try {
    existing = JSON.parse(storage.getItem(PROFILES_KEY) || "null");
  } catch {
    /* corrupt registry — fall through and rewrite a clean default */
  }
  if (existing) return sanitiseRegistry(existing);

  const reg = defaultRegistry();
  for (const base of SCOPED_BASE_KEYS) {
    try {
      const old = storage.getItem(base);
      const target = scopeKey(DEFAULT_ID, base);
      if (old != null && storage.getItem(target) == null) storage.setItem(target, old);
    } catch {
      /* blocked/over quota — the store falls back to session-only anyway */
    }
  }
  try {
    storage.setItem(PROFILES_KEY, JSON.stringify(reg));
  } catch {
    /* blocked — an in-memory default still drives this session */
  }
  return reg;
}

/**
 * Create a profile registry store over a storage backend (injectable for
 * tests). Runs migration on construction, then holds the registry in memory and
 * notifies subscribers on every change (and on a cross-tab `reload`).
 */
export function createProfiles(storage) {
  const subs = new Set();

  function readReg() {
    try {
      return sanitiseRegistry(JSON.parse(storage.getItem(PROFILES_KEY) || "null"));
    } catch {
      return defaultRegistry();
    }
  }

  migrate(storage); // ensure a registry + fold any pre-profiles data forward
  let reg = readReg();

  function commit() {
    try {
      storage.setItem(PROFILES_KEY, JSON.stringify(reg));
    } catch {
      /* blocked — in-memory registry still drives the UI this session */
    }
    for (const fn of subs) fn(reg);
  }

  const has = (id) => reg.profiles.some((p) => p.id === id);

  return {
    list: () => reg.profiles.map((p) => ({ ...p })),
    activeId: () => reg.activeId,
    active: () => {
      const a = reg.profiles.find((p) => p.id === reg.activeId) || reg.profiles[0];
      return { ...a };
    },

    /** Add a profile (first name) and switch to it. Returns its id, or null if
     *  the name was empty after sanitising. */
    create(name) {
      const nm = sanitiseName(name);
      if (!nm) return null;
      const id = newId();
      reg = { ...reg, profiles: [...reg.profiles, { id, name: nm }], activeId: id };
      commit();
      return id;
    },

    rename(id, name) {
      const nm = sanitiseName(name);
      if (!nm || !has(id)) return false;
      reg = { ...reg, profiles: reg.profiles.map((p) => (p.id === id ? { ...p, name: nm } : p)) };
      commit();
      return true;
    },

    /** Delete a profile and purge its per-profile data. Never deletes the last
     *  one (there must always be someone active). If the active profile is
     *  removed, the first remaining becomes active. Returns whether it removed. */
    remove(id) {
      if (reg.profiles.length <= 1 || !has(id)) return false;
      const profiles = reg.profiles.filter((p) => p.id !== id);
      const activeId = reg.activeId === id ? profiles[0].id : reg.activeId;
      reg = { ...reg, profiles, activeId };
      for (const base of SCOPED_BASE_KEYS) {
        try {
          storage.removeItem(scopeKey(id, base));
        } catch {
          /* blocked — nothing persisted for this profile to purge */
        }
      }
      commit();
      return true;
    },

    setActive(id) {
      if (!has(id)) return false;
      if (reg.activeId === id) return true;
      reg = { ...reg, activeId: id };
      commit();
      return true;
    },

    /** The active profile's namespaced key for `baseKey` — used by storage-event
     *  listeners to recognise a write to the current profile's data. */
    scopedKey: (baseKey) => scopeKey(reg.activeId, baseKey),

    /** Re-read the registry (e.g. after a cross-tab `storage` event). */
    reload() {
      reg = readReg();
      for (const fn of subs) fn(reg);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// One device-level storage instance backs both the registry and the scoped
// wrappers (a single private-mode probe, one in-memory shim if blocked).
// Exported because data export (personal-data.js) has to read EVERY profile's
// keys, not just the active one's — `profileScopedStorage()` would hide the
// rest. Reach for the scoped wrapper for anything per-profile; this is the
// deliberate exception, not the default.
export const deviceStorage = safeStorage();

// The shared singleton. Constructing it runs migration once at module load,
// before favourites.js / settings.js build their stores over the scoped wrapper.
export const profiles = createProfiles(deviceStorage);

/**
 * Reload every per-profile store after a profile switch. ORDER IS LOAD-BEARING:
 * the "silent" stores (favourites, ratings) reload FIRST; `settings` reloads
 * LAST, because on the menu/recipe screens it's `settings.reload()`'s
 * subscription that drives the safety re-render — and that re-render must read
 * favourites and ratings already re-pointed at the new profile, or it would
 * rebuild hearts/marks from the previous person's data. Pure + injectable: the
 * screens pass the real singletons, tests pass fakes, so it carries no import
 * cycle. `ratings` is optional (the recipe screen has no rating control).
 */
export function reloadProfileStores({ favourites, ratings, settings }) {
  favourites?.reload();
  ratings?.reload();
  settings.reload(); // MUST be last — its subscribers repaint the menu
}

/**
 * A storage view that namespaces keys for whoever is *currently* active — so a
 * per-profile store (favourites, settings) keeps its own KEY constant and
 * simply reloads to follow a profile switch. Backed by the shared device
 * storage unless another backend is injected (tests inject their own).
 */
export function profileScopedStorage(base = deviceStorage) {
  return {
    getItem: (k) => base.getItem(profiles.scopedKey(k)),
    setItem: (k, v) => base.setItem(profiles.scopedKey(k), v),
    removeItem: (k) => base.removeItem(profiles.scopedKey(k)),
  };
}
