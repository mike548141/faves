// Unit tests for the pure half of site/js/ui-state.js — the logic that lets the
// menu's SAFETY re-render (menu.js reapply → the same render() the first paint
// uses) hand the viewer back their search query, dietary-chip toggles and
// scroll position without forking that render.
//
// The DOM glue (captureUiState / restoreUiState) is deliberately thin and only
// replays normal handlers; what needs pinning is the decision logic underneath:
// which chip toggles are the viewer's own (vs their stored preference), which
// of those still apply after a re-render, and how a remembered scroll offset
// lands in a page that may have changed height. Every one of these must degrade
// rather than throw — a convenience feature must never be able to interrupt the
// allergen re-apply it rides behind.
//
// Run: `node --test tests/` (or `npm test`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { chipDelta, chipsToToggle, clampScroll } from "../site/js/ui-state.js";

// --- chipDelta -------------------------------------------------------
test("chipDelta: chips matching the pre-selection are not the viewer's doing", () => {
  const chips = [
    { key: "v", pressed: true },
    { key: "gf", pressed: false },
  ];
  assert.deepEqual(chipDelta(chips, ["v"]), []);
});

test("chipDelta: records a chip switched on that prefs did not pre-select", () => {
  const chips = [
    { key: "v", pressed: false },
    { key: "gf", pressed: true },
  ];
  assert.deepEqual(chipDelta(chips, []), [{ key: "gf", on: true }]);
});

test("chipDelta: records a pre-selected chip the viewer switched off", () => {
  const chips = [{ key: "vg", pressed: false }];
  assert.deepEqual(chipDelta(chips, ["vg"]), [{ key: "vg", on: false }]);
});

test("chipDelta: a preference for a filter this menu can't offer is ignored", () => {
  // `df` is pre-selected but no dish carries the tag, so no chip is rendered.
  const chips = [{ key: "v", pressed: true }];
  assert.deepEqual(chipDelta(chips, ["v", "df"]), []);
});

test("chipDelta: missing/rubbish input degrades to no delta", () => {
  assert.deepEqual(chipDelta(null, ["v"]), []);
  assert.deepEqual(chipDelta([], null), []);
  assert.deepEqual(chipDelta([null, {}, { key: 7, pressed: true }], []), []);
});

test("chipDelta: absent `pressed` counts as off, not as a toggle", () => {
  assert.deepEqual(chipDelta([{ key: "v" }], []), []);
  assert.deepEqual(chipDelta([{ key: "v" }], ["v"]), [{ key: "v", on: false }]);
});

// --- chipsToToggle ---------------------------------------------------
test("chipsToToggle: clicks the chips whose new state isn't what the viewer chose", () => {
  const rerendered = [
    { key: "v", pressed: true }, // pref still pre-selects it
    { key: "gf", pressed: false },
  ];
  const delta = [
    { key: "v", on: false }, // they'd turned it off by hand
    { key: "gf", on: true }, // and turned this one on
  ];
  assert.deepEqual(chipsToToggle(rerendered, delta), ["v", "gf"]);
});

test("chipsToToggle: a settings change that already produced the wanted state clicks nothing", () => {
  // They'd toggled `vg` on ad hoc, then set Vegan as a stored preference — the
  // re-render pre-selects it, so re-clicking would perversely turn it off.
  const rerendered = [{ key: "vg", pressed: true }];
  assert.deepEqual(chipsToToggle(rerendered, [{ key: "vg", on: true }]), []);
});

test("chipsToToggle: a chip that no longer exists is dropped, not chased", () => {
  const rerendered = [{ key: "v", pressed: false }];
  const delta = [{ key: "df", on: true }];
  assert.deepEqual(chipsToToggle(rerendered, delta), []);
});

test("chipsToToggle: returns keys in rendered order, not delta order", () => {
  const rerendered = [
    { key: "v", pressed: false },
    { key: "vg", pressed: false },
    { key: "gf", pressed: false },
  ];
  const delta = [
    { key: "gf", on: true },
    { key: "v", on: true },
  ];
  assert.deepEqual(chipsToToggle(rerendered, delta), ["v", "gf"]);
});

test("chipsToToggle: missing/rubbish input degrades to no clicks", () => {
  assert.deepEqual(chipsToToggle(null, [{ key: "v", on: true }]), []);
  assert.deepEqual(chipsToToggle([{ key: "v", pressed: false }], null), []);
  assert.deepEqual(chipsToToggle([null, undefined], [{ key: "v", on: true }]), []);
});

test("chipDelta → chipsToToggle round-trips when nothing else changed", () => {
  // The common case: an allergen pref flipped, so the chip row re-renders from
  // the same dietary prefs and the viewer's ad-hoc toggles must all come back.
  const preselect = ["v"];
  const before = [
    { key: "v", pressed: false }, // turned off by hand
    { key: "gf", pressed: true }, // turned on by hand
    { key: "df", pressed: false },
  ];
  const delta = chipDelta(before, preselect);
  const after = before.map((c) => ({ key: c.key, pressed: preselect.includes(c.key) }));
  const clicks = chipsToToggle(after, delta);
  assert.deepEqual(clicks, ["v", "gf"]);
  // Applying those clicks reproduces the pre-re-render row exactly.
  const applied = after.map((c) => ({
    key: c.key,
    pressed: clicks.includes(c.key) ? !c.pressed : c.pressed,
  }));
  assert.deepEqual(applied, before);
});

// --- clampScroll -----------------------------------------------------
test("clampScroll: an offset that still fits is kept", () => {
  assert.equal(clampScroll(400, 1200), 400);
  assert.equal(clampScroll(1200, 1200), 1200);
});

test("clampScroll: a shorter page pins to its own bottom", () => {
  assert.equal(clampScroll(2000, 800), 800);
});

test("clampScroll: an unscrollable page goes to the top", () => {
  assert.equal(clampScroll(500, 0), 0);
  assert.equal(clampScroll(500, -10), 0);
});

test("clampScroll: rubbish input degrades to the top", () => {
  assert.equal(clampScroll(NaN, 1000), 0);
  assert.equal(clampScroll(Infinity, 1000), 0);
  assert.equal(clampScroll(-50, 1000), 0);
  assert.equal(clampScroll(undefined, 1000), 0);
  assert.equal(clampScroll(300, NaN), 0);
  assert.equal(clampScroll(300, Infinity), 0);
});
