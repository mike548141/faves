// Unit tests for site/js/cook.js — cook mode's step machine and wake-lock
// lifecycle (ROADMAP 17d, ADR 0034). Run: `node --test`.
//
// WHAT THIS CAN AND CANNOT PROVE. The step machine is pure, so it is proved
// outright. The wake lock is driven through an injected fake shaped like
// `navigator.wakeLock`, which proves our *lifecycle* — request once, re-acquire
// after the OS takes it back, release on close, stay silent when unsupported —
// but it cannot prove the browser actually keeps the screen on. That is a
// platform behaviour and only a real device shows it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  canCook,
  clampIndex,
  createWakeLock,
  keyToIndex,
  stepLabel,
  stepState,
  stepsOf,
} from "../site/js/cook.js";

// --- Which recipes can be cooked from -------------------------------------

test("a recipe is cookable only when it has real steps", () => {
  assert.equal(canCook({ steps: ["Mix", "Bake"] }), true);
  assert.equal(canCook({ steps: [] }), false);
  assert.equal(canCook({}), false);
  assert.equal(canCook(null), false);
  // Booth's Ginger Crunch is the 1-of-24 with ingredients but no method.
  assert.equal(canCook({ ingredients: ["butter"], steps: [] }), false);
});

test("blank and non-string steps are dropped, not counted", () => {
  assert.deepEqual(stepsOf({ steps: ["Mix", "", "  ", null, 7, "Bake"] }), ["Mix", "Bake"]);
  assert.deepEqual(stepsOf({ steps: "Mix" }), []);
  assert.deepEqual(stepsOf(undefined), []);
});

// --- Boundaries ------------------------------------------------------------

test("clampIndex holds inside the recipe at both ends", () => {
  assert.equal(clampIndex(-5, 9), 0);
  assert.equal(clampIndex(0, 9), 0);
  assert.equal(clampIndex(8, 9), 8);
  assert.equal(clampIndex(99, 9), 8);
  assert.equal(clampIndex(3.7, 9), 3);
  assert.equal(clampIndex(NaN, 9), 0);
  assert.equal(clampIndex(2, 0), 0);
});

test("advance saturates rather than wrapping — step 9 never becomes step 1", () => {
  assert.equal(advance(0, 9, 1), 1);
  assert.equal(advance(8, 9, 1), 8);
  assert.equal(advance(0, 9, -1), 0);
  assert.equal(advance(4, 9, -1), 3);
  assert.equal(advance(4, 9, 0), 4);
  assert.equal(advance(4, 9, undefined), 4);
});

test("stepState reports the ends, which is what turns Next into Done", () => {
  assert.deepEqual(stepState(0, 9), {
    index: 0, count: 9, number: 1, atFirst: true, atLast: false, label: "Step 1 of 9",
  });
  assert.deepEqual(stepState(8, 9), {
    index: 8, count: 9, number: 9, atFirst: false, atLast: true, label: "Step 9 of 9",
  });
  // A single-step recipe is both ends at once: no Back, and Done immediately.
  const one = stepState(0, 1);
  assert.equal(one.atFirst, true);
  assert.equal(one.atLast, true);
  // Nothing to cook: pinned, and never claims a step number.
  const none = stepState(3, 0);
  assert.deepEqual([none.index, none.count, none.number, none.atLast], [0, 0, 0, true]);
});

test("the counter reads as a person would say it", () => {
  assert.equal(stepLabel(0, 9), "Step 1 of 9");
  assert.equal(stepLabel(2, 9), "Step 3 of 9");
  assert.equal(stepLabel(50, 9), "Step 9 of 9");
  assert.equal(stepLabel(0, 0), "No steps");
});

// --- Keyboard --------------------------------------------------------------

test("arrow keys move a step, Home/End jump the ends, everything else is ours to ignore", () => {
  assert.equal(keyToIndex("ArrowRight", 3, 9), 4);
  assert.equal(keyToIndex("ArrowDown", 3, 9), 4);
  assert.equal(keyToIndex("ArrowLeft", 3, 9), 2);
  assert.equal(keyToIndex("ArrowUp", 3, 9), 2);
  assert.equal(keyToIndex("Home", 3, 9), 0);
  assert.equal(keyToIndex("End", 3, 9), 8);
  // Saturating, same as the buttons.
  assert.equal(keyToIndex("ArrowRight", 8, 9), 8);
  assert.equal(keyToIndex("ArrowLeft", 0, 9), 0);
  // Not ours: Escape belongs to <dialog>, Tab to the focus ring, Enter/Space
  // to whichever button has focus.
  for (const k of ["Escape", "Tab", "Enter", " ", "a", "PageDown"]) {
    assert.equal(keyToIndex(k, 3, 9), null, k);
  }
});

// --- Wake lock -------------------------------------------------------------

/** A `navigator.wakeLock`-shaped fake with an OS that can take the lock back. */
function fakeWakeLock({ fail = false } = {}) {
  const sentinels = [];
  let requests = 0;
  const api = {
    request: async (type) => {
      requests++;
      if (fail) throw new DOMException("denied", "NotAllowedError");
      const listeners = [];
      const s = {
        type,
        released: false,
        addEventListener: (name, fn) => {
          if (name === "release") listeners.push(fn);
        },
        release: async () => {
          s.released = true;
          for (const fn of listeners) fn();
        },
        /** The OS taking it back (page hidden, battery saver). */
        dropped: () => {
          s.released = true;
          for (const fn of listeners) fn();
        },
      };
      sentinels.push(s);
      return s;
    },
  };
  return { api, sentinels, requests: () => requests, live: () => sentinels.filter((s) => !s.released) };
}

test("unsupported degrades silently — no throw, and it never claims a hold", async () => {
  const lock = createWakeLock({ wakeLock: undefined });
  assert.equal(lock.supported(), false);
  assert.deepEqual(await lock.acquire(), { ok: false, reason: "unsupported" });
  assert.equal(lock.held(), false);
  // Still remembers it was wanted, so nothing downstream has to special-case it.
  assert.equal(lock.wanted(), true);
  assert.deepEqual(await lock.release(), { ok: true, reason: "idle" });
  assert.equal(lock.wanted(), false);
});

test("a refused request degrades silently too", async () => {
  const fake = fakeWakeLock({ fail: true });
  const lock = createWakeLock({ wakeLock: fake.api });
  assert.deepEqual(await lock.acquire(), { ok: false, reason: "denied" });
  assert.equal(lock.held(), false);
  // And it can be asked again later — a refusal is not a permanent poison.
  assert.deepEqual(await lock.acquire(), { ok: false, reason: "denied" });
  assert.equal(fake.requests(), 2);
});

test("acquire takes exactly one lock, however many times it is asked", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  assert.deepEqual(await lock.acquire(), { ok: true, reason: "acquired" });
  assert.equal(lock.held(), true);
  assert.deepEqual(await lock.acquire(), { ok: true, reason: "held" });
  assert.equal(fake.requests(), 1);
});

test("two concurrent acquires do not leak a second lock", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  const [a, b] = await Promise.all([lock.acquire(), lock.acquire()]);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(fake.requests(), 1, "one request, not two");
  assert.equal(fake.live().length, 1);
});

test("closing cook mode gives the lock back", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  await lock.acquire();
  assert.deepEqual(await lock.release(), { ok: true, reason: "released" });
  assert.equal(lock.held(), false);
  assert.equal(lock.wanted(), false);
  assert.equal(fake.live().length, 0);
  // Idempotent: a second close (Escape then ✕, say) is a no-op, not a crash.
  assert.deepEqual(await lock.release(), { ok: true, reason: "idle" });
});

test("the OS taking the lock back is noticed, so held() stops lying", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  await lock.acquire();
  fake.sentinels[0].dropped();
  assert.equal(lock.held(), false);
  assert.equal(lock.wanted(), true, "cook mode still wants it");
});

test("hidden then visible re-acquires — the lock is NOT restored by the OS", async () => {
  const fake = fakeWakeLock();
  let visible = true;
  const lock = createWakeLock({ wakeLock: fake.api, isVisible: () => visible });
  await lock.acquire();
  assert.equal(fake.requests(), 1);

  // Phone call arrives: the page hides and the platform releases the lock.
  visible = false;
  fake.sentinels[0].dropped();
  assert.deepEqual(await lock.onVisibilityChange(), { ok: false, reason: "hidden" });
  assert.equal(lock.held(), false);
  assert.equal(fake.requests(), 1, "never request while hidden — the spec rejects it");

  // Back to the recipe: this is the re-acquire that makes cook mode survive.
  visible = true;
  assert.deepEqual(await lock.onVisibilityChange(), { ok: true, reason: "acquired" });
  assert.equal(lock.held(), true);
  assert.equal(fake.requests(), 2);
  assert.equal(fake.live().length, 1);
});

test("hiding hands the lock back, not just the reference to it", async () => {
  // Found in headless Chrome, not in a unit test: faking `hidden` without the
  // platform actually releasing left a sentinel nothing referenced, and close
  // then released only the *re-acquired* lock. Hiding must release.
  const fake = fakeWakeLock();
  let visible = true;
  const lock = createWakeLock({ wakeLock: fake.api, isVisible: () => visible });
  await lock.acquire();
  visible = false; // …and the platform does NOT release on its own here
  await lock.onVisibilityChange();
  assert.equal(fake.live().length, 0, "the first lock was handed back");
  visible = true;
  await lock.onVisibilityChange();
  await lock.release();
  assert.equal(fake.live().length, 0, "no lock survives the close");
  assert.equal(fake.requests(), 2);
});

test("closing during an in-flight request doesn't strand the lock", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  const opening = lock.acquire();
  // The user shuts cook mode before the request resolves.
  await lock.release();
  assert.deepEqual(await opening, { ok: false, reason: "abandoned" });
  assert.equal(lock.held(), false);
  assert.equal(fake.live().length, 0, "the arriving sentinel was released, not kept");
});

test("a visibilitychange after close never resurrects the lock", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  await lock.acquire();
  await lock.release();
  assert.deepEqual(await lock.onVisibilityChange(), { ok: false, reason: "not-wanted" });
  assert.equal(fake.requests(), 1);
  assert.equal(fake.live().length, 0);
});

test("a visibilitychange while still held is a no-op, not a second lock", async () => {
  const fake = fakeWakeLock();
  const lock = createWakeLock({ wakeLock: fake.api });
  await lock.acquire();
  assert.deepEqual(await lock.onVisibilityChange(), { ok: true, reason: "held" });
  assert.equal(fake.requests(), 1);
});

test("visibilitychange on an unsupported browser stays silent", async () => {
  const lock = createWakeLock({ wakeLock: undefined });
  await lock.acquire();
  assert.deepEqual(await lock.onVisibilityChange(), { ok: false, reason: "unsupported" });
});
