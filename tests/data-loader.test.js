// The loader seam (site/js/data.js): the one place the app crosses from "the
// record with all its history" to "the record, today". Pure logic once `fetch`
// is stubbed. Run: `node --test`.
//
// This file exists because of a real escape: `resolveRecord` was imported into
// data.js and never called. Every temporal.js unit test still passed, and the
// app silently computed a venue's price band from a menu whose prices were raw
// dated arrays rather than numbers — a wrong figure that looked entirely
// plausible on the card. Testing the resolver is not the same as testing that
// anything calls it.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadRestaurants, loadRestaurant } from "../site/js/data.js";

const RECORD = {
  id: "t",
  name: "T",
  verified: "2026-08-08",
  picks: ["Soup"],
  lifecycle: {
    added: "2026-01-01",
    events: [{ type: "closed-temporarily", date: "2026-02-01", note: "refit" }],
  },
  locations: [
    {
      label: "Main",
      address: [
        { value: "OLD-ADDR", recorded: "2019" },
        { value: "NEW-ADDR", from: "2026-03-01" },
      ],
      lat: -41.29,
      lng: 174.78,
      phone: "PHONE-PLACEHOLDER",
      hours: null,
    },
  ],
  menu: [
    {
      section: "Soups",
      items: [
        { name: "Soup", price: [{ value: 10.5, recorded: "2019" }, { value: 17.5, recorded: "2026-08-08" }] },
        { name: "Old Broth", price: 8, available: { offBy: "2026-08-08" } },
      ],
    },
  ],
};

beforeEach(() => {
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => (url.endsWith("index.json") ? ["t"] : structuredClone(RECORD)),
  });
});

test("loadRestaurant resolves the time dimension — prices arrive as numbers", async () => {
  const r = await loadRestaurant("t");
  assert.equal(typeof r.menu[0].items[0].price, "number", "a raw dated array here would break price.js");
  assert.equal(r.menu[0].items[0].price, 17.5);
});

test("loadRestaurant drops retired dishes and folds the lifecycle", async () => {
  const r = await loadRestaurant("t");
  assert.deepEqual(r.menu[0].items.map((i) => i.name), ["Soup"]);
  assert.equal(r.closure.state, "closed-temporarily");
  assert.equal(r.closure.note, "refit");
});

test("loadRestaurant resolves a branch's dated address BEFORE lifting it up", async () => {
  // Order-of-operations guard: resolve, then project. Reversed, the top-level
  // address would be the raw series array.
  const r = await loadRestaurant("t");
  assert.equal(r.address, "NEW-ADDR");
  assert.equal(r.locations[0].address, "NEW-ADDR");
});

test("loadRestaurants applies the same resolution to every record", async () => {
  const all = await loadRestaurants();
  assert.equal(all.length, 1);
  assert.equal(all[0].menu[0].items[0].price, 17.5);
  assert.equal(all[0].closure.state, "closed-temporarily");
});

test("loadRestaurants skips a record that fails to load rather than dying", async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith("index.json")) return { ok: true, json: async () => ["t", "missing"] };
    if (url.includes("missing")) return { ok: false, status: 404 };
    return { ok: true, json: async () => structuredClone(RECORD) };
  };
  const err = console.error;
  console.error = () => {}; // the loader logs the skip; keep the test output clean
  try {
    assert.deepEqual((await loadRestaurants()).map((r) => r.id), ["t"]);
  } finally {
    console.error = err;
  }
});
