// Data loading. Three files, each read by a different screen (roadmap
// 510/020): data/index.json (order — still needed by recheckReferences below
// and by the no-JS fallback list, ADR 0146) + data/summary.json (the home
// card fields for every venue, thinned menus) + data/search-index.json (the
// precomputed dish/place search index). Full venue files under
// data/restaurants/ are fetched one at a time, only when that venue's own
// page opens (loadRestaurant). The service worker precaches all of it for
// offline (Phase 5) — every menu still works in flight mode after one visit.

import { resolveRecord, todayIn } from "./temporal.js";
import { venueHemisphere, venueTimezone } from "./place.js";
import { canonicalVenueId } from "./renames.js";
import { loadFx } from "./fx.js";
import { findDish, dishId } from "./dish-id.js";
import { composeRecipe } from "./ingredients.js";
import { normaliseBranch } from "./locations.js";

const INDEX_URL = "data/index.json";
const SUMMARY_URL = "data/summary.json";
const SEARCH_INDEX_URL = "data/search-index.json";
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
//
// The "anywhere" branch (ADR 0155) is normalised HERE, before the projection:
// its declared `{ anywhere: true }` address becomes `address: null` plus
// `anywhere: true` (locations.normaliseBranch), so the top level never inherits
// an object where every reader expects a street — search would index it, a
// maps link would search for it. A record with no wildcard keeps its own
// branch objects untouched.
function normaliseVenue(r) {
  if (!Array.isArray(r.locations) || !r.locations.length) return r;
  const locations = r.locations.map(normaliseBranch);
  const changed = locations.some((b, i) => b !== r.locations[i]);
  if (changed) r = { ...r, locations };
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
//
// Exported (roadmap 510/020, ADR 0146) so `tools/gen_summaries.mjs` resolves
// dated fields through this SAME path when it builds the summary and search
// index files, rather than growing a second, offline copy of temporal
// resolution that could silently drift from this one. The cost stated rather
// than hidden: a summary is only as fresh as the last time the generator ran,
// so a dated field that flips on the calendar with no accompanying data edit
// (a seasonal item's `until` date, say) will not visibly change on the home
// card until the next regeneration — the individual venue page, loaded through
// `loadRestaurant` below, always resolves against the reader's actual today.
export const load = (raw) =>
  composeParts(
    normaliseVenue(
      resolveRecord(raw, todayIn(venueTimezone(raw)), venueHemisphere(raw) ?? "south")
    )
  );

// A recipe whose ingredients state their own tags (a PART — ingredients.js,
// roadmap 350/020 step 4) is read everywhere as its COMPOSED tags: the dish's
// own plus its parts', by the same composeTags an add-on uses. Done here, at
// the one seam every screen loads through, so the chips, the row accent, the
// diet filter, search and the dish report all see the soy the chocolate brings
// — a part's allergen that only the recipe page knew about would be a warning
// the menu row, the home search and the flagged treatment silently lacked.
// A record with no parts passes through as the same object.
function composeParts(r) {
  if (!Array.isArray(r?.menu)) return r;
  let changed = false;
  const menu = r.menu.map((section) => {
    if (!Array.isArray(section?.items)) return section;
    let touched = false;
    const items = section.items.map((item) => {
      const next = composeRecipe(item);
      if (next !== item) touched = true;
      return next;
    });
    if (!touched) return section;
    changed = true;
    return { ...section, items };
  });
  return changed ? { ...r, menu } : r;
}

/**
 * Load every venue's CARD SUMMARY, in display order — not the full menu
 * (roadmap 510/020). `data/summary.json` is generated by
 * `tools/gen_summaries.mjs` from the same `load()` pipeline above, so a
 * summary's venue-level fields (hours, area, cuisine, vibe, closure…) are
 * already resolved exactly as a full record's would be; only each dish is
 * thinned to `{ dishId, name, formerIds? }` — enough for the card's dish
 * count and for a stored heart to resolve (dish-id.js's `findDish`), not
 * enough to render a menu. The home screen and search never fetch a file
 * under `data/restaurants/`; a venue's own page fetches that when it opens
 * (`loadRestaurant` below).
 */
export async function loadRestaurants() {
  // Rates ride along, not after: a price rendered before the table lands would
  // show in the shop's currency and then silently change under the reader when
  // it arrived. Failure is fine and quiet — fx.js falls back to no conversion,
  // which is always a correct answer.
  const [summaries] = await Promise.all([fetchJson(SUMMARY_URL), loadFx(fetchJson)]);
  return summaries;
}

/**
 * The COMPACT search index file — `{ venues: [{ id, sections: [{ section,
 * items: [{ dishId, name, formerIds?, hay }] }] }] }` — built once by
 * `tools/gen_summaries.mjs` against every venue's FULL menu, so `hay` keeps
 * ingredients, attribution and order numbers (ADR 0146). Dish identity ships
 * exactly once, grouped by venue then section: nothing about a dish that is
 * cheaply rebuilt from its venue's own summary record (`href`, `venueName`,
 * `isRecipe`) is shipped again per dish (roadmap 510/020's revision after its
 * coordinator review — the first cut shipped `buildIndex()`'s full runtime
 * shape and was BIGGER than fetching every menu, not smaller).
 *
 * This is NOT search.js's runtime `{ places, dishes }` shape — the caller
 * turns it into that with `rebuildIndex(compact, restaurants)` once both this
 * and `loadRestaurants()` have resolved, because rebuilding needs the loaded
 * summaries (for a dish's venue name/kind) and there is no reason to fetch
 * them twice.
 */
export async function loadSearchIndex() {
  return fetchJson(SEARCH_INDEX_URL);
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
// consequence still to be built. The cooperation is one rule in sw.js: a data
// request carrying `_fresh` goes STRAIGHT to the network — never answered
// from the worker's data store, never written to it (roadmap 510/030, ADR
// 0146's "cache-busted rechecks are excluded"). Every other data read is
// answered from the store, which is exactly why this needs the bust: an
// answer from the store is indistinguishable from a network hit up here, and
// reading "absent" out of a held copy is precisely the lie.
//
// Offline, the straight-through fetch rejects. Hence: a resolved response
// PROVES the network answered, which is the whole thing the ADR wanted the
// worker's cooperation for. (Until 510/030 the worker stored each busted 200
// it saw — one dead entry per recheck until the next DATA_VERSION bump. It no
// longer stores them, so that cost is gone.)
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
 * @returns {Promise<Array<{entry: object, state: "present"|"absent"|"offline"|"unreachable"|"local"}>>}
 *   in the order given. Only `"absent"` licenses the word "removed"; the other
 *   four all mean "still unknown", and the UI must say so. `"local"` is a
 *   personal recipe, which no fetch can speak for (roadmap 510/050).
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

  // A personal recipe (`u:mine`, recipes.js) was never published, so the
  // network can say nothing about it — asking would answer "absent" and print
  // "No longer listed" about a recipe that is simply not synced here yet, or
  // was deleted on another device. It stays "local": unresolved, never
  // "removed". Matched on the prefix rather than imported, because this module
  // is also loaded by a Node tool (gen_summaries.mjs) and recipes.js builds a
  // store at load.
  const isPersonal = (e) => String(e?.venueId ?? "").startsWith("u:");
  const all = [...(entries || [])];
  if (!all.length) return [];
  if (all.some(isPersonal)) {
    const published = await recheckReferences(all.filter((e) => !isPersonal(e)), opts);
    const byEntry = new Map(published.map((r) => [r.entry, r]));
    return all.map((entry) => (isPersonal(entry) ? { entry, state: "local" } : byEntry.get(entry)));
  }
  const list = all;
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
