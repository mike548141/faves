// Merging one person's personal layer across their own devices (ROADMAP
// Theme 9 v2, ADR 0017). Pure and DOM-free — storage never appears in here;
// it works on three `collectPersonalData()` snapshots and hands back a fourth.
//
// WHY THIS IS NOT `applyPersonalData`. That function is the *import* path, and
// import is deliberately additive: `favourites.merge()` never removes, ratings
// are yours-win, and an unknown store is never clobbered. Those are the right
// rules for reading a backup file into a device, and the wrong rules for two
// devices that are meant to end up the same. Applied continually they give you:
//   • un-hearting is impossible — device A drops a heart, device B still has it,
//     the next pull puts it back on A, forever;
//   • ratings never converge — A says 3, B says 5, each keeps its own because
//     "yours win" fires on both ends.
// Import runs once and a human is watching. Sync runs unattended and both ends
// run the same code, so the merge has to be a *function of the pair*, not of
// which device happens to be asking.
//
// WHY THREE WAY. The personal layer carries no clock: not favourites (an array
// of entry objects), not ratings (a bare `{key: 1..5}` map), not settings, not
// the profile registry. So there is nothing to do last-write-wins with, and
// ADR 0017's "union hearts, last-write-wins settings" cannot be implemented as
// written. The way out costs no schema change: keep the snapshot as it stood at
// the last successful sync (`base`) and diff both sides against it. A heart
// missing from one side is then *deletion* if base had it and *never-added* if
// base did not — the distinction the additive path cannot make.
//
// THE PROPERTY THAT MATTERS IS SYMMETRY. Both devices merge the same pair with
// the same base, so every tie-break here must give the same answer whichever
// way round the arguments arrive. "Prefer theirs" would be the natural reading
// of a pull and is exactly wrong: each device would take the other's value and
// the pair would swap forever without settling. `mergePersonal(a, b)` and
// `mergePersonal(b, a)` return the same merged state, and the test suite asserts
// it on every branch rather than trusting the reading.
//
// WHAT IS DELIBERATELY NOT SYNCED. The order tally (`faves.order.v1`) is one
// live order for the table (ADR 0012), not a preference. `planImport` already
// refuses to bulk up an order someone is midway through; syncing it continually
// would do that on every pull. It is passed through from `mine` untouched.

import { favKey } from "./favourites.js";
import { sanitiseDiet } from "./settings.js";

/** The safety-critical field. Its conflicts are reported and never resolved
 *  quietly — the same rule ADR 0030 holds for an imported file's diet. */
export const DIET_FIELD = "diet";

/** Conflict kinds a caller has to be able to tell apart. `diet` must be put to
 *  the user; the others are already resolved and are reported so the UI can say
 *  what it did rather than change something behind the reader's back. */
export const CONFLICT_DIET = "diet";
export const CONFLICT_RATING = "rating";
export const CONFLICT_SETTING = "setting";
export const CONFLICT_PROFILE_IDENTITY = "profile-identity";

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);
const map = (v) => (isObj(v) ? v : {});

/**
 * Symmetric tie-break for two values neither side inherited from base — i.e.
 * both devices genuinely changed the same thing since they last agreed.
 *
 * There is no honest way to know which edit came last: no clock exists, and a
 * wall-clock stamp taken on the pushing device would be a guess dressed as
 * precision the moment the two devices disagree about the time. So the rule is
 * chosen for the one property that actually matters — it must settle. Higher
 * number, then lexicographically-first string, both of which are functions of
 * the values alone and so give the same answer on both devices.
 *
 * Every use of this is surfaced as a conflict. A rule that silently picks is
 * only acceptable because the picking is reported.
 */
export function tieBreak(a, b) {
  if (a === b) return a;
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  const sa = JSON.stringify(a) ?? "";
  const sb = JSON.stringify(b) ?? "";
  return sa <= sb ? a : b;
}

/** Deep-equal enough for this layer: every value here is JSON that came out of
 *  `JSON.parse`, so structural comparison on the serialisation is exact. Key
 *  order is stable because both sides were produced by the same sanitisers. */
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Three-way merge of a set, keyed by `keyOf`.
 *
 * The whole point of `base` is here: an entry present on one side only is an
 * *addition* when base never had it and a *deletion* when base did. Without
 * base the two are indistinguishable, which is why the additive import path
 * cannot propagate an un-heart.
 *
 * Entry objects are denormalised (venueName, name), so when both sides hold the
 * same key the object is taken from `mine` — arbitrary, but the fields differ
 * only in labels cached at heart-time.
 *
 * `added` and `removed` describe what THIS MERGE does to this device's list, so
 * a caller can report it — not what changed since base. An entry both devices
 * had already dropped appears in neither: it is correctly absent from the
 * output, and saying "1 favourite removed" about something the reader deleted
 * on both phones last week would be a report of an event that did not happen.
 *
 * ORDER IS PART OF THE CONVERGENCE, not presentation. Hearts are stored as an
 * array in insertion order, and two devices that agree on the *set* but not the
 * order serialise to different JSON — so each pull would see a changed blob and
 * push a new one, forever, against the one resource ADR 0017 names as scarce
 * (KV writes, 1k/day free). So the output order is a function of the inputs and
 * not of which side is asking: base's order first, for the entries base knew,
 * then everything new sorted by key. The result is that a merge reshuffles a
 * list at most once, rather than the pair ping-ponging on it indefinitely.
 */
export function mergeSet(base, mine, theirs, keyOf = favKey) {
  const index = (items) => {
    const m = new Map();
    for (const e of list(items)) {
      try {
        m.set(keyOf(e), e);
      } catch {
        /* an entry too malformed to key cannot be merged or deleted — drop it */
      }
    }
    return m;
  };
  const b = index(base);
  const m = index(mine);
  const t = index(theirs);

  const kept = new Map();
  const added = [];
  const removed = [];
  for (const key of new Set([...m.keys(), ...t.keys()])) {
    const inM = m.has(key);
    const inT = t.has(key);
    const inB = b.has(key);
    if (inM && inT) {
      kept.set(key, m.get(key));
    } else if (inM && !inB) {
      kept.set(key, m.get(key)); // I added it since we last agreed
      added.push(key);
    } else if (inT && !inB) {
      kept.set(key, t.get(key)); // they added it
      added.push(key);
    } else {
      removed.push(key); // in base, gone from one side — a real deletion
    }
  }

  const out = [];
  const placed = new Set();
  for (const key of b.keys()) {
    if (!kept.has(key)) continue;
    out.push(kept.get(key));
    placed.add(key);
  }
  // Everything base never held, in key order — the half that has to be sorted
  // rather than insertion-ordered, because the two devices inserted separately.
  for (const key of [...kept.keys()].filter((k) => !placed.has(k)).sort()) {
    out.push(kept.get(key));
  }
  return { items: out, added: added.sort(), removed: removed.sort() };
}

/**
 * Three-way merge of a flat `{key: value}` map (ratings).
 *
 * Absence is treated as a value, so a cleared rating flows through the same
 * three rules as a changed one and deletion needs no separate branch.
 */
export function mergeMap(base, mine, theirs) {
  const b = map(base);
  const m = map(mine);
  const t = map(theirs);
  const out = {};
  const conflicts = [];

  for (const key of new Set([...Object.keys(m), ...Object.keys(t)])) {
    const bv = b[key];
    const mv = m[key];
    const tv = t[key];
    let value;
    if (same(mv, tv)) value = mv;
    else if (same(mv, bv)) value = tv; // only they moved
    else if (same(tv, bv)) value = mv; // only I moved
    else {
      value = tieBreak(mv, tv);
      conflicts.push({ kind: CONFLICT_RATING, key, mine: mv, theirs: tv, resolved: value });
    }
    if (value !== undefined) out[key] = value;
  }
  return { map: out, conflicts };
}

/**
 * Three-way merge of one profile's settings object.
 *
 * The field list is the union of the keys actually present rather than a
 * hardcoded whitelist. A whitelist in this position has already rotted once —
 * `applyPersonalData`'s settings patch named four fields and silently dropped
 * `units` (ADR 0029) and `currency` (ADR 0045) when they landed later. A field
 * added to `settings.js` tomorrow syncs without anyone remembering this file.
 *
 * `diet` is the exception in two directions: it is safety data, so a genuine
 * two-sided change is never resolved quietly (ADR 0030's rule for an imported
 * file, which applies with more force to an unattended pull); and while the
 * question is pending the provisional value is the **union** of both sides, so
 * no device is left without an allergen warning it had a moment ago. Over-
 * warning is an inconvenience; under-warning is the one failure in this app
 * that can hurt someone.
 */
export function mergeSettings(base, mine, theirs) {
  const b = map(base);
  const m = map(mine);
  const t = map(theirs);
  const out = {};
  const conflicts = [];

  for (const field of new Set([...Object.keys(m), ...Object.keys(t)])) {
    const bv = b[field];
    const mv = m[field];
    const tv = t[field];

    if (same(mv, tv)) {
      if (mv !== undefined) out[field] = mv;
      continue;
    }
    if (same(mv, bv)) {
      if (tv !== undefined) out[field] = tv;
      continue;
    }
    if (same(tv, bv)) {
      if (mv !== undefined) out[field] = mv;
      continue;
    }

    if (field === DIET_FIELD) {
      const mineDiet = sanitiseDiet(mv);
      const theirsDiet = sanitiseDiet(tv);
      out[field] = {
        dietary: [...new Set([...mineDiet.dietary, ...theirsDiet.dietary])].sort(),
        avoid: [...new Set([...mineDiet.avoid, ...theirsDiet.avoid])].sort(),
      };
      conflicts.push({
        kind: CONFLICT_DIET,
        field,
        mine: mineDiet,
        theirs: theirsDiet,
        // Provisional, not decided: the caller must ask. Named so a UI cannot
        // mistake the union for an answer the user gave.
        provisional: out[field],
      });
      continue;
    }

    const value = tieBreak(mv, tv);
    if (value !== undefined) out[field] = value;
    conflicts.push({ kind: CONFLICT_SETTING, field, mine: mv, theirs: tv, resolved: value });
  }
  return { settings: out, conflicts };
}

/** Profiles are matched by id, and an id alone is not proof of a person: every
 *  device mints its first profile as `default` (profiles.js), so two devices
 *  that were never paired collide by construction. Id AND name together is the
 *  only pair safe to merge without asking — the same test `planImport` applies
 *  to an imported file, held to here so the two doors cannot disagree. */
const profileKey = (p) => String(p?.id ?? "");
const sameName = (a, b) =>
  String(a?.name ?? "").trim().toLowerCase() === String(b?.name ?? "").trim().toLowerCase();

/**
 * Merge two `collectPersonalData()` snapshots against the snapshot they last
 * agreed on.
 *
 * `base` is null on the very first pull, when the two devices have no shared
 * history. Everything then looks like an addition, which is correct — nothing
 * can have been deleted since an agreement that never happened — but it also
 * means the first pull is the one moment profile identity has to be settled by
 * a human. That is a pairing-time question, asked once, not a question every
 * pull; after it, `base` carries the answer forward.
 *
 * Returns `{ merged, conflicts, changes }`. `merged` is a snapshot in the same
 * shape, ready to be written back and re-encrypted. `conflicts` carrying any
 * `CONFLICT_DIET` entry means the caller must ask before it writes.
 */
export function mergePersonal(base, mine, theirs) {
  const baseProfiles = new Map(list(base?.profiles).map((p) => [profileKey(p), p]));
  const mineProfiles = list(mine?.profiles);
  const theirsProfiles = new Map(list(theirs?.profiles).map((p) => [profileKey(p), p]));

  const conflicts = [];
  const changes = { favouritesAdded: 0, favouritesRemoved: 0, ratingsChanged: 0, settingsChanged: 0, profilesAdded: 0 };
  const merged = [];
  const handled = new Set();

  const mergeOne = (b, m, t) => {
    const fav = mergeSet(b?.favourites, m?.favourites, t?.favourites);
    const rat = mergeMap(b?.ratings, m?.ratings, t?.ratings);
    const set = mergeSettings(b?.settings, m?.settings, t?.settings);
    changes.favouritesAdded += fav.added.length;
    changes.favouritesRemoved += fav.removed.length;
    changes.ratingsChanged += rat.conflicts.length;
    changes.settingsChanged += set.conflicts.length;
    for (const c of [...rat.conflicts, ...set.conflicts]) {
      conflicts.push({ ...c, profileId: profileKey(m ?? t), profileName: (m ?? t)?.name ?? "" });
    }
    return {
      id: profileKey(m ?? t),
      name: (m ?? t)?.name ?? "",
      // `active` is which profile this DEVICE is showing. It is a property of
      // the device in the hand, not of the person, so it is never taken from
      // the other end — syncing it would switch profiles under someone mid-tap.
      active: !!m?.active,
      favourites: fav.items,
      ratings: rat.map,
      settings: set.settings,
    };
  };

  for (const m of mineProfiles) {
    const key = profileKey(m);
    handled.add(key);
    const t = theirsProfiles.get(key);
    if (!t) {
      // A profile that exists here and not there: added on this device, or
      // deleted on the other. Base tells them apart — the mirror of the loop
      // below. Until 2026-08-17 this branch kept the profile whatever base
      // said and merged it against an EMPTY "theirs", which read every heart
      // as removed-there and every setting as unset-there: the profile
      // survived with its allergen list wiped, was written back to the blob,
      // and the device that had deleted it got it back, empty. Deletion now
      // propagates in both directions, and a profile new here is merged
      // against nothing (its stores are additions).
      if (baseProfiles.has(key)) continue;
      merged.push(mergeOne(null, m, null));
      continue;
    }
    if (!baseProfiles.has(key) && !sameName(m, t)) {
      // Same id, different name, no shared history — the `default` collision.
      // Merged provisionally on the safe reading (they are the same person's
      // two devices, which is what sync is for), but reported so the caller
      // asks before this becomes the base everything later is diffed against.
      conflicts.push({
        kind: CONFLICT_PROFILE_IDENTITY,
        profileId: key,
        mine: m.name,
        theirs: t.name,
      });
    }
    merged.push(mergeOne(baseProfiles.get(key), m, t));
  }

  for (const [key, t] of theirsProfiles) {
    if (handled.has(key)) continue;
    // A profile that exists there and not here: added on the other device, or
    // deleted on this one. Base tells them apart, exactly as it does for hearts.
    if (baseProfiles.has(key)) continue;
    merged.push({ ...mergeOne(null, null, t), active: false });
    changes.profilesAdded += 1;
  }

  return {
    merged: {
      format: mine?.format ?? theirs?.format ?? null,
      v: mine?.v ?? theirs?.v ?? null,
      profiles: merged,
      // Not synced — see the header. Carried through so the merged snapshot is
      // a complete one and the writer needs no second source.
      order: list(mine?.order),
    },
    conflicts,
    changes,
  };
}

/** Does this merge need a human before it can be written? Only the diet
 *  conflict blocks: the others are already resolved and merely reported. */
export const needsDecision = (conflicts) => list(conflicts).some((c) => c.kind === CONFLICT_DIET);
