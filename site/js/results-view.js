// Shared "Places / Dishes" grouped list, used by both the global search
// panel and the Favourites view so they look and behave identically. Pure
// DOM building — the callers supply the data and (optionally) a trailing
// control per row (e.g. a heart to un-favourite in place).

import { el } from "./dom.js";

/** One row: a link (name + optional sub) plus an optional trailing node. */
export function resultRow({ name, sub, href, trailing }) {
  const link = el("a", { className: "search-link", href }, [
    el("span", { className: "search-row-name", textContent: name }),
    sub ? el("span", { className: "search-row-sub", textContent: sub }) : null,
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
