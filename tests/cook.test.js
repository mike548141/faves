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
  createSpeaker,
  createTimer,
  createTimerStore,
  createWakeLock,
  formatDuration,
  ingredientTerms,
  ingredientsForStep,
  keyToIndex,
  stepDuration,
  stepLabel,
  stepState,
  stepUsesIngredients,
  stepsOf,
  sanitiseTimers,
  timerKey,
  TIMER_GRACE_MS,
  TIMERS_KEY,
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

// --- What a step needs ----------------------------------------------------
// The rule errs one way on purpose: showing an ingredient that isn't needed is
// a blemish, hiding one that is needed is a ruined dish. Every case below that
// asserts a HIDE is a step that genuinely names nothing from the list.

// Chocolate Self-Saucing Pudding's real list, ALL of it. The sauce's cocoa was
// missing from this fixture until 2026-08-17, and its absence is what let the
// ambiguity rule look correct here while hiding the cocoa line on the actual
// recipe: with one cocoa the word is unique and usable, with two it is neither.
// A guard whose fixture excludes the failing case agrees with its author rather
// than with the corpus, so the line is now here and pinned by the test below.
const PUDDING = [
  "¾ cup (190 ml) white sugar",
  "100g butter, softened",
  "1 egg",
  "1 tsp (5 ml) vanilla essence",
  "1¼ cups (310 ml) white flour",
  "2 tsp (10 ml) baking powder",
  "1 tbsp (15 ml) cocoa",
  "Water or milk, as required for a thick batter",
  "Sauce: ½ cup (125 ml) brown sugar",
  "Sauce: ¼ cup (60 ml) cocoa",
  "Sauce: 1 tbsp (15 ml) cornflour",
  "Sauce: 2 cups (500 ml) boiling water",
];

test("ingredientTerms strips quantity, packaging and preparation", () => {
  assert.deepEqual(ingredientTerms("100g butter, softened"), ["butter"]);
  // The group label is a heading, not a thing you add.
  assert.deepEqual(ingredientTerms("Sauce: ½ cup (125 ml) brown sugar"), [
    "brown sugar",
    "brown",
    "sugar",
  ]);
  // "or" splits into two real alternatives, both searchable.
  assert.ok(ingredientTerms("Water or milk, as required for a thick batter").includes("water"));
  assert.ok(ingredientTerms("Water or milk, as required for a thick batter").includes("milk"));
});

test("a step that only preheats needs nothing — the owner's case", () => {
  // The trap: "baking powder" is an ingredient and this step says "baking
  // paper". Matching the FIRST word of a phrase would wrongly claim it.
  const step = "Preheat the oven to 180°C and line a 1.5–2L ovenproof dish with baking paper, or grease it.";
  assert.deepEqual(ingredientsForStep(step, PUDDING), []);
  assert.equal(stepUsesIngredients(step, PUDDING), false);
});

test("a step lists only what it names, not the whole recipe", () => {
  const got = ingredientsForStep("Beat together the white sugar, softened butter, egg and vanilla.", PUDDING);
  assert.deepEqual(got, [
    "¾ cup (190 ml) white sugar",
    "100g butter, softened",
    "1 egg",
    "1 tsp (5 ml) vanilla essence",
  ]);
  // Emphatically NOT the sauce, the flour or the baking powder.
  assert.ok(!got.some((l) => l.startsWith("Sauce:")));
});

test("a shared word the step names shows EVERY line that carries it", () => {
  // The bug the cold review found on three real recipes. This pudding lists
  // cocoa twice, so "cocoa" tells the two lines apart for nobody — and the rule
  // used to answer that by showing NEITHER, on a step whose only ingredient is
  // cocoa. Both is the honest answer to "I can't tell which"; none is the bias
  // inverted, and the reader is at the bench.
  const got = ingredientsForStep("Sprinkle over the brown sugar, cocoa and cornflour.", PUDDING);
  assert.ok(got.includes("1 tbsp (15 ml) cocoa"));
  assert.ok(got.includes("Sauce: ¼ cup (60 ml) cocoa"));
  // …and the phrase-matched lines beside them are unaffected.
  assert.ok(got.includes("Sauce: ½ cup (125 ml) brown sugar"));
  assert.ok(got.includes("Sauce: 1 tbsp (15 ml) cornflour"));
  assert.ok(!got.includes("¾ cup (190 ml) white sugar"), "brown sugar is not white sugar");
});

test("a step that names the specific line does NOT drag its namesakes in", () => {
  // The guard that keeps the fallback above honest: "white sugar" answers
  // "sugar" for this step, so the sauce's brown sugar has no claim on it. It is
  // the step's own specificity that decides, never a count.
  const got = ingredientsForStep("Beat together the white sugar, softened butter, egg and vanilla.", PUDDING);
  assert.ok(got.includes("¾ cup (190 ml) white sugar"));
  assert.ok(!got.some((l) => l.startsWith("Sauce:")));
  // "white" is shared with the flour, and the flour is not in this step.
  assert.ok(!got.includes("1¼ cups (310 ml) white flour"));
});

test("plural ingredient vs singular instruction still matches", () => {
  // Both were wrongly hidden before stemming was added.
  assert.ok(stepUsesIngredients("Beat the egg whites to soft peaks.", ["3 eggs, separated"]));
  assert.ok(stepUsesIngredients("Pour the batter over the plum wedges.", ["4 prune plums, not peeled"]));
});

test("a step that asks for 'the ingredients' by name gets all of them", () => {
  const step = "For the sauce, place all the sauce ingredients in a pot and boil.";
  assert.deepEqual(ingredientsForStep(step, PUDDING), PUDDING);
});

test("unparseable or absent ingredients never hide anything", () => {
  assert.deepEqual(ingredientsForStep("Bake it.", []), []);
  // Nothing survives the measure-word filter → show the lot rather than guess.
  assert.deepEqual(ingredientsForStep("Bake it.", ["2 cups", "a pinch"]), ["2 cups", "a pinch"]);
});

// --- Step durations and the timer -----------------------------------------

test("stepDuration reads a stated time and refuses everything else", () => {
  assert.equal(stepDuration("Bake at 180°C for 35 minutes, or until cooked through."), 35 * 60);
  assert.equal(stepDuration("Cook on low for 8 hours."), 8 * 3600);
  // A range times its LOWER bound — come back early and look.
  assert.equal(stepDuration("Bake a further 5–8 minutes until golden."), 5 * 60);
  // None of these is a duration, and each has burned a naive parser.
  assert.equal(stepDuration("Preheat the oven to 180°C."), null);
  assert.equal(stepDuration("Prepare a 20cm cake tin."), null);
  assert.equal(stepDuration("Put the mixture into greased patty tins (makes 21)."), null);
  assert.equal(stepDuration("Roll out to about 4–5mm and cut."), null);
  assert.equal(stepDuration("Cover and rest in the fridge overnight."), null);
  assert.equal(stepDuration("Beat together the sugar and butter."), null);
});

test("stepDuration times the FIRST leg only, not the sum", () => {
  // "12 minutes, then a further 5–8" is two decisions; timing 20 would be wrong
  // about both.
  assert.equal(
    stepDuration("Bake for about 12 minutes, brush again, then bake a further 5–8 minutes."),
    12 * 60
  );
});

test("formatDuration reads as a clock", () => {
  assert.equal(formatDuration(35 * 60), "35:00");
  assert.equal(formatDuration(3900), "1:05:00");
  assert.equal(formatDuration(0), "0:00");
});

test("the timer starts, pauses and resumes off the wall clock", () => {
  let now = 1_000_000;
  const t = createTimer(600, () => now);
  assert.equal(t.remaining(), 600);
  assert.equal(t.running(), false);

  t.toggle(); // start
  assert.equal(t.running(), true);
  now += 60_000; // a minute passes
  assert.equal(t.remaining(), 540);

  t.toggle(); // pause
  assert.equal(t.running(), false);
  now += 300_000; // five minutes pass while paused — must not count
  assert.equal(t.remaining(), 540);

  t.toggle(); // resume
  now += 40_000;
  assert.equal(t.remaining(), 500);
  t.reset();
  assert.equal(t.remaining(), 600);
  assert.equal(t.running(), false);
});

test("a backgrounded phone comes back with the right number, not a frozen one", () => {
  // The whole reason the timer stores an end time instead of decrementing: no
  // interval fires while the screen is off, and a counter would come back slow.
  let now = 0;
  const t = createTimer(300, () => now);
  t.start();
  now += 400_000; // longer than the timer, with nothing ticking
  assert.equal(t.remaining(), 0);
  assert.equal(t.done(), true);
  assert.equal(t.running(), false); // finished is not running
});

// --- A running timer outlives the sheet (Theme 36) ------------------------
//
// What these prove: the RECORD — written on the tap, read back as a running
// countdown, expired once it is stale. What they cannot prove is the thing the
// item is actually about, that a timer survives a real sheet close and a real
// reload; that is a browser fact and it is asserted in tools/cook_check.mjs.

/** localStorage's shape, with no browser. */
function fakeStorage(seed = {}) {
  const mem = new Map(Object.entries(seed));
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    _mem: mem,
  };
}

test("a timer handed a stored end time comes back RUNNING", () => {
  let now = 1_000_000;
  const t = createTimer(600, () => now, { endsAt: now + 200_000 });
  assert.equal(t.running(), true);
  assert.equal(t.remaining(), 200);
  now += 100_000;
  assert.equal(t.remaining(), 100);
});

test("a stored end time already past comes back DONE, not restarted", () => {
  const now = 5_000_000;
  const t = createTimer(600, () => now, { endsAt: now - 30_000 });
  assert.equal(t.remaining(), 0);
  assert.equal(t.done(), true);
  assert.equal(t.running(), false);
});

test("a stored end time beyond the step's own length is capped, not painted past 100%", () => {
  // The recipe data said 35 minutes when the timer started and says 10 now.
  const now = 2_000_000;
  const t = createTimer(600, () => now, { endsAt: now + 35 * 60_000 });
  assert.equal(t.remaining(), 600);
  assert.ok(t.remaining() <= t.total);
});

test("no stored end time leaves the timer exactly as it always was", () => {
  const t = createTimer(600, () => 0);
  assert.equal(t.running(), false);
  assert.equal(t.endsAt(), null);
  assert.equal(t.remaining(), 600);
});

test("the store remembers a running timer per recipe and step", () => {
  let now = 10_000_000;
  const store = createTimerStore(fakeStorage(), () => now);
  store.start("cook-at-home pudding", 5, now + 600_000);
  assert.deepEqual(store.get("cook-at-home pudding", 5), { endsAt: now + 600_000 });
  // Another step of the same recipe, and the same step of another recipe, are
  // different timers — the key carries both.
  assert.equal(store.get("cook-at-home pudding", 4), null);
  assert.equal(store.get("cook-at-home ribs", 5), null);
  assert.deepEqual(store.steps("cook-at-home pudding"), [5]);
  store.clear("cook-at-home pudding", 5);
  assert.equal(store.get("cook-at-home pudding", 5), null);
  assert.deepEqual(store.steps("cook-at-home pudding"), []);
});

test("a timer whose bell has long gone does not ring on a return three days later", () => {
  let now = 10_000_000;
  const storage = fakeStorage();
  const store = createTimerStore(storage, () => now);
  store.start("r", 1, now + 60_000);
  now += 60_000 + TIMER_GRACE_MS - 1;
  assert.ok(store.get("r", 1), "inside the hour it is still waiting for you");
  now += 2;
  assert.equal(store.get("r", 1), null, "past the hour it is gone");
});

test("a record carries a wall clock and nothing else", () => {
  // Nothing about whether the bell has gone: cook-ui clears the record AS it
  // rings, because a stored countdown at 00:00 comes back with its toggle
  // disabled and hands the reader a dead control.
  const now = 10_000_000;
  const store = createTimerStore(fakeStorage(), () => now);
  store.start("r", 2, now + 1000);
  assert.deepEqual(store.get("r", 2), { endsAt: now + 1000 });
  assert.deepEqual(sanitiseTimers({ "r|2": { endsAt: now + 1000, rung: true } }, { now }), {
    "r|2": { endsAt: now + 1000 },
  });
});

test("the store never throws on nonsense, and drops what it can't read", () => {
  const now = 1_000_000;
  assert.deepEqual(sanitiseTimers(null, { now }), {});
  assert.deepEqual(sanitiseTimers([1, 2], { now }), {});
  assert.deepEqual(sanitiseTimers({ "r|0": { endsAt: "soon" } }, { now }), {});
  // A clock that jumped, or a hand-edited file: no step states more than a day.
  assert.deepEqual(sanitiseTimers({ "r|0": { endsAt: now + 8 * 86_400_000 } }, { now }), {});
  const store = createTimerStore(fakeStorage({ [TIMERS_KEY]: "{not json" }), () => now);
  assert.equal(store.get("r", 0), null);
  assert.deepEqual(store.steps("r"), []);
});

test("the key is stable and the last timer takes the key away with it", () => {
  const now = 1_000_000;
  const storage = fakeStorage();
  const store = createTimerStore(storage, () => now);
  assert.equal(timerKey("venue dish", 3), "venue dish|3");
  store.start("venue dish", 3, now + 1000);
  assert.ok(storage._mem.has(TIMERS_KEY));
  store.clear("venue dish", 3);
  assert.equal(storage._mem.has(TIMERS_KEY), false, "no empty object left behind");
});

test("a blocked storage costs the timer, never an exception", () => {
  const blocked = {
    getItem: () => { throw new Error("denied"); },
    setItem: () => { throw new Error("denied"); },
    removeItem: () => { throw new Error("denied"); },
  };
  const store = createTimerStore(blocked, () => 0);
  assert.equal(store.get("r", 0), null);
  assert.doesNotThrow(() => store.start("r", 0, 1000));
  assert.doesNotThrow(() => store.clear("r", 0));
  assert.doesNotThrow(() => store.steps("r"));
});

// --- Reading the step aloud (ROADMAP 17e) ---------------------------------
//
// Driven through an injected fake shaped like `speechSynthesis`, which proves
// the LIFECYCLE — one utterance at a time, cancelled on every exit, silent
// where the API is absent. What it cannot prove is that any sound comes out,
// which voice says it, or whether that voice was fetched over the network. The
// last of those is the honest limitation recorded in cook.js.

function fakeSynth() {
  const calls = { speak: [], cancel: 0 };
  return {
    calls,
    synth: {
      speak: (u) => calls.speak.push(u),
      cancel: () => {
        calls.cancel += 1;
      },
    },
    Utterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  };
}

test("no speechSynthesis means unsupported, never an error", () => {
  const s = createSpeaker({ synth: undefined, Utterance: undefined });
  assert.equal(s.supported(), false);
  assert.deepEqual(s.speak("hello"), { ok: false, reason: "unsupported" });
  assert.equal(s.speaking(), false);
  assert.doesNotThrow(() => s.stop());
});

test("speaking is user-initiated: nothing is said until speak() is called", () => {
  const { calls, synth, Utterance } = fakeSynth();
  const s = createSpeaker({ synth, Utterance });
  assert.equal(calls.speak.length, 0);
  s.speak("Step 1 of 9. Preheat the oven.");
  assert.equal(calls.speak.length, 1);
  assert.equal(calls.speak[0].text, "Step 1 of 9. Preheat the oven.");
  assert.equal(s.speaking(), true);
});

test("a second tap replaces what is speaking — it never stacks up a queue", () => {
  const { calls, synth, Utterance } = fakeSynth();
  const s = createSpeaker({ synth, Utterance });
  s.speak("one");
  s.speak("two");
  assert.equal(calls.cancel, 2); // once per speak, before each
  assert.equal(calls.speak.length, 2);
});

test("stop() cancels and clears the queue, and says so", () => {
  const { calls, synth, Utterance } = fakeSynth();
  const s = createSpeaker({ synth, Utterance });
  s.speak("one");
  assert.deepEqual(s.stop(), { ok: true, reason: "stopped" });
  assert.equal(calls.cancel, 2);
  assert.equal(s.speaking(), false);
});

test("nothing to say is not an utterance", () => {
  const { calls, synth, Utterance } = fakeSynth();
  const s = createSpeaker({ synth, Utterance });
  assert.deepEqual(s.speak("   "), { ok: false, reason: "empty" });
  assert.equal(calls.speak.length, 0);
});

test("the button is told when speech ends on its own", () => {
  const { calls, synth, Utterance } = fakeSynth();
  let idle = 0;
  const s = createSpeaker({ synth, Utterance, onIdle: () => idle++ });
  s.speak("one");
  calls.speak[0].onend();
  assert.equal(s.speaking(), false);
  assert.equal(idle, 1);
  calls.speak[0].onend(); // a late second event must not re-fire
  assert.equal(idle, 1);
});

test("a platform with the API but no usable voice settles rather than sticking on", () => {
  // Headless browsers and bare Linux desktops fire `error`, never `end`. A
  // button left reading "Stop" forever would be the visible symptom.
  const { calls, synth, Utterance } = fakeSynth();
  let idle = 0;
  const s = createSpeaker({ synth, Utterance, onIdle: () => idle++ });
  s.speak("one");
  calls.speak[0].onerror();
  assert.equal(s.speaking(), false);
  assert.equal(idle, 1);
});

test("a synthesiser that throws leaves the control off, not stuck on", () => {
  const s = createSpeaker({
    synth: {
      speak: () => {
        throw new Error("not allowed");
      },
      cancel: () => {},
    },
    Utterance: class {},
  });
  assert.deepEqual(s.speak("one"), { ok: false, reason: "denied" });
  assert.equal(s.speaking(), false);
});
