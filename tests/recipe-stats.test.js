// The recipe page's stats panel (ADR 0125). The one promise that matters: a
// number that is our estimate is never handed back unmarked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatMinutes, recipeStats } from "../site/js/recipe-stats.js";

test("formatMinutes: minutes under the hour, hours and minutes past it", () => {
  assert.equal(formatMinutes(0), "0 min");
  assert.equal(formatMinutes(22), "22 min");
  assert.equal(formatMinutes(60), "1 hr");
  assert.equal(formatMinutes(570), "9 hr 30 min");
  assert.equal(formatMinutes(-1), null);
  assert.equal(formatMinutes(1.5), null);
  assert.equal(formatMinutes(undefined), null);
});

test("recipeStats: order, labels, and only what the recipe carries", () => {
  const cells = recipeStats({ prepMinutes: 60, cookMinutes: 22, serves: 8, difficulty: "very-easy" });
  assert.deepEqual(cells.map((c) => `${c.label}=${c.value}`), [
    "Prep=1 hr", "Cook=22 min", "Serves=8", "Difficulty=Very easy",
  ]);
  assert.ok(cells.every((c) => !c.estimated));
  assert.deepEqual(recipeStats({ prepMinutes: 15 }).map((c) => c.label), ["Prep"]);
  assert.deepEqual(recipeStats({}), []);
  // An unknown difficulty is dropped, never printed raw.
  assert.deepEqual(recipeStats({ difficulty: "fiendish" }), []);
});

test("recipeStats: the estimate mark follows the field, and a scaled serves is used", () => {
  const cells = recipeStats(
    { prepMinutes: 15, cookMinutes: 5, serves: 4, difficulty: "easy", estimated: ["serves", "difficulty"] },
    8
  );
  assert.deepEqual(cells.map((c) => [c.key, c.value, c.estimated]), [
    ["prepMinutes", "15 min", false],
    ["cookMinutes", "5 min", false],
    ["serves", "8", true],
    ["difficulty", "Easy", true],
  ]);
});

test("cook-at-home: every estimated field the data marks reaches the panel marked", () => {
  const data = JSON.parse(
    readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8")
  );
  const items = data.menu.flatMap((s) => s.items);
  for (const item of items) {
    const shown = new Set(recipeStats(item).filter((c) => c.estimated).map((c) => c.key));
    assert.deepEqual(new Set(item.estimated || []), shown, `${item.name}: estimated fields vs est. marks`);
  }
});
