// Your own recipes, folded into the Cook at Home menu (roadmap 510/300) — pure,
// no DOM and no store, so it is unit-tested directly (tests/cookbook-menu.test.js).
//
// WHERE THEY SIT, and why. Every personal recipe already says which section it
// belongs to (`section`, kept when a published recipe was moved into the owner's
// cookbook — recipe-record.js's `personalCollection` builds its own virtual menu
// from the same field). So the page follows what the record says, and does not
// invent a taxonomy:
//
//   • a recipe whose `section` names one of the published sections ("Desserts")
//     is listed INSIDE that section, after the published recipes, so a reader
//     scanning Desserts sees all of them together ("all the recipes together
//     under Cook at home", owner, 2026-10-01);
//   • any other recipe gets a section of its own after the published ones, named
//     by its `section`, or "My recipes" when it carries none. The "My recipe"
//     label on the row (favourites-ui.js `ownerLabel`) is what says whose it is,
//     so a section is only ever a place to look, never the only signal.
//
// NOTHING IS WRITTEN. The result is a view built per render from this device's
// own store. It is never fetched, never saved into site/data/, and the published
// record passed in is never mutated: sections and their item arrays are copied.

import { composeRecipe } from "./ingredients.js";
import { MY_RECIPES_NAME } from "./recipe-record.js";
import { slug } from "./slug.js";

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/**
 * `record` (the published Cook at Home record) with every recipe in `map` (the
 * active person's cookbook, `{ "u:slug": record }`) added to its menu. Each
 * personal item is composed through `composeRecipe`, exactly as recipe.js does
 * for the recipe's own page, so an allergen its ingredients state is the same
 * allergen on the list and on the page. An untagged recipe stays untagged:
 * nothing here ever adds a tag, so "not stated" can never become "free from".
 *
 * With an empty cookbook the record comes back unchanged (same object).
 */
export function mergeCookbook(record, map) {
  const mine = Object.values(map || {}).sort(
    (a, b) => a.name.localeCompare(b.name) || a.dishId.localeCompare(b.dishId)
  );
  if (!mine.length) return record;
  const sections = (record.menu || []).map((s) => ({ ...s, items: [...(s.items || [])] }));
  const own = new Map(); // section name -> the sections this cookbook adds
  for (const r of mine) {
    const name = r.section || MY_RECIPES_NAME;
    const item = composeRecipe(r);
    // A section hidden from the menu (`addOnsOnly`) is not a place to list a
    // recipe: menu.js never renders it, and the recipe would vanish with it.
    const home = sections.find((s) => !s.addOnsOnly && same(s.section, name));
    if (home) {
      home.items.push(item);
      continue;
    }
    const key = name.trim().toLowerCase();
    if (!own.has(key)) own.set(key, { section: name, sectionId: `mine-${slug(name)}`, items: [] });
    own.get(key).items.push(item);
  }
  const added = [...own.values()].sort((a, b) => a.section.localeCompare(b.section));
  return { ...record, menu: [...sections, ...added] };
}
