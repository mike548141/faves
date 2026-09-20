// The heat scale's one vocabulary (site/js/heat.js, roadmap 200/080).
//
// Small, and worth having anyway: this module is now the ONLY place the words
// "🌶🌶 Spicy" exist, and three screens render whatever it returns. A silent
// change here is a silent change on the menu row, the recipe page and the add-on
// picker at once — which is the price of having centralised it, and the reason
// the string itself is pinned literally below rather than derived.
//
// 🚩 What this cannot show you: that a sauce tagged `spicy-2` is actually hot.
// That is a claim about food made by whoever transcribed the menu, and no test
// in this repo can check it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isSpicy, heatLevel, heatLabel } from "../site/js/heat.js";

test("the scale is exactly the three tags validate.py knows", () => {
  for (const t of ["spicy-1", "spicy-2", "spicy-3"]) {
    assert.ok(isSpicy(t), `${t} is not recognised as heat`);
  }
  // A fourth level would need a vocabulary change in `TAGS` first, and until
  // then it must NOT paint as a chip — menu.js's `isChipTag` is the gate in
  // front of `tagChip`'s raw fallback, and it asks this function.
  for (const t of ["spicy-0", "spicy-4", "spicy-11", "spicy", "spicy-", "v", "contains-nuts", ""]) {
    assert.ok(!isSpicy(t), `${JSON.stringify(t)} was read as heat`);
  }
  // Anchored at both ends: an unanchored regex would accept a tag that merely
  // CONTAINS one, and the tags come from JSON nobody has type-checked.
  assert.ok(!isSpicy("not-spicy-2"), "the match is not anchored at the start");
  assert.ok(!isSpicy("spicy-2-ish"), "the match is not anchored at the end");
});

test("a level is read off the match, never off the last character", () => {
  assert.equal(heatLevel("spicy-1"), 1);
  assert.equal(heatLevel("spicy-2"), 2);
  assert.equal(heatLevel("spicy-3"), 3);
  // `tag.slice(-1)` was how both of the old copies did it, and it answers 1 for
  // this. The regex refuses it, so the level must be 0 and not 1.
  assert.equal(heatLevel("spicy-11"), 0);
  assert.equal(heatLevel("contains-nuts"), 0);
  assert.equal(heatLevel(undefined), 0, "a missing tag must not throw");
});

test("the words are the words — one chilli per level, and the word Spicy", () => {
  // Pinned literally. Three screens render this string and a diff that changed
  // it would otherwise touch one file and move three surfaces in silence.
  assert.equal(heatLabel("spicy-1"), "🌶 Spicy");
  assert.equal(heatLabel("spicy-2"), "🌶🌶 Spicy");
  assert.equal(heatLabel("spicy-3"), "🌶🌶🌶 Spicy");
});

test("the level survives without the emoji — the accessibility half", () => {
  // 🛑 The load-bearing assertion. A chip whose only difference between mild and
  // hot is a repeated picture fails for a reader whose renderer drops emoji, and
  // WCAG 2.2 AA does not accept a glyph as the sole carrier of meaning. The word
  // is what must always be there; the count is what must differ.
  for (const t of ["spicy-1", "spicy-2", "spicy-3"]) {
    assert.match(heatLabel(t), /\bSpicy\b/, `${t} does not say the word`);
  }
  const counts = ["spicy-1", "spicy-2", "spicy-3"].map((t) => heatLabel(t).split("🌶").length - 1);
  assert.deepEqual(counts, [1, 2, 3], "the levels are not distinguishable by count");
});

test("a tag that is not heat renders NOTHING, rather than an empty chip", () => {
  // The fail-safe direction. A caller that skipped `isSpicy` paints nothing
  // visible instead of a chip reading "  Spicy" on a dish that never claimed to
  // be hot — a wrong chip is a claim about food, an absent one is a bug.
  assert.equal(heatLabel("contains-nuts"), "");
  assert.equal(heatLabel("spicy-4"), "");
  assert.equal(heatLabel(null), "");
});
