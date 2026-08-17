// The timer's alarm (ROADMAP 36d, ADR 0071). Three channels — a tone, a buzz
// and, for a long timer only, a notification — behind one `fire()`.
//
// THIS FILE IS THREE FIRSTS FOR FAVES AT ONCE: the first sound, the first
// vibration, and the first permission the app has ever asked a human for. Each
// one is a new failure mode, so every entry point below returns a reason rather
// than throwing, and every channel is independent: the one that cannot run must
// never take the others with it.
//
// WHY A TONE IS GENERATED AND NOT SHIPPED. An audio file would be a precache
// entry, a transfer-budget line and an asset to licence. `OscillatorNode` is in
// every browser that matters, costs no bytes and no network, and needs no
// permission at all — so the bell works in flight mode on the first visit,
// which an mp3 downloaded on demand would not.
//
// WHY THE CONTEXT IS BUILT ON THE TAP AND NOT AT LOAD. Autoplay policy suspends
// an AudioContext created outside a user gesture, and a suspended context is
// silent at exactly the moment the bell is due — 35 minutes after the last tap.
// `arm()` therefore runs inside the click that STARTS the timer. That tap is
// already the reader asking for a countdown, so nothing extra is asked of them,
// and a context armed inside a gesture keeps running for the life of the page.
//
// WHAT VIBRATION IS AND IS NOT. `navigator.vibrate` is permission-free and
// silent about failure — it returns false on a desktop with no motor, and iOS
// Safari ignores it entirely. That last part is known and accepted (the owner
// ruled it on 2026-08-16 with the iOS gap stated), so an absent buzz is never
// an error here and never a reason to warn anyone.
//
// 🚩 WHAT THE NOTIFICATION COSTS, AND WHY IT IS RATIONED. It needs a permission
// prompt, and a prompt is a thing you can only spend once per browser: a
// refusal is sticky, survives reloads, and is undone only in per-site settings
// most people never find (ADR 0069 says this at length about geolocation). So
// the ask is spent on the case that earns it — a timer over fifteen minutes,
// long enough that you have walked out of the kitchen and neither the tone nor
// the buzz can reach you. A short timer never asks, whatever the answer would
// have been.

/** Over this many seconds a timer is one you walk away from. Owner, 2026-08-16. */
export const NOTIFY_OVER_SECONDS = 15 * 60;

/**
 * Whether a timer of this length earns the notification — and therefore the
 * permission prompt. Strictly greater: fifteen minutes exactly is not "over
 * fifteen minutes", and the corpus has a real step at exactly 900s, so the
 * boundary is exercised rather than theoretical.
 */
export const wantsNotification = (totalSeconds) =>
  Number.isFinite(Number(totalSeconds)) && Number(totalSeconds) > NOTIFY_OVER_SECONDS;

// Three short beeps, not one long one: a single tone reads as a notification
// chime from another room, three reads as "something of yours is finished".
// 880 Hz (A5) carries over an extractor fan without being shrill, and the whole
// pattern is under a second so it cannot become the thing you are waiting for.
const BEEPS = 3;
const FREQ_HZ = 880;
const BEEP_S = 0.16;
const GAP_S = 0.12;
// Well under full scale. This is an alarm in a kitchen, not a fire alarm, and a
// phone at full volume on a bench is already loud.
const PEAK_GAIN = 0.22;
// A gain that jumps from 0 to peak clicks audibly. 15 ms of ramp at each end
// removes it, and is far too short to soften the attack.
const RAMP_S = 0.015;
// exponentialRampToValueAtTime cannot ramp to or from zero, so silence is this
// rather than 0 — inaudible, and legal for the ramp.
const SILENCE = 0.0001;

// Long, short, long — distinguishable through a pocket from the single pulse
// most other things use, and the OS clamps anything longer anyway.
const VIBRATE_MS = [400, 120, 200, 120, 400];

/**
 * One alarm for one cook-mode session. Everything is injected so the lifecycle
 * is provable under `node --test` against fakes — but note exactly what that
 * proves: the CALLS, never the sound and never the buzz. No test on any machine
 * without a speaker can tell you the bell was heard.
 *
 * @param {object} deps
 * @param {Function} [deps.AudioCtx] the AudioContext constructor, or undefined
 *        where the browser has none — treated as "unsupported", never an error.
 * @param {Navigator} [deps.nav] for `vibrate`; absent on desktop browsers that
 *        never had it, and inert on iOS Safari, which has it and ignores it.
 * @param {Function} [deps.Notif] the Notification constructor/namespace.
 * @param {ServiceWorkerContainer} [deps.swContainer] how a notification is
 *        actually raised on Android Chrome — see `notify()`.
 */
export function createAlarm({
  AudioCtx = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  nav = globalThis.navigator,
  Notif = globalThis.Notification,
  swContainer = globalThis.navigator?.serviceWorker,
} = {}) {
  let ctx = null;

  /**
   * Build (or wake) the AudioContext. MUST be called synchronously inside a
   * user gesture — an `await` before it spends the gesture and the context
   * comes back suspended, which is silent 35 minutes later with nothing on
   * screen to say so.
   */
  function arm() {
    if (typeof AudioCtx !== "function") return { ok: false, reason: "unsupported" };
    try {
      if (!ctx || ctx.state === "closed") ctx = new AudioCtx();
    } catch {
      // Some browsers cap the number of live contexts per document. Cook mode
      // closes its own (see close()), so this is a genuinely exhausted machine.
      ctx = null;
      return { ok: false, reason: "failed" };
    }
    // A context built outside a gesture starts suspended; resume() inside one
    // is the documented way back, and is a no-op on a running context.
    if (ctx.state === "suspended") ctx.resume?.()?.catch?.(() => {});
    return { ok: true, reason: ctx.state };
  }

  /** Whether a bell could sound right now — armed, and not since closed. */
  const armed = () => !!ctx && ctx.state !== "closed";

  /** Three beeps on the armed context. Schedules and returns; never awaits. */
  function tone() {
    if (!armed()) return { ok: false, reason: ctx ? "closed" : "not-armed" };
    try {
      // iOS may leave an armed context "interrupted"/suspended after the phone
      // was locked through a long timer; a beep scheduled onto that context is
      // silent and this still reports played. resume() is the documented way
      // back and a no-op on a running one — the same line arm() uses.
      if (ctx.state !== "running") ctx.resume?.()?.catch?.(() => {});
      // A small lead so the first beep is scheduled rather than fired late by
      // the audio thread, which clips its attack.
      const start0 = ctx.currentTime + 0.03;
      for (let i = 0; i < BEEPS; i++) {
        const at = start0 + i * (BEEP_S + GAP_S);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = FREQ_HZ;
        gain.gain.setValueAtTime(SILENCE, at);
        gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, at + RAMP_S);
        gain.gain.setValueAtTime(PEAK_GAIN, at + BEEP_S - RAMP_S);
        gain.gain.exponentialRampToValueAtTime(SILENCE, at + BEEP_S);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + BEEP_S + RAMP_S);
        // A node graph left connected after it has finished sounding is held by
        // the context for the life of the page — the wake lock's lesson in
        // miniature (ADR 0034). One bell per timer is small; a recipe with five
        // timers rung twice each is not nothing.
        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            /* already torn down with the context */
          }
        };
      }
      return { ok: true, reason: "played" };
    } catch {
      return { ok: false, reason: "failed" };
    }
  }

  /** One buzz pattern. False from the platform means "no motor", not an error. */
  function buzz(pattern = VIBRATE_MS) {
    if (typeof nav?.vibrate !== "function") return { ok: false, reason: "unsupported" };
    try {
      // iOS Safari has no vibration API at all, so it lands on "unsupported"
      // above rather than here. Desktop Chrome HAS the call and returns false.
      return nav.vibrate(pattern) === false
        ? { ok: false, reason: "ignored" }
        : { ok: true, reason: "buzzed" };
    } catch {
      return { ok: false, reason: "failed" };
    }
  }

  /** "granted" | "denied" | "default" | "unsupported". Never prompts. */
  function permission() {
    if (typeof Notif !== "function" && typeof Notif !== "object") return "unsupported";
    if (typeof Notif?.requestPermission !== "function") return "unsupported";
    return typeof Notif.permission === "string" ? Notif.permission : "unsupported";
  }

  /**
   * Ask, once, at the moment a long timer starts (ADR 0071). Call it
   * synchronously inside the gesture: Chrome requires user activation and
   * rejects a request made after an await.
   *
   * Never asks twice — "denied" and "granted" are both final, and re-asking a
   * browser that has already decided is a no-op that only exists to annoy.
   */
  function requestNotify() {
    const state = permission();
    if (state !== "default") return Promise.resolve(state);
    try {
      // Safari before 16 takes a callback and returns undefined; treat that as
      // "still undecided" rather than inventing an answer. Nothing depends on
      // this value — `notify()` re-reads the live permission at bell time.
      const result = Notif.requestPermission();
      return Promise.resolve(result === undefined ? "default" : result).catch(() => "default");
    } catch {
      return Promise.resolve("default");
    }
  }

  /**
   * Raise a notification, if and only if the permission is already held. Never
   * prompts — the prompt happened at the tap, minutes ago.
   *
   * THE SERVICE-WORKER PATH IS THE REAL ONE. Chrome on Android throws
   * "Illegal constructor" for `new Notification()` and requires
   * `registration.showNotification`; desktop browsers accept either. So the
   * registration is tried first and the constructor is the fallback, not the
   * other way round. `navigator.serviceWorker.ready` is deliberately NOT used:
   * it never settles when nothing is registered, which would hang the bell.
   */
  async function notify({ title, body, url, tag } = {}) {
    if (permission() !== "granted") return { ok: false, reason: permission() };
    const options = {
      body,
      // One notification per timer: a tag replaces its predecessor rather than
      // stacking, so a bell rung twice cannot leave two.
      tag,
      lang: "en-NZ",
      // What `notificationclick` in sw.js reopens or focuses.
      data: { url },
      icon: "icons/icon-192.png",
      badge: "icons/favicon.svg",
      // It is a bell, not a demand: let the OS dismiss it on its own schedule.
      requireInteraction: false,
    };
    try {
      const reg = await swContainer?.getRegistration?.();
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, options);
        return { ok: true, reason: "sw" };
      }
    } catch {
      /* no worker, or it refused — the constructor below may still work */
    }
    try {
      new Notif(title, options);
      return { ok: true, reason: "page" };
    } catch {
      return { ok: false, reason: "failed" };
    }
  }

  /**
   * The bell. Tone and buzz always; the notification only when the caller says
   * this timer earned one.
   *
   * ORDER IS LOAD-BEARING. The two permission-free channels fire synchronously,
   * before anything is awaited, so a slow or broken notification path can
   * neither delay them nor swallow them. Everything is reported back rather
   * than thrown: a bell that half-rings is still a bell.
   */
  async function fire({ title, body, url, tag, notify: wanted = false } = {}) {
    const sounded = tone();
    const buzzed = buzz();
    const notified = wanted
      ? await notify({ title, body, url, tag })
      : { ok: false, reason: "not-wanted" };
    return { tone: sounded, vibrate: buzzed, notify: notified };
  }

  /**
   * Give the audio hardware back. Cook mode closes; an AudioContext left open
   * holds a real device handle and on some platforms keeps a "this tab is
   * playing audio" state alive on a page nobody is reading (ADR 0034's lesson,
   * third coat).
   */
  function close() {
    const c = ctx;
    ctx = null;
    try {
      c?.close?.()?.catch?.(() => {});
    } catch {
      /* already closed, or the page is going away */
    }
  }

  return { arm, armed, tone, buzz, permission, requestNotify, notify, fire, close };
}
