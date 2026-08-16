// renames.js — an id can be corrected, but never simply replaced.
//
// Both failure modes here are silent, which is the whole reason the module
// exists: a shared link 404s, or a phone's hearts quietly stop matching the
// venue they belong to. Neither shows up as an error anywhere.

import test from "node:test";
import assert from "node:assert/strict";
import {
  RENAMED,
  canonicalVenueId,
  migrateEntries,
  migrateRatingKeys,
} from "../site/js/renames.js";

test("a retired id resolves to its current one; anything else passes through", () => {
  assert.equal(canonicalVenueId("burgerfuel-johnsonville"), "burgerfuel");
  assert.equal(canonicalVenueId("hell-pizza-newlands"), "hell-pizza");
  assert.equal(canonicalVenueId("kk-malaysian"), "kk-malaysian");
  assert.equal(canonicalVenueId("never-existed"), "never-existed");
});

test("a non-string id is returned untouched rather than coerced", () => {
  assert.equal(canonicalVenueId(undefined), undefined);
  assert.equal(canonicalVenueId(null), null);
});

test("the table never points at another retired id", () => {
  // A rename OF a rename must be written as one hop to the FINAL id. If this
  // ever fails, some resolver somewhere is one hop short of the truth — and
  // canonicalVenueId is deliberately single-hop so a cycle can't hang the boot.
  for (const [from, to] of Object.entries(RENAMED)) {
    assert.equal(RENAMED[to], undefined, `${from} → ${to}, which is itself retired`);
  }
});

test("stored favourites and order lines follow the venue", () => {
  const before = [
    { venueId: "burgerfuel-johnsonville", venueName: "BurgerFuel Johnsonville", name: "Bastard" },
    { venueId: "kk-malaysian", name: "Mee Goreng" },
  ];
  const after = migrateEntries(before);
  assert.equal(after[0].venueId, "burgerfuel");
  assert.equal(after[0].name, "Bastard", "the rest of the entry is untouched");
  assert.equal(after[1], before[1], "an unmoved entry is the same object, not a copy");
});

test("migrateEntries survives junk rather than throwing at boot", () => {
  assert.deepEqual(migrateEntries([]), []);
  assert.equal(migrateEntries(null), null);
  assert.equal(migrateEntries("not an array"), "not an array");
  assert.deepEqual(migrateEntries([null]), [null]); // nothing invented for a junk entry
});

test("hearts and ratings keyed by venue and by dish both follow", () => {
  const before = {
    "v:hell-pizza-newlands": 5,
    "d:hell-pizza-newlands Mismatch": 4,
    "v:kk-malaysian": 3,
  };
  assert.deepEqual(migrateRatingKeys(before), {
    "v:hell-pizza": 5,
    "d:hell-pizza Mismatch": 4,
    "v:kk-malaysian": 3,
  });
});

test("a rating already under the new id wins over the old one", () => {
  // Same shop, two entries. The one the viewer set most recently is the one
  // stored under the current id, so it is the honest survivor.
  const before = { "v:burgerfuel-johnsonville": 2, "v:burgerfuel": 5 };
  assert.deepEqual(migrateRatingKeys(before), { "v:burgerfuel": 5 });
});

test("a map with nothing to move is returned as the same object", () => {
  const map = { "v:kk-malaysian": 3 };
  assert.equal(migrateRatingKeys(map), map);
});

test("migrateRatingKeys leaves keys it doesn't recognise alone", () => {
  const before = { "weird-key": 1, "v:burgerfuel-johnsonville": 4 };
  assert.deepEqual(migrateRatingKeys(before), { "weird-key": 1, "v:burgerfuel": 4 });
  assert.equal(migrateRatingKeys(null), null);
  assert.equal(migrateRatingKeys([1, 2]).length, 2); // an array is not a rating map
});
