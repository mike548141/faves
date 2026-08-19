#!/usr/bin/env node
// Scripted cook-mode check — the regression guard for ROADMAP 17d / ADR 0034,
// driven through a real browser.
//
//     node tools/cook_check.mjs              # headless, exit 0 = pass
//     node tools/cook_check.mjs --help
//
// WHY THIS EXISTS, AND WHY IT IS SEPARATE FROM device_check.mjs. Cook mode
// shipped with 19 unit tests against a fake `navigator.wakeLock` — and still
// leaked a wake lock twice in a real headless Chrome (ADR 0034, decision 5).
// Both leaks were found by a throwaway script that was then thrown away, so the
// only durable evidence was of a model, not of the platform. This is that
// script made permanent. It is a sibling rather than a widening of
// device_check.mjs because the two answer different questions on different
// screens: device_check is the allergen SAFETY re-apply on a restaurant menu,
// and a failure there means someone could be served a dish that hurts them.
// Merging the two would blur that verdict, double the runtime of the safety
// check, and force one fixture to serve both. They share the harness
// (tools/lib/browser.mjs) and nothing else.
//
// WHAT A REAL BROWSER GIVES US THAT `node --test` CANNOT:
//   · a genuine `navigator.wakeLock` — headless Chrome 151 grants real
//     WakeLockSentinels on an http origin, releases them when the page hides,
//     and refuses a request while hidden, exactly as the spec says;
//   · a genuine <dialog>.showModal() — the focus trap, the inert page behind,
//     and Chrome's close-watcher handling Escape;
//   · real layout, so a tap target or an overflow can be measured rather than
//     assumed;
//   · a real localStorage across a real page load, which is the only way to
//     show that a tick survives a reload rather than a re-render;
//   · a genuine `speechSynthesis` — headless Chrome has the API and no usable
//     voice, which is precisely the platform cook.js has to survive.
//
// HOW THE CHECKLIST IS OBSERVED (ROADMAP 17e). Nothing is stubbed: the boxes
// are clicked, the page is reloaded from the server, and the boxes are read
// again. Two of the assertions are about things that are invisible when they
// work and expensive when they don't — that ticking mutates NOTHING inside the
// live region (the stage's markup is compared byte for byte before and after,
// because the strike-through is CSS), and that rebuilding the ingredient list
// around a focused box leaves focus inside the dialog rather than on <body>.
//
// HOW SPEECH IS OBSERVED. The same technique as the wake lock: a script
// installed before any page script wraps `speechSynthesis.speak` and `.cancel`
// to count calls and keep the text, and "is anything still speaking" is read
// off the platform's own `speaking` flag. Nothing is faked.
//
// HOW THE WAKE LOCK IS OBSERVED. A script installed before any page script runs
// wraps `navigator.wakeLock.request` and `WakeLockSentinel.prototype.release`:
// it counts calls and keeps every sentinel the page was handed. Nothing is
// simulated — the sentinels are the platform's, and "still held" is read off
// the platform's own `released` flag. The one deliberate intervention is a
// stall the harness can open inside `request`, which widens (does not invent)
// the close-beats-the-request race that leak (b) lived in.
//
// WHAT THIS CANNOT CHECK, STATED PLAINLY RATHER THAN FAKED:
//   1. That the screen actually stays on. That is device behaviour; only a real
//      phone shows it, and iOS is still unverified (ADR 0034, Consequences).
//   2. Leak (a) in its original form — a browser that reports the page hidden
//      WITHOUT having released the lock. Chrome 151 here always releases first
//      (measured: the sentinel's `release` event fires before
//      `visibilitychange`), so the extra release() cook.js makes on hide is a
//      no-op in this environment and its removal is invisible here. What IS
//      checked is the consequence that mattered: after a hide/show cycle cook
//      mode holds exactly one lock again — the `wanted` flag and the
//      re-acquire — and that no cycle ever leaves two.
//   3. That the lock is released when the document is torn down by a
//      navigation. The page that held it no longer exists, so nothing can ask
//      it; the browser's own teardown is what releases it. The checkable half
//      is that the document you land back on starts clean.
//   4. That any SOUND comes out, which voice says it, or — the one that
//      matters — whether that voice came over the NETWORK. Several platforms
//      serve their better voices from a server, so "no dependency" is true of
//      the code and not necessarily of the runtime (cook.js says so in full).
//      A headless browser has the API and no voice, so what is asserted here
//      is the CALLS: one utterance per tap, cancelled on every exit.
//   5. That `pagehide` really stops speech when you navigate away mid-sentence.
//      Same shape as gap 3: the counter dies with the document, and with no
//      voice in this environment the platform's `speaking` flag is never true
//      to begin with, so an assertion here would pass whether or not the
//      listener existed. The listener is in cook-ui.js; only a real phone shows
//      it working. This is a gap, left as one.
//   6. That a screen reader does not re-announce the step when a box is ticked.
//      What IS checked is the cause — that the live region's markup is
//      unchanged by a tick — because that is the thing a browser can measure.
//
// NOT PART OF THE SHIPPED SITE — dev tooling, like tools/serve.py. No npm
// install, no dependency added to site/ (ADR 0001).

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  need,
  settleUntil,
  sleep,
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";
// The app's own slugger, so the ?dish= URL this tool builds is the one the app
// would build — a copy here could drift and quietly test nothing.
import { slug } from "../site/js/slug.js";
// The same pure rules the page uses, so the check asserts against the CONTRACT
// rather than against a second copy of it that could drift. If these ever
// disagree with the render, that is the bug worth finding.
import {
  formatDuration,
  ingredientsForStep,
  stepDuration,
  stepUsesIngredients,
} from "../site/js/cook.js";
// Same rule for the alarm: the fifteen-minute line is asserted against the
// constant the app reads, never against a "900" typed a second time here.
import { NOTIFY_OVER_SECONDS, wantsNotification } from "../site/js/alarm.js";
// And the scaler, for the same reason: the expected doubled line is COMPUTED
// from the app's own rules here, never typed out as a literal, so this cannot
// pass by agreeing with a wrong copy of the arithmetic.
import { ingredientBlocks, ingredientKeys } from "../site/js/ingredients.js";
import { SCALES, scaleFor, scaleLineStatus } from "../site/js/quantity.js";

// The scale this check drives, taken from the app's own list rather than named
// twice. `scaleFor` falls back to 1× for a key it doesn't know, silently — so a
// hand-typed "two" (the key is "double") would have made every expectation the
// 1× text and the check would have failed the CORRECT render. It did, once.
const TWO = SCALES.find((s) => s.label === "2×");

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

const COLLECTION = "cook-at-home";
const VIEW = { width: 390, height: 844 }; // the design target (CLAUDE.md)

const HELP = `Faves cook-mode check — verify cook mode in a real browser.

  node tools/cook_check.mjs [options]

Serves site/ locally, launches Google Chrome headless against a throwaway
profile, and drives cook mode on a real recipe: opening it, stepping through it,
the boundaries, the ingredients panel, the checklist, reading a step aloud,
every exit path, and the wake-lock lifecycle — instrumented at the real API,
with the page's own sentinels.

Options:
  --dish <name|slug>  Recipe to cook (default: the one with the most steps).
  --port <n>          Port for the local static server (default: an unused one).
  --headed            Show the browser window (for watching it work).
  --keep-profile      Leave the temporary Chrome profile behind, and say where.
  --verbose           Print every step, not just the assertions.
  -h, --help          This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).

Requires Google Chrome (set FAVES_CHROME to point elsewhere). No npm install —
the site ships build-less and this tool adds no dependency to it (ADR 0001).`;

// --- Arguments ----------------------------------------------------------

function parseArgs(argv) {
  const opts = { dish: null, port: 0, headed: false, keepProfile: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--dish") opts.dish = argv[++i];
    else if (a === "--port") opts.port = Number(argv[++i]);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-profile") opts.keepProfile = true;
    else if (a === "--verbose") opts.verbose = true;
    else throw new Error(`unknown option: ${a} (try --help)`);
  }
  if (!Number.isInteger(opts.port) || opts.port < 0) throw new Error("--port needs a number");
  return opts;
}

// --- Instrumenting the real wake lock ------------------------------------

/**
 * Installed with Page.addScriptToEvaluateOnNewDocument, so it is in place
 * before cook.js can ask for anything. It wraps the platform API; it does not
 * replace it. `sentinels` holds what the page was actually handed, so "still
 * held" is the platform's own `released` flag rather than our bookkeeping.
 */
const INSTRUMENT = `(() => {
  const W = (window.__cookWake = {
    requests: 0, releaseCalls: 0, sentinels: [], errors: [], stall: null,
  });
  addEventListener("error", (e) => W.errors.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => W.errors.push("unhandled: " + e.reason));
  // Speech is instrumented the same way and for the same reason (ROADMAP 17e):
  // wrap the REAL speechSynthesis, never replace it, so what is counted is what
  // the platform was actually asked to do. Headless Chrome has the API and no
  // usable voice, which is exactly the platform cook.js has to survive — and it
  // means these counts, not audio, are what can be asserted.
  const S = (window.__cookSpeech = { speaks: 0, cancels: 0, texts: [] });
  const synth = window.speechSynthesis;
  if (synth && typeof synth.speak === "function") {
    const speak = synth.speak.bind(synth);
    const cancel = synth.cancel.bind(synth);
    synth.speak = (u) => {
      S.speaks++;
      S.texts.push(u && u.text);
      return speak(u);
    };
    synth.cancel = () => {
      S.cancels++;
      return cancel();
    };
  }
  // The alarm's three channels (ROADMAP 36d, ADR 0071), instrumented the same
  // way as everything else here: the real APIs are WRAPPED, never replaced, so
  // every number below is a call the platform actually received. Headless
  // Chrome on macOS has all three — vibrate (which returns false, because there
  // is no motor), AudioContext (which builds a real graph into a null sink) and
  // Notification (whose permission this tool sets through CDP, so "granted" and
  // "denied" are the browser's own states and not a stub).
  const A = (window.__cookAlarm = {
    contexts: 0, oscillators: 0, closes: 0, ctxStates: [],
    vibrations: [], notifyRequests: 0, swNotifications: [], pageNotifications: [],
    hasVibrate: typeof navigator.vibrate === "function",
    hasAudio: typeof window.AudioContext === "function",
    hasNotification: typeof window.Notification === "function",
  });
  // THE CLOCK IS THE ONE THING FAKED, AND ONLY THE CLOCK. A bake timer is
  // thirty minutes long; nothing else in this file can wait that out. cook.js
  // stores the wall clock a countdown ENDS at (rather than decrementing), so
  // moving Date.now forward is exactly what a phone that slept through the bake
  // sees on waking — the interval, the render, the alarm and every API call
  // stay the platform's own.
  const C = (window.__cookClock = { skew: 0 });
  const realNow = Date.now.bind(Date);
  Date.now = () => realNow() + C.skew;

  if (A.hasVibrate) {
    const vibrate = navigator.vibrate.bind(navigator);
    navigator.vibrate = (pattern) => {
      A.vibrations.push(pattern);
      return vibrate(pattern);
    };
  }
  if (A.hasAudio) {
    const Real = window.AudioContext;
    const make = Real.prototype.createOscillator;
    Real.prototype.createOscillator = function (...args) {
      A.oscillators++;
      return make.apply(this, args);
    };
    const shut = Real.prototype.close;
    Real.prototype.close = function (...args) {
      A.closes++;
      return shut.apply(this, args);
    };
    window.AudioContext = function (...args) {
      const ctx = new Real(...args);
      A.contexts++;
      A.ctxStates.push(ctx.state);
      return ctx;
    };
    window.AudioContext.prototype = Real.prototype;
  }
  const swProto = globalThis.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype;
  if (swProto && typeof swProto.showNotification === "function") {
    const show = swProto.showNotification;
    swProto.showNotification = function (title, options) {
      A.swNotifications.push({ title, options });
      return show.call(this, title, options);
    };
  }
  if (A.hasNotification) {
    const Real = window.Notification;
    // A wrapper rather than a replacement: new Wrapped() returns the
    // platform's own Notification, and permission is read THROUGH to the real
    // one so a CDP-set permission is what the page sees.
    function Wrapped(title, options) {
      A.pageNotifications.push({ title, options });
      return new Real(title, options);
    }
    Wrapped.prototype = Real.prototype;
    Object.defineProperty(Wrapped, "permission", { get: () => Real.permission });
    Wrapped.requestPermission = (...args) => {
      A.notifyRequests++;
      return Real.requestPermission(...args);
    };
    window.Notification = Wrapped;
  }

  const api = navigator.wakeLock;
  if (!api || typeof api.request !== "function") return;
  const proto = globalThis.WakeLockSentinel && WakeLockSentinel.prototype;
  if (proto && typeof proto.release === "function") {
    const release = proto.release;
    proto.release = function (...args) {
      W.releaseCalls++;
      return release.apply(this, args);
    };
  }
  const request = api.request.bind(api);
  api.request = async (type) => {
    W.requests++;
    const s = await request(type);
    W.sentinels.push(s);
    // Fault injection, opened only by the harness: hold the sentinel back so a
    // close can land inside the request's window. The race is real; this only
    // makes it wide enough to drive deterministically.
    if (W.stall) await W.stall;
    return s;
  };
})();`;

/** An older browser, reproduced by removing the API rather than by faking one:
 *  Safari had no wakeLock before iOS 16.4 and must still get working cook mode. */
const NO_WAKE_LOCK = `Object.defineProperty(Navigator.prototype, "wakeLock", {
  get: () => undefined, configurable: true,
});`;

/** A browser with no speech at all — removed, not stubbed, for the same reason:
 *  the requirement is that cook mode then offers NO control, not a dead one. */
const NO_SPEECH = `Object.defineProperty(window, "speechSynthesis", {
  get: () => undefined, configurable: true,
});`;

/** A browser with no Notification API. Removed, not stubbed: the requirement is
 *  that the bell still sounds and buzzes, and that NOTHING is said about a
 *  setting there is no way to go and change (ADR 0071). */
const NO_NOTIFICATION = `Object.defineProperty(window, "Notification", {
  get: () => undefined, configurable: true,
});`;

// --- What one assertion needs off the page --------------------------------

const SNAP = `(() => {
  const W = window.__cookWake || {};
  const side = (e) => (e ? Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height) : 0);
  const base = {
    requests: W.requests | 0,
    releases: W.releaseCalls | 0,
    held: (W.sentinels || []).filter((s) => !s.released).length,
    errors: (W.errors || []).slice(),
    starts: document.querySelectorAll(".cook-start").length,
    startSide: side(document.querySelector(".cook-start")),
    focusIsStart: !!document.activeElement && document.activeElement.classList.contains("cook-start"),
    overflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    visibility: document.visibilityState,
    // The recipe page's own checklist, behind the dialog (ROADMAP 17e).
    pageTicks: [...document.querySelectorAll(".recipe-detail-page .tick-box")].map((b) => [
      b.dataset.tick,
      b.checked,
    ]),
    pageTickRows: [...document.querySelectorAll(".recipe-detail-page .tick")].map((l) =>
      Math.round(l.getBoundingClientRect().height)
    ),
    pageTicksNative: [...document.querySelectorAll(".recipe-detail-page .tick-box")].every(
      (b) => b.tagName === "INPUT" && b.type === "checkbox"
    ),
    pageFocus: document.activeElement ? document.activeElement.className : null,
    // Reading the step aloud (ROADMAP 17e). synthSpeaking is the PLATFORM's own
    // flag, so "nothing outlived cook mode" is read off the browser rather than
    // off our own bookkeeping — the same rule the wake lock follows.
    speaks: (window.__cookSpeech || {}).speaks | 0,
    cancels: (window.__cookSpeech || {}).cancels | 0,
    spoken: ((window.__cookSpeech || {}).texts || []).slice(-1)[0] || null,
    synthSpeaking: !!(window.speechSynthesis && window.speechSynthesis.speaking),
    hasSpeech: !!window.speechSynthesis,
    // The alarm (ROADMAP 36d, ADR 0071). Every count is a call the real API
    // received; nothing here is inferred from the DOM. They reset with each
    // document, which is what lets one scenario per page load start from zero.
    alarm: (() => {
      const A = window.__cookAlarm || {};
      return {
        contexts: A.contexts | 0,
        oscillators: A.oscillators | 0,
        closes: A.closes | 0,
        ctxStates: (A.ctxStates || []).slice(),
        vibrations: (A.vibrations || []).length,
        lastPattern: (A.vibrations || []).slice(-1)[0] || null,
        notifyRequests: A.notifyRequests | 0,
        sw: (A.swNotifications || []).slice(),
        page: (A.pageNotifications || []).slice(),
        hasVibrate: A.hasVibrate === true,
        hasAudio: A.hasAudio === true,
        hasNotification: A.hasNotification === true,
      };
    })(),
    notifyPermission: window.Notification ? window.Notification.permission : "unsupported",
  };
  const d = document.querySelector("dialog.cook-sheet");
  if (!d) return { ...base, open: false };
  const q = (s) => d.querySelector(s);
  const nextBtn = q(".cook-next");
  const shown = (e) => e && !e.hidden;
  const box = d.getBoundingClientRect();
  const stage = q(".cook-stage");
  const ing = q(".cook-ing");
  return {
    ...base,
    open: d.open,
    modal: d.matches(":modal"),
    size: [Math.round(box.width), Math.round(box.height)],
    counter: q(".cook-count").textContent,
    step: q(".cook-step").textContent,
    stepCount: d.querySelectorAll(".cook-step").length,
    prevDisabled: q(".cook-prev").disabled,
    nextText: [...nextBtn.querySelectorAll("span")].filter(shown).map((s) => s.textContent).join(" "),
    fill: parseFloat(q(".cook-progress-fill").style.width) || 0,
    motion: getComputedStyle(q(".cook-progress-fill")).transitionDuration,
    awakeShown: shown(q(".cook-awake")),
    ingOpen: ing ? !ing.hidden : null,
    ingItems: d.querySelectorAll(".cook-ing .ingredients li").length,
    ingText: [...d.querySelectorAll(".cook-ing .ingredients li")].map((li) => li.textContent),
    // "2× mixture", or null at 1× where the badge must not appear at all.
    scaleBadge: q(".cook-scale") ? q(".cook-scale").textContent : null,
    timerShown: shown(q(".cook-timer")),
    timerTime: q(".cook-timer-time") ? q(".cook-timer-time").textContent : null,
    timerLabel: q(".cook-timer-state")
      ? [...q(".cook-timer-state").querySelectorAll("span")].filter(shown).map((x) => x.textContent).join("")
      : null,
    timerRunning: q(".cook-timer") ? q(".cook-timer").classList.contains("is-running") : null,
    resetShown: shown(q(".cook-timer-reset")),
    // The accessible name is now the ONLY place the verb is written down — the
    // face carries an icon. If this stops saying "Pause"/"Resume"/"Start", a
    // screen-reader user is left with a shape and a number.
    timerAria: q(".cook-timer-toggle") ? q(".cook-timer-toggle").getAttribute("aria-label") : null,
    // MEASURED, not reasoned about. The owner's first complaint was that the
    // numeral is not centred, and it was true for a reason no stylesheet read
    // would surface: the old rule centred the flex PAIR [numeral][word]. So the
    // guard is arithmetic on two real rectangles, not a grep for a CSS
    // property — a property can be present and still not centre anything.
    timerOffCentre: (() => {
      const face = q(".cook-timer-face");
      const time = q(".cook-timer-time");
      if (!face || !time) return null;
      const f = face.getBoundingClientRect();
      const t = time.getBoundingClientRect();
      return Math.abs((t.left + t.width / 2) - (f.left + f.width / 2));
    })(),
    timerFill: q(".cook-timer-fill") ? parseFloat(q(".cook-timer-fill").style.width) : null,
    timerDone: q(".cook-timer") ? q(".cook-timer").classList.contains("is-done") : null,
    // The alarm's third channel: the one a deaf reader and a screen-reader user
    // both depend on, and the only one a headless browser can read back.
    timerAlert: q(".cook-timer-alert") ? q(".cook-timer-alert").textContent : null,
    // Shown only where THIS reader has blocked notifications for the site — a
    // state they may not know they are in (ADR 0069's rule, ADR 0071's case).
    noteShown: shown(q(".cook-notify-blocked")),
    noteText: q(".cook-notify-blocked") ? q(".cook-notify-blocked").textContent : null,
    // Ticking off (ROADMAP 17e). stageHtml is how the tool asserts that a tick
    // does NOT mutate the live region — the strike-through is CSS, so a tick
    // must leave the stage's markup byte-identical, or a screen reader would
    // re-read the whole step every time a box was checked.
    stageHtml: stage.innerHTML,
    stepTicked: q(".cook-step-tick .tick-box") ? q(".cook-step-tick .tick-box").checked : null,
    ingTicks: [...d.querySelectorAll(".cook-ing .tick-box")].map((b) => b.checked),
    ingTickIds: [...d.querySelectorAll(".cook-ing .tick-box")].map((b) => b.dataset.tick),
    tickTaps: [side(q(".cook-step-tick")), side(q(".cook-ing .tick"))],
    readShown: !!q(".cook-read"),
    readPressed: q(".cook-read") ? q(".cook-read").getAttribute("aria-pressed") : null,
    readTap: side(q(".cook-read")),
    ticksNative: [...d.querySelectorAll(".tick-box")].every(
      (b) => b.tagName === "INPUT" && b.type === "checkbox"
    ),
    live: stage.getAttribute("aria-live"),
    atomic: stage.getAttribute("aria-atomic"),
    focusInStage: document.activeElement === stage,
    focusInDialog: d.contains(document.activeElement),
    focusClass: document.activeElement ? document.activeElement.className : null,
    taps: [side(q(".cook-close")), side(q(".cook-prev")), side(nextBtn)],
    // Every control must carry a translation key, or reo.js silently leaves an
    // English word behind when the language is switched (ADR 0034, Consequences).
    keyed: [...d.querySelectorAll("button")].every(
      (b) => b.dataset.i18n || b.dataset.i18nAria || [...b.querySelectorAll("span")].some((s) => s.dataset.i18n)
    ),
  };
})()`;

// --- Runner ---------------------------------------------------------------

async function run(opts) {
  const report = new Report(opts.verbose);

  const data = JSON.parse(
    await readFile(join(SITE, "data", "restaurants", `${COLLECTION}.json`), "utf8")
  );
  const items = (data.menu || []).flatMap((s) => s.items || []);
  // The most-stepped recipe by default: the boundaries are the point, so the
  // fixture wants room between them. Named in the output either way.
  const byLength = [...items].sort((a, b) => (b.steps?.length || 0) - (a.steps?.length || 0));
  const recipe = opts.dish
    ? items.find((i) => i.name === opts.dish || slug(i.name) === slug(opts.dish))
    : byLength[0];
  if (!recipe) throw new Error(`no recipe named "${opts.dish}" in ${COLLECTION}`);
  const steps = recipe.steps || [];
  if (steps.length < 3) throw new Error(`"${recipe.name}" has ${steps.length} steps — too few`);
  // The page NEVER hands the raw `ingredients` array to cook.js: `cook-ui.js`
  // flattens it with `ingredientKeys` first, because a component-grouped recipe
  // holds {component, items[]} objects and `ingredientsForStep` keeps only the
  // strings. Passing the raw array here made this tool disagree with the render
  // on exactly the recipes that need it most — on Upside-Down Plum Cake, which
  // is 0 loose lines and 2 groups, every step "needed nothing", `idxNeeding`
  // was -1, and BOTH ingredient sections skipped in silence while the page
  // showed all 14 lines. Assert against what the page computes, never against
  // the shape on disk.
  const ingredientLines = ingredientKeys(recipe.ingredients);
  // The 1-of-24 with ingredients but no method; it must offer nothing at all.
  const noMethod = items.find((i) => !(i.steps || []).length);

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-cook-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const base = `http://127.0.0.1:${port}`;
    const recipeUrl = `${base}/recipe.html?id=${COLLECTION}&dish=${slug(recipe.name)}`;
    console.log(`Faves cook-mode check — ROADMAP 17d / ADR 0034`);
    console.log(`  recipe   ${recipe.name} (${steps.length} steps)`);
    console.log(`  page     ${recipeUrl}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed, ...VIEW });
    cdp = await Cdp.connect(chrome.wsUrl);
    report.step("connected to Chrome");

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    // Uncaught page exceptions, collected across every document this run loads —
    // a CDP-level handler survives the navigations that reset window state.
    const thrown = [];
    cdp.on("Runtime.exceptionThrown", (p) => {
      thrown.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "?");
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { ...VIEW, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT }, sessionId);

    const { evalPage, settle, click, press } = createDriver(cdp, sessionId, (m) => report.step(m));
    const snap = () => evalPage(SNAP);

    /** Set the browser's real notification permission for our origin — the
     *  browser's own state machine, not a stub the page could see through. */
    const setNotifications = (setting) =>
      cdp.send("Browser.setPermission", {
        origin: base,
        permission: { name: "notifications" },
        setting,
      });
    // Pinned before anything is driven, and NOT merely tidiness. Measured while
    // proving the alarm's guards by breaking them: a page that calls
    // `Notification.requestPermission()` inside a real click, on an origin with
    // no CDP permission override, raises a prompt this headless browser never
    // answers — and every subsequent `Runtime.evaluate` times out, so the run
    // dies as a HARNESS error 40 assertions before the thing it was proving.
    // Under an override the request resolves and the run continues. The check
    // therefore states the starting permission rather than inheriting whatever
    // the profile happened to have, which is also what makes section 13b's
    // granted/denied scenarios mean anything.
    await setNotifications("prompt");

    const goto = async (url, waitFor) => {
      await cdp.send("Page.navigate", { url }, sessionId);
      await until(async () => await evalPage(`!!document.querySelector(${JSON.stringify(waitFor)})`), {
        label: `${waitFor} on ${url}`,
      });
      await settle();
    };
    const openCook = async (selector = ".cook-start") => {
      await click(selector);
      await until(async () => (await snap()).open, { label: "cook mode to open" });
    };
    /** Wait for cook mode to be gone AND the lock question to have settled. */
    const closed = () => settleUntil(snap, (s) => !s.open && s.held === 0);

    // FOUND BY THIS CHECK 2026-08-15, RULED AND FIXED THE SAME DAY. Tapping
    // Back until step 1 disabled the Back button *while it held focus*, and
    // Chrome drops focus to <body> — outside the dialog. cook-ui.js listens for
    // keydown on the dialog, so from that moment the arrow keys, Home and End
    // did nothing. ADR 0034 promises "focus stays on Back/Next so repeated taps
    // keep working"; at the lower boundary it did not. Owner ruled: hand focus
    // to Next before disabling Back — it is the only control that still does
    // anything at step 1, and it keeps focus inside the dialog. ADR 0034's
    // rejection of focusing the *step* on every change stands untouched.
    // The assertion for that fix is in section 4 below.
    const focusStage = () => evalPage(`${need(".cook-stage")}.focus()`);

    // Hiding the page for real: a second tab takes the foreground, which is what
    // answering a text does to a phone. Measured here — Chrome fires the
    // sentinel's `release` event and then `visibilitychange`.
    let otherTab = null;
    const hidePage = async () => {
      otherTab ??= (await cdp.send("Target.createTarget", { url: "about:blank" })).targetId;
      await cdp.send("Target.activateTarget", { targetId: otherTab });
      await until(async () => (await snap()).visibility === "hidden", { label: "the page to hide" });
    };
    const showPage = async () => {
      await cdp.send("Target.activateTarget", { targetId });
      await until(async () => (await snap()).visibility === "visible", { label: "the page to show" });
    };

    // --- 1. The way in ----------------------------------------------------
    await goto(recipeUrl, ".cook-start");
    const before = await snap();
    report.check(
      "the recipe offers a Cook mode button with a 44px tap target",
      before.starts === 1 && before.startSide >= 44,
      `${before.starts} button, ${before.startSide}px tall`
    );
    report.check(
      "nothing holds a wake lock before cook mode is opened",
      before.requests === 0 && before.held === 0,
      `${before.requests} requests, ${before.held} held`
    );

    await openCook();
    const first = await snap();
    report.check(
      "cook mode opens as a modal dialog filling the viewport",
      first.modal && first.size[0] === VIEW.width && first.size[1] === VIEW.height,
      `:modal=${first.modal}, ${first.size.join("×")} in a ${VIEW.width}×${VIEW.height} viewport`
    );
    report.check(
      "exactly one step is on screen, and it is the first",
      first.stepCount === 1 && first.step === steps[0] && first.counter === `Step 1 of ${steps.length}`,
      `“${first.counter}” · ${first.stepCount} step element`
    );
    report.check(
      "the step and its counter share one polite live region, and focus lands there",
      first.live === "polite" && first.atomic === "true" && first.focusInStage,
      `aria-live=${first.live}, aria-atomic=${first.atomic}, focused=${first.focusInStage}`
    );
    report.check(
      "Back is disabled on the first step — the boundary saturates",
      first.prevDisabled === true,
      `prev disabled=${first.prevDisabled}`
    );
    report.check(
      "every cook-mode control keeps a 44px tap target",
      first.taps.every((t) => t >= 44),
      `close/back/next: ${first.taps.map((t) => `${t}px`).join(", ")}`
    );
    report.check(
      "every cook-mode button carries a translation key",
      first.keyed === true,
      `all keyed=${first.keyed}`
    );

    // The platform's inert background, not ours: a button on the recipe behind
    // must not be able to take focus while the modal is up. Focus is put back
    // on the stage afterwards, because the keyboard checks below need it there.
    const inert = await evalPage(`(() => {
      const b = ${need(".cook-start")};
      b.focus();
      const stolen = document.activeElement === b;
      ${need(".cook-stage")}.focus();
      return !stolen;
    })()`);
    report.check("the recipe behind cook mode cannot take focus", inert === true, `inert=${inert}`);

    // --- 2. The wake lock, on open ---------------------------------------
    const lockOn = await settleUntil(snap, (s) => s.held === 1);
    report.check(
      "opening cook mode takes exactly one real screen wake lock",
      lockOn.requests === 1 && lockOn.held === 1,
      `${lockOn.requests} request, ${lockOn.held} sentinel held (platform WakeLockSentinel)`
    );
    report.check(
      "“Screen stays on” is shown only because a lock is genuinely held",
      lockOn.awakeShown === true && lockOn.held === 1,
      `note shown=${lockOn.awakeShown}`
    );

    // --- 3. Stepping ------------------------------------------------------
    await click(".cook-next");
    const two = await snap();
    report.check(
      "Next advances one step, and the progress bar with it",
      two.counter === `Step 2 of ${steps.length}` && two.step === steps[1] &&
        two.prevDisabled === false && two.fill > first.fill,
      `“${two.counter}”, fill ${first.fill}% → ${two.fill}%`
    );
    await click(".cook-prev");
    const back = await snap();
    report.check(
      "Back returns to the previous step",
      back.counter === `Step 1 of ${steps.length}` && back.step === steps[0] && back.prevDisabled,
      `“${back.counter}”`
    );

    report.check(
      "Back going disabled at step 1 hands focus to Next, not out of the dialog",
      back.focusInDialog && /cook-next/.test(back.focusClass || ""),
      `focus on “${back.focusClass}”, inside the dialog=${back.focusInDialog}`
    );

    await press("ArrowRight");
    const keyFwd = await snap();
    await press("ArrowLeft");
    const keyBack = await snap();
    report.check(
      "arrow keys drive the steps too",
      keyFwd.counter === `Step 2 of ${steps.length}` && keyBack.counter === `Step 1 of ${steps.length}`,
      `→ “${keyFwd.counter}”, ← “${keyBack.counter}”`
    );

    await press("End");
    const last = await snap();
    report.check(
      "the last step turns Next into Done",
      last.counter === `Step ${steps.length} of ${steps.length}` &&
        last.step === steps[steps.length - 1] && last.nextText.includes("Done") &&
        last.nextText.includes("✓") && Math.round(last.fill) === 100,
      `“${last.counter}”, button reads “${last.nextText}”, fill ${last.fill}%`
    );
    await press("ArrowRight");
    const stillLast = await snap();
    report.check(
      "the last step never wraps round to the first",
      stillLast.counter === last.counter,
      `“${stillLast.counter}” after a forward press on the last step`
    );
    await press("Home");
    const home = await snap();
    report.check(
      "Home jumps back to the first step",
      home.counter === `Step 1 of ${steps.length}` && home.prevDisabled,
      `“${home.counter}”`
    );

    // --- 4. Each step carries its own ingredients, and its own timer ------
    // Rewritten 2026-08-16: the "Ingredients" toggle is gone. A step now SHOWS
    // the lines it is about and nothing when it is about none, and a step that
    // states a duration offers a one-tap countdown. Both are the owner's asks,
    // and both are things only a real render can confirm.
    //
    // Every assertion below is driven off the RECIPE DATA, not off hard-coded
    // step numbers: the corpus is edited constantly, and a check pinned to
    // "step 4" would start asserting something else the first time a recipe
    // gained a line.
    // Filled in below and read by the scale block at the end of the run.
    let oneXStep = null;
    const idxNeeding = steps.findIndex((t) => stepUsesIngredients(t, ingredientLines));
    const idxIdle = steps.findIndex((t) => !stepUsesIngredients(t, ingredientLines));
    const idxTimed = steps.findIndex((t) => stepDuration(t) != null);

    // ADR 0072, said out loud: both ingredient sections below are guarded by
    // `idxNeeding >= 0`, so when the matcher finds nothing they SKIP — and nine
    // assertions vanish leaving a wall of PASS that reads exactly like a clean
    // run. A recipe that lists ingredients must have at least one step that
    // names one; if it does not, either the matcher is broken or this tool has
    // been handed the wrong shape again, and both deserve a FAIL rather than a
    // silence.
    report.check(
      "at least one step names an ingredient, so the per-step sections actually RUN",
      ingredientLines.length === 0 || idxNeeding >= 0,
      `${ingredientLines.length} ingredient line(s); first step needing one = ${idxNeeding}` +
        ` (-1 would skip both ingredient sections in silence)`
    );

    if (idxNeeding >= 0) {
      await press("Home");
      for (let i = 0; i < idxNeeding; i++) await click(".cook-next");
      const needs = await snap();
      const expected = ingredientsForStep(steps[idxNeeding], ingredientLines);
      report.check(
        "a step shows just the ingredients it names — not the whole recipe",
        needs.ingOpen === true &&
          needs.ingItems === expected.length &&
          needs.ingItems < ingredientLines.length,
        `${needs.ingItems} of ${ingredientLines.length} lines on “${needs.counter}”`
      );
      report.check(
        "no horizontal overflow at 390 px with the step's ingredients shown",
        needs.overflow <= 0,
        `scrollWidth − clientWidth = ${needs.overflow}px`
      );

      // The 1× render of this step, kept for the scale block at the very END of
      // this run. It is measured here and asserted there on purpose: the
      // wake-lock sections between the two count every request and release
      // cumulatively, so an extra open/close in the middle makes three later
      // assertions fail on numbers that were never about it. A check that
      // cannot be reordered without breaking is worth knowing about; this one
      // is, so the reordering is done once, here, in a comment.
      oneXStep = { index: idxNeeding, keys: expected, lines: needs.ingText.slice() };
    }

    if (idxIdle >= 0) {
      await press("Home");
      for (let i = 0; i < idxIdle; i++) await click(".cook-next");
      const idle = await snap();
      report.check(
        "a step that needs nothing shows no ingredients at all",
        idle.ingOpen === false && idle.ingItems === 0,
        `“${idle.step.slice(0, 52)}…” → panel hidden=${!idle.ingOpen}`
      );
    }

    if (idxTimed >= 0) {
      await press("Home");
      for (let i = 0; i < idxTimed; i++) await click(".cook-next");
      const before = await snap();
      report.check(
        "a step that states how long it takes offers a timer, set to that long",
        before.timerShown === true &&
          before.timerTime === formatDuration(stepDuration(steps[idxTimed])) &&
          before.timerRunning === false,
        `“${before.timerTime}” on “${before.counter}”`
      );
      // The owner's first complaint, turned into arithmetic. Half a pixel of
      // slack for sub-pixel layout; anything more means the numeral is being
      // pushed off centre by something sharing its box again.
      report.check(
        "the countdown sits dead centre of its card, not centred-as-a-pair",
        before.timerOffCentre !== null && before.timerOffCentre <= 0.5,
        `numeral centre is ${before.timerOffCentre?.toFixed(2)}px off the card's`
      );
      // The bug this replaces: Reset used to hide until there was something to
      // reset, and hiding a focused control drops focus to <body>, outside the
      // dialog (ADR 0039). Asserting it is present BEFORE the timer has ever
      // run is the assertion that stops that coming back.
      report.check(
        "both timer controls are present before it has ever run — neither appears on state",
        before.resetShown === true && before.timerAria === `Start timer — ${formatDuration(stepDuration(steps[idxTimed]))}`,
        `resetShown=${before.resetShown}, name “${before.timerAria}”`
      );
      // One tap runs it, one tap stops it — the owner's whole spec for it.
      await click(".cook-timer-toggle");
      // Let a real second elapse before pausing. Without it the timer pauses on
      // the same tick it started, `remaining === total`, and the control is
      // correctly still pristine — which proves nothing about pause/resume.
      await sleep(1200);
      const running = await snap();
      report.check(
        "one tap starts the countdown, and the bar has come off full",
        running.timerRunning === true && running.resetShown === true &&
          running.timerFill !== null && running.timerFill < 100,
        `running=${running.timerRunning}, bar at ${running.timerFill}%`
      );
      // The face carries an icon now, so the verb lives only in the accessible
      // name. A screen-reader user with a shape and a number and no verb is the
      // regression this catches.
      report.check(
        "while running, the accessible name says what a tap will DO, not what it is",
        /^Pause — /.test(running.timerAria || ""),
        `name “${running.timerAria}”`
      );
      await click(".cook-timer-toggle");
      const paused = await snap();
      report.check(
        "a second tap pauses it, keeping the time it had reached",
        paused.timerRunning === false &&
          paused.timerTime !== formatDuration(stepDuration(steps[idxTimed])) &&
          paused.timerLabel === "Resume" &&
          /^Resume — /.test(paused.timerAria || ""),
        `paused at ${paused.timerTime}, name “${paused.timerAria}”`
      );
      await click(".cook-timer-reset");
      const reset = await snap();
      report.check(
        "Reset puts it back to the full duration, bar and all",
        reset.timerTime === formatDuration(stepDuration(steps[idxTimed])) &&
          reset.timerRunning === false && reset.timerFill === 100,
        `back to ${reset.timerTime}, bar at ${reset.timerFill}%`
      );
      // Reset on an untouched timer is a no-op, and that is the POINT: it is
      // what lets the control stay put instead of vanishing. Prove it is
      // harmless rather than merely assuming it.
      await click(".cook-timer-reset");
      const resetTwice = await snap();
      report.check(
        "resetting an untouched timer is a harmless no-op, which is why it can stay put",
        resetTwice.timerTime === formatDuration(stepDuration(steps[idxTimed])) &&
          resetTwice.timerRunning === false && resetTwice.resetShown === true,
        `still ${resetTwice.timerTime}, still shown`
      );
    }

    const untimed = steps.findIndex((t) => stepDuration(t) == null);
    if (untimed >= 0) {
      await press("Home");
      for (let i = 0; i < untimed; i++) await click(".cook-next");
      const none = await snap();
      report.check(
        "a step that never says how long gets NO timer — the number is read, never guessed",
        none.timerShown === false,
        `“${none.step.slice(0, 52)}…”`
      );
    }

    await press("Home");

    // --- 4b. Ticking off as you go (ROADMAP 17e) --------------------------
    // A checklist is trivial to write and easy to get wrong in three ways a
    // unit test cannot see: the box may not be a real checkbox, the tick may
    // mutate the live region (which re-reads the whole step aloud), and
    // rebuilding the ingredient list around a focused box drops focus to
    // <body> — the exact fault this tool found on the Back button in 2026-08-15
    // and on the timer's Reset the day after.
    if (idxNeeding >= 0) {
      const needed = ingredientsForStep(steps[idxNeeding], ingredientLines);
      await press("Home");
      for (let i = 0; i < idxNeeding; i++) await click(".cook-next");
      const t0 = await snap();
      report.check(
        "every tickable line is a real checkbox on a 44px row",
        t0.ticksNative === true &&
          t0.ingTicks.length === needed.length &&
          t0.ingTicks.every((on) => on === false) &&
          t0.tickTaps.every((n) => n >= 44),
        `${t0.ingTicks.length} ingredient boxes, rows ${t0.tickTaps.map((n) => `${n}px`).join("/")}` +
          ` (step tick / ingredient row)`
      );

      const firstId = t0.ingTickIds[0];
      await click(".cook-ing .tick-box");
      const t1 = await snap();
      report.check(
        "ticking an ingredient changes nothing in the live region",
        t1.ingTicks[0] === true && t1.stageHtml === t0.stageHtml,
        `ticked=${t1.ingTicks[0]}, stage markup identical=${t1.stageHtml === t0.stageHtml}` +
          ` (the strike-through is CSS, so no re-announcement)`
      );
      report.check(
        "a tick made in cook mode reaches the recipe page behind it, live",
        (t1.pageTicks.find(([id]) => id === firstId) || [])[1] === true,
        `line ${firstId} ticked on both surfaces without a reload`
      );

      // The trap: the ingredient list is rebuilt on every step change, so a
      // step taken while a box holds focus destroys the focused node.
      await evalPage(`${need(".cook-ing .tick-box")}.focus()`);
      const held = await snap();
      await press("ArrowRight");
      const moved = await snap();
      report.check(
        "stepping on while a tick box holds focus keeps focus inside the dialog",
        held.focusInDialog === true &&
          /tick-box/.test(held.focusClass || "") &&
          moved.focusInDialog === true &&
          /cook-next/.test(moved.focusClass || ""),
        `focus “${held.focusClass}” → “${moved.focusClass}”, in the dialog=${moved.focusInDialog}`
      );
      await press("ArrowLeft");
      const backOn = await snap();
      report.check(
        "the tick survives the step being rebuilt around it",
        backOn.ingTickIds[0] === firstId && backOn.ingTicks[0] === true,
        `line ${firstId} still ticked after stepping away and back`
      );
    }

    // The step's own tick, which is one box re-pointed rather than one per step
    // — so it must follow the step you are on, and never carry a tick across.
    await press("Home");
    const p0 = await snap();
    await click(".cook-step-tick .tick-box");
    const p1 = await snap();
    await click(".cook-next");
    const p2 = await snap();
    await click(".cook-prev");
    const p3 = await snap();
    report.check(
      "the step tick belongs to the step, and follows you as you move",
      p0.stepTicked === false && p1.stepTicked === true && p2.stepTicked === false &&
        p3.stepTicked === true,
      `step 1 ${p0.stepTicked}→${p1.stepTicked}, step 2 ${p2.stepTicked}, back on step 1 ${p3.stepTicked}`
    );

    await press("Home");

    // --- 4c. Reading the step aloud (ROADMAP 17e) -------------------------
    // An utterance is this feature's wake lock. `speechSynthesis` belongs to
    // the BROWSER, not to the document, so anything left speaking keeps talking
    // at whatever the reader opens next — the same shape of leak ADR 0034 paid
    // for, and the reason every count below is taken off the real API.
    const quiet = await snap();
    report.check(
      "cook mode offers a Read aloud control, and says nothing until it is tapped",
      quiet.hasSpeech === true && quiet.readShown === true && quiet.readPressed === "false" &&
        quiet.readTap >= 44 && quiet.speaks === 0,
      `control shown=${quiet.readShown} at ${quiet.readTap}px, ${quiet.speaks} utterances so far`
    );

    await click(".cook-read");
    const said = await snap();
    report.check(
      "one tap reads the step that is on screen — its number, its words, its ingredients",
      said.speaks === 1 &&
        (said.spoken || "").startsWith(`Step 1 of ${steps.length}. `) &&
        (said.spoken || "").includes(steps[0]),
      `“${(said.spoken || "").slice(0, 64)}…”`
    );

    await press("ArrowRight");
    const stepped = await snap();
    report.check(
      "changing step cancels the utterance rather than talking over the new one",
      stepped.cancels > said.cancels &&
        stepped.readPressed === "false" &&
        stepped.synthSpeaking === false &&
        stepped.speaks === 1,
      `${said.cancels} → ${stepped.cancels} cancel() calls on the real API, still ${stepped.speaks} utterance`
    );

    // Leave it speaking, so the Escape in section 5 has something to cut off.
    await press("Home");
    await click(".cook-read");
    const midSentence = await snap();

    // --- 5. Exit one: Escape, with the panel open (ADR 0034 §3) -----------
    await press("Escape");
    const escaped = await closed();
    report.check(
      "Escape closes cook mode outright, ingredients on screen and all",
      escaped.open === false,
      `dialog present=${escaped.open}`
    );
    report.check(
      "closing hands the wake lock back",
      escaped.held === 0 && escaped.releases >= 1,
      `${escaped.held} held, ${escaped.releases} release() call(s) for ${escaped.requests} request(s)`
    );
    report.check(
      "focus returns to the Cook mode button",
      escaped.focusIsStart === true,
      `focus on .cook-start=${escaped.focusIsStart}`
    );
    report.check(
      "closing cook mode mid-sentence leaves nothing speaking",
      escaped.cancels > midSentence.cancels && escaped.synthSpeaking === false,
      `${midSentence.cancels} → ${escaped.cancels} cancel() calls, platform speaking=${escaped.synthSpeaking}`
    );

    // --- 6. Re-entry ------------------------------------------------------
    // Where a leaked lock or a stale index shows up: a second visit that starts
    // anywhere but step 1, or that never asks for a lock because it thinks it
    // still holds one.
    await openCook();
    const again = await settleUntil(snap, (s) => s.held === 1);
    report.check(
      "re-entry starts at step 1 again and takes a fresh lock",
      again.counter === `Step 1 of ${steps.length}` && again.requests === 2 && again.held === 1,
      `“${again.counter}”, ${again.requests} requests total, ${again.held} held`
    );

    // --- 7. The OS takes the lock back (ADR 0034 §5) ----------------------
    await hidePage();
    const hidden = await settleUntil(snap, (s) => s.held === 0);
    report.check(
      "hiding the page leaves no wake lock held",
      hidden.held === 0,
      `${hidden.held} held while hidden (Chrome releases on hide, then fires visibilitychange)`
    );
    await showPage();
    const shown = await settleUntil(snap, (s) => s.held === 1);
    report.check(
      "coming back re-acquires exactly one lock — the `wanted` flag doing its job",
      shown.held === 1 && shown.requests === 3 && shown.awakeShown === true,
      `${shown.requests} requests total, ${shown.held} held, note shown=${shown.awakeShown}`
    );

    // --- 8. Exit two: Done on the last step -------------------------------
    await focusStage();
    await press("End");
    await click(".cook-next");
    const done = await closed();
    report.check(
      "Done on the last step closes cook mode and releases the lock",
      done.open === false && done.held === 0,
      `dialog present=${done.open}, ${done.held} held`
    );

    // --- 9. Exit three: ✕, with the request still in flight ---------------
    // Leak (b): open and close inside the request's window and the arriving
    // sentinel was stored AFTER release() had run — held forever, by nobody.
    // The stall makes that window wide enough to drive; the request, the
    // sentinel and the release are all the platform's.
    // The block matters: Runtime.evaluate awaits whatever the expression
    // evaluates to, and this one deliberately makes a promise nobody resolves
    // yet — hand it back and the harness waits on its own stall.
    await evalPage(`(() => {
      window.__cookWake.stall = new Promise((r) => { window.__cookWake.go = r; });
    })()`);
    await click(".cook-start");
    await until(async () => (await snap()).open, { label: "cook mode to open" });
    await click(".cook-close");
    const midFlight = await snap();
    await evalPage(`window.__cookWake.go()`);
    const raced = await closed();
    report.check(
      "the ✕ closes cook mode",
      midFlight.open === false,
      `dialog present=${midFlight.open} while the wake-lock request was still in flight`
    );
    report.check(
      "a close that beats the wake-lock request strands nothing",
      raced.held === 0,
      `${raced.held} held after the in-flight sentinel arrived (${raced.requests} requests, ` +
        `${raced.releases} releases)`
    );

    // --- 10. Navigating away ----------------------------------------------
    // The lock a destroyed document held is the browser's to release, and a page
    // that no longer exists cannot be asked — so what is checked is the half
    // that is checkable: nothing sticky survives into the document you land on.
    await openCook();
    await goto(`${base}/index.html`, "#restaurant-list, .card, main");
    await goto(recipeUrl, ".cook-start");
    const returned = await snap();
    await openCook();
    const afterNav = await settleUntil(snap, (s) => s.held === 1);
    report.check(
      "navigating away with cook mode open leaves a clean page behind",
      returned.open === false && returned.requests === 0 && afterNav.requests === 1 &&
        afterNav.held === 1 && afterNav.counter === `Step 1 of ${steps.length}`,
      `back on the recipe: ${returned.requests} requests, then cook mode reopens with ` +
        `${afterNav.held} lock on “${afterNav.counter}”`
    );

    // --- 11. Reduced motion ------------------------------------------------
    const motionOn = afterNav.motion;
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId
    );
    await settle();
    const motionOff = (await snap()).motion;
    await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
    // The app's blanket reduce rule clamps every transition to 0.001ms rather
    // than to zero (a true 0s cancels transitionend, which some code relies on),
    // so "off" here means imperceptible, not literally none.
    report.check(
      "the progress bar animates by default and stops for prefers-reduced-motion",
      parseFloat(motionOn) > 0.05 && parseFloat(motionOff) <= 0.001,
      `transition-duration ${motionOn} → ${motionOff} under reduce`
    );
    await press("Escape");
    await closed();

    // --- 12. The other entry point (ADR 0034 §6) --------------------------
    await goto(`${base}/restaurant.html?id=${COLLECTION}`, ".recipe-detail");
    // Scope by the dish's OWN id (ADR 0051), never by its NAME. A name match
    // reads the whole card, and `goesWith` prints OTHER dishes' names onto a
    // card: Shane's Ribs lists "Sticky Date Pudding" as a pairing and sits
    // earlier in the list, so it won the match. The check then opened the
    // WRONG recipe, started cook mode on it, and failed the "same checklist"
    // assertion below — with a message accusing the APP of keeping a second
    // copy of your ticks. Measured 2026-08-19: Sticky Date Pudding failed and
    // Upside-Down Plum Cake passed for exactly this reason, and the pairing
    // corpus decides which recipes are affected, so it grows silently.
    //
    // The old `|| d[0]` fallback went with it, and that half matters more: a
    // silent retarget to the first recipe on the page is what turned "this
    // tool cannot find its fixture" into "the product loses your ticks".
    const listDetail = need(".recipe-detail", need(`#dish-${recipe.dishId}`));
    await evalPage(`(() => {
      const one = ${listDetail};
      one.open = true;
      one.scrollIntoView({ block: "center" });
    })()`);
    await settle();
    const listOpen = await evalPage(
      `document.querySelectorAll("#dish-${recipe.dishId} .recipe-detail[open] .cook-start").length`
    );
    await openCook(`#dish-${recipe.dishId} .recipe-detail[open] .cook-start`);
    const fromList = await settleUntil(snap, (s) => s.held === 1);
    report.check(
      "the Cook at Home list is a second way in, and it works the same",
      listOpen >= 1 && fromList.open && /^Step 1 of \d+$/.test(fromList.counter) && fromList.held === 1,
      `“${fromList.counter}” from the expanded recipe, ${fromList.held} lock held`
    );
    // The two entry points must key the checklist the same way, or a recipe
    // started from the list would be a second, empty copy of the same recipe.
    // Step 1 was ticked back in 4b, from the recipe page.
    report.check(
      "the list's way in reaches the SAME checklist, not a second copy",
      fromList.stepTicked === true,
      `step 1 still ticked when cook mode is opened from the Cook at Home list`
    );
    await press("Escape");
    const listClosed = await closed();
    report.check(
      "closing it from the list releases the lock too",
      listClosed.open === false && listClosed.held === 0,
      `${listClosed.held} held after close`
    );

    // --- 12b. The scale the reader chose has to come THROUGH (17a) --------
    // The owner picked 2× on the recipe page, tapped Start cooking, and the
    // step told him ¾ cup where the page above him said 1½ cups (2026-08-17).
    // Nothing caught it: the picker lives in recipe.js, cook mode had never
    // heard of it, and all 75 assertions in this file were about a screen it
    // had opened at 1×. Only a browser can see this one — the pure rules on
    // both sides were each correct and had simply never been introduced.
    //
    // Last in the run deliberately: it opens and closes cook mode an extra
    // time, and §7–§10 above assert on CUMULATIVE wake-lock request counts.
    if (oneXStep) {
      await goto(recipeUrl, ".cook-start");
      const hasPicker = await evalPage(`!!document.querySelector(".scale-btn")`);
      if (!hasPicker) {
        // Logged, never silent: a skipped assertion reads exactly like a
        // passing one in a wall of PASS (CLAUDE.md, "no silent caps").
        report.step(`SKIPPED the scale assertions — “${recipe.name}” offers no scale picker`);
      } else {
        await click(".scale-btn", TWO.label);
        await openCook();
        await press("Home");
        for (let i = 0; i < oneXStep.index; i++) await click(".cook-next");
        const twoX = await snap();
        // What those lines SHOULD read — computed from the app's own scaler
        // over the app's own block structure, never typed out here, so this
        // cannot pass by agreeing with a second copy of the arithmetic.
        const lineOf = new Map(
          ingredientBlocks(recipe.ingredients).flatMap((b) =>
            b.lines.map((l) => [l.key, { text: l.text, component: b.component }])
          )
        );
        const two = scaleFor(TWO.key);
        const want = oneXStep.keys.map((key) => {
          const line = lineOf.get(key) || { text: key, component: null };
          const t = scaleLineStatus(line.text, two).text;
          return line.component ? `${line.component}: ${t}` : t;
        });
        // The "as written" mark is a separate span in the same <li>; strip it
        // before comparing text, and assert it separately below.
        const got = twoX.ingText.map((s) => s.replace(/\s*as written\s*$/, "").trim());
        const firstDiff = want.findIndex((w, i) => got[i] !== w);
        report.check(
          "a step's ingredients are shown at the scale the reader picked, not at 1×",
          got.length === want.length && firstDiff < 0,
          firstDiff < 0
            ? `${got.length} line(s) match the scaler exactly, e.g. “${got[0]}”`
            : `line ${firstDiff + 1}: got “${got[firstDiff]}” · want “${want[firstDiff]}”`
        );
        report.check(
          "…and at least one of them really did change — a step that cannot scale proves nothing",
          got.some((g, i) => g !== oneXStep.lines[i]),
          `${got.filter((g, i) => g !== oneXStep.lines[i]).length} of ${got.length} line(s) differ ` +
            `from the 1× render of the same step`
        );
        // A line the scaler REFUSED must still say so here. Cook mode is where
        // a half-scaled list does its damage: the reader is at the bench with
        // the bowl, not comparing the page against itself.
        const blocked = oneXStep.keys.filter((key) => {
          const line = lineOf.get(key) || { text: key, component: null };
          return scaleLineStatus(line.text, two).status === "blocked";
        }).length;
        const marked = twoX.ingText.filter((s) => /as written\s*$/.test(s)).length;
        report.check(
          "a line the scaler refused is marked “as written” in cook mode too",
          marked === blocked,
          `${marked} marked on screen · ${blocked} refused by quantity.js`
        );
        // The badge, because a full-screen mode hides the picker that set it.
        report.check(
          "cook mode says WHICH mixture you are making once it is not 1×",
          twoX.scaleBadge != null && twoX.scaleBadge.includes(TWO.label),
          twoX.scaleBadge == null
            ? "no .cook-scale badge in the header"
            : `badge reads “${twoX.scaleBadge}”`
        );
        await press("Escape");
        await closed();
      }
    }

    // --- 13. A recipe with no method --------------------------------------
    if (noMethod) {
      await goto(`${base}/recipe.html?id=${COLLECTION}&dish=${slug(noMethod.name)}`, ".ingredients");
      const bare = await snap();
      report.check(
        "a recipe with no method offers no Cook mode button at all",
        bare.starts === 0,
        `“${noMethod.name}”: ${bare.starts} cook buttons`
      );
    }

    // --- 13b. The timer's alarm (ROADMAP 36d, ADR 0071) -------------------
    // Three channels, three ways to get it wrong, and one scarce resource. A
    // countdown that ends in silence is a countdown you have to watch, which is
    // the one thing a cook cannot do — so the assertions below are about what
    // the platform was actually ASKED to do at the moment a timer hit zero.
    //
    // WHAT IS FAKED: the clock, and nothing else. A thirty-minute bake cannot
    // be waited out, and cook.js stores the wall clock a countdown ends at
    // rather than decrementing a counter — so winding Date.now forward is
    // precisely what a phone that slept through the bake sees when it wakes.
    // The oscillator, the vibrate call, the permission state and the
    // notification are all the browser's own.
    //
    // WHAT A GREEN RUN HERE CANNOT SHOW, stated rather than glossed:
    //   · that a sound came out. There is no speaker; what is counted is the
    //     node graph the page built and scheduled.
    //   · that a phone moved. `navigator.vibrate` exists on desktop Chrome and
    //     returns false — no motor. The call is real, the buzz is not.
    //   · that a notification was drawn, survived being backgrounded, or that
    //     tapping it reopened the recipe. Headless Chrome accepts the call and
    //     there is nothing to look at; `notificationclick` in sw.js is exercised
    //     by nothing here and needs a real phone.
    //   · that a bell rings at all on a phone whose screen is off and whose tab
    //     the OS has frozen. That is the case the notification exists FOR, and
    //     it is the one no browser on a laptop can reproduce.
    const timedIn = (item, pred) => {
      const list = item.steps || [];
      const i = list.findIndex((s) => {
        const d = stepDuration(s);
        return d != null && pred(d);
      });
      return i < 0 ? null : { item, index: i, seconds: stepDuration(list[i]) };
    };
    // The run's own recipe first, so `--dish` still steers this where it can;
    // otherwise whichever recipe in the collection has a step of the right
    // length. Driven off the DATA, like everything else here — a check pinned to
    // "Gingerbread Cookies, step 5" starts asserting something else the first
    // time the corpus is edited.
    const findTimed = (pred) => {
      for (const it of [recipe, ...items]) {
        const found = timedIn(it, pred);
        if (found) return found;
      }
      return null;
    };
    const shortTimer = findTimed((d) => d <= NOTIFY_OVER_SECONDS);
    const longTimer = findTimed((d) => d > NOTIFY_OVER_SECONDS);
    const urlFor = (item) => `${base}/recipe.html?id=${COLLECTION}&dish=${slug(item.name)}`;

    /** Open `item`, walk to its timed step, and start the countdown there.
     *
     *  The Reset tap is not decoration and it is not a workaround. A running
     *  timer now SURVIVES the sheet (Theme 36, section 15b), so a scenario that
     *  simply tapped the toggle would be toggling whatever the previous scenario
     *  left behind — pausing a live countdown instead of starting one. Reset is
     *  the reader's own way back to a known state, and it is a no-op on an
     *  untouched timer, so every scenario below starts from the top whichever
     *  order they run in. Found by this check: without it, four alarm assertions
     *  went red because the bell they were waiting for was never armed. */
    const startTimerOn = async ({ item, index }) => {
      await goto(urlFor(item), ".cook-start");
      await openCook();
      await press("Home");
      for (let i = 0; i < index; i++) await click(".cook-next");
      await click(".cook-timer-reset");
      const before = await snap();
      await click(".cook-timer-toggle");
      return before;
    };
    /** Wind the wall clock past the end and wait for the bell. */
    const ringOut = async (seconds) => {
      await evalPage(`window.__cookClock.skew = ${(seconds + 5) * 1000}`);
      // The interval ticks once a second; give it a few, then assert on
      // whatever arrived rather than throwing (settleUntil's whole point).
      return settleUntil(snap, (s) => s.timerDone === true && s.alarm.oscillators > 0, {
        timeout: 8000,
      });
    };

    if (shortTimer) {
      await setNotifications("prompt");
      const before = await startTimerOn(shortTimer);
      report.check(
        "arming happens on the tap that starts the timer, not at page load",
        before.alarm.contexts === 0 && (await snap()).alarm.contexts === 1,
        `${before.alarm.contexts} audio context(s) before the tap, ` +
          `${(await snap()).alarm.contexts} after — autoplay policy needs the gesture`
      );
      const rung = await ringOut(shortTimer.seconds);
      report.check(
        "a timer that reaches zero sounds a tone and buzzes — both permission-free",
        rung.alarm.oscillators === 3 &&
          rung.alarm.vibrations === 1 &&
          Array.isArray(rung.alarm.lastPattern) &&
          rung.alarm.lastPattern.length > 1,
        `${rung.alarm.oscillators} oscillator(s) scheduled, ${rung.alarm.vibrations} vibrate() ` +
          `call(s) with pattern [${rung.alarm.lastPattern}] — real APIs, no speaker, no motor`
      );
      // The bell has to reach a reader who cannot hear it. The numeral is
      // role="timer" (aria-live: off, deliberately), so without this region
      // "time's up" reaches nobody using a screen reader.
      report.check(
        "the bell is announced, not merely sounded",
        typeof rung.timerAlert === "string" &&
          rung.timerAlert.includes("Step ") &&
          rung.timerAlert.includes(shortTimer.item.name) &&
          rung.timerDone === true,
        `role="alert" says “${(rung.timerAlert || "").slice(0, 70)}”`
      );
      report.check(
        `a timer of ${shortTimer.seconds}s asks for NO permission — a prompt is spent once per browser`,
        rung.alarm.notifyRequests === 0 &&
          rung.alarm.sw.length === 0 &&
          rung.alarm.page.length === 0 &&
          rung.noteShown === false,
        `${rung.alarm.notifyRequests} permission request(s), ` +
          `${rung.alarm.sw.length + rung.alarm.page.length} notification(s), ` +
          `at or under the ${NOTIFY_OVER_SECONDS}s line (wantsNotification=${wantsNotification(shortTimer.seconds)})`
      );
      // A reset re-arms the bell: without it a timer run twice rings once.
      await click(".cook-timer-reset");
      await click(".cook-timer-toggle");
      const twice = await ringOut(shortTimer.seconds * 2);
      report.check(
        "a reset re-arms the bell, and a bell still rings exactly once per run",
        twice.alarm.oscillators === 6 && twice.alarm.vibrations === 2,
        `${twice.alarm.oscillators} oscillators and ${twice.alarm.vibrations} buzzes over two runs ` +
          `(a bell stuck on would be dozens of each — the interval ticks every second)`
      );
      await press("Escape");
      const shut = await closed();
      report.check(
        "closing cook mode hands the audio hardware back",
        shut.alarm.closes >= 1,
        `${shut.alarm.closes} AudioContext.close() call(s) — the wake lock's lesson, third coat`
      );
    }

    // TWO TIMERS, ONE CLOCK — and the assertion that actually proves the bell
    // rings once. Found by breaking it: with the ring-once guard deleted, a
    // single-timer scenario still passed, because the tick that rings the last
    // running timer is also the tick that stops the interval. The guard only
    // bites while ANOTHER timer keeps the clock alive — which is the real
    // kitchen case (the sauce and the bake are both on) and the one where a
    // missing guard rings a bell every second for the rest of the recipe.
    const pair = [recipe, ...items]
      .map((it) => {
        const timed = (it.steps || [])
          .map((s, i) => [i, stepDuration(s)])
          .filter(([, d]) => d != null)
          .sort((a, b) => a[1] - b[1]);
        if (timed.length < 2) return null;
        const [short, long] = [timed[0], timed[timed.length - 1]];
        // Enough daylight between them that winding past the short one cannot
        // land on the long one as well.
        return long[1] > short[1] + 60 ? { item: it, short, long } : null;
      })
      .find(Boolean);

    if (pair) {
      // Pin the permission where it cannot prompt. The long half of the pair is
      // over fifteen minutes by construction, so starting it would raise a real
      // browser prompt — and a prompt this headless browser never answers wedges
      // the whole run (measured: every later CDP call times out, and the process
      // hangs rather than failing). A blocked browser still sounds and buzzes,
      // which is the only thing this scenario is about.
      await setNotifications("denied");
      await goto(urlFor(pair.item), ".cook-start");
      await openCook();
      const walkTo = async (i) => {
        await press("Home");
        for (let n = 0; n < i; n++) await click(".cook-next");
      };
      await walkTo(pair.long[0]);
      await click(".cook-timer-toggle");
      await walkTo(pair.short[0]);
      await click(".cook-timer-toggle");
      await evalPage(`window.__cookClock.skew = ${(pair.short[1] + 5) * 1000}`);
      await settleUntil(snap, (s) => s.alarm.oscillators > 0, { timeout: 8000 });
      // Four more seconds of interval with the long timer still counting: a
      // bell with no guard would have rung four more times by now.
      await sleep(4000);
      const once = await snap();
      report.check(
        "a bell rings ONCE, even while a second timer keeps the clock ticking",
        once.alarm.oscillators === 3 && once.alarm.vibrations === 1,
        `${pair.short[1]}s bell rung beside a ${pair.long[1]}s timer, then 4s of further ticks: ` +
          `${once.alarm.oscillators} oscillator(s), ${once.alarm.vibrations} buzz(es) ` +
          `(unguarded, this is one bell per second)`
      );
      await press("Escape");
      await closed();
      await setNotifications("prompt");
    }

    if (longTimer) {
      // (a) Undecided: the ask arrives on the tap that starts a long timer, and
      //     at no other moment in the whole session.
      await setNotifications("prompt");
      const before = await startTimerOn(longTimer);
      const asked = await snap();
      report.check(
        `a timer of ${longTimer.seconds}s asks — once, on the start tap, never on arrival`,
        before.alarm.notifyRequests === 0 && asked.alarm.notifyRequests === 1,
        `${before.alarm.notifyRequests} request(s) after loading the recipe and opening cook mode, ` +
          `${asked.alarm.notifyRequests} after the tap`
      );
      // Headless Chrome auto-dismisses the prompt, which resolves to "default"
      // — the dismissed case, and the one that must stay silent.
      report.check(
        "a dismissed prompt says nothing at all — it is not a refusal",
        asked.notifyPermission === "default" && asked.noteShown === false,
        `permission “${asked.notifyPermission}”, blocked line shown=${asked.noteShown}`
      );

      // (b) Granted: the notification is raised through the service worker,
      //     carrying the recipe it must reopen. The permission is the browser's,
      //     set through CDP — not a stub.
      await setNotifications("granted");
      await goto(urlFor(longTimer.item), ".cook-start");
      // The SW path is the only one Chrome on Android accepts, so wait for the
      // registration rather than letting the run silently take the fallback.
      const registered = await until(
        async () => await evalPage(`navigator.serviceWorker.getRegistration().then((r) => !!r)`),
        { label: "the service worker to register" }
      );
      await openCook();
      await press("Home");
      for (let i = 0; i < longTimer.index; i++) await click(".cook-next");
      // Reset first, for the reason `startTimerOn` spells out: scenario (a) above
      // left this very timer RUNNING, and since Theme 36 a running timer survives
      // the sheet — so an unreset toggle here PAUSES it and the bell never rings.
      // Measured: three assertions below went red on exactly that.
      await click(".cook-timer-reset");
      await click(".cook-timer-toggle");
      const rung = await ringOut(longTimer.seconds);
      const raised = rung.alarm.sw[0];
      report.check(
        "a granted long timer raises ONE notification through the service worker",
        registered === true &&
          rung.alarm.sw.length === 1 &&
          rung.alarm.page.length === 0 &&
          rung.alarm.notifyRequests === 0,
        `${rung.alarm.sw.length} showNotification() call(s) on the real registration, ` +
          `${rung.alarm.page.length} via the page constructor, ` +
          `${rung.alarm.notifyRequests} fresh prompt(s) — already granted, so it never asks again`
      );
      report.check(
        "the notification carries the recipe it has to reopen, and a tag so it cannot stack",
        !!raised &&
          String(raised.title).includes(longTimer.item.name) &&
          String(raised.options?.data?.url).includes(`dish=${slug(longTimer.item.name)}`) &&
          String(raised.options?.tag).startsWith("faves-timer:"),
        `“${raised?.title}” → ${raised?.options?.data?.url} (tag ${raised?.options?.tag})`
      );
      report.check(
        "the tone and the buzz fire alongside it, not instead of it",
        rung.alarm.oscillators === 3 && rung.alarm.vibrations === 1,
        `${rung.alarm.oscillators} oscillator(s), ${rung.alarm.vibrations} vibrate() call(s)`
      );
      await press("Escape");
      await closed();

      // (c) Denied: the channel is gone, the other two are not, and the reader
      //     is told once — silence about a state they may not know they are in
      //     is a defect (ADR 0069, applied here by ADR 0071).
      await setNotifications("denied");
      await startTimerOn(longTimer);
      const denied = await ringOut(longTimer.seconds);
      report.check(
        "a blocked browser still sounds and buzzes, and raises nothing",
        denied.alarm.oscillators === 3 &&
          denied.alarm.vibrations === 1 &&
          denied.alarm.sw.length === 0 &&
          denied.alarm.page.length === 0 &&
          denied.alarm.notifyRequests === 0,
        `${denied.alarm.oscillators} oscillator(s), ${denied.alarm.vibrations} buzz(es), ` +
          `${denied.alarm.sw.length + denied.alarm.page.length} notification(s), ` +
          `${denied.alarm.notifyRequests} re-asks (a decided browser is never asked again)`
      );
      report.check(
        "a long timer on a blocked browser says so once, in place, and never nags",
        denied.noteShown === true &&
          /blocked/i.test(denied.noteText || "") &&
          /sounds and vibrates/i.test(denied.noteText || "") &&
          denied.errors.length === 0,
        `“${(denied.noteText || "").slice(0, 96)}…”`
      );
      await press("Escape");
      await closed();

      // (d) No Notification API at all. Removed, not stubbed — the requirement
      //     is two working channels and NOTHING said about a setting there is
      //     no way to go and change.
      const { identifier } = await cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        { source: NO_NOTIFICATION },
        sessionId
      );
      await setNotifications("prompt");
      await startTimerOn(longTimer);
      const bare = await ringOut(longTimer.seconds);
      // Read off the page rather than off the instrument: `hasNotification` is
      // recorded when the instrument runs, which is BEFORE this removal, so it
      // would say "true" here and quietly assert nothing.
      report.check(
        "with no Notification API the bell still rings in two channels, and says nothing",
        bare.notifyPermission === "unsupported" &&
          bare.alarm.oscillators === 3 &&
          bare.alarm.vibrations === 1 &&
          bare.alarm.notifyRequests === 0 &&
          bare.noteShown === false &&
          bare.errors.length === 0,
        `window.Notification → ${bare.notifyPermission}, ${bare.alarm.oscillators} oscillator(s), ` +
          `${bare.alarm.vibrations} buzz(es), blocked line shown=${bare.noteShown}, ` +
          `page errors=${bare.errors.length}`
      );
      await press("Escape");
      await closed();
      // Put the API back: the sections below are not about notifications, and a
      // removal that outlives its own scenario is how a check starts measuring
      // something nobody meant it to.
      await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier }, sessionId);
      await setNotifications("prompt");
    }

    // --- 14. A browser without the API (iOS before 16.4) ------------------
    // The API is REMOVED, not faked: everything else on the page is real, and
    // what is under test is that feature detection degrades in silence.
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: NO_WAKE_LOCK }, sessionId);
    await goto(recipeUrl, ".cook-start");
    await openCook();
    await click(".cook-next");
    const noApi = await snap();
    report.check(
      "with no wakeLock API cook mode still works, silently and with no note",
      noApi.open && noApi.counter === `Step 2 of ${steps.length}` && noApi.awakeShown === false &&
        noApi.requests === 0 && noApi.errors.length === 0,
      `“${noApi.counter}”, note shown=${noApi.awakeShown}, page errors=${noApi.errors.length}`
    );
    await press("Escape");
    await closed();

    // --- 14b. A browser with no speech at all -----------------------------
    // Removed, not stubbed. The requirement is that cook mode then offers NO
    // control — a button that cannot speak is worse than no button, because it
    // is the reader who has to work out which of the two they are looking at.
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: NO_SPEECH }, sessionId);
    await goto(recipeUrl, ".cook-start");
    await openCook();
    await click(".cook-next");
    const noVoice = await snap();
    report.check(
      "with no speechSynthesis there is no Read aloud control at all — never a dead button",
      noVoice.open && noVoice.hasSpeech === false && noVoice.readShown === false &&
        noVoice.counter === `Step 2 of ${steps.length}` && noVoice.errors.length === 0,
      `control present=${noVoice.readShown}, cook mode still on “${noVoice.counter}”, ` +
        `page errors=${noVoice.errors.length}`
    );
    await press("Escape");
    await closed();

    // --- 15. The ticks survive a reload ------------------------------------
    // The roadmap's whole ask is "state that survives a phone call", so the
    // assertion has to be a real page load, not a re-render: everything below
    // reads a document built from scratch out of localStorage.
    await goto(recipeUrl, ".recipe-detail-page .tick-box");
    const reloaded = await snap();
    const lines = ingredientLines.length + (recipe.steps || []).length;
    report.check(
      "the recipe page makes every ingredient and every step tickable",
      reloaded.pageTicks.length === lines &&
        reloaded.pageTicksNative === true &&
        reloaded.pageTickRows.every((h) => h >= 44),
      `${reloaded.pageTicks.length} of ${lines} lines, native=${reloaded.pageTicksNative}, ` +
        `shortest row ${Math.min(...reloaded.pageTickRows)}px`
    );
    const survived = reloaded.pageTicks.filter(([, on]) => on);
    report.check(
      "ticks made in cook mode are still ticked after a full page reload",
      survived.length === 2,
      `${survived.length} lines still ticked on a document rebuilt from storage`
    );

    // --- 15b. A running timer outlives the sheet (Theme 36) ----------------
    // Three routes used to destroy a running countdown and its bell without a
    // word: closing the sheet, reloading, and iOS discarding the tab. The
    // measurement that made it urgent rather than tidy — 10 of the 24 recipes
    // carry their timer on the LAST step, whose primary button is *Done*, and
    // Done closes the sheet. So the single most likely tap at the moment a timer
    // mattered was the one that destroyed it.
    //
    // NONE OF THIS IS VISIBLE TO A UNIT TEST. cook.js's store is proved there;
    // what cannot be is that the UI writes the record on the tap, that a real
    // <dialog> close leaves it alone, and that a document rebuilt from
    // localStorage comes back counting. The clock is wound only where a bell is
    // due; "it kept counting" is measured in real seconds, so a timer that had
    // silently restarted could not pass as one that survived.
    // Open cook mode and walk to `index`, on the document that is already
    // loaded. Every scenario below gets a document of its OWN (see `returnTo`):
    // reopening the sheet four times on one long-lived document was measured
    // here at five aborts in six runs, on three different CDP calls — the
    // signature of a browser running out of patience, not of a failed
    // assertion. A fresh document per scenario is also how section 13b works,
    // and 13b does not abort.
    const stepInto = async (index) => {
      await openCook();
      await press("Home");
      for (let i = 0; i < index; i++) await click(".cook-next");
      return snap();
    };
    /** Come back to a recipe as a reader would: a new page, then cook mode.
     *  `skew` winds the wall clock BEFORE the sheet opens, which is the only
     *  way to be away while a bell falls due — a closed sheet has no interval. */
    const returnTo = async ({ item, index }, { skew = 0 } = {}) => {
      await goto(urlFor(item), ".cook-start");
      if (skew) await evalPage(`window.__cookClock.skew = ${skew}`);
      return stepInto(index);
    };
    if (shortTimer) {
      const total = formatDuration(shortTimer.seconds);
      await startTimerOn(shortTimer);
      // Real seconds, deliberately: a timer that was rebuilt from scratch shows
      // exactly `total`, so anything less is proof it carried its own clock.
      await sleep(2500);
      await press("Escape");
      await closed();
      const reopened = await stepInto(shortTimer.index);
      report.check(
        "a timer still counting is still counting after the sheet is closed and reopened",
        reopened.timerRunning === true && reopened.timerTime !== total,
        `${reopened.timerTime} of ${total}, running=${reopened.timerRunning}`
      );
      // The reload route, and the strongest of the three: a brand new document,
      // with nothing but localStorage to rebuild the countdown from.
      const rebuilt = await returnTo(shortTimer);
      report.check(
        "…and after a full page reload, rebuilt from storage alone",
        rebuilt.timerRunning === true && rebuilt.timerTime !== total,
        `${rebuilt.timerTime} of ${total}, running=${rebuilt.timerRunning}`
      );
      // Wound past the end while the sheet is CLOSED — precisely when no
      // interval is running and nothing on the page can ring. The bell is caught
      // up on the way back in; it cannot be rung any earlier than that, and
      // cook.js says so rather than pretending otherwise.
      const caught = await returnTo(shortTimer, { skew: (shortTimer.seconds + 5) * 1000 });
      report.check(
        "a bell that fell due behind a closed sheet announces itself on the way back in",
        caught.timerDone === true &&
          typeof caught.timerAlert === "string" &&
          caught.timerAlert.includes("Step ") &&
          caught.timerAlert.includes(shortTimer.item.name),
        `done=${caught.timerDone}, role="alert" says “${(caught.timerAlert || "").slice(0, 60)}”`
      );
      // …and exactly once. The record is spent as it rings, so coming back again
      // — with the clock wound just as far — offers a fresh countdown rather
      // than a second bell, and rather than a stored 00:00 whose toggle is
      // disabled, which is the shape that turns a rescue into a dead control on
      // a recipe you came back to cook again.
      const again = await returnTo(shortTimer, { skew: (shortTimer.seconds + 5) * 1000 });
      report.check(
        "…and rings ONCE: the record is spent, and the next return offers a fresh countdown",
        again.timerDone === false &&
          again.timerTime === total &&
          again.timerAlert === "" &&
          again.alarm.vibrations === 0,
        `back at ${again.timerTime} (done=${again.timerDone}), alert “${again.timerAlert}”, ` +
          `${again.alarm.vibrations} buzz(es) on the return`
      );
      await press("Escape");
      await closed();
    }
    if (longTimer) {
      // The one channel a caught-up bell must NOT use. The reader is by
      // definition looking at cook mode when this fires, so a system
      // notification would be an alert about the screen in their hand.
      await setNotifications("granted");
      await startTimerOn(longTimer);
      await press("Escape");
      await closed();
      const back = await returnTo(longTimer, { skew: (longTimer.seconds + 5) * 1000 });
      report.check(
        "a caught-up bell raises NO notification about the screen you are already reading",
        back.timerDone === true &&
          back.notifyPermission === "granted" &&
          back.alarm.sw.length === 0 &&
          back.alarm.page.length === 0 &&
          typeof back.timerAlert === "string" && back.timerAlert.includes("Step "),
        `permission=${back.notifyPermission}, ${back.alarm.sw.length} sw + ` +
          `${back.alarm.page.length} page notification(s), alert says ` +
          `“${(back.timerAlert || "").slice(0, 40)}”`
      );
      await press("Escape");
      await closed();
      await setNotifications("prompt");
    }

    report.check(
      "no uncaught page exception anywhere in the run",
      thrown.length === 0,
      thrown.length ? thrown.join("\n        ") : "none"
    );

    return report.summary(SITE) ? 0 : 1;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc, { keepProfile: opts.keepProfile });
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    if (opts.keepProfile) console.log(`Chrome profile kept at ${profileDir}`);
  }
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(2);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}
try {
  process.exit(await run(opts));
} catch (err) {
  // A harness failure is not an app verdict — exit 2 so the two never blur.
  console.error(`\nharness error: ${err.message}`);
  process.exit(2);
}
