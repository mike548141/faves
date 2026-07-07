// Home screen: load data, render cards, wire the sticky filter bar.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants } from "./data.js";
import { deriveFacets, applyFilters, DEFAULT_FILTERS } from "./filters.js";
import { sortByDistance, formatDistance } from "./distance.js";
import { openStatus, nzNow } from "./hours.js";
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

// Lazy, layout-stable card photo (only when the venue has one).
function cardPhoto(r) {
  if (!r.image) return null;
  return el("img", {
    className: "card-photo",
    src: r.image,
    alt: r.alt || "",
    loading: "lazy",
    decoding: "async",
  });
}

// Live open/closed badge from the venue's hours (null hours → no badge).
function hoursBadge(r, now) {
  const st = openStatus(r.hours, now);
  if (st.state === "unknown") return null;
  const text = st.detail ? `${st.label} · ${st.detail}` : st.label;
  const badge = el("span", { className: "hours-badge", textContent: text });
  badge.dataset.state = st.state;
  return el("p", { className: "card-hours" }, [badge]);
}

function card(r, now) {
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
    // In "Near me" mode a venue carries distanceKm; show it first, as the
    // most decision-relevant fact once you've asked "what's close".
    const dist =
      r.distanceKm != null
        ? el("span", { className: "card-distance", textContent: `📍 ${formatDistance(r.distanceKm)}` })
        : null;
    meta = el("p", { className: "card-meta" }, [
      dist,
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

  // A venue (not a stub, not recipes) gets a live open/closed badge.
  const badge = !isRecipes && r.status !== "stub" ? hoursBadge(r, now) : null;

  const li = el("li", { className: isRecipes ? "card card-recipes" : "card" });
  li.dataset.status = r.status;

  if (r.status === "stub") {
    li.append(el("div", { className: "card-body" }, [cardPhoto(r), name, meta, chips]));
  } else {
    const link = el("a", { className: "card-link", href: `restaurant.html?id=${r.id}` }, [
      cardPhoto(r),
      name,
      meta,
      badge,
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

  // origin holds the user's {lat, lng} once "Near me" is on; null otherwise.
  const state = { ...DEFAULT_FILTERS, origin: null };

  function render() {
    let shown = applyFilters(restaurants, state);
    if (state.origin) shown = sortByDistance(shown, state.origin);
    const now = nzNow(); // one clock read per render, shared by every card
    listEl.replaceChildren(...shown.map((r) => card(r, now)));
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

  wireNearMe(state, render);

  render();
  initPicker(() => applyFilters(restaurants, state));
  document.body.classList.add("app-ready");
}

// "Near me": sort the list by distance from the device's location. Purely
// additive — geolocation is feature-detected and the button stays hidden
// (and the plain list stays) where it's unavailable or blocked.
function wireNearMe(state, render) {
  const btn = document.getElementById("near-me");
  const status = document.getElementById("geo-status");
  if (!btn || !("geolocation" in navigator)) return;
  btn.hidden = false;

  const setStatus = (msg) => {
    status.textContent = msg || "";
    status.hidden = !msg;
  };
  const setPressed = (on) => {
    btn.setAttribute("aria-pressed", String(on));
    btn.querySelector(".near-me-label").textContent = on ? "Nearest first" : "Near me";
  };

  btn.addEventListener("click", () => {
    if (state.origin) {
      // Toggle off → back to the curated order.
      state.origin = null;
      setPressed(false);
      setStatus("");
      render();
      return;
    }
    btn.disabled = true;
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        btn.disabled = false;
        state.origin = { lat: coords.latitude, lng: coords.longitude };
        setPressed(true);
        setStatus("Sorted by distance from you.");
        render();
      },
      (err) => {
        btn.disabled = false;
        setPressed(false);
        // Denied is the common, non-error case; be matter-of-fact.
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? "Location off — showing our usual order."
            : "Couldn't get your location — showing our usual order."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

loadRestaurants()
  .then(init)
  .catch((err) => {
    // Leave the static fallback list in place; just note it.
    console.error("Faves: falling back to static list.", err);
  });
