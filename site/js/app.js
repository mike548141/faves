// Home screen: load data, render cards, wire the sticky filter bar.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants } from "./data.js";
import { deriveFacets, applyFilters, DEFAULT_FILTERS } from "./filters.js";
import { formatDistance } from "./distance.js";
import { rankVenues, isAvailableNow } from "./ranking.js";
import { openStatus, nzNow, viewerOnNzTime } from "./hours.js";
import { initPicker } from "./picker.js";
import { buildIndex, search } from "./search.js";
import { initOrderUI } from "./cart-ui.js";
import { favourites, favHref } from "./favourites.js";
import { heartButton } from "./favourites-ui.js";
import { groupSection } from "./results-view.js";

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
    const now = nzNow(); // one clock read per render: filter, rank and cards
    let shown = applyFilters(restaurants, state, now);
    // Default order floats open/nearby venues up, sinks closed/faraway ones;
    // distance refines it only once "Near me" has given us an origin.
    shown = rankVenues(shown, { now, origin: state.origin });
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
  wireFavourites();

  render();
  // The shuffle prefers places you can actually order from now (open or
  // opening soon, and within reach if we know where you are); it falls back
  // to the whole filtered set only if none are available, so it never dead-ends.
  initPicker(() => {
    const now = nzNow();
    const filtered = applyFilters(restaurants, state, now);
    const available = filtered.filter((r) => isAvailableNow(r, { now, origin: state.origin }));
    return available.length ? available : filtered;
  });
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

  const groupCount = ({ items, total }) =>
    total > items.length ? `${items.length} of ${total}` : total;

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
      groups.append(
        groupSection({
          title: "Places",
          count: groupCount(places),
          rows: places.items.map((p) => ({
            name: `${placeIcon(p)} ${p.name}`,
            sub: [p.area, (p.cuisine || []).join(", ")].filter(Boolean).join(" · "),
            href: `restaurant.html?id=${p.id}`,
          })),
        })
      );
    }
    if (dishes.items.length) {
      groups.append(
        groupSection({
          title: "Dishes",
          count: groupCount(dishes),
          rows: dishes.items.map((d) => ({
            name: d.name,
            sub: [d.venueName, d.section].filter(Boolean).join(" · "),
            href: d.href,
          })),
        })
      );
    }
  }

  function update() {
    const q = input.value.trim();
    const active = q.length >= 2;
    if (active) exitFavourites(); // search and the favourites view are exclusive
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

// Search and the Favourites view both take over the browse area, so turning
// one on turns the other off. These operate on the DOM (not closures) so
// either wiring can call the other.
function exitSearch() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  if (input) input.value = "";
  document.body.classList.remove("searching");
  if (results) results.hidden = true;
}
function exitFavourites() {
  const btn = document.getElementById("favourites-toggle");
  const panel = document.getElementById("favourites-panel");
  if (btn) btn.setAttribute("aria-pressed", "false");
  document.body.classList.remove("faves-view");
  if (panel) panel.hidden = true;
}

// Favourites view: a ♥ toggle beside the search box opens a panel that
// gathers the venues and dishes hearted across the app (from localStorage,
// so it works offline and needs no data reload). Rows link out and carry
// their own heart to un-favourite in place. Empty until you save something.
function wireFavourites() {
  const btn = document.getElementById("favourites-toggle");
  const panel = document.getElementById("favourites-panel");
  const summary = document.getElementById("favourites-summary");
  const groups = document.getElementById("favourites-groups");
  if (!btn || !panel) return;
  btn.hidden = false;

  const favRow = (e) => ({
    name: e.type === "venue" ? `${e.isRecipe ? "🏠" : "🍽️"} ${e.venueName}` : e.name,
    sub: e.sub || (e.type === "dish" ? e.venueName : ""),
    href: favHref(e),
    trailing: heartButton(e, e.name || e.venueName),
  });

  function render() {
    const venues = favourites.venues();
    const dishes = favourites.dishes();
    groups.replaceChildren();
    if (venues.length === 0 && dishes.length === 0) {
      summary.textContent = "No favourites yet. Tap ♡ on a place or a dish to save it here.";
      return;
    }
    summary.textContent =
      `${venues.length} place${venues.length === 1 ? "" : "s"}, ` +
      `${dishes.length} dish${dishes.length === 1 ? "" : "es"} saved.`;
    if (venues.length) groups.append(groupSection({ title: "Places", rows: venues.map(favRow) }));
    if (dishes.length) groups.append(groupSection({ title: "Dishes", rows: dishes.map(favRow) }));
  }

  function open(on) {
    if (on) exitSearch();
    btn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("faves-view", on);
    panel.hidden = !on;
    if (on) render();
  }

  btn.addEventListener("click", () =>
    open(!document.body.classList.contains("faves-view"))
  );

  const countEl = btn.querySelector(".favourites-count");
  const updateCount = () => {
    const n = favourites.count();
    if (countEl) countEl.textContent = n ? String(n) : "";
    if (document.body.classList.contains("faves-view")) render();
  };
  favourites.subscribe(updateCount);
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.favourites.v1") favourites.reload();
  });
  updateCount();
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
