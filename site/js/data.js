// Data loading. One source of truth: data/index.json (order) + one file
// per restaurant. Small enough (~50 KB total) to load all on the home
// screen; the service worker precaches it for offline (Phase 5).

import { resolveRecord, todayIn } from "./temporal.js";
import { venueHemisphere, venueTimezone } from "./place.js";
import { canonicalVenueId } from "./renames.js";
import { loadFx } from "./fx.js";
import { findDish, dishId } from "./dish-id.js";

const INDEX_URL = "data/index.json";
const restaurantUrl = (id) => `data/restaurants/${id}.json`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

// A multi-location venue (locations.js, ADR 0011) carries its address, coords,
// phone and hours per branch, not at the top level. Project the FIRST (primary)
// branch up to the top level so every consumer that reads r.address/r.hours/etc.
// keeps working unchanged — the branch-aware bits (nearest-branch distance,
// per-branch status, all-branches contact block) layer on top via locations.js.
// Single-location records pass through untouched. This is the one normalisation
// seam; both loaders run through it.
//
// It now runs on the *time-resolved* record (temporal.js): dated fields have
// already collapsed to the value in force today and out-of-season dishes have
// dropped out, so this — and every consumer downstream — reads the same plain
// shape it always did. Time is a property of the data and of temporal.js, not
// something the rest of the app has to know about.
function normaliseVenue(r) {
  if (!Array.isArray(r.locations) || !r.locations.length) return r;
  const primary = r.locations[0];
  return {
    ...r,
    address: r.address ?? primary.address ?? null,
    lat: typeof r.lat === "number" ? r.lat : primary.lat ?? null,
    lng: typeof r.lng === "number" ? r.lng : primary.lng ?? null,
    phone: r.phone ?? primary.phone ?? null,
    hours: r.hours ?? primary.hours ?? null,
  };
}

// Resolve time, THEN project branches. Order matters: a branch's address may
// itself be a dated series, so it has to collapse to today's value before
// normaliseVenue lifts it to the top level. This pair is the only place the
// app crosses from "the record, with all its history" to "the record, today".
// Each record is resolved on ITS OWN clock and in ITS OWN hemisphere (ADR
// 0043): "what is on the menu today" is a question about the venue's today, and
// a "summer menu" runs Dec–Feb or Jun–Aug depending on which side of the
// equator the venue sits. Hemisphere comes off the venue's latitude; with no
// coordinate we keep the collection's own (south) rather than guess.
const load = (raw) =>
  normaliseVenue(
    resolveRecord(raw, todayIn(venueTimezone(raw)), venueHemisphere(raw) ?? "south")
  );

/** Load every restaurant, in display order. Throws if the index fails. */
export async function loadRestaurants() {
  // Rates ride along with the index, not after it: a price rendered before the
  // table lands would show in the shop's currency and then silently change
  // under the reader when it arrived. Failure is fine and quiet — fx.js falls
  // back to no conversion, which is always a correct answer.
  const [ids] = await Promise.all([fetchJson(INDEX_URL), loadFx(fetchJson)]);
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return load(await fetchJson(restaurantUrl(id)));
      } catch (err) {
        console.error(`Skipping ${id}:`, err);
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

/**
 * Look up one restaurant by id (used by the menu screen).
 *
 * The id is canonicalised FIRST, before any fetch: a link shared before a venue
 * was renamed names a file that no longer exists, and a 404 here is a dead link
 * in somebody's messages, not a missing feature (renames.js).
 */
export async function loadRestaurant(id) {
  const [raw] = await Promise.all([
    fetchJson(restaurantUrl(canonicalVenueId(id))),
    loadFx(fetchJson),
  ]);
  return load(raw);
}

// ---------------------------------------------------------------------------
// Reference integrity (ADR 0020) — the only truthful way to say "removed".
// ---------------------------------------------------------------------------
//
// A stored heart or rating names a venue and a dish that the data on this
// device may not contain. A client CANNOT tell "the shop removed it" from "my
// copy is stale" — both are just "id not in my data" — so the honesty floor
// forbids saying "removed" from local knowledge. The only truthful resolution
// is a fetch that PROVABLY reached the network.
//
// WHY THIS NEEDS NO NEW SERVICE-WORKER MESSAGE. ADR 0020 listed a "forced
// refresh / cache-bust data path (service-worker cooperation)" as a
// consequence still to be built. It is already here, in two halves that landed
// for other reasons:
//
//   • sw.js serves everything under `/data/` NETWORK-FIRST, and with
//     `cache: "no-cache"`, so while online a plain fetch is already the live
//     file rather than the worker's copy or the browser's four-hour one.
//   • The gap that leaves is invisibility, not staleness: the worker's OFFLINE
//     fallback (`cache.match(req)`) is indistinguishable from a network hit up
//     here, and reading "absent" out of a cached answer is precisely the lie.
//
// A unique query per check closes that gap, because `cache.match` honours the
// query string (only the shell route passes `ignoreSearch`). The busted URL is
// in no cache, so the worker's fallback MISSES and the fetch rejects. Hence:
// a resolved response PROVES the network answered, which is the whole thing
// the ADR wanted the worker's cooperation for.
//
// The cost, stated rather than hidden: the worker caches each 200 it sees, so
// a recheck leaves one entry per URL in the data cache that will never be
// served again (cleared on the next DATA_VERSION bump). Skipping `cache.put`
// for a URL carrying `_fresh` is a one-line sw.js change and the permanent fix.
//
// Deliberately NOT `forceRefresh()` (cache-refresh.js). That clears the shell
// and data caches, unregisters the worker and reloads the page: it re-downloads
// the entire site to answer "is one dish still there?", it destroys the open
// Favourites panel on the way, and — the disqualifying part — a page reload
// cannot RETURN an answer to the code that asked. The two live side by side:
// nuclear reset in Settings, targeted question here.

const FRESH_PARAM = "_fresh";

const bust = (url, token) =>
  `${url}${url.includes("?") ? "&" : "?"}${FRESH_PARAM}=${encodeURIComponent(token)}`;

const freshToken = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Every sentence the app is allowed to say about a stored reference, kept in
 * one place next to the check that earns each one — so the wording and the
 * evidence behind it cannot drift apart.
 *
 * The rule the strings encode: until a live fetch has answered, BOTH
 * possibilities stay open. `removedVenue`/`removedDish` are the only ones that
 * name a deletion, and nothing may show them without a `"absent"` result.
 */
export const REFERENCE_COPY = {
  // Local knowledge only. Never picks one of the two possibilities.
  unresolvedLabel: "Not on your current list",
  unresolvedWhy: "This may have been removed, or your list may be out of date.",
  checking: "Checking…",
  // We asked and could not get an answer. Say only that, and say it is unknown.
  offline: "Can’t check while you’re offline — this may still be there.",
  unreachable: "Couldn’t reach the site just now, so this is still unchecked.",
  // A live fetch came back WITH it: it was staleness all along.
  restored: "Still there — your list was just out of date.",
  // A live fetch came back WITHOUT it. Only now may the word be used.
  removedVenue: "No longer listed",
  removedDish: "No longer on the menu",
  removedWhy: "Checked just now: this is no longer in the menu data.",
  // The menu screen's honest not-found screen (invariant 4).
  notFoundTitle: "We couldn’t open this menu",
};

/** The state word for a reference, given what a recheck returned. */
export const referenceCopyFor = (entry, state) => {
  if (state === "absent")
    return entry?.type === "venue" ? REFERENCE_COPY.removedVenue : REFERENCE_COPY.removedDish;
  if (state === "checking") return REFERENCE_COPY.checking;
  return REFERENCE_COPY.unresolvedLabel;
};

/** The explaining sentence beneath it. */
export const referenceWhyFor = (state) =>
  state === "absent"
    ? REFERENCE_COPY.removedWhy
    : state === "offline"
      ? REFERENCE_COPY.offline
      : state === "unreachable"
        ? REFERENCE_COPY.unreachable
        : REFERENCE_COPY.unresolvedWhy;

/**
 * Ask the NETWORK whether the things these stored entries name are still
 * published. One index fetch plus one fetch per distinct venue, however many
 * entries point at it.
 *
 * @param {Array<{type: string, venueId: string, name?: string, dishId?: string}>} entries
 * @returns {Promise<Array<{entry: object, state: "present"|"absent"|"offline"|"unreachable"}>>}
 *   in the order given. Only `"absent"` licenses the word "removed"; the other
 *   three all mean "still unknown", and the UI must say so.
 */
export async function recheckReferences(entries, opts = {}) {
  const {
    fetchImpl = (...args) => globalThis.fetch(...args),
    // `navigator.onLine` is trustworthy only in the negative — the same reading
    // cache-refresh.js takes, and the reason a browser that doesn't report it
    // is treated as online rather than blocked.
    isOnline = () => globalThis.navigator?.onLine !== false,
    token = freshToken(),
  } = opts;

  const list = [...(entries || [])];
  if (!list.length) return [];
  if (!isOnline()) return list.map((entry) => ({ entry, state: "offline" }));

  // `{ok:false}` is "we did not get an answer", which is never evidence of
  // absence — a 5xx, a dropped connection and the service worker's cache
  // MISSING our busted URL all land here, and all three mean "still unknown".
  const getFresh = async (url) => {
    let res;
    try {
      res = await fetchImpl(bust(url, token), { cache: "reload" });
    } catch {
      return { ok: false };
    }
    if (res.status === 404) return { ok: true, missing: true };
    if (!res.ok) return { ok: false };
    try {
      return { ok: true, body: await res.json() };
    } catch {
      return { ok: false };
    }
  };

  const index = await getFresh(INDEX_URL);
  if (!index.ok || index.missing || !Array.isArray(index.body)) {
    return list.map((entry) => ({ entry, state: "unreachable" }));
  }
  const published = new Set(index.body);

  const wanted = new Set();
  for (const e of list) {
    const id = canonicalVenueId(e.venueId);
    if (e.type !== "venue" && published.has(id)) wanted.add(id);
  }
  const records = new Map();
  await Promise.all(
    [...wanted].map(async (id) => records.set(id, await getFresh(restaurantUrl(id))))
  );

  return list.map((entry) => {
    const id = canonicalVenueId(entry.venueId);
    if (!published.has(id)) return { entry, state: "absent" };
    if (entry.type === "venue") return { entry, state: "present" };
    const rec = records.get(id);
    if (!rec) return { entry, state: "unreachable" };
    if (rec.missing) return { entry, state: "absent" };
    if (!rec.ok) return { entry, state: "unreachable" };
    // The RAW record, deliberately — NOT `load()`. Time resolution drops a dish
    // that is out of season today, and telling someone their winter special was
    // removed because it is January would be the same lie in a smaller costume.
    return { entry, state: findDish(rec.body, dishId(entry)) ? "present" : "absent" };
  });
}
