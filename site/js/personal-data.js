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
// THE APPLY COUNTERPART (Theme 12b, ADR 0030) lives at the bottom of this file:
// `parsePersonalData` → `planImport` → `applyPersonalData`. It is the one seam
// both ways in and out of the personal layer use — a file import and a
// cross-device transfer link (Theme 9 v1) differ only in how the bytes arrive.
// Three rules it exists to hold, all of them recorded in ADR 0030:
//   • merge is the default; replace is destructive and the UI confirms it;
//   • a profile matching an existing one by name alone, OR by id alone, is a
//     QUESTION, never a guess — the plan says "this needs a decision" and
//     refuses to apply without one;
//   • allergen/dietary preferences are safety data: a difference between the
//     file and this device is surfaced and chosen, never silently resolved.
// The plan proposes and the UI asks; nothing in here touches the DOM.
//
// WHAT IS DELIBERATELY NOT COLLECTED. The Near-me origin (`faves.origin.v1`)
// is the user's own location and lives in sessionStorage, so it never appears
// here even by accident. The exported file says so, because a backup that
// silently omitted something would be the dishonest kind of quiet.
//
// Pure and DOM-free (storage is injected), so it unit-tests without a browser.

import { PROFILES_KEY, SCOPED_BASE_KEYS, sanitiseName, sanitiseRegistry, scopeKey } from "./profiles.js";
import { createFavourites, favKey } from "./favourites.js";
import { clampRating } from "./ratings.js";
import { createSettings, sanitiseDiet } from "./settings.js";
import { mergeItems } from "./cart.js";

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

// =========================================================================
// APPLY — reading a personal-layer payload back in (Theme 12b + 9 v1, ADR 0030)
// =========================================================================

/** merge (default) folds the payload into what's here; replace makes this
 *  device look like the payload and destroys everything else under `faves.`. */
export const IMPORT_MODES = ["merge", "replace"];

/** How a diet difference may be resolved. No default: the UI must ask, because
 *  a wrong allergen setting is the one mistake in this app that can hurt. */
export const DIET_CHOICES = ["keep", "incoming", "combine"];

// The payload is attacker-authorable once it can arrive over a link, so every
// list is capped and every string clipped before it can reach storage.
const MAX_ITEMS = 2000;
const MAX_STR = 200;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const clip = (v, n = MAX_STR) => (typeof v === "string" ? v : String(v ?? "")).slice(0, n).trim();
const fail = (error) => ({ ok: false, error });

function sanitiseFavourites(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const e of list) {
    if (!isObj(e)) continue;
    const type = e.type === "venue" || e.type === "dish" ? e.type : null;
    const venueId = clip(e.venueId);
    if (!type || !venueId) continue;
    const entry = { type, venueId, venueName: clip(e.venueName), isRecipe: !!e.isRecipe };
    if (e.sub) entry.sub = clip(e.sub);
    if (type === "dish") {
      entry.name = clip(e.name);
      if (!entry.name) continue;
    }
    const k = favKey(entry);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(entry);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function sanitiseRatings(map) {
  const out = {};
  if (!isObj(map)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(map)) {
    const key = clip(k);
    const score = clampRating(v); // the same gate ratings.js writes through
    if (!key || !score) continue;
    out[key] = score;
    if (++n >= MAX_ITEMS) break;
  }
  return out;
}

function sanitiseOrderLines(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const i of list) {
    if (!isObj(i)) continue;
    const venueId = clip(i.venueId);
    const name = clip(i.name);
    const qty = Math.floor(Number(i.qty));
    if (!venueId || !name || !Number.isFinite(qty) || qty <= 0) continue;
    const price = Number(i.price);
    out.push({
      venueId,
      venueName: clip(i.venueName),
      phone: i.phone ? clip(i.phone, 32) : null,
      name,
      price: Number.isFinite(price) && price >= 0 ? price : null,
      qty: Math.min(qty, 99),
      collected: !!i.collected,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function normaliseProfile(p) {
  if (!isObj(p)) return null;
  const name = sanitiseName(p.name);
  if (!name) return null; // a nameless profile can't be shown, matched or chosen
  return {
    id: typeof p.id === "string" ? p.id.slice(0, 64) : "",
    name,
    active: !!p.active,
    favourites: sanitiseFavourites(p.favourites),
    ratings: sanitiseRatings(p.ratings),
    // Settings stay raw here; settings.js's own sanitiser is the single gate
    // they pass through on the way to storage, and `diet` has to survive
    // untouched until the comparison below can see whether it differs.
    settings: isObj(p.settings) ? p.settings : null,
  };
}

/**
 * Validate + normalise an incoming payload (a JSON string, or an object).
 * Returns `{ ok: true, data }` or `{ ok: false, error }` with a message meant
 * to be shown as-is: "that didn't work" without saying why is the unhelpful
 * kind of quiet. Idempotent, so `applyPersonalData` can re-validate whatever
 * it is handed rather than trusting its caller.
 */
export function parsePersonalData(input) {
  let raw = input;
  if (typeof input === "string") {
    if (!input.trim()) return fail("That file is empty.");
    try {
      raw = JSON.parse(input);
    } catch {
      return fail("That file isn’t valid JSON — pick the .json file Faves downloaded.");
    }
  }
  if (!isObj(raw)) return fail("That doesn’t look like a Faves data file.");
  if (raw.format != null && raw.format !== FORMAT) return fail("That file wasn’t made by Faves.");
  if (typeof raw.v !== "number" || !Number.isFinite(raw.v)) {
    return fail("That doesn’t look like a Faves data file — it carries no format version.");
  }
  if (raw.v > FORMAT_VERSION) {
    return fail(`This file came from a newer version of Faves (format ${raw.v}). Update Faves, then try again.`);
  }
  if (raw.v < FORMAT_VERSION) {
    return fail(`This file uses format ${raw.v}, which this version of Faves can no longer read.`);
  }
  if (!Array.isArray(raw.profiles)) return fail("That file has no people in it.");
  const profiles = raw.profiles.map(normaliseProfile).filter(Boolean);
  if (!profiles.length) return fail("That file has no people in it.");

  const other = {};
  if (isObj(raw.other)) {
    for (const [k, v] of Object.entries(raw.other)) {
      // Never re-import a key this module promises never to export.
      if (!k.startsWith("faves.") || k in EXCLUDED) continue;
      if (typeof v === "string") other[k] = v;
    }
  }
  return {
    ok: true,
    data: {
      format: FORMAT,
      v: FORMAT_VERSION,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : null,
      profiles,
      order: sanitiseOrderLines(raw.order),
      other,
    },
  };
}

/** Wrap one profile's slice of the layer in the same envelope a file carries,
 *  so a transfer link (Theme 9 v1) and an imported file reach `applyPersonalData`
 *  as the same shape. share-codec.js stays free of any personal-layer knowledge. */
export function envelopeFromTransfer({ profile, favourites, ratings, settings } = {}) {
  return {
    format: FORMAT,
    v: FORMAT_VERSION,
    exportedAt: null,
    profiles: [
      {
        id: profile?.id ?? "",
        name: profile?.name ?? "",
        active: true,
        favourites: favourites ?? [],
        ratings: ratings ?? {},
        settings: settings ?? null,
      },
    ],
    order: [],
  };
}

// --- planning ------------------------------------------------------------

const dietKey = (d) => `${[...d.dietary].sort().join(",")}|${[...d.avoid].sort().join(",")}`;
const sameDiet = (a, b) => dietKey(a) === dietKey(b);

function readRegistry(storage) {
  return sanitiseRegistry(parse(storage.getItem(PROFILES_KEY)));
}

function profileView(storage, id) {
  return {
    getItem: (k) => storage.getItem(scopeKey(id, k)),
    setItem: (k, v) => storage.setItem(scopeKey(id, k), v),
    removeItem: (k) => storage.removeItem(scopeKey(id, k)),
  };
}

/** Existing diet for a profile, read through settings.js's own sanitiser. */
function existingDiet(storage, id) {
  return sanitiseDiet(createSettings(profileView(storage, id)).get().diet);
}

/**
 * What would an import do? Pure — reads storage, writes nothing. Re-run it
 * after every answer the user gives (`decisions` feeds back in), so the preview
 * always describes the import that is actually about to happen.
 *
 * `decisions` is keyed by the *incoming* profile's index-and-name signature
 * (`decisionKey`), because a payload's profile ids may be blank or duplicated.
 */
export function planImport(storage, data, { mode = "merge", decisions = {} } = {}) {
  const parsed = parsePersonalData(data);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const clean = parsed.data;
  const registry = readRegistry(storage);
  const byId = new Map(registry.profiles.map((p) => [p.id, p]));
  const byName = new Map();
  for (const p of registry.profiles) {
    const k = p.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, p);
  }

  const blocking = [];
  const entries = clean.profiles.map((p, i) => {
    const key = decisionKey(p, i);
    const decided = decisions[key] || {};
    const idMatch = p.id ? byId.get(p.id) : null;
    const nameMatch = byName.get(p.name.toLowerCase());
    const sameName = !!idMatch && idMatch.name.toLowerCase() === p.name.toLowerCase();
    // Matching ids are NOT proof of the same person. The first profile on every
    // device is deterministically `default` (profiles.js mints it that way so
    // two tabs converge), so a friend's export collides on id with yours by
    // construction. Only id *and* name together are safe to act on silently;
    // either one alone is a question. Getting this wrong merges two people's
    // allergen settings, which is why it is asked rather than inferred.
    const candidate = idMatch || nameMatch || null;
    const ambiguous = mode !== "replace" && !!candidate && !sameName;

    let target = sameName ? idMatch : null;
    if (ambiguous) {
      if (decided.target === "new") target = null;
      else if (decided.target && byId.has(decided.target)) target = byId.get(decided.target);
      else target = undefined; // undecided — apply must refuse
    }
    // Replace wipes the device first, so nothing survives to collide with.
    if (mode === "replace") target = null;

    const entry = {
      key,
      id: p.id,
      name: p.name,
      favourites: p.favourites.length,
      ratings: Object.keys(p.ratings).length,
      hasSettings: !!p.settings,
      match: mode === "replace" ? null : idMatch ? "id" : nameMatch ? "name" : null,
      collides: ambiguous,
      candidateId: ambiguous ? candidate.id : null,
      candidateName: ambiguous ? candidate.name : null,
      targetId: target ? target.id : null,
      targetName: target ? target.name : null,
      action: target === undefined ? "undecided" : target ? "merge" : "new",
      diet: null,
    };
    if (target === undefined) {
      blocking.push(`Is “${p.name}” the same person as “${candidate.name}” already on this device?`);
    }

    // Allergen/dietary prefs are safety data (ADR 0012): a difference between
    // the payload and a profile we're merging into is never resolved quietly.
    // Only when the payload actually carries a `diet` — an absent one means
    // "nothing to say", not "clear theirs".
    if (entry.action === "merge" && isObj(p.settings) && isObj(p.settings.diet)) {
      const mine = existingDiet(storage, target.id);
      const theirs = sanitiseDiet(p.settings.diet);
      if (!sameDiet(mine, theirs)) {
        const choice = DIET_CHOICES.includes(decided.diet) ? decided.diet : null;
        entry.diet = { existing: mine, incoming: theirs, choice };
        if (!choice) blocking.push(`Choose which food preferences “${target.name}” keeps.`);
      }
    }
    return entry;
  });

  const existingOrder = sanitiseOrderLines(parse(storage.getItem(ORDER_KEY)) ?? []);
  return {
    ok: true,
    mode,
    exportedAt: clean.exportedAt,
    totals: {
      profiles: clean.profiles.length,
      favourites: clean.profiles.reduce((n, p) => n + p.favourites.length, 0),
      ratings: clean.profiles.reduce((n, p) => n + Object.keys(p.ratings).length, 0),
      orderItems: clean.order.length,
      otherStores: Object.keys(clean.other).length,
    },
    entries,
    // The order tally is one live order for the table, not a preference: a
    // restore must not quietly bulk up an order someone is mid-way through.
    order: { incoming: clean.order.length, existing: existingOrder.length },
    orderRestores: clean.order.length > 0 && (mode === "replace" || existingOrder.length === 0),
    blocking,
    data: clean,
  };
}

/** Stable handle for an incoming profile's answers. Index-prefixed because a
 *  hand-edited file can carry two profiles with the same id or name. */
export const decisionKey = (p, i) => `${i}:${p?.id || ""}:${p?.name || ""}`;

// --- applying ------------------------------------------------------------

let seq = 0;
const mintId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Does a write actually stick? `safeStorage()` degrades to an in-memory shim
 *  when a browser blocks storage (Safari private mode), and a real localStorage
 *  can throw on quota — either way the import works for this session only, and
 *  the UI has to be able to say so instead of claiming a save that didn't happen. */
function storageWritable(storage) {
  const probe = "__faves_import_probe__";
  try {
    storage.setItem(probe, "1");
    const ok = storage.getItem(probe) === "1";
    storage.removeItem(probe);
    return ok;
  } catch {
    return false;
  }
}

function writeKey(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false; // over quota or blocked — reported, never thrown
  }
}

function removeKey(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    /* nothing persisted to remove */
  }
}

function writeProfileStores(storage, id, p) {
  const view = profileView(storage, id);
  if (p.favourites.length) writeKey(storage, scopeKey(id, "faves.favourites.v1"), JSON.stringify(p.favourites));
  if (Object.keys(p.ratings).length) writeKey(storage, scopeKey(id, "faves.ratings.v1"), JSON.stringify(p.ratings));
  // Through the store, so the payload's settings pass settings.js's clamps.
  if (p.settings) createSettings(view).set(p.settings);
}

function uniqueId(wanted, taken) {
  const id = wanted && !taken.has(wanted) ? wanted : mintId();
  taken.add(id);
  return id;
}

/**
 * Apply a payload to `storage`. Returns a plain-language report; never throws.
 * Refuses (rather than guesses) when the plan still has unanswered questions —
 * profile collisions and allergen differences are the caller's to ask about.
 */
export function applyPersonalData(storage, data, { mode = "merge", decisions = {} } = {}) {
  if (!IMPORT_MODES.includes(mode)) return fail(`Unknown import mode “${mode}”.`);
  const plan = planImport(storage, data, { mode, decisions });
  if (!plan.ok) return fail(plan.error);
  if (plan.blocking.length) {
    return { ...fail("Some choices are still needed before this can be applied."), blocking: plan.blocking };
  }

  const clean = plan.data;
  const persisted = storageWritable(storage);
  const report = {
    ok: true,
    mode,
    persisted,
    created: [],
    merged: [],
    unchanged: [], // matched, but the payload held nothing this device lacked
    favouritesAdded: 0,
    ratingsAdded: 0,
    settingsUpdated: 0,
    dietChanged: [],
    orderRestored: false,
    otherRestored: 0,
  };

  if (mode === "replace") {
    // Everything under `faves.` goes, bar the keys this module refuses to
    // handle at all. Best-effort when the backend can't enumerate: purge the
    // keys we can name from the registry we're about to overwrite.
    const listed = listStoredKeys(storage);
    const doomed = listed.length
      ? listed.filter((k) => !(k in EXCLUDED))
      : [PROFILES_KEY, ORDER_KEY, ...readRegistry(storage).profiles.flatMap((p) => SCOPED_BASE_KEYS.map((b) => scopeKey(p.id, b)))];
    for (const k of doomed) removeKey(storage, k);
  }

  const registry = mode === "replace" ? { v: 1, activeId: null, profiles: [] } : readRegistry(storage);
  const taken = new Set(registry.profiles.map((p) => p.id));

  clean.profiles.forEach((p, i) => {
    const entry = plan.entries[i];
    if (entry.action === "new") {
      const id = uniqueId(p.id, taken);
      registry.profiles.push({ id, name: p.name });
      if (mode === "replace" && (p.active || !registry.activeId)) registry.activeId = id;
      writeProfileStores(storage, id, p);
      report.created.push(p.name);
      report.favouritesAdded += p.favourites.length;
      report.ratingsAdded += Object.keys(p.ratings).length;
      if (p.settings) report.settingsUpdated += 1;
      return;
    }

    const id = entry.targetId;
    const view = profileView(storage, id);
    let touched = 0;

    const favAdded = createFavourites(view).merge(p.favourites);
    report.favouritesAdded += favAdded;
    touched += favAdded;

    // Ratings: yours win. A score you gave a dish is a judgement, and a restore
    // is not grounds to overwrite the newer one you're living with.
    const mineRatings = sanitiseRatings(parse(view.getItem("faves.ratings.v1")));
    let added = 0;
    for (const [k, v] of Object.entries(p.ratings)) {
      if (mineRatings[k]) continue;
      mineRatings[k] = v;
      added += 1;
    }
    if (added) writeKey(storage, scopeKey(id, "faves.ratings.v1"), JSON.stringify(mineRatings));
    report.ratingsAdded += added;
    touched += added;

    if (isObj(p.settings)) {
      const patch = {};
      for (const f of ["favBoostKm", "farKm", "lang", "mapsApp"]) {
        if (f in p.settings) patch[f] = p.settings[f];
      }
      if (entry.diet) {
        const { existing, incoming, choice } = entry.diet;
        if (choice === "incoming") patch.diet = incoming;
        else if (choice === "combine") {
          patch.diet = {
            dietary: [...new Set([...existing.dietary, ...incoming.dietary])],
            avoid: [...new Set([...existing.avoid, ...incoming.avoid])],
          };
        }
        if (choice !== "keep") report.dietChanged.push(entry.targetName);
      } else if (isObj(p.settings.diet)) {
        patch.diet = sanitiseDiet(p.settings.diet); // identical to ours; a no-op write
      }
      if (Object.keys(patch).length) {
        const store = createSettings(view);
        // Compared before and after, not merely "we wrote something": a
        // re-import of the same file must be able to say nothing changed
        // rather than claim an update it didn't make.
        const before = JSON.stringify(store.get());
        store.set(patch);
        if (JSON.stringify(store.get()) !== before) {
          report.settingsUpdated += 1;
          touched += 1;
        }
      }
    }
    if (touched) report.merged.push(entry.targetName);
    else report.unchanged.push(entry.targetName);
  });

  if (!registry.profiles.length) registry.profiles.push({ id: mintId(), name: "Me" });
  if (!registry.profiles.some((p) => p.id === registry.activeId)) registry.activeId = registry.profiles[0].id;
  writeKey(storage, PROFILES_KEY, JSON.stringify(sanitiseRegistry(registry)));

  if (plan.orderRestores) {
    const base = mode === "replace" ? [] : sanitiseOrderLines(parse(storage.getItem(ORDER_KEY)) ?? []);
    writeKey(storage, ORDER_KEY, JSON.stringify(mergeItems(base, clean.order)));
    report.orderRestored = true;
  }

  for (const [k, v] of Object.entries(clean.other)) {
    // Merge never clobbers a store we don't understand well enough to merge.
    if (mode === "merge" && storage.getItem(k) != null) continue;
    if (writeKey(storage, k, v)) report.otherRestored += 1;
  }

  return report;
}
