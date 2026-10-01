// Your own recipes folded into the Cook at Home menu (site/js/cookbook-menu.js,
// roadmap 510/300). Pure — no DOM, no store. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCookbook } from "../site/js/cookbook-menu.js";
import { findDish } from "../site/js/dish-id.js";

const PUBLISHED = {
  id: "cook-at-home",
  name: "Cook at Home",
  kind: "recipes",
  menu: [
    { section: "Desserts", sectionId: "desserts", items: [{ name: "Pavlova", dishId: "pavlova", tags: ["gf"] }] },
    { section: "Dinners", sectionId: "dinners", items: [{ name: "Roast Lamb", dishId: "roast-lamb" }] },
  ],
};
const R = (over = {}) => ({ dishId: "u:ginger-crunch", name: "Ginger Crunch", ...over });
const book = (...rs) => Object.fromEntries(rs.map((r) => [r.dishId, r]));

test("an empty cookbook leaves the record untouched (same object)", () => {
  assert.equal(mergeCookbook(PUBLISHED, {}), PUBLISHED);
  assert.equal(mergeCookbook(PUBLISHED, null), PUBLISHED);
});

test("a recipe whose section names a published one sits inside it, after the published", () => {
  const out = mergeCookbook(PUBLISHED, book(R({ section: "desserts " })));
  assert.deepEqual(out.menu.map((s) => s.section), ["Desserts", "Dinners"]);
  assert.deepEqual(out.menu[0].items.map((i) => i.name), ["Pavlova", "Ginger Crunch"]);
  // The section keeps the published id, so its anchor does not move.
  assert.equal(out.menu[0].sectionId, "desserts");
});

test("any other recipe gets a section of its own, after the published ones", () => {
  const out = mergeCookbook(
    PUBLISHED,
    book(R({ dishId: "u:a", name: "Zucchini slice", section: "Lunchbox" }), R({ dishId: "u:b", name: "Famous curry" }))
  );
  assert.deepEqual(out.menu.map((s) => s.section), ["Desserts", "Dinners", "Lunchbox", "My recipes"]);
  const mine = out.menu.at(-1);
  assert.equal(mine.sectionId, "mine-my-recipes");
  assert.equal(out.menu[2].sectionId, "mine-lunchbox");
});

test("two recipes naming the same new section share it, name-sorted", () => {
  const out = mergeCookbook(
    PUBLISHED,
    book(R({ dishId: "u:b", name: "Beta", section: "Slow cooker" }), R({ dishId: "u:a", name: "Alpha", section: "slow cooker" }))
  );
  const added = out.menu.slice(2);
  assert.equal(added.length, 1);
  assert.deepEqual(added[0].items.map((i) => i.name), ["Alpha", "Beta"]);
});

test("the published record is never mutated", () => {
  const before = JSON.stringify(PUBLISHED);
  mergeCookbook(PUBLISHED, book(R({ section: "Desserts" }), R({ dishId: "u:b", name: "B", section: "New" })));
  assert.equal(JSON.stringify(PUBLISHED), before);
});

test("a hidden add-ons-only section is never a home for a recipe", () => {
  const rec = { ...PUBLISHED, menu: [{ section: "Extras", addOnsOnly: true, items: [] }, ...PUBLISHED.menu] };
  const out = mergeCookbook(rec, book(R({ section: "Extras" })));
  assert.equal(out.menu[0].items.length, 0);
  assert.equal(out.menu.at(-1).section, "Extras");
});

test("every personal row resolves by its own id, and a published id is not shadowed", () => {
  const out = mergeCookbook(PUBLISHED, book(R({ section: "Desserts" })));
  assert.equal(findDish(out, "u:ginger-crunch").item.name, "Ginger Crunch");
  assert.equal(findDish(out, "pavlova").item.name, "Pavlova");
});

test("an untagged recipe stays untagged: not stated is never free-from", () => {
  const out = mergeCookbook(PUBLISHED, book(R({ section: "Desserts" })));
  const item = findDish(out, "u:ginger-crunch").item;
  assert.ok(!item.tags || item.tags.length === 0);
});

test("the ingredients' own allergens are composed in, as the recipe page does", () => {
  const out = mergeCookbook(
    PUBLISHED,
    book(R({ section: "Desserts", tags: ["v"], ingredients: ["butter", { text: "250g dark chocolate", tags: ["v", "contains-soy"] }] }))
  );
  assert.deepEqual(findDish(out, "u:ginger-crunch").item.tags, ["v", "contains-soy"]);
});
