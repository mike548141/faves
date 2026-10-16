// Finish an unfinished dish on the order sheet (roadmap 200/130, ADR 0158).
//
// Owner, 2026-10-03: *"If a dish has a mandatory addon and the user has not made
// a selection then the dish should show in the order screen with a warning and
// the ability to complete in the necessary addon selections in the order screen
// to clear the warning."* This is the control. The verdict that a line is
// unfinished is order-finish.js's; the question being asked is the picker's own
// (the radios, their classes, "Required — choose one"), and the SENTENCE about
// what the choice does to the dish's allergens is addon-warning.js's — the
// function the picker calls on every tick. A dish finished here is therefore
// warned about exactly as the same dish configured on the menu, from the same
// code, BEFORE the reader commits.
//
// Nothing is pre-selected and there is no None, for ADR 0156's reason: a default
// would be a choice the reader never made on a dish whose allergens depend on it.
// "Finish" waits, aria-disabled and not `disabled` (the pattern of the menu's
// blocked Add), so it stays in the tab order and a tap tells the reader what is
// missing instead of doing nothing.
//
// The order sheet rebuilds its whole body on every store change, so what the
// reader has half-answered lives in `drafts`, keyed on the line, not in this
// closure — a cross-tab write must not wipe a choice in progress.

import { el } from "./dom.js";
import { order, lineKey } from "./cart.js";
import { dishId } from "./dish-id.js";
import { selectionKey, optionId, optionPrice } from "./addons.js";
import { finishChoice, answeredBy, selectionWithTags } from "./order-finish.js";
import { configurationWarning } from "./addon-warning.js";
import { settings } from "./settings.js";
import { effectiveAvoid } from "./dietary.js";
import { formatMoney, venueCurrency } from "./place.js";

/** lineKey → { open, picks: { [groupId]: optionId } } */
const drafts = new Map();
let seq = 0;

const joinNames = (names) =>
  names.length < 2 ? names[0] || "" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * The control for one unfinished line. `info` is `unfinishedOf(record, item)`,
 * `hooks` = { beforeFinish(newKey) } — the sheet uses it to put focus on the
 * finished line after its rebuild (the store write rebuilds the whole body).
 */
export function finishControl(item, info, record, hooks = {}) {
  const key = lineKey(item);
  const root = el("div", { className: "order-finish" });
  const names = info.groups.map((g) => g.name);
  const currency = venueCurrency(record);

  function showClosed() {
    const btn = el("button", {
      type: "button",
      className: "order-finish-open",
      textContent: `Choose ${joinNames(names)}`,
    });
    btn.setAttribute("aria-label", `Choose ${joinNames(names)} for ${item.name}`);
    btn.dataset.line = key;
    btn.addEventListener("click", () => {
      drafts.set(key, { open: true, picks: {} });
      showOpen(true);
    });
    root.replaceChildren(btn);
  }

  function showOpen(focusFirst) {
    const draft = drafts.get(key) || { open: true, picks: {} };
    drafts.set(key, draft);
    const sheetId = `finish-${++seq}`;
    const firstInput = new Map();
    const warn = el("p", { className: "addon-warning", hidden: true });
    warn.setAttribute("role", "status"); // announced when it changes, as on the menu
    const need = el("p", { className: "addon-need", id: `${sheetId}-need`, hidden: true });
    const done = el("button", { type: "button", className: "order-note-save order-finish-done", textContent: "Finish this dish" });
    done.setAttribute("aria-describedby", need.id);
    const cancel = el("button", { type: "button", className: "order-note-btn order-finish-cancel", textContent: "Not now" });

    const fieldsets = info.groups.map((g) => {
      const fields = el("div", { className: "addon-options" });
      for (const option of g.options || []) {
        const cost = optionPrice(g, option);
        const input = el("input", {
          type: "radio",
          className: "addon-input",
          // Unique per render, not per dish: two lines of one dish (one with a
          // note) would otherwise share a radio group and clear each other.
          name: `${sheetId}-${g.id}`,
          value: option.name,
          checked: draft.picks[g.id] === optionId(option),
        });
        if (!firstInput.has(g.id)) firstInput.set(g.id, input);
        input.addEventListener("change", () => {
          if (!input.checked) return;
          draft.picks[g.id] = optionId(option);
          paint();
        });
        fields.append(
          el("label", { className: "addon-option" }, [
            input,
            el("span", { className: "addon-option-name", textContent: option.name }),
            el("span", {
              className: "addon-option-price",
              textContent: cost > 0 ? ` +${formatMoney(cost, currency)}` : "",
            }),
          ]),
        );
      }
      return el("fieldset", { className: "addon-group" }, [
        el("legend", { className: "addon-legend" }, [
          el("span", { className: "addon-group-name", textContent: g.name }),
          el("span", { className: "addon-rule", textContent: "Required — choose one" }),
        ]),
        fields,
      ]);
    });

    const result = () => finishChoice(record, item, draft.picks);

    function paint() {
      const { added, missing: stillMissing } = answeredBy(info, draft.picks);
      // What the dish becomes if finished NOW, said by the picker's own function.
      // Only once something is chosen: before that there is nothing to compose.
      if (added.length > 0) {
        const s = settings.get();
        const avoid = effectiveAvoid(s?.diet?.avoid, s?.foodPrefs);
        const w = configurationWarning(info.item.tags, [...selectionWithTags(record, item), ...added], avoid);
        warn.hidden = w.lines.length === 0;
        warn.classList.toggle("is-flagged", w.flagged);
        warn.textContent = w.lines.join(" ");
      } else {
        warn.hidden = true;
        warn.textContent = "";
      }
      done.setAttribute("aria-disabled", String(stillMissing.length > 0));
      done.classList.toggle("is-blocked", stillMissing.length > 0);
      need.hidden = stillMissing.length === 0;
      need.textContent = stillMissing.length
        ? `To finish this, choose one under ${joinNames(stillMissing.map((g) => `“${g.name}”`))}.`
        : "";
    }

    done.addEventListener("click", () => {
      const res = result();
      if (!res.ok) {
        // Blocked: take the reader to the question, like the menu's Add does.
        firstInput.get(res.missing[0]?.id)?.focus();
        return;
      }
      const newKey = lineKey({ ...item, options: res.options, price: res.price });
      hooks.beforeFinish?.(newKey);
      drafts.delete(key);
      order.finish(item.venueId, dishId(item), selectionKey(item.options), item.note, {
        options: res.options,
        price: res.price,
      });
    });
    cancel.addEventListener("click", () => {
      drafts.delete(key);
      showClosed();
      // Closing swaps this control's contents without touching the store, so the
      // sheet is NOT rebuilt: focus would be left on the button that just left
      // the document. Hand it back to the opener.
      root.querySelector(".order-finish-open")?.focus();
    });
    // Escape closes the control, not the whole sheet (the dialog's own Escape
    // would otherwise discard the sheet mid-choice) — the saved-order editor's
    // behaviour.
    root.onkeydown = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      cancel.click();
    };

    const hint =
      item.qty > 1
        ? el("p", {
            className: "order-note-help",
            textContent: `This choice applies to all ${item.qty}. For different choices, lower the count first, then add the others from the menu.`,
          })
        : null;

    const group = el("div", { className: "order-finish-form", role: "group" }, [
      ...fieldsets,
      warn,
      need,
      el("div", { className: "order-finish-actions" }, [cancel, done]),
      hint,
    ]);
    group.setAttribute("aria-label", `Finish ${item.name}`);
    root.replaceChildren(group);
    paint();
    if (focusFirst) firstInput.get(info.groups[0]?.id)?.focus();
  }

  if (drafts.get(key)?.open) showOpen(false);
  else showClosed();
  return root;
}

/** Forget half-made choices for lines that no longer exist (a rebuilt sheet calls this). */
export function pruneDrafts(liveKeys) {
  for (const k of [...drafts.keys()]) if (!liveKeys.has(k)) drafts.delete(k);
}
