import test from "node:test";
import assert from "node:assert/strict";

import { ingredientBlocks, ingredientKeys, ingredientCount } from "../site/js/ingredients.js";
import { lineId } from "../site/js/checklist.js";

test("a flat list is one unnamed block, unchanged", () => {
  const blocks = ingredientBlocks(["250g butter", "1 cup sugar"]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].component, null);
  assert.deepEqual(
    blocks[0].lines.map((l) => l.text),
    ["250g butter", "1 cup sugar"]
  );
});

test("an ungrouped line keys on itself — a flat recipe is untouched", () => {
  assert.deepEqual(ingredientKeys(["250g butter"]), ["250g butter"]);
});

test("loose lines lead, then each group is its own block", () => {
  const blocks = ingredientBlocks([
    "250g butter, softened",
    "1 cup sugar",
    { component: "Ginger icing", items: ["225g butter", "9 teaspoons ginger"] },
  ]);
  assert.deepEqual(
    blocks.map((b) => b.component),
    [null, "Ginger icing"]
  );
  assert.deepEqual(blocks[1].lines.map((l) => l.text), ["225g butter", "9 teaspoons ginger"]);
});

test("consecutive loose lines collapse into ONE block, not one each", () => {
  const blocks = ingredientBlocks(["a flour", "b sugar", "c butter"]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].lines.length, 3);
});

test("a grouped line's key is the component and the text, joined as the corpus wrote it", () => {
  // This is the migration contract: the four hand-prefixed recipes held exactly
  // this string, so moving them to the field must reproduce it byte for byte or
  // every tick on them silently detaches (ADR 0067).
  assert.deepEqual(
    ingredientKeys([{ component: "Sauce", items: ["150g brown sugar", "60g butter"] }]),
    ["Sauce: 150g brown sugar", "Sauce: 60g butter"]
  );
});

test("REGRESSION: the component keeps two identical lines apart", () => {
  // Sticky Date Pudding really does list "60g butter" in the pudding and again
  // in the sauce. Key on the text alone and they are one tick.
  const keys = ingredientKeys(["60g butter", { component: "Sauce", items: ["60g butter"] }]);
  assert.notEqual(lineId("i", keys[0]), lineId("i", keys[1]), "the two butters must not share a tick");
});

test("every recipe's every tick key survives the move to groups", () => {
  // The four real recipes, before and after. Written out rather than derived so
  // a future edit to either shape has to change this file deliberately.
  const before = [
    "250g butter, softened",
    "Ginger icing: 225g butter",
    "Ginger icing: 2¼ cups icing sugar",
  ];
  const after = [
    "250g butter, softened",
    { component: "Ginger icing", items: ["225g butter", "2¼ cups icing sugar"] },
  ];
  assert.deepEqual(
    ingredientKeys(after).map((k) => lineId("i", k)),
    before.map((k) => lineId("i", k))
  );
});

test("junk is dropped, not rendered — a malformed group never reaches a screen", () => {
  assert.deepEqual(ingredientBlocks(undefined), []);
  assert.deepEqual(ingredientBlocks("not a list"), []);
  assert.deepEqual(ingredientBlocks([""]), []);
  assert.deepEqual(ingredientBlocks([null, 7, { component: "", items: ["x"] }]), []);
  assert.deepEqual(ingredientBlocks([{ component: "Sauce", items: [] }]), []);
});

test("count flattens groups", () => {
  assert.equal(ingredientCount(["a", { component: "S", items: ["b", "c"] }]), 3);
  assert.equal(ingredientCount([]), 0);
});

// ── Ingredient lines as OBJECTS, and parts (22e step 4, ADR 0138) ──
import { ingredientParts, composeRecipe, noteText } from "../site/js/ingredients.js";

const CHOC = {
  text: "250g dark chocolate", tags: ["v", "contains-soy"],
  trace: ["contains-peanuts"], traceSource: "Example label",
  note: "Any dark chocolate works.", noteSource: "owner",
};

test("an object line shows, keys and scales by its TEXT — a tick made on the string survives", () => {
  const [b] = ingredientBlocks(["100g butter", CHOC]);
  assert.deepEqual(b.lines.map((l) => [l.key, l.text]), [["100g butter", "100g butter"], [CHOC.text, CHOC.text]]);
  const [g] = ingredientBlocks([{ component: "Sauce", items: [{ text: "60g butter", note: "x", noteSource: "owner" }] }]);
  assert.equal(g.lines[0].key, "Sauce: 60g butter");
  assert.deepEqual(ingredientKeys(["a", { text: "b" }]), ["a", "b"]);
});

test("a line is a PART only when it states its own tags", () => {
  const parts = ingredientParts(["flour", { text: "a note only", note: "n", noteSource: "owner" }, CHOC]);
  assert.deepEqual(parts.map((p) => p.name), [CHOC.text]);
});

test("a recipe with no parts is returned as the SAME object — nothing moves for the other recipes", () => {
  const item = { name: "x", tags: ["v"], ingredients: ["flour", { text: "sugar" }] };
  assert.equal(composeRecipe(item), item);
});

test("allergens union in from a part, and its tip names the part", () => {
  const c = composeRecipe({ name: "x", tags: ["v", "contains-dairy"], ingredients: ["butter", CHOC] });
  assert.deepEqual(c.tags, ["v", "contains-dairy", "contains-soy"]);
  assert.deepEqual(c.ownTags, ["v", "contains-dairy"]);
  // Named without its amount (owner, 2026-09-29): CHOC.text is "250g dark chocolate".
  assert.equal(c.tagNotes["contains-soy"], "From the ingredients: dark chocolate.");
  assert.deepEqual(c.partTrace, [{ tag: "contains-peanuts", source: "Example label" }]);
});

test("a diet claim survives only if EVERY part states it — an untagged part is unknown, never safe", () => {
  const silent = composeRecipe({ name: "x", tags: ["vg"], ingredients: [{ text: "chocolate", tags: [] }] });
  assert.deepEqual(silent.tags, []);
  const clash = composeRecipe({ name: "x", tags: ["vg"], ingredients: [{ text: "milk chocolate", tags: ["vg", "contains-dairy"] }] });
  assert.equal(clash.tags.includes("vg"), false);
  const kept = composeRecipe({ name: "x", tags: ["v"], ingredients: [{ text: "dark chocolate", tags: ["vg"] }] });
  assert.deepEqual(kept.tags, ["v"]);
});

test("the dish's own tag notes are kept, and a tag the dish already carries is not re-attributed", () => {
  const c = composeRecipe({
    name: "x", tags: ["contains-soy"], tagNotes: { "contains-soy": "From the ingredients: soy sauce." },
    ingredients: [CHOC],
  });
  assert.equal(c.tagNotes["contains-soy"], "From the ingredients: soy sauce.");
});

test("an inferred note SAYS it is ours; a publisher's is credited; the owner's reads plain", () => {
  assert.equal(noteText({ note: "Use dark.", noteSource: "inferred" }), "Our suggestion, not the recipe's: Use dark.");
  assert.equal(noteText({ note: "Use dark.", noteSource: "publisher" }), "From the recipe: Use dark.");
  assert.equal(noteText({ note: "Use dark.", noteSource: "owner" }), "Use dark.");
  assert.equal(noteText({ text: "no note" }), null);
});
