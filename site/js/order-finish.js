// An order line that is missing a COMPULSORY choice, and finishing it (roadmap
// 200/130, ADR 0158) — pure, no DOM, no storage.
//
// ADR 0156 stops the menu making such a line. It can still exist: it was made
// before a group became required, it was recalled from a saved order, it arrived
// in a shared order, or the venue made the group required after it was added.
// The order line stores only the options chosen — never the group definitions —
// so "is this line unfinished?" can only be answered against the venue's LIVE
// record, which is why every function here takes one. A dish or group the record
// no longer holds is simply not judged: a line is never called unfinished on
// evidence we do not have.
//
// The rules (which groups are required, what a selection costs, what it does to
// the allergen tags) are addons.js's. This file only joins a stored line to them.

import { findDish, dishId } from "./dish-id.js";
import { groupsFor, missingRequired, optionId, optionPrice, lineOptions } from "./addons.js";

const cents = (n) => Math.round(n * 100) / 100;

/**
 * What a stored `line` still owes, judged against the venue's live `record`:
 * `null` when it is complete, or cannot be judged (the dish has left the menu);
 * otherwise
 *
 *   { item, groups, extra: { min, max } }
 *
 * `groups` are the live definitions of the required groups the line has not
 * answered, in offered order. `extra` is what answering them can add to the
 * line's price, as a range over the options on offer — `max > 0` means the
 * line's stored price is NOT what the dish will cost, and the sheet must say so
 * rather than total it as if it were.
 */
export function unfinishedOf(record, line) {
  if (!record || !line) return null;
  const found = findDish(record, dishId(line));
  if (!found) return null;
  const groups = groupsFor(record, found.section, found.item);
  const missing = missingRequired(groups, line.options);
  if (missing.length === 0) return null;
  let min = 0;
  let max = 0;
  for (const g of missing) {
    const prices = (g.options || []).map((o) => optionPrice(g, o));
    if (prices.length === 0) continue;
    min += Math.min(...prices);
    max += Math.max(...prices);
  }
  return { item: found.item, groups: missing, extra: { min: cents(min), max: cents(max) } };
}

/**
 * The line's chosen options as the composer wants them: `{ group, id, name,
 * price, tags }`, with each option's tags read from the LIVE record. A stored
 * option carries no tags (the line stays small), so without this the finished
 * dish would compose as if its existing extras were untagged. One that no longer
 * resolves keeps no tags — which composes as "not stated", the fail-safe
 * direction.
 */
export function selectionWithTags(record, line) {
  const found = findDish(record, dishId(line));
  const groups = found ? groupsFor(record, found.section, found.item) : [];
  return (line.options || []).map((o) => {
    const g = groups.find((x) => x.id === o.group);
    const live = g?.options?.find((x) => optionId(x) === optionId(o));
    return { ...o, tags: live?.tags || [] };
  });
}

/**
 * Answer the missing groups. `picks` is `{ [groupId]: optionId }`.
 *
 * Returns `{ ok: true, options, price, added }` — the line's new options and
 * unit price, plus the added options WITH their tags for the composer — or
 * `{ ok: false, missing }` naming the groups still unanswered (or answered with
 * an option that is not on offer). Nothing is guessed: a missing answer is never
 * filled in.
 *
 * The price is the line's own price plus what was chosen, not a re-price from
 * the live menu: the line's price is what the sheet has been showing, and this
 * change must move it by exactly the choice and nothing else. An unpriced line
 * (null) stays unpriced, as `configuredPrice` does.
 */
export function finishChoice(record, line, picks) {
  const info = unfinishedOf(record, line);
  if (!info) return { ok: false, missing: [] };
  const { added, missing } = answeredBy(info, picks);
  if (missing.length) return { ok: false, missing };
  const extra = added.reduce((s, a) => s + a.price, 0);
  return {
    ok: true,
    options: [...(line.options || []), ...lineOptions(added)],
    price: typeof line.price === "number" ? cents(line.price + extra) : null,
    added,
  };
}

/**
 * Which of `info`'s groups `picks` answers, and with what: `{ added, missing }`.
 * `added` carries each chosen option WITH its tags, so a half-made choice can be
 * composed (and warned about) before it is complete; `missing` are the groups
 * with no pick, or a pick that is not on offer.
 */
export function answeredBy(info, picks) {
  const added = [];
  const missing = [];
  for (const g of info.groups) {
    const want = picks?.[g.id];
    const opt = want ? (g.options || []).find((o) => optionId(o) === want) : null;
    if (!opt) {
      missing.push(g);
      continue;
    }
    added.push({ group: g.id, id: optionId(opt), name: opt.name, price: optionPrice(g, opt), tags: opt.tags || [] });
  }
  return { added, missing };
}

/**
 * What the sheet as a whole is missing, from the per-line verdicts
 * (`[{ line, info }]`, `info` null for a complete line).
 *
 *   count     dishes (lines) that need a choice
 *   qty       portions in them
 *   shortBy   true when answering them can raise the total — so the total must
 *             say it is short rather than price an unfinished dish at its base
 */
export function summariseUnfinished(verdicts) {
  let count = 0;
  let qty = 0;
  let shortBy = false;
  for (const { line, info } of verdicts) {
    if (!info) continue;
    count += 1;
    qty += line.qty || 0;
    if (info.extra.max > 0) shortBy = true;
  }
  return { count, qty, shortBy };
}
