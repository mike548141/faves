// Recipe detail screen. Opened by tapping a dish name in the Cook at Home
// list: recipe.html?id=<collection>&dish=<dish id>. Shows the whole recipe on
// its own focused, shareable page — meta, photo, ingredients, method, and
// "goes well with" links to the other recipes. Self-contained helpers, in
// keeping with the other screen modules.

import { loadRestaurant } from "./data.js";
import { slug } from "./slug.js";
import { dishId, findDish } from "./dish-id.js";
import { initOrderUI } from "./cart-ui.js";
import { initTransferReceive } from "./personal-io-ui.js";
import { heartButton } from "./favourites-ui.js";
import { settings } from "./settings.js";
import { convertTemperatures } from "./units.js";
import { profiles, PROFILES_KEY, reloadProfileStores } from "./profiles.js";
import { initReo, translate } from "./reo.js";
import { cookButton } from "./cook-ui.js";
import { CHECKLIST_KEY, checklist, recipeId } from "./checklist.js";
import { clearTicksButton, syncTicks, tickRow } from "./checklist-ui.js";
import { el } from "./dom.js";
// The app chrome behind the ⋯ menu. Until 2026-08-16 this page had none of it:
// a recipe could show CONTAINS GLUTEN chips with no route to the Settings that
// decide which allergens are flagged, and no way to reach Favourites, Share or
// About without going back twice (owner). Same modules, same markup and the
// same order as restaurant.html, so all three ⋯ menus read identically.
import { favourites } from "./favourites.js";
import { ratings } from "./ratings.js";
import { initAboutUI } from "./about-ui.js";
import { initShareApp } from "./share-app.js";
import { initReportEntry } from "./report-ui.js";
import { initOverflowMenu } from "./overflow-ui.js";
import { initSettingsUI } from "./settings-ui.js";

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

// The `?dish=` in the URL, resolved to a recipe. Delegated to the shared
// resolver (dish-id.js) rather than re-slugging every name here: that hand-
// rolled loop only ever matched a slugged name, so a recipe given an explicit
// id — or one whose id has moved on, leaving a `formerIds` trail — would 404 a
// link that used to work. The shared one also tries former ids last, which is
// what keeps an already-shared recipe link alive across a rename.
const recipeByRef = (collection, ref) => findDish(collection, ref)?.item ?? null;

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
    {
      type: "dish",
      venueId: id,
      venueName: collection.name,
      name: item.name,
      // Same key the collection's list screen hearts with, so the ♥ here and
      // the ♥ on the menu row are one heart, not two.
      dishId: dishId(item),
      isRecipe: true,
    },
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
  const cook = cookButton(item, { venueId: id });
  if (cook) parts.push(el("div", { className: "cook-start-row" }, [cook]));

  // Ticking off what you have already done (ROADMAP 17e). Every ingredient and
  // every step is a real checkbox, keyed on the RAW line — never on the
  // converted render, or an imperial reader would lose their ticks the moment
  // they flipped units, and never on the index, or an edited recipe would slide
  // every tick onto the wrong line (checklist.js).
  const rid = recipeId(id, item);
  if (item.ingredients?.length) {
    parts.push(el("h2", { className: "recipe-head", "data-i18n": "recipe.ingredients", textContent: "Ingredients" }));
    const ul = el("ul", { className: "ingredients" });
    for (const ing of item.ingredients) ul.append(el("li", {}, [tickRow(rid, "i", ing)]));
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
      ol.append(el("li", {}, [tickRow(rid, "s", step, convertTemperatures(step, units))]));
    }
    parts.push(ol);
  }
  if (item.ingredients?.length || item.steps?.length) {
    parts.push(el("div", { className: "tick-clear-row" }, [clearTicksButton(rid)]));
  }

  if (item.goesWith?.length) {
    const wrap = el("div", { className: "dish-pairs" }, [
      el("span", { className: "dish-pairs-label", "data-i18n": "menu.goesWith", textContent: "Goes well with" }),
    ]);
    for (const ref of item.goesWith) {
      const hash = ref.indexOf("#");
      // A same-collection ref opens that recipe's page; a cross-record
      // "id#Dish" deep-links into that venue's menu. Only the first can be
      // resolved here — the other record isn't loaded, and `slug(name)` is the
      // id of any dish that hasn't been given one, so it lands where it always
      // did and the target page resolves the rest.
      const here = hash === -1 ? findDish(collection, ref)?.item : null;
      const href =
        hash === -1
          ? `recipe.html?id=${id}&dish=${here ? dishId(here) : slug(ref)}`
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
  const dishRef = params.get("dish");
  if (!id || !dishRef) return fail();
  try {
    const collection = await loadRestaurant(id);
    const item = recipeByRef(collection, dishRef);
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

// The ⋯ menu's dialogs. Settings now lives on this page, so an allergen change
// made right here re-applies through the same settings.subscribe below that a
// cross-tab change already used — one path, not two.
function initChrome() {
  initAboutUI();
  initShareApp();
  initReportEntry();
  initOverflowMenu();
  initSettingsUI();
  // A profile switch inside that dialog must re-point THIS page's stores before
  // anything repaints, or the new person would inherit the last one's hearts.
  // settings.reload() fires last by contract, so the reRender below is already
  // the new person's. Without this line the ⋯ menu would have shipped a
  // cross-profile data leak, which is the whole reason it is here.
  profiles.subscribe(() => reloadProfileStores({ favourites, ratings, settings }));
  const nameEl = document.querySelector(".profile-caption-name");
  if (nameEl) {
    const setName = () => { nameEl.textContent = profiles.active().name; };
    setName();
    profiles.subscribe(setName);
  }
  const topbar = document.querySelector(".menu-topbar");
  if (topbar) translate(topbar);
}
initChrome();

// Keep the ⚠ allergen tags live against an allergen/dietary change — made in
// the Settings dialog now on this page, or in ANOTHER tab (home/menu Settings).
// settings.subscribe drives the repaint; the storage listener re-reads on the
// cross-tab write. (Matches how the menu/home screens react.)
settings.subscribe(reRender);

// Ticks can change from somewhere other than these boxes: Clear ticks, and cook
// mode ticking the same lines in the modal sitting over this page. Re-read them
// rather than re-render — `syncTicks` sets properties only, so the boxes follow
// without rebuilding the recipe underneath the reader.
checklist.subscribe(() => {
  if (current) syncTicks(root, recipeId(current.collection.id, current.item));
});

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
  // The same recipe open in two tabs: a line ticked in one shows ticked in the
  // other, which is the whole point of ticks that survive a phone call.
  if (e.key === profiles.scopedKey(CHECKLIST_KEY)) checklist.reload();
});

main();
