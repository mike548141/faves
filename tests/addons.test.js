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
  optionId,
  CONTRADICTS,
} from "../site/js/addons.js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  // `contains-pork` joined them 2026-09-29 (ADR 0140) — not an allergen, a
  // presence tag that kills `v`/`vg` like `has-meat` and the two venue-stated
  // claims `halal`/`kosher`.
  assert.deepEqual(
    new Set(all.filter((t) => t.startsWith("contains-"))),
    new Set(["contains-gluten", "contains-dairy", "contains-egg", "contains-shellfish",
             "contains-fish", "contains-pork"]),
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

// --- ADR 0095: a finfish option carries BOTH axes ---------------------
test("composeTags: salmon carrying both tags warns about the allergen AND kills the claim", () => {
  // The shipped shape since 2026-09-07. The two tags are independent: the
  // dietary one contradicts `v`, the allergen one unions in and lands in
  // `added` so the picker can name which option brought it.
  const salmon = { group: "brunch-sides", name: "Salmon", price: 9, tags: ["has-fish", "contains-fish"] };
  const out = composeTags(["v"], [salmon]);
  assert.deepEqual(out.added, [{ tag: "contains-fish", from: "Salmon" }]);
  assert.equal(out.dropped[0].tag, "v");
  assert.equal(out.dropped[0].allergen, "has-fish");
  assert.ok(out.tags.includes("contains-fish"));
});

test("composeTags: a dish that ALREADY declares fish is not told twice", () => {
  // The owner's noise worry, and the half `seen` already answers: adding salmon
  // to a dish the venue already tagged `contains-fish` must produce NO second
  // warning and NO second chip. `added` empty is the whole assertion — it is
  // what the picker's allergen lines are built from.
  const salmon = { group: "brunch-sides", name: "Salmon", price: 9, tags: ["has-fish", "contains-fish"] };
  const out = composeTags(["contains-fish"], [salmon]);
  assert.deepEqual(out.added, []);
  assert.deepEqual(out.tags.filter((t) => t === "contains-fish"), ["contains-fish"]);
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

// --- a group that SELECTS a variant (ADR 0130, roadmap 28k) -------------
// A synthetic size ladder: no record in site/data carries one yet.
const LADDER = {
  id: "size", name: "Size", kind: "selects",
  options: [
    { name: "Regular", id: "regular", dishPrice: 14, default: true, tags: ["v", "gf-option"] },
    { name: "Large", id: "large", dishPrice: 29, tags: ["v", "gf-option"] },
  ],
};

test("groupsFor: a selects group is offered since 28m drew it (ADR 0133)", () => {
  // Withheld until roadmap 28m, because the picker would have offered it as a
  // pick-one of extras. addons-ui.js now draws it as a single choice; the
  // pricing and keying rules are tested in tests/variants.test.js.
  const rec = { addOnGroups: [...RECORD.addOnGroups, LADDER] };
  assert.deepEqual(groupsFor(rec, { addOns: ["size"] }, { addOns: ["sides", "size"] }).map((g) => g.id), ["size", "sides"]);
  // …and an explicit `kind: "adds"` is today's group, unchanged.
  const adds = { ...RECORD.addOnGroups[1], kind: "adds" };
  assert.deepEqual(groupsFor({ addOnGroups: [adds] }, {}, { addOns: ["sides"] }).map((g) => g.id), ["sides"]);
});

test("optionPrice: a variant's dishPrice is never read as a surcharge", () => {
  // Why `dishPrice` is its own word: every reader of `price` adds it to the
  // dish. The Large is a $29 plate, not a $29 extra on a $14 one.
  assert.equal(optionPrice(LADDER, LADDER.options[1]), 0);
  assert.equal(selectionPrice([{ group: "size", ...LADDER.options[1] }]), 0);
});

test("composeTags: a variant that restates its dish's claims costs none of them", () => {
  // ADR 0048 §3 is not amended (28i): claims still INTERSECT. What keeps a
  // Large from stripping `v` off a vegetarian dish is the data — validate.py
  // makes every variant restate its dish's claims exactly — so this is the
  // half of that bargain the composer has to keep.
  const large = { group: "size", ...LADDER.options[1] };
  const out = composeTags(["v", "gf-option", "contains-dairy"], [large]);
  assert.deepEqual(out.dropped, []);
  assert.deepEqual(out.tags, ["v", "gf-option", "contains-dairy"]);
  // …and why validate.py must hold it: an untagged variant would strip both.
  const bare = composeTags(["v", "gf-option"], [{ ...large, tags: [] }]);
  assert.deepEqual(bare.dropped.map((d) => d.tag), ["v", "gf-option"]);
  // …and a variant claiming more than its dish restores nothing.
  const restore = composeTags([], [{ ...large, tags: ["v"] }]);
  assert.deepEqual(restore.tags, []);
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

// --- an option has an id (ADR 0126, roadmap 28q) ------------------------
// Three properties, and each is a claim about money on a real order line: a
// key cannot be shared by two different choices, a venue renaming an option
// cannot strand a saved line, and a line saved before ids existed still merges.

test("optionId: the explicit id where there is one, slug(name) where there isn't", () => {
  assert.equal(optionId({ id: "large", name: "Lg" }), "large");
  assert.equal(optionId({ name: "Extra Cheese!" }), "extra-cheese");
  assert.equal(optionId({ id: "", name: "Satay" }), "satay"); // blank id is no id
  assert.equal(optionId(null), "");
  assert.equal(optionId({}), "");
});

test("selectionKey: two different (group, option) pairs can never produce one key", () => {
  // The item's worked example. It was already safe — the old key carried
  // U+001F between the halves, invisible in an editor — and it stays safe.
  assert.notEqual(
    selectionKey([{ group: "a", name: "bc" }]),
    selectionKey([{ group: "ab", name: "c" }]),
  );
  // What the old key could NOT survive: a separator INSIDE a part, which a
  // crafted share link or backup file is free to send. Under the name-keyed
  // scheme these two were byte-identical keys.
  assert.notEqual(
    selectionKey([{ group: "a\u001fb", name: "c" }]),
    selectionKey([{ group: "a", name: "b\u001fc" }]),
  );
  assert.notEqual(
    selectionKey([{ group: "g", name: "x\u001ey" }]),
    selectionKey([{ group: "g", name: "x" }, { group: "g", name: "y" }]),
  );
  // A name that slugs to nothing must not share the empty id with another.
  assert.notEqual(selectionKey([{ group: "g", name: "炒饭" }]), selectionKey([{ group: "g", name: "面" }]));
  // No part of a key may contain a separator, whatever went in.
  for (const s of [
    { group: "a\u001fb", name: "c\u001ed" },
    { group: "g", id: "x\u001fy", name: "z" },
    { group: "g", name: "炒\u001f饭" },
  ]) {
    const parts = selectionKey([s]).split("\u001f");
    assert.equal(parts.length, 2, JSON.stringify(s));
    assert.ok(!parts.some((p) => p.includes("\u001e")), JSON.stringify(s));
  }
});

test("selectionKey: across the WHOLE corpus, no two options in a venue share a key", () => {
  // The property over the data a person actually orders from, not a fixture:
  // every (group, option) a venue offers keys distinctly from every other.
  const dir = fileURLToPath(new URL("../site/data/restaurants/", import.meta.url));
  let checked = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    const rec = JSON.parse(readFileSync(dir + f, "utf8"));
    const seen = new Map();
    for (const g of rec.addOnGroups || []) {
      for (const o of g.options || []) {
        const k = selectionKey([{ group: g.id, id: o.id, name: o.name }]);
        assert.ok(!seen.has(k), `${f}: ${g.id}/${o.name} keys like ${seen.get(k)}`);
        seen.set(k, `${g.id}/${o.name}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked >= 200, `only ${checked} options read — is the corpus there?`);
});

test("selectionKey: renaming an option's display name leaves the key unchanged", () => {
  const before = { group: "size", id: "large", name: "Large", price: 29 };
  const after = { group: "size", id: "large", name: "Lg", price: 29 };
  assert.equal(selectionKey([before]), selectionKey([after]));
  // …and the id is what carries it: a DIFFERENT id is a different line.
  assert.notEqual(selectionKey([before]), selectionKey([{ ...after, id: "regular" }]));
});

test("selectionKey: a selection stored before ids existed keys as the same option today", () => {
  // What is sitting in a family's browser, a backup file and every share link
  // minted before this change: `{ group, name }`, no id. The seeded id IS
  // slug(name), so the two meet — and after a rename, the old line still meets
  // the renamed option, because the id was pinned when the name moved.
  const stored = { group: "sauces", name: "Satay", price: 0 };
  const today = { group: "sauces", id: "satay", name: "Satay", price: 0 };
  const renamed = { group: "sauces", id: "satay", name: "Satay (peanut)", price: 0 };
  assert.equal(selectionKey([stored]), selectionKey([today]));
  assert.equal(selectionKey([stored]), selectionKey([renamed]));
});

test("selectionSummary: reads as what you would say at the counter", () => {
  assert.equal(selectionSummary([SATAY, HALLOUMI]), "Satay, Halloumi");
  assert.equal(selectionSummary([]), "");
});

// --- ADR 0140: pork, and the two claims only a venue may state -------------

test("CONTRADICTS: pork kills v, vg, halal and kosher; shellfish also kills kosher; nothing else", () => {
  const killedBy = (tag) => Object.keys(CONTRADICTS).filter((k) => CONTRADICTS[k].includes(tag)).sort();
  assert.deepEqual(killedBy("contains-pork"), ["halal", "kosher", "v", "vg"]);
  assert.deepEqual(killedBy("contains-shellfish"), ["kosher", "v", "vg"]);
  // Halal is NOT killed by shellfish — that is Kosher's rule, not Halal's.
  assert.deepEqual(CONTRADICTS.halal, ["contains-pork"]);
});

test("composeTags: a pork topping costs a venue-stated Halal dish its claim, as a FACT", () => {
  const bacon = { group: "extras", name: "Bacon", price: 4, tags: ["has-meat", "contains-pork"] };
  const out = composeTags(["halal"], [bacon]);
  assert.ok(!out.tags.includes("halal"), "Halal survived a bacon topping");
  const d = out.dropped.find((x) => x.tag === "halal");
  assert.equal(d.reason, "contradicted");
  assert.equal(d.allergen, "contains-pork");
});

test("composeTags: an option's own 'halal' never lands on a dish that did not state it", () => {
  // The union half would have carried it: a non-claim tag unions in. Halal is a
  // CLAIM (it intersects), so a halal chicken option on an unstated dish adds
  // nothing — the dish did not say halal, and a topping cannot say it for it.
  const chicken = { group: "extras", name: "Halal chicken", price: 6, tags: ["has-meat", "halal"] };
  const out = composeTags(["contains-gluten"], [chicken]);
  assert.ok(!out.tags.includes("halal"), "an add-on made an unstated dish read Halal");
});

test("composeTags: a Halal dish keeps its claim only if every option also states it", () => {
  const plainRice = { group: "sides", name: "Rice", price: 0, tags: [] };
  const out = composeTags(["halal"], [plainRice]);
  assert.ok(!out.tags.includes("halal"), "an unstated option left the Halal claim standing");
  assert.equal(out.dropped.find((x) => x.tag === "halal").reason, "not-stated");
  const halalRice = { group: "sides", name: "Rice", price: 0, tags: ["halal"] };
  assert.ok(composeTags(["halal"], [halalRice]).tags.includes("halal"));
});

test("composeTags: shellfish kills Kosher and leaves Halal standing", () => {
  const prawns = { group: "extras", name: "Prawns", price: 7, tags: ["contains-shellfish", "halal", "kosher"] };
  // (A prawn option tagged kosher is contradictory data — validate warns on it —
  // but the machinery must still let the fact win over the claim.)
  const out = composeTags(["halal", "kosher"], [prawns]);
  assert.ok(out.tags.includes("halal"));
  assert.ok(!out.tags.includes("kosher"));
});
