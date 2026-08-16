// Shared "Places / Dishes" grouped list, used by both the global search
// panel and the Favourites view so they look and behave identically. Pure
// DOM building — the callers supply the data and (optionally) a trailing
// control per row (e.g. a heart to un-favourite in place).

import { el } from "./dom.js";

// Theme 27b — "say which field matched". Wraps the first case-insensitive
// occurrence of `needle` inside `text` in a <mark>, as DOM nodes ready to
// append. Built from text nodes + one <mark>, never innerHTML, so nothing in
// a venue's own data can inject markup. A missing/unmatched `needle` falls
// back to a single text node, so an ordinary call (favourites rows, which
// pass no needle) behaves exactly as it did before this theme.
//
// The <mark> is a bonus for sighted readers, not the only carrier of the
// fact: the word it wraps is already part of `text`, so a screen reader
// announces the identical words either way — the highlight adds emphasis, it
// doesn't add information a screen-reader user would otherwise miss. Where a
// match has NO visible field to underline (search.js's `matchField` came
// back without a `matchText`), `resultRow`'s `note` below carries the same
// fact as ordinary text instead, so that case doesn't rely on a highlight at
// all.
function markedNodes(text, needle) {
  if (!needle) return [text];
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return [text];
  return [
    text.slice(0, i),
    el("mark", { className: "search-match" }, [text.slice(i, i + needle.length)]),
    text.slice(i + needle.length),
  ].filter((part) => part !== "");
}

/**
 * One row: a link (name + optional sub) plus an optional trailing node.
 *
 * `nameMatch`/`subMatch` (Theme 27b) are the literal substring of `name`/
 * `sub` that answered the search query — pass the `matchText` search.js
 * returns for whichever of the two carries it, omit both otherwise. `note`
 * is plain visible text (e.g. "Matched: address") for a hit whose field
 * isn't shown in `name` or `sub` at all, so that case still states its
 * reason rather than leaving the row unexplained.
 */
export function resultRow({ name, sub, href, trailing, nameMatch, subMatch, note }) {
  const link = el("a", { className: "search-link", href }, [
    el("span", { className: "search-row-name" }, markedNodes(name, nameMatch)),
    sub ? el("span", { className: "search-row-sub" }, markedNodes(sub, subMatch)) : null,
    note ? el("span", { className: "search-row-note", textContent: note }) : null,
  ]);
  return el("li", { className: "search-row" }, [link, trailing || null]);
}

/** One group: a title (with optional count) over a list of rows. */
export function groupSection({ title, count, rows }) {
  const head = el("h3", { className: "search-group-title" }, [
    el("span", { textContent: title }),
    count != null ? el("span", { className: "search-group-count", textContent: String(count) }) : null,
  ]);
  return el("section", { className: "search-group" }, [
    head,
    el("ul", { className: "search-list" }, rows.map(resultRow)),
  ]);
}
