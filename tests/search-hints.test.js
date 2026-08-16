// Rotating search placeholder. The interesting cases are all about *not*
// rotating: reduced motion, focus, and a field with text in it. A hint that
// changes while someone is reading or typing reads as a bug, and the whole
// point of injecting the timer is that those paths can be asserted rather
// than eyeballed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rotateHints, defaultHints } from "../site/js/search-hints.js";

// A minimal input stand-in: enough DOM surface for the module, no jsdom.
function fakeInput() {
  const handlers = {};
  return {
    value: "",
    placeholder: "",
    addEventListener: (ev, fn) => {
      (handlers[ev] ||= []).push(fn);
    },
    removeEventListener: (ev, fn) => {
      handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn);
    },
    fire: (ev) => (handlers[ev] || []).forEach((f) => f()),
    handlers,
  };
}

function harness({ reduced = false, hints = ["one", "two", "three"] } = {}) {
  let tick = null;
  let cleared = 0;
  const input = fakeInput();
  const api = rotateHints(input, hints, {
    setInterval: (fn) => {
      tick = fn;
      return 1;
    },
    clearInterval: () => {
      cleared += 1;
      tick = null;
    },
    reducedMotion: () => reduced,
  });
  return { input, api, advance: () => tick && tick(), running: () => tick !== null, cleared: () => cleared };
}

// `document` is referenced by the tick guard; give it a null activeElement.
globalThis.document ||= { activeElement: null };

test("shows the first hint immediately", () => {
  const { input } = harness();
  assert.equal(input.placeholder, "one");
});

test("advances through the list and wraps", () => {
  const { input, advance } = harness();
  advance();
  assert.equal(input.placeholder, "two");
  advance();
  assert.equal(input.placeholder, "three");
  advance();
  assert.equal(input.placeholder, "one", "wraps back to the start");
});

test("reduced motion pins the first hint and starts no timer", () => {
  const { input, running } = harness({ reduced: true });
  assert.equal(input.placeholder, "one");
  assert.equal(running(), false, "no timer is ever created");
});

test("a single hint never starts a timer", () => {
  const { input, running } = harness({ hints: ["only"] });
  assert.equal(input.placeholder, "only");
  assert.equal(running(), false);
});

test("focus pauses the rotation", () => {
  const { input, running } = harness();
  input.fire("focus");
  assert.equal(running(), false);
  input.fire("blur");
  assert.equal(running(), true, "blur on an empty field resumes");
});

test("blur with text in the field does not resume", () => {
  const { input, running } = harness();
  input.fire("focus");
  input.value = "laksa";
  input.fire("blur");
  assert.equal(running(), false);
});

test("typing pauses it", () => {
  const { input, running } = harness();
  input.value = "l";
  input.fire("input");
  assert.equal(running(), false);
});

test("a stale tick cannot overwrite a field with text", () => {
  const { input, advance } = harness();
  input.value = "laksa";
  advance();
  assert.equal(input.placeholder, "one", "placeholder is left alone");
});

test("a stale tick cannot overwrite a focused field", () => {
  const { input, advance } = harness();
  globalThis.document.activeElement = input;
  advance();
  globalThis.document.activeElement = null;
  assert.equal(input.placeholder, "one");
});

test("stop is idempotent and detaches the focus handler", () => {
  const { input, api, running } = harness();
  api.stop();
  api.stop();
  assert.equal(running(), false);
  assert.equal((input.handlers.focus || []).length, 0);
});

test("an empty hint list is inert rather than throwing", () => {
  const input = fakeInput();
  const api = rotateHints(input, [], {});
  assert.equal(api.current(), "");
  api.stop();
});

test("defaultHints falls back to the English when no translation exists", () => {
  const hints = defaultHints((_key, english) => english);
  assert.ok(hints.length >= 6, "covers several distinct searchable kinds");
  assert.ok(hints.every((h) => typeof h === "string" && h.length > 0));
  // Each hint must name a kind the index actually holds — the honesty rule.
  const joined = hints.join(" ").toLowerCase();
  for (const kind of ["dish", "ingredient", "vegan", "takeaway", "phone"]) {
    assert.ok(joined.includes(kind), `hints mention ${kind}`);
  }
});
