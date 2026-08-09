// Recipe detail screen. Opened by tapping a dish name in the Cook at Home
// list: recipe.html?id=<collection>&dish=<slug>. Shows the whole recipe on
// its own focused, shareable page — meta, photo, ingredients, method, and
// "goes well with" links to the other recipes. Self-contained helpers, in
// keeping with the other screen modules.

import { loadRestaurant } from "./data.js";
import { slug } from "./slug.js";
import { initOrderUI } from "./cart-ui.js";
import { initTransferReceive } from "./personal-io-ui.js";
import { heartButton } from "./favourites-ui.js";
import { settings } from "./settings.js";
import { convertTemperatures } from "./units.js";
import { profiles, PROFILES_KEY } from "./profiles.js";
import { initReo, translate } from "./reo.js";
import { cookButton } from "./cook-ui.js";
import { el } from "./dom.js";

const root = document.getElementById("recipe-root");
const EMPTY_SET = new Set();

// --- Tag vocabulary → display (mirrors menu.js) ----------------------
const DIETARY = {
  v: "Veg", vg: "Vegan", gf: "GF", df: "DF",
  "gf-option": "GF option", "v-option": "Veg option",
};
const ALLERGEN = {
  "contains-nuts": "Contains nuts",
  "contains-peanuts": "Contains peanuts",
  "contains-shellfish": "Contains shellfish",
  "contains-egg": "Contains egg",
  "contains-dairy": "Contains dairy",
  "contains-gluten": "Contains gluten",
  "contains-soy": "Contains soy",
  "contains-sesame": "Contains sesame",
};
const isAllergen = (t) => t in ALLERGEN;
const isSpicy = (t) => /^spicy-[123]$/.test(t);

function tagChip(t, avoid = EMPTY_SET) {
  if (isAllergen(t)) {
    const cls = avoid.has(t) ? "tag tag-allergen is-flagged" : "tag tag-allergen";
    return el("span", { className: cls, textContent: `⚠ ${ALLERGEN[t]}` });
  }
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
    // Foreground any allergen the viewer flagged in their preferences.
    const avoid = new Set(settings.get().diet.avoid);
    const tags = el("div", { className: "dish-tags" });
    for (const t of tagOrder(item.tags)) tags.append(tagChip(t, avoid));
    parts.push(tags);
  }

  // Cook mode sits above the recipe, not below it: someone who opened this page
  // to cook from should not have to scroll past the method to find it. Absent on
  // the one recipe with no steps (cook-ui returns null) — nothing to step through.
  const cook = cookButton(item);
  if (cook) parts.push(el("div", { className: "cook-start-row" }, [cook]));

  if (item.ingredients?.length) {
    parts.push(el("h2", { className: "recipe-head", "data-i18n": "recipe.ingredients", textContent: "Ingredients" }));
    const ul = el("ul", { className: "ingredients" });
    for (const ing of item.ingredients) ul.append(el("li", { textContent: ing }));
    parts.push(ul);
  }
  if (item.steps?.length) {
    parts.push(el("h2", { className: "recipe-head", "data-i18n": "recipe.method", textContent: "Method" }));
    // Oven temperatures live inside the step text, so an imperial reader gets
    // the °C swapped for °F as the step is built (units.js, ADR 0029). The
    // stored recipe is untouched; settings.subscribe below repaints on a flip.
    const units = settings.get().units;
    const ol = el("ol", { className: "method" });
    for (const step of item.steps) {
      ol.append(el("li", { textContent: convertTemperatures(step, units) }));
    }
    parts.push(ol);
  }

  if (item.goesWith?.length) {
    const wrap = el("div", { className: "dish-pairs" }, [
      el("span", { className: "dish-pairs-label", "data-i18n": "menu.goesWith", textContent: "Goes well with" }),
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
  // Chrome renders in English with data-i18n keys; apply the stored language
  // (later switches re-translate the whole page via reo's subscription).
  translate(root);
  root.setAttribute("aria-busy", "false");
}

// The recipe on screen, held so a live settings change can repaint it with the
// SAME render() the first paint used (its ⚠ allergen tags are recomputed from
// fresh prefs — no separate, drift-prone update path). null until first render.
let current = null;

// Re-apply on any settings change — re-reads settings.get().diet.avoid and
// rebuilds the tags. No-op until the recipe has rendered.
function reRender() {
  if (current) render(current.collection, current.item);
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
    current = { collection, item };
    render(collection, item);
  } catch (err) {
    console.error("Recipe load failed:", err);
    fail();
  }
}

initOrderUI(); // the running order stays reachable from the recipe screen too
initTransferReceive(); // a transfer link can land on any screen (Theme 9 v1)
initReo(); // sets <html lang>; the back link is set to the collection name by render()

// Keep the ⚠ allergen tags live against an allergen/dietary change made in
// ANOTHER tab (home/menu Settings) — the recipe screen has no Settings dialog of
// its own, so an in-tab settings.set won't fire here, but a cross-tab write to
// this profile's settings key must still re-apply. settings.subscribe drives the
// repaint; the storage listener re-reads on the cross-tab write. (Matches how the
// menu/home screens react — previously this page only handled a profile switch.)
settings.subscribe(reRender);

const activeProfileAtLoad = profiles.activeId();
window.addEventListener("storage", (e) => {
  // A cross-tab profile switch: reload the registry; if the active person
  // changed, a full reload re-points favourites + allergen prefs atomically —
  // the safest reset for a page with no in-tab switcher.
  if (e.key === PROFILES_KEY) {
    profiles.reload();
    if (profiles.activeId() !== activeProfileAtLoad) location.reload();
    return;
  }
  // A cross-tab allergen/dietary (or any settings) change to THIS profile:
  // re-read so settings.subscribe → reRender repaints the tags, never lagging.
  if (e.key === profiles.scopedKey("faves.settings.v1")) settings.reload();
});

main();
