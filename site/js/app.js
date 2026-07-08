// Home screen: load data, render cards, wire the sticky filter bar.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants } from "./data.js";
import { deriveFacets, applyFilters, DEFAULT_FILTERS } from "./filters.js";
import { sortByDistance, formatDistance } from "./distance.js";
import { openStatus, nzNow, viewerOnNzTime } from "./hours.js";
import { initPicker } from "./picker.js";
import { buildIndex, search } from "./search.js";
import { initOrderUI } from "./cart-ui.js";

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
    const now = nzNow(); // one clock read per render: filter, sort and cards
    let shown = applyFilters(restaurants, state, now);
    if (state.origin) shown = sortByDistance(shown, state.origin);
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

  // Only a viewer off NZ time needs telling the badges are NZ time.
  if (!viewerOnNzTime()) {
    const note = document.getElementById("tz-note");
    if (note) note.hidden = false;
  }

  wireOpenNow(state, render);
  wireSearch(restaurants);

  render();
  initPicker(() => applyFilters(restaurants, state, nzNow()));
  initOrderUI();
  document.body.classList.add("app-ready");
}

// Global search: one box that jumps to a place or a dish by name across all
// venues (and Cook at Home). Runs over the already-loaded data — offline,
// zero-dep. While a query is live, the browse view (cards, filters, toggles)
// hides via `body.searching` and a grouped results list takes its place;
// clearing the box restores browse. Purely additive to the fail-soft list.
function wireSearch(restaurants) {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const summary = document.getElementById("search-summary");
  const groups = document.getElementById("search-groups");
  if (!form || !input) return;

  form.hidden = false;
  const index = buildIndex(restaurants);

  // A tab-hint icon precedes the venue name so the two groups read at a glance.
  const placeIcon = (p) => (p.kind === "recipes" ? "🏠" : "🍽️");

  function renderResults(q) {
    const { places, dishes } = search(index, q);
    groups.replaceChildren();

    if (places.total === 0 && dishes.total === 0) {
      summary.textContent = `Nothing matches “${q}”. Try a place or dish name.`;
      return;
    }
    summary.textContent =
      `${places.total} place${places.total === 1 ? "" : "s"}, ` +
      `${dishes.total} dish${dishes.total === 1 ? "" : "es"} for “${q}”.`;

    if (places.items.length) {
      groups.append(resultGroup("Places", places, (p) =>
        resultRow(`restaurant.html?id=${p.id}`, `${placeIcon(p)} ${p.name}`,
          [p.area, (p.cuisine || []).join(", ")].filter(Boolean).join(" · "))
      ));
    }
    if (dishes.items.length) {
      groups.append(resultGroup("Dishes", dishes, (d) =>
        resultRow(d.href, d.name,
          [d.venueName, d.section].filter(Boolean).join(" · "))
      ));
    }
  }

  function resultGroup(title, { items, total }, rowFor) {
    const head = el("h3", { className: "search-group-title" }, [
      el("span", { textContent: title }),
      el("span", {
        className: "search-group-count",
        textContent: total > items.length ? `${items.length} of ${total}` : String(total),
      }),
    ]);
    const list = el("ul", { className: "search-list" }, items.map(rowFor));
    return el("section", { className: "search-group" }, [head, list]);
  }

  function resultRow(href, name, sub) {
    return el("li", { className: "search-row" }, [
      el("a", { className: "search-link", href }, [
        el("span", { className: "search-row-name", textContent: name }),
        sub ? el("span", { className: "search-row-sub", textContent: sub }) : null,
      ]),
    ]);
  }

  function update() {
    const q = input.value.trim();
    const active = q.length >= 2;
    document.body.classList.toggle("searching", active);
    results.hidden = !active;
    if (active) renderResults(q);
    else groups.replaceChildren();
  }

  input.addEventListener("input", update);
  // Submit is a no-op (results are live); just don't reload the page.
  form.addEventListener("submit", (e) => e.preventDefault());
  // Esc clears and returns to browse, even from the native clear button path.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      input.value = "";
      update();
    }
  });
}

// "Open now" filter: show only venues currently open (or closing soon).
// Unknown-hours venues and recipes drop out — the honest reading of "open".
function wireOpenNow(state, render) {
  const btn = document.getElementById("open-now");
  if (!btn) return;
  btn.addEventListener("click", () => {
    state.openNow = !state.openNow;
    btn.setAttribute("aria-pressed", String(state.openNow));
    render();
  });
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
