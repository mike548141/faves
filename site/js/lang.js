// Menus in more than one language (ADR 0044).
//
// A menu outside New Zealand is not written in English, and the two things a
// reader needs from it pull in opposite directions:
//   • what the dish IS — in a language they read;
//   • what the dish is CALLED — in the script on the wall, so they can point at
//     it, and so the person taking the order recognises it.
// Faves shows both, rather than choosing.
//
// ————————————————————————— The shape —————————————————————————
//
// A dish's `name` stays a plain string, always. It is not just display text: it
// is the dish's IDENTITY — `slug(name)` is the anchor in the URL, `picks` refers
// to dishes by name, and a heart is stored as `d:<venueId> <name>`. Turning it
// into an object would have quietly detached every one of those. So renderings
// are ADDITIVE and sit beside it:
//
//   {
//     "name": "Tom yam kung",                    // canonical: identity + fallback
//     "desc": "Hot and sour prawn soup…",
//     "translations": {
//       "name": { "th": "ต้มยำกุ้ง" },
//       "desc": { "th": "ต้มยำกุ้งน้ำข้น…" }
//     }
//   }
//
// and the venue says what its canonical strings are written in:
//   { "language": "th" }        // absent = "en-NZ", the collection's own
//
// ————————————————————————— Why `lang` is not optional —————————————————————————
//
// WCAG 2.2 AA 3.1.2 (Language of Parts) requires a passage in another language
// to be marked as such. Without it a screen reader pronounces ต้มยำกุ้ง with
// English rules — not "slightly off", but unintelligible — and a browser may
// pick a font with no glyphs for the script. Accessibility is non-negotiable
// here (CLAUDE.md), so every rendering this module returns carries the tag it is
// in, and callers must put it on the element. That is the whole reason
// `renderings()` returns `{ text, lang }` pairs and never a bare string.

import { HOME_LANGUAGE } from "./home.js";
import { settings } from "./settings.js";

/** The collection's own language — what a record that says nothing is in. */
export { HOME_LANGUAGE } from "./home.js";

/** The BCP-47 tag a venue's canonical `name`/`desc`/`section` strings are in. */
export function venueLanguage(r) {
  return r?.language || HOME_LANGUAGE;
}

/** "en-NZ" → "en". Comparing tags at the primary subtag is the useful match:
 *  an en-GB reader is served fine by en-NZ text, and a th-Latn romanisation is
 *  Thai, not English. */
export const primarySubtag = (tag) => String(tag || "").toLowerCase().split("-")[0];

/**
 * Every rendering of one field, ordered best-first for this reader, as
 * `{ text, lang }`. The canonical string is always in the list — a translation
 * can be missing, but the dish always has a name.
 *
 * Order: the reader's own language, then the venue's own (the script on the
 * wall), then English as the widest fallback, then anything else. Ties keep
 * the order the data was written in, so a record stays in control of itself.
 */
export function renderings(obj, field, venueLang = HOME_LANGUAGE, readerLang = null) {
  const canonical = obj?.[field];
  if (typeof canonical !== "string" || !canonical.trim()) return [];
  const out = [{ text: canonical, lang: venueLang }];

  const extra = obj?.translations?.[field];
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    for (const [lang, text] of Object.entries(extra)) {
      // A translation that repeats the canonical string adds a duplicate line
      // and nothing else; drop it rather than render the same words twice.
      if (typeof text !== "string" || !text.trim() || text === canonical) continue;
      out.push({ text, lang });
    }
  }
  if (out.length === 1) return out;

  // Exact tag before primary-subtag, and that distinction is load-bearing: a
  // Thai menu whose canonical names are romanised says `"language": "th-Latn"`,
  // and a reader of Thai wants `th` — the script — not the romanisation that
  // shares its primary subtag. Without the exact tier the canonical string
  // would win on data order and the script would never lead.
  const readerTag = String(readerLang ?? readerLanguage()).toLowerCase();
  const venueTag = String(venueLang).toLowerCase();
  const reader = primarySubtag(readerTag);
  const venue = primarySubtag(venueTag);
  const rank = (r) => {
    const tag = String(r.lang).toLowerCase();
    const p = primarySubtag(tag);
    if (tag === readerTag) return 0;
    if (p === reader) return 1;
    if (tag === venueTag) return 2;
    if (p === venue) return 3;
    if (p === "en") return 4;
    return 5;
  };
  // A stable sort (guaranteed since ES2019) is what preserves data order
  // within a rank — so a record listing two romanisations keeps its own order.
  return out.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
}

/** The one rendering to lead with, or null when the field is empty. */
export function preferred(obj, field, venueLang = HOME_LANGUAGE, readerLang = null) {
  return renderings(obj, field, venueLang, readerLang)[0] ?? null;
}

/**
 * The renderings to show *beneath* the leading one — the original script, a
 * romanisation. Empty for the overwhelming majority of records, which carry no
 * translations at all and must render exactly as they always have.
 */
export function alternates(obj, field, venueLang = HOME_LANGUAGE, readerLang = null) {
  return renderings(obj, field, venueLang, readerLang).slice(1);
}

/**
 * The reader's language, from the UI language setting.
 *
 * Deliberately NOT a separate "content language" preference: a second dial for
 * a distinction almost nobody wants to draw is a settings row that has to be
 * understood before it can be ignored. If someone reads the interface in te reo
 * Māori, that is the best evidence we have about the menu too. Falls back to
 * the collection's own language when settings aren't up yet (module load order).
 */
export function readerLanguage() {
  try {
    return settings.get().lang || HOME_LANGUAGE;
  } catch {
    return HOME_LANGUAGE;
  }
}

/**
 * Every rendering of `field` as plain strings — for the search index, which
 * must match what a reader can see OR type. Someone hunting "ต้มยำ" and someone
 * hunting "tom yam" are both looking for the same dish.
 */
export function searchableText(obj, field, venueLang = HOME_LANGUAGE) {
  return renderings(obj, field, venueLang, HOME_LANGUAGE).map((r) => r.text);
}
