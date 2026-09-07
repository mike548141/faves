// Unit tests for structured add-ons (site/js/addons.js, ADR 0048).
//
// The half that matters is `composeTags`. Every other function here is
// bookkeeping; that one decides whether the app tells someone a kebab is safe
// after they have put satay on it. So the cases below are written as claims
// about food a person could check, not as coverage of branches.
//
// Run: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupsFor,
  optionPrice,
  selectionPrice,
  selectionAllowed,
  composeTags,
  selectionKey,
  selectionSummary,
  CONTRADICTS,
} from "../site/js/addons.js";
import { dishFlagged, dishSatisfiesDiet } from "../site/js/dietary.js";

const SATAY = { group: "sauces", name: "Satay", price: 0, tags: ["contains-peanuts", "vg", "gf", "df"] };
const HALLOUMI = { group: "sides", name: "Halloumi", price: 7, tags: ["contains-dairy", "v", "gf"] };
const CHICKEN = { group: "sides", name: "Grilled chicken", price: 8, tags: [] };
const MUSHROOMS = { group: "sides", name: "Mushrooms", price: 8, tags: ["vg", "gf", "df"] };

// --- nothing moves on day one ---------------------------------------
test("composeTags: an empty selection returns the dish's own tags, unchanged", () => {
  const tags = ["vg", "gf", "spicy-1"];
  for (const sel of [[], null, undefined]) {
    const out = composeTags(tags, sel);
    assert.deepEqual(out.tags, ["vg", "gf", "spicy-1"]);
    assert.deepEqual(out.added, []);
    assert.deepEqual(out.dropped, []);
  }
});

test("composeTags: a dish with no tags and no selection stays untagged", () => {
  assert.deepEqual(composeTags(null, []).tags, []);
});

// --- allergens union: the case this feature exists for ---------------
test("composeTags: satay on an unflagged kebab makes it contain peanuts", () => {
  const out = composeTags(["gf"], [SATAY]);
  assert.ok(out.tags.includes("contains-peanuts"));
  assert.deepEqual(out.added, [{ tag: "contains-peanuts", from: "Satay" }]);
  // …and the viewer who avoids peanuts is now warned, through the unchanged predicate.
  assert.equal(dishFlagged(["gf"], new Set(["contains-peanuts"])), false);
  assert.equal(dishFlagged(out.tags, new Set(["contains-peanuts"])), true);
});

test("composeTags: an allergen already on the dish is not duplicated", () => {
  const out = composeTags(["contains-peanuts"], [SATAY]);
  assert.deepEqual(
    out.tags.filter((t) => t === "contains-peanuts"),
    ["contains-peanuts"],
  );
  assert.deepEqual(out.added, []); // it was already there — nothing was brought in
});

test("composeTags: heat carries over — a hot sauce makes the plate spicy", () => {
  const chilli = { group: "sauces", name: "Hot chilli", price: 0, tags: ["spicy-3", "vg", "gf", "df"] };
  assert.ok(composeTags(["vg", "gf", "df"], [chilli]).tags.includes("spicy-3"));
});

// --- dietary claims intersect ----------------------------------------
test("composeTags: halloumi on a dairy-free dish loses the dairy-free claim, as contradicted", () => {
  const out = composeTags(["df", "v"], [HALLOUMI]);
  assert.ok(!out.tags.includes("df"));
  assert.ok(out.tags.includes("contains-dairy"));
  const df = out.dropped.find((d) => d.tag === "df");
  assert.deepEqual(df, { tag: "df", from: "Halloumi", reason: "contradicted", allergen: "contains-dairy" });
  // v survives: halloumi is vegetarian and says so.
  assert.ok(out.tags.includes("v"));
  assert.equal(dishSatisfiesDiet(out.tags, new Set(["df"])), false);
  assert.equal(dishSatisfiesDiet(out.tags, new Set(["v"])), true);
});

test("composeTags: chicken on a vegan dish loses the claim even though meat is not an allergen", () => {
  // The whole reason the rule is intersection and not contradiction: nothing
  // in CONTRADICTS fires here, because chicken carries no `contains-*` at all.
  const out = composeTags(["vg", "v", "gf"], [CHICKEN]);
  assert.ok(!out.tags.includes("vg"));
  assert.ok(!out.tags.includes("v"));
  assert.ok(!out.tags.includes("gf"));
  assert.deepEqual(
    out.dropped.map((d) => [d.tag, d.reason]),
    [["vg", "not-stated"], ["v", "not-stated"], ["gf", "not-stated"]],
  );
  assert.equal(dishSatisfiesDiet(out.tags, new Set(["vg"])), false);
});

test("composeTags: an option that makes the same claim preserves it", () => {
  const out = composeTags(["vg", "gf", "df"], [MUSHROOMS]);
  assert.deepEqual(out.tags, ["vg", "gf", "df"]);
  assert.deepEqual(out.dropped, []);
  assert.equal(dishSatisfiesDiet(out.tags, new Set(["vg", "gf"])), true);
});

test("composeTags: a stated clash outranks a silence in the reported reason", () => {
  // Two options both cost the `df` claim — one by contradiction, one by
  // silence. The reader is told the harder fact.
  const out = composeTags(["df"], [CHICKEN, HALLOUMI]);
  const df = out.dropped.find((d) => d.tag === "df");
  assert.equal(df.reason, "contradicted");
  assert.equal(df.from, "Halloumi");
});

test("composeTags: `gf-option` is a claim and is subject to the same rules", () => {
  const glutenBun = { group: "swap", name: "Milk bun", price: 0, tags: ["contains-gluten"] };
  const out = composeTags(["gf-option"], [glutenBun]);
  assert.ok(!out.tags.includes("gf-option"));
  assert.equal(out.dropped[0].reason, "contradicted");
});

test("composeTags: composition never invents a claim an option has and the dish does not", () => {
  // Halloumi is `v`; a dish that never claimed vegetarian does not become one.
  const out = composeTags(["contains-gluten"], [HALLOUMI]);
  assert.ok(!out.tags.includes("v"));
  assert.ok(!out.tags.includes("gf"));
  assert.deepEqual(out.dropped, []);
});

// --- a claim is judged against ITS OWN contradiction list -------------
// `vg` also sits in `v`'s satisfies list (every vegan dish is vegetarian). Until
// 2026-08-17 composeTags resolved a claim tag to the FIRST filter list holding
// it, so a `vg` dish was checked against CONTRADICTS.v (shellfish only) and
// kept its vegan claim beside contains-dairy. The pair below is the control
// the board asked for: the `gf` line shows the machinery, the `vg` line shows
// the fault — and an option stating NO claim is not the case, because the
// intersection rule drops it correctly for the wrong reason (`not-stated`).
test("composeTags: cheese that STATES vegan and contains dairy still costs a vegan dish its claim", () => {
  const cheese = { group: "extras", name: "Cheese", price: 2, tags: ["vg", "contains-dairy"] };
  const out = composeTags(["vg"], [cheese]);
  assert.ok(!out.tags.includes("vg"), `vg survived beside dairy: ${out.tags}`);
  assert.deepEqual(out.dropped, [{ tag: "vg", from: "Cheese", reason: "contradicted", allergen: "contains-dairy" }]);
  assert.equal(dishSatisfiesDiet(out.tags, new Set(["vg"])), false);
  // The paired control: the same shape on `gf` has always worked.
  const bun = { group: "extras", name: "Bun", price: 0, tags: ["gf", "contains-gluten"] };
  assert.equal(composeTags(["gf"], [bun]).dropped[0].reason, "contradicted");
});

test("composeTags: halloumi on a vegan salad is CONTRADICTED by dairy, not merely unstated", () => {
  // Live in the corpus (Sprig & Fern Tawa, Garden Salad + Halloumi): the
  // reader must be told the dairy is why, not that we cannot say.
  const halloumi = { group: "salad-protein", name: "Halloumi", price: 5, tags: ["contains-dairy"] };
  const out = composeTags(["vg"], [halloumi]);
  assert.equal(out.dropped[0].reason, "contradicted");
  assert.equal(out.dropped[0].allergen, "contains-dairy");
});

test("composeTags: a vegetarian option on a vegan dish is not-stated; a vegan option on a vegetarian dish is fine", () => {
  const vegOnly = { group: "sauces", name: "Aioli", price: 0, tags: ["v"] };
  assert.equal(composeTags(["vg"], [vegOnly]).dropped[0].reason, "not-stated");
  assert.deepEqual(composeTags(["v"], [MUSHROOMS]).dropped, []);
});

test("CONTRADICTS: peanuts, nuts, soy and sesame contradict no dietary claim", () => {
  const all = Object.values(CONTRADICTS).flat();
  for (const t of ["contains-peanuts", "contains-nuts", "contains-soy", "contains-sesame"]) {
    assert.ok(!all.includes(t), `${t} should not contradict a dietary claim`);
  }
  // …and the ALLERGENS that do are exactly the ones tag_allergens.py knows
  // about. validate.py `check_contradiction_tables` holds the two tables in
  // step; this is the same claim said in the language of the app.
  // `contains-fish` joined them 2026-09-07 — a separate allergen from
  // `contains-shellfish`, contradicting the same two claims.
  assert.deepEqual(
    new Set(all.filter((t) => t.startsWith("contains-"))),
    new Set(["contains-gluten", "contains-dairy", "contains-egg", "contains-shellfish",
             "contains-fish"]),
  );
  // The two non-allergen facts (ADR 0092) kill `v` and `vg` and nothing else —
  // meat is not gluten, and a `gf` or `df` dish stays gf or df with bacon on it.
  assert.deepEqual(new Set(all.filter((t) => t.startsWith("has-"))), new Set(["has-meat", "has-fish"]));
  for (const key of ["gf", "df"]) {
    assert.ok(!CONTRADICTS[key].some((t) => t.startsWith("has-")), `${key} must not be killed by meat or fish`);
  }
});

// --- ADR 0092: a fact where a fact exists, one sentence for the rest ---
test("composeTags: bacon costs a vegetarian dish its claim as a FACT, not a silence", () => {
  // Live in the corpus (Sprig & Fern Tawa, brunch sides). Before 14h, Bacon
  // carried no tags at all and the reader was told "we can't say whether Bacon
  // is vegetarian" — an absence about the one option nobody needed telling.
  const bacon = { group: "brunch-sides", name: "Bacon", price: 8, tags: ["has-meat"] };
  const out = composeTags(["v", "gf"], [bacon]);
  const v = out.dropped.find((d) => d.tag === "v");
  assert.equal(v.reason, "contradicted");
  assert.equal(v.allergen, "has-meat");
  assert.ok(!out.tags.includes("v"));
  // …and gluten free is untouched by it, because meat is not gluten. That
  // claim still dies — bacon says nothing about gluten — but as a silence.
  assert.equal(out.dropped.find((d) => d.tag === "gf").reason, "not-stated");
});

test("composeTags: salmon is fish, and fish is not vegetarian either", () => {
  const salmon = { group: "brunch-sides", name: "Salmon", price: 9, tags: ["has-fish"] };
  for (const claim of ["v", "vg"]) {
    const out = composeTags([claim], [salmon]);
    assert.equal(out.dropped[0].reason, "contradicted", `${claim} should be contradicted`);
    assert.equal(out.dropped[0].allergen, "has-fish");
  }
});

test("composeTags: `has-meat` is NOT an allergen — it never joins `added`", () => {
  // It has no chip, no settings row and no place in the avoid list, so a dish
  // configured with bacon must not sprout "Bacon contains meat." as a plain
  // allergen line. Its whole job is killing `v`/`vg`.
  const bacon = { group: "sides", name: "Bacon", price: 8, tags: ["has-meat"] };
  const out = composeTags(["contains-gluten"], [bacon]);
  assert.deepEqual(out.added, []);
  assert.deepEqual(out.dropped, []);
  assert.ok(out.tags.includes("has-meat"), "it still unions onto the composed tags");
});

test("composeTags: a not-stated drop names EVERY option that was silent, not just the first", () => {
  // What the collapsed sentence is built from (ADR 0092). Naming only the
  // first would under-report the residue: "Spinach isn't tagged vegetarian"
  // when Tomatoes is equally untagged and equally on the plate.
  const spinach = { group: "brunch-sides", name: "Spinach", price: 5, tags: [] };
  const tomatoes = { group: "brunch-sides", name: "Tomatoes", price: 5, tags: [] };
  const out = composeTags(["v", "gf"], [spinach, tomatoes]);
  for (const d of out.dropped) {
    assert.equal(d.reason, "not-stated");
    assert.deepEqual(d.silent, ["Spinach", "Tomatoes"], `${d.tag} named ${d.silent}`);
  }
  assert.equal(out.dropped[0].from, "Spinach");
});

test("composeTags: a claim killed by a FACT carries no silent list", () => {
  // The fact is the news. Listing the options that merely said nothing about a
  // claim already dead by contradiction is the noise 14h removed.
  const spinach = { group: "brunch-sides", name: "Spinach", price: 5, tags: [] };
  const bacon = { group: "brunch-sides", name: "Bacon", price: 8, tags: ["has-meat"] };
  const out = composeTags(["v"], [spinach, bacon]);
  assert.equal(out.dropped.length, 1);
  assert.equal(out.dropped[0].reason, "contradicted");
  assert.equal(out.dropped[0].silent, undefined);
});

// --- group resolution -------------------------------------------------
const RECORD = {
  addOnGroups: [
    { id: "sauces", name: "Sauces", select: "many", max: 3, price: 0, options: [SATAY] },
    { id: "sides", name: "Brunch sides", select: "many", options: [HALLOUMI, CHICKEN] },
    { id: "cook", name: "Toasted or fresh", select: "one", price: 0, options: [] },
  ],
};

test("groupsFor: a dish gets its section's groups, then its own, deduplicated", () => {
  const got = groupsFor(RECORD, { addOns: ["sauces", "cook"] }, { addOns: ["sides", "sauces"] });
  assert.deepEqual(got.map((g) => g.id), ["sauces", "cook", "sides"]);
});

test("groupsFor: no references anywhere ⇒ no groups", () => {
  assert.deepEqual(groupsFor(RECORD, {}, {}), []);
  assert.deepEqual(groupsFor(null, null, null), []);
});

test("groupsFor: an id with no definition is dropped, never thrown on", () => {
  // validate.py is the gate for a dangling id; a menu screen must still render.
  assert.deepEqual(groupsFor(RECORD, {}, { addOns: ["nope", "sides"] }).map((g) => g.id), ["sides"]);
});

// --- price ------------------------------------------------------------
test("optionPrice: the group's price is a default the option overrides", () => {
  const g = { price: 0, options: [] };
  assert.equal(optionPrice(g, { name: "Satay" }), 0);
  assert.equal(optionPrice(g, { name: "Extra meat", price: 6 }), 6);
  assert.equal(optionPrice({ options: [] }, { name: "Bacon", price: 7 }), 7);
});

test("optionPrice: nothing stated anywhere reads as 0, because validate.py forbids that record", () => {
  assert.equal(optionPrice({ options: [] }, { name: "Mystery" }), 0);
});

test("selectionPrice: sums the chosen options", () => {
  assert.equal(selectionPrice([SATAY, HALLOUMI, CHICKEN]), 15);
  assert.equal(selectionPrice([]), 0);
  assert.equal(selectionPrice(null), 0);
});

// --- caps -------------------------------------------------------------
test("selectionAllowed: 'choose up to 3' is enforced from the data, not the UI", () => {
  const sauces = { select: "many", max: 3 };
  assert.equal(selectionAllowed(sauces, 3), true);
  assert.equal(selectionAllowed(sauces, 4), false);
});

test("selectionAllowed: a pick-one group takes at most one", () => {
  assert.equal(selectionAllowed({ select: "one" }, 1), true);
  assert.equal(selectionAllowed({ select: "one" }, 2), false);
});

test("selectionAllowed: pick-many with no cap is uncapped", () => {
  assert.equal(selectionAllowed({ select: "many" }, 99), true);
});

// --- line identity ----------------------------------------------------
test("selectionKey: the same choices in a different order are the same line", () => {
  assert.equal(selectionKey([SATAY, HALLOUMI]), selectionKey([HALLOUMI, SATAY]));
});

test("selectionKey: different choices are different lines, and no selection is the empty key", () => {
  assert.notEqual(selectionKey([SATAY]), selectionKey([HALLOUMI]));
  assert.equal(selectionKey([]), "");
  assert.equal(selectionKey(null), "");
});

test("selectionKey: the same option name in two groups does not collide", () => {
  const a = { group: "sides", name: "Egg" };
  const b = { group: "extras", name: "Egg" };
  assert.notEqual(selectionKey([a]), selectionKey([b]));
});

test("selectionSummary: reads as what you would say at the counter", () => {
  assert.equal(selectionSummary([SATAY, HALLOUMI]), "Satay, Halloumi");
  assert.equal(selectionSummary([]), "");
});
