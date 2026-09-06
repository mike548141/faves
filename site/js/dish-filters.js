// The menu page's dish filters — "show me only the dishes I care about".
//
// Two kinds of filter share one row and one predicate:
//   • ♥ Favourites — the dishes this reader hearted at THIS venue.
//   • Dietary (v/vg/gf/df) — the venue's own positive claims, via dietary.js.
//
// Pure, so both are unit-tested directly (tests/dish-filters.test.js) and the
// menu render, the live re-apply and the search suggestions all read one
// definition of "does this dish match?".
//
// ─── READ THIS BEFORE CITING 22d AT ANYTHING IN THIS FILE ───────────────────
// This module and ROADMAP 22d are two different features and a session already
// lost time to running them together. Keep them apart:
//
//   22d          = WHICH TAG CHIPS SHOUT ON A DISH. A noise problem. The owner
//                  raised it because a dish wearing two identical red warnings,
//                  only one of which was his, made the page unreadable. Answer:
//                  dull the irrelevant chip, never remove it.
//   this module  = WHICH DISH ROWS ARE IN THE LIST. A finding problem. The
//                  owner raised it because a 70-dish menu is a long scroll when
//                  four of them are the ones you can eat. Answer: show those
//                  four.
//
// One is about the noise on a row; the other is about which rows there are.
// Neither constrains the other, and a filter here NEVER changes how a surviving
// row renders its tags — see "WHAT DID NOT CHANGE" below.
//
// ─── WHAT CHANGED ───────────────────────────────────────────────────────────
// `docs/DESIGN.md` shipped the dietary chips as *"dim non-matching dishes
// rather than hiding them (groups share one screen)"*, and menu.js carried the
// asymmetry as a stated design fact: search hides, diet dims.
//
// The owner ruled on 2026-09-06 that the point is FOCUS, not decoration:
//   "Its not about hiding dishes as much it is about allowing the user to
//    focus on the types of dishes they are interested in. So if I type
//    favourites in the search then I want to see all the dishes I marked as a
//    favourite in that menu, not all the others. Similar deal for things like
//    finding all the vegetarian dishes."
// So a filter now REMOVES. See ADR 0088.
//
// The "groups share one screen" objection was not dismissed — it is answered
// by making the narrowing LOUD rather than by refusing to narrow. `summarise()`
// below always reports how many rows are being withheld, and the menu screen
// renders that beside a one-tap "Show all". The person handed the phone across
// the table is one tap from the whole menu, and a filter that is on is never
// invisible (ADR 0052).
//
// ─── WHAT DID NOT CHANGE, AND MUST NOT: ALLERGENS ───────────────────────────
// A `contains-*` tag NEVER filters anything here, and there is deliberately no
// key for one below. Roughly three-quarters of those tags are OUR inference
// rather than the venue's statement (ADR 0025); "no tag = not stated, never
// free of it". A list shortened on an allergen would read as "what remains is
// safe", which is a claim this app has no basis for — and the one direction of
// error that actually hurts someone.
//
// The owner drew the same line himself in the same ruling:
//   "If one of those dishes that still show when filtered has an allergen then
//    that allergen should still show against the dish the same as it does now
//    without the filter."
// So a surviving row renders its allergen chips exactly as it does unfiltered.
// ROADMAP 22d ("dull, never hide") is untouched by this file: 22d governs the
// CHIP on a dish, this governs the ROW. Neither may quietly become the other.

import { DIET_FILTERS, dishSatisfiesDiet } from "./dietary.js";

/** The favourites filter's key. Not a diet key — it lives in its own space so
 *  a future `DIET_FILTERS` entry can never collide with it. */
export const FAVOURITES = "fav";

/**
 * The filters this particular menu can offer, in row order.
 *
 * Favourites leads because it is the reader's own list and the only one that
 * is about *them* rather than about the food; the diet chips follow in
 * `DIET_FILTERS` order so the row never reshuffles between venues.
 *
 * THE AVAILABILITY RULE, and it is the same honesty rule `search-hints.js`
 * states for the placeholder: a control may only be offered when it can
 * actually do something. A diet chip appears only when some dish on this menu
 * carries a qualifying tag (that was already true), and ♥ Favourites appears
 * only when this reader has hearted at least one dish HERE. Offering a
 * favourites filter on a menu where it can only ever return nothing is the UI
 * promising something it cannot deliver.
 *
 * @param {Set<string>} presentTags  every tag on this menu's dishes
 * @param {number}      favCount     hearted dishes at THIS venue
 * @returns {{key: string, label: string, icon: string, kind: "personal"|"diet"}[]}
 */
export function availableDishFilters(presentTags, favCount) {
  const out = [];
  if (favCount > 0) {
    out.push({ key: FAVOURITES, label: "Favourites", icon: "♥", kind: "personal" });
  }
  for (const f of DIET_FILTERS) {
    if (f.satisfies.some((t) => presentTags?.has?.(t))) {
      out.push({ key: f.key, label: f.label, icon: "", kind: "diet" });
    }
  }
  return out;
}

/**
 * Does one dish survive the active filters?
 *
 * AND across filters, matching `dishSatisfiesDiet` — "favourites + vegetarian"
 * means the vegetarian dishes I have hearted, not the union of the two. The
 * union reading would make each extra chip *widen* the list, which is the
 * opposite of what pressing a filter looks like it should do.
 *
 * An empty `active` matches everything, so an unfiltered menu never pays for
 * this and `applyView` can call it unconditionally.
 *
 * @param {{dishId?: string, tags?: string[]}} dish
 * @param {Set<string>} active            filter keys currently on
 * @param {{favouriteIds?: Set<string>}} ctx  hearted dish ids at this venue
 */
export function matchesDishFilters(dish, active, ctx = {}) {
  if (!active || active.size === 0) return true;
  if (active.has(FAVOURITES)) {
    // Resolved by dish id, never by name (ADR 0051): three rows at Sprig &
    // Fern are all called "Cheeseburger", and a name match would light up all
    // three when only one is hearted.
    if (!ctx.favouriteIds?.has?.(dish?.dishId)) return false;
  }
  const diet = new Set([...active].filter((k) => k !== FAVOURITES));
  return dishSatisfiesDiet(dish?.tags || [], diet);
}

/**
 * The line that keeps a narrowing honest: what is on screen, what is not, and
 * whether anything is being withheld at all.
 *
 * `hidden === 0` still returns a summary rather than null — the caller decides
 * whether to render it, and a caller that forgets is left showing a true
 * statement rather than a stale one.
 */
export function summarise(shown, total) {
  const hidden = Math.max(0, total - shown);
  return {
    shown,
    total,
    hidden,
    filtering: hidden > 0,
    // Deliberately states BOTH numbers. "35 hidden" alone makes a reader do
    // arithmetic to find out how big the menu is; "showing 12 of 47" is the
    // form that answers "did the collection shrink?" without being asked —
    // the same question the home screen's distance limit raised (Theme 27).
    text: `Showing ${shown} of ${total} dishes`,
  };
}
