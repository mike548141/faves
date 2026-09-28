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
  CONFLICT_NOTE,
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
  const base = snap({
    favourites: [venue("kk")], ratings: { "v:kk": 3 }, notes: { r: "base note" }, settings: { lang: "local" },
  });
  const mine = snap({
    favourites: [venue("kk"), venue("m")], ratings: { "v:kk": 5 }, notes: { r: "mine" }, settings: { lang: "local" },
  });
  const theirs = snap({
    favourites: [venue("kk")], ratings: { "v:kk": 3 }, notes: { r: "theirs" }, settings: { lang: "mi" },
  });
  const ab = mergePersonal(base, mine, theirs).merged.profiles[0];
  const ba = mergePersonal(base, theirs, mine).merged.profiles[0];
  assert.deepEqual(ab.favourites.map(favKey), ba.favourites.map(favKey));
  assert.deepEqual(ab.ratings, ba.ratings);
  assert.deepEqual(ab.notes, ba.notes);
  assert.deepEqual(ab.settings, ba.settings);
});

test("mergePersonal carries a per-profile notes field, three-way merged and counted in changes", () => {
  const base = snap({ notes: { r: "half the sugar" } });
  const mine = snap({ notes: { r: "half the sugar" } });
  const theirs = snap({ notes: { r: "half the sugar, better" } });
  const { merged, changes, conflicts } = mergePersonal(base, mine, theirs);
  assert.deepEqual(merged.profiles[0].notes, { r: "half the sugar, better" });
  assert.equal(changes.notesChanged, 0); // one-sided change, not a conflict
  assert.deepEqual(conflicts, []);
});

test("a genuine two-sided note conflict is reported with CONFLICT_NOTE and counted", () => {
  const base = snap({ notes: { r: "base" } });
  const mine = snap({ notes: { r: "mine" } });
  const theirs = snap({ notes: { r: "theirs" } });
  const { changes, conflicts } = mergePersonal(base, mine, theirs);
  assert.equal(changes.notesChanged, 1);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, CONFLICT_NOTE);
  assert.equal(conflicts[0].profileId, "default");
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

// --- notes (ADR 0131) --------------------------------------------------
// A note is the SAME shape a rating is — a flat `{key: value}` map — so it
// goes through the identical mergeMap three-way logic. Only the reported
// conflict `kind` differs, which is what these mirror the rating tests to
// prove: the mechanism is shared, the label is not.

test("mergeMap defaults its conflict kind to CONFLICT_RATING (existing callers are unaffected)", () => {
  const out = mergeMap({ "v:kk": 3 }, { "v:kk": 4 }, { "v:kk": 5 });
  assert.equal(out.conflicts[0].kind, CONFLICT_RATING);
});

test("a note changed on one device only wins without being called a conflict", () => {
  const out = mergeMap({ r: "half the sugar" }, { r: "half the sugar" }, { r: "half the sugar, better" }, CONFLICT_NOTE);
  assert.deepEqual(out.map, { r: "half the sugar, better" });
  assert.deepEqual(out.conflicts, []);
});

test("a note cleared on one device propagates rather than being restored", () => {
  const out = mergeMap({ r: "a note" }, { r: "a note" }, {}, CONFLICT_NOTE);
  assert.deepEqual(out.map, {});
});

test("a note edited on both devices is resolved symmetrically AND reported as a NOTE conflict", () => {
  const ab = mergeMap({ r: "base" }, { r: "mine" }, { r: "theirs" }, CONFLICT_NOTE);
  const ba = mergeMap({ r: "base" }, { r: "theirs" }, { r: "mine" }, CONFLICT_NOTE);
  assert.deepEqual(ab.map, ba.map);
  assert.equal(ab.conflicts.length, 1);
  assert.equal(ab.conflicts[0].kind, CONFLICT_NOTE);
  assert.notEqual(ab.conflicts[0].kind, CONFLICT_RATING); // distinct label, same mechanism
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

test("a profile deleted on the OTHER device is gone here too — not kept with its allergens wiped", () => {
  // The other direction of the test above. Until 2026-08-17 the mine-side
  // branch ignored base and merged the profile against an empty "theirs":
  // every heart read as removed-there, every setting as unset-there, and
  // Ruth survived with `settings: {}` — the allergen list gone while her
  // name still showed — then went back to the blob and re-appeared, empty,
  // on the device that had deleted her. Reproduced by the cold review.
  const ruth = {
    id: "p2", name: "Ruth", active: false,
    favourites: [venue("kk")], ratings: { "v:kk": 4 },
    settings: { diet: { dietary: [], avoid: ["contains-nuts"] } },
  };
  const two = { ...snap({}), profiles: [...snap({}).profiles, ruth] };
  const out = mergePersonal(two, two, snap({})); // base had two, THEIRS now has one
  assert.deepEqual(out.merged.profiles.map((p) => p.id), ["default"]);
  // And symmetric with the mine-side deletion.
  const ab = mergePersonal(two, two, snap({})).merged.profiles.map((p) => p.id);
  const ba = mergePersonal(two, snap({}), two).merged.profiles.map((p) => p.id);
  assert.deepEqual(ab, ba);
});

test("a profile NEW on this device keeps its hearts and its allergens on the way out", () => {
  // No base, theirs lacks it: an addition here, merged against nothing.
  const ruth = {
    id: "p2", name: "Ruth", active: false,
    favourites: [venue("kk")], ratings: { "v:kk": 4 },
    settings: { diet: { dietary: [], avoid: ["contains-nuts"] } },
  };
  const two = { ...snap({}), profiles: [...snap({}).profiles, ruth] };
  const p2 = mergePersonal(null, two, snap({})).merged.profiles.find((p) => p.id === "p2");
  assert.ok(p2, "the new profile travels");
  assert.deepEqual(p2.favourites.map(favKey), ["v:kk"]);
  assert.deepEqual(p2.settings.diet.avoid, ["contains-nuts"]);
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

// --- Halal / Kosher / Meatarian (ADR 0140) ---------------------------------

test("mergeSettings: foodPrefs changed on both sides UNION — a warning is never tie-broken off", () => {
  // Halal and Kosher each switch warnings ON. A tie-break would pick one side
  // and switch the other device's Halal off to agree with it.
  const out = mergeSettings({ foodPrefs: [] }, { foodPrefs: ["halal"] }, { foodPrefs: ["kosher"] });
  assert.deepEqual(out.settings.foodPrefs, ["halal", "kosher"]);
  const c = out.conflicts.find((x) => x.field === "foodPrefs");
  assert.equal(c.kind, CONFLICT_SETTING);
  assert.deepEqual(c.resolved, ["halal", "kosher"]);
});

test("mergeSettings: a one-sided foodPrefs change is simply taken, removal included", () => {
  // Union is ONLY the two-sided answer: turning Halal off on one device while
  // the other did nothing must still turn it off everywhere.
  const on = mergeSettings({ foodPrefs: [] }, { foodPrefs: [] }, { foodPrefs: ["halal"] });
  assert.deepEqual(on.settings.foodPrefs, ["halal"]);
  const off = mergeSettings({ foodPrefs: ["halal"] }, { foodPrefs: ["halal"] }, { foodPrefs: [] });
  assert.deepEqual(off.settings.foodPrefs, []);
});

test("mergeSettings: an older device that carried foodPrefs untouched does not delete it", () => {
  // An ADR 0127 build carries the field opaquely, so its blob comes back with
  // the value unchanged — which reads as "only we moved" and keeps ours.
  const out = mergeSettings({ foodPrefs: ["halal"] }, { foodPrefs: ["halal", "kosher"] }, { foodPrefs: ["halal"] });
  assert.deepEqual(out.settings.foodPrefs, ["halal", "kosher"]);
});
