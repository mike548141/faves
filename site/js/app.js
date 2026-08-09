// Home screen: load data, render cards, wire the sticky filter bar.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants } from "./data.js";
import { deriveFacets, applyFilters, DEFAULT_FILTERS } from "./filters.js";
import { formatDriveTime, estimateDriveMinutes } from "./distance.js";
import { formatDistance } from "./units.js";
import { rankVenues, isAvailableNow } from "./ranking.js";
import { rankByDetour, bestBranchForRoute, areaCentroids } from "./route.js";
import { branchCoords, branchAsPlace } from "./locations.js";
import { rememberOrigin, routeMapsUrl } from "./geo.js";
import { openStatus, nzNow, viewerOnNzTime } from "./hours.js";
import { closureBadge } from "./closure-ui.js";
import { todayNZ } from "./temporal.js";
import { initPicker } from "./picker.js";
import { buildIndex, search } from "./search.js";
import { initOrderUI } from "./cart-ui.js";
import { favourites, favHref, groupForShare } from "./favourites.js";
import { heartButton } from "./favourites-ui.js";
import { encodeShortlist, buildShareUrl } from "./share-codec.js";
import { openShareDialog } from "./share-ui.js";
import { groupSection, resultRow } from "./results-view.js";
import { settings } from "./settings.js";
import { profiles, PROFILES_KEY } from "./profiles.js";
import { initSettingsUI } from "./settings-ui.js";
import { initAboutUI } from "./about-ui.js";
import { initShareApp } from "./share-app.js";
import { initOverflowMenu } from "./overflow-ui.js";
import { initBackToTop } from "./to-top.js";
import { priceBand } from "./price.js";
import { initReo, t } from "./reo.js";
import { el } from "./dom.js";
import { wireSearchClear } from "./search-clear.js";

const SERVICE_LABEL = { "dine-in": "Dine-in", takeaway: "Takeaway" };

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

// Typical price-per-person chip, derived from the venue's own menu prices
// (null when there's too little data — stubs, recipes, thin menus).
function priceChip(r) {
  const p = priceBand(r);
  if (!p) return null;
  const hasFigure = p.perPerson !== null;
  const chip = el("span", { className: "chip chip-price" }, [
    el("span", { className: "price-band", textContent: p.band }),
    ...(hasFigure ? [` ~$${p.perPerson}pp`] : []),
  ]);
  // Curated band = our call; derived band = estimated from the menu prices.
  if (p.curated) {
    chip.title = hasFigure
      ? `About $${p.perPerson} per person — our estimate for this place`
      : `Typical price band for this place`;
    chip.setAttribute(
      "aria-label",
      hasFigure
        ? `Around ${p.perPerson} dollars per person`
        : `Price band ${p.band.length} of 3`
    );
  } else {
    chip.title = `About $${p.perPerson} per person — estimated from ${p.count} menu prices`;
    chip.setAttribute(
      "aria-label",
      `Around ${p.perPerson} dollars per person, estimated from the menu`
    );
  }
  return chip;
}

// Live open/closed badge from the venue's hours (null hours → no badge).
// A lifecycle closure (refit, gone for good) outranks the weekly hours: showing
// "Open · until 9pm" for a shuttered venue would send someone across town.
function hoursBadge(r, now, showHours = true) {
  const closure = closureBadge(r, todayNZ());
  if (closure) return el("p", { className: "card-hours" }, [closure]);
  if (!showHours) return null;
  const st = openStatus(r.hours, now);
  if (st.state === "unknown") return null;
  const text = st.detail ? `${st.label} · ${st.detail}` : st.label;
  const badge = el("span", { className: "hours-badge", textContent: text });
  badge.dataset.state = st.state;
  return el("p", { className: "card-hours" }, [badge]);
}

// "+1.2 km detour" (or a warm "On your way" when a venue sits essentially on
// the line — a sub-100 m added distance is noise, not a detour worth a figure).
// The 100 m "noise" threshold stays metric on purpose: it's a judgement about
// when a figure is worth printing, not a figure anyone reads (ADR 0029).
function detourText(km, units) {
  if (km < 0.1) return t("route.onWay", "On your way");
  return `+${formatDistance(km, units)} ${t("route.detour", "detour")}`;
}

function card(r, now, routeCtx = null) {
  const isRecipes = r.kind === "recipes";
  const units = settings.get().units;
  const name = el("h3", { className: "card-name", textContent: r.name });
  // Route mode: the venue carries a detourKm (least added distance to your
  // trip); it takes over the distance slot as the decision-relevant fact.
  const onRoute = routeCtx && r.detourKm != null;

  let meta;
  if (isRecipes) {
    const n = (r.menu || []).reduce((sum, s) => sum + (s.items?.length || 0), 0);
    meta = el("p", { className: "card-meta" }, [
      el("span", { className: "card-area", textContent: "Cook at home" }),
      el("span", { textContent: n ? `${n} recipe${n === 1 ? "" : "s"}` : "Recipes coming soon" }),
    ]);
  } else if (onRoute) {
    // Detour is a STRAIGHT-LINE estimate (route.js), never road distance — shown
    // with the same "~" the drive-hint uses so it reads as approximate. The
    // "Route via maps" action (below) gives the real road route through here.
    const detour = el("span", { className: "card-detour", textContent: `↩ ${detourText(r.detourKm, units)}` });
    const min = r.detourKm >= 0.1 ? estimateDriveMinutes(r.detourKm) : null;
    const added =
      min != null
        ? el("span", { className: "card-drive", textContent: `~${min} min ${t("route.added", "added")}` })
        : null;
    meta = el("p", { className: "card-meta" }, [
      detour,
      added,
      el("span", { className: "card-area", textContent: r.area || "" }),
      el("span", { textContent: servicesText(r.services) }),
    ]);
  } else {
    // In "Near me" mode a venue carries distanceKm; show it first, as the
    // most decision-relevant fact once you've asked "what's close", then a
    // rough "~ min drive" hint. The hint is a straight-line estimate (ADR
    // 0010) — the maps app gives the real drive time when you tap the address.
    const dist =
      r.distanceKm != null
        ? el("span", { className: "card-distance", textContent: `📍 ${formatDistance(r.distanceKm, units)}` })
        : null;
    const drive =
      r.distanceKm != null
        ? el("span", { className: "card-drive", textContent: formatDriveTime(r.distanceKm) })
        : null;
    meta = el("p", { className: "card-meta" }, [
      dist,
      drive,
      el("span", { className: "card-area", textContent: r.area || "" }),
      el("span", { textContent: servicesText(r.services) }),
    ]);
  }

  const chips = el("div", { className: "chip-row" });
  if (r.status === "stub") {
    // ...unless it has closed for good: "Menu coming soon" for a venue that
    // will never serve again is worse than saying nothing. The closure badge
    // below carries the real news.
    if (r.closure?.state !== "closed-permanently") {
      const label = isRecipes ? "Recipes coming soon" : "Menu coming soon";
      chips.append(el("span", { className: "chip chip-status", textContent: label }));
    }
  } else if (isRecipes) {
    chips.append(el("span", { className: "chip chip-recipes", textContent: "🏠 Recipes" }));
  } else {
    const pc = priceChip(r);
    if (pc) chips.append(pc);
    for (const c of r.cuisine || []) {
      chips.append(el("span", { className: "chip chip-cuisine", textContent: c }));
    }
  }

  // A venue (not a stub, not recipes) gets a live open/closed badge — but a
  // CLOSURE shows on a stub too, since that is the one thing worth knowing
  // about a place whose menu we never captured.
  const badge = !isRecipes ? hoursBadge(r, now, r.status !== "stub") : null;

  const li = el("li", { className: isRecipes ? "card card-recipes" : "card" });
  li.dataset.status = r.status;

  if (r.status === "stub") {
    // `badge` is null for a trading stub (el() skips nulls), so this only ever
    // adds anything when the place is closed — see hoursBadge's third argument.
    li.append(el("div", { className: "card-body" }, [cardPhoto(r), name, meta, badge, chips]));
  } else {
    const link = el("a", { className: "card-link", href: `restaurant.html?id=${r.id}` }, [
      cardPhoto(r),
      name,
      meta,
      badge,
      chips,
    ]);
    // Heart the place straight from the browse card. It sits as a sibling of
    // the link (never nested — a button inside an <a> is invalid and untappable)
    // and floats top-right over the card via absolute positioning.
    const heart = heartButton(
      { type: "venue", venueId: r.id, venueName: r.name, isRecipe: isRecipes },
      r.name
    );
    heart.classList.add("card-heart");
    li.append(link, heart);
    // Route mode: a "Route via maps" action per card hands origin→venue→
    // destination to the maps app for the REAL road route (Google honours the
    // waypoint; Apple has no waypoint param so it routes to the venue — geo.js).
    const via = onRoute ? routeVia(r, routeCtx) : null;
    if (via) li.append(via);
  }
  return li;
}

// A "Route via maps" link for a card in route mode: directions through this
// venue's best-detour branch to the chosen destination. A sibling of the card
// link (a link-in-a-link is invalid), so it z-stacks and stays tappable.
function routeVia(r, { origin, dest }) {
  const best = bestBranchForRoute(r, origin, dest);
  if (!branchCoords(best.branch)) return null; // nothing to route through
  const href = routeMapsUrl(branchAsPlace(r, best.branch), dest, settings.get().mapsApp);
  return el(
    "a",
    {
      className: "card-route",
      href,
      ...(href.startsWith("http") ? { rel: "noopener", target: "_blank" } : {}),
      "aria-label": `Route via ${r.name} — opens the maps app`,
    },
    [el("span", { "aria-hidden": "true", textContent: "🧭 " }), t("route.via", "Route via maps")]
  );
}

function fillSelect(select, values, allLabel, i18nKey) {
  const all = el("option", { value: "all", textContent: allLabel });
  if (i18nKey) all.dataset.i18n = i18nKey; // "All areas"/"All cuisines" translate; the values are place/cuisine names, left as-is
  select.append(all);
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
  fillSelect(areaSel, areas, "All areas", "filter.allAreas");
  fillSelect(cuisineSel, cuisines, "All cuisines", "filter.allCuisines");

  // origin holds the user's {lat, lng} once "Near me" (or "Along a route") is
  // on; null otherwise. dest holds the {lat, lng, label} destination once a
  // route is chosen; origin + dest together switch the sort to least-detour.
  const state = { ...DEFAULT_FILTERS, origin: null, dest: null };

  // Venues you've hearted, or that hold a dish you've hearted — a favourite
  // dish lifts its whole venue. Flattened to venue ids for the ranker.
  const favouriteVenueIds = () => new Set(favourites.items().map((e) => e.venueId));

  function render() {
    const now = nzNow(); // one clock read per render: filter, rank and cards
    let shown = applyFilters(restaurants, state, now);
    const { favBoostKm, farKm } = settings.get();
    // "Along a route" (origin + a destination): rank by least detour, and hand
    // each card the origin/dest so it can offer a real routed maps handoff.
    const onRoute = !!(state.origin && state.dest);
    if (onRoute) {
      shown = rankByDetour(shown, {
        now,
        origin: state.origin,
        dest: state.dest,
        favouriteIds: favouriteVenueIds(),
      });
    } else {
      // Default order floats open/favourite/nearby venues up, sinks
      // closed/faraway ones; distance refines it once "Near me" gives an origin.
      // The favourite pull + reachable radius are the viewer's own dials.
      shown = rankVenues(shown, {
        now,
        origin: state.origin,
        favouriteIds: favouriteVenueIds(),
        favBoostKm,
        farKm,
      });
    }
    const routeCtx = onRoute ? { origin: state.origin, dest: state.dest } : null;
    listEl.replaceChildren(...shown.map((r) => card(r, now, routeCtx)));
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

  wireLocation(state, render, restaurants);

  // Only a viewer off NZ time needs telling the badges are NZ time.
  if (!viewerOnNzTime()) {
    const note = document.getElementById("tz-note");
    if (note) note.hidden = false;
  }

  wireOpenNow(state, render);
  wireCheapEats(state, render);
  wireSearch(restaurants);
  wireFavourites();
  wireHomeButton();
  initSettingsUI();
  wireProfiles();
  initAboutUI();
  initShareApp();
  initOverflowMenu();
  initBackToTop();
  // Hearting something, or changing a distance dial, re-ranks the list (also
  // covers un-favouriting in the view, or a change synced from another tab).
  favourites.subscribe(render);
  settings.subscribe(render);

  render();
  // The shuffle prefers places you can actually order from now (open or
  // opening soon, and within your reach radius if we know where you are); it
  // falls back to the whole filtered set if none are available, never dead-ends.
  initPicker(() => {
    const now = nzNow();
    // Respects the whole filter bar, Cheap eats and Open now included.
    const filtered = applyFilters(restaurants, state, now);
    const { farKm } = settings.get();
    const available = filtered.filter((r) => isAvailableNow(r, { now, origin: state.origin, farKm }));
    return available.length ? available : filtered;
  }, (r) => favouriteVenueIds().has(r.id));
  initOrderUI();
  // After all static chrome, the filled selects and the JS-built dialogs are
  // in the DOM, apply the stored UI language across the lot in one pass (and
  // re-apply live whenever it's toggled in Settings).
  initReo();
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
  const clear = document.getElementById("search-clear");
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
    // The clear ✕ tracks any text at all (even one char you'd want to wipe),
    // not just an active ≥2-char search.
    if (clear) clear.hidden = input.value.length === 0;
    if (active) renderResults(q);
    else groups.replaceChildren();
  }

  input.addEventListener("input", update);
  // Custom ✕ + Escape both clear the field (shared with the in-menu search).
  wireSearchClear(input, clear, update);
  // Submit is a no-op (results are live); just don't reload the page.
  form.addEventListener("submit", (e) => e.preventDefault());
}

// Search and the Favourites view both take over the browse area, so turning
// one on turns the other off. These operate on the DOM (not closures) so
// either wiring can call the other.
function exitSearch() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const clear = document.getElementById("search-clear");
  if (input) input.value = "";
  if (clear) clear.hidden = true;
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

// The "Faves" wordmark acts as a home button (iPhone-style): already on the
// home screen, tapping it exits any open search/favourites view and scrolls
// to the top rather than reloading. If JS is off it's still a plain link to
// index.html, so it always goes home.
function wireHomeButton() {
  const link = document.querySelector(".app-home-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    exitSearch();
    exitFavourites();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
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
  const shareBtn = document.getElementById("favourites-share");
  if (!btn || !panel) return;
  btn.hidden = false;

  // Share the current shortlist (Theme 1b): the same dialog the order sheet
  // uses, encoding a `shortlist` payload instead of an order. Hidden when
  // there's nothing saved. Re-reads favourites on each action (name edits).
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      openShareDialog({
        heading: "Share your favourites",
        blurb: "Send your list of places and dishes — AirDrop, Messages, a copied link, or a QR to scan. Opening it lets them save the ones they like. Nothing is sent to a server.",
        nameAriaLabel: "Your name, so they know whose list this is",
        shareTitle: "My Faves shortlist",
        shareText: "A few places and dishes I like:",
        buildUrl: (name) => {
          const token = encodeShortlist({ label: name, groups: groupForShare(favourites.items()) });
          return buildShareUrl(token, location.origin + "/");
        },
      });
    });
  }

  // One venue group: the place as a parent (shown even when only a dish of
  // it is hearted — a hearted dish implies its place), with its hearted
  // dishes nested beneath. The parent's heart reflects the *venue's* own
  // favourite state (filled = saved, empty = tap to also save the place);
  // each dish keeps its own un-heart. Reads like "my usual at each spot".
  function favVenueGroup(venueId, g) {
    const venueName = g.venueName || "This place";
    const venueEntry =
      g.venue || { type: "venue", venueId, venueName, isRecipe: g.isRecipe, sub: g.sub };
    const head = el("li", { className: "search-row fav-venue-head" }, [
      el("a", { className: "search-link fav-venue-link", href: `restaurant.html?id=${venueId}` }, [
        el("span", {
          className: "search-row-name",
          textContent: `${g.isRecipe ? "🏠" : "🍽️"} ${venueName}`,
        }),
        g.sub ? el("span", { className: "search-row-sub", textContent: g.sub }) : null,
      ]),
      heartButton(venueEntry, venueName),
    ]);
    const dishRows = g.dishes.map((e) =>
      resultRow({
        name: e.name,
        // The venue is the parent now, so don't repeat its name as the sub.
        sub: e.sub && e.sub !== venueName ? e.sub : "",
        href: favHref(e),
        trailing: heartButton(e, e.name),
      })
    );
    return el("section", { className: "search-group fav-venue-group" }, [
      el("ul", { className: "search-list" }, [head, ...dishRows]),
    ]);
  }

  function render() {
    const items = favourites.items();
    groups.replaceChildren();
    if (items.length === 0) {
      summary.textContent = "No favourites yet. Tap ♡ on a place or a dish to save it here.";
      if (shareBtn) shareBtn.hidden = true;
      return;
    }
    if (shareBtn) shareBtn.hidden = false;
    // Group by venue, preserving first-seen order. Facts (name, recipe flag,
    // area/cuisine sub) come from whichever entry carries them — the venue if
    // hearted, otherwise a dish of it.
    const order = [];
    const byVenue = new Map();
    for (const e of items) {
      let g = byVenue.get(e.venueId);
      if (!g) {
        g = { venue: null, dishes: [], venueName: "", isRecipe: false, sub: "" };
        byVenue.set(e.venueId, g);
        order.push(e.venueId);
      }
      if (e.type === "venue") {
        g.venue = e;
        g.sub = e.sub || g.sub;
      } else {
        g.dishes.push(e);
      }
      g.venueName = g.venueName || e.venueName;
      g.isRecipe = g.isRecipe || !!e.isRecipe;
    }
    let dishTotal = 0;
    for (const id of order) {
      const g = byVenue.get(id);
      dishTotal += g.dishes.length;
      groups.append(favVenueGroup(id, g));
    }
    summary.textContent =
      `${order.length} place${order.length === 1 ? "" : "s"}, ` +
      `${dishTotal} dish${dishTotal === 1 ? "" : "es"} saved.`;
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
  // An explicit, obvious way back to the full list (the toggle alone wasn't
  // discoverable as the exit).
  const done = document.getElementById("favourites-done");
  if (done) done.addEventListener("click", () => open(false));

  const countEl = btn.querySelector(".favourites-count");
  const updateCount = () => {
    const n = favourites.count();
    if (countEl) countEl.textContent = n ? String(n) : "";
    if (document.body.classList.contains("faves-view")) render();
  };
  favourites.subscribe(updateCount);
  window.addEventListener("storage", (e) => {
    // Favourites are now namespaced by the active profile.
    if (e.key === profiles.scopedKey("faves.favourites.v1")) favourites.reload();
  });
  updateCount();

  // Arriving from another page's ⋯ menu (restaurant.html's "Favourites" links to
  // index.html#faves, since the favourites view lives here). Open it on load.
  if (location.hash === "#faves") open(true);
}

// Device-local profiles: reflect who's active in the ⋯ menu caption, and keep
// the per-profile stores pointed at them. A switch — here or in another tab —
// re-reads favourites + settings so hearts and the (safety-critical) allergen
// prefs always match whoever is browsing; the store subscriptions then re-rank
// the list and re-sync the settings chips.
function wireProfiles() {
  const nameEl = document.querySelector(".profile-caption-name");
  const updateCaption = () => { if (nameEl) nameEl.textContent = profiles.active().name; };

  profiles.subscribe(() => {
    favourites.reload();
    settings.reload();
    updateCaption();
  });
  // Another tab changed the roster or switched profile.
  window.addEventListener("storage", (e) => {
    if (e.key === PROFILES_KEY) profiles.reload();
  });
  updateCaption();
}

// A plain boolean list toggle: flip a flag on `state`, reflect aria-pressed,
// re-render. Shared by "Open now" and "Cheap eats" (both AND-ed in filters.js).
function wireListToggle(id, key, state, render) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", () => {
    state[key] = !state[key];
    btn.setAttribute("aria-pressed", String(state[key]));
    render();
  });
}

// "Open now": only venues currently open (or closing soon). Unknown-hours
// venues and recipes drop out — the honest reading of "open".
function wireOpenNow(state, render) {
  wireListToggle("open-now", "openNow", state, render);
}

// "Cheap eats": only the $ price band (price.isCheapEats). A venue we can't
// price stays out — no implied bargain.
function wireCheapEats(state, render) {
  wireListToggle("cheap-eats", "cheap", state, render);
}

// Location modes — "Near me" (distance sort) and "Along a route" (least-detour
// sort). Both need the device location, so they share one origin; the two
// buttons are mutually exclusive sort modes (like search vs favourites).
// Purely additive — geolocation is feature-detected and both controls stay
// hidden (plain list stays) where it's unavailable or blocked. `state.origin`
// is the viewer's {lat,lng}; `state.dest` is the chosen destination
// {lat,lng,label}; `state.routeOpen` is the "choosing a destination" arming
// state (bar visible, sort still Near-me until a destination lands).
function wireLocation(state, render, restaurants) {
  const nearBtn = document.getElementById("near-me");
  const routeBtn = document.getElementById("along-route");
  const status = document.getElementById("geo-status");
  const routeBar = document.getElementById("route-bar");
  const destSel = document.getElementById("route-dest");
  const clearBtn = document.getElementById("route-clear");
  if (!nearBtn || !("geolocation" in navigator)) return;
  nearBtn.hidden = false;
  if (routeBtn) routeBtn.hidden = false;

  // Destination options come only from data we already hold — a suburb (its
  // venues' centroid) or a specific place — never free-text (that needs a
  // geocoder = online API). See ADR 0014.
  const centroids = new Map(areaCentroids(restaurants).map((a) => [a.area, a]));
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  if (destSel) fillDest(destSel, restaurants);

  const setStatus = (msg) => {
    status.textContent = msg || "";
    status.hidden = !msg;
  };

  function syncUI() {
    const routing = !!(state.origin && state.dest);
    const nearOnly = !!state.origin && !state.dest && !state.routeOpen;
    nearBtn.setAttribute("aria-pressed", String(nearOnly));
    nearBtn.querySelector(".near-me-label").textContent = nearOnly ? "Nearest first" : "Near me";
    if (routeBtn) routeBtn.setAttribute("aria-pressed", String(!!state.routeOpen));
    if (routeBar) routeBar.hidden = !state.routeOpen;
    if (routing) {
      setStatus(`Sorted by detour on the way to ${state.dest.label} — straight-line estimate.`);
    } else if (state.routeOpen) {
      setStatus("Choose where you’re heading.");
    } else if (state.origin) {
      setStatus("Sorted by distance from you.");
    } else {
      setStatus("");
    }
  }

  // Get the device location (reusing what we already have), then continue.
  function withOrigin(after) {
    if (state.origin) return after();
    nearBtn.disabled = true;
    if (routeBtn) routeBtn.disabled = true;
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        nearBtn.disabled = false;
        if (routeBtn) routeBtn.disabled = false;
        state.origin = { lat: coords.latitude, lng: coords.longitude };
        rememberOrigin(state.origin); // let the menu screen order branches nearest-first
        after();
      },
      (err) => {
        nearBtn.disabled = false;
        if (routeBtn) routeBtn.disabled = false;
        state.routeOpen = false; // couldn't arm a route without a location
        syncUI();
        // Denied is the common, non-error case; be matter-of-fact.
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? "Location off — showing our usual order."
            : "Couldn't get your location — showing our usual order."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function clearLocation() {
    state.origin = null;
    state.dest = null;
    state.routeOpen = false;
    if (destSel) destSel.value = "";
    rememberOrigin(null); // the menu screen forgets it too
    syncUI();
    render();
  }

  nearBtn.addEventListener("click", () => {
    // Currently plain Near me → turn location off entirely.
    if (state.origin && !state.dest && !state.routeOpen) return clearLocation();
    // Otherwise switch to (plain) Near me: drop any route, reuse/get origin.
    state.dest = null;
    state.routeOpen = false;
    if (destSel) destSel.value = "";
    withOrigin(() => {
      syncUI();
      render();
    });
  });

  if (routeBtn) {
    routeBtn.addEventListener("click", () => {
      if (state.routeOpen) {
        // Turn the route off; fall back to plain Near me (origin persists).
        state.routeOpen = false;
        state.dest = null;
        if (destSel) destSel.value = "";
        syncUI();
        render();
        return;
      }
      // Arm the route: need a location, then reveal the destination picker.
      withOrigin(() => {
        state.routeOpen = true;
        syncUI();
        render();
        if (destSel) destSel.focus();
      });
    });
  }

  if (destSel) {
    destSel.addEventListener("change", () => {
      state.dest = resolveDest(destSel.value, centroids, byId);
      syncUI();
      render();
    });
  }
  // An explicit way out of the destination bar (mirrors the route toggle off).
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.routeOpen = false;
      state.dest = null;
      if (destSel) destSel.value = "";
      syncUI();
      render();
    });
  }
}

// Populate the destination <select>: a placeholder, then suburbs (centroids)
// and specific places, grouped. Values are tagged "area:<name>" / "venue:<id>"
// so the change handler knows which map to resolve against.
function fillDest(destSel, restaurants) {
  const ph = el("option", { value: "", textContent: "Where are you heading?" });
  ph.dataset.i18n = "route.destPlaceholder";
  destSel.append(ph);
  const areas = areaCentroids(restaurants);
  if (areas.length) {
    const og = el("optgroup", { label: "Suburbs" });
    for (const a of areas) {
      og.append(el("option", { value: `area:${a.area}`, textContent: a.area }));
    }
    destSel.append(og);
  }
  const places = restaurants.filter(
    (r) => r.kind !== "recipes" && typeof r.lat === "number" && typeof r.lng === "number"
  );
  if (places.length) {
    const og = el("optgroup", { label: "Places" });
    for (const v of places) {
      og.append(el("option", { value: `venue:${v.id}`, textContent: v.name }));
    }
    destSel.append(og);
  }
}

// Resolve a destination select value to {lat,lng,label}, or null (placeholder).
function resolveDest(val, centroids, byId) {
  if (val && val.startsWith("area:")) {
    const a = centroids.get(val.slice(5));
    return a ? { lat: a.lat, lng: a.lng, label: a.area } : null;
  }
  if (val && val.startsWith("venue:")) {
    const v = byId.get(val.slice(6));
    return v && typeof v.lat === "number" ? { lat: v.lat, lng: v.lng, label: v.name } : null;
  }
  return null;
}

loadRestaurants()
  .then(init)
  .catch((err) => {
    // Leave the static fallback list in place; just note it.
    console.error("Faves: falling back to static list.", err);
  });
