// Home screen: load data, render cards, own the filter state. The controls
// themselves live in the filter sheet (filters-ui.js) behind the bottom bar's
// one "Filters (n)" button; this module still owns `state` and every handler,
// so moving them changed where they sit, not who decides.
// Fail-soft: if anything here throws, the static list in index.html
// stays on screen untouched.

import { loadRestaurants, recheckReferences, REFERENCE_COPY } from "./data.js";
import {
  deriveFacets,
  applyFilters,
  activeFilters,
  DEFAULT_FILTERS,
  filtersFromQuery,
} from "./filters.js";
import { initFiltersUI } from "./filters-ui.js";
import { formatDriveTime } from "./distance.js";
import { formatDistance } from "./units.js";
import { rankVenues, isAvailableNow } from "./ranking.js";
import { venueHours, nearestBranch } from "./locations.js";
import { recallOrigin, rememberOrigin } from "./geo.js";
import { askSurface, suppressAsk, declineAsk, readConsent } from "./geo-consent.js";
import { openStatus, makeClock, viewerOnVenueTime } from "./hours.js";
import { isRecipeKind, kindOf, labelsOf } from "./kinds.js";
import { closureBadge } from "./closure-ui.js";
import { todayIn } from "./temporal.js";
import { initPicker } from "./picker.js";
import { buildIndex, search } from "./search.js";
import { rotateHints, defaultHints } from "./search-hints.js";
import { initOrderUI } from "./cart-ui.js";
import { favourites, favHref, favKey, groupForShare, unresolvedReason } from "./favourites.js";
import { heartButton, markUnresolved } from "./favourites-ui.js";
import { ratings } from "./ratings.js";
import { toast } from "./toast.js";
import { encodeShortlist, buildShareUrl } from "./share-codec.js";
import { openShareDialog } from "./share-ui.js";
import { groupSection, resultRow } from "./results-view.js";
import { settings } from "./settings.js";
import { profiles, PROFILES_KEY } from "./profiles.js";
import { initSettingsUI } from "./settings-ui.js";
import { initAboutUI } from "./about-ui.js";
import { initShareApp } from "./share-app.js";
import { initReportEntry } from "./report-ui.js";
import { initOverflowMenu } from "./overflow-ui.js";
import { startSync } from "./sync-start.js";
import { initBackToTop } from "./to-top.js";
import { displayPrice, formatMoney, venueTimezone, zoneLabel } from "./place.js";
import { priceBand } from "./price.js";
import { initReo, t } from "./reo.js";
import { el } from "./dom.js";
import { wireSearchClear } from "./search-clear.js";

// `servicesText` was removed 2026-08-16 with the "Dine-in, Takeaway" line it
// produced. Service is still a filter in the bottom bar, still on the venue
// page, and now a search term ("takeaway", "eat in") — it just no longer
// repeats on every card, where nearly every venue offers both and the words
// separated almost nothing.

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
  // In the reader's currency, with no code beside it — the menu page's ⓘ and
  // its one-line note are where conversion is explained (ADR 0045).
  const shown = hasFigure ? displayPrice(p.perPerson, r) : null;
  const pp = shown ? formatMoney(shown.amount, shown.currency) : "";
  const chip = el("span", { className: "chip chip-price" }, [
    el("span", { className: "price-band", textContent: p.band }),
    ...(hasFigure ? [` ~${pp}pp`] : []),
  ]);
  // Curated band = our call; derived band = estimated from the menu prices.
  if (p.curated) {
    chip.title = hasFigure
      ? `About ${pp} per person — our estimate for this place`
      : `Typical price band for this place`;
    chip.setAttribute(
      "aria-label",
      hasFigure
        ? `Around ${pp} per person`
        : `Price band ${p.band.length} of 3`
    );
  } else {
    chip.title = `About ${pp} per person — estimated from ${p.count} menu prices`;
    chip.setAttribute(
      "aria-label",
      `Around ${pp} per person, estimated from the menu`
    );
  }
  return chip;
}

// Live open/closed badge from the venue's hours (null hours → no badge).
// A lifecycle closure (refit, gone for good) outranks the weekly hours: showing
// "Open · until 9pm" for a shuttered venue would send someone across town.
//
// Reads `venueHours(r, origin)`, not `r.hours`. Both work — `data.js` projects
// a multi-location venue's PRIMARY branch up to the top level — but they differ
// once the viewer's location is known: `venueHours` follows the NEAREST branch,
// which is the one whose distance and maps handoff the card already shows. The
// "Open now" filter has always used it, and its comment claims the two agree;
// before this they could disagree for any venue whose branches keep different
// hours, showing "Closed" on a card the filter had just matched as open.
// Returns the badge INLINE (a span), because it now sits on the meta line
// beside the suburb rather than on a line of its own (owner, 2026-08-16) — and
// a <p> cannot be nested inside the meta <p>.
function hoursBadge(r, clock, showHours = true, origin = null) {
  const tz = venueTimezone(r, origin);
  const closure = closureBadge(r, todayIn(tz, clock.date));
  if (closure) return closure;
  if (!showHours) return null;
  const st = openStatus(venueHours(r, origin), clock.at(tz));
  if (st.state === "unknown") return null;
  const text = st.detail ? `${st.label} · ${st.detail}` : st.label;
  const badge = el("span", { className: "hours-badge", textContent: text });
  badge.dataset.state = st.state;
  return badge;
}

// The suburb of the branch the card is actually talking about. `venueHours`
// already follows the NEAREST branch, so showing the primary branch's suburb
// beside it would caption Johnsonville's hours with Porirua's name — the exact
// mismatch the owner called out (2026-08-16). One branch, one story.
function cardArea(r, origin) {
  const { branch } = nearestBranch(r, origin);
  // A branch has no `area` — it carries a `label` ("Melling", "Press Hall"),
  // which is precisely the name that tells two branches apart. Single-location
  // venues have no label and fall through to the venue's own suburb, so their
  // card is unchanged. Whatever branch drives the hours drives the label: with
  // no origin that is the primary one, which is still an honest pairing.
  return branch?.label || r.area || "";
}

const zonesOf = (restaurants) => new Set(restaurants.map((r) => venueTimezone(r)));

// The sentence under the filter bar explaining whose clock the badges are on,
// or null when every venue happens to keep the viewer's own wall-clock and the
// note would be noise. One venue in another zone is enough to earn it — the
// badges are venue-local, and a reader who assumes otherwise plans around the
// wrong hour.
function timezoneNote(restaurants) {
  const zones = [...zonesOf(restaurants)];
  if (zones.every((tz) => viewerOnVenueTime(tz))) return null;
  return zones.length === 1
    ? `Open/closed times are ${zoneLabel(zones[0])}.`
    : "Open/closed times are each place’s own local time.";
}

function card(r, clock, origin = null) {
  const kind = kindOf(r);
  const labels = labelsOf(r);
  const units = settings.get().units;
  const name = el("h3", { className: "card-name", textContent: r.name });

  // The open/closed badge is built before the meta line because it now sits
  // ON it, beside the suburb. "Dine-in, Takeaway" came off entirely (owner,
  // 2026-08-16): it was on every card, so it separated almost nothing, and
  // service is still a filter and now a search term.
  const badge = kind.hasHours ? hoursBadge(r, clock, true, origin) : null;
  const area = cardArea(r, origin);

  let meta;
  // A kind that names itself says what it is and how much of it there is; one
  // that doesn't is placed by its suburb and its distance from you.
  if (labels.browseLabel) {
    const n = (r.menu || []).reduce((sum, s) => sum + (s.items?.length || 0), 0);
    meta = el("p", { className: "card-meta" }, [
      el("span", { className: "card-area", textContent: labels.browseLabel }),
      el("span", {
        textContent: n ? `${n} ${labels.itemNoun}${n === 1 ? "" : "s"}` : labels.stubChip,
      }),
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
      el("span", { className: "card-area", textContent: area }),
      badge,
    ]);
  }

  const chips = el("div", { className: "chip-row" });
  if (r.status === "stub") {
    // ...unless it has closed for good: "Menu coming soon" for a venue that
    // will never serve again is worse than saying nothing. The closure badge
    // below carries the real news.
    if (r.closure?.state !== "closed-permanently") {
      chips.append(el("span", { className: "chip chip-status", textContent: labels.stubChip }));
    }
  } else if (labels.chip) {
    // A kind with a chip of its own wears that instead of a price band and
    // cuisines — neither of which it has.
    chips.append(
      el("span", { className: `chip ${labels.chip.className}`, textContent: labels.chip.text })
    );
  } else {
    const pc = priceChip(r);
    if (pc) chips.append(pc);
    for (const c of r.cuisine || []) {
      chips.append(el("span", { className: "chip chip-cuisine", textContent: c }));
    }
  }

  const li = el("li", { className: labels.cardModifier ? `card ${labels.cardModifier}` : "card" });
  li.dataset.status = r.status;

  // A stub is only a dead end if we hold nothing but its name. Where we have
  // hours, an address, a phone or a location, its page is worth opening — it
  // renders the header, contact card and map handoff, then says the menu is
  // still coming (menu.js). Owner, 2026-08-16: "the user should still be able
  // to drill into [it] if we have details like opening hours, address etc".
  const hasDetails = !!(
    r.hours ||
    r.address ||
    r.phone ||
    r.lat != null ||
    (r.locations && r.locations.length)
  );

  if (r.status === "stub" && !hasDetails) {
    // Nothing behind the name, so nothing to open — a link that leads to a
    // page saying only "menu coming soon" is worse than no link at all.
    li.append(el("div", { className: "card-body" }, [cardPhoto(r), name, meta, chips]));
  } else {
    const link = el("a", { className: "card-link", href: `restaurant.html?id=${r.id}` }, [
      cardPhoto(r),
      name,
      meta,
      chips,
    ]);
    // Heart the place straight from the browse card. It sits as a sibling of
    // the link (never nested — a button inside an <a> is invalid and untappable)
    // and floats top-right over the card via absolute positioning.
    const heart = heartButton(
      // Stored on the heart — identity, not capability (kinds.isRecipeKind).
      { type: "venue", venueId: r.id, venueName: r.name, isRecipe: isRecipeKind(r) },
      r.name
    );
    heart.classList.add("card-heart");
    li.append(link, heart);
  }
  return li;
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
  const activeEl = document.getElementById("active-filters");
  const areaSel = document.getElementById("filter-area");
  const cuisineSel = document.getElementById("filter-cuisine");
  const serviceSel = document.getElementById("filter-service");

  const { areas, cuisines } = deriveFacets(restaurants);
  fillSelect(areaSel, areas, "All areas", "filter.allAreas");
  fillSelect(cuisineSel, cuisines, "All cuisines", "filter.allCuisines");

  // A menu page's subheading links its cuisines and area back here as
  // `?cuisine=…` / `?area=…` (filters.js owns the names, and drops any value
  // the data doesn't have). The controls are set from it too, so the list and
  // the dropdown above it never disagree about why it's short.
  const fromUrl = filtersFromQuery(location.search, { areas, cuisines });
  // `origin` is the viewer's {lat,lng}, and it is seeded from the location this
  // browsing session already captured — sessionStorage, same key the menu screen
  // reads (geo.js).
  //
  // 🔎 This line is a fix, not plumbing. Until 2026-08-17 the home screen
  // started at `null` every single load while `menu.js` went on reading the
  // remembered origin, so home → a menu page → back left the menu screen
  // ordering branches by your location and the home list quietly not. It was
  // invisible while distance did nothing in the default order (ADR 0068); the
  // moment distance counts, the same navigation silently changes the ranking.
  // Seeding here also spares the granted-permission path a visible reorder on
  // every load — the first paint is already in the right order.
  const state = { ...DEFAULT_FILTERS, ...fromUrl, origin: recallOrigin() };
  for (const [sel, value] of [
    [areaSel, state.area],
    [cuisineSel, state.cuisine],
    [serviceSel, state.service],
  ]) {
    if (!sel) continue;
    sel.value = value;
    sel.dataset.active = value;
  }

  // Keep the URL honest once the reader starts changing those dropdowns: a
  // stale `?cuisine=Malaysian` left in the bar would come back on reload and
  // quietly re-filter a list they had since widened. Replace, don't push —
  // this is the same screen, and Back should return to the menu page they
  // arrived from, not step through every dropdown they tried.
  function syncQuery() {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of [["area", state.area], ["cuisine", state.cuisine]]) {
      if (value === "all") params.delete(key);
      else params.set(key, value);
    }
    const q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? `?${q}` : "") + location.hash);
  }

  // Turn one filter off and put its control back to neutral. The control now
  // lives inside the sheet, so this is the only place that knows how to undo
  // each kind — the chips, "Clear all" and the sheet all route through it.
  const WHAT = {
    cuisine: "cuisine",
    area: "area",
    service: "service",
    openNow: "Open now",
    cheap: "Cheap eats",
  };
  function clearFilter(kind) {
    if (kind === "cuisine" || kind === "area") {
      const sel = kind === "cuisine" ? cuisineSel : areaSel;
      state[kind] = "all";
      sel.value = "all";
      sel.dataset.active = "all";
      syncQuery();
    } else if (kind === "service") {
      state.service = "all";
      if (serviceSel) {
        serviceSel.value = "all";
        serviceSel.dataset.active = "all";
      }
    } else {
      state[kind] = false;
      document
        .getElementById(kind === "openNow" ? "open-now" : "cheap-eats")
        ?.setAttribute("aria-pressed", "false");
    }
  }

  // How many chips fit on the results head's one line beside the count.
  // Measured at 390 px: the head has 358 px, the count takes ~110 and a chip
  // ~104, so one chip plus the "+n more" escape is the honest cap; at ≥34rem
  // there is room for three. A second chip row would claw back exactly the
  // height this redesign just bought (98.4 px for two, measured 2026-08-16).
  const wideMq = matchMedia("(min-width: 34rem)");
  const chipCap = () => (wideMq.matches ? 3 : 1);

  // A dismissible chip per active filter, sitting beside the count that says
  // the list is short. This is the way *out*.
  //
  // It exists because of how you get here. A cuisine arriving in the URL from a
  // venue's subheading was chosen on a different page — the reader lands on a
  // narrowed list having touched nothing here, and the only undo was a <select>
  // in the sticky bar at the far end of the page, which reads as part of the
  // furniture rather than as the thing currently doing this to the list. The
  // search screen has always had a ✕ on its query for exactly this reason;
  // browse had nothing (owner, 2026-08-16).
  //
  // It now covers ALL five filters, not just the two a URL can carry. That is
  // not a nicety: once the controls moved into a sheet, an uncovered filter
  // would be a filter nothing on screen names. Over the cap the tail folds into
  // one "+n more" button that opens the sheet — the filters are still named,
  // just one tap away, and the row cannot grow a second line. `activeFilters`
  // orders cuisine and area first precisely so an *arriving* facet is never the
  // one folded away.
  function renderActiveFilters(active) {
    if (!activeEl) return;
    const cap = chipCap();
    const visible = active.length <= cap ? active : active.slice(0, cap);
    const chips = visible.map(({ kind, label, key }) => {
      const text = key ? t(key, label) : label;
      const chip = el("button", {
        type: "button",
        className: "active-filter",
        // The label carries the whole sentence: what is on, and what pressing
        // it does. "Malaysian ✕" alone tells a screen-reader user neither.
        "aria-label": `${text} ${WHAT[kind]} filter is on — clear it and show every place`,
        // The visible name truncates at 10rem; the title gives it back on hover.
        title: text,
      }, [
        el("span", { className: "active-filter-name", textContent: text }),
        el("span", { className: "active-filter-x", "aria-hidden": "true", textContent: "✕" }),
      ]);
      chip.addEventListener("click", () => {
        clearFilter(kind);
        render();
        // Send focus somewhere that still exists — the chip is about to be
        // removed from the DOM, and focus on a detached node falls to <body>,
        // stranding a keyboard user at the top of the document.
        countEl?.focus?.();
      });
      return chip;
    });
    const hiddenCount = active.length - visible.length;
    if (hiddenCount > 0) {
      const more = el("button", {
        type: "button",
        className: "active-filter-more",
        textContent: `+${hiddenCount} more`,
        "aria-label": `${hiddenCount} more filter${hiddenCount === 1 ? "" : "s"} are on — open filters to see them`,
      });
      more.addEventListener("click", () => filtersUI.open(more));
      chips.push(more);
    }
    activeEl.replaceChildren(...chips);
    activeEl.hidden = chips.length === 0;
  }
  // The cap is width-dependent, and a rotation or a resized window changes it
  // without changing the filter state, so nothing else would redraw the row.
  wideMq.addEventListener("change", () => renderActiveFilters(activeFilters(state)));

  // One button, one sheet, and the badge that keeps a hidden filter honest.
  const filtersUI = initFiltersUI({
    onClearAll: () => {
      for (const { kind } of activeFilters(state)) clearFilter(kind);
      render();
    },
  });

  // Venues you've hearted, or that hold a dish you've hearted — a favourite
  // dish lifts its whole venue. Flattened to venue ids for the ranker.
  const favouriteVenueIds = () => new Set(favourites.items().map((e) => e.venueId));

  function render() {
    // One clock per render, read per venue in that venue's own zone (ADR 0043):
    // the whole list is ranked against a single instant, so two venues can never
    // disagree about what time it is because the render took a moment to run.
    const clock = makeClock();
    let shown = applyFilters(restaurants, state, clock);
    const { favBoostKm, farKm } = settings.get();
    // Default order floats open/favourite/nearby venues up, sinks
    // closed/faraway ones; distance refines it once "Near me" gives an origin.
    // The favourite pull + reachable radius are the viewer's own dials.
    shown = rankVenues(shown, {
      clock,
      origin: state.origin,
      favouriteIds: favouriteVenueIds(),
      favBoostKm,
      farKm,
    });
    listEl.replaceChildren(...shown.map((r) => card(r, clock, state.origin)));
    emptyEl.hidden = shown.length !== 0;
    const n = shown.length;
    const total = restaurants.length;
    countEl.textContent =
      n === total ? `${total} places` : `${n} of ${total} place${n === 1 ? "" : "s"}`;
    // Redrawn with the count so the chips, the badge and the number they
    // explain can never disagree — including when a filter changes inside the
    // sheet. All three read the same activeFilters(state).
    const active = activeFilters(state);
    renderActiveFilters(active);
    filtersUI.sync({ active, shown: n, total });
  }

  // Service is a pick-one-of-three like Area and Cuisine, so since 15z it is a
  // <select> like them. It is deliberately NOT in syncQuery: `?service=` was
  // never a shareable facet (ADR 0050 carries area and cuisine only), and
  // adding it here would change what a shared link means.
  serviceSel?.addEventListener("change", () => {
    state.service = serviceSel.value;
    serviceSel.dataset.active = serviceSel.value;
    render();
  });

  areaSel.addEventListener("change", () => {
    state.area = areaSel.value;
    areaSel.dataset.active = areaSel.value;
    syncQuery();
    render();
  });
  cuisineSel.addEventListener("change", () => {
    state.cuisine = cuisineSel.value;
    cuisineSel.dataset.active = cuisineSel.value;
    syncQuery();
    render();
  });

  wireLocation(state, render);

  // Only a viewer whose device clock differs from the venues' needs telling the
  // badges are venue-local. The note names the zone when the whole list shares
  // one, and stops naming any once it doesn't — "New Zealand time" on a list
  // holding a London venue would be a confident wrong answer about half of it.
  const tzNote = timezoneNote(restaurants);
  if (tzNote) {
    const note = document.getElementById("tz-note");
    if (note) {
      note.textContent = tzNote;
      // The reo translation is for the single-zone wording it was written
      // against; a mixed-zone list gets the English sentence rather than a
      // translation that says something narrower than the English does.
      if (zonesOf(restaurants).size > 1) note.removeAttribute("data-i18n");
      note.hidden = false;
    }
  }

  wireOpenNow(state, render);
  wireCheapEats(state, render);
  wireSearch(restaurants);
  wireFavourites(restaurants);
  wireHomeButton();
  initSettingsUI();
  wireProfiles();
  initAboutUI();
  initShareApp();
  initReportEntry();
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
    const clock = makeClock();
    // Respects the whole filter bar, Cheap eats and Open now included.
    const filtered = applyFilters(restaurants, state, clock);
    const { farKm } = settings.get();
    const available = filtered.filter((r) => isAvailableNow(r, { clock, origin: state.origin, farKm }));
    return available.length ? available : filtered;
  }, (r) => favouriteVenueIds().has(r.id));
  initOrderUI();
  startSync(); // continual sync, if the user turned it on (Theme 9 v2)
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

  // The box advertises what it can find, one example at a time. The list is
  // built here, next to the index it describes, so a hint cannot outlive the
  // capability it promises (search-hints.js explains why that matters).
  rotateHints(input, defaultHints(t));

  form.hidden = false;
  const index = buildIndex(restaurants);

  // A tab-hint icon precedes the venue name so the two groups read at a glance.
  // The index entry carries `kind` for exactly this — each kind names its own
  // icon, so a third one never needs a third branch here.
  const placeIcon = (p) => labelsOf(p).icon;

  const groupCount = ({ items, total }) =>
    total > items.length ? `${items.length} of ${total}` : total;

  // Theme 27b — "say which field matched". search.js already worked out
  // WHICH field answered the query (`matchField`) and, when that field is
  // one the row displays, the literal text to highlight (`matchText`). Here
  // that's turned into what resultRow needs: a highlight on `name` or `sub`
  // for a visible field, or a plain-text note for a field the row never
  // shows at all (address/city/phone/service; a dish's description,
  // ingredients, order code or diet label) — so a hit is never left with no
  // stated reason, and never claims a property (like cuisine) it didn't
  // actually match.
  const PLACE_NOTE = {
    address: "Matched: address",
    city: "Matched: city",
    phone: "Matched: phone number",
    service: "Matched: service",
    details: "Matched: other details",
  };
  const DISH_NOTE = { details: "Matched: menu details" };

  function placeMatch(p) {
    if (p.matchField === "name") return { nameMatch: p.matchText };
    if (p.matchField === "area" || p.matchField === "cuisine") return { subMatch: p.matchText };
    return { note: PLACE_NOTE[p.matchField] || PLACE_NOTE.details };
  }
  function dishMatch(d) {
    if (d.matchField === "name") return { nameMatch: d.matchText };
    return { note: DISH_NOTE.details };
  }

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
            ...placeMatch(p),
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
            ...dishMatch(d),
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
//
// REFERENCE INTEGRITY (ADR 0020). A heart saved months ago may name a venue or
// a dish the loaded data no longer has. Such a row is MARKED and kept — never
// dropped, because a silent disappearance is data loss the user is never told
// about — and its copy holds both possibilities open ("removed, or your list is
// out of date") until a fetch that provably reached the network settles it.
// This device cannot tell the two apart, so it does not get to guess.
function wireFavourites(restaurants) {
  const btn = document.getElementById("favourites-toggle");
  const panel = document.getElementById("favourites-panel");
  const summary = document.getElementById("favourites-summary");
  const groups = document.getElementById("favourites-groups");
  const shareBtn = document.getElementById("favourites-share");
  if (!btn || !panel) return;
  btn.hidden = false;
  // Focusable only programmatically: somewhere for focus to land when the row
  // holding it is removed from the DOM (otherwise it falls to <body>).
  if (summary) summary.tabIndex = -1;

  const byId = new Map((restaurants || []).map((r) => [r.id, r]));
  // What the NETWORK said about a reference, keyed by favKey. It outranks the
  // local reading in both directions: "present" un-marks a row this device's
  // data can't match, and "absent" is the only thing that licenses the word
  // "removed" anywhere on this screen.
  const checked = new Map();

  /** The mark a row should wear, or null for a row that's fine. */
  function rowState(entry) {
    const net = checked.get(favKey(entry));
    if (net === "present") return null;
    if (!unresolvedReason(entry, byId)) return null;
    return net || "unresolved";
  }

  /** Put focus back after a re-render swapped the buttons out from under it. */
  function refocus(key) {
    const row = groups.querySelector(`[data-fav-key="${CSS.escape(key)}"]`);
    const btnEl = row?.querySelector(".fav-recheck") || row?.querySelector(".fav-drop");
    (btnEl || summary)?.focus?.();
  }

  // Ask the network about these entries. Anything but "present" leaves the row
  // marked; only "absent" changes what the row is allowed to say.
  async function recheck(entries) {
    const keys = entries.map(favKey);
    for (const k of keys) checked.set(k, "checking");
    render();
    const results = await recheckReferences(entries);
    let restored = 0;
    for (const { entry, state } of results) {
      checked.set(favKey(entry), state);
      if (state === "present") restored++;
    }
    render();
    // "Reappears ⇒ it was stale ⇒ fix silently" — the mark just goes. A word of
    // confirmation still goes out, because a button press with no feedback at
    // all reads as broken; it demands nothing of the reader.
    if (restored) toast(REFERENCE_COPY.restored);
    refocus(keys[0]);
  }

  // Forget one unresolved entry on this device. A rating is stored under the
  // SAME key, so it goes too — the button's label and title say so before the
  // tap, and the toast says what happened after it. Leaving the rating behind
  // would strand a mark with nothing on any screen that could reach it again.
  function forget(entry, name) {
    const rated = ratings.has(entry);
    if (rated) ratings.clear(entry);
    checked.delete(favKey(entry));
    favourites.removeKey(favKey(entry)); // fires the subscriber → re-render
    toast(rated ? `Removed ${name} and your rating.` : `Removed ${name}.`);
    summary?.focus?.();
  }

  /**
   * Tag a row with its key and, when it doesn't resolve, mark it.
   *
   * `refreshWith` widens what Refresh asks about. A venue heading checks its
   * WHOLE group: the answer to "is this place still published" settles every
   * dish under it too, and a heading reading "still there" above dishes still
   * marked "not on your current list" is one screen telling two stories.
   */
  function decorate(li, entry, name, { removable = true, refreshWith = null } = {}) {
    li.dataset.favKey = favKey(entry);
    const state = rowState(entry);
    if (!state) return li;
    return markUnresolved(li, {
      entry,
      state,
      name,
      alsoRated: ratings.has(entry),
      onRefresh: () => recheck(refreshWith || [entry]),
      onRemove: removable ? () => forget(entry, name) : null,
    });
  }

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
    // A heading shown only because a DISH of the place is hearted has no heart
    // of its own, so it can be marked but not removed (its dish rows each carry
    // their own Remove). `g.venue` is what tells the two apart.
    decorate(head, venueEntry, venueName, {
      removable: !!g.venue,
      refreshWith: [venueEntry, ...g.dishes],
    });
    const dishRows = g.dishes.map((e) =>
      decorate(
        resultRow({
          name: e.name,
          // The venue is the parent now, so don't repeat its name as the sub.
          sub: e.sub && e.sub !== venueName ? e.sub : "",
          href: favHref(e),
          trailing: heartButton(e, e.name),
        }),
        e,
        e.name
      )
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
    // Count the marked rows too, so the panel's live region states the fact
    // rather than leaving it to be noticed. The two counts are kept apart on
    // purpose: "not on your current list" is an open question, "no longer in
    // the menu data" is an answer a live fetch gave us.
    let pending = 0;
    let gone = 0;
    for (const e of items) {
      const s = rowState(e);
      if (s === "absent") gone++;
      else if (s) pending++;
    }
    summary.textContent =
      `${order.length} place${order.length === 1 ? "" : "s"}, ` +
      `${dishTotal} dish${dishTotal === 1 ? "" : "es"} saved.` +
      (pending ? ` ${pending} not on your current list.` : "") +
      (gone ? ` ${gone} no longer in the menu data.` : "");
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

// Said in place of the button, never as a modal or a repeat ask. It names the
// state and where to undo it, and stops — a browser will not let a page reopen
// its own site settings, so pointing is the most any page can honestly do.
const BLOCKED_MSG = "Location is blocked for this site — turn it on in your browser's site settings to rank by distance.";

// The location ask (ADR 0069, superseding item 4 of ADR 0068).
//
// There is no sort mode any more: one ranking, and distance is a term inside it
// (ADR 0068). So this function's whole job is getting an origin for that term —
// not choosing between orders. `state.origin` is the viewer's {lat,lng}, and
// null is a perfectly good answer: with no origin every distance is Infinity and
// the ranking falls back to availability → favourite → curated, which is the
// order this app has always actually shipped.
//
// THE LOCATION ASK (ADR 0082, superseding ADR 0069's "inline control, never a
// modal" half). Three rules, all the owner's, all 2026-08-17:
//
//   1. NOTHING IS ASKED UNTIL THE PAGE IS USEFUL. "Load the full page so they
//      can see everything and sort to the best of Faves ability without location
//      data sharing. Then ask for location data sharing so they can see why it's
//      needed." So the list renders in the no-origin order first and the dialog
//      opens after it — the reader has seen the thing location improves before
//      being asked to improve it.
//   2. THE PILL IS GONE. "I don't like the pill button to prompt for location
//      data, remove it." The only routes now are this dialog, the banner behind
//      it, and Settings -> Distance for anyone who turned both off.
//   3. "DON'T ASK ME AGAIN" IS FOREVER, and binds the banner too (geo-consent.js).
//
// What 0069 got right and is kept whole: we never spring the BROWSER's prompt.
// `permissions.query` reads state without prompting, and the real prompt is
// raised only by a button someone pressed. That was 0069's actual protection —
// a browser-level block is sticky and hard to undo — and none of the above
// touches it, because a dialog of our own cannot deny anything.
function wireLocation(state, render) {
  const status = document.getElementById("geo-status");
  const dialog = document.getElementById("geo-dialog");
  const banner = document.getElementById("geo-banner");
  if (!status || !("geolocation" in navigator)) return;

  const never = document.getElementById("geo-dialog-never");

  const setStatus = (msg) => {
    status.textContent = msg || "";
    status.hidden = !msg;
  };
  const showBanner = (show) => {
    if (banner) banner.hidden = !show;
  };
  const closeDialog = () => {
    if (dialog?.open) dialog.close();
  };

  // Fetch and apply. Raises the browser prompt only where the state is
  // "prompt"; under "granted" the browser answers from the grant it holds and
  // the viewer sees nothing.
  function fetchOrigin({ silent }) {
    if (!silent) setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        state.origin = { lat: coords.latitude, lng: coords.longitude };
        rememberOrigin(state.origin); // let the menu screen order branches nearest-first
        closeDialog();
        showBanner(false);
        setStatus("Open places near you come first.");
        render();
      },
      (err) => {
        closeDialog();
        if (err.code === err.PERMISSION_DENIED) {
          // They said No to the BROWSER. That is sticky and we do not re-ask:
          // ADR 0068 item 4 stands for exactly this case. The banner would be a
          // second ask for a permission the browser will no longer grant, so it
          // goes too, and the status line says what is true.
          showBanner(false);
          setStatus(BLOCKED_MSG);
          return;
        }
        // Timeout, no fix, position-unavailable: transient rather than a
        // refusal, so the banner stays as the way to try again.
        showBanner(true);
        setStatus(silent ? "" : "Couldn't get your location — showing our usual order.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // Honour the tickbox on EVERY exit from the dialog, including Esc and the
  // backdrop. Someone who ticks the box and then presses Escape has told us the
  // same thing as someone who ticks it and taps "Not now"; reading the tick only
  // on one path would quietly break the promise on the others.
  function leaveDialog({ allowed }) {
    if (never?.checked) suppressAsk();
    else if (!allowed) declineAsk();
    closeDialog();
    // The banner is the consequence of declining WITHOUT ticking. askSurface()
    // owns that decision rather than this branch re-deriving it.
    if (!allowed) {
      showBanner(askSurface("prompt", readConsent(), Boolean(state.origin)) === "banner");
    }
  }

  document.getElementById("geo-dialog-allow")?.addEventListener("click", () => {
    if (never?.checked) suppressAsk(); // they may still never want asking again
    fetchOrigin({ silent: false });
  });
  document.getElementById("geo-dialog-skip")?.addEventListener("click", () =>
    leaveDialog({ allowed: false })
  );
  // Esc and backdrop dismissal both fire "close" without firing any click.
  dialog?.addEventListener("close", () => leaveDialog({ allowed: false }));

  document.getElementById("geo-banner-allow")?.addEventListener("click", () =>
    fetchOrigin({ silent: false })
  );
  document.getElementById("geo-banner-dismiss")?.addEventListener("click", () => {
    // Dismissing the banner is the SECOND decline. Two refusals is a no, so this
    // suppresses permanently rather than deferring — a banner that returns next
    // visit after being dismissed twice is precisely the nagging the owner ruled
    // out. Settings -> Distance remains the way back.
    suppressAsk();
    showBanner(false);
  });

  // Rule 1, mechanically. `render()` has already run by the time wireLocation is
  // called, but the browser has not necessarily PAINTED it: opening a modal in
  // the same frame would show the dialog over a blank list, which is the
  // opposite of "so they can see why it's needed". Two rAFs guarantee a painted
  // frame, and the short timeout on top is the reading beat.
  // 🚩 A MODAL MUST NOT LAND ON SOMEONE ALREADY USING THE PAGE. `showModal()`
  // makes everything outside the dialog inert and pulls focus into it, so a
  // dialog that opens 900 ms in will interrupt a reader who started scrolling,
  // opened the filters, or tabbed to a control at 800 ms — their tap goes
  // nowhere and their focus is yanked. Measured, not theorised: opening it
  // unconditionally broke `to_top_check` (the tucked ↑ could not be focused)
  // and `filter_row_check` (every filter control read "blocked by DIALOG",
  // and focus had moved to this dialog's checkbox).
  //
  // So the modal is for a reader who has NOT started yet, and anyone already
  // browsing gets the banner instead — which asks the same question without
  // taking the page away. That is the owner's rule 1 read honestly: "load the
  // full page so they can see everything ... then ask" is about not asking too
  // early, and interrupting someone mid-tap is a different way of asking too
  // early.
  let engaged = false;
  const markEngaged = () => {
    engaged = true;
  };
  // `capture` so a click on a control that stops propagation still counts, and
  // `once` because the flag never goes back.
  for (const evt of ["scroll", "pointerdown", "keydown"]) {
    window.addEventListener(evt, markEngaged, { once: true, capture: true, passive: true });
  }

  function openAsk() {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(() => {
        // Re-check: a grant may have arrived while we waited.
        if (state.origin || !dialog || dialog.open) return;
        // Already reading: ask quietly, never over the top of them.
        if (engaged || typeof dialog.showModal !== "function") {
          showBanner(true);
          return;
        }
        dialog.showModal();
      }, 900))
    );
  }

  function applyPermissionState(stateName) {
    const surface = askSurface(stateName, readConsent(), Boolean(state.origin));
    if (stateName === "granted") {
      fetchOrigin({ silent: true }); // already ours to use — no prompt appears
      return;
    }
    if (stateName === "denied") {
      // The gap ADR 0069 closed and this record keeps: before it, "never asked"
      // and "blocked forever" presented identically, so nobody could tell an app
      // that had not asked from one that could never ask again.
      closeDialog();
      showBanner(false);
      setStatus(BLOCKED_MSG);
      // Reached via perm.onchange when someone blocks us mid-visit. Keeping the
      // coordinates we already hold would be legal and dishonest.
      if (state.origin) {
        state.origin = null;
        rememberOrigin(null);
        render();
      }
      return;
    }
    if (surface === "dialog") openAsk();
    else if (surface === "banner") showBanner(true);
    // "none" — suppressed, or we already have what the ask would fetch.
  }

  // Seeded from this browsing session's own capture (init, above).
  if (state.origin) setStatus("Open places near you come first.");

  if (!navigator.permissions?.query) return applyPermissionState("prompt");
  navigator.permissions
    .query({ name: "geolocation" })
    .then((perm) => {
      applyPermissionState(perm.state);
      perm.onchange = () => applyPermissionState(perm.state);
    })
    // Some engines reject on the "geolocation" name rather than resolving.
    .catch(() => applyPermissionState("prompt"));
}

loadRestaurants()
  .then(init)
  .catch((err) => {
    // Leave the static fallback list in place; just note it.
    console.error("Faves: falling back to static list.", err);
  });
