// Unit tests for the typical price-per-person signal (site/js/price.js):
// median of a venue's own priced items → $/$$/$$$ band + ~$pp, or null when
// there's too little data. Pure (no DOM). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { pricedItems, priceBand, priceLabel } from "../site/js/price.js";

const venue = (prices) => ({
  menu: [{ section: "All", items: prices.map((price, i) => ({ name: `d${i}`, price })) }],
});

test("pricedItems: keeps positive numbers, drops null/0/negative/non-number", () => {
  const r = venue([12, null, 0, -5, 18]);
  r.menu[0].items.push({ name: "no-price" }); // price undefined
  r.menu[0].items.push({ name: "str", price: "12" }); // string price ignored
  assert.deepEqual(pricedItems(r).sort((a, b) => a - b), [12, 18]);
});

test("priceBand: null when fewer than 3 priced items", () => {
  assert.equal(priceBand(venue([10, 20])), null);
  assert.equal(priceBand(venue([])), null);
});

test("priceBand: bands by median — $ / $$ / $$$", () => {
  assert.equal(priceBand(venue([8, 10, 12])).band, "$"); // median 10
  assert.equal(priceBand(venue([18, 24, 30])).band, "$$"); // median 24
  assert.equal(priceBand(venue([30, 40, 50])).band, "$$$"); // median 40
});

test("priceBand: band boundaries are inclusive at 15 and 30", () => {
  assert.equal(priceBand(venue([15, 15, 15])).band, "$"); // 15 → $
  assert.equal(priceBand(venue([30, 30, 30])).band, "$$"); // 30 → $$
  assert.equal(priceBand(venue([31, 31, 31])).band, "$$$");
});

test("priceBand: even count averages the two middle prices, rounds perPerson", () => {
  const p = priceBand(venue([10, 20, 25, 40])); // median (20+25)/2 = 22.5
  assert.equal(p.perPerson, 23); // rounded
  assert.equal(p.count, 4);
  assert.equal(p.band, "$$");
});

test("priceBand: null for a recipes collection even with priced items", () => {
  assert.equal(priceBand({ kind: "recipes", menu: venue([20, 20, 20]).menu }), null);
});

test("priceBand: null for a stub with no menu", () => {
  assert.equal(priceBand({ status: "stub", menu: [] }), null);
  assert.equal(priceBand({}), null);
});

test("priceLabel: compact chip text or null", () => {
  assert.equal(priceLabel(venue([18, 24, 30])), "$$ · ~$24pp");
  assert.equal(priceLabel(venue([10])), null);
});
