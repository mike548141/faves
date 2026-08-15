// Unit tests for the dish-level "what we still owe this dish" resolver
// (site/js/needs.js). Pure (no DOM). Run: `node --test`.
//
// The behaviour worth pinning is the tolerance: menu data is hand-written, and
// a malformed `needs` entry must degrade to "no indicator" rather than take a
// menu screen down or leak a raw slug onto the page.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dishNeeds, priceUnknown, NEED_KINDS } from "../site/js/needs.js";

test("dishNeeds: absent, empty or non-array needs give nothing", () => {
  assert.deepEqual(dishNeeds({ name: "x" }), []);
  assert.deepEqual(dishNeeds({ name: "x", needs: [] }), []);
  assert.deepEqual(dishNeeds({ name: "x", needs: null }), []);
  assert.deepEqual(dishNeeds({ name: "x", needs: "price" }), []);
  assert.deepEqual(dishNeeds(null), []);
  assert.deepEqual(dishNeeds(undefined), []);
});

test("dishNeeds: a known kind resolves to a label and a fix", () => {
  const [n] = dishNeeds({ needs: [{ what: "price" }] });
  assert.equal(n.what, "price");
  assert.equal(n.label, "Price not recorded");
  assert.match(n.fix, /clears this/);
  assert.equal(n.note, null);
  assert.equal(n.since, null);
});

test("dishNeeds: every kind in the closed set resolves", () => {
  for (const what of NEED_KINDS) {
    const [n] = dishNeeds({ needs: [{ what }] });
    assert.ok(n, `${what} should resolve`);
    assert.ok(n.label.length > 0 && n.fix.length > 0, `${what} needs label + fix`);
  }
});

test("dishNeeds: an unknown kind is dropped, never rendered raw", () => {
  assert.deepEqual(dishNeeds({ needs: [{ what: "vibes" }] }), []);
  // …and it doesn't take the valid entries beside it down with it.
  const out = dishNeeds({ needs: [{ what: "vibes" }, { what: "price" }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].what, "price");
});

test("dishNeeds: malformed entries are skipped, not thrown", () => {
  const out = dishNeeds({ needs: [null, 42, "price", {}, { what: "name" }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].what, "name");
});

test("dishNeeds: the same kind twice yields one indicator", () => {
  const out = dishNeeds({
    needs: [
      { what: "price", note: "first" },
      { what: "price", note: "second" },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].note, "first");
});

test("dishNeeds: blank notes normalise to null, real ones are trimmed", () => {
  assert.equal(dishNeeds({ needs: [{ what: "price", note: "   " }] })[0].note, null);
  assert.equal(dishNeeds({ needs: [{ what: "price", note: 7 }] })[0].note, null);
  assert.equal(dishNeeds({ needs: [{ what: "price", note: " hi " }] })[0].note, "hi");
});

test("dishNeeds: order is the order given", () => {
  const out = dishNeeds({ needs: [{ what: "ingredients" }, { what: "price" }] });
  assert.deepEqual(out.map((n) => n.what), ["ingredients", "price"]);
});

test("priceUnknown: true only for a missing price the data calls unread", () => {
  assert.equal(priceUnknown({ price: null, needs: [{ what: "price" }] }), true);
  assert.equal(priceUnknown({ price: undefined, needs: [{ what: "price" }] }), true);
});

test("priceUnknown: a null price with no needs is 'varies', not 'unknown'", () => {
  // This is the distinction the whole field exists for: market fish and P.O.A
  // keep their dash, and must never be relabelled as a gap in our records.
  assert.equal(priceUnknown({ price: null }), false);
  assert.equal(priceUnknown({ price: null, needs: [{ what: "ingredients" }] }), false);
});

test("priceUnknown: a real price always wins over a stale needs entry", () => {
  // validate.py errors on this combination, but the renderer must not show a
  // "?" where a number exists even if bad data slips through.
  assert.equal(priceUnknown({ price: 12.5, needs: [{ what: "price" }] }), false);
  assert.equal(priceUnknown({ price: 0, needs: [{ what: "price" }] }), false);
});

test("NEED_KINDS is frozen — the closed set is not editable at a call site", () => {
  assert.throws(() => NEED_KINDS.push("vibes"), TypeError);
});
