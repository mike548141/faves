// Recipe detail screen. Opened by tapping a dish name in the Cook at Home
// list: recipe.html?id=<collection>&dish=<slug>. Shows the whole recipe on
// its own focused, shareable page — meta, photo, ingredients, method, and
// "goes well with" links to the other recipes. Self-contained helpers, in
// keeping with the other screen modules.

import { loadRestaurant } from "./data.js";
import { slug } from "./slug.js";
import { initOrderUI } from "./cart-ui.js";
import { heartButton } from "./favourites-ui.js";

const root = document.getElementById("recipe-root");

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

// --- Tag vocabulary → display (mirrors menu.js) ----------------------
const DIETARY = {
  v: "Veg", vg: "Vegan", gf: "GF", df: "DF",
  "gf-option": "GF option", "v-option": "Veg option",
};
const ALLERGEN = {
  "contains-nuts": "Contains nuts",
  "contains-peanuts": "Contains peanuts",
  "contains-shellfish": "Contains shellfish",
};
const isAllergen = (t) => t in ALLERGEN;
const isSpicy = (t) => /^spicy-[123]$/.test(t);

function tagChip(t) {
  if (isAllergen(t)) return el("span", { className: "tag tag-allergen", textContent: `⚠ ${ALLERGEN[t]}` });
  if (isSpicy(t)) {
    const level = Number(t.slice(-1));
    return el("span", { className: "tag tag-spicy", textContent: `${"🌶".repeat(level)} Spicy` });
  }
  if (t in DIETARY) return el("span", { className: "tag tag-diet", textContent: DIETARY[t] });
  return el("span", { className: "tag", textContent: t });
}
// Allergen warnings first (safety), then the rest.
const tagOrder = (tags) => [...tags].sort((a, b) => Number(isAllergen(b)) - Number(isAllergen(a)));

function findDish(collection, dishSlug) {
  for (const section of collection.menu || []) {
    for (const item of section.items || []) {
      if (slug(item.name) === dishSlug) return item;
    }
  }
  return null;
}

function fail() {
  document.getElementById("recipe-loading").hidden = true;
  document.getElementById("recipe-error").hidden = false;
  root.setAttribute("aria-busy", "false");
}

function render(collection, item) {
  const id = collection.id;
  document.title = `${item.name} — Faves`;
  const back = document.getElementById("recipe-back");
  back.href = `restaurant.html?id=${id}`;
  back.textContent = `← ${collection.name}`;

  const parts = [];
  const heart = heartButton(
    { type: "dish", venueId: id, venueName: collection.name, name: item.name, isRecipe: true },
    item.name
  );
  heart.classList.add("heart-lg");
  parts.push(
    el("div", { className: "menu-title-row" }, [
      el("h1", { className: "menu-title", textContent: item.name }),
      heart,
    ])
  );

  const metaBits = [item.serves ? `Serves ${item.serves}` : null, item.time || null].filter(Boolean);
  if (metaBits.length) parts.push(el("p", { className: "menu-sub", textContent: metaBits.join(" · ") }));
  if (item.desc) parts.push(el("p", { className: "recipe-lede", textContent: item.desc }));

  if (item.image) {
    parts.push(el("img", {
      className: "recipe-photo", src: item.image, alt: item.alt || "",
      loading: "lazy", decoding: "async",
    }));
  }

  if (item.tags?.length) {
    const tags = el("div", { className: "dish-tags" });
    for (const t of tagOrder(item.tags)) tags.append(tagChip(t));
    parts.push(tags);
  }

  if (item.ingredients?.length) {
    parts.push(el("h2", { className: "recipe-head", textContent: "Ingredients" }));
    const ul = el("ul", { className: "ingredients" });
    for (const ing of item.ingredients) ul.append(el("li", { textContent: ing }));
    parts.push(ul);
  }
  if (item.steps?.length) {
    parts.push(el("h2", { className: "recipe-head", textContent: "Method" }));
    const ol = el("ol", { className: "method" });
    for (const step of item.steps) ol.append(el("li", { textContent: step }));
    parts.push(ol);
  }

  if (item.goesWith?.length) {
    const wrap = el("div", { className: "dish-pairs" }, [
      el("span", { className: "dish-pairs-label", textContent: "Goes well with" }),
    ]);
    for (const ref of item.goesWith) {
      const hash = ref.indexOf("#");
      // A same-collection ref opens that recipe's page; a cross-record
      // "id#Dish" deep-links into that venue's menu.
      const href =
        hash === -1
          ? `recipe.html?id=${id}&dish=${slug(ref)}`
          : `restaurant.html?id=${ref.slice(0, hash)}#dish-${slug(ref.slice(hash + 1))}`;
      const name = hash === -1 ? ref : ref.slice(hash + 1);
      wrap.append(el("a", { className: "pair-chip", href, textContent: name }));
    }
    parts.push(wrap);
  }

  // recipe-body so the shared .ingredients/.method list styling applies.
  root.replaceChildren(el("article", { className: "recipe-detail-page recipe-body" }, parts));
  root.setAttribute("aria-busy", "false");
}

async function main() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const dishSlug = params.get("dish");
  if (!id || !dishSlug) return fail();
  try {
    const collection = await loadRestaurant(id);
    const item = findDish(collection, dishSlug);
    if (!item) return fail();
    render(collection, item);
  } catch (err) {
    console.error("Recipe load failed:", err);
    fail();
  }
}

initOrderUI(); // the running order stays reachable from the recipe screen too
main();
