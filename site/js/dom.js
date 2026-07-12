// Shared DOM helper — one hyphen-aware `el()` for the whole app.
//
// The whole point is the hyphen check: aria-* / data-* keys are *attributes*,
// not IDL properties, so plain `node[k] = v` (what an Object.assign version
// does) sets an inert JS expando the browser ignores — accessible names and
// data-i18n keys silently vanish. This module is the single source of truth so
// that trap can't be re-sprung: import it, never re-roll a local copy.
//
// `props`: string keys → attribute (if hyphenated) or property (otherwise).
// `children`: a node/string or an array of them; null/undefined are skipped so
// callers can inline conditionals (`cond && el(...)`).
export const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.includes("-")) node.setAttribute(k, v);
    else node[k] = v;
  }
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};
