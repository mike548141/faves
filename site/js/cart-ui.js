// Order tally UI: a floating "order" button (shown once there's something
// in it) and a dialog that lists the running order grouped by venue, with
// subtotals, a captioned estimated total, collect mode (tick off at
// pickup), and clear. Injected into whatever page calls initOrderUI(), so
// it rides along on the home, menu and recipe screens without duplicating
// markup. The model lives in cart.js; this is purely presentation + wiring.

import { order, groupByVenue, orderTotals, normaliseNote, lineKey } from "./cart.js";
import { encodeShare, decodeShare, buildShareUrl, readShareToken } from "./share-codec.js";
import { favourites, groupForShare } from "./favourites.js";
import { openShareDialog } from "./share-ui.js";
import { el } from "./dom.js";
import { selectionKey, selectionSummary } from "./addons.js";
import { dishId } from "./dish-id.js";
import { displayPrice, formatMoney } from "./place.js";
import { saveRow } from "./saved-orders-ui.js";
import { loadRestaurant } from "./data.js";
import { unfinishedOf, summariseUnfinished } from "./order-finish.js";
import { finishControl, pruneDrafts } from "./order-finish-ui.js";
import { joinRules, minQtyOf, minWords, shortBy, UNITS } from "./dish-rules.js";

// A line, subtotal or total always carries the currency it is in — an order
// can span venues in different countries, and an unlabelled number then lies.
// Converted into the reader's currency where we can (ADR 0045), which is also
// what collapses a two-country order back into a single addable total.
const money = (n, currency) => {
  const shown = displayPrice(n, { currency });
  return formatMoney(shown.amount, shown.currency);
};
const tel = (p) => "tel:" + p.replace(/\s+/g, "");
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// The note cap, in characters. Must equal MAX_NOTE in share-codec.js: a note
// typed past the wire's ceiling would arrive on a friend's phone truncated with
// nothing having said so. Stated to the reader in the help text below, not
// discovered by the field silently refusing the next keystroke.
const MAX_NOTE_LEN = 80;

// One counter for the whole page, so every note input has an id its <label> can
// point at. The order sheet rebuilds its body wholesale on each change, so ids
// must not be derived from position — a stale duplicate id is how a label ends
// up naming the wrong dish's field.
let noteFieldSeq = 0;

// After a note is saved the store re-renders the whole sheet, which throws
// keyboard focus back to the body. This carries the line's NEW key across that
// rebuild so focus can land back on the control the person was just using —
// including when the save merged their line into an existing one.
let focusNoteKey = null;

// Each venue's LIVE record, by id (or null once a load failed). An order line
// stores the options chosen, never the group definitions, so whether a line still
// owes a compulsory choice (ADR 0156) can only be answered against the menu as it
// is now (ADR 0158). A menu page hands over the record it already loaded; any
// other page fetches the few venues in the order when the sheet opens — a request
// the service worker answers from its store, so it works offline for a venue the
// phone has.
const venueRecords = new Map();
const loading = new Set();

/** A menu page offers the record it has already loaded, so the sheet need not fetch it. */
export function noteVenueRecord(record) {
  if (record?.id) venueRecords.set(record.id, record);
}

/**
 * The −/count pair WITHOUT the ＋, for an unfinished line: it may be lowered or
 * removed but not grown (ADR 0156 §4 — an incomplete line cannot grow). Growing
 * it would add one more of a dish the kitchen cannot make; the reader finishes it
 * (or lowers it and adds the others from the menu, where the choice is asked).
 */
function reduceStepper(item) {
  const wrap = el("div", { className: "stepper" });
  const said = `${item.name}${normaliseNote(item.note) ? `, noted “${normaliseNote(item.note)}”` : ""}`;
  const dec = el("button", { type: "button", className: "stepper-btn", textContent: "−" });
  dec.setAttribute("aria-label", `One fewer ${said}`);
  dec.addEventListener("click", () =>
    order.setQty(item.venueId, dishId(item), item.qty - 1, selectionKey(item.options), item.note),
  );
  wrap.append(dec, el("span", { className: "stepper-count", textContent: String(item.qty) }));
  return wrap;
}

/**
 * The + / − / count control for one dish. Bound to the shared order store
 * and self-updating, so the menu row and the dialog line always agree.
 * `meta` = { venueId, venueName, phone, name, dishId?, price }.
 *
 * `gate` = { reason, onBlocked } when the dish cannot be added yet because a
 * required add-on choice is unanswered (ADR 0156): the ＋ Add is then drawn
 * aria-disabled, says why, and a tap calls `onBlocked` instead of ordering.
 *
 * `meta.minQty` is the dish's minimum order (roadmap 200/170, ADR 0163). Add
 * puts that many on the sheet, ＋ on a line short of it jumps to it, and − at the
 * minimum takes the line OFF (✕, worded "Remove … minimum N") rather than step
 * below what the venue will take. Without a minimum nothing here changes.
 *
 * `onAdded` is called after the ＋ Add press that takes this configuration from
 * none to one, and ONLY then — not on ＋ / − and not when a gated Add is
 * blocked. The menu row uses it to open a must-see picker (ADR 0159); a
 * repeat-tapper on ＋ is never interrupted by it.
 */
export function dishStepper(meta, gate = null, onAdded = null) {
  const wrap = el("div", { className: "stepper" });
  // The configuration this stepper counts (ADR 0048 §4). "Eggs on toast with
  // bacon" is a different line from "eggs on toast", so the stepper has to ask
  // about its own selection or it would show — and change — the wrong count.
  const sel = () => selectionKey(meta.options);
  // …and its own dish, by id: three rows can print "Cheeseburger" at three
  // prices, and asking by name gave all three steppers the first row's count
  // (ADR 0051).
  const id = () => dishId(meta);
  // …and its own note (Theme 14c). On a menu row `meta.note` is always absent,
  // so this is "" and nothing changes; on an ORDER SHEET row `meta` IS the line,
  // and without this the − on "eggs on toast, no tomato" would find and decrement
  // the plain "eggs on toast" line sitting above it.
  const note = () => normaliseNote(meta.note);
  // Spoken labels name the configuration too: two "Add" buttons a thumb apart
  // that differ only in their sauces are indistinguishable to a screen reader.
  // Same for the note — and here the two lines are literally adjacent.
  const said = () => {
    const s = selectionSummary(meta.options);
    const base = s ? `${meta.name} with ${s}` : meta.name;
    const n = note();
    return n ? `${base}, noted “${n}”` : base;
  };
  function render() {
    const q = order.qtyOf(meta.venueId, id(), sel(), note());
    wrap.dataset.qty = q;
    // The control the person is pressing is replaced by the next state's one
    // (＋ Add becomes − 1 ＋), and a removed element hands focus to <body>: a
    // keyboard or switch user would be thrown to the top of the page by every
    // tap, and a picker opening elsewhere on the row (ADR 0159) would then look
    // like the thing that moved them. So focus follows the tap onto the control
    // that now stands where their finger was: the same − or ＋, or the ＋ Add
    // when the count has gone back to none.
    const held = document.activeElement;
    const heldMinus = wrap.contains(held) && held.classList.contains("stepper-btn") && held.dataset.role === "dec";
    const keepFocus = wrap.contains(held);
    if (gate) {
      // The dish is not yet a dish a kitchen can make (ADR 0156): a required
      // choice is unanswered. aria-disabled, never `disabled` — the button stays
      // in the tab order and is announced as dimmed, so a keyboard or screen
      // reader user finds it and is TOLD why; a tap on it carries them to the
      // unanswered group rather than doing nothing. It also stands in for the
      // −/＋ pair even when a line for this exact (incomplete) configuration
      // exists from before the flag, so an incomplete line cannot grow.
      const add = el("button", {
        type: "button",
        className: "stepper-add is-blocked",
        textContent: "＋ Add",
      });
      add.setAttribute("aria-disabled", "true");
      add.setAttribute("aria-label", `Add ${said()} to your order — ${gate.reason}`);
      add.addEventListener("click", () => gate.onBlocked?.());
      wrap.replaceChildren(add);
      if (keepFocus) add.focus({ preventScroll: true });
      return;
    }
    if (q === 0) {
      const add = el("button", {
        type: "button",
        className: "stepper-add",
        textContent: "＋ Add",
      });
      add.setAttribute("aria-label", `Add ${said()} to your order`);
      add.addEventListener("click", () => {
        order.add(meta);
        onAdded?.();
      });
      wrap.replaceChildren(add);
      if (keepFocus) add.focus({ preventScroll: true });
    } else {
      // At the dish's minimum, − would go below what the venue takes, so it takes
      // the line off instead and says so (✕ and words), never a silent jump from
      // 3 to 0 under a "−" that reads as "one fewer".
      const min = minQtyOf(meta);
      const atFloor = min > 1 && q <= min;
      const dec = el("button", { type: "button", className: "stepper-btn", textContent: atFloor ? "✕" : "−" });
      dec.dataset.role = "dec";
      dec.setAttribute(
        "aria-label",
        atFloor ? `Remove ${said()} from your order — the minimum is ${min}` : `One fewer ${said()}`,
      );
      dec.addEventListener("click", () => order.setQty(meta.venueId, id(), atFloor ? 0 : q - 1, sel(), note()));
      const count = el("span", { className: "stepper-count", textContent: String(q) });
      const inc = el("button", { type: "button", className: "stepper-btn", textContent: "＋" });
      inc.dataset.role = "inc";
      inc.setAttribute("aria-label", q < min ? `Raise ${said()} to the minimum of ${min}` : `One more ${said()}`);
      // A line already short of the minimum (it arrived in a link, or predates the
      // rule) is raised TO it in one press, not nudged one at a time through
      // numbers the venue will not take.
      inc.addEventListener("click", () =>
        q < min ? order.setQty(meta.venueId, id(), min, sel(), note()) : order.add(meta),
      );
      wrap.replaceChildren(dec, count, inc);
      if (keepFocus) (heldMinus ? dec : inc).focus({ preventScroll: true });
    }
  }
  render();
  order.subscribe(render);
  return wrap;
}

/**
 * "Add a note" / "Edit note" for one order line, and the little field it opens.
 *
 * The note is part of the line's IDENTITY (cart.js `lineKey`), so saving one is
 * a MOVE, not a field edit — `order.setNote` is told both the old note and the
 * new one, and may merge this line into an existing one. Everything that
 * follows a save is therefore a full re-render, which is why nothing here
 * caches a node across it.
 */
function noteRow(item) {
  const row = el("div", { className: "order-note-row" });
  const current = () => normaliseNote(item.note);

  function showControl() {
    const has = !!current();
    const btn = el("button", {
      type: "button",
      className: "order-note-btn",
      textContent: has ? "Edit note" : "Add a note",
    });
    // A screen reader hears a column of identical "Add a note" buttons
    // otherwise, with nothing saying which dish each belongs to.
    btn.setAttribute("aria-label", `${has ? "Edit" : "Add a"} note for ${item.name}`);
    btn.dataset.line = lineKey(item);
    btn.addEventListener("click", showEditor);
    row.replaceChildren(btn);
  }

  function showEditor() {
    const fieldId = `order-note-${++noteFieldSeq}`;
    const label = el("label", {
      className: "sr-only",
      htmlFor: fieldId,
      textContent: `Note for ${item.name}`,
    });
    const input = el("input", {
      type: "text",
      id: fieldId,
      className: "order-note-input",
      value: current(),
      maxLength: MAX_NOTE_LEN,
      // What it is FOR, in the words you'd use at the counter. Deliberately not
      // an allergy prompt: the app has a real, structured allergen system that
      // reasons about tags, and a free-text note is checked by nothing at all.
      placeholder: "No tomato",
      autocomplete: "off",
      enterKeyHint: "done",
    });
    const help = el("p", {
      className: "order-note-help",
      id: `${fieldId}-help`,
      textContent: `What you'd say at the counter — “No tomato”, “Sauce on the side”. Up to ${MAX_NOTE_LEN} characters.`,
    });
    input.setAttribute("aria-describedby", help.id);
    const save = el("button", { type: "button", className: "order-note-save", textContent: "Save" });
    save.setAttribute("aria-label", `Save note for ${item.name}`);

    let saved = false;
    function commitNote() {
      if (saved) return;
      const next = normaliseNote(input.value);
      if (next === current()) {
        showControl(); // nothing changed — no store write, no re-render
        return;
      }
      saved = true;
      // The key the line will have AFTER the move, so focus lands on the right
      // row even when this note merged two lines into one.
      focusNoteKey = lineKey({ ...item, note: next });
      // Clearing the field removes the note; setNote() then merges this line
      // into the plain one if the plain one already exists.
      order.setNote(item.venueId, dishId(item), selectionKey(item.options), current(), next);
    }
    save.addEventListener("click", commitNote);
    // `change` fires on blur when the value moved, so tapping away from the
    // field saves rather than silently discarding what was typed. Clicking Save
    // blurs first, so that path lands here too — hence the `saved` latch.
    input.addEventListener("change", commitNote);
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault(); // there is no form here; Enter means "done"
      commitNote();
    });

    row.replaceChildren(label, input, save, help);
    input.focus();
    input.select();
  }

  showControl();
  return row;
}

function lineRow(item, collectMode, info, record) {
  // An unfinished line's stored price is the dish WITHOUT its compulsory choice.
  // Where the choice can cost something the number is a floor, and says so with
  // the same "+" the subtotal uses for an unpriced line — plus words for a screen
  // reader, since a bare "+" is not a sentence (roadmap 200/130).
  const floor = !!info && info.extra.max > 0;
  const price = el("span", {
    className: "order-line-price",
    // The line's OWN currency, not the page's. The subtotal below already reads
    // it (`g.currency`), so a line that formatted without one printed "$8.95"
    // above a "£17.90" subtotal — the one place in the sheet where the two
    // could disagree.
    textContent:
      item.price == null ? "—" : money(item.price * item.qty, item.currency) + (floor ? "+" : ""),
  });
  if (floor) price.append(el("span", { className: "sr-only", textContent: " before the choice still to make" }));
  const owed = info ? joinOwed(info) : "";

  // What was asked for, read out the way you would say it at the counter —
  // "2× Iskender with Mild chilli, Garlic yogurt". Collect mode is someone
  // standing at the till reading the list aloud, so the configuration has to be
  // IN the spoken line, not a caption beside it.
  const config = selectionSummary(item.options);
  const spoken = config ? `${item.name} with ${config}` : item.name;
  const note = normaliseNote(item.note);
  const rules = item.rules || null;

  if (collectMode) {
    const box = el("input", { type: "checkbox", className: "order-check", checked: item.collected });
    box.addEventListener("change", () =>
      // The note is part of the identity, so it has to be in the lookup: without
      // it, ticking "eggs on toast, no tomato" ticks the plain one above it.
      order.toggleCollected(item.venueId, dishId(item), selectionKey(item.options), note),
    );
    const label = el("label", { className: "order-collect-line" }, [
      box,
      // The note joins the spoken line for the same reason the configuration
      // does — collect mode IS the moment the note has to be read out, so it
      // cannot be a caption the reader has to notice separately.
      el("span", {
        className: "order-line-name",
        // …and so does an unmade choice: collect mode is read aloud, and "Stir
        // fry, no sauce" is what the kitchen would hear if this stayed silent.
        textContent: `${item.qty}× ${spoken}${note ? ` — ${note}` : ""}${owed ? ` — choice not made: ${owed}` : ""}`,
      }),
    ]);
    const li = el("li", { className: "order-line" }, [label, price]);
    if (item.collected) li.classList.add("collected");
    return li;
  }

  const li = el("li", { className: info ? "order-line has-note-row is-unfinished" : "order-line has-note-row" }, [
    info ? reduceStepper(item) : dishStepper(item),
    el("span", { className: "order-line-name" }, [
      item.name,
      config ? el("span", { className: "order-line-config", textContent: config }) : null,
      // What the price is for, and any minimum (roadmap 200/170, ADR 0163). The
      // unit price is written out here because the right-hand figure is the LINE
      // total ("3 × $7 = $21") or, for a dish sold by weight, a dash: "$26 per
      // 100 g" times a count is not a price, so that line is left out of the total
      // and says so in words.
      ...ruleLines(item, rules),
      // The warning is WORDS first: the icon is decoration and the border a
      // second cue, never the only one (WCAG 1.4.1).
      info
        ? el("span", { className: "order-line-unfinished" }, [
            el("span", { "aria-hidden": "true", textContent: "⚠️ " }),
            el("span", { textContent: `Needs a choice: ${owed}` }),
          ])
        : null,
      // Under the dish name, where the configuration already sits. `textContent`
      // (via el) and never innerHTML: this string can arrive off a shared link
      // that anyone could craft.
      note
        ? el("span", { className: "order-line-note" }, [
            el("span", { className: "order-line-note-mark", "aria-hidden": "true", textContent: "✎ " }),
            el("span", { className: "sr-only", textContent: "Note: " }),
            el("span", { textContent: note }),
          ])
        : null,
    ]),
    price,
    info
      ? finishControl(item, info, record, {
          // The finish rebuilds the sheet; focus then lands on the finished
          // line's note button (merged or not), via the note control's own
          // carrier, rather than on <body>.
          beforeFinish: (newKey) => {
            focusNoteKey = newKey;
          },
        })
      : null,
    noteRow(item),
  ]);
  return li;
}

/**
 * The unit-price and minimum-order lines under a dish's name on the sheet. Words
 * first, as the unfinished warning is: ⚠️ is decoration and the dashed outline is
 * not used here, so the sentence carries it (WCAG 1.4.1).
 */
function ruleLines(item, rules) {
  if (!rules) return [];
  const out = [];
  if (rules.unit && typeof item.unitPrice === "number") {
    out.push(
      el("span", {
        className: "order-line-unit",
        textContent:
          `${money(item.unitPrice, item.currency)} ${UNITS[rules.unit].say}` +
          (rules.weighed ? " — priced by weight, so not in the total" : ""),
      }),
    );
  } else if (rules.weighed) {
    out.push(el("span", { className: "order-line-unit", textContent: "Priced by weight — not in the total" }));
  }
  if (rules.minQty > 1) {
    const short = shortBy(item.qty, rules);
    const words = minWords(rules);
    out.push(
      short
        ? el("span", { className: "order-line-min is-short" }, [
            el("span", { "aria-hidden": "true", textContent: "⚠️ " }),
            el("span", { textContent: `${words} — ${short} short. Press ＋ to raise it.` }),
          ])
        : el("span", { className: "order-line-min", textContent: words }),
    );
  }
  return out;
}

/** An order line joined to its venue's live rules (dish-rules.js `joinRules`). */
const withRules = (line) => joinRules(venueRecords.get(line.venueId), line);

/** "Sauce" or "Sauce and Size" — the groups a line still owes, in words. */
function joinOwed(info) {
  const names = info.groups.map((g) => g.name);
  return names.length < 2 ? names[0] || "" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function initOrderUI() {
  // Guard: only one instance per page even if two modules call this.
  if (document.querySelector(".order-fab")) return;

  const count = el("span", { className: "order-fab-count" });
  const fab = el("button", { type: "button", className: "order-fab", hidden: true }, [
    el("span", { "aria-hidden": "true", textContent: "🧾" }),
    el("span", { className: "order-fab-label", textContent: "Order" }),
    count,
  ]);

  const body = el("div", { className: "order-body" });
  const totalEl = el("span", { className: "order-total" });
  const collectBtn = el("button", { type: "button", className: "order-collect-toggle" }, [
    "Collect mode",
  ]);
  collectBtn.setAttribute("aria-pressed", "false");
  const clearBtn = el("button", { type: "button", className: "order-clear", textContent: "Clear" });
  // What the sheet is missing, in words, directly under the total it qualifies
  // (roadmap 200/130). Hidden while every line is complete.
  const unfinishedEl = el("p", { className: "order-unfinished-note", hidden: true });
  // What the dishes' own terms do to the total (roadmap 200/170): a dish sold by
  // weight is left out of it, and one below its minimum order is not an order the
  // venue will take. Said in words under the total, like the unfinished note.
  const rulesEl = el("p", { className: "order-rules-note", hidden: true });
  // Said when a venue's menu could not be loaded to check its lines. Honest about
  // not knowing, rather than silent: a line we could not check is not a line we
  // checked and found complete.
  const uncheckedEl = el("p", { className: "order-caption order-unchecked-note", hidden: true });
  const sendBtn = el("button", { type: "button", className: "order-send" }, [
    el("span", { "aria-hidden": "true", textContent: "📤 " }),
    "Send to the orderer",
  ]);

  const dialog = el("dialog", { className: "order-sheet", "aria-labelledby": "order-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "order-title", className: "order-title", textContent: "Your order" }),
        (() => {
          const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
          b.setAttribute("aria-label", "Close");
          b.addEventListener("click", () => dialog.close());
          return b;
        })(),
      ]),
      body,
      el("div", { className: "order-foot" }, [
        el("div", { className: "order-total-row" }, [
          el("span", { textContent: "Total" }),
          totalEl,
        ]),
        unfinishedEl,
        rulesEl,
        el("p", {
          className: "order-caption",
          textContent: "Estimated from our menu — confirm at the till.",
        }),
        uncheckedEl,
        sendBtn,
        el("div", { className: "order-actions" }, [collectBtn, clearBtn]),
      ]),
    ]),
  ]);

  // ----- Send: hand your finished picks to the orderer (Theme 1b, ADR 0009),
  // via the shared share dialog (share sheet / copy link / QR). It re-encodes
  // the current order each time an action fires, so a late name edit is caught.
  sendBtn.addEventListener("click", () => {
    openShareDialog({
      heading: "Send your picks",
      blurb: "Hand your order to whoever's phoning it in — AirDrop, Messages, a copied link, or a QR to scan. Nothing is sent to a server.",
      nameAriaLabel: "Your name, so they know whose picks these are",
      shareTitle: "My Faves order",
      shareText: "Here are my picks:",
      buildUrl: (name) => {
        const token = encodeShare({ type: "order", label: name, groups: order.groups() });
        // Land the host on the home screen; the receive handler runs on every page.
        return buildShareUrl(token, location.origin + "/");
      },
    });
  });

  document.body.append(fab, dialog);

  let collectMode = false;
  let confirmingClear = false;

  // Does this line still owe a compulsory choice? Null when complete, or when we
  // hold no record to judge it against (loading, failed, or the dish has left).
  const verdictOf = (line) => unfinishedOf(venueRecords.get(line.venueId), line);

  // Fetch the live record of every venue in the order that we do not hold, then
  // repaint if the sheet is open. One in flight per venue; a failure is recorded
  // as null so it is not retried on every repaint (the next opening clears it).
  function ensureRecords() {
    for (const id of new Set(order.items().map((i) => i.venueId))) {
      if (venueRecords.has(id) || loading.has(id)) continue;
      loading.add(id);
      loadRestaurant(id)
        .then((r) => venueRecords.set(id, r))
        .catch(() => venueRecords.set(id, null))
        .finally(() => {
          loading.delete(id);
          if (dialog.open) {
            renderBody();
            renderTotal();
          }
        });
    }
  }

  function renderBody() {
    const groups = groupByVenue(order.items().map(withRules));
    body.replaceChildren();

    if (groups.length === 0) {
      body.append(
        el("p", {
          className: "order-empty",
          textContent: "No items yet. Tap ＋ on a dish to start your order.",
        })
      );
      return;
    }

    for (const g of groups) {
      const head = el("div", { className: "order-group-head" }, [
        el("h3", { className: "order-group-name", textContent: g.venueName }),
        g.phone
          ? (() => {
              const a = el("a", { className: "order-call", href: tel(g.phone) }, [
                el("span", { "aria-hidden": "true", textContent: "📞" }),
                " Call",
              ]);
              a.setAttribute("aria-label", `Call ${g.venueName} to order`);
              return a;
            })()
          : null,
      ]);
      const rec = venueRecords.get(g.venueId);
      const verdicts = g.items.map((i) => ({ line: i, info: verdictOf(i) }));
      const lines = el(
        "ul",
        { className: "order-lines" },
        verdicts.map(({ line, info }) => lineRow(line, collectMode, info, rec)),
      );
      // A subtotal that leaves out a choice which can cost money is a floor,
      // exactly as one holding an unpriced line is.
      const short = summariseUnfinished(verdicts).shortBy;
      const subtotal = el("div", { className: "order-subtotal" }, [
        el("span", { textContent: plural(g.count, "item") }),
        el("span", {
          className: "order-subtotal-amount",
          textContent: money(g.subtotal, g.currency) + (g.hasUnpriced || short ? "+" : ""),
        }),
      ]);
      // Saving is offered where the lines are, not in collect mode (that is
      // someone at the till reading the list out) — and recalling is on the
      // venue's menu page, where an EMPTY tally still has somewhere to start.
      body.append(
        el("section", { className: "order-group" }, [head, lines, subtotal, collectMode ? null : saveRow(g)])
      );
    }

    pruneDrafts(new Set(order.items().map(lineKey)));

    // Saving a note rebuilds this whole body, so keyboard focus would otherwise
    // be dumped on <body> mid-task. Matched on the line key rather than a CSS
    // selector because the key is arbitrary user text and would need escaping.
    if (focusNoteKey) {
      const want = focusNoteKey;
      focusNoteKey = null;
      const btn = [...body.querySelectorAll(".order-note-btn")].find((b) => b.dataset.line === want);
      if (btn) btn.focus();
    }
  }

  function renderTotal() {
    const lines = order.items().map(withRules);
    const anyUnpriced = groupByVenue(lines).some((g) => g.hasUnpriced);
    // An order spanning two countries used to read "$42.50 + £18", because the
    // two were not addable. With rates they usually are: convert each currency's
    // subtotal into whatever the reader is seeing and, when they all land in the
    // same money, add them into ONE number — which is what someone splitting a
    // bill actually wants. Where a rate is missing the old joined form survives,
    // because a wrong single total would be worse than an awkward true one.
    const totals = orderTotals(lines);
    const shown = totals.map((x) => displayPrice(x.total, { currency: x.currency }));
    const currencies = new Set(shown.map((s) => s.currency));
    const text =
      shown.length === 0
        ? money(0)
        : currencies.size === 1
          ? formatMoney(
              shown.reduce((sum, s) => sum + s.amount, 0),
              shown[0].currency
            )
          : shown.map((s) => formatMoney(s.amount, s.currency)).join(" + ");
    // A dish still missing a compulsory choice is priced at its base, and the
    // choice can add to that. Say so — in the total's "+" and in words under it —
    // rather than total the order as if it were complete (roadmap 200/130).
    const mine = summariseUnfinished(order.items().map((line) => ({ line, info: verdictOf(line) })));
    totalEl.textContent = text + (anyUnpriced || mine.shortBy ? "+" : "");
    unfinishedEl.hidden = mine.count === 0;
    unfinishedEl.textContent =
      mine.count === 0
        ? ""
        : `${plural(mine.count, "dish", "dishes")} still ${mine.count === 1 ? "needs" : "need"} a choice` +
          (mine.shortBy
          ? ", so this total is short by what the choice costs."
          : `. Finish ${mine.count === 1 ? "it" : "them"} above.`);
    const weighed = lines.filter((l) => l.rules?.weighed).length;
    const below = lines.filter((l) => l.rules && shortBy(l.qty, l.rules)).length;
    const said = [];
    if (weighed) {
      said.push(
        `${plural(weighed, "dish", "dishes")} priced by weight ${weighed === 1 ? "isn't" : "aren't"} in this total — ask the venue what ${weighed === 1 ? "it comes" : "they come"} to.`,
      );
    }
    if (below) {
      said.push(
        `${plural(below, "dish", "dishes")} ${below === 1 ? "is" : "are"} below the minimum order. Raise ${below === 1 ? "it" : "them"} above.`,
      );
    }
    rulesEl.hidden = said.length === 0;
    rulesEl.textContent = said.join(" ");
    const unchecked = [...new Set(order.items().map((i) => i.venueId))].filter((id) => venueRecords.get(id) === null);
    uncheckedEl.hidden = unchecked.length === 0;
    uncheckedEl.textContent = unchecked.length
      ? "Couldn't load every menu to check for dishes needing a choice, a minimum order or a price by weight."
      : "";
  }

  function renderFab() {
    const n = order.count();
    fab.hidden = n === 0;
    count.textContent = String(n);
    fab.setAttribute("aria-label", `Your order — ${plural(n, "item")}`);
  }

  function resetClear() {
    confirmingClear = false;
    clearBtn.textContent = "Clear";
    clearBtn.classList.remove("confirming");
  }

  function refresh() {
    renderFab();
    sendBtn.hidden = order.count() === 0; // nothing to send from an empty order
    if (dialog.open) {
      ensureRecords(); // a line merged in from a share may name a venue we have not loaded
      renderBody();
      renderTotal();
    }
  }

  fab.addEventListener("click", () => {
    collectMode = false;
    collectBtn.setAttribute("aria-pressed", "false");
    resetClear();
    // A failed load is retried each time the sheet is opened, not on every repaint.
    for (const [id, r] of venueRecords) if (r === null) venueRecords.delete(id);
    ensureRecords();
    renderBody();
    renderTotal();
    dialog.showModal();
  });

  collectBtn.addEventListener("click", () => {
    collectMode = !collectMode;
    collectBtn.setAttribute("aria-pressed", String(collectMode));
    renderBody();
  });

  clearBtn.addEventListener("click", () => {
    if (!confirmingClear) {
      confirmingClear = true;
      clearBtn.textContent = "Clear — sure?";
      clearBtn.classList.add("confirming");
      return;
    }
    order.clear();
    resetClear();
  });

  dialog.addEventListener("close", resetClear);
  dialog.addEventListener("click", (e) => {
    // Backdrop click (target is the dialog itself, not its content) closes.
    if (e.target === dialog) dialog.close();
  });

  order.subscribe(refresh);
  // Keep in step if the order changes in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.order.v1") order.reload();
  });

  // ----- Receive: someone shared their picks with us (Theme 1b) -----------
  // Confirm before merging (never a silent add), and fail soft on a dud link.
  function showReceive(decoded) {
    const recvBody = el("div", { className: "order-body share-body" });
    const actions = el("div", { className: "order-actions" });
    const recvDialog = el("dialog", { className: "recv-sheet", "aria-labelledby": "recv-title" }, [
      el("div", { className: "order-inner" }, [
        el("div", { className: "order-head" }, [
          el("h2", { id: "recv-title", className: "order-title" }),
          (() => {
            const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
            b.setAttribute("aria-label", "Close");
            b.addEventListener("click", () => recvDialog.close());
            return b;
          })(),
        ]),
        recvBody,
        el("div", { className: "order-foot" }, [actions]),
      ]),
    ]);
    const title = recvDialog.querySelector("#recv-title");

    const closeBtn = (label = "OK") => {
      const b = el("button", { type: "button", className: "order-send", textContent: label });
      b.addEventListener("click", () => recvDialog.close());
      return b;
    };

    if (!decoded) {
      title.textContent = "That link didn't work";
      recvBody.append(
        el("p", {
          className: "order-caption",
          textContent: "This shared link didn't come through — ask them to send it again.",
        })
      );
      actions.append(closeBtn());
    } else if (decoded.type === "shortlist") {
      // Someone shared their favourites; confirm, then merge into ours.
      const whose = decoded.label ? `${decoded.label}'s` : "these";
      title.textContent = `Add ${whose} ${plural(decoded.items.length, "favourite")}?`;
      const list = el("ul", { className: "recv-list" });
      for (const g of groupForShare(decoded.items)) {
        // A group's dishes may arrive as bare name strings (an OLD-shaped
        // producer, or a link decoded before dish ids existed) or as
        // `{ name, dishId? }` objects (favourites.js's groupForShare today) —
        // read the name whichever shape a given element is.
        const bits = g.dishes.map((d) => (typeof d === "string" ? d : d.name));
        if (g.venueFav) bits.unshift("the place");
        list.append(
          el("li", { className: "recv-group" }, [
            el("span", { className: "recv-venue", textContent: (g.isRecipe ? "🏠 " : "🍽️ ") + (g.venueName || "A place") }),
            el("span", { className: "recv-lines", textContent: bits.join(", ") }),
          ])
        );
      }
      recvBody.append(list);
      const no = el("button", { type: "button", className: "order-clear", textContent: "Not now" });
      no.addEventListener("click", () => recvDialog.close());
      const yes = el("button", { type: "button", className: "order-send", textContent: "Add to favourites" });
      yes.addEventListener("click", () => {
        const added = favourites.merge(decoded.items);
        title.textContent = added ? "Added to your favourites" : "Already in your favourites";
        recvBody.replaceChildren(
          el("p", {
            className: "order-caption",
            textContent: added
              ? `${plural(added, "favourite")} added — find them under Favourites.`
              : "You'd already saved all of these.",
          })
        );
        actions.replaceChildren(closeBtn("Done"));
      });
      actions.append(no, yes);
    } else {
      const whose = decoded.label ? `${decoded.label}'s` : "these";
      const n = decoded.items.reduce((s, i) => s + i.qty, 0);
      title.textContent = `Add ${whose} ${plural(n, "item")}?`;
      const list = el("ul", { className: "recv-list" });
      for (const g of groupByVenue(decoded.items)) {
        list.append(
          el("li", { className: "recv-group" }, [
            el("span", { className: "recv-venue", textContent: g.venueName || "Order" }),
            el("span", {
              className: "recv-lines",
              // The note is shown BEFORE the merge is confirmed: "add these 4
              // items?" that hides "no tomato" is asking about the wrong order.
              textContent: g.items
                .map((i) => {
                  const n = normaliseNote(i.note);
                  return `${i.qty}× ${i.name}${n ? ` (${n})` : ""}`;
                })
                .join(", "),
            }),
          ])
        );
      }
      recvBody.append(list);
      const no = el("button", { type: "button", className: "order-clear", textContent: "Not now" });
      no.addEventListener("click", () => recvDialog.close());
      const yes = el("button", { type: "button", className: "order-send", textContent: "Add to my order" });
      yes.addEventListener("click", () => {
        order.merge(decoded.items);
        recvDialog.close();
        // Show the merged result straight away.
        collectMode = false;
        collectBtn.setAttribute("aria-pressed", "false");
        ensureRecords();
        renderBody();
        renderTotal();
        dialog.showModal();
      });
      actions.append(no, yes);
    }

    recvDialog.addEventListener("close", () => recvDialog.remove());
    recvDialog.addEventListener("click", (e) => {
      if (e.target === recvDialog) recvDialog.close();
    });
    document.body.append(recvDialog);
    recvDialog.showModal();
  }

  function handleIncomingShare() {
    const token = readShareToken(location.hash);
    if (!token) return;
    // Consume the fragment first, so a refresh or a re-share doesn't re-prompt
    // and the picks don't linger in the address bar.
    history.replaceState(null, "", location.pathname + location.search);
    showReceive(decodeShare(token));
  }

  renderFab();
  refresh();
  handleIncomingShare();
}
