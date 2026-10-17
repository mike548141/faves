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
// one option and adding the rest is exactly that.
//
// A line that DOES resolve but now costs a different amount is landed at today's
// price (above) and reported in `changed` (Theme 26c): "now $16.50, was $14.50
// when you saved it (up $2)". Said, not decided for them — the line is on the
// sheet and the reader keeps or removes it, the shape of ADR 0036's caveat. The
// evidence is the saved line's own unit-price snapshot (saved-orders.js), and the
// rule is NO EVIDENCE, NO CLAIM: a snapshot that is missing, a different
// currency, or a line that cannot be priced like-for-like (below) says nothing,
// because a false "this has changed" is worse than a missed one. A rise and a
// fall are both said.
//
// ONE exception to "skipped and named", owner-ruled 2026-10-03 (roadmap 200/130,
// ADR 0158): a line that is missing a choice the venue has since made COMPULSORY
// (ADR 0156), or is short of a group's minimum (ADR 0163), is LANDED, unfinished, and reported in `unfinished`. Nothing about it
// is altered or guessed — the dish and every option it had are exactly what the
// reader saved — and the order sheet flags it and lets them finish it there. The
// ADR 0156 version of this file dropped it, on the reasoning that the picker would
// not add it; the owner's ruling is that the reader, not the recall, decides.
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
import { raiseToMin } from "./dish-rules.js";
import { formatMoney, venueCurrency } from "./place.js";

/** Why a line could not be recalled, in words for the reader. */
export const REASONS = {
  dish: "no longer on the menu",
  option: (name) => `“${name || "an add-on"}” is no longer offered`,
  cap: "its add-ons no longer fit together",
};

/**
 * Resolve one saved order against the venue's live `record`.
 *
 * Returns `{ lines, skipped, unfinished }`: `lines` are `order.merge()`-ready (a
 * line's shape plus `qty`), `skipped` is `[{ name, qty, reason }]` for each saved
 * line that could not be rebuilt faithfully, and `unfinished` is
 * `[{ name, qty, groups: [name] }]` for the lines in `lines` that still owe a
 * compulsory choice, and `changed` is `[{ name, qty, was, now, text }]` for the
 * lines in `lines` whose unit price differs from the saved snapshot (`now` is
 * null when the dish no longer carries a price; `text` is the sentence for the
 * reader, formatted in the venue's currency), and `raised` is `[{ name, was, now,
 * text }]` for the lines whose saved quantity is below the dish's minimum order
 * today (ADR 0165) and was brought up to it.
 */
export function planRecall(saved, record) {
  const lines = [];
  const skipped = [];
  const unfinished = [];
  const changed = [];
  const raised = [];
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
    // Only the UPPER bound is a reason to skip. A selection UNDER a group's
    // `min` (ADR 0163) is landed unfinished below, exactly as a missing
    // required choice is: nothing about it is wrong, it is merely not done.
    const capped = groups.some((g) => !selectionAllowed(g, selection.filter((s) => s.group === g.id).length));
    if (capped) {
      miss(REASONS.cap);
      continue;
    }

    // Landed, not dropped (header). The group is named so the recall's status
    // line can say what is owed; the sheet works it out again from the live
    // record, so nothing needs to be remembered on the line itself.
    const unanswered = missingRequired(groups, selection);
    if (unanswered.length) {
      unfinished.push({ name: item.name, qty: l.qty, groups: unanswered.map((g) => g.name) });
    }

    // A saved line below the dish's minimum order TODAY (the venue added the rule
    // since, or the saved order predates it) is brought up to it and SAID — never
    // dropped, and never landed short as though the venue would take it (ADR 0165).
    const up = raiseToMin(l.qty, item);
    if (up.raised) {
      raised.push({
        name: item.name,
        was: l.qty,
        now: up.qty,
        text: `${item.name} — the minimum order is ${up.qty}, so ${l.qty} is now ${up.qty}`,
      });
    }

    const base = typeof item.price === "number" ? item.price : null;
    const line = {
      venueId: record.id,
      venueName: record.name,
      phone: record.phone,
      name: item.name,
      dishId: dishId(item),
      price: configuredPrice(base, selection, groups),
      currency,
      options: lineOptions(selection),
      qty: up.qty,
    };
    const note = normaliseNote(l.note);
    if (note) line.note = note;
    lines.push(line);

    // An UNFINISHED line is left out of the comparison: its live price lacks the
    // compulsory choice it has not yet made, so any difference would be the
    // missing choice, not the menu moving — a claim we cannot back.
    if (!unanswered.length) {
      const c = priceChange(l, line, fmt);
      if (c) changed.push(c);
    }
  }
  return { lines, skipped, unfinished, changed, raised };
}

/**
 * `{ name, qty, was, now, text }` if the saved line's unit-price snapshot and the
 * recalled line's price genuinely differ, else null. Compared in whole cents, so
 * 14.5 against 14.499999 is not a change. `saved` may be a raw stored line, so
 * its price is checked, not assumed.
 */
function priceChange(saved, line, fmt) {
  const was = saved.price;
  if (typeof was !== "number" || !Number.isFinite(was)) return null; // no snapshot, no claim
  if (saved.currency && line.currency && saved.currency !== line.currency) return null;
  const now = typeof line.price === "number" ? line.price : null;
  const cents = (n) => Math.round(n * 100);
  if (now != null && cents(now) === cents(was)) return null;
  const name = line.name;
  const each = line.qty > 1 ? " each" : "";
  const text =
    now == null
      ? `${line.qty}× ${name} — no price listed now (was ${fmt(was)} when you saved it)`
      : `${line.qty}× ${name} — now ${fmt(now)}${each}, was ${fmt(was)} when you saved it (${
          now > was ? "up" : "down"
        } ${fmt(Math.abs(cents(now) - cents(was)) / 100)})`;
  return { name, qty: line.qty, was, now, text };
}
