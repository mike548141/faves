// Home screen: load data, render cards, wire the sticky filter bar.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants } from "./data.js";
import { deriveFacets, applyFilters, DEFAULT_FILTERS } from "./filters.js";
import { initPicker } from "./picker.js";

const SERVICE_LABEL = { "dine-in": "Dine-in", takeaway: "Takeaway" };

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
};

function servicesText(services = []) {
  return services.map((s) => SERVICE_LABEL[s] || s).join(", ");
}

function card(r) {
  const isRecipes = r.kind === "recipes";
  const name = el("h3", { className: "card-name", textContent: r.name });

  let meta;
  if (isRecipes) {
    const n = (r.menu || []).reduce((sum, s) => sum + (s.items?.length || 0), 0);
    meta = el("p", { className: "card-meta" }, [
      el("span", { className: "card-area", textContent: "Cook at home" }),
      el("span", { textContent: n ? `${n} recipe${n === 1 ? "" : "s"}` : "Recipes coming soon" }),
    ]);
  } else {
    meta = el("p", { className: "card-meta" }, [
      el("span", { className: "card-area", textContent: r.area || "" }),
      el("span", { textContent: servicesText(r.services) }),
    ]);
  }

  const chips = el("div", { className: "chip-row" });
  if (r.status === "stub") {
    const label = isRecipes ? "Recipes coming soon" : "Menu coming soon";
    chips.append(el("span", { className: "chip chip-status", textContent: label }));
  } else if (isRecipes) {
    chips.append(el("span", { className: "chip chip-recipes", textContent: "🏠 Recipes" }));
  } else {
    for (const c of r.cuisine || []) {
      chips.append(el("span", { className: "chip chip-cuisine", textContent: c }));
    }
  }

  const li = el("li", { className: isRecipes ? "card card-recipes" : "card" });
  li.dataset.status = r.status;

  if (r.status === "stub") {
    li.append(el("div", { className: "card-body" }, [name, meta, chips]));
  } else {
    const link = el("a", { className: "card-link", href: `restaurant.html?id=${r.id}` }, [
      name,
      meta,
      chips,
    ]);
    li.append(link);
  }
  return li;
}

function fillSelect(select, values, allLabel) {
  select.append(el("option", { value: "all", textContent: allLabel }));
  for (const v of values) {
    select.append(el("option", { value: v, textContent: v }));
  }
}

function init(restaurants) {
  const listEl = document.getElementById("restaurant-list");
  const countEl = document.getElementById("result-count");
  const emptyEl = document.getElementById("empty-state");
  const areaSel = document.getElementById("filter-area");
  const cuisineSel = document.getElementById("filter-cuisine");
  const serviceBtns = [...document.querySelectorAll(".segmented button")];

  const { areas, cuisines } = deriveFacets(restaurants);
  fillSelect(areaSel, areas, "All areas");
  fillSelect(cuisineSel, cuisines, "All cuisines");

  const state = { ...DEFAULT_FILTERS };

  function render() {
    const shown = applyFilters(restaurants, state);
    listEl.replaceChildren(...shown.map(card));
    emptyEl.hidden = shown.length !== 0;
    const n = shown.length;
    const total = restaurants.length;
    countEl.textContent =
      n === total ? `${total} places` : `${n} of ${total} place${n === 1 ? "" : "s"}`;
  }

  serviceBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.service = btn.dataset.service;
      serviceBtns.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      render();
    });
  });

  areaSel.addEventListener("change", () => {
    state.area = areaSel.value;
    areaSel.dataset.active = areaSel.value;
    render();
  });
  cuisineSel.addEventListener("change", () => {
    state.cuisine = cuisineSel.value;
    cuisineSel.dataset.active = cuisineSel.value;
    render();
  });

  render();
  initPicker(() => applyFilters(restaurants, state));
  document.body.classList.add("app-ready");
}

loadRestaurants()
  .then(init)
  .catch((err) => {
    // Leave the static fallback list in place; just note it.
    console.error("Faves: falling back to static list.", err);
  });
