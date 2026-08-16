// Favourites UI helpers: the heart toggle button (used on dish rows, the
// venue header, and the favourites view) bound to the shared favourites
// store, so every heart for the same thing stays in sync. The store itself
// (favourites.js) is DOM-free and unit-tested; this is presentation only.

import { favourites } from "./favourites.js";
import { referenceCopyFor, referenceWhyFor } from "./data.js";
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

/**
 * Mark one Favourites row whose venue or dish isn't in the data this device
 * holds (ADR 0020 invariant 1). The row STAYS — silent removal is data loss —
 * and gains a label, an honest explanation, a Refresh and a Remove.
 *
 * The label and the sentence come from data.js's single copy table, so the one
 * rule that matters is enforced in one place: nothing here may say "removed"
 * unless `state === "absent"`, which only a fetch that provably reached the
 * network can produce.
 *
 * @param {HTMLElement} li           the row built by resultRow()
 * @param {object} o.entry           the stored favourite
 * @param {string} o.state           "unresolved" | "checking" | "absent" | "offline" | "unreachable"
 * @param {string} o.name            what to call it in the accessible labels
 * @param {boolean} o.alsoRated      a personal rating is stored under the same key
 * @param {Function} o.onRefresh     re-check this one against the network
 * @param {Function} o.onRemove      forget it on this device
 */
export function markUnresolved(li, { entry, state, name, alsoRated, onRefresh, onRemove }) {
  const checking = state === "checking";
  li.classList.add("fav-unresolved");
  li.dataset.refState = state;

  const link = li.querySelector(".search-link");
  if (link) {
    link.append(
      el("span", {
        className: "search-row-note fav-unresolved-note",
        textContent: referenceCopyFor(entry, state),
      })
    );
  }

  const refresh = el("button", {
    type: "button",
    className: "fav-action fav-recheck",
    textContent: checking ? "Checking…" : "Refresh",
    disabled: checking,
  });
  refresh.setAttribute("aria-label", `Check online whether ${name} is still there`);
  refresh.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRefresh();
  });

  // Removal is the user's call, and it is told in full BEFORE it happens: a
  // rating shares the favourite's key, so a row that carries one takes both
  // with it — otherwise the mark survives with nothing left on screen that
  // could ever reach it again.
  const remove = el("button", {
    type: "button",
    className: "fav-action fav-drop",
    textContent: "Remove",
    disabled: checking,
  });
  const removeWhat = alsoRated
    ? `Remove ${name} — clears the heart and your rating on this device`
    : `Remove ${name} from favourites`;
  remove.setAttribute("aria-label", removeWhat);
  remove.title = removeWhat;
  remove.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  });

  // `onRemove` is optional: a venue heading shown only because a DISH of it is
  // hearted has no heart of its own to remove, so it gets the label and the
  // Refresh and nothing that would pretend otherwise.
  li.append(
    el("div", { className: "fav-unresolved-actions" }, [
      el("p", { className: "fav-unresolved-why", textContent: referenceWhyFor(state) }),
      onRefresh ? refresh : null,
      onRemove ? remove : null,
    ])
  );
  return li;
}
