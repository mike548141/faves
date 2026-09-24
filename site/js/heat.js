// The heat scale's WORDS, in one place (roadmap 200/080, owner-ruled 2026-09-21).
//
// `spicy-1`/`spicy-2`/`spicy-3` is a closed scale — `TAGS` in tools/validate.py —
// and until this module it had two renderings and one silence:
//
//   • menu.js and recipe.js each carried `const isSpicy = (t) => /^spicy-[123]$/`
//     and each built `${"🌶".repeat(level)} Spicy` from it. One rule, two
//     implementations, both locally correct, and a change to the wording that
//     landed in one of them would have read correct in every diff.
//   • addons-ui.js — the ADD-ON PICKER — had neither. `validate.py` accepts a
//     `spicy-*` tag on an option, so "Hot chilli" validated and shipped tagged
//     `spicy-2`, and the picker offered it beside a mild one with nothing to tell
//     them apart. A chilli sauce that renders as neutral is a SILENCE ABOUT HEAT,
//     and the owner's ruling on 200/080 was to name the screen rather than delete
//     the data: render it, in the words the dish row already uses.
//
// So the three surfaces import from here and none of them owns the vocabulary.
// Adding a fourth level means editing `TAGS`, then this regex, and nothing else.
//
// 🚩 THE LEVEL IS CARRIED IN WORDS AS WELL AS IN GLYPHS. "🌶🌶 Spicy" is one
// string, deliberately — an emoji-only chip would put the whole of the meaning in
// a picture, which fails WCAG 2.2 AA for a reader whose font, screen reader or
// emoji-suppressed rendering drops it. The word "Spicy" survives all three.
// Nothing here carries meaning by COLOUR either; `.tag-spicy` in app.css is
// weighting, not information.
//
// 🛑 NOT TRANSLATED. reo.js's SAFETY BOUNDARY keeps every tag chip in English on
// purpose (a misread could hurt someone), and heat is a tag chip. Nothing here
// carries an i18n key, which is what makes it fall through to English — the same
// treatment `⚠ Contains nuts` and `Veg` already get.

// One capture group, so the level is read off the match rather than off
// `tag.slice(-1)` — the slice was what both copies did, and it answers "1" for a
// hypothetical `spicy-11` that the regex would already have refused.
const SPICY = /^spicy-([123])$/;

/** Is this tag a heat level at all? The gate in front of every use below. */
export const isSpicy = (tag) => SPICY.test(tag);

/** 1, 2 or 3 — or 0 for anything that is not a heat tag. Never throws. */
export function heatLevel(tag) {
  const m = SPICY.exec(tag);
  return m ? Number(m[1]) : 0;
}

/**
 * The chip's words: "🌶🌶 Spicy".
 *
 * Returns "" for a non-heat tag rather than guessing, so a caller that skipped
 * `isSpicy` paints nothing instead of painting "  Spicy" — an empty chip is a
 * visible bug and a wrong one is a claim about food.
 */
export function heatLabel(tag) {
  const level = heatLevel(tag);
  return level > 0 ? `${"🌶".repeat(level)} Spicy` : "";
}
