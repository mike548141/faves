// The shopping list (ROADMAP 17e) — the order tally's cook-at-home twin.
//
// ── WHAT IS NOT IN THIS FILE, AND WHY THAT IS THE POINT ──
//
// There is no gathering, no grouping, no totalling, no storage lifecycle, no
// corrupt-payload fallback and no subscriber model here. All of it is
// `cart.js`, reached by handing `createOrder` a different storage key. The
// roadmap bullet asked for "the tally's cook-at-home twin rather than a second
// list", and this repo has a standing scar from the other answer: one question
// with two implementations, both locally right, only one ever updated. So a
// shopping line IS an order line — the vocabulary moves and the machinery does
// not:
//
//   venueId   the RECIPE (`recipeId()`: collection + dish id, ADR 0051)
//   venueName the recipe's name — the group heading a shopper reads
//   dishId    the ingredient line's RAW key (ingredients.js, ADR 0070)
//   name      the ingredient line AS ADDED, i.e. at the scale you added it
//   collected ticked off in the trolley, exactly as it is ticked off at a till
//   qty       always 1 — a shopping line is a thing to buy, not a count of them
//   price     always null; `groupByVenue` computes a subtotal from it and this
//             screen does not render one. An ignored column is not a fork.
//
// ── SCALING: IDENTITY ON THE RAW LINE, AMOUNT ON THE RENDER (ADR 0076) ──
//
// `checklist.js` states the house rule as "HASH THE DATA, NEVER THE RENDER",
// and `quantity.js` repeats it for the scaler: a tick made at 2× is still there
// at ½× because `line.key` is the raw text and only `line.text` moves. A
// shopping line follows the same seam. Its identity is the raw key, so the same
// ingredient at ½× and at 2× is ONE line whose amount was updated, never two
// lines fighting over the butter. What the shopper reads is the scaled text,
// because an amount is the whole reason to write an ingredient down.
//
// The consequence, stated because it is a decision and not an accident:
// **rescaling the recipe page does NOT silently rewrite the list.** A list is a
// thing you took to a shop; having it change under you because you tapped 2× to
// look at something would be the same class of fault as cook mode showing 1×
// quantities beside a 2× page (owner, 2026-08-17). So the page DETECTS the
// disagreement, says so in words, and offers to update — and it detects it by
// comparing the amounts themselves (`recipeState`) rather than by storing the
// scale the line was added at. Nothing new is written to the line, which is
// also what keeps this out of the export/import/codec/sync field tables.
//
// ── COMBINING: NEVER, AND THAT IS THE SAFE ANSWER ──
//
// Two recipes both want butter. Summing them would mean adding "125g butter"
// to "½ cup butter, softened", which is unit arithmetic over free-text prose —
// strictly harder than the scaling `quantity.js` only dares do behind a
// round-trip proof, and with no round trip available to prove it. A wrong total
// on a shopping list is a dinner you cannot cook. So lines are grouped by
// recipe and never merged across recipes; the shopper reads two entries and
// buys once, which is the judgement a person makes better than a parser.
// (Within ONE recipe, two byte-identical lines already collapse to one, because
// that is what `lineKey` does and what a reader would say.)
//
// ── WHERE IT LIVES: DEVICE-LEVEL, LIKE THE TALLY ──
//
// Not per-profile. ADR 0012 put the order tally at device level because it is
// "one order for the table"; a household shops once, and a shopping list split
// three ways by whoever last tapped a name in Settings is a list that is
// missing things. Same shelf, same reasoning. See ADR 0124 for the tables this
// walked as a consequence.

import { safeStorage } from "./store.js";
import { createOrder } from "./cart.js";
import { dishId } from "./dish-id.js";
import { ingredientBlocks } from "./ingredients.js";
import { recipeId } from "./checklist.js";
import { DEFAULT_SCALE, scaleFor, scaleLineStatus } from "./quantity.js";

/** Device-level, like `faves.order.v1`. Never profile-scoped — see the header. */
export const SHOPPING_KEY = "faves.shopping.v1";

/**
 * What a recipe puts on the list, at a given scale.
 *
 * `key` is the raw line's identity and never moves; `text` is what the shopper
 * reads and carries the amount. The component prefix stays ON the display text
 * here, unlike the recipe page — there the heading is above the line, and in a
 * shop there is no heading, so "60g butter" twice under one recipe would be an
 * unreadable list of the exact collision ADR 0070 exists to prevent.
 *
 * @returns {{key: string, text: string}[]}
 */
export function recipeLines(item, scaleKey = DEFAULT_SCALE) {
  const scale = scaleFor(scaleKey);
  return ingredientBlocks(item?.ingredients).flatMap((b) =>
    b.lines.map((l) => {
      const text = scaleLineStatus(l.text, scale).text;
      return { key: l.key, text: b.component ? `${b.component}: ${text}` : text };
    })
  );
}

/** Every line currently on the list for one recipe, oldest first. */
export const linesFor = (items, rid) => items.filter((i) => i.venueId === rid);

/**
 * How the list stands against the recipe on screen. One of:
 *
 *   "absent" — none of this recipe's lines are on the list.
 *   "listed" — the lines that ARE on it all carry the amount the page shows.
 *   "stale"  — 🚩 at least one listed line names a DIFFERENT amount. This is the
 *              one the UI must say out loud: the reader is looking at 2× and
 *              will shop from a list that says 1×, and nothing else on either
 *              screen would tell them.
 *
 * A line the shopper deliberately REMOVED ("I already have butter") is not a
 * disagreement and must never read as one — otherwise the page would nag to
 * re-add the thing they just took off, forever. So absence is ignored and only
 * a listed line with a different amount counts.
 */
export function recipeState(items, rid, lines) {
  const have = new Map(linesFor(items, rid).map((i) => [dishId(i), i.name]));
  if (!have.size) return "absent";
  for (const l of lines) {
    const text = have.get(l.key);
    if (text !== undefined && text !== l.text) return "stale";
  }
  return "listed";
}

/**
 * Put a recipe's lines on the list, or bring the amounts it already carries up
 * to date. Built out of the tally's own verbs — `remove`, `add`,
 * `toggleCollected` — so there is no second write path into the store.
 *
 * `onlyListed` is the "update the amounts" case: it touches the lines already
 * on the list and adds nothing, which is what keeps a deliberate removal
 * removed.
 *
 * WHY IT REBUILDS RATHER THAN PATCHES. The store appends, so updating three
 * lines of a twenty-line recipe in place would send those three to the bottom
 * of the group and leave the shopper reading a list in an order the recipe
 * never had. Rebuilding costs a handful of writes in one synchronous task
 * (nothing paints between them) and keeps the group in the recipe's order.
 *
 * WHICH TICKS SURVIVE, and this is the judgement rather than the mechanism: a
 * line whose amount is UNCHANGED keeps its tick, because "I have picked that
 * up" is still true. A line whose amount MOVED loses it, because a tick against
 * "125g butter" says nothing about 250g, and a list that claims you already
 * have twice what you have is worse than one that asks you to look again.
 */
export function putRecipe(store, { rid, name, lines, onlyListed = false }) {
  const before = new Map(linesFor(store.items(), rid).map((i) => [dishId(i), i]));
  const put = onlyListed ? lines.filter((l) => before.has(l.key)) : lines;
  for (const key of before.keys()) store.remove(rid, key);
  for (const l of put) {
    store.add({ venueId: rid, venueName: name, dishId: l.key, name: l.text });
    const was = before.get(l.key);
    if (was?.collected && was.name === l.text) store.toggleCollected(rid, l.key);
  }
}

/** Take a whole recipe off the list. */
export function removeRecipe(store, rid) {
  for (const i of linesFor(store.items(), rid)) store.remove(rid, dishId(i));
}

/** The recipe id a group is keyed on — re-exported so callers need one import. */
export { recipeId };

// The shared singleton every screen uses, on the device shelf beside the tally.
export const shopping = createOrder(safeStorage(), SHOPPING_KEY);
