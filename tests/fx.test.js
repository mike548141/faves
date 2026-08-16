// fx.js — converting a menu price from rates shipped as data (ADR 0045).
//
// The thing these guard is not arithmetic, it is *refusal*. A conversion the
// app cannot do honestly must come back null, so the caller falls back to the
// shop's own price — which is always a correct answer. A wrong converted number
// is money advice, and it looks exactly like a right one.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canConvert, convert, fxAsOf, fxCurrencies, setFxTable } from "../site/js/fx.js";

const TABLE = {
  base: "NZD",
  asOf: "2026-08-16",
  rates: { NZD: 1, AUD: 0.8, GBP: 0.5, JPY: 100 },
};

test("converts through the base, so neither side has to BE the base", () => {
  setFxTable(TABLE);
  assert.equal(convert(10, "NZD", "GBP"), 5);
  assert.equal(convert(5, "GBP", "NZD"), 10);
  // GBP → JPY never touches NZD in the answer, only in the arithmetic.
  assert.equal(convert(5, "GBP", "JPY"), 1000);
});

test("the same currency is returned untouched, table or no table", () => {
  setFxTable(TABLE);
  assert.equal(convert(12.5, "NZD", "NZD"), 12.5);
  setFxTable(null);
  assert.equal(convert(12.5, "GBP", "GBP"), 12.5, "even one we have no rate for");
});

test("no table means no conversion — null, never a guess", () => {
  setFxTable(null);
  assert.equal(convert(10, "NZD", "GBP"), null);
  assert.equal(canConvert("NZD", "GBP"), false);
  assert.equal(fxAsOf(), null);
  assert.deepEqual([...fxCurrencies()], []);
});

test("a currency missing from the table is refused, not approximated", () => {
  setFxTable(TABLE);
  assert.equal(convert(10, "NZD", "XPF"), null);
  assert.equal(convert(10, "XPF", "NZD"), null);
  assert.equal(canConvert("NZD", "XPF"), false);
});

test("a non-number amount yields null rather than NaN on the page", () => {
  setFxTable(TABLE);
  for (const bad of [null, undefined, "12", NaN, Infinity]) {
    assert.equal(convert(bad, "NZD", "GBP"), null, `${String(bad)} should not convert`);
  }
});

test("a table whose base rate isn't exactly 1 is rejected WHOLE", () => {
  // Every conversion routes through the base, so a base that isn't 1 scales all
  // of them silently. Refusing the table costs conversion; accepting it prices
  // every dish wrongly, and nothing on screen would say so.
  assert.equal(setFxTable({ base: "NZD", rates: { NZD: 1.02, GBP: 0.5 } }), null);
  assert.equal(convert(10, "NZD", "GBP"), null);
});

test("junk rates are dropped and the rest still work", () => {
  setFxTable({ base: "NZD", asOf: "2026-08-16", rates: { NZD: 1, GBP: 0.5, AUD: "0.8", JPY: -3, EUR: null } });
  assert.deepEqual([...fxCurrencies()].sort(), ["GBP", "NZD"]);
  assert.equal(convert(10, "NZD", "AUD"), null);
  assert.equal(convert(10, "NZD", "GBP"), 5);
});

test("a malformed table is refused rather than half-loaded", () => {
  assert.equal(setFxTable({}), null);
  assert.equal(setFxTable({ base: "NZD" }), null);
  assert.equal(setFxTable({ rates: { NZD: 1 } }), null);
  assert.equal(setFxTable(null), null);
});

// ————————————— The file we actually ship —————————————

test("the committed fx.json loads and can price a NZ menu abroad", () => {
  const doc = JSON.parse(readFileSync(new URL("../site/data/fx.json", import.meta.url), "utf8"));
  const table = setFxTable(doc);
  assert.ok(table, "site/data/fx.json must be loadable — every price depends on it");
  assert.equal(table.base, "NZD");
  assert.match(table.asOf, /^\d{4}-\d{2}-\d{2}$/, "readers are told how old the rates are");
  // A $14.50 dish is worth something sane in pounds — a sanity band wide enough
  // to survive years of drift but tight enough to catch an inverted rate.
  const gbp = convert(14.5, "NZD", "GBP");
  assert.ok(gbp > 1 && gbp < 14.5, `NZ$14.50 came out as £${gbp}`);
});

test("every currency the settings picker can offer round-trips", () => {
  const doc = JSON.parse(readFileSync(new URL("../site/data/fx.json", import.meta.url), "utf8"));
  setFxTable(doc);
  for (const code of fxCurrencies()) {
    const there = convert(100, "NZD", code);
    assert.ok(there > 0, `${code} has no usable rate`);
    // Back again should land within a rounding whisker of where it started.
    assert.ok(Math.abs(convert(there, code, "NZD") - 100) < 1e-6, `${code} does not round-trip`);
  }
});
