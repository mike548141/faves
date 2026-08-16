// Rotating search placeholder — the box tells you what it can find.
//
// A search box that says "Search…" teaches nothing. Faves can find a dish, a
// place, an ingredient, a street, a phone number or a diet, and almost nobody
// discovers that by guessing. So the placeholder cycles through examples, the
// way Airbnb's map search does (owner steer, 2026-08-16).
//
// THE HONESTY RULE, and it is the important one: a hint may only advertise
// something the search can actually do. `app.js` builds the list from what
// `search.js` indexes, so widening the box's promises means widening the
// index first. A placeholder that suggests "plant based" while the index has
// no diet labels is the UI lying about the product.
//
// Accessibility. The rotation is auto-updating content, so:
//   • `prefers-reduced-motion: reduce` pins it to the first hint and never
//     starts a timer — WCAG 2.3.3, and a placeholder flickering in peripheral
//     vision is exactly the distraction that setting exists to stop.
//   • It stops on focus and while the field has text, so it can never change
//     under someone who is reading or typing it.
//   • The accessible name comes from the <label>, not the placeholder, so
//     nothing here retitles the field mid-interaction (WCAG 2.5.3) and no
//     live region announces it.
//
// Everything is injected — timer, media query, the hint list — so the whole
// lifecycle is unit-testable without a DOM timer (tests/search-hints.test.js).

const DEFAULT_INTERVAL = 4000;

/**
 * Cycle `input`'s placeholder through `hints`.
 *
 * @param {HTMLInputElement} input
 * @param {string[]} hints         at least one; a single hint just sits there
 * @param {object}   deps
 *   setInterval / clearInterval   injectable timers
 *   reducedMotion                 () => boolean
 *   interval                      ms between hints
 * @returns {{stop: () => void, current: () => string}} stop is idempotent.
 */
export function rotateHints(input, hints, deps = {}) {
  const {
    setInterval: setEvery = globalThis.setInterval,
    clearInterval: clearEvery = globalThis.clearInterval,
    reducedMotion = () =>
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    interval = DEFAULT_INTERVAL,
  } = deps;

  const list = (hints || []).filter(Boolean);
  if (!input || list.length === 0) {
    return { stop: () => {}, current: () => "" };
  }

  let i = 0;
  let timer = null;
  input.placeholder = list[0];

  const tick = () => {
    // Belt and braces: the timer is cleared on focus and on input, but a
    // stale tick arriving in between must not overwrite what someone is
    // reading. Checking here means there is no ordering to get wrong.
    if (input.value || document.activeElement === input) return;
    i = (i + 1) % list.length;
    input.placeholder = list[i];
  };

  const start = () => {
    if (timer !== null || list.length < 2 || reducedMotion()) return;
    timer = setEvery(tick, interval);
  };
  const pause = () => {
    if (timer === null) return;
    clearEvery(timer);
    timer = null;
  };

  input.addEventListener("focus", pause);
  input.addEventListener("blur", () => {
    if (!input.value) start();
  });
  // Typing stops it for good until the field is empty and unfocused again —
  // a hint changing behind live results reads as a bug.
  input.addEventListener("input", () => {
    if (input.value) pause();
  });

  start();

  return {
    stop: () => {
      pause();
      input.removeEventListener("focus", pause);
    },
    current: () => list[i],
  };
}

/**
 * The hints themselves, translated through `t`. Each one names a *kind* of
 * thing the index holds, and the order walks from the obvious (a dish) to the
 * least guessable (a phone number), because someone reading two or three of
 * them should learn something they did not already assume.
 *
 * Every line here must correspond to something `search.js` indexes. Adding a
 * hint is a claim about the product, not copywriting.
 */
export function defaultHints(t) {
  return [
    t("search.hint.dish", "Search a dish — “laksa”, “ginger crunch”…"),
    t("search.hint.place", "Search a place — “Southern Cross”…"),
    t("search.hint.ingredient", "Search an ingredient — “lemongrass”…"),
    t("search.hint.diet", "Search a diet — “vegan”, “gluten free”…"),
    t("search.hint.cuisine", "Search a cuisine — “Thai”, “Malaysian”…"),
    t("search.hint.area", "Search an area or street — “Cuba St”…"),
    t("search.hint.service", "Search “takeaway” or “dine in”…"),
    t("search.hint.phone", "Search a phone number you half remember…"),
  ];
}
