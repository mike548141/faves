// Favourites UI helpers: the heart toggle button (used on dish rows, the
// venue header, and the favourites view) bound to the shared favourites
// store, so every heart for the same thing stays in sync. The store itself
// (favourites.js) is DOM-free and unit-tested; this is presentation only.

import { favourites } from "./favourites.js";
import { el } from "./dom.js";

/**
 * A ♥ / ♡ toggle for one favourite `entry`
 * ({ type, venueId, venueName, name?, dishId?, isRecipe?, sub? }). `thing`
 * names it for the accessible label ("Add Mee Goreng to favourites").
 * Self-updating.
 *
 * `dishId` is what a dish entry is stored under; it is optional because an
 * entry rebuilt from storage doesn't have the menu row to hand, and
 * favourites.js falls back to the slugged name — which is the same string for
 * every dish that has no explicit id. Pass it wherever the item IS to hand.
 */
export function heartButton(entry, thing) {
  const name = thing || entry.name || entry.venueName || "this";
  const btn = el("button", { type: "button", className: "heart" });

  function render() {
    const on = favourites.has(entry);
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "♥" : "♡";
    btn.setAttribute(
      "aria-label",
      on ? `Remove ${name} from favourites` : `Add ${name} to favourites`
    );
  }

  btn.addEventListener("click", (e) => {
    // These hearts often sit inside a link (a dish row / result row); don't
    // navigate or bubble when the user is just toggling the favourite.
    e.preventDefault();
    e.stopPropagation();
    favourites.toggle(entry);
  });

  render();
  favourites.subscribe(render);
  return btn;
}
