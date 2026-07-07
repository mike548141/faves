// One definition of the dish/section slug, shared by every screen that
// builds or resolves a `#dish-…` anchor or a `?dish=` query. Global search
// (search.js) deep-links to dish anchors that menu.js/recipe.js render, so
// the slugging MUST be identical — keeping it here makes that guaranteed,
// not coincidental. (Was duplicated verbatim in menu.js and recipe.js.)
export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
