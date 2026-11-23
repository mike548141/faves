// What the app did to itself, for the activity log (Theme 32c; ADR 0164 item 7).
//
//   app.updated      the shell this device runs moved      from/to: SHELL_VERSION
//   data.updated     the menus this device holds moved     from/to: data generation
//   cache.refreshed  the person took "Refresh menus and app" (cache-refresh.js)
//
// Nothing here DETECTS anything new. versions.js already asks the controlling
// worker for the two stamps it is actually running (askController); the only
// thing missing was a memory of the stamps the LAST page saw, because an event
// is a transition and a page load is not one. That memory is
// `faves.seen-versions.v1`: `{ shell, data }`, device-level (a fact about this
// browser's worker, not about a person) and listed in personal-data.js EXCLUDED
// so it is in neither the backup nor sync — restoring another device's stamps
// would invent updates that never happened here.
//
// WHAT COUNTS AS A TRANSITION. Only a change between two stamps the worker
// itself answered:
//   • no stored baseline ⇒ seed it, say nothing (a first run is not an update,
//     and a wiped device must not announce the version it is already on);
//   • a stamp the worker could not give (no controller, no reply, no data
//     stored yet) ⇒ keep the old one, say nothing. Falling back to cache NAMES
//     here would be wrong: under a waiting worker the newest cache is the update
//     that has not taken over (ADR 0032), so the log would announce it twice;
//   • a stamp that was empty and now is not (the first menus arriving after the
//     first install) ⇒ seed, say nothing. That is the first data, not a change.
//
// ONCE PER TRANSITION, NOT PER LOAD. The stamp is written after the event, so a
// failed write repeats the attempt rather than losing the event, and the repeat
// (or a second tab racing this one) is turned away by looking at the log's last
// entry of that kind: a transition already logged as from→to is not logged again.
//
// The event is recorded when this page FIRST NOTICED the change, which is the
// first load after the new worker took over (or the menus switched) — not when
// the change was published. And it lands in the ACTIVE person's log, like every
// entry (ADR 0164): another person on a shared phone sees the update in their
// own log only if they were the one using the app when it landed.
//
// Never throws, never goes first: a full storage cannot stop a page loading.

import { activity } from "./activity.js";
import { safeStorage } from "./store.js";
import { askController } from "./versions.js";

/** Device-level, outside the backup, sync and the wipe's keep-list
 *  (personal-data.js EXCLUDED, tests/erase.test.js). */
export const SEEN_VERSIONS_KEY = "faves.seen-versions.v1";

// activity.js clips a version stamp to 40; clipping here too keeps the
// comparison and the entry agreeing about what "the same stamp" means.
const MAX_STAMP = 40;
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const stamp = (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_STAMP) : null);

/** The stamps last seen on this device, or null when none were kept. */
export function readSeen(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(SEEN_VERSIONS_KEY) ?? "null");
    return isObj(raw) ? { shell: stamp(raw.shell), data: stamp(raw.data) } : null;
  } catch {
    return null;
  }
}

/**
 * Pure: the transitions between `seen` (what was stored, or null) and `current`
 * (`{ shell, data }`, as the controlling worker answered), plus the stamps to
 * store next. A stamp `current` lacks is kept from `seen`, never cleared.
 */
export function diffVersions(seen, current) {
  const now = { shell: stamp(current?.shell), data: stamp(current?.data) };
  const next = { shell: now.shell ?? seen?.shell ?? null, data: now.data ?? seen?.data ?? null };
  const events = [];
  if (seen) {
    if (seen.shell && now.shell && seen.shell !== now.shell) {
      events.push({ kind: "app.updated", from: seen.shell, to: now.shell });
    }
    if (seen.data && now.data && seen.data !== now.data) {
      events.push({ kind: "data.updated", from: seen.data, to: now.data });
    }
  }
  return { events, next };
}

// Is this exact transition already the log's newest entry of its kind? A→B,
// B→A, A→B all log (the middle one is newest when the third arrives); only an
// immediate repeat is refused.
function alreadyLogged(log, { kind, from, to }) {
  const entries = log.entries();
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].kind !== kind) continue;
    return entries[i].from === from && entries[i].to === to;
  }
  return false;
}

/**
 * Compare `versions` (`{ shell, data }` from the controlling worker) with the
 * stamps last seen, record each transition, then remember the new stamps.
 * Returns the events it recorded. Never throws.
 */
export function noteVersions(versions, { storage = safeStorage(), log = activity } = {}) {
  const recorded = [];
  try {
    if (!versions) return recorded;
    const seen = readSeen(storage);
    const { events, next } = diffVersions(seen, versions);
    for (const e of events) {
      if (alreadyLogged(log, e)) continue;
      if (log.record(e.kind, {}, e.from, e.to)) recorded.push(e);
    }
    if (!seen || seen.shell !== next.shell || seen.data !== next.data) {
      storage.setItem(SEEN_VERSIONS_KEY, JSON.stringify(next));
    }
  } catch {
    /* a blocked or full storage: the next load tries again */
  }
  return recorded;
}

/**
 * Ask the worker controlling this page what it is running and note it. Called
 * on load and when control changes (sw-register.js). With no controller (a
 * first-ever load) or none that answers, there is nothing true to compare, so
 * nothing is.
 */
export async function observeVersions(container = globalThis.navigator?.serviceWorker, opts = {}) {
  try {
    const controller = container?.controller;
    if (!controller) return [];
    const { ask = askController, ...rest } = opts;
    return noteVersions(await ask(controller), rest);
  } catch {
    return [];
  }
}

/** Record that the person took "Refresh menus and app". No values: the refresh
 *  re-downloads the same published version, it does not move one. */
export function noteRefreshed({ log = activity } = {}) {
  try {
    return log.record("cache.refreshed", {});
  } catch {
    return false;
  }
}
