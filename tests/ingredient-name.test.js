// A tip names the ingredient that carries an allergen, never its amount (owner,
// 2026-09-29). The cases live in a fixture that tools/test_tag_notes.py reads
// too, so the JS rule and its Python twin in tag_allergens.py cannot drift.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ingredientName } from "../site/js/quantity.js";
import { composeRecipe } from "../site/js/ingredients.js";

const { cases } = JSON.parse(readFileSync(new URL("./fixtures/ingredient-names.json", import.meta.url)));

test("every shared case strips the amount and nothing else", () => {
  for (const [line, want] of cases) assert.equal(ingredientName(line), want, line);
});

test("a part's tip names the part without its amount", () => {
  const item = {
    name: "Cake",
    tags: [],
    ingredients: [{ text: "250g Whittaker's 72% Dark Ghana chocolate, roughly chopped", tags: ["contains-dairy"] }],
  };
  assert.equal(
    composeRecipe(item).tagNotes["contains-dairy"],
    "From the ingredients: Whittaker's 72% Dark Ghana chocolate, roughly chopped."
  );
});
