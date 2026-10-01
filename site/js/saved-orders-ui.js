// Saved orders — the two controls (Theme 26a). Model: saved-orders.js; the
// resolving of a saved line against today's menu: saved-recall.js.
//
//   • `saveRow(group)` — "Save this order" under one venue's lines in the ORDER
//     SHEET, where the lines are. Opens a name field (pre-filled "My <venue>", so
//     the common case is two taps) and saves.
//   • `savedOrdersPanel(record)` — on the VENUE'S MENU PAGE, where recalling is
//     wanted: an empty tally has no order button to open a sheet from, and the
//     reader who wants "my Subway" is standing in Subway's menu. Lists this
//     venue's saved orders; each has an add-to-order button and a delete.
//
// Nothing here parses markup: names and notes are typed text and can arrive in
// a backup file, so everything is `textContent`.

import { el } from "./dom.js";
import { toast } from "./toast.js";
import { order } from "./cart.js";
import { savedOrders, linesToSave, MAX_NAME, MAX_SAVED } from "./saved-orders.js";
import { planRecall } from "./saved-recall.js";
import { selectionSummary } from "./addons.js";

const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

let seq = 0;

/** "2× Meatball sub with Mild chilli, 1× Cookie" — what the saved order holds,
 *  read the way the tally reads it. */
function describe(saved) {
  return saved.lines
    .map((l) => {
      const cfg = selectionSummary(l.options);
      return `${l.qty}× ${l.name}${cfg ? ` with ${cfg}` : ""}${l.note ? ` (${l.note})` : ""}`;
    })
    .join(", ");
}

/**
 * The save control for one venue's group in the order sheet. `group` is an
 * entry of `order.groups()`. Collapses back to its button after saving; the
 * confirmation is a toast (the sheet re-renders on every order change, so
 * nothing placed inside it would reliably stay).
 */
export function saveRow(group) {
  const row = el("div", { className: "order-save-row" });

  function showButton() {
    const btn = el("button", { type: "button", className: "order-save-btn", textContent: "Save this order" });
    btn.setAttribute("aria-label", `Save this ${group.venueName} order to use again`);
    btn.addEventListener("click", showEditor);
    row.replaceChildren(btn);
  }

  function showEditor() {
    const fieldId = `order-save-${++seq}`;
    const label = el("label", {
      className: "sr-only",
      htmlFor: fieldId,
      textContent: `Name for this ${group.venueName} order`,
    });
    const input = el("input", {
      type: "text",
      id: fieldId,
      className: "order-save-input",
      value: `My ${group.venueName}`.slice(0, MAX_NAME),
      maxLength: MAX_NAME,
      autocomplete: "off",
      enterKeyHint: "done",
    });
    const help = el("p", {
      className: "order-note-help",
      id: `${fieldId}-help`,
      textContent: `Saved on this phone for ${group.venueName}. Using a name you already saved updates that order.`,
    });
    input.setAttribute("aria-describedby", help.id);
    const save = el("button", { type: "button", className: "order-note-save", textContent: "Save" });
    save.setAttribute("aria-label", `Save this ${group.venueName} order`);
    const cancel = el("button", { type: "button", className: "order-note-btn", textContent: "Cancel" });

    function commit() {
      const res = savedOrders.save({
        venueId: group.venueId,
        venueName: group.venueName,
        name: input.value,
        lines: linesToSave(group.items),
      });
      if (res.ok) {
        toast(`${res.updated ? "Updated" : "Saved"} “${res.saved.name}” — find it on the ${group.venueName} menu.`, 4000);
        showButton();
      } else if (res.reason === "full") {
        toast(`You have ${MAX_SAVED} saved orders already — delete one first.`, 4000);
      } else {
        // Nothing usable typed: stay put with the field, say so, keep the focus.
        help.textContent = "Give it a name to save it.";
        input.focus();
      }
    }
    save.addEventListener("click", commit);
    cancel.addEventListener("click", showButton);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // no form here; Enter means "done"
        commit();
      } else if (e.key === "Escape") {
        // The sheet is a <dialog>: Escape would otherwise close the whole sheet.
        e.preventDefault();
        e.stopPropagation();
        showButton();
      }
    });

    row.replaceChildren(label, input, save, cancel, help);
    input.focus();
    input.select();
  }

  showButton();
  return row;
}

/**
 * This venue's saved orders, on its menu page. Returns the section node (always
 * — it hides itself when there are none, so a save made from the order sheet
 * while this page is open appears without a reload). `record` is the loaded
 * venue, which is what recall resolves against: no fetch, so it works offline.
 */
export function savedOrdersPanel(record) {
  const list = el("ul", { className: "saved-list" });
  // One status line for the whole panel; `role="status"` so a screen reader is
  // told what a recall did without focus moving off the button it just pressed.
  const status = el("div", { className: "saved-status", role: "status", "aria-live": "polite" });
  const section = el(
    "section",
    { className: "saved-orders", "aria-labelledby": "saved-orders-head", hidden: true },
    [
      el("h2", { id: "saved-orders-head", className: "saved-head", textContent: "Your saved orders" }),
      list,
      status,
    ]
  );

  function recall(saved) {
    const { lines, skipped } = planRecall(saved, record);
    if (lines.length) order.merge(lines);
    const added = lines.reduce((n, l) => n + l.qty, 0);
    const bits = [];
    bits.push(
      lines.length
        ? `Added ${plural(added, "item")} from “${saved.name}” to your order.`
        : `Nothing from “${saved.name}” could be added.`
    );
    status.replaceChildren(el("p", { className: "saved-status-line", textContent: bits.join(" ") }));
    if (skipped.length) {
      status.append(
        el("p", { className: "saved-status-line saved-skipped-head", textContent: "Left out because this menu has changed:" }),
        el(
          "ul",
          { className: "saved-skipped" },
          skipped.map((s) => el("li", { textContent: `${s.qty}× ${s.name} — ${s.reason}` }))
        )
      );
    }
  }

  function row(saved) {
    const del = el("button", { type: "button", className: "saved-delete", textContent: "Delete" });
    del.setAttribute("aria-label", `Delete saved order “${saved.name}”`);
    let armed = null;
    const disarm = () => {
      clearTimeout(armed);
      armed = null;
      del.textContent = "Delete";
      del.classList.remove("confirming");
    };
    del.addEventListener("click", () => {
      if (!armed) {
        // Same two-step as the sheet's Clear: a usual is a thing you built once.
        del.textContent = "Delete — sure?";
        del.classList.add("confirming");
        armed = setTimeout(disarm, 5000);
        return;
      }
      disarm();
      savedOrders.remove(saved.id);
      status.textContent = `Deleted “${saved.name}”.`;
      // The row that held focus is gone; <body> would put a keyboard reader back
      // at the top of the document. Land on the next saved order's button, or,
      // with none left, leave focus where the page's own flow puts it.
      list.querySelector(".saved-add")?.focus();
    });
    del.addEventListener("blur", disarm);

    const add = el("button", { type: "button", className: "saved-add", textContent: "Add to my order" });
    add.setAttribute("aria-label", `Add “${saved.name}” to your order`);
    add.addEventListener("click", () => recall(saved));

    return el("li", { className: "saved-item" }, [
      el("div", { className: "saved-text" }, [
        el("span", { className: "saved-name", textContent: saved.name }),
        el("span", { className: "saved-lines", textContent: describe(saved) }),
      ]),
      el("div", { className: "saved-actions" }, [add, del]),
    ]);
  }

  function paint() {
    const mine = savedOrders.forVenue(record.id);
    section.hidden = mine.length === 0;
    list.replaceChildren(...mine.map(row));
    if (mine.length === 0) status.replaceChildren();
  }

  // The page rebuilds its whole menu on a settings change, which builds a new
  // panel: drop this one's subscription once it has left the document so they
  // do not pile up behind it.
  const unsub = savedOrders.subscribe(() => {
    if (!section.isConnected) {
      unsub();
      return;
    }
    paint();
  });
  paint();
  return section;
}
