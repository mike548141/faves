// The recipe page's stats panel (ADR 0125). The one promise that matters: a
// number that is our estimate is never handed back unmarked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatMinutes, recipeStats, totalTime } from "../site/js/recipe-stats.js";

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

test("recipeStats: Makes is its own wide, labelled cell, last, and says when it was not scaled", () => {
  const item = { prepMinutes: 10, serves: 12, yield: "12 waffles", difficulty: "easy" };
  const at1 = recipeStats(item);
  assert.deepEqual(at1.map((c) => c.label), ["Prep", "Serves", "Difficulty", "Makes"]);
  const made = at1.at(-1);
  assert.deepEqual([made.value, made.wide, made.note, made.estimated], ["12 waffles", true, null, false]);
  // Serves and Makes are two facts: 12 waffles do not serve 12 by being 12.
  assert.equal(at1.find((c) => c.key === "serves").value, "12");
  // At 2x the yield is prose the scaler cannot restate, so it says so.
  assert.equal(recipeStats(item, "24", { yieldScaled: true }).at(-1).note, "as written");
  // A recipe with no yield gets no Makes cell, and a blank yield is no yield.
  assert.ok(!recipeStats({ serves: 4 }).some((c) => c.key === "yield"));
  assert.ok(!recipeStats({ serves: 4, yield: "  " }).some((c) => c.key === "yield"));
});

test("cook-at-home: a shipped yield is real text and nothing ships with a made-up one", () => {
  const data = JSON.parse(
    readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8")
  );
  const withYield = data.menu.flatMap((s) => s.items).filter((i) => i.yield != null);
  assert.deepEqual(
    withYield.map((i) => i.dishId).sort(),
    ["li-ge-waffles", "perfectly-pretty-hotcakes", "queen-cakes", "turkish-flatbread"]
  );
  for (const i of withYield) assert.ok(typeof i.yield === "string" && i.yield.trim(), i.dishId);
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

// Roadmap 36a (owner ruling 2026-09-28): the list row's time is prep + cook.
test("totalTime: prep + cook, said as a reader says it", () => {
  assert.deepEqual(totalTime({ prepMinutes: 5, cookMinutes: 22 }), { value: "27 min", estimated: false });
  assert.deepEqual(totalTime({ prepMinutes: 570, cookMinutes: 20 }), { value: "9 hr 50 min", estimated: false });
});

test("totalTime: either half being ours makes the total ours", () => {
  assert.equal(totalTime({ prepMinutes: 5, cookMinutes: 22, estimated: ["prepMinutes"] }).estimated, true);
  assert.equal(totalTime({ prepMinutes: 5, cookMinutes: 22, estimated: ["cookMinutes"] }).estimated, true);
  assert.equal(totalTime({ prepMinutes: 5, cookMinutes: 22, estimated: ["serves"] }).estimated, false);
});

test("totalTime: half a total is refused, not shown", () => {
  assert.equal(totalTime({ prepMinutes: 15 }), null);
  assert.equal(totalTime({ cookMinutes: 15 }), null);
  assert.equal(totalTime({ time: "~22 min" }), null);
  assert.equal(totalTime({ prepMinutes: -1, cookMinutes: 5 }), null);
});

test("cook-at-home: the five bake-only times now read as the whole job", () => {
  const data = JSON.parse(
    readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8")
  );
  const items = data.menu.flatMap((s) => s.items);
  const brownie = items.find((i) => i.name === "B's Dope-As Brownie");
  // The bug: the list said "~22 min", the oven time alone.
  assert.equal(brownie.time, "~22 min");
  assert.deepEqual(totalTime(brownie), { value: "27 min", estimated: true });
});
