// Recalling a saved order against TODAY's menu (Theme 26a) — pure, no storage.
//
// A saved line is a reference (a dish id, option ids) plus a snapshot of what it
// was called and cost (saved-orders.js). Recall RESOLVES the references in the
// venue's live record and BUILDS the tally line from what it finds — so the
// name, the add-on prices and the configured unit price on the line are today's,
// never the saved snapshot's. Putting a stale price into the tally would make the
// total a lie, which is the one thing the price work has been careful never to do.
//
// And a line that does not resolve is SKIPPED AND NAMED, never quietly altered:
// a dish that has left the menu, an add-on the venue no longer offers, or a
// selection that no longer fits its group's cap would otherwise become a
// different order from the one the reader saved, added without a word. Dropping
// one option and adding the rest is exactly that. This is the minimum honest
// behaviour; Theme 26c (a changed price, a renamed option, "this is $2 dearer")
// is the item that will do better, and it needs only what is already stored.
//
// Matching is by id through the repo's own resolvers — `findDish` (dish-id.js:
// the four strict tiers, so a former id still finds a renamed dish and a
// same-NAME dish under a new id does not) and `optionId` — never by name or
// position.

import { findDish, dishId } from "./dish-id.js";
import {
  groupsFor,
  optionId,
  optionPrice,
  isSelects,
  missingRequired,
  variantLabel,
  selectionAllowed,
  configuredPrice,
  lineOptions,
} from "./addons.js";
import { normaliseNote } from "./cart.js";
import { formatMoney, venueCurrency } from "./place.js";

/** Why a line could not be recalled, in words for the reader. */
export const REASONS = {
  dish: "no longer on the menu",
  option: (name) => `“${name || "an add-on"}” is no longer offered`,
  cap: "its add-ons no longer fit together",
  // A choice the venue now makes compulsory (ADR 0156) that this saved line
  // never made — the picker would not add it, so recall does not either.
  required: (names) => `needs a choice now: ${names}`,
};

/**
 * Resolve one saved order against the venue's live `record`.
 *
 * Returns `{ lines, skipped }`: `lines` are `order.merge()`-ready (a line's
 * shape plus `qty`), `skipped` is `[{ name, qty, reason }]` for each saved line
 * that could not be rebuilt faithfully.
 */
export function planRecall(saved, record) {
  const lines = [];
  const skipped = [];
  const currency = venueCurrency(record);
  const fmt = (n) => formatMoney(n, currency);

  for (const l of saved?.lines || []) {
    const miss = (reason) => skipped.push({ name: l.name || l.dishId, qty: l.qty, reason });
    const found = findDish(record, l.dishId);
    if (!found) {
      miss(REASONS.dish);
      continue;
    }
    const { section, item } = found;
    const groups = groupsFor(record, section, item);

    const selection = [];
    let bad = null;
    for (const o of l.options || []) {
      const g = groups.find((x) => x.id === o.group);
      const opt = g?.options?.find((x) => optionId(x) === optionId(o));
      if (!g || !opt) {
        bad = REASONS.option(o.name);
        break;
      }
      selection.push(
        isSelects(g)
          ? {
              group: g.id,
              id: optionId(opt),
              name: variantLabel(g, opt, fmt),
              price: 0,
              dishPrice: opt.dishPrice,
              isDefault: opt.default === true,
            }
          : { group: g.id, id: optionId(opt), name: opt.name, price: optionPrice(g, opt) }
      );
    }
    if (bad) {
      miss(bad);
      continue;
    }
    // The venue's own cap ("choose up to 3") is theirs, not ours (ADR 0048 §1):
    // a selection the picker would refuse is not one to put on the sheet.
    const capped = groups.some((g) => !selectionAllowed(g, selection.filter((s) => s.group === g.id).length));
    if (capped) {
      miss(REASONS.cap);
      continue;
    }

    const unanswered = missingRequired(groups, selection);
    if (unanswered.length) {
      miss(REASONS.required(unanswered.map((g) => g.name).join(", ")));
      continue;
    }

    const base = typeof item.price === "number" ? item.price : null;
    const line = {
      venueId: record.id,
      venueName: record.name,
      phone: record.phone,
      name: item.name,
      dishId: dishId(item),
      price: configuredPrice(base, selection),
      currency,
      options: lineOptions(selection),
      qty: l.qty,
    };
    const note = normaliseNote(l.note);
    if (note) line.note = note;
    lines.push(line);
  }
  return { lines, skipped };
}
