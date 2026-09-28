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
//   • TRACE, "MAY CONTAIN" (110/020, 2026-08-16 and 2026-09-09; 350/020,
//     2026-09-28; ADR 0136): only a PRESENT allergen is a `contains-*` tag. A
//     trace statement lives beside the tags in `trace`, never in them, and
//     reaches the screen two ways. Every tip on the dish carries a "May contain
//     traces of …" line. And a trace allergen THIS READER FLAGGED gets its own
//     chip — "May contain peanuts", dashed so it never reads as "Contains" —
//     which, being declared, is never folded away. An unflagged reader gets no
//     trace chip: a warning that fires on every pizza carries no information to
//     someone it does not concern, which is why 110/020 kept trace off the row.
//     The dish-row accent (`dish-flagged`) stays PRESENT-only, by the same ruling.
//
// Load-bearing framing, as everywhere tags surface: this renders what the data
// records and never asserts safety — "no tag = not stated", never "free of it".

import { el } from "./dom.js";
import { disclosure } from "./disclosure.js";
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

/**
 * A trace chip's key inside this module: `trace:contains-peanuts`. Never a
 * value in any dish's `tags` — validate.py refuses the prefix there — so a
 * trace can only ever reach a row through `trace`, never be mistaken for a
 * present allergen by code that reads `tags`.
 */
const TRACE = "trace:";
export const isTraceChip = (k) => typeof k === "string" && k.startsWith(TRACE);
const traceTag = (k) => k.slice(TRACE.length);

/**
 * A dish's trace statements as `[{ tag, source }]`, from the record's own
 * `trace` / `traceSource` (ADR 0136). Composition (a recipe's ingredients, a
 * picked add-on) passes more entries in; this is only the dish's own half.
 */
export function traceEntries(obj) {
  const src = typeof obj?.traceSource === "string" ? obj.traceSource : "";
  const own = (Array.isArray(obj?.trace) ? obj.trace : [])
    .filter(isAllergen)
    .map((tag) => ({ tag, source: src }));
  // A recipe's parts carry their own trace (ingredients.js `composeRecipe`,
  // projected at load by data.js) — the Whittaker's chocolate's "may contain".
  const parts = (Array.isArray(obj?.partTrace) ? obj.partTrace : []).filter((e) => isAllergen(e?.tag));
  return [...own, ...parts];
}

/**
 * The trace that still says something: an allergen already PRESENT is not also
 * "may contain" — the stronger fact wins — and one allergen named by two
 * sources is one entry carrying both. Order follows first mention.
 */
export function liveTrace(tags, entries) {
  const present = new Set(tags || []);
  const out = new Map();
  for (const e of entries || []) {
    if (!e || !isAllergen(e.tag) || present.has(e.tag)) continue;
    const have = out.get(e.tag) || { tag: e.tag, sources: [] };
    if (e.source && !have.sources.includes(e.source)) have.sources.push(e.source);
    out.set(e.tag, have);
  }
  return [...out.values()];
}

/** "peanuts" from `contains-peanuts` — the allergen's own word. */
const allergenWord = (t) => ALLERGEN[t].replace(/^Contains /, "").toLowerCase();

/**
 * The line every tip on a dish carries when the dish has live trace: "May
 * contain traces of nuts and peanuts — Whittaker's label." One sentence per
 * source, so two labels saying different things are never merged into one
 * claim neither made. Empty string when there is no trace.
 */
export function traceLine(trace) {
  const bySource = new Map();
  for (const e of trace || []) {
    const key = e.sources.length ? e.sources.join("; ") : "";
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(allergenWord(e.tag));
  }
  return [...bySource.entries()]
    .map(([src, words]) => {
      const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
      return `May contain traces of ${list}${src ? ` — ${src}` : ""}.`;
    })
    .join(" ");
}

/** Is this tag the reader's own — flagged allergen or declared diet? */
export const isDeclared = (t, avoid, dietary) =>
  isTraceChip(t)
    ? !!avoid?.has(traceTag(t))
    : isAllergen(t)
      ? !!avoid?.has(t)
      : t in DIETARY && servesDeclaredDiet(t, dietary);

/** The words on a chip, before any "Contains" is dropped. */
export const tagLabel = (t) =>
  isTraceChip(t)
    ? `May contain ${allergenWord(traceTag(t))}`
    : isAllergen(t) ? ALLERGEN[t] : isSpicy(t) ? heatLabel(t) : DIETARY[t] ?? t;

/**
 * The row's order: allergens, then preferences; within each, the reader's own
 * first; within THAT, alphabetical by the words on the chip. Pure, so the rule
 * is unit-tested rather than eyeballed. Non-chip tags are dropped here.
 */
export function orderTags(tags, { avoid, dietary, trace = [] } = {}) {
  // A flagged trace chip sits straight after the flagged PRESENT allergens:
  // still the reader's own, and still below the stronger fact. Only a flagged
  // trace is a chip at all (ADR 0136), so an unflagged one never enters here.
  const rank = (t) =>
    isTraceChip(t) ? 0.5 : (isAllergen(t) ? 0 : 2) + (isDeclared(t, avoid, dietary) ? 0 : 1);
  const unique = [...new Set(tags || [])].filter(isChipTag);
  const traceChips = liveTrace(unique, trace)
    .filter((e) => avoid?.has(e.tag))
    .map((e) => TRACE + e.tag);
  return [...unique, ...traceChips].sort(
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
  // A trace chip is declared by construction, so it is never hidden; counted
  // here only so a future change to that rule cannot hide one silently.
  const a = hidden.filter((t) => isAllergen(t) || isTraceChip(t)).length;
  const rest = hidden.length - a;
  const allergens = a ? `⚠ +${a} allergen${a === 1 ? "" : "s"}` : "";
  if (!rest) return allergens;
  return allergens ? `${allergens}, ${rest} more` : `+${rest} more`;
}

/** One tag → one chip, at the loudness this reader has earned (22d). */
export function tagChip(t, { avoid, dietary } = {}) {
  if (isTraceChip(t)) {
    // Dashed, not filled: loud enough to be found — it is this reader's allergen
    // — and shaped differently from "Contains", so the two are told apart by
    // outline and by words, never by colour alone (WCAG 1.4.1).
    return el("span", { className: "tag tag-allergen tag-trace is-flagged", textContent: `⚠ ${tagLabel(t)}` });
  }
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
 * What a chip's tip says (owner, 2026-09-28: "if I touched Contains peanuts it
 * could tell me the ingredients that caused the allergen warning").
 *
 * `note` is the dish's own `tagNotes[t]` — the words that fired, written by
 * tools/tag_allergens.py --explain and never by hand. Without one the tip says
 * only what is true of every tag: that it was recorded. A tag the dish does not
 * carry itself came from an add-on the reader picked (`fromAddOn`).
 */
export function tagTip(t, { note, recipe = false, fromAddOn = false, avoid, dietary, trace = [] } = {}) {
  const tail = traceLine(trace);
  const withTrace = (s) => (tail ? `${s} ${tail}` : s);
  const mine = isDeclared(t, avoid, dietary);
  if (isTraceChip(t)) {
    // Owner, 2026-09-29, of the tip this replaced ("You asked to avoid this.
    // May contain traces of peanuts — Whittaker's label. Not listed as an
    // ingredient — a warning that it may be present. May contain traces of nuts
    // — Whittaker's label."): "repeating the point in an unhelpful way, is
    // longer than necessary, and is difficult to read". So: name what the
    // reader avoids, then ONE sentence per source with the source first — the
    // same source is no longer said twice — and "not an ingredient" once, at
    // the end. Still one sentence per source, so two labels are never merged
    // into a claim neither made. Its own allergen leads its source's list.
    const own = traceTag(t);
    const ordered = [...trace].sort((a, b) => (b.tag === own) - (a.tag === own));
    const bySource = new Map();
    for (const e of ordered) {
      const key = e.sources.length ? e.sources.join("; ") : "";
      if (!bySource.has(key)) bySource.set(key, []);
      bySource.get(key).push(allergenWord(e.tag));
    }
    const said = [...bySource.entries()]
      .map(([src, words]) => {
        const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
        return src ? `${src} warns of possible traces of ${list}.` : `Possible traces of ${list}.`;
      })
      .join(" ");
    const check = recipe ? "" : " If it matters, check with the venue.";
    return `You avoid ${allergenWord(own)}. ${said} Not an ingredient.${check}`;
  }
  return withTrace(baseTip(t, { note, recipe, fromAddOn, mine }));
}

function baseTip(t, { note, recipe, fromAddOn, mine }) {
  if (isAllergen(t)) {
    const why = fromAddOn
      ? "From an add-on you picked."
      : note || (recipe ? "Marked on this recipe." : "Recorded when this menu was entered.");
    // Never a safety claim (ADR 0025): a tag is what the data records.
    const check = recipe ? "" : " If it matters, check with the venue.";
    return `${mine ? "You asked to avoid this. " : ""}${why}${check}`;
  }
  if (isSpicy(t)) return recipe ? "Heat as marked on this recipe." : "Heat as the venue marks it.";
  return `${mine ? "Matches your settings. " : ""}${recipe ? "Marked on this recipe." : "As the venue marks it."}`;
}

/**
 * A live tag row inside `container` (a `.dish-tags` element the caller owns).
 * `paint(tags)` redraws it — the menu calls it again whenever an add-on changes
 * the dish — and is a no-op when nothing visible would move, so a tap that
 * changes no tag does not flicker the row. Whether the reader opened the row is
 * kept across repaints: configuring a dish must not fold up what they unfolded.
 */
export function tagRow(container, { avoid, dietary, limit = TAG_LIMIT, notes = {}, base = null, recipe = false, idPrefix = "tag", trace = [] } = {}) {
  const ctx = { avoid, dietary };
  const own = base ? new Set(base) : null;
  let expanded = false;
  let painted = null;
  let current = [];
  let traceNow = trace;

  function draw() {
    const live = liveTrace(current, traceNow);
    const ordered = orderTags(current, { ...ctx, trace: traceNow });
    const { shown, hidden } = splitTags(ordered, { ...ctx, limit });
    const key = `${ordered.join(" ")}|${hidden.length}|${expanded}|${traceLine(live)}`;
    if (key === painted) return;
    painted = key;
    // Every chip is a button opening its own tip — the same disclosure() the
    // venue's "last checked" ⓘ uses, so tap / outside-tap / Escape behave the
    // same everywhere (ADR 0059: click-only, never hover). The painted chip is
    // kept whole and becomes the button's face.
    const tips = [];
    const chips = (expanded ? ordered : shown).map((t) => {
      const face = tagChip(t, ctx);
      const [btn, note] = disclosure({
        noteId: `${idPrefix}-${t.replace(":", "-")}`,
        label: `${face.textContent} — why`,
        text: tagTip(t, { ...ctx, note: notes?.[t], recipe, fromAddOn: own ? !own.has(t) : false, trace: live }),
        glyph: face.textContent,
      });
      btn.className = `${face.className} tag-tip-btn`;
      note.classList.add("is-info");
      tips.push(note);
      return btn;
    });
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
    container.replaceChildren(...chips, ...tips);
  }

  return {
    /** `trace` replaces the row's trace entries when composition moved them
     *  (an ingredient or add-on carrying its own); omitted, it keeps them. */
    paint(tags, trace) {
      current = tags || [];
      if (trace !== undefined) traceNow = trace || [];
      draw();
    },
  };
}
