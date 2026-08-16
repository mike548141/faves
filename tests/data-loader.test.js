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
import {
  loadRestaurants,
  loadRestaurant,
  recheckReferences,
  referenceCopyFor,
  referenceWhyFor,
  REFERENCE_COPY,
} from "../site/js/data.js";

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

// ---------------------------------------------------------------------------
// Reference integrity (ADR 0020) — the only path allowed to say "removed".
// ---------------------------------------------------------------------------
//
// The rule these guard is an honesty rule, not a behaviour preference: a client
// cannot tell "the shop removed it" from "my copy is stale", so `"absent"` — the
// one state the UI is allowed to render as "removed" — must be reachable ONLY
// from a fetch that provably reached the network. Every other outcome has to
// come back as one of the three "still unknown" states.

const MENU = {
  id: "kk",
  name: "KK",
  menu: [{ section: "Mains", items: [{ name: "Mee Goreng", dishId: "mee-goreng", price: 18 }] }],
};
const V = { type: "venue", venueId: "kk", venueName: "KK" };
const D = { type: "dish", venueId: "kk", venueName: "KK", name: "Mee Goreng", dishId: "mee-goreng" };

/** A stub fetch over a tiny fake site. `urls` records what was asked for. */
function net({ index = ["kk"], records = { kk: MENU }, fail = false } = {}) {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (fail) throw new TypeError("Failed to fetch");
    const path = url.split("?")[0];
    if (path.endsWith("index.json")) return { ok: true, status: 200, json: async () => index };
    const id = path.replace(/^.*\/(.*)\.json$/, "$1");
    if (!(id in records)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => structuredClone(records[id]) };
  };
  return { urls, opts: { fetchImpl, isOnline: () => true, token: "T" } };
}

test("recheck: present when the network shows the venue and the dish", async () => {
  const n = net();
  const out = await recheckReferences([V, D], n.opts);
  assert.deepEqual(out.map((r) => r.state), ["present", "present"]);
});

test("recheck busts the cache, so the service worker cannot answer from its copy", async () => {
  // The whole cache-bust mechanism in one assertion. sw.js serves /data/
  // network-first and falls back to `cache.match(req)` when the network is
  // gone — a fallback indistinguishable from a live answer up here. A unique
  // query makes that fallback MISS (cache.match honours the query string), so
  // a resolved fetch proves the network answered. Drop the query and this
  // module can be lied to by its own cache.
  const n = net();
  await recheckReferences([D], n.opts);
  assert.ok(n.urls.length >= 2);
  for (const u of n.urls) assert.match(u, /[?&]_fresh=T/);
});

test("recheck: a venue dropped from the index is absent", async () => {
  const out = await recheckReferences([V, D], net({ index: [] }).opts);
  assert.deepEqual(out.map((r) => r.state), ["absent", "absent"]);
});

test("recheck: a venue whose file 404s is absent", async () => {
  const out = await recheckReferences([D], net({ records: {} }).opts);
  assert.equal(out[0].state, "absent");
});

test("recheck: a dish gone from a live menu is absent — matched by id, not name", async () => {
  const renamedRow = {
    ...MENU,
    menu: [{ section: "Mains", items: [{ name: "Mee Goreng", dishId: "mee-goreng-2", price: 20 }] }],
  };
  const out = await recheckReferences([D], net({ records: { kk: renamedRow } }).opts);
  assert.equal(out[0].state, "absent", "a name match here would re-open the ADR 0051 collision");
});

test("recheck: offline is never absence — it is 'we could not ask'", async () => {
  const n = net();
  const out = await recheckReferences([V, D], { ...n.opts, isOnline: () => false });
  assert.deepEqual(out.map((r) => r.state), ["offline", "offline"]);
  assert.deepEqual(n.urls, [], "nothing should even be attempted");
});

test("recheck: a dropped connection is unreachable, never absent", async () => {
  const out = await recheckReferences([V, D], net({ fail: true }).opts);
  assert.deepEqual(out.map((r) => r.state), ["unreachable", "unreachable"]);
});

test("recheck: a 500 on the venue file is unreachable, never absent", async () => {
  // The distinction that matters most: 404 is the server saying "not here";
  // 500 is the server saying nothing at all. Only the first is evidence.
  const n = net();
  const fetchImpl = async (url) => {
    if (url.includes("index.json")) return n.opts.fetchImpl(url);
    return { ok: false, status: 500 };
  };
  const out = await recheckReferences([D], { ...n.opts, fetchImpl });
  assert.equal(out[0].state, "unreachable");
});

test("recheck: an unreadable index leaves everything unknown", async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } });
  const out = await recheckReferences([V, D], { fetchImpl, isOnline: () => true });
  assert.deepEqual(out.map((r) => r.state), ["unreachable", "unreachable"]);
});

test("recheck reads the RAW record, so an out-of-season dish is not accused", async () => {
  // `load()` drops a dish that isn't available today. Rechecking against the
  // resolved record would report a winter special as removed every summer — the
  // same lie in a smaller costume. Nothing in this record is on today.
  const seasonal = {
    ...MENU,
    menu: [
      {
        section: "Mains",
        items: [
          { name: "Mee Goreng", dishId: "mee-goreng", price: 18, available: { season: "winter" } },
        ],
      },
    ],
  };
  const out = await recheckReferences([D], net({ records: { kk: seasonal } }).opts);
  assert.equal(out[0].state, "present");
});

test("recheck fetches each venue once however many entries point at it", async () => {
  const n = net();
  const second = { ...D, name: "Roti", dishId: "roti" };
  const out = await recheckReferences([D, second, V], n.opts);
  assert.equal(n.urls.filter((u) => u.includes("kk.json")).length, 1);
  assert.deepEqual(out.map((r) => r.state), ["present", "absent", "present"]);
});

test("recheck: nothing to check asks nothing", async () => {
  const n = net();
  assert.deepEqual(await recheckReferences([], n.opts), []);
  assert.deepEqual(n.urls, []);
});

test("the copy table never lets local knowledge claim a removal", () => {
  // The honesty floor as a string assertion, because invariant 2 is a claim
  // about words on a screen. Anything shown before a live check must hold both
  // possibilities open; only the two `removed*` labels name a deletion, and
  // referenceCopyFor hands those back for exactly one state.
  assert.match(REFERENCE_COPY.unresolvedWhy, /may have been removed, or your list may be out of date/);
  for (const state of ["unresolved", "checking", "offline", "unreachable"]) {
    assert.doesNotMatch(referenceCopyFor(D, state), /No longer/);
    assert.doesNotMatch(referenceWhyFor(state), /^Checked just now/);
  }
  assert.equal(referenceCopyFor(D, "absent"), REFERENCE_COPY.removedDish);
  assert.equal(referenceCopyFor(V, "absent"), REFERENCE_COPY.removedVenue);
  assert.equal(referenceWhyFor("absent"), REFERENCE_COPY.removedWhy);
  // Offline says it could not check, and does not imply the thing is gone.
  assert.match(referenceWhyFor("offline"), /Can’t check while you’re offline/);
  assert.match(referenceWhyFor("unreachable"), /still unchecked/);
});
