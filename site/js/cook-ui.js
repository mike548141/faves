// Cook mode — the UI half (ROADMAP 17d, ADR 0034). `cook.js` owns the step
// machine and the wake lock; this owns the affordance, the full-screen view and
// the lifecycle wiring. Model/UI split, same as report.js/report-ui.js.
//
// SHAPE: a modal <dialog> filling the viewport, not a separate page and not an
// in-place mode. The native dialog is what buys the accessibility — the focus
// trap, the inert background, Escape, and focus restored to the button you came
// from are all the platform's, not hand-rolled state we could get subtly wrong.
// It also keeps your scroll position on the recipe, which a dedicated page
// would throw away every time you ducked out (ADR 0034).
//
// ESCAPE CLOSES COOK MODE, even with the ingredients panel open. Making Escape
// step back one level instead was measured on this codebase and rejected:
// Chrome's close-watcher force-closed the dialog two times in six (ADR 0025).
// A promise the platform keeps only most of the time is worse than no promise.
//
// THE STEP CARRIES ITS OWN INGREDIENTS. Until 2026-08-16 the whole list sat
// behind an "Ingredients" toggle on every step, including the ones that only
// preheat an oven. The owner replaced the idea outright: show, by default, just
// the lines this step is about — so the instruction can stay short ("Mix the
// butter and sugar together") while the quantities sit beside it. Which lines
// those are is `ingredientsForStep` in cook.js, and it errs towards showing.
// What is still NOT possible is splitting one line across two steps ("1 of the
// 2 cups"): nothing in the data ties an ingredient to a step. ROADMAP 36b.
//
// REO. Every button label carries a data-i18n key. The step counter does not:
// it is interpolated ("Step 3 of 9"), and reo.js swaps whole strings only —
// the same boundary "Serves 4" and the hours badges already sit behind.

import { el } from "./dom.js";
import { translate } from "./reo.js";
import { settings } from "./settings.js";
import { convertTemperatures } from "./units.js";
import { checklist, lineId, recipeId } from "./checklist.js";
import { syncTicks, tickRow } from "./checklist-ui.js";
import {
  canCook,
  createSpeaker,
  createTimer,
  createWakeLock,
  formatDuration,
  ingredientsForStep,
  keyToIndex,
  stepDuration,
  stepState,
  stepsOf,
} from "./cook.js";

// Ids must be unique across however many dialogs a session opens and discards.
let seq = 0;

const canModal =
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal === "function";

/**
 * The "Start cooking" affordance for a recipe, or null when there is nothing to
 * cook from. Returning null (rather than a disabled button) is deliberate: the
 * one recipe without a method should look like a recipe without a method, not
 * like a broken feature.
 *
 * TWO WEIGHTS, ONE CONTROL (owner, 2026-08-16: *"terribly ugly… giant, and
 * poorly placed"*). On a recipe's own page starting to cook is THE action, so
 * it carries the accent. In the Cook at Home list it is one of twenty-odd
 * recipes, and twenty accent slabs is not emphasis, it is wallpaper — so there
 * it is `quiet`, the same button in the app's ordinary `.btn` clothes.
 *
 * It is sized to its words either way. The full-bleed 52px bar it replaces was
 * the heaviest element on both screens, which said "this page is a button" when
 * the page is a recipe.
 *
 * NO EMOJI. The old 🍳 relied on the platform having a colour glyph for
 * U+1F373; on the owner's own machine it fell back to something that read as a
 * magnifier. A primary control cannot be a rendering lottery, and the word
 * "cooking" needs no picture.
 *
 * The label says what happens next rather than naming a mode the app happens to
 * have — nobody wants to enter Cook Mode, they want to start cooking.
 */
export function cookButton(item, { quiet = false, venueId } = {}) {
  if (!canCook(item) || !canModal) return null;
  const btn = el("button", {
    type: "button",
    className: `btn cook-start${quiet ? " cook-start-quiet" : ""}`,
  }, [el("span", { "data-i18n": "cook.start", textContent: "Start cooking" })]);
  btn.addEventListener("click", (e) => {
    // Recipe rows can sit inside a link on the Cook at Home list; a tap here
    // must open cook mode, never navigate away from it.
    e.preventDefault();
    e.stopPropagation();
    openCookMode(item, { venueId });
  });
  return btn;
}

/**
 * Which collection the recipe belongs to, when the caller didn't say. Cook mode
 * is only ever opened from a page whose `?id=` IS that collection — the recipe
 * page (`recipe.html?id=…&dish=…`) and the Cook at Home list
 * (`restaurant.html?id=…`) — so reading it here lets the checklist key on a
 * whole identity (venue + dish, ADR 0051) without every call site having to
 * thread it through. A caller that knows should still pass it: the fallback is
 * a default, not the design.
 */
const pageVenueId = () => new URLSearchParams(location.search).get("id") || "";

/** Open the full-screen view for `item`. Assumes canCook(item). */
export function openCookMode(item, { venueId } = {}) {
  const steps = stepsOf(item);
  if (!steps.length || !canModal) return null;
  const rid = recipeId(venueId ?? pageVenueId(), item);

  const n = ++seq;
  const ingId = `cook-ing-${n}`;
  const titleId = `cook-title-${n}`;
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];

  let index = 0;

  // --- Chrome ------------------------------------------------------------
  const title = el("h2", { className: "cook-title", id: titleId, textContent: item.name });
  // Shown only on a lock we actually hold. On iOS before 16.4, or a refusal,
  // it simply never appears — no dead switch, no apology.
  const awake = el("p", { className: "cook-awake", hidden: true }, [
    el("span", { className: "cook-awake-ico", textContent: "☀", "aria-hidden": "true" }),
    el("span", { "data-i18n": "cook.awake", textContent: "Screen stays on" }),
  ]);
  const close = el("button", {
    type: "button",
    className: "settings-close cook-close",
    textContent: "✕",
    "aria-label": "Close cook mode",
    "data-i18n-aria": "cook.close",
  });

  const fill = el("span", { className: "cook-progress-fill" });
  const progress = el("div", { className: "cook-progress", "aria-hidden": "true" }, [fill]);

  const counter = el("p", { className: "cook-count" });
  const stepText = el("p", { className: "cook-step" });

  // A step that only waits ("Bake for 35 minutes") gets a one-tap countdown
  // (owner, 2026-08-16). The duration is READ OUT OF THE STEP — never guessed —
  // so a step that doesn't say how long simply has no timer (see cook.js).
  //
  // One timer per step, kept in a Map so walking Back and Next doesn't restart
  // a bake you have already begun. They tick off the wall clock, so a phone
  // that sleeps mid-bake comes back with the right number.
  const timers = new Map();
  const timerFor = (i) => {
    if (!timers.has(i)) {
      const secs = stepDuration(steps[i]);
      timers.set(i, secs == null ? null : createTimer(secs));
    }
    return timers.get(i);
  };

  const timerTime = el("span", { className: "cook-timer-time" });
  // Four fixed label spans swapped by `hidden`, never one span whose key gets
  // rewritten — same rule as Next/Done above, and for the same reason: reo.js
  // caches an element's English on first translate(), so re-keying a live
  // element strands the wrong word when the language is switched back.
  const timerLabels = {
    start: el("span", { "data-i18n": "cook.timerStart", textContent: "Start timer" }),
    pause: el("span", { "data-i18n": "cook.timerPause", textContent: "Pause", hidden: true }),
    resume: el("span", { "data-i18n": "cook.timerResume", textContent: "Resume", hidden: true }),
    done: el("span", { "data-i18n": "cook.timerDone", textContent: "Time\u2019s up", hidden: true }),
  };
  const timerState = el("span", { className: "cook-timer-state" }, Object.values(timerLabels));
  const timerBtn = el("button", { type: "button", className: "cook-timer-btn" }, [
    timerTime,
    timerState,
  ]);
  const timerReset = el("button", {
    type: "button",
    className: "cook-timer-reset",
    "data-i18n": "cook.timerReset",
    textContent: "Reset",
    hidden: true,
  });
  const timerRow = el("div", { className: "cook-timer", hidden: true }, [timerBtn, timerReset]);

  // What this step needs, shown by default rather than hidden behind a toggle
  // (owner, 2026-08-16). It lives INSIDE the live region on purpose: stepping
  // forward should announce "Step 2 of 6. Beat together… What you need: ¾ cup
  // white sugar; 100g butter, softened…" as one utterance. Cook mode is used
  // with hands in a bowl and eyes elsewhere, so the quantities being spoken
  // alongside the instruction is the feature, not noise.
  const ingList = el("ul", { className: "ingredients" });
  const ingPanel = el("section", { className: "cook-ing", id: ingId, hidden: true }, [
    el("h3", {
      className: "recipe-head",
      "data-i18n": "cook.needs",
      textContent: "What you need",
    }),
    ingList,
  ]);
  // One live region holding both, so a step change is announced as a whole
  // ("Step 4 of 9. Beat the eggs…") rather than as two fragments. Focus lands
  // here on open so the first step is read without moving focus again later —
  // repeated Next taps must keep working, which means focus stays on Next.
  const stage = el("div", {
    className: "cook-stage",
    tabIndex: -1,
    role: "group",
    "aria-live": "polite",
    "aria-atomic": "true",
    "aria-labelledby": titleId,
  }, [counter, stepText, ingPanel]);

  const prevBtn = el("button", { type: "button", className: "cook-btn cook-prev" }, [
    el("span", { className: "cook-btn-ico", textContent: "‹", "aria-hidden": "true" }),
    el("span", { "data-i18n": "cook.prev", textContent: "Back" }),
  ]);
  // Two label spans that swap by `hidden`, never one span whose key is
  // rewritten: reo.js caches an element's English on first translate(), so
  // re-keying a live element would strand the wrong word when you switch back.
  const nextLabel = el("span", { "data-i18n": "cook.next", textContent: "Next" });
  const doneLabel = el("span", { "data-i18n": "cook.done", textContent: "Done", hidden: true });
  const nextIco = el("span", { className: "cook-btn-ico", textContent: "›", "aria-hidden": "true" });
  const nextBtn = el("button", { type: "button", className: "cook-btn cook-primary cook-next" }, [
    nextLabel, doneLabel, nextIco,
  ]);

  // Ticking off as you go (ROADMAP 17e). OUTSIDE the stage on purpose, for the
  // same reason the timer is: the stage is aria-live/aria-atomic, so a control
  // that lives in there re-announces the whole step every time it changes.
  //
  // ONE box, re-pointed at whichever step is on screen, never a box per step
  // that appears and vanishes — a control that hides while it holds focus drops
  // that focus to <body>, outside the dialog, and the arrow keys go dead with
  // it. Cook mode has paid for that bug twice already (ADR 0039); a control that
  // is always present cannot spring it a third time.
  const stepBox = el("input", { type: "checkbox", className: "tick-box" });
  const stepTick = el("label", { className: "tick cook-step-tick" }, [
    stepBox,
    el("span", { className: "tick-text", "data-i18n": "cook.stepDone", textContent: "Step done" }),
  ]);
  stepBox.addEventListener("change", () =>
    checklist.set(rid, lineId("s", steps[index]), stepBox.checked)
  );
  // Read the step aloud (ROADMAP 17e). Built ONLY where the browser has the
  // API: no control at all beats a control that does nothing, and this is the
  // same rule the "Screen stays on" note follows for the wake lock. The honest
  // caveat is in cook.js — the code needs no network, the VOICE might.
  const speaker = createSpeaker({ onIdle: () => paintRead() });
  const readLabels = {
    read: el("span", { "data-i18n": "cook.read", textContent: "Read aloud" }),
    stop: el("span", { "data-i18n": "cook.readStop", textContent: "Stop", hidden: true }),
  };
  const readBtn = speaker.supported()
    ? el("button", {
        type: "button",
        className: "btn cook-read",
        "aria-pressed": "false",
      }, [
        el("span", { className: "cook-read-ico", textContent: "🔊", "aria-hidden": "true" }),
        ...Object.values(readLabels),
      ])
    : null;

  // readBtn is null where the browser has no speechSynthesis (el() skips a
  // null child), so this stays a plain two-item row rather than a wrapper
  // built to hold a pair that no longer exists.
  const tools = el("div", { className: "cook-tools" }, [stepTick, readBtn]);

  // Two buttons, always the same two, always in the same place. The Ingredients
  // toggle that used to span this row is gone — its content is on screen now —
  // and with it the row that appeared and vanished between steps, moving Next
  // under the finger that was tapping it.
  const nav = el("div", { className: "cook-nav" }, [prevBtn, nextBtn]);
  const dialog = el("dialog", { className: "cook-sheet", "aria-labelledby": titleId }, [
    el("div", { className: "cook-inner" }, [
      el("div", { className: "cook-top" }, [
        el("div", { className: "cook-heading" }, [title, awake]),
        close,
      ]),
      progress,
      stage,
      // OUTSIDE the live region on purpose: the countdown rewrites itself every
      // second, and the stage is aria-live/aria-atomic — a timer in there would
      // re-announce the whole step once a second, which is unusable.
      timerRow,
      tools,
      nav,
    ]),
  ]);

  // --- Painting ----------------------------------------------------------
  // The lines this step is about, at the recipe's stated quantity. Absent — not
  // empty — when the step needs nothing ("Preheat the oven…"), which was the
  // owner's first complaint and falls out of the same rule.
  function paintStepIngredients(stepIndex) {
    const units = settings.get().units;
    const needed = ingredientsForStep(steps[stepIndex], ingredients);
    // These lines are rebuilt on every step change, and now they contain
    // focusable boxes — so replacing them while one holds focus would drop
    // focus to <body>, outside the dialog, and kill the arrow keys. Hand focus
    // to Next FIRST, exactly as the Back button and the timer's Reset already
    // do (ADR 0039).
    if (ingList.contains(document.activeElement)) nextBtn.focus();
    ingPanel.hidden = needed.length === 0;
    // The tick is keyed on the RAW line; the reader sees the converted one, so
    // flipping to imperial re-labels the box without losing what it recorded.
    ingList.replaceChildren(
      ...needed.map((ing) =>
        el("li", {}, [tickRow(rid, "i", ing, convertTemperatures(ing, units))])
      )
    );
  }

  /**
   * What the step sounds like: the counter, the instruction, and the lines it
   * needs — the same three things, in the same order, that the live region
   * announces together, so hearing it and reading it can never disagree. Units
   * are converted here too, or an imperial reader would be told °C.
   */
  function spokenStep() {
    const s = stepState(index, steps.length);
    const units = settings.get().units;
    const needed = ingredientsForStep(steps[s.index], ingredients);
    const said = [s.label, convertTemperatures(steps[s.index], units)];
    if (needed.length) {
      said.push(`What you need: ${needed.map((l) => convertTemperatures(l, units)).join("; ")}`);
    }
    return said.join(". ");
  }

  /** The read control's two states. Absent where the browser has no API. */
  function paintRead() {
    if (!readBtn) return;
    const on = speaker.speaking();
    readBtn.setAttribute("aria-pressed", String(on));
    readLabels.read.hidden = on;
    readLabels.stop.hidden = !on;
    readBtn.classList.toggle("is-speaking", on);
  }

  /** Re-read every box from the store: the step's, and the step's ingredients'. */
  function paintTicks() {
    stepBox.checked = checklist.has(rid, lineId("s", steps[index]));
    syncTicks(ingList, rid);
  }

  // The countdown's face. Re-run every second while one is running, and once on
  // every step change. The button is the whole control — one tap starts it, one
  // tap pauses it — with Reset appearing only once there is something to reset,
  // so a step you have not started shows exactly one thing to press.
  function paintTimer() {
    const t = timerFor(index);
    timerRow.hidden = !t;
    if (!t) return;
    const left = t.remaining();
    const running = t.running();
    const done = left === 0;
    const which = done ? "done" : running ? "pause" : left < t.total ? "resume" : "start";
    timerTime.textContent = formatDuration(left);
    for (const [key, span] of Object.entries(timerLabels)) span.hidden = key !== which;
    timerBtn.disabled = done;
    // The accessible name has to say what the tap DOES, not just read the clock
    // — "35:00" alone tells a screen-reader user nothing about the verb. Built
    // from the visible label so the two can never drift apart.
    timerBtn.setAttribute(
      "aria-label",
      done ? timerLabels.done.textContent : `${timerLabels[which].textContent} \u2014 ${formatDuration(left)}`
    );
    timerRow.classList.toggle("is-running", running);
    timerRow.classList.toggle("is-done", done);
    // Hiding the element that currently has focus drops focus to <body> —
    // OUTSIDE the dialog, where the keydown listener never sees it, so the
    // arrows, Home and End all go dead. cook_check caught exactly this on the
    // Back button on 2026-08-15 and caught it again here the moment Reset
    // learned to hide itself. Hand focus on before hiding, never after.
    const nowHidden = left === t.total && !running;
    if (nowHidden && document.activeElement === timerReset) timerBtn.focus();
    timerReset.hidden = nowHidden;
    // Same trap on the button itself: it is disabled when the bell has gone.
    if (done && document.activeElement === timerBtn) nextBtn.focus();
  }

  // One interval for the whole dialog, started lazily and stopped the moment
  // nothing is counting — a bare setInterval left running behind a closed sheet
  // is the same class of leak as an unreleased wake lock (ADR 0034).
  let tick = null;
  function syncTicking() {
    const anyRunning = [...timers.values()].some((t) => t?.running());
    if (anyRunning && tick === null) tick = setInterval(paintTimer, 1000);
    else if (!anyRunning && tick !== null) {
      clearInterval(tick);
      tick = null;
    }
  }

  timerBtn.addEventListener("click", () => {
    timerFor(index)?.toggle();
    paintTimer();
    syncTicking();
  });
  timerReset.addEventListener("click", () => {
    timerFor(index)?.reset();
    paintTimer();
    syncTicking();
  });

  function paint() {
    const s = stepState(index, steps.length);
    counter.textContent = s.label;
    // Oven temperatures live inside the step prose, so an imperial reader gets
    // °F here exactly as on the recipe page (units.js, ADR 0029).
    stepText.textContent = convertTemperatures(steps[s.index], settings.get().units);
    fill.style.width = `${(s.number / s.count) * 100}%`;
    // Disabling the focused element drops focus to <body> — outside the dialog,
    // where our keydown listener never sees it, so arrows/Home/End go dead
    // (found by cook_check.mjs, owner ruled 2026-08-15). Hand focus to Next
    // before disabling: it is the only control that still does anything here.
    if (s.atFirst && document.activeElement === prevBtn) nextBtn.focus();
    paintStepIngredients(s.index);
    paintTimer();
    paintTicks();
    // Never leave the last step still being read out over the new one. Speech
    // outlives whatever started it, so every change of subject has to cancel —
    // the wake lock's lesson, applied to a voice (cook.js).
    speaker.stop();
    paintRead();
    prevBtn.disabled = s.atFirst;
    nextLabel.hidden = s.atLast;
    doneLabel.hidden = !s.atLast;
    nextIco.textContent = s.atLast ? "✓" : "›";
  }

  function goTo(next) {
    const s = stepState(next, steps.length);
    if (s.index === index) return;
    index = s.index;
    paint();
  }

  // --- Wake lock ---------------------------------------------------------
  const lock = createWakeLock();
  const showAwake = () => {
    awake.hidden = !lock.held();
  };

  async function onVisibility() {
    await lock.onVisibilityChange();
    showAwake();
  }

  // --- Wiring ------------------------------------------------------------
  // User-initiated only, always: nothing here ever starts speaking on its own.
  readBtn?.addEventListener("click", () => {
    if (speaker.speaking()) speaker.stop();
    else speaker.speak(spokenStep());
    paintRead();
  });
  // A navigation destroys the document but not the browser's speech queue, so
  // walking away from an open cook mode would otherwise leave a voice reading
  // step 4 to whatever page you land on. This is the exact shape of the wake
  // lock's teardown gap (ADR 0039), and unlike that one it IS ours to close.
  const stopSpeaking = () => speaker.stop();
  window.addEventListener("pagehide", stopSpeaking);

  close.addEventListener("click", () => dialog.close());
  prevBtn.addEventListener("click", () => goTo(index - 1));
  nextBtn.addEventListener("click", () => {
    if (stepState(index, steps.length).atLast) dialog.close();
    else goTo(index + 1);
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const next = keyToIndex(e.key, index, steps.length);
    if (next == null) return;
    e.preventDefault(); // Arrow keys would otherwise scroll the step panel.
    goTo(next);
  });

  document.addEventListener("visibilitychange", onVisibility);
  // Units can change from another tab's Settings while a recipe is on the
  // bench; repaint rather than leave °C on screen for an imperial reader.
  const unsubscribe = settings.subscribe(() => {
    paint();
    paintStepIngredients(index);
  });
  // The recipe page's own boxes sit behind this dialog and both write through
  // the same store. Follow it rather than owning a second copy of the truth —
  // `paintTicks` sets properties only, so nothing in the live region is
  // mutated and nothing is re-announced.
  const unsubscribeTicks = checklist.subscribe(paintTicks);

  dialog.addEventListener("close", () => {
    document.removeEventListener("visibilitychange", onVisibility);
    unsubscribe();
    unsubscribeTicks();
    // Never leave the screen pinned awake on a page nobody is reading.
    lock.release();
    // …and never leave a voice reading a recipe nobody has open.
    window.removeEventListener("pagehide", stopSpeaking);
    speaker.stop();
    // Same rule for the countdown: a 1s interval behind a closed sheet is a
    // leak, and cook mode has shipped one of those before (ADR 0034).
    if (tick !== null) {
      clearInterval(tick);
      tick = null;
    }
    dialog.remove();
    // <dialog> restores focus to the opener itself; this is the belt to that
    // brace, for the case where the opener was re-rendered underneath us (a
    // settings change repaints the recipe) and the platform has nowhere to go.
    if (!document.activeElement || document.activeElement === document.body) {
      document.querySelector(".cook-start")?.focus();
    }
  });

  paintStepIngredients(index);
  paint();
  document.body.append(dialog);
  translate(dialog); // pick up the stored language before the first frame
  dialog.showModal();
  stage.focus();

  lock.acquire().then(showAwake);
  return dialog;
}
