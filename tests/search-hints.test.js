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
  const classes = new Set();
  return {
    value: "",
    placeholder: "",
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    faded: () => classes.has("hint-fading"),
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

function harness({ reduced = false, hints = ["one", "two", "three"], fade } = {}) {
  let tick = null;
  let pending = null;
  let cleared = 0;
  let delay = null;
  const input = fakeInput();
  const api = rotateHints(input, hints, {
    setInterval: (fn, ms) => {
      tick = fn;
      delay = ms;
      return 1;
    },
    clearInterval: () => {
      cleared += 1;
      tick = null;
    },
    setTimeout: (fn) => {
      pending = fn;
      return 2;
    },
    clearTimeout: () => {
      pending = null;
    },
    reducedMotion: () => reduced,
    ...(fade === undefined ? {} : { fade }),
  });
  return {
    input,
    api,
    // The interval only *starts* the fade; the swap lands when the fade
    // timeout runs. A full cycle is both, which is what `advance` models.
    startFade: () => tick && tick(),
    endFade: () => pending && pending(),
    advance: () => {
      if (tick) tick();
      if (pending) pending();
    },
    pendingFade: () => pending !== null,
    running: () => tick !== null,
    cleared: () => cleared,
    delay: () => delay,
  };
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

// ─── Cross-fade (owner: 4s read as restless; fade rather than snap) ─────────

test("a hint holds well past four seconds", () => {
  // The owner's complaint was pace, so the pace is asserted rather than left
  // to a constant nobody reads.
  const { delay } = harness();
  assert.ok(delay() >= 6000, `interval is ${delay()}ms, expected a slow hold`);
});

test("the placeholder fades out BEFORE the text changes", () => {
  const { input, startFade } = harness();
  startFade();
  assert.equal(input.faded(), true, "faded out");
  assert.equal(input.placeholder, "one", "text has not swapped yet");
});

test("the text swaps under cover, then fades back in", () => {
  const { input, startFade, endFade } = harness();
  startFade();
  endFade();
  assert.equal(input.placeholder, "two", "new text is in place");
  assert.equal(input.faded(), false, "and the fade class is off, so it fades in");
});

test("focus mid-fade never leaves the placeholder invisible", () => {
  // The one unacceptable outcome: someone taps the box during the 450ms the
  // text is transparent and is left staring at an empty field.
  const { input, startFade, pendingFade } = harness();
  startFade();
  assert.equal(input.faded(), true);
  input.fire("focus");
  assert.equal(input.faded(), false, "fade class removed on pause");
  assert.equal(pendingFade(), false, "and the pending swap is cancelled");
});

test("typing mid-fade also restores visibility", () => {
  const { input, startFade } = harness();
  startFade();
  input.value = "l";
  input.fire("input");
  assert.equal(input.faded(), false);
});

test("stop() mid-fade restores visibility", () => {
  const { input, api, startFade } = harness();
  startFade();
  api.stop();
  assert.equal(input.faded(), false);
});

test("fades do not stack if a tick lands while one is running", () => {
  const { input, startFade, endFade } = harness();
  startFade();
  startFade(); // a second interval tick arrives mid-fade
  endFade();
  assert.equal(input.placeholder, "two", "advanced exactly one hint, not two");
});

test("a field focused during the fade does not swap when it completes", () => {
  const { input, startFade, endFade } = harness();
  startFade();
  globalThis.document.activeElement = input;
  endFade();
  globalThis.document.activeElement = null;
  assert.equal(input.placeholder, "one", "text left alone");
  assert.equal(input.faded(), false, "but visible again");
});

test("fade: 0 swaps instantly, with no class and no timeout", () => {
  const { input, startFade, pendingFade } = harness({ fade: 0 });
  startFade();
  assert.equal(input.placeholder, "two");
  assert.equal(input.faded(), false);
  assert.equal(pendingFade(), false);
});
