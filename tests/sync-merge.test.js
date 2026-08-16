// Unit tests for the cross-device merge (site/js/sync-merge.js) — the
// client-side half of Theme 9 v2 / ADR 0017. No storage and no browser: the
// module is a pure function of three snapshots.
//
// The suite is organised around the two things that make sync different from
// import, because both are invisible to a test that only checks "the data got
// there": deletions must propagate, and the merge must be SYMMETRIC. An
// asymmetric merge looks perfect in a one-directional test and then ping-pongs
// forever in the field, where the cost lands on the one resource ADR 0017 calls
// scarce. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeSet,
  mergeMap,
  mergeSettings,
  mergePersonal,
  tieBreak,
  needsDecision,
  CONFLICT_DIET,
  CONFLICT_RATING,
  CONFLICT_SETTING,
  CONFLICT_PROFILE_IDENTITY,
} from "../site/js/sync-merge.js";
import { favKey } from "../site/js/favourites.js";

const venue = (id) => ({ type: "venue", venueId: id, venueName: id });
const dish = (id, name) => ({ type: "dish", venueId: id, venueName: id, name });

const keys = (items) => items.map(favKey).sort();

/** A whole snapshot in `collectPersonalData()` shape, one profile. */
const snap = (profile) => ({
  format: "faves.personal-data",
  v: 1,
  profiles: [{ id: "default", name: "Me", active: true, favourites: [], ratings: {}, settings: {}, ...profile }],
  order: [],
});

// --- the headline: deletion propagates ------------------------------------

test("un-hearting propagates: a heart deleted on one device is not resurrected by the other", () => {
  const base = [venue("kk"), venue("pandan")];
  const mine = [venue("kk"), venue("pandan")]; // this device still has both
  const theirs = [venue("kk")]; // the other device un-hearted pandan
  const out = mergeSet(base, mine, theirs);
  assert.deepEqual(keys(out.items), ["v:kk"]);
  assert.deepEqual(out.removed, ["v:pandan"]);
});

test("the additive rule this replaces would have resurrected it — base is what tells add from delete", () => {
  // Identical inputs bar the base. With no shared history the same one-sided
  // absence is an ADDITION by the other device, not a deletion by it.
  const mine = [venue("kk"), venue("pandan")];
  const theirs = [venue("kk")];
  const withBase = mergeSet([venue("kk"), venue("pandan")], mine, theirs);
  const noBase = mergeSet(null, mine, theirs);
  assert.deepEqual(keys(withBase.items), ["v:kk"]);
  assert.deepEqual(keys(noBase.items), ["v:kk", "v:pandan"]);
});

test("an addition on either side lands, and is reported as an addition", () => {
  const base = [venue("kk")];
  const out = mergeSet(base, [venue("kk"), venue("mine")], [venue("kk"), venue("theirs")]);
  assert.deepEqual(keys(out.items), ["v:kk", "v:mine", "v:theirs"]);
  assert.deepEqual(out.added, ["v:mine", "v:theirs"]);
  assert.deepEqual(out.removed, []);
});

test("a heart deleted on BOTH devices stays deleted, and is reported as no change", () => {
  // `removed` is what this merge takes off THIS device's list, which is what a
  // caller reports. Something both devices dropped before they last spoke is
  // already gone from both, so the merge changes nothing and claims nothing.
  const out = mergeSet([venue("kk"), venue("gone")], [venue("kk")], [venue("kk")]);
  assert.deepEqual(keys(out.items), ["v:kk"]);
  assert.deepEqual(out.removed, []);
});

test("dish hearts merge on the same identity the store uses (ADR 0051)", () => {
  const a = dish("kk", "Roti Canai");
  const out = mergeSet([], [a], [a]);
  assert.equal(out.items.length, 1);
  assert.equal(favKey(out.items[0]), "d:kk roti-canai");
});

// --- symmetry and convergence ---------------------------------------------

test("mergeSet is symmetric: the same pair merges to the same list either way round", () => {
  const base = [venue("b1"), venue("b2")];
  const mine = [venue("b1"), venue("m")];
  const theirs = [venue("b2"), venue("t")];
  const ab = mergeSet(base, mine, theirs).items;
  const ba = mergeSet(base, theirs, mine).items;
  // Not just the same set — the same ORDER, or the pair never stops writing.
  assert.deepEqual(ab.map(favKey), ba.map(favKey));
});

test("the merged order is stable under a differing insertion order on each device", () => {
  // The same three hearts, added in a different sequence on each device.
  const mine = [venue("c"), venue("a"), venue("b")];
  const theirs = [venue("b"), venue("c"), venue("a")];
  const ab = mergeSet(null, mine, theirs).items.map(favKey);
  const ba = mergeSet(null, theirs, mine).items.map(favKey);
  assert.deepEqual(ab, ba);
});

test("merging is idempotent: re-merging a settled pair changes nothing and so writes nothing", () => {
  const base = [venue("kk")];
  const first = mergeSet(base, [venue("kk"), venue("new")], [venue("kk")]).items;
  const second = mergeSet(first, first, first).items;
  assert.deepEqual(second.map(favKey), first.map(favKey));
});

test("tieBreak is symmetric for every type it handles", () => {
  assert.equal(tieBreak(3, 5), tieBreak(5, 3));
  assert.equal(tieBreak("apple", "pear"), tieBreak("pear", "apple"));
  assert.equal(tieBreak(undefined, 4), tieBreak(4, undefined));
  assert.deepEqual(tieBreak({ a: 1 }, { a: 2 }), tieBreak({ a: 2 }, { a: 1 }));
});

test("mergePersonal is symmetric across the whole snapshot", () => {
  const base = snap({ favourites: [venue("kk")], ratings: { "v:kk": 3 }, settings: { lang: "local" } });
  const mine = snap({ favourites: [venue("kk"), venue("m")], ratings: { "v:kk": 5 }, settings: { lang: "local" } });
  const theirs = snap({ favourites: [venue("kk")], ratings: { "v:kk": 3 }, settings: { lang: "mi" } });
  const ab = mergePersonal(base, mine, theirs).merged.profiles[0];
  const ba = mergePersonal(base, theirs, mine).merged.profiles[0];
  assert.deepEqual(ab.favourites.map(favKey), ba.favourites.map(favKey));
  assert.deepEqual(ab.ratings, ba.ratings);
  assert.deepEqual(ab.settings, ba.settings);
});

// --- ratings ---------------------------------------------------------------

test("a rating changed on one device only wins without being called a conflict", () => {
  const out = mergeMap({ "v:kk": 3 }, { "v:kk": 3 }, { "v:kk": 5 });
  assert.deepEqual(out.map, { "v:kk": 5 });
  assert.deepEqual(out.conflicts, []);
});

test("a rating cleared on one device propagates rather than being restored", () => {
  const out = mergeMap({ "v:kk": 4 }, { "v:kk": 4 }, {});
  assert.deepEqual(out.map, {});
});

test("a rating changed on both devices is resolved symmetrically AND reported", () => {
  const ab = mergeMap({ "v:kk": 3 }, { "v:kk": 4 }, { "v:kk": 5 });
  const ba = mergeMap({ "v:kk": 3 }, { "v:kk": 5 }, { "v:kk": 4 });
  assert.deepEqual(ab.map, ba.map);
  assert.equal(ab.conflicts.length, 1);
  assert.equal(ab.conflicts[0].kind, CONFLICT_RATING);
  assert.equal(ab.conflicts[0].resolved, 5);
});

// --- settings --------------------------------------------------------------

test("a settings field nobody named still syncs — no whitelist to rot", () => {
  // `units` and `currency` are exactly the fields applyPersonalData's hardcoded
  // patch list dropped for two ADRs. Nothing in sync-merge.js names them.
  const out = mergeSettings({ units: "local" }, { units: "local" }, { units: "imperial", currency: "AUD" });
  assert.equal(out.settings.units, "imperial");
  assert.equal(out.settings.currency, "AUD");
});

test('a "local" preference survives a merge rather than being resolved to a value', () => {
  const out = mergeSettings({ lang: "local" }, { lang: "local" }, { lang: "local" });
  assert.equal(out.settings.lang, "local");
});

test("a dial changed on both devices settles and says so", () => {
  const out = mergeSettings({ farKm: 10 }, { farKm: 20 }, { farKm: 30 });
  assert.equal(out.settings.farKm, 30);
  assert.equal(out.conflicts[0].kind, CONFLICT_SETTING);
  assert.equal(out.conflicts[0].field, "farKm");
});

test("allergens changed on both devices are never resolved quietly — union provisionally, and asked", () => {
  const base = { diet: { dietary: [], avoid: [] } };
  const mine = { diet: { dietary: [], avoid: ["contains-nuts"] } };
  const theirs = { diet: { dietary: [], avoid: ["contains-gluten"] } };
  const out = mergeSettings(base, mine, theirs);
  // Provisional value warns about BOTH: a pending question must not leave a
  // device without a warning it had a moment ago.
  assert.deepEqual(out.settings.diet.avoid, ["contains-gluten", "contains-nuts"]);
  assert.equal(out.conflicts.length, 1);
  assert.equal(out.conflicts[0].kind, CONFLICT_DIET);
  assert.ok(needsDecision(out.conflicts));
});

test("an allergen set on one device only propagates without asking", () => {
  const base = { diet: { dietary: [], avoid: [] } };
  const out = mergeSettings(base, base, { diet: { dietary: [], avoid: ["contains-nuts"] } });
  assert.deepEqual(out.settings.diet.avoid, ["contains-nuts"]);
  assert.deepEqual(out.conflicts, []);
  assert.equal(needsDecision(out.conflicts), false);
});

test("only a diet conflict blocks the write; a resolved dial does not", () => {
  const out = mergeSettings({ farKm: 10 }, { farKm: 20 }, { farKm: 30 });
  assert.equal(needsDecision(out.conflicts), false);
});

// --- whole-snapshot behaviour ---------------------------------------------

test("the order tally is not synced — it is one live order for the table (ADR 0012)", () => {
  const mine = { ...snap({}), order: [{ venueId: "kk", name: "Roti", qty: 1 }] };
  const theirs = { ...snap({}), order: [{ venueId: "pandan", name: "Laksa", qty: 2 }] };
  const out = mergePersonal(null, mine, theirs);
  assert.deepEqual(out.merged.order, mine.order);
});

test("which profile is active is a property of the device and is never taken from the other end", () => {
  const mine = snap({ active: true });
  const theirs = snap({ active: false });
  assert.equal(mergePersonal(null, mine, theirs).merged.profiles[0].active, true);
});

test("a profile added on the other device arrives", () => {
  const theirs = {
    ...snap({}),
    profiles: [...snap({}).profiles, { id: "p2", name: "Ruth", active: false, favourites: [], ratings: {}, settings: {} }],
  };
  const out = mergePersonal(null, snap({}), theirs);
  assert.equal(out.merged.profiles.length, 2);
  assert.equal(out.changes.profilesAdded, 1);
});

test("a profile deleted on this device is not resurrected by the other", () => {
  const two = {
    ...snap({}),
    profiles: [...snap({}).profiles, { id: "p2", name: "Ruth", active: false, favourites: [], ratings: {}, settings: {} }],
  };
  const out = mergePersonal(two, snap({}), two); // base had two, mine now has one
  assert.deepEqual(out.merged.profiles.map((p) => p.id), ["default"]);
});

test('two unpaired devices both minting profile "default" is reported, never assumed', () => {
  // profiles.js mints the first profile as `default` on EVERY device, so an id
  // match across two devices that never synced is guaranteed, not evidence.
  const mine = snap({ id: "default", name: "Mike" });
  const theirs = snap({ id: "default", name: "Ruth" });
  const out = mergePersonal(null, mine, theirs);
  const c = out.conflicts.find((x) => x.kind === CONFLICT_PROFILE_IDENTITY);
  assert.ok(c, "expected a profile-identity conflict");
  assert.equal(c.mine, "Mike");
  assert.equal(c.theirs, "Ruth");
});

test("once base carries the answer, the same pair is not asked again", () => {
  const base = snap({ id: "default", name: "Mike" });
  const out = mergePersonal(base, base, snap({ id: "default", name: "Mike" }));
  assert.equal(out.conflicts.filter((c) => c.kind === CONFLICT_PROFILE_IDENTITY).length, 0);
});

// --- robustness ------------------------------------------------------------

test("a corrupt or empty snapshot merges to something usable rather than throwing", () => {
  assert.doesNotThrow(() => mergePersonal(null, null, null));
  assert.doesNotThrow(() => mergePersonal(undefined, snap({}), { profiles: "nonsense" }));
  assert.doesNotThrow(() => mergeSet(null, undefined, [null, 5, "x"]));
  assert.deepEqual(mergeMap(null, null, null).map, {});
});
