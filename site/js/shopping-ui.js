// The shopping list's screens (ROADMAP 17e). `shopping.js` owns the model —
// which is `cart.js` — and this owns the two controls a reader touches:
//
//   1. On a recipe, a button beside "Start cooking" that puts the ingredients
//      on the list, says when the list disagrees with the scale on screen, and
//      offers to bring it up to date.
//   2. A sheet, opened from the ⋯ menu on every screen, listing what is on it
//      grouped by recipe — tick as you shop, ✕ what you already have, remove a
//      whole recipe, or empty the lot.
//
// IT REUSES THE ORDER SHEET'S FRAME, not a copy of it: `.order-sheet`'s
// selectors already carry the bottom-sheet-on-a-phone / centred-card-on-wide
// geometry, the backdrop, the scrolling body and the 44px close button, and
// `.shop-sheet` is added to those selector lists exactly as `.share-sheet`,
// `.recv-sheet` and `.report-sheet` already are. A shopping line is rendered
// with `.order-collect-line` and `.order-check` — the tally's COLLECT MODE row
// — because ticking something off in a trolley and ticking it off at a till are
// the same control doing the same job, down to the strike-through.
//
// EMPTYING IS THE FEATURE, not an afterthought. A list you cannot empty is a
// trap, and this app has shipped that trap once already. So there are three
// ways out at three sizes — one line, one recipe, the whole list — and the
// whole-list one is the tally's own two-tap confirm, so a fat thumb in a
// supermarket cannot wipe the list it is reading from.

import { el } from "./dom.js";
import { dishId } from "./dish-id.js";
import { parseRecipeId } from "./checklist.js";
import { canonicalVenueId } from "./renames.js";
import {
  SHOPPING_KEY,
  putRecipe,
  recipeLines,
  recipeState,
  removeRecipe,
  shopping,
} from "./shopping.js";

const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// One sheet per page, built on first open. Nothing about it is page-specific,
// so a second call reuses it rather than stacking dialogs.
let sheet = null;

/**
 * The link back to the recipe a group came from. Built from the group's own
 * key, which IS `recipeId()`'s join, so there is no second place that knows how
 * a recipe is addressed. A key that does not split is rendered as plain text
 * rather than as a dead link — a stored line whose shape we cannot read is
 * still a thing the shopper has to buy.
 */
function groupHeading(g) {
  const { venueId, dishId: dish } = parseRecipeId(g.venueId);
  const name = g.venueName || "A recipe";
  if (!venueId || !dish) return el("h3", { className: "order-group-name", textContent: name });
  return el("h3", { className: "order-group-name" }, [
    el("a", {
      className: "shop-recipe-link",
      // Through the rename resolver, like every other stored venue id in the
      // app. `migrateEntries` cannot reach these: it rewrites a bare `venueId`
      // and a shopping group's is a JOINED PAIR, so a collection renamed
      // tomorrow would leave every link on this sheet pointing at a file that
      // is gone. The line itself still reads fine either way — the ingredient
      // and its amount are on it — so this is the link, not the list.
      href: `recipe.html?id=${encodeURIComponent(canonicalVenueId(venueId))}&dish=${encodeURIComponent(dish)}`,
      textContent: name,
    }),
  ]);
}

function lineRow(item) {
  const key = dishId(item);
  const box = el("input", {
    type: "checkbox",
    className: "order-check",
    checked: !!item.collected,
  });
  // The reader's box is the truth — `toggleCollected` flips what is stored, so
  // the lookup has to name the line exactly (venue + line key), which is what
  // makes two identically-worded lines in different recipes stay two ticks.
  box.addEventListener("change", () => shopping.toggleCollected(item.venueId, key));
  const label = el("label", { className: "order-collect-line" }, [
    box,
    el("span", { className: "order-line-name", textContent: item.name }),
  ]);
  const drop = el("button", { type: "button", className: "shop-remove", textContent: "✕" });
  // A column of bare ✕ buttons is indistinguishable to a screen reader, and
  // this one DELETES — so it names what it will take off, not just itself.
  drop.setAttribute("aria-label", `Take ${item.name} off the shopping list`);
  drop.addEventListener("click", () => shopping.remove(item.venueId, key));
  const li = el("li", { className: "order-line shop-line" }, [label, drop]);
  // `.collected` is what strikes the line through, in CSS. Meaning is never
  // carried by colour or by a line alone here: the checkbox's own state is what
  // a screen reader announces, and it is a real <input>, so it says so.
  if (item.collected) li.classList.add("collected");
  return li;
}

function buildSheet() {
  const body = el("div", { className: "order-body" });
  const clearBtn = el("button", { type: "button", className: "order-clear", textContent: "Clear the list" });
  const caption = el("p", { className: "order-caption" });

  const dialog = el("dialog", { className: "shop-sheet", "aria-labelledby": "shop-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "shop-title", className: "order-title", textContent: "Shopping list" }),
        (() => {
          const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
          b.setAttribute("aria-label", "Close");
          b.addEventListener("click", () => dialog.close());
          return b;
        })(),
      ]),
      body,
      el("div", { className: "order-foot" }, [
        caption,
        el("div", { className: "order-actions" }, [clearBtn]),
      ]),
    ]),
  ]);

  let confirming = false;
  function resetClear() {
    confirming = false;
    clearBtn.textContent = "Clear the list";
    clearBtn.classList.remove("confirming");
  }
  clearBtn.addEventListener("click", () => {
    // Two taps, like the tally's. A shopping list is read one-handed in a shop
    // with a trolley in the other, and a single-tap wipe of the thing you are
    // reading from is not recoverable — nothing here is undoable.
    if (!confirming) {
      confirming = true;
      clearBtn.textContent = "Clear the list — sure?";
      clearBtn.classList.add("confirming");
      return;
    }
    shopping.clear();
    resetClear();
  });

  function render() {
    resetClear();
    const groups = shopping.groups();
    body.replaceChildren();
    if (!groups.length) {
      caption.textContent = "";
      clearBtn.hidden = true;
      body.append(
        el("p", {
          className: "order-empty",
          textContent: "Nothing on your list yet. Open a recipe and tap “Add to shopping list”.",
        })
      );
      return;
    }
    clearBtn.hidden = false;
    for (const g of groups) {
      const remove = el("button", {
        type: "button",
        className: "shop-group-remove",
        textContent: "Remove",
      });
      remove.setAttribute("aria-label", `Take everything for ${g.venueName} off the shopping list`);
      remove.addEventListener("click", () => removeRecipe(shopping, g.venueId));
      body.append(
        el("section", { className: "order-group" }, [
          el("div", { className: "order-group-head" }, [groupHeading(g), remove]),
          el("ul", { className: "order-lines" }, g.items.map(lineRow)),
        ])
      );
    }
    const left = shopping.items().filter((i) => !i.collected).length;
    // Counted rather than totalled: a shopping line has no price and this app
    // does not know what a supermarket charges. Saying what is LEFT is the
    // number a person in an aisle actually wants.
    caption.textContent = left
      ? `${plural(left, "thing")} still to get.`
      : "Everything ticked off.";
  }

  dialog.addEventListener("close", resetClear);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close(); // backdrop
  });
  document.body.append(dialog);
  // Re-render only while it is open: the sheet is rebuilt wholesale on every
  // change, and rebuilding a dialog nobody is looking at costs a render for
  // nothing.
  shopping.subscribe(() => {
    if (dialog.open) render();
  });
  return { dialog, render };
}

/** Open the shopping list, building it the first time. */
export function openShoppingList() {
  if (!sheet) sheet = buildSheet();
  sheet.render();
  sheet.dialog.showModal();
}

/**
 * Wire the ⋯ menu's "Shopping list" entry, on whichever screen carries one.
 * Absent markup is not an error — this is called from three screens' boot and a
 * page that has no entry simply gets no shopping list.
 */
export function initShoppingEntry() {
  const btn = document.getElementById("shopping-btn");
  if (!btn) return;
  btn.hidden = false;
  const count = btn.querySelector(".shop-count");
  const paint = () => {
    const n = shopping.count();
    // The badge is a COUNT, and a count of nothing is noise — the entry stays,
    // so the list is findable when it is empty, and only the number goes.
    if (count) {
      count.textContent = n ? String(n) : "";
      count.hidden = n === 0;
    }
    btn.setAttribute(
      "aria-label",
      n ? `Shopping list — ${plural(n, "thing")}` : "Shopping list — empty"
    );
  };
  paint();
  shopping.subscribe(paint);
  btn.addEventListener("click", openShoppingList);
  // The list is one list for the device, so a second tab writing to it must not
  // leave this one showing a stale count (the tally does the same).
  window.addEventListener("storage", (e) => {
    if (e.key === SHOPPING_KEY) shopping.reload();
  });
}

/**
 * The recipe page's control: add these ingredients, or say what is already on
 * the list and whether it still agrees with the scale on screen.
 *
 * `scale` is a GETTER read at the tap, never a value captured when the button
 * was built — the same discipline `cookButton` follows, and for the same
 * reason: a list built from a stale scale is a silent wrong number in a
 * kitchen, and it would be wrong in a way nobody notices until the shop.
 *
 * Returns `{ row }` or null when the recipe has no ingredients to shop for.
 */
export function shoppingButton(item, { venueId, rid, scale }) {
  const scaleKey = () => (typeof scale === "function" ? scale() : scale);
  if (!recipeLines(item, scaleKey()).length) return null;

  // No `data-i18n` on any of these. Every string here is composed in JS and two
  // of them swap under the reader's tap, which is exactly the shape reo.js's
  // engine does not do ("the engine swaps whole strings only", and translate()
  // captures the English once). They are declared English-only in reo.js's owed
  // list instead of being half-wired to a table that has no entry for them.
  const btn = el("button", { type: "button", className: "btn shop-add" });
  const update = el("button", {
    type: "button",
    className: "btn shop-update",
    textContent: "Update the amounts",
  });
  const note = el("p", { className: "shop-note" });
  // A status, not an alert: it changes under the reader's own tap, so it is
  // announced politely and never interrupts. `aria-atomic` so the whole
  // sentence is read rather than the word that changed.
  note.setAttribute("role", "status");
  note.setAttribute("aria-live", "polite");
  note.setAttribute("aria-atomic", "true");
  const view = el("button", { type: "button", className: "shop-view", textContent: "View the list" });
  view.addEventListener("click", openShoppingList);

  const row = el("div", { className: "shop-row" }, [
    el("div", { className: "shop-row-actions" }, [btn, update]),
    note,
  ]);

  function paint() {
    const lines = recipeLines(item, scaleKey());
    const state = recipeState(shopping.items(), rid, lines);
    // ONE button, whose label always names what a tap will do. An `aria-pressed`
    // toggle is the right ARIA shape for "on the list / not on the list", and it
    // is the announced state that carries the fact — never the tick glyph, which
    // a screen reader would read as decoration if it read it at all.
    const on = state !== "absent";
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("is-on", on);
    btn.textContent = on ? "On your shopping list" : "Add to shopping list";
    btn.setAttribute(
      "aria-label",
      on
        ? `On your shopping list — tap to take ${item.name} off`
        : `Add ${item.name}'s ingredients to your shopping list`
    );

    // 🚩 THE HONESTY CASE. The reader is looking at one set of amounts and their
    // list holds another. Nothing else on either screen would say so, and the
    // failure lands in a supermarket where neither screen is open.
    update.hidden = state !== "stale";
    note.replaceChildren();
    if (state === "stale") {
      row.classList.add("is-stale");
      note.append(
        el("span", { className: "shop-warn-mark", "aria-hidden": "true", textContent: "⚠ " }),
        // Carried in WORDS, never in the amber alone (WCAG 1.4.1).
        "Your list holds this recipe at different amounts from the ones shown. ",
        view
      );
    } else {
      row.classList.remove("is-stale");
      if (on) note.append("These ingredients are on your list. ", view);
    }
  }

  btn.addEventListener("click", () => {
    const lines = recipeLines(item, scaleKey());
    if (recipeState(shopping.items(), rid, lines) === "absent") {
      putRecipe(shopping, { rid, name: item.name, lines });
    } else {
      removeRecipe(shopping, rid);
    }
  });
  update.addEventListener("click", () => {
    // `onlyListed` — bring the amounts of what is ON the list up to date and add
    // nothing, so a line the shopper took off ("I already have butter") stays
    // off. Re-adding it here would make the ✕ a button that undoes itself.
    putRecipe(shopping, { rid, name: item.name, lines: recipeLines(item, scaleKey()), onlyListed: true });
  });

  paint();
  // The recipe page rebuilds this button on a scale change, but the list can
  // also move under it — cleared from the sheet sitting over this page, or
  // written by another tab. Self-unsubscribing once the node is off the
  // document, because `render()` builds a new one every time and a subscriber
  // per repaint would accumulate for the life of the page.
  const off = shopping.subscribe(() => {
    if (!row.isConnected) return off();
    paint();
  });
  return row;
}
