// Unit tests for site/js/alarm.js — the timer's alarm (ROADMAP 36d, ADR 0071).
// Run: `node --test`.
//
// WHAT THIS CAN AND CANNOT PROVE. Every channel is driven through an injected
// fake, so what is proved is the DECISION LOGIC and the lifecycle: which
// channels fire, in which order, on which timer lengths, and what happens when
// one of them is missing or refused. What is not proved — by these or by any
// test on a machine with no speaker and no motor — is that a sound came out or
// that a phone moved. `tools/cook_check.mjs` closes half the gap by counting
// calls into the REAL browser APIs; the other half needs a kitchen.
//
// THE THREE FAILURE MODES THIS FILE EXISTS FOR:
//   1. A missing channel taking the others with it. The tone is the one every
//      browser can do and the notification is the one that can be refused, so
//      an exception from either must not silence the rest.
//   2. The prompt being spent on a timer that never earned it. A refusal is
//      sticky and undone only in per-site settings most people never find, so
//      "does this length ask?" is the assertion that protects a scarce thing.
//   3. Asking twice. A browser that has already answered must never be asked
//      again, whichever way it answered.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NOTIFY_OVER_SECONDS, createAlarm, wantsNotification } from "../site/js/alarm.js";

// --- Which timers earn a notification -------------------------------------

test("only a timer OVER fifteen minutes earns a notification", () => {
  assert.equal(NOTIFY_OVER_SECONDS, 900);
  assert.equal(wantsNotification(901), true);
  assert.equal(wantsNotification(1800), true);
  // The boundary is real, not theoretical: Jesse's Garlic Chicken Thighs and
  // Chocolate Chewy Cookies each state a step of exactly 900 seconds, and
  // fifteen minutes exactly is not "over fifteen minutes".
  assert.equal(wantsNotification(900), false);
  assert.equal(wantsNotification(899), false);
  assert.equal(wantsNotification(0), false);
});

test("a length that is not a number never asks for a permission", () => {
  for (const bad of [null, undefined, NaN, Infinity, "", "soon", {}]) {
    assert.equal(wantsNotification(bad), false, `${String(bad)} must not ask`);
  }
});

// --- Fakes shaped like the platform ---------------------------------------

/** An AudioContext-shaped fake that records the graph it was asked to build. */
function fakeAudio({ throwOnConstruct = false, state = "running" } = {}) {
  const made = { contexts: 0, oscillators: 0, started: [], stopped: [], closed: 0, resumed: 0 };
  class Ctx {
    constructor() {
      if (throwOnConstruct) throw new Error("too many contexts");
      made.contexts++;
      this.state = state;
      this.currentTime = 0;
      this.destination = { connect: () => {} };
    }
    createOscillator() {
      made.oscillators++;
      const osc = {
        type: "",
        frequency: { value: 0 },
        connect: (n) => n,
        start: (t) => made.started.push(t),
        stop: (t) => made.stopped.push(t),
        disconnect: () => {},
      };
      return osc;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: (n) => n,
        disconnect: () => {},
      };
    }
    resume() {
      // Asynchronous, like the real one: the state is still "suspended" when
      // resume() returns, which is why arm() reports what it found rather than
      // what it hopes for.
      made.resumed++;
      return Promise.resolve().then(() => {
        this.state = "running";
      });
    }
    close() {
      made.closed++;
      this.state = "closed";
      return Promise.resolve();
    }
  }
  return { Ctx, made };
}

/** A Notification-shaped fake: the permission it holds, and what it was asked. */
function fakeNotif({ permission = "default", answer = "granted", illegal = false } = {}) {
  const seen = { requests: 0, constructed: [] };
  function Notif(title, options) {
    if (illegal) throw new TypeError("Illegal constructor");
    seen.constructed.push({ title, options });
  }
  Notif.permission = permission;
  Notif.requestPermission = () => {
    seen.requests++;
    Notif.permission = answer;
    return Promise.resolve(answer);
  };
  return { Notif, seen };
}

/** A serviceWorker container whose registration can show notifications. */
function fakeSw({ registered = true } = {}) {
  const shown = [];
  const container = {
    getRegistration: () =>
      Promise.resolve(
        registered ? { showNotification: (title, options) => shown.push({ title, options }) } : undefined
      ),
  };
  return { container, shown };
}

const nav = (vibrate) => (vibrate === undefined ? {} : { vibrate });

// --- The tone --------------------------------------------------------------

test("arming builds one context and sounds three beeps on it", () => {
  const { Ctx, made } = fakeAudio();
  const alarm = createAlarm({ AudioCtx: Ctx, nav: nav(() => true) });
  assert.equal(alarm.armed(), false, "nothing exists before the gesture");
  assert.deepEqual(alarm.arm(), { ok: true, reason: "running" });
  assert.equal(alarm.armed(), true);
  // A second gesture must reuse the context, not stack a new one per tap.
  alarm.arm();
  assert.equal(made.contexts, 1);
  assert.deepEqual(alarm.tone(), { ok: true, reason: "played" });
  assert.equal(made.oscillators, 3);
  // Scheduled in sequence, never all at once — three beeps, not one chord.
  assert.ok(made.started[0] < made.started[1] && made.started[1] < made.started[2]);
  assert.equal(made.stopped.length, 3);
});

test("a context suspended by autoplay policy is resumed on the gesture", () => {
  const { Ctx, made } = fakeAudio({ state: "suspended" });
  const alarm = createAlarm({ AudioCtx: Ctx, nav: nav() });
  assert.deepEqual(alarm.arm(), { ok: true, reason: "suspended" });
  assert.equal(made.resumed, 1, "a suspended context is silent when the bell is due");
});

test("a browser with no Web Audio is unsupported, never an error", () => {
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav() });
  assert.deepEqual(alarm.arm(), { ok: false, reason: "unsupported" });
  assert.deepEqual(alarm.tone(), { ok: false, reason: "not-armed" });
});

test("a context that refuses to be built degrades rather than throwing", () => {
  const { Ctx } = fakeAudio({ throwOnConstruct: true });
  const alarm = createAlarm({ AudioCtx: Ctx, nav: nav() });
  assert.deepEqual(alarm.arm(), { ok: false, reason: "failed" });
  assert.equal(alarm.armed(), false);
});

test("closing hands the audio hardware back and cannot be rung after", async () => {
  const { Ctx, made } = fakeAudio();
  const alarm = createAlarm({ AudioCtx: Ctx, nav: nav() });
  alarm.arm();
  alarm.close();
  assert.equal(made.closed, 1);
  assert.equal(alarm.armed(), false);
  assert.equal((await alarm.fire({})).tone.ok, false);
  // …and closing twice is harmless: the dialog's close handler can run after a
  // pagehide already tore things down.
  alarm.close();
  assert.equal(made.closed, 1);
});

// --- The buzz --------------------------------------------------------------

test("vibration fires with a pattern, and its absence is not an error", () => {
  const calls = [];
  const has = createAlarm({ AudioCtx: undefined, nav: nav((p) => (calls.push(p), true)) });
  assert.deepEqual(has.buzz(), { ok: true, reason: "buzzed" });
  assert.ok(Array.isArray(calls[0]) && calls[0].length > 1, "a pattern, not a single pulse");

  // iOS Safari has no vibration API at all. Known and accepted (owner,
  // 2026-08-16) — so it reports unsupported and nothing anywhere warns.
  const none = createAlarm({ AudioCtx: undefined, nav: nav() });
  assert.deepEqual(none.buzz(), { ok: false, reason: "unsupported" });

  // A desktop HAS the call and returns false — no motor. Also not an error.
  const motorless = createAlarm({ AudioCtx: undefined, nav: nav(() => false) });
  assert.deepEqual(motorless.buzz(), { ok: false, reason: "ignored" });

  const angry = createAlarm({
    AudioCtx: undefined,
    nav: nav(() => {
      throw new Error("blocked by policy");
    }),
  });
  assert.deepEqual(angry.buzz(), { ok: false, reason: "failed" });
});

// --- The permission --------------------------------------------------------

test("the prompt is raised only from the undecided state, and only once", async () => {
  const { Notif, seen } = fakeNotif({ permission: "default", answer: "granted" });
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif });
  assert.equal(alarm.permission(), "default");
  assert.equal(await alarm.requestNotify(), "granted");
  assert.equal(seen.requests, 1);
  // Already answered: asking again is a no-op that exists only to annoy.
  assert.equal(await alarm.requestNotify(), "granted");
  assert.equal(seen.requests, 1);
});

test("a browser that already said no is never asked again", async () => {
  const { Notif, seen } = fakeNotif({ permission: "denied" });
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif });
  assert.equal(await alarm.requestNotify(), "denied");
  assert.equal(seen.requests, 0);
});

test("no Notification API at all reads as unsupported and never throws", async () => {
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif: undefined });
  assert.equal(alarm.permission(), "unsupported");
  assert.equal(await alarm.requestNotify(), "unsupported");
  assert.deepEqual(await alarm.notify({ title: "x" }), { ok: false, reason: "unsupported" });
});

test("a browser that takes a callback instead of returning one is left undecided", async () => {
  // Safari before 16. Nothing depends on the answer — notify() re-reads the
  // live permission at bell time — so the honest report is "still default".
  const Notif = function () {};
  Notif.permission = "default";
  Notif.requestPermission = () => undefined;
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif });
  assert.equal(await alarm.requestNotify(), "default");
});

// --- The notification ------------------------------------------------------

test("a granted notification goes through the service-worker registration", async () => {
  const { Notif, seen } = fakeNotif({ permission: "granted" });
  const { container, shown } = fakeSw();
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif, swContainer: container });
  const out = await alarm.notify({
    title: "Time's up",
    body: "Step 5 of 8",
    url: "https://example.test/recipe.html?id=cook-at-home&dish=gingerbread-cookies",
    tag: "faves-timer:x:4",
  });
  assert.deepEqual(out, { ok: true, reason: "sw" });
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, "Time's up");
  // The click has to get back to the recipe, and sw.js reads exactly this.
  assert.match(shown[0].options.data.url, /gingerbread-cookies$/);
  // One live notification per timer, replaced rather than stacked.
  assert.equal(shown[0].options.tag, "faves-timer:x:4");
  // The page-level constructor is the fallback, so it must NOT have run too.
  assert.equal(seen.constructed.length, 0);
});

test("with no worker registered the page constructor is the fallback", async () => {
  const { Notif, seen } = fakeNotif({ permission: "granted" });
  const { container } = fakeSw({ registered: false });
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif, swContainer: container });
  assert.deepEqual(await alarm.notify({ title: "Time's up" }), { ok: true, reason: "page" });
  assert.equal(seen.constructed.length, 1);
});

test("Chrome on Android refusing `new Notification` is reported, not thrown", async () => {
  // "Illegal constructor" is the real message, and there is no worker here to
  // fall back to — so the bell rings in two channels and says so.
  const { Notif } = fakeNotif({ permission: "granted", illegal: true });
  const { container } = fakeSw({ registered: false });
  const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif, swContainer: container });
  assert.deepEqual(await alarm.notify({ title: "Time's up" }), { ok: false, reason: "failed" });
});

test("notify never prompts — a decision it has not been given is simply obeyed", async () => {
  for (const permission of ["default", "denied"]) {
    const { Notif, seen } = fakeNotif({ permission });
    const { container, shown } = fakeSw();
    const alarm = createAlarm({ AudioCtx: undefined, nav: nav(), Notif, swContainer: container });
    assert.deepEqual(await alarm.notify({ title: "x" }), { ok: false, reason: permission });
    assert.equal(seen.requests, 0, `${permission} must not raise a prompt at bell time`);
    assert.equal(shown.length, 0);
  }
});

// --- The bell as a whole ---------------------------------------------------

test("a short timer's bell sounds and buzzes and asks for nothing", async () => {
  const { Ctx, made } = fakeAudio();
  const buzzes = [];
  const { Notif, seen } = fakeNotif({ permission: "granted" });
  const { container, shown } = fakeSw();
  const alarm = createAlarm({
    AudioCtx: Ctx,
    nav: nav((p) => (buzzes.push(p), true)),
    Notif,
    swContainer: container,
  });
  alarm.arm();
  const out = await alarm.fire({ title: "Time's up", body: "Step 2 of 3", notify: false });
  assert.equal(out.tone.ok, true);
  assert.equal(out.vibrate.ok, true);
  assert.deepEqual(out.notify, { ok: false, reason: "not-wanted" });
  assert.equal(made.oscillators, 3);
  assert.equal(buzzes.length, 1);
  // Granted or not, a short timer does not notify. The length decides.
  assert.equal(shown.length, 0);
  assert.equal(seen.constructed.length, 0);
});

test("a refused notification leaves the tone and the buzz untouched", async () => {
  const { Ctx, made } = fakeAudio();
  const buzzes = [];
  const { Notif } = fakeNotif({ permission: "denied" });
  const alarm = createAlarm({
    AudioCtx: Ctx,
    nav: nav((p) => (buzzes.push(p), true)),
    Notif,
    swContainer: fakeSw().container,
  });
  alarm.arm();
  const out = await alarm.fire({ title: "Time's up", notify: true });
  assert.deepEqual(out.notify, { ok: false, reason: "denied" });
  assert.equal(out.tone.ok, true);
  assert.equal(out.vibrate.ok, true);
  assert.equal(made.oscillators, 3);
  assert.equal(buzzes.length, 1);
});

test("a notification path that hangs cannot delay the tone or the buzz", async () => {
  // The whole reason fire() sounds and buzzes BEFORE it awaits anything: a slow
  // or wedged registration must not hold the bell.
  const { Ctx, made } = fakeAudio();
  const buzzes = [];
  const { Notif } = fakeNotif({ permission: "granted" });
  const alarm = createAlarm({
    AudioCtx: Ctx,
    nav: nav((p) => (buzzes.push(p), true)),
    Notif,
    swContainer: { getRegistration: () => new Promise(() => {}) },
  });
  alarm.arm();
  const pending = alarm.fire({ title: "Time's up", notify: true });
  // Nothing awaited yet, and both permission-free channels have already fired.
  assert.equal(made.oscillators, 3);
  assert.equal(buzzes.length, 1);
  assert.equal(await Promise.race([pending, Promise.resolve("still-waiting")]), "still-waiting");
});

test("a bell on a browser with none of the three APIs is silent, not broken", async () => {
  const alarm = createAlarm({
    AudioCtx: undefined,
    nav: {},
    Notif: undefined,
    swContainer: undefined,
  });
  const out = await alarm.fire({ title: "Time's up", notify: true });
  assert.deepEqual(out, {
    tone: { ok: false, reason: "not-armed" },
    vibrate: { ok: false, reason: "unsupported" },
    notify: { ok: false, reason: "unsupported" },
  });
});
