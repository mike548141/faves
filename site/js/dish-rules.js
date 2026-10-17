// What a menu SAYS about how a dish is sold — a minimum order, and what the
// price is for (roadmap 200/170, ADR 0164) — pure, no DOM, no storage.
//
// A dish's `price` assumed one dish = one price. "Oysters, minimum order 3",
// "$12 per person, minimum two people" and "Wagyu, per 100 g" are not that, and
// the order sheet, which only knew a stepper that starts at 1, let you order one
// oyster and total it as though nothing were wrong.
//
// Two optional fields on a dish, both only where the menu prints them:
//
//   minQty  an integer >= 2: the least the venue will take. The stepper starts
//           there and will not stop short of it.
//   unit    what `price` is FOR, from the closed set below. Rendered beside the
//           price so "$7 each" reads as such. Never inferred: a unit the menu
//           never prints is a unit we do not have.
//
// The order LINE stores neither (ADR 0158's shape): a line is a reference plus
// the options chosen, so the rules are read from the venue's live record when
// the sheet is drawn. That is what lets a line made before the rule existed, or
// one that arrived in a shared link, be judged by the menu as it stands.

import { findDish, dishId } from "./dish-id.js";

/**
 * The closed vocabulary. `say` is the words on the page; `weighed` marks a unit
 * whose quantity is NOT a count of what the price is for, so `price x qty` is a
 * made-up number: "$26 per 100 g" times 2 steaks is not what two steaks cost.
 * Such a line is shown at its unit price and left out of the total, which says
 * so. `people` marks a unit whose quantity IS a head-count, so a minimum reads
 * "Minimum 2 people".
 */
export const UNITS = Object.freeze({
  each: Object.freeze({ say: "each", weighed: false, people: false }),
  "per person": Object.freeze({ say: "per person", weighed: false, people: true }),
  "per 100 g": Object.freeze({ say: "per 100 g", weighed: true, people: false }),
});

/** The dish's unit if it names one we know, else null. Unknown words say nothing. */
export const unitOf = (item) =>
  typeof item?.unit === "string" && Object.hasOwn(UNITS, item.unit) ? item.unit : null;

/** True when `price x quantity` would be a number nobody can pay. */
export const isWeighed = (item) => !!UNITS[unitOf(item)]?.weighed;

/** The words that sit beside the price: "each", "per person", "per 100 g", or "". */
export const unitWords = (item) => UNITS[unitOf(item)]?.say || "";

/** The least that may be ordered. 1 means no rule: anything under 2 is no minimum. */
export const minQtyOf = (item) =>
  Number.isInteger(item?.minQty) && item.minQty >= 2 ? item.minQty : 1;

/** "Minimum 3", or "Minimum 2 people" where the quantity is a head-count; "" for none. */
export function minWords(item) {
  const n = minQtyOf(item);
  if (n < 2) return "";
  return UNITS[unitOf(item)]?.people ? `Minimum ${n} people` : `Minimum ${n}`;
}

/** How many short of the minimum a quantity of `qty` is; 0 when it is met or there is none. */
export const shortBy = (qty, item) => {
  const n = minQtyOf(item);
  return qty > 0 && qty < n ? n - qty : 0;
};

/** A quantity raised to the minimum: `{ qty, raised }` (raised is the amount added). */
export function raiseToMin(qty, item) {
  const n = minQtyOf(item);
  return qty < n ? { qty: n, raised: n - qty } : { qty, raised: 0 };
}

/**
 * The rules for an order `line`, read from the venue's live `record`:
 * `{ minQty, unit, weighed }` for a dish that carries any, else `null` — which is
 * also the answer when there is no record or the dish has left the menu, because
 * a line is never judged on evidence we do not hold.
 */
export function rulesOf(record, line) {
  if (!record || !line) return null;
  const found = findDish(record, dishId(line));
  if (!found) return null;
  const item = found.item;
  const minQty = minQtyOf(item);
  const unit = unitOf(item);
  if (minQty < 2 && !unit) return null;
  return { minQty, unit, weighed: isWeighed(item) };
}

/**
 * An order line as the sheet totals and draws it: the stored `line` joined to the
 * venue's live rules (pure; nothing is written back to the order).
 *
 * A dish sold by weight keeps its unit price in `unitPrice` and takes
 * `price: null` — which is how the sums already mean "not in the total" (the
 * subtotal and total gain their "+"), so nothing downstream needed new
 * arithmetic. `minQty` rides along so the sheet's stepper can enforce it. A line
 * with no rules, or no record to judge it against, comes back unchanged.
 */
export function joinRules(record, line) {
  const rules = rulesOf(record, line);
  if (!rules) return line;
  const view = { ...line, rules, minQty: rules.minQty, unitPrice: line.price };
  if (rules.weighed) view.price = null;
  return view;
}
