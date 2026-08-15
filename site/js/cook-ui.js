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
// THE INGREDIENTS PANEL is a toggle, not a navigation. The roadmap's stated
// problem for 17c is "don't send the reader back up the page", and the cheap
// half of that is reachable here: open the list, read it, close it, and you are
// still on the step you were on — the index is never touched. Inline per-step
// quantities are 17c and deliberately not attempted.
//
// REO. Every button label carries a data-i18n key. The step counter does not:
// it is interpolated ("Step 3 of 9"), and reo.js swaps whole strings only —
// the same boundary "Serves 4" and the hours badges already sit behind.

import { el } from "./dom.js";
import { translate } from "./reo.js";
import { settings } from "./settings.js";
import { convertTemperatures } from "./units.js";
import { canCook, createWakeLock, keyToIndex, stepState, stepsOf } from "./cook.js";

// Ids must be unique across however many dialogs a session opens and discards.
let seq = 0;

const canModal =
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal === "function";

/**
 * The "Cook mode" affordance for a recipe, or null when there is nothing to
 * cook from. Returning null (rather than a disabled button) is deliberate: the
 * one recipe without a method should look like a recipe without a method, not
 * like a broken feature.
 */
export function cookButton(item) {
  if (!canCook(item) || !canModal) return null;
  const btn = el("button", { type: "button", className: "cook-start" }, [
    el("span", { className: "cook-start-ico", textContent: "🍳", "aria-hidden": "true" }),
    el("span", { "data-i18n": "cook.start", textContent: "Cook mode" }),
  ]);
  btn.addEventListener("click", (e) => {
    // Recipe rows can sit inside a link on the Cook at Home list; a tap here
    // must open cook mode, never navigate away from it.
    e.preventDefault();
    e.stopPropagation();
    openCookMode(item);
  });
  return btn;
}

/** Open the full-screen view for `item`. Assumes canCook(item). */
export function openCookMode(item) {
  const steps = stepsOf(item);
  if (!steps.length || !canModal) return null;

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
  }, [counter, stepText]);

  const ingList = el("ul", { className: "ingredients" });
  const ingPanel = el("section", { className: "cook-ing", id: ingId, hidden: true }, [
    el("h3", { className: "recipe-head", "data-i18n": "recipe.ingredients", textContent: "Ingredients" }),
    ingList,
  ]);

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

  const ingBtn = ingredients.length
    ? el("button", {
        type: "button",
        className: "cook-btn cook-ing-toggle",
        "aria-expanded": "false",
        "aria-controls": ingId,
        "data-i18n": "recipe.ingredients",
        textContent: "Ingredients",
      })
    : null;

  const nav = el("div", { className: "cook-nav" }, [prevBtn, ingBtn, nextBtn]);
  const dialog = el("dialog", { className: "cook-sheet", "aria-labelledby": titleId }, [
    el("div", { className: "cook-inner" }, [
      el("div", { className: "cook-top" }, [
        el("div", { className: "cook-heading" }, [title, awake]),
        close,
      ]),
      progress,
      stage,
      ingPanel,
      nav,
    ]),
  ]);

  // --- Painting ----------------------------------------------------------
  function paintIngredients() {
    const units = settings.get().units;
    ingList.replaceChildren(
      ...ingredients.map((ing) => el("li", { textContent: convertTemperatures(ing, units) }))
    );
  }

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
  close.addEventListener("click", () => dialog.close());
  prevBtn.addEventListener("click", () => goTo(index - 1));
  nextBtn.addEventListener("click", () => {
    if (stepState(index, steps.length).atLast) dialog.close();
    else goTo(index + 1);
  });
  ingBtn?.addEventListener("click", () => {
    const open = ingPanel.hidden;
    ingPanel.hidden = !open;
    ingBtn.setAttribute("aria-expanded", String(open));
    if (open) ingPanel.scrollIntoView({ block: "nearest" });
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
    paintIngredients();
  });

  dialog.addEventListener("close", () => {
    document.removeEventListener("visibilitychange", onVisibility);
    unsubscribe();
    // Never leave the screen pinned awake on a page nobody is reading.
    lock.release();
    dialog.remove();
    // <dialog> restores focus to the opener itself; this is the belt to that
    // brace, for the case where the opener was re-rendered underneath us (a
    // settings change repaints the recipe) and the platform has nowhere to go.
    if (!document.activeElement || document.activeElement === document.body) {
      document.querySelector(".cook-start")?.focus();
    }
  });

  paintIngredients();
  paint();
  document.body.append(dialog);
  translate(dialog); // pick up the stored language before the first frame
  dialog.showModal();
  stage.focus();

  lock.acquire().then(showAwake);
  return dialog;
}
