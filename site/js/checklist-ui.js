// The tick boxes themselves (ROADMAP 17e). `checklist.js` owns the store; this
// owns the control, and it is deliberately tiny so the two screens that use it
// — the recipe page and cook mode — cannot drift into two different checkboxes.
//
// A REAL <input type="checkbox">, never a div with a click handler. The
// platform gives the role, the announced state, the space-bar, the focus ring
// and the native tap behaviour; a hand-rolled one gives back a maintenance
// promise. The whole label is the target, sized to 44px in app.css, because a
// bare checkbox is a 13px hit and this list is read one-handed with wet hands
// (the same argument `.addon-option` already makes).
//
// TICKED IS STYLED IN CSS, NOT IN JS, and that is load-bearing rather than
// tidy: in cook mode the ingredient list sits INSIDE an `aria-live="polite"
// aria-atomic="true"` region, so any DOM mutation there re-announces the whole
// step. Toggling a checkbox sets a PROPERTY and mutates nothing, so `.tick:has(
// .tick-box:checked)` can do the strike-through without a screen reader reading
// the step out again on every tick.

import { el } from "./dom.js";
import { checklist, lineId } from "./checklist.js";

/**
 * One tickable line.
 *
 * `raw` is the line as the DATA holds it — it is what the tick is keyed on, so
 * it must never be the converted render (units.js rewrites °C to °F, and a
 * reader flipping to imperial must not lose their ticks). `display` is what the
 * reader sees, and defaults to the same string.
 */
export function tickRow(rid, kind, raw, display = raw) {
  const id = lineId(kind, raw);
  const box = el("input", {
    type: "checkbox",
    className: "tick-box",
    checked: checklist.has(rid, id),
  });
  box.dataset.tick = id;
  // The reader's click is the truth — write what the box now says rather than
  // flipping what is stored, so two copies of a line on screen at once (cook
  // mode over the recipe page) can never argue.
  box.addEventListener("change", () => checklist.set(rid, id, box.checked));
  return el("label", { className: "tick" }, [
    box,
    el("span", { className: "tick-text", textContent: display }),
  ]);
}

/**
 * Re-read every tick box under `root` from the store. Sets properties only —
 * no DOM mutation — so it is safe to call inside a live region, which is why
 * cook mode can repaint the recipe page's boxes behind it without a screen
 * reader announcing anything.
 */
export function syncTicks(root, rid) {
  for (const box of root.querySelectorAll(".tick-box[data-tick]")) {
    box.checked = checklist.has(rid, box.dataset.tick);
  }
}
