// Unit tests for the `vibe` vocabulary (site/js/vibes.js) — the closed list
// of what a place is like, ruled 2026-08-16 (ROADMAP 37k). Run: `node --test`.
//
// vibes.js is pure data plus five pure lookups, so it tests directly. Two of
// these assertions are load-bearing beyond the module:
//
//   • "every FORMER_VIBES target exists" is what stops the migration map
//     rotting. tools/validate.py reads that map to tell someone a stale value
//     was "renamed to X"; if X is later dropped from VIBES the advice becomes a
//     lie, and nothing else in the repo would notice.
//   • "vibesFor returns vocabulary order" is the reason cards read the same way
//     on every venue. The JSON arrays are in whatever order they were typed.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FACETS,
  VIBES,
  FORMER_VIBES,
  vibe,
  vibeLabel,
  vibesOf,
  vibesFor,
  styleOf,
} from "../site/js/vibes.js";

test("VIBES: keys are unique", () => {
  const keys = VIBES.map((v) => v.key);
  assert.equal(new Set(keys).size, keys.length, `duplicate key in ${keys.join(", ")}`);
});

test("VIBES: every key is kebab-case", () => {
  // The stored value is what a URL, a filter and validate.py handle. The corpus
  // it replaced mixed `craft beer`, `quick-lunch` and `Wellington icon` in one
  // array, which is precisely the drift this shape rules out.
  for (const v of VIBES) {
    assert.match(v.key, /^[a-z0-9]+(-[a-z0-9]+)*$/, `not kebab-case: ${v.key}`);
  }
});

test("VIBES: every entry has a non-empty label and a known facet", () => {
  for (const v of VIBES) {
    assert.equal(typeof v.label, "string");
    assert.ok(v.label.trim().length > 0, `empty label on ${v.key}`);
    assert.ok(FACETS.includes(v.facet), `${v.key} has facet ${v.facet}, not in ${FACETS}`);
  }
});

test("VIBES: every facet is used, and the styles lead", () => {
  for (const facet of FACETS) {
    assert.ok(vibesOf(facet).length > 0, `facet ${facet} has no values`);
  }
  // Cards render in array order, so a style must never sort behind an amenity.
  const facetsInOrder = VIBES.map((v) => v.facet);
  const firstOfEach = FACETS.map((f) => facetsInOrder.indexOf(f));
  assert.deepEqual(firstOfEach, [...firstOfEach].sort((a, b) => a - b));
});

test("vibe(): resolves a key, and is null for anything else", () => {
  assert.equal(vibe("craft-beer").label, "Craft beer");
  assert.equal(vibe("craft-beer").facet, "amenity");
  assert.equal(vibe("craft beer"), null); // the pre-migration spelling
  assert.equal(vibe("nope"), null);
  assert.equal(vibe(undefined), null);
});

test("vibeLabel(): falls back to the raw key", () => {
  assert.equal(vibeLabel("fine-dining"), "Fine dining");
  // Only reachable on data that bypassed validate.py — showing the raw value is
  // how anyone would notice, so it must not render empty.
  assert.equal(vibeLabel("mystery-value"), "mystery-value");
});

test("vibesOf(): one facet, in vocabulary order", () => {
  const styles = vibesOf("style");
  assert.ok(styles.every((v) => v.facet === "style"));
  assert.deepEqual(
    styles.map((v) => v.key),
    VIBES.filter((v) => v.facet === "style").map((v) => v.key),
  );
  assert.deepEqual(vibesOf("not-a-facet"), []);
});

test("vibesFor(): vocabulary order, not the order the JSON happens to list", () => {
  const scrambled = ["wellington-icon", "craft-beer", "sit-down"];
  assert.deepEqual(
    vibesFor(scrambled).map((v) => v.key),
    ["sit-down", "craft-beer", "wellington-icon"],
  );
  // Same facts, opposite input order, same output — the point of the exercise.
  assert.deepEqual(
    vibesFor([...scrambled].reverse()).map((v) => v.key),
    vibesFor(scrambled).map((v) => v.key),
  );
});

test("vibesFor(): drops unknown values instead of rendering them", () => {
  assert.deepEqual(
    vibesFor(["craft beer", "craft-beer", "steakhouse", ""]).map((v) => v.key),
    ["craft-beer"],
  );
  assert.deepEqual(vibesFor([]), []);
  assert.deepEqual(vibesFor(null), []);
  assert.deepEqual(vibesFor("craft-beer"), []); // a string is not a list
});

test("styleOf(): at most one, and it is a style", () => {
  assert.equal(styleOf(["craft-beer", "sit-down", "beer-garden"]).key, "sit-down");
  assert.equal(styleOf(["craft-beer", "beer-garden"]), null);
  assert.equal(styleOf([]), null);
  assert.equal(styleOf(null), null);
  assert.equal(styleOf(["fine dining"]), null); // pre-migration spelling
  // The corpus really does carry two styles on one venue (regal-chinese:
  // banquet + sit-down), so this takes the first in VOCABULARY order rather
  // than the first in the array — deterministic either way round.
  const both = ["banquet", "sit-down"];
  assert.equal(styleOf(both).key, "sit-down"); // sit-down leads banquet in VIBES
  assert.equal(styleOf([...both].reverse()).key, "sit-down");
  assert.equal(styleOf(both).facet, "style");
});

test("FORMER_VIBES: every rename target is still in the vocabulary", () => {
  // The assertion that stops the migration map rotting: validate.py tells a
  // stale value it "was renamed to X", and X had better exist.
  const keys = new Set(VIBES.map((v) => v.key));
  for (const [was, became] of Object.entries(FORMER_VIBES)) {
    if (became === null) continue; // dropped deliberately, not renamed
    assert.ok(keys.has(became), `FORMER_VIBES maps ${was} -> ${became}, which is not in VIBES`);
  }
});

test("FORMER_VIBES: no superseded value is also a live key", () => {
  // A string cannot be both retired and current — validate.py checks the
  // vocabulary first, so such an entry would be unreachable advice.
  const keys = new Set(VIBES.map((v) => v.key));
  for (const was of Object.keys(FORMER_VIBES)) {
    assert.ok(!keys.has(was), `${was} is in both VIBES and FORMER_VIBES`);
  }
});
