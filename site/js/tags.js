// A dish's tag row — the ONE implementation, shared by the menu row and the
// recipe page (roadmap 350/020, "22e"; owner-ruled 2026-09-28).
//
// Until now menu.js and recipe.js each carried their own vocabulary tables, chip
// builder and order, held in step only by tests/tag-labels.test.js — and they had
// already drifted: the menu dulled an allergen the reader had not flagged and
// dropped the word "Contains" (22d, 2026-08-17), the recipe page did neither, so
// a recipe wore six loud red warnings where the same dish on a menu wore one.
// One module is the only arrangement in which that cannot recur.
//
// WHAT THE ROW DOES, and whose ruling each part is:
//   • LOUDNESS (22d, 2026-08-17): a tag this reader declared — an allergen they
//     avoid, a diet they follow — is loud; every other tag is dulled, and a
//     dulled allergen drops "Contains".
//   • ORDER (2026-09-28): allergens before food preferences. Allergens the reader
//     flagged first, then the rest, each group alphabetical. Preferences the
//     reader selected first, then the rest, each group alphabetical. The owner's
//     spec said "contained before not contained"; the app never asserts "free of"
//     (ADR 0025), so every allergen chip is a contained one and his worked example
//     — his own peanut allergy first — needed the flagged-first rule, which was
//     put back to him and is recorded on the item. Heat has no setting, so it is
//     always an unselected preference.
//   • COLLAPSE, LABELLED (2026-09-28): past TAG_LIMIT chips the rest sit behind
//     one control that SAYS WHAT IT HIDES ("⚠ +2 allergens"), so a hidden
//     allergen is never silent. A declared tag is NEVER hidden, even past the
//     limit — 22d's safety half, kept verbatim. The control only appears when it
//     would hide at least two: a "+1" costs the space of the chip it hid.
//
// Load-bearing framing, as everywhere tags surface: this renders what the data
// records and never asserts safety — "no tag = not stated", never "free of it".

import { el } from "./dom.js";
import { isSpicy, heatLabel } from "./heat.js";
import { DIET_FILTERS } from "./dietary.js";

/** How many chips a row shows before collapsing (owner: "a variable, so I can
 *  change my mind as we test it"). Declared tags are shown beyond it. */
export const TAG_LIMIT = 3;

export const DIETARY = {
  v: "Veg",
  vg: "Vegan",
  gf: "GF",
  df: "DF",
  "gf-option": "GF option",
  "v-option": "Veg option",
  "df-option": "DF option",
  "vg-option": "Vegan option",
};
export const ALLERGEN = {
  "contains-nuts": "Contains nuts",
  "contains-peanuts": "Contains peanuts",
  "contains-shellfish": "Contains shellfish",
  "contains-fish": "Contains fish",
  "contains-egg": "Contains egg",
  "contains-dairy": "Contains dairy",
  "contains-gluten": "Contains gluten",
  "contains-soy": "Contains soy",
  "contains-sesame": "Contains sesame",
};

export const isAllergen = (t) => t in ALLERGEN;

/**
 * WHICH TAGS ARE A CHIP AT ALL (ADR 0096). `has-meat`/`has-fish` are add-on
 * vocabulary with no reader-facing branch: validate.py rejects them on a dish,
 * `has-fish` always travels beside `contains-fish` (ADR 0095), and a chip for
 * either would be a raw identifier or a second chip saying one thing. A future
 * word lands here and is dropped rather than painted raw — the safe direction,
 * and still a silence, which addon_check.mjs asserts against.
 */
export const isChipTag = (t) => isAllergen(t) || isSpicy(t) || t in DIETARY;

/**
 * Does this dietary tag answer a need the reader DECLARED? `dietary` is the
 * stored preference (settings `diet.dietary`), never the menu's transient
 * search — the question is what this reader needs, not what they are looking at.
 */
export function servesDeclaredDiet(t, dietary) {
  if (!dietary || dietary.size === 0) return false;
  return DIET_FILTERS.some((f) => dietary.has(f.key) && f.satisfies.includes(t));
}

/** Is this tag the reader's own — flagged allergen or declared diet? */
export const isDeclared = (t, avoid, dietary) =>
  isAllergen(t) ? !!avoid?.has(t) : t in DIETARY && servesDeclaredDiet(t, dietary);

/** The words on a chip, before any "Contains" is dropped. */
export const tagLabel = (t) =>
  isAllergen(t) ? ALLERGEN[t] : isSpicy(t) ? heatLabel(t) : DIETARY[t] ?? t;

/**
 * The row's order: allergens, then preferences; within each, the reader's own
 * first; within THAT, alphabetical by the words on the chip. Pure, so the rule
 * is unit-tested rather than eyeballed. Non-chip tags are dropped here.
 */
export function orderTags(tags, { avoid, dietary } = {}) {
  const rank = (t) => (isAllergen(t) ? 0 : 2) + (isDeclared(t, avoid, dietary) ? 0 : 1);
  const unique = [...new Set(tags || [])].filter(isChipTag);
  return unique.sort(
    (a, b) => rank(a) - rank(b) || tagLabel(a).localeCompare(tagLabel(b), "en-NZ")
  );
}

/**
 * Split an ordered row into what shows and what waits behind the control.
 * Declared tags always show. Otherwise the first `limit` show; the collapse
 * only happens when it would hide two or more.
 */
export function splitTags(ordered, { avoid, dietary, limit = TAG_LIMIT } = {}) {
  const shown = [];
  const hidden = [];
  for (const t of ordered) {
    if (isDeclared(t, avoid, dietary) || shown.length < limit) shown.push(t);
    else hidden.push(t);
  }
  if (hidden.length < 2) return { shown: [...ordered], hidden: [] };
  return { shown, hidden };
}

/** What the collapse control says, so it never hides an allergen silently. */
export function moreLabel(hidden) {
  const a = hidden.filter(isAllergen).length;
  const rest = hidden.length - a;
  const allergens = a ? `⚠ +${a} allergen${a === 1 ? "" : "s"}` : "";
  if (!rest) return allergens;
  return allergens ? `${allergens}, ${rest} more` : `+${rest} more`;
}

/** One tag → one chip, at the loudness this reader has earned (22d). */
export function tagChip(t, { avoid, dietary } = {}) {
  if (isAllergen(t)) {
    const flagged = !!avoid?.has(t);
    // "Contains peanuts" → "peanuts" when it is not this reader's allergen. The
    // chip is uppercased in CSS, so the source string stays sentence-shaped.
    const label = flagged ? ALLERGEN[t] : ALLERGEN[t].replace(/^Contains /, "");
    return el("span", {
      className: flagged ? "tag tag-allergen is-flagged" : "tag tag-allergen is-muted",
      textContent: `⚠ ${label}`,
    });
  }
  if (isSpicy(t)) return el("span", { className: "tag tag-spicy", textContent: heatLabel(t) });
  const wanted = servesDeclaredDiet(t, dietary);
  return el("span", {
    className: wanted ? "tag tag-diet" : "tag tag-diet is-muted",
    textContent: DIETARY[t],
  });
}

/**
 * A live tag row inside `container` (a `.dish-tags` element the caller owns).
 * `paint(tags)` redraws it — the menu calls it again whenever an add-on changes
 * the dish — and is a no-op when nothing visible would move, so a tap that
 * changes no tag does not flicker the row. Whether the reader opened the row is
 * kept across repaints: configuring a dish must not fold up what they unfolded.
 */
export function tagRow(container, { avoid, dietary, limit = TAG_LIMIT } = {}) {
  const ctx = { avoid, dietary };
  let expanded = false;
  let painted = null;
  let current = [];

  function draw() {
    const ordered = orderTags(current, ctx);
    const { shown, hidden } = splitTags(ordered, { ...ctx, limit });
    const key = `${ordered.join(" ")}|${hidden.length}|${expanded}`;
    if (key === painted) return;
    painted = key;
    const chips = (expanded ? ordered : shown).map((t) => tagChip(t, ctx));
    if (hidden.length) {
      const more = el("button", {
        type: "button",
        className: "tag tag-more",
        textContent: expanded ? "Show fewer" : moreLabel(hidden),
        "aria-expanded": String(expanded),
      });
      if (!expanded) {
        // The visible words are a count; the name says what tapping does.
        more.setAttribute("aria-label", `Show all tags — ${hidden.map(tagLabel).join(", ")}`);
      }
      more.addEventListener("click", () => {
        expanded = !expanded;
        draw();
        container.querySelector(".tag-more")?.focus();
      });
      chips.push(more);
    }
    container.replaceChildren(...chips);
  }

  return {
    paint(tags) {
      current = tags || [];
      draw();
    },
  };
}
