// Recipe quantities in US measures (ROADMAP 18b, ADR 0170).
//
// Every expected figure below was worked out by hand from the definitions in
// the ADR, not copied from a run:  1 US cup = 236.5882365 ml, so one NZ cup
// (250 ml) is 1.0567 of them; 1 oz = 28.349523125 g. CORPUS marks a line taken
// verbatim from site/data/restaurants/cook-at-home.json.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { convertLine, convertQuantities } from "../site/js/cooking-units.js";
import { rational, scaleLine, scaleLineStatus, scaleForPeople } from "../site/js/quantity.js";
import { ingredientBlocks } from "../site/js/ingredients.js";
import { IMPERIAL_USAGE, METRIC_USAGE, unitUsage } from "../site/js/units.js";
import { localUnits } from "../site/js/locale.js";
import { recipeLines } from "../site/js/shopping.js";

const US = IMPERIAL_USAGE;
const to = (text, units = US) => convertLine(text, units).text;

// --- Who gets it ---------------------------------------------------------------

test("a metric reader is returned the line itself, status none", () => {
  for (const line of ["2¼ cups plain flour", "250g butter", "1–1½ cups chocolate", "2 eggs"]) {
    assert.deepEqual(convertLine(line, METRIC_USAGE), { text: line, status: "none" }, line);
    assert.deepEqual(convertLine(line, "metric"), { text: line, status: "none" }, line);
    assert.deepEqual(convertLine(line, undefined), { text: line, status: "none" }, line);
  }
});

test("GB reads grams and cups as written: the kitchen is the third usage, and metric there", () => {
  // Britain is miles on the road and °C in the oven (ADR 0087) AND grams in the
  // bowl (ADR 0170). Fold GB in with the US and this is what fails.
  const gb = localUnits({ timezone: "Europe/London", languages: ["en-GB"] });
  assert.equal(gb.cooking, "metric");
  assert.deepEqual(convertLine("250g butter", gb), { text: "250g butter", status: "none" });
  assert.deepEqual(convertLine("2¼ cups plain flour", gb), { text: "2¼ cups plain flour", status: "none" });
});

test("Local resolves to US measures in the US, and nowhere else", () => {
  const at = (timezone, tag) => localUnits({ timezone, languages: [tag] });
  assert.equal(to("250g butter", at("America/Chicago", "en-US")), "9 oz butter");
  for (const [zone, tag] of [["Pacific/Auckland", "en-NZ"], ["Australia/Sydney", "en-AU"], ["Europe/Paris", "fr-FR"]]) {
    assert.equal(to("250g butter", at(zone, tag)), "250g butter", zone);
  }
  assert.equal(to("250g butter", at(null)), "250g butter", "no signal reads metric");
});

test("an explicit US customary choice converts the kitchen too", () => {
  assert.equal(unitUsage("imperial").cooking, "imperial");
  assert.equal(to("250g butter", "imperial"), "9 oz butter");
});

// --- Volume ----------------------------------------------------------------------

test("a NZ cup is 5.7% more than a US one, and the line says so", () => {
  // 250 ml / 236.588 = 1.0567; 562.5 ml = 2.3775; 375 ml = 1.585.
  assert.equal(to("1 cup milk"), "1 cup milk");
  assert.equal(to("2¼ cups plain flour"), "2⅜ cups plain flour"); // CORPUS
  assert.equal(to("1½ cups beef stock or water"), "1⅝ cups beef stock or water"); // CORPUS
  assert.equal(to("5 cups flour"), "5¼ cups flour"); // CORPUS: 5.283
});

test("spoons are the same measure to 1.4%, so their lines are kept in their own words", () => {
  // "5 tsp" must not become "5⅛ tsp": 5.07 is not a figure anyone can pour.
  for (const line of [
    "5 tsp cinnamon", "6 tablespoons butter", "3½ tbsp ginger", "1¼ teaspoons cinnamon", "½ tsp baking powder",
  ]) {
    assert.equal(to(line), line, line); // CORPUS, all five
  }
});

test("ml and litres are poured into the US vessel their size suits", () => {
  assert.equal(to("250ml cream"), "1 cup cream"); // CORPUS: 1.057 cups
  assert.equal(to("150ml cream"), "⅝ cup cream"); // CORPUS: 0.634 cups, nearest ⅝
  assert.equal(to("500ml cream"), "2⅛ cups cream"); // CORPUS: 2.113 cups
  assert.equal(to("2L chicken stock"), "2 qt chicken stock"); // CORPUS: 2.113 qt, to the quarter
  assert.equal(to("15ml oil"), "1 tbsp oil");
  assert.equal(to("5ml vanilla"), "1 tsp vanilla");
  assert.equal(to("60 ml cream"), "¼ cup cream"); // 0.254 cups: a quarter, not 3⅞ tbsp
});

test("the unit word agrees with the figure: ½ cup, 1 cup, 1⅝ cups", () => {
  assert.equal(to("½ cup flour"), "½ cup flour");
  assert.equal(to("1 cup flour"), "1 cup flour");
  assert.equal(to("1½ cups flour"), "1⅝ cups flour");
  assert.equal(to("1 Cup sugar"), "1 Cup sugar", "the author's capital stays");
  assert.equal(to("0.5 cup milk"), "½ cup milk", "a decimal is spelled as a kitchen fraction");
});

test("volume never becomes weight, and weight never becomes volume", () => {
  // No density table (ADR 0170): "a cup of flour is 120 g" is 125 in another book.
  assert.doesNotMatch(to("2 cups flour"), /oz|lb|\bg\b/);
  assert.doesNotMatch(to("250g butter"), /cup|tbsp|tsp|qt/);
  assert.doesNotMatch(to("500ml cream"), /oz|lb/);
});

// --- Weight ----------------------------------------------------------------------

test("grams become ounces to the figure a kitchen scale reads", () => {
  // 100 g = 3.527 oz; 185 g = 6.526; 225 g = 7.937; 250 g = 8.818.
  assert.equal(to("100g butter"), "3½ oz butter"); // CORPUS
  assert.equal(to("185g melted butter"), "6½ oz melted butter"); // CORPUS
  assert.equal(to("225g salted butter, diced"), "8 oz salted butter, diced"); // CORPUS
  assert.equal(to("250g butter"), "9 oz butter"); // CORPUS
  assert.equal(to("30g butter"), "1 oz butter"); // CORPUS: 1.058
  assert.equal(to("250 g butter"), "9 oz butter", "a space before the unit reads the same");
});

test("a pound and its ounces are one weight", () => {
  // 500 g = 17.637 oz → 17½; 1 kg = 35.274 → 35½; 454 g = 16.01 → one pound.
  assert.equal(to("500g flour"), "1 lb 1½ oz flour");
  assert.equal(to("1kg potatoes"), "2 lb 3½ oz potatoes");
  assert.equal(to("1.5 kg potatoes"), "3 lb 5 oz potatoes");
  assert.equal(to("454g butter"), "1 lb butter");
});

test("a weight with no spelling within 8% stays as written, and says so", () => {
  // 5 g is 0.176 oz: ⅛ is 29% under and ¼ is 42% over. Refused, not rounded.
  assert.deepEqual(convertLine("5g salt", US), { text: "5g salt", status: "unconverted" });
  // 12 g is 0.423 oz: ⅜ would be 11% light.
  assert.deepEqual(convertLine("12g yeast", US), { text: "12g yeast", status: "unconverted" });
  assert.equal(to("10g salt"), "⅜ oz salt", "…while 10 g (0.353 oz) has one, 6% off");
});

// --- Brackets ---------------------------------------------------------------------

test("a weight in a bracket is converted; a bracket that repeats the head's kind is dropped", () => {
  assert.equal(to("⅔ cup (150g) caster sugar"), "⅔ cup (5¼ oz) caster sugar"); // CORPUS
  assert.equal(to("½ cup (75g) plain flour"), "½ cup (2¾ oz) plain flour"); // CORPUS
  // "1 cup (250 ml)" said the metric twice; the head now says it in US measures.
  assert.equal(to("1 cup (250 ml) milk"), "1 cup milk");
  assert.equal(to("1 tablespoon (15ml) oil"), "1 tablespoon oil");
  // A bracket that is not a measure is prose and survives.
  assert.equal(to("200g rice stick noodles (available in supermarkets)"), "7 oz rice stick noodles (available in supermarkets)");
  assert.equal(to("2 cups pumpkin (canned or purée)"), "2⅛ cups pumpkin (canned or purée)");
});

// --- Never half-converted ----------------------------------------------------------

test("a line still carrying a metric amount is returned whole and marked, never half converted", () => {
  const shown = [
    "1–1½ cups chocolate", // CORPUS: a range; the head parse cannot see its far end
    "Lukewarm water (approx. 300–400ml, see method)", // CORPUS: an amount mid-line
    "2 cups flour and 250ml milk", // a second amount joined on
    "1 cup flour (or 2 tbsp cornflour)", // an alternative with its own amount
    "1 can (400g) tomatoes", // the amount names a measure, the head does not
    "1 x 400g can chickpeas",
  ];
  for (const line of shown) {
    assert.deepEqual(convertLine(line, US), { text: line, status: "unconverted" }, line);
  }
});

test("a line with no measure in it is none, and needs no mark", () => {
  for (const line of [
    "3 free-range eggs", "Pinch of salt", "Garlic", "1 can chopped tomatoes", "1 x 9-inch pie crust",
    "4 prune plums, not peeled, cut into 6 wedges each", "2 shallots, chopped (or 1 medium red onion)",
  ]) {
    assert.deepEqual(convertLine(line, US), { text: line, status: "none" }, line); // CORPUS
  }
  assert.equal(to("2 garlic cloves"), "2 garlic cloves", '"2 g" is not 2 garlic');
  assert.equal(to("2 lemons"), "2 lemons", '"2 l" is not 2 lemons');
});

test("a hedge in front of the amount stays in front of it", () => {
  assert.equal(to("Approx. 2 cups flour"), "Approx. 2⅛ cups flour"); // CORPUS
});

// --- Composition with the scaler ------------------------------------------------------

test("the scaler runs first and the US measure is taken once, from its result", () => {
  // 2× of 2¼ NZ cups is 4½ = 1125 ml = 4.755 US cups → 4¾. Converting first and
  // doubling the rounded 2⅜ would give 4¾ too here; the pair below is where
  // the order shows.
  assert.equal(to(scaleLine("2¼ cups plain flour", rational(2))), "4¾ cups plain flour");
  // ½×: 1⅛ NZ cups = 281.25 ml = 1.189 → 1¼ (5.1% off); half of the rounded
  // 2⅜ would be 1³⁄₁₆, which has no spelling at all.
  assert.equal(scaleLine("2¼ cups plain flour", rational(1, 2)), "1⅛ cups plain flour");
  assert.equal(to(scaleLine("2¼ cups plain flour", rational(1, 2))), "1¼ cups plain flour");
  // Weight and its bracket scale together, then convert together: 1½× is
  // 1 cup (225 g) = 1.057 cups and 7.94 oz.
  assert.equal(to(scaleLine("⅔ cup (150g) caster sugar", rational(3, 2))), "1 cup (8 oz) caster sugar");
});

test("the people-count stepper composes: serve 6 from a recipe for 4", () => {
  const six = scaleForPeople(4, 6); // 3/2
  assert.deepEqual(six, rational(3, 2));
  assert.equal(to(scaleLine("250g butter", six)), "13 oz butter"); // 375 g = 13.228 oz, to the half ounce above 8
  assert.equal(to(scaleLine("2 cups milk", six)), "3⅛ cups milk"); // 750 ml = 3.170 cups
});

test("a line the scaler refuses is still converted, from its written amount", () => {
  // The scaler keeps the author's text; the reader on US measures still reads
  // it in their units, and the page marks it "as written" for the scale.
  const v = scaleLineStatus("2 shallots, chopped (or 1 medium red onion)", rational(2));
  assert.equal(v.status, "blocked");
  const half = scaleLineStatus("½ cup (125 ml) milk", rational(1, 2));
  assert.equal(half.status, "blocked", "half of a bracketed 125 ml has no whole-ml answer");
  assert.equal(to(half.text), "½ cup milk");
});

test("the shopping list carries the reader's measures, and metric readers' lines do not move", () => {
  const item = { ingredients: ["250g butter", "2¼ cups plain flour", "3 free-range eggs"] };
  assert.deepEqual(recipeLines(item, "one").map((l) => l.text), item.ingredients);
  assert.deepEqual(recipeLines(item, "one", METRIC_USAGE).map((l) => l.text), item.ingredients);
  assert.deepEqual(
    recipeLines(item, "one", US).map((l) => l.text),
    ["9 oz butter", "2⅜ cups plain flour", "3 free-range eggs"]
  );
  assert.deepEqual(
    recipeLines(item, "one", US).map((l) => l.key),
    item.ingredients,
    "the key is the raw line, so a tick or a listed line survives a unit change"
  );
});

test("convertQuantities is the text of convertLine", () => {
  assert.equal(convertQuantities("250g butter", US), "9 oz butter");
  assert.equal(convertQuantities("1–1½ cups chocolate", US), "1–1½ cups chocolate");
  assert.equal(convertQuantities(null, US), null);
});

// --- The corpus -----------------------------------------------------------------------

const lines = (() => {
  const collection = JSON.parse(
    readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8")
  );
  const out = [];
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      if (Array.isArray(o.ingredients)) {
        out.push(...ingredientBlocks(o.ingredients).flatMap((b) => b.lines.map((l) => l.text)));
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(collection);
  return out;
})();

test("CORPUS: no recipe line reaches a US reader half converted", () => {
  assert.ok(lines.length > 150, `read ${lines.length} lines`);
  const metric = /(?:\d|[½⅓⅔¼¾⅛⅜⅝⅞])\s*(?:kg|g|ml|l|litres?)(?![A-Za-z])/i;
  const unconverted = [];
  for (const line of lines) {
    const r = convertLine(line, US);
    if (r.status === "unconverted") {
      assert.equal(r.text, line, "an unconverted line comes back exactly as written");
      unconverted.push(line);
    } else {
      assert.doesNotMatch(r.text, metric, `${line} → ${r.text}`);
    }
  }
  // Exactly these two, today. A third is a new line the converter cannot read
  // and wants a human look; the count moving down is a parser that improved.
  assert.deepEqual(unconverted.sort(), [
    "1–1½ cups chocolate",
    "Lukewarm water (approx. 300–400ml, see method)",
  ]);
});

test("CORPUS: every line a metric reader sees is byte for byte what the recipe says", () => {
  for (const line of lines) assert.equal(to(line, METRIC_USAGE), line);
});

test("CORPUS: converting changes the cups, weights and millilitres, and leaves every spoon alone", () => {
  let changed = 0;
  for (const line of lines) {
    const r = convertLine(line, US);
    if (r.status !== "converted") continue;
    const spoon = /\b(?:tsp|tbsp|teaspoons?|tablespoons?)\b/.test(line);
    if (spoon) assert.equal(r.text, line, line);
    if (r.text !== line) {
      changed++;
      assert.match(line, /cups?\b|\d\s*(?:g|kg|ml|L)\b/, `${line} changed but names no cup or metric measure`);
    }
  }
  // Today 41 of the 165 lines. The floor is "a good many", so adding a recipe
  // does not break this, and the ceiling is "not all of them".
  assert.ok(changed >= 30 && changed < lines.length, `${changed} of ${lines.length} changed`);
});
