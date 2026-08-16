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

// How long a hint holds before the next one. 4s read as restless in use
// (owner, 2026-08-16) — a hint is a whole sentence with an example in it, and
// it has to be readable by someone who only glances at it. Note the fade eats
// into the dwell at both ends, so the *readable* still time is roughly
// INTERVAL − FADE, not INTERVAL.
const DEFAULT_INTERVAL = 7000;

// Paired with the ::placeholder transition in app.css. The script holds the
// faded-out state for exactly this long before swapping the text, so if one
// changes the other must.
const FADE_MS = 450;

// Toggled on the input while the placeholder is faded out.
const FADING = "hint-fading";

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
    setTimeout: later = globalThis.setTimeout,
    clearTimeout: cancel = globalThis.clearTimeout,
    reducedMotion = () =>
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    interval = DEFAULT_INTERVAL,
    fade = FADE_MS,
  } = deps;

  const list = (hints || []).filter(Boolean);
  if (!input || list.length === 0) {
    return { stop: () => {}, current: () => "" };
  }

  let i = 0;
  let timer = null;
  input.placeholder = list[0];

  let fading = null;

  const swap = () => {
    i = (i + 1) % list.length;
    input.placeholder = list[i];
  };

  // Cancel a fade caught mid-flight and put the placeholder back to visible.
  // Every pause path goes through this: the one unacceptable outcome is an
  // input left holding an invisible placeholder because someone focused the
  // field during the 450 ms the text was faded out.
  const settle = () => {
    if (fading !== null) {
      cancel(fading);
      fading = null;
    }
    input.classList?.remove(FADING);
  };

  const tick = () => {
    // Belt and braces: the timer is cleared on focus and on input, but a
    // stale tick arriving in between must not overwrite what someone is
    // reading. Checking here means there is no ordering to get wrong.
    if (input.value || document.activeElement === input) return;
    if (fading !== null) return; // a fade is already running; don't stack them
    if (!fade) {
      swap();
      return;
    }
    // Fade out, swap under cover, fade back in. The class going off in the
    // same step as the new text is what makes it a cross-fade rather than a
    // blink — CSS transitions the opacity back up while the new text is
    // already in place.
    input.classList?.add(FADING);
    fading = later(() => {
      fading = null;
      // Re-check: the field may have been focused or typed into while faded.
      if (!input.value && document.activeElement !== input) swap();
      input.classList?.remove(FADING);
    }, fade);
  };

  const start = () => {
    if (timer !== null || list.length < 2 || reducedMotion()) return;
    timer = setEvery(tick, interval);
  };
  const pause = () => {
    settle();
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
