// Favourites UI helpers: the heart toggle button (used on dish rows, the
// venue header, and the favourites view) bound to the shared favourites
// store, so every heart for the same thing stays in sync. The store itself
// (favourites.js) is DOM-free and unit-tested; this is presentation only.

import { favourites } from "./favourites.js";

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

/**
 * A ♥ / ♡ toggle for one favourite `entry`
 * ({ type, venueId, venueName, name?, isRecipe?, sub? }). `thing` names it
 * for the accessible label ("Add Mee Goreng to favourites"). Self-updating.
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
