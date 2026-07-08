// Unit tests for the typical price-per-person signal (site/js/price.js):
// median of a venue's own priced items → $/$$/$$$ band + ~$pp, or null when
// there's too little data. Pure (no DOM). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { pricedItems, priceBand, priceLabel, isCheapEats } from "../site/js/price.js";

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

test("isCheapEats: only the $ band counts as cheap", () => {
  assert.equal(isCheapEats(venue([8, 10, 12])), true); // median 10 → $
  assert.equal(isCheapEats(venue([18, 24, 30])), false); // $$
  assert.equal(isCheapEats(venue([30, 40, 50])), false); // $$$
});

test("isCheapEats: false when there's too little price data (null band)", () => {
  assert.equal(isCheapEats(venue([10, 12])), false); // < 3 items
  assert.equal(isCheapEats({ kind: "recipes", menu: venue([5, 5, 5]).menu }), false);
  assert.equal(isCheapEats({}), false);
});

// ---- Curated override (priceBand / pricePerPerson win over the median) ----

const curated = (prices, extra) => ({ ...venue(prices), ...extra });

test("priceBand: curated band overrides a misleading median", () => {
  // The KTC case: a cheap median (bar snacks drag it down) but it's a $$ place.
  const p = priceBand(curated([8, 10, 12], { priceBand: "$$" }));
  assert.equal(p.band, "$$");
  assert.equal(p.curated, true);
  // Median ($) disagrees with the curated band → no contradictory figure.
  assert.equal(p.perPerson, null);
});

test("priceBand: curated band keeps the median figure when it agrees", () => {
  const p = priceBand(curated([18, 24, 30], { priceBand: "$$" }));
  assert.equal(p.band, "$$");
  assert.equal(p.perPerson, 24); // median agrees with $$ → shown
  assert.equal(p.curated, true);
});

test("priceBand: curated pricePerPerson sets both figure and band", () => {
  const p = priceBand(curated([8, 10, 12], { pricePerPerson: 28 }));
  assert.equal(p.perPerson, 28);
  assert.equal(p.band, "$$"); // 28 → $$
  assert.equal(p.curated, true);
});

test("priceBand: curated band shows even with a thin/empty menu", () => {
  assert.deepEqual(
    { band: priceBand({ priceBand: "$$$", menu: [] }).band, curated: true },
    { band: "$$$", curated: true }
  );
});

test("priceBand: invalid curated band is ignored (falls back to median)", () => {
  const p = priceBand(curated([8, 10, 12], { priceBand: "cheap" }));
  assert.equal(p.band, "$"); // median
  assert.equal(p.curated, false);
});

test("priceLabel: curated band with no figure shows the band alone", () => {
  assert.equal(priceLabel(curated([8, 10, 12], { priceBand: "$$" })), "$$");
});

test("isCheapEats: a curated $$ band is not cheap even with a cheap median", () => {
  assert.equal(isCheapEats(curated([8, 10, 12], { priceBand: "$$" })), false);
  assert.equal(isCheapEats(curated([40, 40, 40], { priceBand: "$" })), true);
});
