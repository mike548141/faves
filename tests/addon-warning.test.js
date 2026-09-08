// The SENTENCES the add-on picker says when configuring a dish changes what it
// is — `warningLines` in site/js/addons-ui.js (roadmap 200/050 and 200/070).
//
// Why these are unit tests and tools/addon_check.mjs still exists. The check
// drives a real browser and is the evidence that the sentence reaches a reader;
// what it cannot afford is every shape. These cover the shapes — two claims
// folded with "or", two substances that must stay apart, the unflagged branch
// nobody has open in Settings — and they run in CI, which no browser check but
// boot_check does.
//
// 🛑 THE LOAD-BEARING TEST IN THIS FILE IS THE LAST ONE. The picker treats
// `has-fish` and `contains-fish` as one substance FOR THE PURPOSE OF THE
// SENTENCE. That must never become a relation between the two tags: ADR 0095 §1
// keeps them independent, two rules on the same evidence, because making the
// allergen a consequence of the dietary marker is what Theme 5 item `010`
// forbids. "The data rule is untouched" is asserted, not asserted-in-a-comment.

import { test } from "node:test";
import assert from "node:assert/strict";
import { composeTags } from "../site/js/addons.js";
import { warningLines } from "../site/js/addons-ui.js";

/** The warning as the reader sees it: one string, sentences joined by a space. */
function warning(dishTags, selection, avoid = []) {
  const { added, dropped } = composeTags(dishTags, selection);
  const { lines, flagged } = warningLines(added, dropped, new Set(avoid));
  return { text: lines.join(" "), lines, flagged };
}

const SALMON = { group: "sides", name: "Salmon", price: 9, tags: ["has-fish", "contains-fish"] };
const HALLOUMI = { group: "sides", name: "Halloumi", price: 5, tags: ["contains-dairy"] };
const BACON = { group: "sides", name: "Bacon", price: 8, tags: ["has-meat"] };

// --- 200/070: one substance, said once --------------------------------

test("one substance carried by two tags is said ONCE, with both consequences", () => {
  // Measured verbatim in headless Chrome at 390 px on 2026-09-08, BEFORE the
  // fix, Sprig & Fern Tawa's Potato, Rosemary + Basil Pesto with fish flagged:
  //   "Salmon contains fish — you asked to avoid it. Salmon is fish, so this
  //    is no longer vegetarian. Salmon isn't tagged gluten free, …"
  // The allergen half came from `contains-fish`, the contradiction half from
  // `has-fish`, so 200/050's tag-keyed merge saw two different facts.
  const { text, lines, flagged } = warning(["v"], [SALMON], ["contains-fish"]);
  assert.equal(text, "Salmon contains fish — you asked to avoid it, and this is no longer vegetarian.");
  assert.equal(lines.length, 1);
  assert.ok(flagged);
  // Counted, not matched: a merge that appends the consequence and forgets to
  // delete the old sentence passes an `assert.ok(text.includes(...))`.
  assert.equal(text.split("fish").length - 1, 1, "the substance is named once");
  assert.equal(text.split("Salmon").length - 1, 1, "the option is named once");
});

test("…and on the UNFLAGGED branch too — a reader who never opened Settings", () => {
  // The same repetition with the reader's own avoid list empty. 200/050 fixed
  // both branches for the same reason: fixing only the flagged one leaves the
  // defect standing for every reader who has not declared an allergy.
  const { text, flagged } = warning(["v"], [SALMON]);
  assert.equal(text, "Salmon contains fish, so this is no longer vegetarian.");
  assert.equal(flagged, false);
  assert.equal(text.split("fish").length - 1, 1);
});

test("…and one fish killing TWO claims folds with `or`, not into two sentences", () => {
  // Live in the corpus: Crêpes a Go Go's Mediterranean Sun and Uncle Green are
  // `v` + `vg-option`, so the same fish kills two claims. The fold is
  // 200/050's; what 200/070 adds is that it is reached at all here.
  const { text } = warning(["v", "vg-option"], [SALMON], ["contains-fish"]);
  assert.equal(
    text,
    "Salmon contains fish — you asked to avoid it, and this is no longer vegetarian or vegan.",
  );
  assert.equal(text.split("fish").length - 1, 1);
});

test("the merge does not depend on which fish tag composeTags happened to report", () => {
  // `composeTags` picks the contradicting tag with `find` over the OPTION's own
  // tag array, so the order the venue wrote them in decides whether the drop
  // says `has-fish` or `contains-fish`. Both must merge. Before the substance
  // map only the second order did, which is a latent data-order dependency in a
  // safety sentence — the sort of thing that ships fine and breaks on the next
  // venue's transcription.
  const reversed = { ...SALMON, tags: ["contains-fish", "has-fish"] };
  assert.equal(
    warning(["v"], [reversed], ["contains-fish"]).text,
    warning(["v"], [SALMON], ["contains-fish"]).text,
  );
});

// --- what the map must NOT do -----------------------------------------

test("TWO substances on one option stay TWO facts, each with its OWN consequence", () => {
  // Little Sprig Seatoun's "Cheese & beef gravy" is `contains-dairy` +
  // `has-meat`: the only other option in the corpus (swept 2026-09-08, 57
  // venues) carrying a `has-` and a `contains-` tag at once. Dairy and meat are
  // two substances, so the reader is owed both sentences — and on a dish
  // claiming BOTH, the dairy kills vegan and the meat kills vegetarian, which
  // is the shape a map keyed too loosely would smear into one.
  const gravy = { group: "sides", name: "Cheese & beef gravy", price: 4, tags: ["contains-dairy", "has-meat"] };
  const { lines } = warning(["v", "vg"], [gravy], ["contains-dairy"]);
  assert.deepEqual(lines, [
    "Cheese & beef gravy contains dairy — you asked to avoid it, and this is no longer vegan.",
    "Cheese & beef gravy is meat, so this is no longer vegetarian.",
  ]);
});

test("the merge is per OPTION as well as per substance", () => {
  // The key carries the option's name, so a fish and a dairy on one plate keep
  // their own consequences: the "no longer vegan" belongs to the salmon that
  // killed it, and the halloumi's line does not inherit it.
  const { lines } = warning(["vg"], [SALMON, HALLOUMI], ["contains-fish", "contains-dairy"]);
  assert.deepEqual(lines, [
    "Salmon contains fish — you asked to avoid it, and this is no longer vegan.",
    "Halloumi contains dairy — you asked to avoid it.",
  ]);
});

test("`Bacon is meat` is untouched — the fact-shaped voice ADR 0092 built", () => {
  // Meat has no allergen tag, so nothing merges and the 14h sentence stands
  // exactly as it did. If the substance map ever grew a `has-meat` entry with
  // no `contains-meat` to pair it with, this is what would notice.
  assert.equal(warning(["v"], [BACON]).text, "Bacon is meat, so this is no longer vegetarian.");
});

test("200/050's own merge still fires — one tag, one option, one sentence", () => {
  const { text } = warning(["vg"], [HALLOUMI], ["contains-dairy"]);
  assert.equal(text, "Halloumi contains dairy — you asked to avoid it, and this is no longer vegan.");
});

test("a fact and an absence on one plate: the fact leads, the absence closes", () => {
  const spinach = { group: "sides", name: "Spinach", price: 2, tags: [] };
  const { lines } = warning(["v", "gf-option"], [SALMON, spinach], ["contains-fish"]);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("Salmon contains fish — you asked to avoid it"));
  assert.ok(lines[1].includes("aren't tagged"));
});

// --- the data rule, asserted rather than promised ----------------------

test("THE DATA RULE IS UNTOUCHED: neither fish tag implies the other", () => {
  // The whole safety of 200/070 rests on the equivalence living in the PICKER's
  // wording and nowhere else. Three independent facts, all read off the
  // composer — the layer the map does not touch:

  // 1. The two tags are still reported separately, from two independent rules.
  //    `added` is the allergen axis, `dropped[].allergen` the dietary one, and
  //    they carry DIFFERENT tags for the same fish.
  const both = composeTags(["v"], [SALMON]);
  assert.deepEqual(both.added, [{ tag: "contains-fish", from: "Salmon" }]);
  assert.equal(both.dropped[0].allergen, "has-fish");
  assert.notEqual(both.added[0].tag, both.dropped[0].allergen);

  // 2. The dietary marker alone brings in NO allergen. If the picker's map had
  //    leaked into the model, `has-fish` would manufacture `contains-fish` —
  //    an allergen invented by a regex, which is the one move the data may not
  //    make (ADR 0025).
  const dietaryOnly = composeTags(["v"], [{ group: "sides", name: "Salmon", price: 9, tags: ["has-fish"] }]);
  assert.deepEqual(dietaryOnly.added, []);
  assert.ok(!dietaryOnly.tags.includes("contains-fish"));
  assert.equal(warning(["v"], [{ group: "sides", name: "Salmon", price: 9, tags: ["has-fish"] }]).text,
    "Salmon is fish, so this is no longer vegetarian.");

  // 3. …and the allergen alone does not manufacture the dietary marker. It
  //    kills `v` on its own account (it is in CONTRADICTS.v), but `has-fish`
  //    never appears on the composed tags.
  const allergenOnly = composeTags(["v"], [{ group: "sides", name: "Fish sauce", price: 0, tags: ["contains-fish"] }]);
  assert.ok(!allergenOnly.tags.includes("has-fish"));
  assert.equal(allergenOnly.dropped[0].allergen, "contains-fish");
});
