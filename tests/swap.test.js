// A swap names what it replaces — and removes nothing (ADR 0168, roadmap 200/160 part 1).
//
// Two halves, and the second is the one that matters:
//
//   1. WORDS. A group may say `replaces: "milk bun"`; the picker then says
//      "instead of the milk bun" and the order line reads "No gluten added bun
//      (instead of the milk bun)". Leaving the field out changes nothing.
//   2. SAFETY. Naming what a swap replaces must NEVER remove an allergen or weaken
//      a warning. Allergens still UNION in (ADR 0048); whether a swap may drop the
//      replaced component's allergen is the owner's decision and has not been made.
//      "Trusting a removal" is the way this feature could under-warn, so these
//      tests are written as the claim a person could check — "the milk-bun
//      cheeseburger still says gluten and dairy when you swap the bun" — and a
//      code change that drops a tag makes them fail (break-probed, see the item).
//
// Run: `node --test tests/swap.test.js`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  composeTags,
  groupsFor,
  insteadText,
  lineName,
  lineOptions,
  optionId,
  optionPrice,
  replacesOf,
  selectionKey,
  selectionSummary,
  swapField,
  movedNote,
} from "../site/js/addons.js";
import { configurationWarning } from "../site/js/addon-warning.js";
import { encodeShare, decodeShare } from "../site/js/share-codec.js";
import { planRecall } from "../site/js/saved-recall.js";

const BUN = {
  id: "no-gluten-added-bun",
  name: "No gluten added bun",
  select: "one",
  replaces: "milk bun",
  options: [{ name: "No gluten added bun", id: "no-gluten-added-bun", price: 2.5, tags: [] }],
};
const entryOf = (g, o = g.options[0]) => ({
  group: g.id,
  id: optionId(o),
  name: o.name,
  price: optionPrice(g, o),
  tags: o.tags || [],
  ...swapField(g),
});

// --- the words ----------------------------------------------------------
test("replacesOf / insteadText: the menu's own noun phrase, with the article supplied", () => {
  assert.equal(replacesOf(BUN), "milk bun");
  assert.equal(insteadText(replacesOf(BUN)), "instead of the milk bun");
  assert.equal(insteadText(" hot chips "), "instead of the hot chips");
});

test("a group that states nothing replaces nothing: no words, no field", () => {
  const plain = { ...BUN };
  delete plain.replaces;
  assert.equal(replacesOf(plain), "");
  assert.equal(insteadText(replacesOf(plain)), "");
  assert.deepEqual(swapField(plain), {});
  assert.equal(replacesOf(null), "");
  assert.equal(replacesOf({ replaces: 7 }), "");
  assert.equal(replacesOf({ replaces: "   " }), "");
});

test("a variant (selects) group is never a swap, even if the data said so", () => {
  assert.equal(replacesOf({ kind: "selects", replaces: "regular size", options: [] }), "");
});

test("lineOptions: the order line NAMES what the swap replaces", () => {
  const line = lineOptions([entryOf(BUN)]);
  assert.deepEqual(line, [
    { group: "no-gluten-added-bun", id: "no-gluten-added-bun", name: "No gluten added bun (instead of the milk bun)", price: 2.5 },
  ]);
  assert.equal(selectionSummary(line), "No gluten added bun (instead of the milk bun)");
  assert.equal(
    movedNote("Cheeseburger", line),
    "Updated in your order: Cheeseburger, No gluten added bun (instead of the milk bun).",
  );
});

test("lineOptions: a group with no `replaces` is byte-identical to before this existed", () => {
  const plain = { ...BUN };
  delete plain.replaces;
  assert.deepEqual(lineOptions([entryOf(plain)]), [
    { group: "no-gluten-added-bun", id: "no-gluten-added-bun", name: "No gluten added bun", price: 2.5 },
  ]);
  assert.equal(lineName({ name: "Satay" }), "Satay");
});

test("line identity is the option id, so the wording can never split or merge a line", () => {
  const withWords = lineOptions([entryOf(BUN)]);
  const old = [{ group: "no-gluten-added-bun", id: "no-gluten-added-bun", name: "No gluten added bun", price: 2.5 }];
  assert.equal(selectionKey(withWords), selectionKey(old));
});

test("the shared tally carries the wording: it rides in the name the codec already carries", () => {
  const options = lineOptions([entryOf(BUN)]);
  const token = encodeShare({
    groups: [{ venueId: "hb", venueName: "Hotel Bristol", phone: null, items: [{ name: "Cheeseburger", price: 28, qty: 1, options }] }],
  });
  const got = decodeShare(token).items[0];
  assert.equal(selectionSummary(got.options), "No gluten added bun (instead of the milk bun)");
  // …and it is still the SAME line as the sender's, because the key reads the id.
  assert.equal(selectionKey(got.options), selectionKey(options));
});

test("a recalled saved order is re-worded from the live menu, and a line saved before this still recalls", () => {
  const record = {
    id: "hb", name: "Hotel Bristol", currency: "NZD",
    addOnGroups: [BUN],
    menu: [{ section: "Burgers", items: [{ name: "Cheeseburger", dishId: "cheeseburger", price: 28, tags: ["contains-gluten"], addOns: ["no-gluten-added-bun"] }] }],
  };
  // A line saved the way it was stored before this existed: the plain name.
  const saved = { lines: [{ dishId: "cheeseburger", name: "Cheeseburger", qty: 1, price: 30.5,
    options: [{ group: "no-gluten-added-bun", id: "no-gluten-added-bun", name: "No gluten added bun", price: 2.5 }] }] };
  const { lines, skipped } = planRecall(saved, record);
  assert.deepEqual(skipped, []);
  assert.equal(selectionSummary(lines[0].options), "No gluten added bun (instead of the milk bun)");
  assert.equal(selectionKey(lines[0].options), selectionKey(saved.lines[0].options));
});

// --- the safety half: a swap removes nothing ------------------------------
const CHEESEBURGER = ["gf-option", "contains-gluten", "contains-dairy", "df-option"];

test("SAFETY: swapping the bun does not take gluten or dairy off the cheeseburger", () => {
  const out = composeTags(CHEESEBURGER, [entryOf(BUN)]);
  for (const t of ["contains-gluten", "contains-dairy"]) {
    assert.ok(out.tags.includes(t), `${t} must survive a swap`);
  }
});

test("SAFETY: `replaces` is invisible to composition — the same tags, added and dropped, with or without it", () => {
  const plain = { ...BUN };
  delete plain.replaces;
  const dish = ["v", "gf-option", "contains-gluten", "contains-dairy", "contains-egg"];
  assert.deepEqual(composeTags(dish, [entryOf(BUN)]), composeTags(dish, [entryOf(plain)]));
});

test("SAFETY: no warning is weakened — the same sentences and the same flag, with or without it", () => {
  const plain = { ...BUN };
  delete plain.replaces;
  const dish = ["gf-option", "contains-gluten", "contains-dairy"];
  for (const avoid of [new Set(), new Set(["contains-gluten"]), new Set(["contains-dairy", "contains-egg"])]) {
    assert.deepEqual(
      configurationWarning(dish, [entryOf(BUN)], avoid),
      configurationWarning(dish, [entryOf(plain)], avoid),
    );
  }
  // …and the reader who avoids gluten is still told, with the swap chosen.
  assert.equal(configurationWarning(dish, [entryOf(BUN)], new Set(["contains-gluten"])).flagged, true);
});

test("SAFETY: a swap whose option carries an allergen still adds it (union is unchanged)", () => {
  const oat = {
    id: "milks", name: "Milks", select: "one", replaces: "milk",
    options: [{ name: "Almond", id: "almond", price: 1, tags: ["contains-nuts"] }],
  };
  const out = composeTags(["contains-dairy"], [entryOf(oat)]);
  assert.deepEqual([...out.tags].sort(), ["contains-dairy", "contains-nuts"]);
  assert.deepEqual(out.added, [{ tag: "contains-nuts", from: "Almond" }]);
});

// --- the whole corpus ------------------------------------------------------
const DATA = fileURLToPath(new URL("../site/data/restaurants/", import.meta.url));
const records = readdirSync(DATA)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(DATA + f, "utf8")));

test("SAFETY, corpus-wide: every shipped swap leaves every contains-* tag of every dish that offers it", () => {
  let swaps = 0;
  let dishes = 0;
  for (const rec of records) {
    for (const section of rec.menu || []) {
      for (const item of section.items || []) {
        for (const g of groupsFor(rec, section, item)) {
          if (!replacesOf(g)) continue;
          swaps++;
          for (const o of g.options) {
            dishes++;
            const out = composeTags(item.tags || [], [entryOf(g, o)]);
            for (const t of (item.tags || []).filter((x) => x.startsWith("contains-"))) {
              assert.ok(out.tags.includes(t), `${rec.id}: ${item.name} lost ${t} to ${o.name}`);
            }
          }
        }
      }
    }
  }
  // Not vacuous: the corpus does carry swaps, and this walked them.
  assert.ok(swaps >= 4 && dishes >= 4, `expected the corpus to carry swaps, saw ${swaps}/${dishes}`);
});
