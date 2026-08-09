// In-session UI state across the menu's SAFETY re-render (owner ruling
// 2026-07-25).
//
// When a viewer changes a setting or switches profile on the menu page, menu.js
// re-runs the WHOLE render() the first paint uses. That is deliberate and
// load-bearing: it is what guarantees the allergen ⚠ / dietary treatment cannot
// drift between the initial and the reactive path (dietary.js, and the
// adversarial review in docs/reviews/2026-07-23-1127-…). The cost was that a
// typed search query, the scroll position and any ad-hoc dietary-chip toggle
// were thrown away with the old DOM.
//
// This module buys those three back WITHOUT forking the render. The contract:
//
//   1. capture BEFORE the re-render — read-only, off the DOM that is about to
//      be discarded;
//   2. the re-render happens EXACTLY as before — untouched, no partial DOM
//      patching, no second code path, no reordering of the safety re-apply;
//   3. restore AFTER it, through the SAME mechanisms a person would use — set
//      the search field and fire its normal `input` handler; click the dietary
//      chips' own buttons; scroll the window last.
//
// So a bug in here can only ever cost convenience. It cannot leave a stale or
// missing allergen highlight, because by the time any of it runs the safety
// render has already completed. Every restore step is best-effort and
// individually guarded for exactly that reason: degrade, never throw, never
// half-apply.
//
// Deliberately NOT restored: focus. A re-render is triggered from the Settings
// dialog, so focus belongs to the dialog the viewer is still in — yanking it to
// the (rebuilt) search field would be a WCAG 2.2 focus-order regression.

/**
 * Which dietary chips the viewer has toggled AWAY from the state their stored
 * preferences pre-selected — the ad-hoc, session-only part of the chip row.
 *
 * We keep the *delta*, not the absolute chip state, because the re-render is
 * usually triggered by a settings change: if that change was a dietary
 * preference, the new render's pre-selection must win (otherwise the dial would
 * look inert), while a chip the viewer flipped by hand still survives.
 *
 * @param {{key: string, pressed: boolean}[]} chips  chips as rendered
 * @param {Iterable<string>} preselected  keys the prefs pre-selected for THAT render
 * @returns {{key: string, on: boolean}[]} only the chips that differ
 */
export function chipDelta(chips, preselected) {
  const pre = new Set(preselected || []);
  const out = [];
  for (const c of chips || []) {
    if (!c || typeof c.key !== "string") continue;
    const pressed = c.pressed === true;
    if (pressed !== pre.has(c.key)) out.push({ key: c.key, on: pressed });
  }
  return out;
}

/**
 * Which chips to click on the freshly rendered row to re-apply `delta`.
 * A chip that no longer exists, or whose new pre-selected state already matches
 * what the viewer wanted, yields nothing — that is the graceful degrade.
 *
 * @param {{key: string, pressed: boolean}[]} chips  chips as just re-rendered
 * @param {{key: string, on: boolean}[]} delta  from chipDelta()
 * @returns {string[]} chip keys to activate, in rendered order
 */
export function chipsToToggle(chips, delta) {
  const want = new Map((delta || []).map((d) => [d.key, d.on === true]));
  const out = [];
  for (const c of chips || []) {
    if (!c || !want.has(c.key)) continue;
    if (want.get(c.key) !== (c.pressed === true)) out.push(c.key);
  }
  return out;
}

/**
 * Clamp a remembered scroll offset into the new document. The re-rendered menu
 * is normally the same height (search hides and the dietary dim don't change
 * layout), but a genuinely shorter page — a profile whose prefs changed what
 * renders, or images not yet re-decoded — must land at the bottom rather than
 * be scrolled past. Non-finite/negative input degrades to the top.
 */
export function clampScroll(y, max) {
  if (!Number.isFinite(y) || y <= 0) return 0;
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.min(y, max);
}

/**
 * Read the small, session-only UI state off the screen that is about to be
 * re-rendered. Every field is optional — a stub menu (no search, no chips) or
 * the recipe screen simply capture less. Never throws.
 *
 * @param {ParentNode} scope  the element the screen renders into
 */
export function captureUiState(scope) {
  const state = { query: "", chips: [], scrollY: 0 };
  try {
    state.scrollY = window.scrollY || 0;
    if (!scope) return state;
    const search = scope.querySelector(".menu-search");
    if (search) state.query = search.value || "";
    const row = scope.querySelector(".diet-chips");
    if (row) {
      // The pre-selection that produced THIS row, stamped by the render (see
      // menu.js). Read it from the DOM rather than from settings.get(): by the
      // time we capture, the settings change that triggered the re-render has
      // already committed, so the live store no longer tells us what these
      // chips started as.
      const pre = (row.dataset.preselect || "").split(" ").filter(Boolean);
      state.chips = chipDelta(readChips(row), pre);
    }
  } catch (err) {
    console.warn("Faves: UI-state capture skipped:", err);
  }
  return state;
}

function readChips(row) {
  return [...row.querySelectorAll(".diet-chip")].map((c) => ({
    key: c.dataset.key,
    pressed: c.getAttribute("aria-pressed") === "true",
    el: c,
  }));
}

/**
 * Re-apply a captured state to the freshly rendered screen, through the same
 * handlers a person's own interaction would run. Each step is guarded
 * separately so one failing can't strand the others; scroll goes last, once the
 * search/chip work has settled the page height.
 *
 * @param {ParentNode} scope  the element the screen re-rendered into
 * @param {ReturnType<captureUiState>} state
 */
export function restoreUiState(scope, state) {
  if (!state) return;
  if (scope) {
    try {
      const search = scope.querySelector(".menu-search");
      if (search && state.query) {
        search.value = state.query;
        // The screen's own `input` listener is the only thing that knows how to
        // filter — fire it rather than reimplementing the filter here. If the
        // query now matches nothing the normal "No dishes match." state shows,
        // which is the honest result, not an error.
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (err) {
      console.warn("Faves: search restore skipped:", err);
    }
    try {
      const row = scope.querySelector(".diet-chips");
      if (row && state.chips?.length) {
        const chips = readChips(row);
        const byKey = new Map(chips.map((c) => [c.key, c.el]));
        // .click() so the chip's own handler updates aria-pressed AND the view
        // — the same single path a tap takes.
        for (const key of chipsToToggle(chips, state.chips)) byKey.get(key)?.click();
      }
    } catch (err) {
      console.warn("Faves: dietary-chip restore skipped:", err);
    }
  }
  restoreScroll(state.scrollY);
}

/**
 * Put the window back where it was. Always instant: this is a restoration, not
 * a journey — an animated scroll here would be motion the viewer never asked
 * for (prefers-reduced-motion) and would race the next paint.
 */
export function restoreScroll(y) {
  if (!Number.isFinite(y) || y <= 0) return;
  const go = () => {
    const doc = document.documentElement;
    const max = Math.max(0, doc.scrollHeight - window.innerHeight);
    window.scrollTo(0, clampScroll(y, max));
  };
  try {
    go();
    // Once more after the render's own rAF work (--toolbar-h measurement, image
    // re-decode): the first pass can land short if the page hasn't reached full
    // height yet, and re-issuing the identical scroll is a no-op when it didn't.
    requestAnimationFrame(go);
  } catch (err) {
    console.warn("Faves: scroll restore skipped:", err);
  }
}
