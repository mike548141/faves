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
import { ingredientBlocks, ingredientKeys } from "./ingredients.js";
import { DEFAULT_SCALE, SCALES, scaleFor, scaleLineStatus } from "./quantity.js";
import { translate } from "./reo.js";
import { settings } from "./settings.js";
import { convertTemperatures } from "./units.js";
import { checklist, lineId, recipeId } from "./checklist.js";
import { syncTicks, tickRow } from "./checklist-ui.js";
import {
  canCook,
  createSpeaker,
  createTimer,
  createTimerStore,
  createWakeLock,
  formatDuration,
  ingredientsForStep,
  keyToIndex,
  stepDuration,
  stepState,
  stepsOf,
} from "./cook.js";
import { createAlarm, wantsNotification } from "./alarm.js";
import { safeStorage } from "./store.js";

// A running timer is remembered across a close, a reload and a discarded tab
// (cook.js, Theme 36). DEVICE-level like the order tally, not per-profile like
// the ticks: a tick is what YOU put in the bowl, whereas a timer is what the
// oven is doing, and switching profile mid-bake must not take the bell with it.
const timerStore = createTimerStore(safeStorage());

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
export function cookButton(item, { quiet = false, venueId, scale } = {}) {
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
    // `scale` is read HERE, at the tap, not when the button was built: the
    // recipe page rebuilds itself on a scale change today, but a caller that
    // patched its lines in place instead would have handed cook mode a stale
    // number, and the failure would be silent quantities in a kitchen.
    openCookMode(item, { venueId, scaleKey: typeof scale === "function" ? scale() : scale });
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
export function openCookMode(item, { venueId, scaleKey = DEFAULT_SCALE } = {}) {
  const steps = stepsOf(item);
  if (!steps.length || !canModal) return null;
  const rid = recipeId(venueId ?? pageVenueId(), item);

  const n = ++seq;
  const ingId = `cook-ing-${n}`;
  const titleId = `cook-title-${n}`;
  // The KEYS, not the display text: a grouped line's key is "<component>: <text>"
  // — the same string cook mode has always been handed, and the same string the
  // tick is stored against, so neither the step matcher nor a tick shifts under
  // a recipe that moved to components (ingredients.js, ADR 0070).
  const ingredients = ingredientKeys(item.ingredients);

  // ── The scale the reader chose on the page they came from (17a) ───────────
  // The picker lives on the recipe page; cook mode had no idea it existed, so
  // "2×" on the page and "¾ cup" in the step were the same recipe disagreeing
  // with itself while someone stood over a bowl (owner, 2026-08-17).
  //
  // 🚩 The KEY is not what gets scaled. A grouped line's key is
  // "Sauce: 1 cup brown sugar", and `readQuantity` reads the amount at the HEAD
  // of the string — so scaling the key would find no quantity, report "none",
  // and leave every component-grouped line silently at 1× beside doubled ones.
  // That is the half-scaled recipe quantity.js exists to prevent. So the TEXT
  // is scaled and the component re-prefixed for display, while the key — which
  // the tick hashes and the step matcher reads — is never touched.
  const scale = scaleFor(scaleKey);
  const scaled = scaleKey !== DEFAULT_SCALE;
  const scaleLabel = SCALES.find((s) => s.key === scaleKey)?.label ?? "";
  const lineOf = new Map(
    ingredientBlocks(item.ingredients).flatMap((b) =>
      b.lines.map((l) => [l.key, { text: l.text, component: b.component }])
    )
  );

  /**
   * What one ingredient line looks like on screen: scaled, unit-converted, and
   * carrying the same "as written" refusal the recipe page shows — a line that
   * could not be scaled must say so HERE too, or the doubled flour beside the
   * un-doubled chocolate reads as finished (quantity.js's "blocked" doctrine).
   */
  function shownLine(key, units) {
    const line = lineOf.get(key) || { text: key, component: null };
    const v = scaleLineStatus(line.text, scale);
    const text = line.component ? `${line.component}: ${v.text}` : v.text;
    return { text: convertTemperatures(text, units), blocked: scaled && v.status === "blocked" };
  }

  let index = 0;

  // --- Chrome ------------------------------------------------------------
  const title = el("h2", { className: "cook-title", id: titleId, textContent: item.name });
  // Which mixture you are making, stated where you cannot miss it. Cook mode is
  // full-screen: the picker that set this is behind it, and a cook who opened
  // the page an hour ago has no way to check without leaving the step they are
  // on. It sits BESIDE the title rather than inside it — `.cook-title` is
  // `nowrap` + ellipsis, so a long recipe name would have eaten the badge on
  // exactly the narrow screen that needs it. Absent at 1×, where it would be
  // noise on every recipe.
  const scaleBadge = scaled
    ? el("p", { className: "cook-awake cook-scale" }, [
        el("span", { className: "cook-scale-mark", textContent: scaleLabel }),
        // The space is IN the text, not only in the flex gap: a gap is a
        // picture, and the accessible name is built from characters — without
        // it a screen reader is handed "2×mixture" as one word.
        el("span", { textContent: " mixture" }),
      ])
    : null;
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
  //
  // …and a timer that was running when the sheet last closed comes back running.
  // `timerStore` holds the wall clock it ends at, keyed by this recipe and step;
  // handing that to createTimer is the whole of the rehydration (cook.js).
  const timers = new Map();
  const timerFor = (i) => {
    if (!timers.has(i)) {
      const secs = stepDuration(steps[i]);
      const saved = secs == null ? null : timerStore.get(rid, i);
      timers.set(i, secs == null ? null : createTimer(secs, undefined, { endsAt: saved?.endsAt }));
    }
    return timers.get(i);
  };
  /** Whatever this timer now is, on disk: running ⇒ its clock, otherwise gone. */
  function saveTimer(i, t) {
    const endsAt = t?.endsAt();
    if (endsAt == null) timerStore.clear(rid, i);
    else timerStore.start(rid, i, endsAt);
  }

  const timerTime = el("span", { className: "cook-timer-time" });
  // `role="timer"` carries an implicit `aria-live: off`, and that is the POINT
  // rather than an omission: a countdown inside a live region re-announces
  // itself once a second and makes the whole dialog unusable with a screen
  // reader on. The verb and the time still reach that reader — through the
  // button's accessible name below, read on demand instead of shouted.
  timerTime.setAttribute("role", "timer");
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
  // THE LABELS ARE NOW INVISIBLE, AND STILL LOAD-BEARING. The face shows an
  // icon rather than a word (owner, 2026-08-16), but the accessible name below
  // is still built from these spans' text, so it is translated by exactly the
  // same path as every other string. Deleting them as "unused markup" silently
  // reverts the timer's accessible name to English.
  const timerState = el("span", { className: "cook-timer-state sr-only" }, Object.values(timerLabels));
  // The glyph shows the action a tap PERFORMS, never the state the timer is in
  // — Apple's own rule for toggle controls, and the answer to "does 'Pause'
  // mean it IS paused, or that pressing pauses it". Drawn in CSS rather than
  // typed: U+23F8/U+25B6 carry emoji presentation on some platforms, so a glyph
  // arrives full-colour on one phone and monochrome on the next.
  const timerIco = el("span", { className: "cook-timer-ico", "aria-hidden": "true" });
  const timerBtn = el("button", { type: "button", className: "cook-timer-toggle" }, [
    timerIco,
    timerState,
  ]);
  // Always present, never hidden-until-relevant. Resetting an untouched timer
  // is a harmless no-op, and the alternative has cost this dialog the same bug
  // twice: hiding the element that has focus drops focus to <body>, outside the
  // dialog, where the keydown listener never sees it (ADR 0039). Quiet rather
  // than absent — muted colour and no border, so it cannot out-shout the
  // countdown beside it.
  const timerReset = el(
    "button",
    {
      type: "button",
      className: "cook-timer-reset",
      "data-i18n-aria": "cook.timerReset",
      "aria-label": "Reset timer",
    },
    [el("span", { "aria-hidden": "true", textContent: "↺" })]
  );
  // Equal fixed side columns are what actually centre the numeral; the bar
  // underneath is the glanceable half, answering "nearly there?" from across
  // the kitchen without reading digits.
  const timerFill = el("div", { className: "cook-timer-fill" });
  const timerFace = el("div", { className: "cook-timer-face" }, [timerBtn, timerTime, timerReset]);
  const timerRow = el("div", { className: "cook-timer", hidden: true }, [
    timerFace,
    el("div", { className: "cook-timer-track" }, [timerFill]),
  ]);

  // --- The alarm (ROADMAP 36d, ADR 0071) ---------------------------------
  // A countdown that ends in silence is a countdown you have to watch, which is
  // the one thing a cook cannot do. Three channels: a tone and a buzz on every
  // timer, and — only for a timer long enough to have walked away from — a
  // notification. alarm.js owns all three; this owns *when*.
  const alarm = createAlarm();
  // Step indices whose bell has already gone, so a bell rings once and not once
  // a second for the rest of the recipe. Cleared per timer by a reset.
  const alarmed = new Set();

  // THE THIRD CHANNEL, AND THE ONLY ONE EVERYONE HAS. The face flips to
  // "Time's up" and the tone sounds, but neither reaches a screen reader: the
  // numeral is role="timer" (aria-live: off, deliberately — see above) and a
  // sound is not a channel every reader has. This region is written only when a
  // bell actually goes, so it announces an event rather than a clock. It sits
  // OUTSIDE the stage for the same reason the timer does: a change inside an
  // aria-atomic live region re-announces the whole step.
  const timerAlert = el("div", { className: "sr-only cook-timer-alert", role: "alert" });

  // Shown only where the browser has been told, by this reader, never to
  // notify. Silence about a choice they made would be courtesy; silence about a
  // STATE they may not know they are in is a defect (ADR 0069's ruling, applied
  // here). Stated once, in place, and never a nag: the timer still sounds and
  // still buzzes, which the line says out loud so it reads as information
  // rather than as a failure. `cook-awake` is the existing soft-note style —
  // `cook-notify-blocked` is the hook for a rule of its own if one is ever
  // wanted (this session could not touch app.css).
  const timerNote = el(
    "p",
    { className: "cook-awake cook-notify-blocked", hidden: true },
    [
      el("span", { className: "cook-awake-ico", textContent: "🔕", "aria-hidden": "true" }),
      el("span", {
        "data-i18n": "cook.notifyBlocked",
        textContent:
          "Notifications are blocked for this site — the timer still sounds and vibrates. " +
          "Your browser's site settings can turn them back on.",
      }),
    ]
  );

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
        el("div", { className: "cook-heading" }, [title, scaleBadge, awake]),
        close,
      ]),
      progress,
      stage,
      // OUTSIDE the live region on purpose: the countdown rewrites itself every
      // second, and the stage is aria-live/aria-atomic — a timer in there would
      // re-announce the whole step once a second, which is unusable.
      timerRow,
      timerNote,
      timerAlert,
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
    // The tick is keyed on the RAW line; the reader sees the converted and
    // scaled one, so flipping to imperial — or doubling the mixture — re-labels
    // the box without losing what it recorded.
    ingList.replaceChildren(
      ...needed.map((ing) => {
        const { text, blocked } = shownLine(ing, units);
        const li = el("li", {}, [tickRow(rid, "i", ing, text)]);
        if (blocked) {
          li.classList.add("is-unscaled");
          // In words, not only in colour — the same rule and the same two
          // elements as the recipe page, so the mark means one thing in both
          // places (WCAG 1.4.1).
          li.append(el("span", { className: "scale-mark", textContent: "as written" }));
        }
        return li;
      })
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
      // The SAME text the panel draws, scale and all: read aloud is the one
      // path where a reader cannot glance at the screen to check, so a spoken
      // "¾ cup" over a written "1½ cups" would be the worst version of this bug.
      said.push(`What you need: ${needed.map((l) => shownLine(l, units).text).join("; ")}`);
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
  // every step change. Three fixed zones — toggle, numeral, reset — none of
  // which ever comes or goes, so the layout under the reader's thumb is the
  // same at 35:00 as it is at 00:00.
  function paintTimer() {
    const t = timerFor(index);
    timerRow.hidden = !t;
    // The blocked-notifications line belongs to a LONG timer and to no other
    // state: a short timer never asks, so there is nothing for the reader to
    // have blocked, and a browser with no Notification API at all is told
    // nothing (there is no setting behind it to go and change).
    timerNote.hidden = !(t && wantsNotification(t.total) && alarm.permission() === "denied");
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
    timerIco.classList.toggle("is-pause", running);
    timerRow.classList.toggle("is-running", running);
    timerRow.classList.toggle("is-done", done);
    // Remaining as a proportion of the whole. Set as a plain width with no CSS
    // transition on purpose: it steps once a second, which IS the information,
    // so there is no decorative sweep for prefers-reduced-motion to strip.
    timerFill.style.width = `${t.total ? (left / t.total) * 100 : 0}%`;
    // The one focus rescue still worth keeping: the toggle is disabled once the
    // bell has gone, and a disabled element holding focus drops it to <body> —
    // outside the dialog, where the keydown listener never sees it, so the
    // arrows, Home and End all go dead (ADR 0039; cook_check caught this on the
    // Back button on 2026-08-15). Reset no longer needs the same rescue because
    // it no longer hides — the bug class went with the vanishing control.
    if (done && document.activeElement === timerBtn) nextBtn.focus();
  }

  /**
   * Ring the bell for the timer on step `i`, exactly once.
   *
   * The strings are built from the visible label and the step's own words, so
   * the announcement, the notification and the face can never drift apart — and
   * so "Time's up" is translated by the same path as every other string
   * (reo.js). The rest is interpolated and therefore stays English, exactly as
   * "Step 3 of 9" already does.
   */
  function ringFor(i, { notify = true } = {}) {
    if (alarmed.has(i)) return;
    alarmed.add(i);
    // The record has done its job the moment the bell rings, and keeping it
    // would be worse than useless: a stored countdown at 00:00 comes back with
    // its toggle disabled, so the next open of a recipe you have returned to
    // cook hands you a dead control (cook.js says this at length).
    timerStore.clear(rid, i);
    const t = timers.get(i);
    const s = stepState(i, steps.length);
    const over = timerLabels.done.textContent;
    // Cleared first so an identical message rings again rather than being
    // swallowed as "no change" by a screen reader.
    timerAlert.textContent = "";
    timerAlert.textContent = `${over} — ${s.label}. ${item.name}`;
    // Fire-and-forget: the two permission-free channels inside fire() are
    // synchronous, and nothing on screen waits on the notification.
    alarm.fire({
      title: `${over} — ${item.name}`,
      body: `${s.label}. ${steps[s.index]}`,
      // Where notificationclick sends you: the recipe you were cooking.
      url: location.href,
      // One live notification per timer, replaced rather than stacked.
      tag: `faves-timer:${rid}:${i}`,
      // A bell that fell due while the sheet was CLOSED is caught up on the way
      // back in, and the reader is by definition looking at cook mode when that
      // happens — so it keeps the tone, the buzz and the announcement and drops
      // the notification, which would be a system alert about the screen you are
      // already reading.
      notify: notify && wantsNotification(t?.total),
    });
  }

  /**
   * EVERY timer, not just the one on screen. Reading ahead while a bake runs is
   * normal, and a bell that only rings when you happen to be looking at its
   * step is not a bell. The countdown is wall-clock based (cook.js), so this is
   * correct however late it is called — which matters, because a backgrounded
   * tab's interval is throttled to roughly once a minute.
   */
  function checkAlarms({ notify = true } = {}) {
    for (const [i, t] of timers) {
      if (!t) continue;
      if (t.done()) ringFor(i, { notify });
      else alarmed.delete(i); // a reset re-arms the bell
    }
  }

  // One interval for the whole dialog, started lazily and stopped the moment
  // nothing is counting — a bare setInterval left running behind a closed sheet
  // is the same class of leak as an unreleased wake lock (ADR 0034).
  let tick = null;
  function onTick() {
    checkAlarms();
    paintTimer();
    // The tick that takes the last timer to zero is also the tick that should
    // stop the clock. Without this call the interval outlived every countdown
    // and ran until the sheet closed — true before the alarm existed, and now
    // load-bearing, because `checkAlarms` is what the interval is FOR.
    syncTicking();
  }
  function syncTicking() {
    const anyRunning = [...timers.values()].some((t) => t?.running());
    if (anyRunning && tick === null) tick = setInterval(onTick, 1000);
    else if (!anyRunning && tick !== null) {
      clearInterval(tick);
      tick = null;
    }
  }

  timerBtn.addEventListener("click", () => {
    const t = timerFor(index);
    if (!t) return;
    const starting = !t.running();
    // THE TAP THAT STARTS THE TIMER IS THE TAP THAT UNLOCKS THE SOUND. Autoplay
    // policy only lets an AudioContext run when it was armed inside a user
    // gesture, and both calls below must therefore run BEFORE anything is
    // awaited — an await spends the gesture, and the failure is silent until
    // the bell is due 35 minutes later.
    alarm.arm();
    // …and the same tap is the only place the notification permission is ever
    // asked for, for a timer long enough to walk away from (ADR 0071). A short
    // timer never asks: a prompt is a thing you can spend once per browser.
    if (starting && wantsNotification(t.total)) alarm.requestNotify().then(paintTimer);
    t.toggle();
    // Written on the tap, not on the close: the tab may never GET a close (iOS
    // discards it), which is one of the three routes this item exists to fix.
    saveTimer(index, t);
    paintTimer();
    syncTicking();
  });
  timerReset.addEventListener("click", () => {
    timerFor(index)?.reset();
    // Re-arm this step's bell, and clear an announcement it has already made.
    alarmed.delete(index);
    timerStore.clear(rid, index);
    timerAlert.textContent = "";
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
    // A hidden tab's 1s interval is throttled to roughly once a minute (and a
    // suspended one stops altogether), so coming back to the recipe is the
    // second chance to notice a bell that fell due while you were elsewhere.
    // The countdown is wall-clock based, so what it says here is the truth and
    // not a counter that lost time.
    checkAlarms();
    paintTimer();
    syncTicking();
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
    // …and the same rule again for the audio hardware. An AudioContext holds a
    // real device handle; left open it keeps a closed sheet's page marked as
    // playing audio. The cost is that a bell rung in the same instant you tap ✕
    // is cut off — which is the right trade, because you are already there.
    alarm.close();
    dialog.remove();
    // <dialog> restores focus to the opener itself; this is the belt to that
    // brace, for the case where the opener was re-rendered underneath us (a
    // settings change repaints the recipe) and the platform has nowhere to go.
    if (!document.activeElement || document.activeElement === document.body) {
      document.querySelector(".cook-start")?.focus();
    }
  });

  // EVERY saved step, not just the one about to be painted. A timer is normally
  // left behind on the step that started it while the reader walks on (or taps
  // Done, which is where 10 of the 24 recipes put their only timer), so priming
  // just the current step would rehydrate the countdown nobody was waiting for
  // and drop the one they were. `checkAlarms` and `syncTicking` both walk this
  // same Map, so filling it here is what puts a due bell and a live interval
  // back in one move.
  for (const i of timerStore.steps(rid)) {
    if (i < steps.length) timerFor(i);
  }
  paintStepIngredients(index);
  paint();
  document.body.append(dialog);
  translate(dialog); // pick up the stored language before the first frame
  dialog.showModal();
  stage.focus();

  // A bell that fell due while the sheet was closed rings now, on the way back
  // in, and without a notification (see ringFor). AFTER showModal on purpose: a
  // role="alert" region announces a CHANGE made while it is in the document, so
  // writing it before the dialog was shown would ring silently for exactly the
  // reader who cannot see the face flip to "Time's up".
  checkAlarms({ notify: false });
  paintTimer();
  // …and a timer still counting needs the interval back, or nothing repaints
  // and nothing rings when it does reach zero.
  syncTicking();

  lock.acquire().then(showAwake);
  return dialog;
}
