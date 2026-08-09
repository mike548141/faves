// Unit tests for the metric/imperial display layer (site/js/units.js) —
// ROADMAP Theme 18a/18c, ADR 0029. Pure functions, no DOM.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  UNITS,
  DEFAULT_UNITS,
  UNIT_OPTIONS,
  kmToMiles,
  milesToKm,
  formatDistance,
  dialSpec,
  dialValue,
  dialKm,
  formatDial,
  celsiusToFahrenheit,
  ovenFahrenheit,
  convertTemperatures,
} from "../site/js/units.js";

// --- The preference itself -------------------------------------------------

test("metric is the default and both systems are offered", () => {
  assert.equal(DEFAULT_UNITS, "metric");
  assert.deepEqual(UNITS, ["metric", "imperial"]);
  assert.deepEqual(UNIT_OPTIONS.map((o) => o.key), UNITS);
});

test("mile conversion is the exact international mile, both ways", () => {
  assert.equal(milesToKm(1), 1.609344);
  assert.ok(Math.abs(kmToMiles(1.609344) - 1) < 1e-12);
});

// --- Distance --------------------------------------------------------------

test("formatDistance metric: unchanged from what shipped", () => {
  assert.equal(formatDistance(0.45), "450 m"); // nearest 50 m
  assert.equal(formatDistance(0.01), "50 m"); // never "0 m"
  assert.equal(formatDistance(1.23), "1.2 km"); // one decimal under 10
  assert.equal(formatDistance(13.6), "14 km"); // whole km beyond
  assert.equal(formatDistance(13.6, "metric"), "14 km");
});

test("formatDistance imperial: yards, then a decimal mile, then whole miles", () => {
  assert.equal(formatDistance(0.45, "imperial"), "500 yd"); // 492 yd → nearest 50
  assert.equal(formatDistance(0.01, "imperial"), "50 yd"); // never "0 yd"
  assert.equal(formatDistance(1.23, "imperial"), "0.8 mi"); // 0.764 mi
  assert.equal(formatDistance(13.6, "imperial"), "8.5 mi"); // 8.45 mi
  assert.equal(formatDistance(30, "imperial"), "19 mi"); // whole beyond 10 mi
});

test("formatDistance imperial: the yard band never doubles back on itself", () => {
  // Rounding to the nearest 50 could print "900 yd" (> half a mile) right
  // before the ladder switches to "0.5 mi". It hands over instead.
  const ladder = [0.7, 0.75, 0.8, 0.85, 0.9].map((km) => formatDistance(km, "imperial"));
  assert.deepEqual(ladder, ["750 yd", "800 yd", "850 yd", "0.5 mi", "0.6 mi"]);
});

test("formatDistance: empty string for null/NaN in either system", () => {
  assert.equal(formatDistance(null), "");
  assert.equal(formatDistance(NaN), "");
  assert.equal(formatDistance(null, "imperial"), "");
  assert.equal(formatDistance(NaN, "imperial"), "");
});

test("formatDistance: an unknown units value falls back to metric", () => {
  assert.equal(formatDistance(1.23, "furlongs"), "1.2 km");
  assert.equal(formatDistance(1.23, undefined), "1.2 km");
});

// --- Dials -----------------------------------------------------------------

test("dialSpec: round mile steps in imperial, the shipped km grid in metric", () => {
  assert.deepEqual(dialSpec("favBoostKm", "metric"), { min: 0, max: 30, step: 1 });
  assert.deepEqual(dialSpec("favBoostKm", "imperial"), { min: 0, max: 20, step: 0.5 });
  assert.deepEqual(dialSpec("farKm", "metric"), { min: 5, max: 100, step: 5 });
  assert.deepEqual(dialSpec("farKm", "imperial"), { min: 5, max: 60, step: 5 });
});

test("dialValue: a stored km lands on the active grid", () => {
  assert.equal(dialValue(50, "farKm", "metric"), 50);
  assert.equal(dialValue(50, "farKm", "imperial"), 30); // 31.07 mi → nearest 5
  assert.equal(dialValue(10, "favBoostKm", "metric"), 10);
  assert.equal(dialValue(10, "favBoostKm", "imperial"), 6); // 6.21 mi → nearest ½
});

test("dialValue: clamped to the dial's range, never off the end", () => {
  assert.equal(dialValue(500, "farKm", "metric"), 100);
  assert.equal(dialValue(0, "farKm", "metric"), 5);
  assert.equal(dialValue(500, "farKm", "imperial"), 60);
});

test("dialKm: stores kilometres whatever the reader's units", () => {
  assert.equal(dialKm(25, "farKm", "metric"), 25);
  assert.equal(dialKm(25, "farKm", "imperial"), 40.2); // 25 mi, to one decimal
  assert.equal(dialKm(1.5, "favBoostKm", "imperial"), 2.4);
});

test("dialKm → dialValue round-trips every imperial grid point exactly", () => {
  // The reason km is stored to one decimal: whole kilometres would round-trip
  // 1.5 mi back to 1.0 mi and the thumb would creep every time you switched.
  for (const key of ["favBoostKm", "farKm"]) {
    const { min, max, step } = dialSpec(key, "imperial");
    for (let mi = min; mi <= max; mi += step) {
      const stored = dialKm(mi, key, "imperial");
      assert.equal(dialValue(stored, key, "imperial"), mi, `${key} @ ${mi} mi`);
    }
  }
});

test("formatDial: the readout matches the thumb, in the reader's units", () => {
  assert.equal(formatDial(50, "farKm", "metric"), "50 km");
  assert.equal(formatDial(50, "farKm", "imperial"), "30 mi");
  assert.equal(formatDial(2.4, "favBoostKm", "imperial"), "1.5 mi"); // no "1.50"
  assert.equal(formatDial(0, "favBoostKm", "imperial"), "0 mi");
});

// --- Temperatures ----------------------------------------------------------

test("celsiusToFahrenheit: the exact conversion", () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(100), 212);
  assert.ok(Math.abs(celsiusToFahrenheit(180) - 356) < 1e-9);
});

test("ovenFahrenheit: nearest 5, never a decimal", () => {
  assert.equal(ovenFahrenheit(180), 355);
  assert.equal(ovenFahrenheit(160), 320);
  assert.equal(ovenFahrenheit(170), 340);
  assert.equal(ovenFahrenheit(190), 375);
  assert.equal(ovenFahrenheit(200), 390);
  assert.equal(ovenFahrenheit(250), 480);
});

test("convertTemperatures: metric leaves the step exactly as written", () => {
  const s = "Bake at 180°C for 2 hours.";
  assert.equal(convertTemperatures(s), s);
  assert.equal(convertTemperatures(s, "metric"), s);
});

test("convertTemperatures: imperial swaps the figure outright", () => {
  assert.equal(
    convertTemperatures("Bake at 180°C for 2 hours.", "imperial"),
    "Bake at 355°F for 2 hours."
  );
  assert.equal(
    convertTemperatures("Bake for 10–12 minutes at 200°C.", "imperial"),
    "Bake for 10–12 minutes at 390°F."
  );
});

test("convertTemperatures: a hand-written °F bracket is swallowed, not doubled", () => {
  // Two recipes already spell the Fahrenheit out. We must not print
  // "430°F (425°F)" — and we compute rather than adopt their figure, because
  // the pie recipe brackets its first step and not its next, so adopting would
  // read "preheat to 425°F … bake at 430°F" for one oven setting.
  assert.equal(
    convertTemperatures("Preheat the oven to 175°C (350°F).", "imperial"),
    "Preheat the oven to 345°F."
  );
  assert.equal(
    convertTemperatures("Preheat the oven to 220°C (425°F).", "imperial"),
    "Preheat the oven to 430°F."
  );
  // …and the same 220°C written bare in the next step of that recipe agrees.
  assert.equal(
    convertTemperatures("Pour into the pie shell and bake at 220°C for 10 minutes.", "imperial"),
    "Pour into the pie shell and bake at 430°F for 10 minutes."
  );
});

test("convertTemperatures: handles spacing variants and several per step", () => {
  assert.equal(convertTemperatures("at 180 °C", "imperial"), "at 355°F");
  assert.equal(convertTemperatures("at 180 ° C", "imperial"), "at 355°F");
  assert.equal(
    convertTemperatures("Start at 220°C, drop to 160°C.", "imperial"),
    "Start at 430°F, drop to 320°F."
  );
});

test("convertTemperatures: cannot touch text that only looks temperature-ish", () => {
  const safe = [
    "Bake for 15 minutes.",
    "Line a 1.5–2L ovenproof dish with baking paper.",
    "Add 200 g of flour and 250 ml of milk.",
    "Serves 4 · 45 min",
    "Cook the 180 C-shaped pasta pieces.", // no degree sign → untouched
    "Chill to 4°C before serving.", // one digit → below the 2-digit floor
    "180°Cook until golden.", // no word boundary after the C
  ];
  for (const s of safe) assert.equal(convertTemperatures(s, "imperial"), s);
});

test("convertTemperatures: non-strings pass straight through", () => {
  assert.equal(convertTemperatures(null, "imperial"), null);
  assert.equal(convertTemperatures(undefined, "imperial"), undefined);
});

// --- The real data: nothing but a temperature may ever change --------------
// The safety claim for 18c is "it is impossible to mangle non-temperature
// text". This proves it against every string we actually ship in the recipe
// collection, so a new recipe that trips the pattern fails the suite.

function everyString(value, path = "", out = []) {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => everyString(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) everyString(v, `${path}.${k}`, out);
  }
  return out;
}

const cookAtHome = JSON.parse(
  readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8")
);

test("cook-at-home: only the °C steps change, and every one of them converts", () => {
  const strings = everyString(cookAtHome);
  assert.ok(strings.length > 400, "sanity: the collection is substantial");

  const changed = [];
  for (const [path, s] of strings) {
    const out = convertTemperatures(s, "imperial");
    if (out !== s) changed.push([path, s, out]);
    else assert.ok(!/°\s*C/.test(s), `missed a temperature at ${path}: ${s}`);
  }

  // Every changed string had a °C, gained a °F, and kept the rest of its words.
  for (const [path, before, after] of changed) {
    assert.match(before, /°\s*C/, `${path} changed without a °C`);
    assert.doesNotMatch(after, /°\s*C/, `${path} still shows °C`);
    assert.match(after, /\d+°F/, `${path} gained no °F`);
    // Everything except the temperature figures (and the now-swallowed
    // "(NNN°F)" bracket) must survive the rewrite word for word.
    const strip = (s) =>
      s
        .replace(/\(\s*\d+\s*°\s*F\s*\)/g, "")
        .replace(/\d+\s*°\s*[CF]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    assert.equal(strip(before), strip(after), `${path} lost or gained words`);
  }

  assert.equal(changed.length, 14, "the collection's 14 oven temperatures");
});
