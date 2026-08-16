// Menu screen. Reads ?id=<restaurant>, fetches its file, renders the
// header, "our picks", section nav (scroll-spy), and dish rows with
// allergen warnings. Search hides non-matches; dietary chips dim them.

import { loadRestaurant } from "./data.js";
import { mapsUrl, recallOrigin } from "./geo.js";
import { orderedBranches, isMultiLocation, branchAsPlace, branchesToShow } from "./locations.js";
import { travelHint } from "./distance.js";
import { formatDistance, convertTemperatures } from "./units.js";
import { openStatus, groupWeek, makeClock, nowIn, viewerOnVenueTime } from "./hours.js";
import { closureBadge } from "./closure-ui.js";
import { fxAsOf } from "./fx.js";
import { alternates, preferred, venueLanguage } from "./lang.js";
// `verificationText` is deliberately NOT imported any more — the header line it
// fed was removed 2026-08-16 as a duplicate of the ⓘ note. It stays exported
// and tested in temporal.js because it is the canonical phrasing of "how we
// know", and the ⓘ would need it back if the date ever left that note.
import { todayIn, refreshCaveat, detailsVerification } from "./temporal.js";
import {
  branchTimezone,
  displayCurrency,
  displayPrice,
  currencyName,
  formatMoney,
  venueCurrency,
  venueTimezone,
  zoneLabel,
} from "./place.js";
import { slug } from "./slug.js";
import { dishId, findDish } from "./dish-id.js";
import { dishStepper, initOrderUI } from "./cart-ui.js";
import { dishAddOns } from "./addons-ui.js";
import { heartButton } from "./favourites-ui.js";
import { ratingControl, curatedRating } from "./ratings-ui.js";
import { priceBand } from "./price.js";
import { settings } from "./settings.js";
import { profiles, PROFILES_KEY, reloadProfileStores } from "./profiles.js";
import { favourites } from "./favourites.js";
import { ratings } from "./ratings.js";
import { DIET_FILTERS, dishFlagged, dishSatisfiesDiet } from "./dietary.js";
import { initReo, translate } from "./reo.js";
import { disclosure } from "./disclosure.js";
import { dishNeeds, priceUnknown } from "./needs.js";
import { filterHref } from "./filters.js";
import { initBackToTop } from "./to-top.js";
import { el } from "./dom.js";
import { wireSearchClear } from "./search-clear.js";
import { initAboutUI } from "./about-ui.js";
import { initShareApp } from "./share-app.js";
import { dishReportButton, venueReportRow, initReportEntry } from "./report-ui.js";
import { initOverflowMenu } from "./overflow-ui.js";
import { initSettingsUI } from "./settings-ui.js";
import { captureUiState, restoreUiState, initScrollMemory } from "./ui-state.js";
import { initTransferReceive } from "./personal-io-ui.js";
import { cookButton } from "./cook-ui.js";

const root = document.getElementById("menu-root");
const EMPTY_SET = new Set();

// The record this page is drawing, set at the top of render() before anything
// is built. Module state rather than a threaded parameter because a menu page
// IS one venue — every price on screen is that venue's — and threading it
// through ~40 render helpers would say the same thing forty times. Reset per
// render, so a re-render (profile switch, settings change) can never inherit
// the previous venue.
let pageRecord = null;

/**
 * A price, in whatever currency this reader asked to see it in (ADR 0045).
 *
 * Note what is NOT here: any currency code, badge or marker. When the reader's
 * currency is the shop's — which it is for every reader at home, looking at a
 * local menu — this returns exactly what it always did, and the page is
 * indistinguishable from before. When it isn't, the conversion is disclosed
 * ONCE per menu (see convertedNote and the ⓘ), never once per dish.
 */
const money = (n) => {
  if (n == null) return "";
  const shown = displayPrice(n, pageRecord);
  return formatMoney(shown.amount, shown.currency);
};

// --- Tag vocabulary → display ---------------------------------------
const DIETARY = {
  v: "Veg",
  vg: "Vegan",
  gf: "GF",
  df: "DF",
  "gf-option": "GF option",
  "v-option": "Veg option",
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
    // If the viewer flagged this allergen in their preferences, make it shout.
    const flagged = avoid.has(t);
    return el("span", {
      className: flagged ? "tag tag-allergen is-flagged" : "tag tag-allergen",
      textContent: `⚠ ${ALLERGEN[t]}`,
    });
  }
  if (isSpicy(t)) {
    const level = Number(t.slice(-1));
    return el("span", {
      className: "tag tag-spicy",
      textContent: `${"🌶".repeat(level)} Spicy`,
    });
  }
  if (t in DIETARY) {
    return el("span", { className: "tag tag-diet", textContent: DIETARY[t] });
  }
  return el("span", { className: "tag", textContent: t });
}

// Order tags so allergen warnings come first (safety first).
const tagOrder = (tags) =>
  [...tags].sort((a, b) => Number(isAllergen(b)) - Number(isAllergen(a)));

// The dietary filter model + the flag/dim predicates live in dietary.js (DOM-free
// and unit-tested), so the initial render and the live re-apply share one path.

// Phone — the primary way to order. Big and first.
function callRow(phone) {
  return el("a", { className: "contact-row contact-call", href: `tel:${phone.replace(/\s+/g, "")}` }, [
    el("span", { className: "contact-ico", textContent: "📞", "aria-hidden": "true" }),
    el("span", { className: "contact-text" }, [
      el("span", { className: "contact-label", "data-i18n": "menu.call", textContent: "Call to order" }),
      el("span", { className: "contact-value", textContent: phone }),
    ]),
  ]);
}

// Pickup address — hand off to the maps app to show the venue *on a map* (a pin
// at its street address; see geo.js / ADR 0016). `place` is a {name,address,lat,
// lng} — for a multi-location venue it's the chosen branch, so the pin targets
// that branch's address, not the primary one.
//
// `km` is the straight-line distance to *this* branch when the viewer's location
// was captured this session (finite ⟺ Near-me gave us an origin AND the branch
// has coords). When present we tuck a mode-aware travel hint under the address —
// "~15 min walk" close by, "~8 min drive" further out (owner steer 2026-07-23;
// travelHint / ADR 0021). Deliberately subtle and "~"-prefixed: an in-app
// approximation, not the live maps figure. No hint without a captured origin —
// never a bogus number.
function addressRow(place, km) {
  const href = mapsUrl(place, settings.get().mapsApp);
  // All handoffs are http(s) universal links now (they open the native maps
  // app on mobile, a browser on desktop), so target/rel apply. Kept as a
  // guard in case a non-http scheme returns here again.
  const web = href.startsWith("http");
  const hint = Number.isFinite(km) ? travelHint(km) : null;
  const text = el("span", { className: "contact-text" }, [
    el("span", { className: "contact-label", "data-i18n": "menu.pickup", textContent: "Pickup" }),
    el("span", { className: "contact-value", textContent: place.address }),
  ]);
  if (hint) {
    text.append(el("span", { className: "contact-travel", textContent: hint.text }));
  }
  return el("a", { className: "contact-row", href, ...(web ? { rel: "noopener", target: "_blank" } : {}) }, [
    el("span", { className: "contact-ico", textContent: "📍", "aria-hidden": "true" }),
    text,
  ]);
}

// Opening hours: a live "Open · until 9pm" status, then the week grouped into
// ranges (splits shown as "12pm–3pm, 5pm–9pm"), today highlighted.
function hoursRow(hours, now, tz) {
  const st = openStatus(hours, now);
  const list = el("ul", { className: "hours-list" });
  for (const wk of groupWeek(hours)) {
    const li = el("li", {}, [
      el("span", { className: "hours-days", textContent: wk.days }),
      el("span", { className: "hours-time", textContent: wk.text }),
    ]);
    if (wk.dows.includes(now.dow)) li.classList.add("is-today");
    list.append(li);
  }
  // Qualify the clock only for a viewer whose device isn't on the venue's —
  // locals (the common case) see no redundant label. When it IS needed, name
  // the venue's own city rather than claiming "NZ time" for a London branch.
  const onVenueTime = viewerOnVenueTime(tz);
  const text = el("span", { className: "contact-text" }, [
    el("span", {
      className: "contact-label",
      "data-i18n": onVenueTime ? "menu.hours" : null,
      textContent: onVenueTime ? "Hours" : `Hours · ${zoneLabel(tz)}`,
    }),
  ]);
  if (st.state !== "unknown") {
    const badge = el("span", {
      className: "hours-badge",
      textContent: st.detail ? `${st.label} · ${st.detail}` : st.label,
    });
    badge.dataset.state = st.state;
    text.append(badge);
  }
  text.append(list);
  return el("div", { className: "contact-row contact-hours" }, [
    el("span", { className: "contact-ico", textContent: "🕐", "aria-hidden": "true" }),
    text,
  ]);
}

// The call / address / hours rows for one branch, in order (any may be absent).
function branchRows(r, b, clock) {
  const rows = [];
  if (b.phone) rows.push(callRow(b.phone));
  if (b.address) rows.push(addressRow(branchAsPlace(r, b), b.distanceKm));
  // Each branch is read on its OWN clock: a chain spanning two zones is open in
  // one and shut in the other, and one shared `now` would have said otherwise.
  if (b.hours) {
    const tz = branchTimezone(r, b);
    rows.push(hoursRow(b.hours, clock.at(tz), tz));
  }
  return rows;
}

// One branch of a multi-location venue: a heading (its label, or its address as
// a fallback name) with a distance chip when we know the viewer's location, then
// that branch's own call / address / hours rows. A real heading — not a bare
// row — so a screen-reader user can navigate branch-by-branch.
function branchBlock(r, b, clock) {
  const heading = b.label || b.address || r.name;
  const head = el("h3", { className: "branch-head" }, [
    el("span", { className: "branch-name", textContent: heading }),
    b.distanceKm != null && b.distanceKm !== Infinity
      ? el("span", { className: "branch-distance", textContent: `📍 ${formatDistance(b.distanceKm, settings.get().units)}` })
      : null,
  ]);
  return el("section", { className: "contact-branch", "aria-label": `${r.name} — ${heading}` }, [
    head,
    ...branchRows(r, b, clock),
  ]);
}

// The contact block: for a single-location venue, the familiar call/address/
// hours rows. For a multi-location venue (locations.js, ADR 0011), one block per
// branch — nearest first when the home screen has captured the viewer's location
// this session (recallOrigin), else data order — each with its own directions
// link, phone and hours.
// The report row closes the card in both shapes (ADR 0028): the contact block is
// where someone looks when the phone number, address or hours are wrong, so
// "something wrong here?" belongs at the end of it rather than somewhere else on
// the page. It is a suggestion to the owner — never an edit (report-ui.js).
function contactCard(r) {
  const clock = makeClock();
  if (!isMultiLocation(r)) {
    // Pass the origin so the single branch carries its distanceKm — that's what
    // lets addressRow show the mode-aware travel hint (ADR 0021). Ordering is a
    // no-op with one branch; without an origin distanceKm stays Infinity → no
    // hint, which is exactly what we want when Near-me hasn't captured a location.
    return el("div", { className: "contact-card" }, [
      ...branchRows(r, orderedBranches(r, recallOrigin())[0], clock),
      venueReportRow(r),
    ]);
  }
  const branches = orderedBranches(r, recallOrigin());
  // A many-branch chain floods the card with far-away addresses. Show at most
  // the 2 nearest within the viewer's proximity dial (favBoostKm); the rest tuck
  // behind a "show all" (locations.branchesToShow). Heading stays neutral
  // ("Branches") since it may now be a subset.
  const { shown, rest } = branchesToShow(branches, settings.get().favBoostKm);
  const card = el("div", { className: "contact-card contact-card-multi" }, [
    el("h2", { className: "contact-branches-head", "data-i18n": "menu.branches", textContent: "Branches" }),
    ...shown.map((b) => branchBlock(r, b, clock)),
  ]);
  if (rest.length) {
    const restWrap = el("div", { className: "contact-branches-rest", hidden: true },
      rest.map((b) => branchBlock(r, b, clock)));
    const toggle = el("button", { type: "button", className: "contact-branches-more" });
    const collapsedLabel = `Show all ${branches.length} branches`;
    toggle.textContent = collapsedLabel;
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = restWrap.hidden;
      restWrap.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Show fewer branches" : collapsedLabel;
    });
    card.append(restWrap, toggle);
  }
  card.append(venueReportRow(r));
  return card;
}

function orderCard(r) {
  const links = [];
  if (r.website) {
    links.push({ platform: "Website", url: r.website });
  }
  for (const o of r.ordering || []) links.push(o);
  if (!links.length) return null;

  const btns = el("div", { className: "order-links" });
  for (const l of links) {
    btns.append(
      el("a", {
        className: "btn btn-order",
        href: l.url,
        rel: "noopener",
        target: "_blank",
        textContent: l.platform,
      })
    );
  }
  return el("section", { className: "order-block", "aria-label": "Order online", "data-i18n-aria": "menu.orderOnline" }, [
    el("h2", { className: "order-block-head", "data-i18n": "menu.orderOnline", textContent: "Order online" }),
    btns,
  ]);
}

/**
 * The subheading — "Asian · Malaysian · Noodles — Johnsonville" — as links.
 * Each facet is a question the reader is already half-asking ("what else is
 * Malaysian?", "what else is out this way?"), and the answer is a screen we
 * already ship: the home list filtered to it. So each one goes back there
 * carrying its own filter rather than sitting on the page as a dead label.
 *
 * Returned as nodes-and-strings for `el`, because the separators (" · ", " — ")
 * are punctuation between the links, not part of any of them — putting them
 * inside would make them clickable and read them out as part of the link name.
 */
function subFacets(r) {
  const link = (facet, value, purpose) =>
    el("a", {
      className: "menu-sub-link",
      href: filterHref(facet, value),
      // Link text alone ("Malaysian") doesn't say what following it does; the
      // label spells out the destination for anyone listing links out of context.
      "aria-label": purpose,
      textContent: value,
    });
  const parts = [];
  for (const c of r.cuisine || []) {
    if (parts.length) parts.push(" · ");
    parts.push(link("cuisine", c, `${c} — see every ${c} place`));
  }
  if (r.area) {
    if (parts.length) parts.push(" — ");
    parts.push(link("area", r.area, `${r.area} — see every place in ${r.area}`));
  }
  return parts;
}

function renderHeader(r) {
  const isRecipes = r.kind === "recipes";
  const meta = isRecipes
    ? "Recipes for the nights you'd rather stay in"
    : [r.cuisine?.join(" · "), r.area].filter(Boolean).join(" — ");
  // Title row carries a ♥ to favourite the whole venue (or collection).
  const venueHeart = heartButton(
    {
      type: "venue",
      venueId: r.id,
      venueName: r.name,
      currency: venueCurrency(r),
      isRecipe: isRecipes,
      sub: meta,
    },
    r.name
  );
  venueHeart.classList.add("heart-lg");

  // Title + heart. The ⓘ beside the name answers one question — "can I trust
  // what I'm reading?" — in whichever direction the evidence points, so it is
  // present either way and only its TONE changes (ADR 0037): amber when the
  // menu needs a refresh, blue when it doesn't. Making it appear only on bad
  // news taught the reader nothing from its absence; an absent icon and an
  // icon saying "checked in store last week" are not the same fact.
  // Whether a refresh is needed stays refreshCaveat's call, not the bare
  // presence of a date (ADR 0036).
  const titleGroup = el("div", { className: "menu-title-group" }, [
    el("h1", { className: "menu-title", textContent: r.name }),
  ]);
  const titleRow = el("div", { className: "menu-title-row" }, [titleGroup, venueHeart]);
  // Recipes are ours: there is no shop to have checked with, so no caveat —
  // and equally nothing to reassure anyone about. They keep a bare title.
  const caveat = isRecipes ? null : refreshCaveat(r, todayIn(venueTimezone(r)));
  if (caveat) {
    const [caveatBtn, caveatNote] = caveatDisclosure(r.id, caveat, r);
    // Button after the title, note absolutely positioned within the group
    // (its positioning context) so it can appear on hover of its sibling.
    titleGroup.append(caveatBtn, caveatNote);
  }

  // The recipe collection's subheading is a sentence, not facets — nothing in
  // it is a filter, so it stays plain text. `meta` (the same line as a string)
  // still feeds the heart's caption, which is stored, not rendered.
  const sub = isRecipes
    ? el("p", { className: "menu-sub", textContent: meta })
    : el("p", { className: "menu-sub" }, subFacets(r));
  const bits = [titleRow, sub];

  // A closure gets a banner, not a disclosure. The "needs a refresh" caveat
  // above can hide behind an ⓘ because a stale price costs a dollar; a closed
  // venue costs a wasted trip, so it states itself and carries the venue's own
  // note ("kitchen refit") when we have one.
  const closure = closureBadge(r, todayIn(venueTimezone(r)));
  if (closure) {
    const banner = el("p", { className: "menu-closure" }, [closure]);
    if (r.closure?.note) {
      banner.append(el("span", { className: "menu-closure-note", textContent: r.closure.note }));
    }
    bits.push(banner);
  }

  // Only present when prices are being converted — so a reader at home never
  // sees it, and a reader abroad is told once instead of 187 times.
  const currencyNote = convertedNote(r);
  if (currencyNote) bits.push(currencyNote);

  // Venue marks: our optional curated household rating (static, from the data;
  // absent today — the feature ships dormant) sits beside the viewer's own
  // interactive personal rating, which is styled distinctly as their unverified
  // mark (ratings-ui.js). Grouped on their own row so the header title reads clean.
  const venueRating = ratingControl(
    { type: "venue", venueId: r.id, venueName: r.name, isRecipe: isRecipes },
    r.name
  );
  bits.push(
    el("div", { className: "menu-rating-row" }, [curatedRating(r.rating), venueRating])
  );

  // Typical spend per person, derived from this venue's own menu prices.
  const pb = priceBand(r);
  if (pb) {
    const parts = [el("span", { className: "price-band", textContent: pb.band })];
    if (pb.perPerson !== null) {
      // `money()` rather than a hard-coded "$": priceBand returns the figure in
      // the VENUE's currency, and this page may be showing the reader another
      // one (ADR 0045). A literal dollar sign here was the one price on the
      // page that didn't convert.
      parts.push(` about ${money(pb.perPerson)} per person `);
      // Curated figure is our call; a derived one is read off the menu prices.
      const est = pb.curated ? "· our estimate" : "· estimated from the menu";
      parts.push(el("span", { className: "price-est", textContent: est }));
    } else {
      // Curated band with no per-person figure — don't leave a lone "$$".
      parts.push(" typical price band");
    }
    bits.push(el("p", { className: "menu-price" }, parts));
  }

  // The contact + order cards used to live here; on wide screens they move to
  // a right-hand info column (see renderAside / the .menu-twocol grid), so the
  // header now carries only the title block.

  // The standing "Read in store, 15 Aug 2026" line is GONE (owner,
  // 2026-08-16). It said the same thing as the ⓘ note directly above it —
  // which already gives the date *and* what was checked and how — so the page
  // asked the reader to read one fact twice, in two voices, and the shorter
  // one carried less. ADR 0031's requirement is that the method is available,
  // not that it is always on screen; the ⓘ satisfies it and is one tap away.
  // If the ⓘ ever stops carrying the date, this line has to come back.

  return el("header", { className: "menu-header" }, bits);
}

// The venue info column: contact card (phone, pickup/map, hours) + order-online
// links. Stacks under the header on a phone; on a tablet/desktop it moves to a
// sticky right-hand column beside the menu (see the .menu-twocol grid). Recipe
// collections have neither, so callers skip this for them. Returns null when
// there's nothing to show.
function renderAside(r) {
  const cards = [contactCard(r)];
  const order = orderCard(r);
  if (order) cards.push(order);
  return el("aside", { className: "menu-aside", "aria-label": "Contact and ordering", "data-i18n-aria": "menu.aside.aria" }, cards);
}

/**
 * An ISO record date as "15 Aug 2026". Built from the parts rather than
 * `new Date(iso)`, which parses a bare date as UTC midnight and so renders
 * the day BEFORE for any viewer west of Greenwich — these are record dates,
 * the same day everywhere, and must not shift with who is reading.
 * Falls back to the raw string for anything that isn't a full ISO date.
 */
// "What we still owe on this dish", as a row of small disclosure chips.
//
// Deliberately NOT in the dish-tags row: those chips describe the food, and
// two of them are allergen warnings. A record-keeping note sitting among them
// would dilute exactly the chips that must not be diluted, so this gets its
// own line above them, in its own shape (a "?" — unknown), never the "⚠" the
// allergen chips and the refresh caveat own.
//
// English only, on purpose: reo.js's safety boundary keeps the refresh caveat
// and the allergen chips in English until a reo review, and this says the same
// class of thing about the same class of fact — including an `allergens` kind.
function needsRow(item, venueId) {
  const rows = dishNeeds(item);
  if (!rows.length) return null;
  const row = el("div", { className: "dish-needs" });
  for (const n of rows) {
    const parts = [el("strong", { textContent: `${n.label}.` }), " "];
    if (n.note) parts.push(`${n.note} `);
    parts.push(n.fix);
    if (n.since) parts.push(` Noticed ${niceDate(n.since)}.`);
    const [btn, note] = disclosure({
      // The dish's id, not its name: two dishes called "Cheeseburger" on one
      // page used to mint the same noteId, so both disclosures' aria-controls
      // pointed at the first one's note — the second button announced someone
      // else's text and toggled nothing.
      noteId: `dish-needs-${venueId}-${dishId(item)}-${n.what}`,
      // Opens with the visible chip text so the accessible name contains the
      // visible label (WCAG 2.5.3), then says what tapping it gets you.
      label: `${n.label} — what would fix this`,
      text: el("span", {}, parts),
      glyph: "?",
    });
    btn.classList.add("needs-btn");
    btn.append(el("span", { className: "needs-label", textContent: n.label }));
    note.classList.add("is-needs");
    row.append(el("span", { className: "needs-slot" }, [btn, note]));
  }
  return row;
}

function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d)
    ? iso
    : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}


/**
 * The currency sentence in the ⓘ beside a menu's prices.
 *
 * Two shapes, and the difference is the whole design. Same currency: one plain
 * statement, as it has always read. Converting: the shop's currency FIRST —
 * because that is what it will charge — then what we are showing, then the date
 * of the rate. "About" and a date are the honest framing for a reference rate;
 * a bare converted figure would read as a quote.
 */
function currencyLine(record) {
  const native = venueCurrency(record);
  const shown = displayCurrency(record);
  if (shown === native) return ` Prices are in ${currencyName(native)}.`;
  const asOf = fxAsOf();
  const dated = asOf ? ` using rates from ${niceDate(asOf)}` : "";
  return (
    ` This place charges in ${currencyName(native)}.` +
    ` You're seeing about what that comes to in ${currencyName(shown)}${dated}` +
    ` — the shop will take the ${native} price.`
  );
}

/**
 * The one visible line that says prices on this page have been converted, shown
 * under the menu header and only when they have been. It answers the two things
 * a reader needs — what the shop charges in, and what they're looking at — once
 * for the whole menu rather than on all 187 dishes.
 */
function convertedNote(record) {
  const native = venueCurrency(record);
  const shown = displayCurrency(record);
  if (shown === native) return null;
  return el("p", { className: "menu-currency-note" }, [
    el("span", { className: "menu-currency-ico", textContent: "≈", "aria-hidden": "true" }),
    el("span", {
      textContent:
        `Prices shown in ${currencyName(shown)}. ` +
        `${record.name} charges in ${currencyName(native)}.`,
    }),
  ]);
}

// The confidence note as an accessible disclosure: a small ⓘ button beside
// the venue name that reveals the note on tap/click (and on hover for mouse
// users, via CSS). A button + aria-expanded, not a bare `title`, so it works
// on touch. Returns [button, note] for the caller to place — the note must be
// a later sibling of the button for the hover reveal to work.
//
// Two tones off one control (ADR 0037). The amber one is a caution and says
// so; the blue one reports what was checked and when, and is also where the
// currency is stated — a reader wondering "is this NZD?" is looking at the
// prices, which is exactly where this sits. (The About dialog carries the
// same fact for anyone who looks there first.)
function caveatDisclosure(id, caveat, record) {
  const warn = caveat.show;
  const [btn, note] = disclosure({
    noteId: `menu-caveat-${id}`,
    label: warn ? "Why this menu needs a refresh" : "When we last checked this menu",
    text: warn ? caveatText(caveat) : confidenceNote(caveat, record),
    // Shape first, colour second — see disclosure.js.
    glyph: warn ? "⚠" : "ⓘ",
  });
  if (!warn) {
    btn.classList.add("is-info");
    note.classList.add("is-info");
  }
  return [btn, note];
}

// How each method reads as something we DID, in the past tense, for the
// positive note. `verificationText`'s phrasing ("Read in store") heads the
// date line lower down; here the sentence needs a verb it can carry.
const CHECKED_PHRASE = {
  "in-store": "checked in store",
  "paper-menu": "read from the shop’s own menu",
  "official-site": "checked against the place’s own site",
  phone: "confirmed with the place by phone",
  // The two untrusted methods can never head the MENU half of this note —
  // refreshCaveat sends those to the amber tone. They reach it only via
  // `detailsVerified`, where a directory listing is often all there is for a
  // phone number, so they say plainly what they are rather than inheriting
  // the bare "checked" fallback and sounding first-party.
  "delivery-app": "taken from a delivery app",
  "third-party": "taken from a directory listing",
};

/**
 * The reassuring half of the ⓘ: what we checked, when, and in what currency.
 * Built as a node rather than a string so the lead reads as a statement and
 * the currency line sits apart from it.
 *
 * The claims are kept separate on purpose. `verified` dates the MENU. It says
 * nothing about the phone number or the opening hours, so those are only
 * mentioned when `detailsVerified` gives them their own date — otherwise the
 * note stays quiet about them rather than borrowing the menu's credit.
 */
function confidenceNote(caveat, record) {
  const how = CHECKED_PHRASE[caveat.method] || "checked";
  const when = niceDate(caveat.date);
  const details = detailsVerification(record);

  let lead = `Menu and prices ${how} on ${when}.`;
  if (details) {
    // Same day and same method is the common case — one reading of the shop,
    // recorded as the two facts it establishes. Say it as one sentence.
    if (details.date === caveat.date && details.method === caveat.method) {
      lead = `Menu, prices and the venue’s details — phone, address and opening hours — ${how} on ${when}.`;
    } else {
      const dHow = CHECKED_PHRASE[details.method] || "checked";
      lead =
        `Menu and prices ${how} on ${when}. ` +
        `Phone, address and opening hours ${dHow} on ${niceDate(details.date)}.`;
    }
  }

  return el("span", {}, [
    el("strong", { textContent: "✅ Up to date. " }),
    lead,
    // Leading space is for the accessibility tree, not the layout: the span is
    // display:block so the space collapses visually, but without it a screen
    // reader runs the two sentences together ("…2026.All prices…").
    el("span", {
      className: "caveat-currency",
      // The venue's OWN currency, not the site's — there is no site currency
      // any more (ADR 0043). This is the sentence a reader looking straight at
      // the prices needs, which is why it sits here and not only in About.
      // When we're converting, it also has to say so, and how old the rate is:
      // an "about" figure presented without its date is a quote we can't honour.
      textContent: currencyLine(record),
    }),
  ]);
}

// What an untrusted source is, in the reader's words. Only the two methods the
// owner excluded appear here — the trusted four never reach this text.
const UNTRUSTED_SOURCE = {
  "delivery-app": "a delivery app",
  "third-party": "a third-party listing",
};

// One sentence per reason (ADR 0036). The reader is being asked to do the same
// thing every time — confirm at the counter — so only the *because* changes;
// three near-identical paragraphs would cost more attention than they repay.
// English on purpose, like every other caution here (see reo.js's safety note).
function caveatText(caveat) {
  const tail = "confirm with the place when you order.";
  if (caveat.reason === "untrusted") {
    // Naming the source is the whole point of the change: "we haven't checked"
    // and "someone else checked, and they mark prices up" are different risks.
    const src = UNTRUSTED_SOURCE[caveat.method] || "a third-party listing";
    return `⚠ These prices came from ${src}, not the place itself — ${tail}`;
  }
  if (caveat.reason === "stale") {
    // Deliberately not "over a year": VERIFY_MAX_AGE_MONTHS is meant to be
    // retuned, and the header prints the actual reading date right below this.
    return `⚠ It’s been a while since we read this menu — ${tail}`;
  }
  // "never" and "unknown-method" — nothing we can stand behind either way, and
  // the wording the screen has always shown.
  return `⚠ Menu items and prices need a refresh — ${tail}`;
}

// A pick is a reference to a dish on this same menu, written as a name today
// (see dish-id.js). It used to be looked up twice — once by name for the price
// and rating, once by slug for the anchor — so a pick could show one dish's
// price and jump to another's row. Both now go through the one resolver, which
// makes that disagreement impossible to express.
function renderPicks(r) {
  if (!r.picks?.length) return null;
  const list = el("div", { className: "picks-list" });
  for (const ref of r.picks) {
    const found = findDish(r, ref);
    const item = found?.item ?? null;
    // Unresolvable pick: no price, no rating, and a dead anchor — exactly what
    // it did before. validate.py is where a dangling pick gets caught; a menu
    // that has already shipped one still has to render.
    const href = `#dish-${item ? dishId(item) : slug(ref)}`;
    list.append(
      el("a", { className: "pick", href }, [
        // The dish's own name, so the chip cannot label itself differently from
        // the row it lands on. Identical to `ref` for every pick written as a
        // name, which today is all of them.
        el("span", { className: "pick-name", textContent: item?.name ?? ref }),
        item && item.price != null
          ? el("span", { className: "pick-price", textContent: money(item.price) })
          : null,
        // Optional curated household rating for this pick (static, from the
        // data; absent today — dormant until the owner supplies real values).
        curatedRating(item?.rating),
      ])
    );
  }
  return el("section", { className: "picks", "aria-label": "Our picks", "data-i18n-aria": "menu.picksAria" }, [
    el("h2", { className: "picks-head", "data-i18n": "menu.picksHead", textContent: "If it’s your first time, try…" }),
    list,
  ]);
}

// Deep-link chips for "goes well with": a same-record dish name, or a
// cross-record "id#Dish Name". Anchors match the dish li ids below.
//
// Only the same-record half can be resolved: `r` is the one menu this page
// holds, and fetching another venue's record to resolve a chip would put a
// network round-trip behind a link. The cross-record half falls back to
// `slug(name)`, which IS the id of any dish that hasn't been given one — so it
// lands exactly where it always did, and the target page's own resolver has the
// last word once you're there.
function pairingLinks(refs, r) {
  const wrap = el("div", { className: "dish-pairs" }, [
    el("span", { className: "dish-pairs-label", "data-i18n": "menu.goesWith", textContent: "Goes well with" }),
  ]);
  for (const ref of refs) {
    const hash = ref.indexOf("#");
    const [id, name] = hash === -1 ? [null, ref] : [ref.slice(0, hash), ref.slice(hash + 1)];
    const here = id ? null : findDish(r, name)?.item;
    const anchor = here ? dishId(here) : slug(name);
    const href = id ? `restaurant.html?id=${id}#dish-${anchor}` : `#dish-${anchor}`;
    // Chip text stays the reference as written: a cross-record ref carries its
    // own display name after the "#" and there is nothing here to check it
    // against, so resolving only the local half would read as inconsistent.
    wrap.append(el("a", { className: "pair-chip", href, textContent: name }));
  }
  return wrap;
}

// Lazy-loaded, layout-stable dish photo (only when the item has one).
function dishPhoto(item) {
  if (!item.image) return null;
  const img = el("img", {
    className: "dish-photo",
    src: item.image,
    alt: item.alt || "",
    loading: "lazy",
    decoding: "async",
  });
  // A photo that fails to load leaves a broken-image icon and the alt text
  // sprawling inside a 269 px empty box — measurably uglier than no photo at
  // all. And this is not the rare case: dish photos are runtime-cached, never
  // precached (ADR 0047 — they are excluded from the 300 KB first-visit budget
  // *because* they lazy-load), so the first offline visit to a menu hits it on
  // every row. Removing the element degrades to exactly the layout every menu
  // had before photos existed, which is a good layout.
  img.addEventListener("error", () => img.remove(), { once: true });
  return img;
}

function renderDish(item, isRecipes = false, r = null, avoid = EMPTY_SET, section = null) {
  const collectionId = r?.id ?? null;
  // The price slot doubles as a recipe meta chip (serves · time).
  const recipeMeta = isRecipes
    ? [item.serves ? `Serves ${item.serves}` : null, item.time || null]
        .filter(Boolean)
        .join(" · ")
    : "";
  const aside = isRecipes
    ? recipeMeta
      ? el("span", { className: "dish-meta", textContent: recipeMeta })
      : null
    : el("span", {
        // Three states, not two. A dash has always meant "this one varies —
        // ask" (market fish, P.O.A). A dish we simply failed to read gets a
        // "?" instead, so the reader can tell the shop's uncertainty from
        // ours; the row below says which and what would fix it (needs.js).
        className: priceUnknown(item) ? "dish-price is-unknown" : "dish-price",
        textContent:
          item.price != null ? money(item.price) : priceUnknown(item) ? "?" : "—",
      });

  // Some venues take orders by number; render that code as a distinct badge
  // rather than run into the title (it's kept out of `name` in the data).
  const codeBadge = item.code
    ? el("span", {
        className: "dish-code",
        textContent: `#${item.code}`,
        title: "Order number",
      })
    : null;

  // What to lead with, and what to show beneath it (ADR 0044). For the ~all
  // records carrying no translations this is exactly `item.name` and an empty
  // list, and the markup is unchanged from before.
  const venueLang = venueLanguage(r);
  const lead = preferred(item, "name", venueLang) ?? { text: item.name, lang: venueLang };
  const otherNames = alternates(item, "name", venueLang);

  // A recipe's name links to its own full page; a restaurant dish is plain
  // text (its detail already lives inline on the menu).
  //
  // `lang` on every one of these is a WCAG 2.2 AA 3.1.2 requirement, not a
  // nicety: unmarked, a screen reader reads Thai with English pronunciation
  // rules. The link carries the dish's id, never a translated rendering —
  // identity is one string per dish and recipe.js resolves the same one.
  const nameEl =
    isRecipes && collectionId
      ? el("h3", { className: "dish-name", lang: lead.lang }, [
          el("a", {
            className: "dish-name-link",
            href: `recipe.html?id=${collectionId}&dish=${dishId(item)}`,
            textContent: lead.text,
          }),
          codeBadge,
        ].filter(Boolean))
      : el("h3", { className: "dish-name", lang: lead.lang }, [
          el("span", { className: "dish-name-text", textContent: lead.text }),
          codeBadge,
        ].filter(Boolean));

  // The name as the menu on the wall writes it, so you can point at it. A
  // separator between renderings, never before the first one.
  const alsoKnown = otherNames.length
    ? el(
        "p",
        { className: "dish-name-alt" },
        otherNames.flatMap((n, i) => [
          i ? el("span", { className: "dish-name-sep", "aria-hidden": "true", textContent: " · " }) : null,
          el("span", { lang: n.lang, textContent: n.text }),
        ]).filter(Boolean)
      )
    : null;

  const head = el("div", { className: "dish-head" }, [nameEl, aside]);
  // Note: li.append() below stringifies null, so only push real nodes.
  const children = [head];
  if (alsoKnown) children.push(alsoKnown);
  // Your personal rating sits directly under the name — it's an identity mark on
  // the dish, so it reads clearest there and stays clear of the heart/Add action
  // cluster below (side by side the two were mistaken for one control). dishEntry
  // is shared with the actions row.
  const dishEntry = r
    ? {
        type: "dish",
        venueId: r.id,
        venueName: r.name,
        name: item.name,
        // What the heart and the rating key off. `name` stays because it is
        // what the favourites view prints; without the id, three dishes called
        // "Cheeseburger" shared one heart between them.
        dishId: dishId(item),
        isRecipe: isRecipes,
      }
    : null;
  if (dishEntry) {
    children.push(el("div", { className: "dish-rating" }, [ratingControl(dishEntry, item.name)]));
  }
  const photo = dishPhoto(item);
  if (photo) children.push(photo);
  if (item.desc) {
    const d = preferred(item, "desc", venueLang) ?? { text: item.desc, lang: venueLang };
    children.push(el("p", { className: "dish-desc", lang: d.lang, textContent: d.text }));
  }
  // Above the tags, below the description: it qualifies what we just told you
  // about this dish, so it reads as a footnote to the description rather than
  // as another property of the food.
  const needs = needsRow(item, r?.id ?? "x");
  if (needs) children.push(needs);
  if (item.tags?.length) {
    const tags = el("div", { className: "dish-tags" });
    for (const t of tagOrder(item.tags)) tags.append(tagChip(t, avoid));
    children.push(tags);
  }
  if (isRecipes && (item.ingredients?.length || item.steps?.length)) {
    children.push(renderRecipeDetail(item));
  }
  if (item.goesWith?.length) {
    children.push(pairingLinks(item.goesWith, r));
  }
  // Actions: a ♥ on every dish (restaurant + recipe); a quantity stepper on
  // restaurant dishes only — Cook at Home is for cooking, not an order to
  // read down the phone.
  if (r) {
    // ⚑ leftmost, furthest from the primary "Add" — a report is a rare,
    // deliberate action and must never be a mis-tap of the order stepper. Venue
    // dishes only: a recipe has no price or venue to correct, and its feedback
    // route is the ⋯ menu (ADR 0028).
    const actions = el("div", { className: "dish-actions" }, [
      isRecipes ? null : dishReportButton(r, item),
      heartButton(dishEntry, item.name),
    ]);
    if (!isRecipes) {
      actions.append(
        dishStepper({
          venueId: r.id,
          venueName: r.name,
          phone: r.phone,
          name: item.name,
          // The order line keys on the id; `name` is what the tally reads out
          // and what gets read down the phone, so both travel.
          dishId: dishId(item),
          price: item.price ?? null,
        })
      );
    }
    children.push(actions);
  }
  // A dish carrying an allergen the viewer flagged gets a warning accent so it
  // stands out while scanning — surfacing our tag, never asserting safety. Same
  // predicate the live re-apply uses (dietary.js), so a settings change can't
  // leave a stale highlight behind.
  const hasFlagged = dishFlagged(item.tags, avoid);
  const cls =
    (isRecipes ? "dish recipe" : "dish") + (hasFlagged ? " dish-flagged" : "");
  const li = el("li", { className: cls, id: `dish-${dishId(item)}` });
  // Two fields, two jobs. `data-name` is the haystack the in-menu text filter
  // matches against — the reader typed a name, not an id — and stays lowercased
  // for that. `data-dish-id` is the row's identity, the same string as the DOM
  // id, so anything wanting to address one particular "Cheeseburger" of three
  // can, without parsing the id off the element.
  li.dataset.name = item.name.toLowerCase();
  li.dataset.dishId = dishId(item);
  // Include ingredients in the search haystack so "lemon" finds the pasta.
  li.dataset.desc = [item.desc, ...(item.ingredients || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  li.dataset.tags = (item.tags || []).join(" ");
  li.append(...children);

  // Add-ons hang off the row rather than sitting in the actions bar: choosing
  // sauces is a considered act, and the ＋ Add beside it is a one-tap one.
  // Configuring the dish rewrites BOTH the flagged treatment and dataset.tags,
  // because applyView() re-reads dataset.tags for the live diet filter — a dish
  // configured out of "vegan" must dim with the rest of them, not linger
  // looking like a match (ADR 0048 §3).
  if (r && !isRecipes) {
    const picker = dishAddOns(r, section, item, (tags) => {
      li.dataset.tags = tags.join(" ");
      li.classList.toggle("dish-flagged", dishFlagged(tags, avoid));
    });
    if (picker) li.append(picker.node);
  }
  return li;
}

function renderRecipeDetail(item) {
  const body = [];
  if (item.ingredients?.length) {
    const ul = el("ul", { className: "ingredients" });
    for (const ing of item.ingredients) ul.append(el("li", { textContent: ing }));
    body.push(el("h4", { className: "recipe-head", "data-i18n": "recipe.ingredients", textContent: "Ingredients" }), ul);
  }
  if (item.steps?.length) {
    // Oven temperatures live inside the step text, so an imperial reader gets
    // the °C swapped for °F as the step is built (units.js, ADR 0029). The
    // stored recipe is untouched; a settings change re-runs this whole render.
    const units = settings.get().units;
    const ol = el("ol", { className: "method" });
    for (const step of item.steps) {
      ol.append(el("li", { textContent: convertTemperatures(step, units) }));
    }
    body.push(el("h4", { className: "recipe-head", "data-i18n": "recipe.method", textContent: "Method" }), ol);
  }
  // Cook mode is reachable from the list too, not only from the recipe's own
  // page — this is where people are browsing when they decide to start cooking.
  const cook = cookButton(item);
  if (cook) body.push(el("div", { className: "cook-start-row" }, [cook]));
  return el("details", { className: "recipe-detail" }, [
    el("summary", { className: "recipe-summary", "data-i18n": "recipe.detail", textContent: "Ingredients & method" }),
    el("div", { className: "recipe-body" }, body),
  ]);
}

function render(r) {
  pageRecord = r;
  document.title = `${r.name} — Faves`;
  const isRecipes = r.kind === "recipes";
  const allItems = r.menu.flatMap((s) => s.items);

  root.replaceChildren();
  root.classList.remove("menu-twocol");
  root.setAttribute("aria-busy", "false");
  // A prior render's compact bar (body-level, so replaceChildren misses it).
  document.querySelector(".contact-bar")?.remove();
  document.body.classList.remove("contact-bar-open");
  root.append(renderHeader(r));

  // Contact + order info. Its own column on wide screens; stacked under the
  // header on a phone. Recipe collections have no contact/order.
  const aside = isRecipes ? null : renderAside(r);
  if (aside) root.append(aside);

  // Mobile: pin a compact call/status bar once the full card scrolls away.
  // Body-level (like the FAB) so its fixed position is viewport-relative, and
  // translated here since the boot's translate() only scopes to `root`.
  if (aside) {
    const bar = compactContactBar(r);
    if (bar) {
      document.body.append(bar);
      translate(bar);
      initContactBar(bar, aside.querySelector(".contact-card"));
    }
  }

  // The menu proper lives in its own block so it can sit left of the aside in
  // the two-column layout (and so nothing else needs to know about the grid).
  const main = el("div", { className: "menu-main" });
  root.append(main);

  const picks = renderPicks(r);
  if (picks) main.append(picks);

  // Stub / empty menu: show a friendly note instead of empty controls. Stay
  // single-column — there's no menu to sit beside the info column.
  if (allItems.length === 0) {
    // Whole-string i18n keys per variant — the engine swaps complete strings.
    const [key, note] = isRecipes
      ? ["recipe.stub", "Recipes coming soon."]
      : r.phone
        ? ["menu.stubCall", "Full menu coming soon — call ahead to order in the meantime."]
        : ["menu.stub", "Full menu coming soon."];
    main.append(el("p", { className: "menu-status", "data-i18n": key, textContent: note }));
    return;
  }

  // A venue with a real menu + an info column gets the two-column grid on wide
  // screens (the CSS gates it by width; the class just opts this page in).
  if (aside) root.classList.add("menu-twocol");

  // Search + section nav share one sticky toolbar so both stay reachable
  // while scrolling a long menu (was: search scrolled away, only the nav
  // stuck). Dietary chips sit just below it and scroll with the content
  // they filter — keeping the pinned chrome light.
  const search = el("input", {
    type: "search",
    className: "menu-search",
    placeholder: isRecipes ? "Search recipes…" : "Search this menu…",
    autocomplete: "off",
    "aria-label": "Search this menu",
    "data-i18n-ph": isRecipes ? "menu.search.recipes.ph" : "menu.search.ph",
    "data-i18n-aria": "menu.search.aria",
  });
  // Custom clear ✕, same as the home search (the native type=search clear is
  // WebKit-only and absent on mobile). Shown whenever the field has any text.
  const searchClear = el(
    "button",
    { type: "button", className: "search-clear", hidden: true, "aria-label": "Clear search", "data-i18n-aria": "search.clear" },
    [el("span", { "aria-hidden": "true", textContent: "✕" })]
  );
  const searchField = el("div", { className: "menu-search-field" }, [search, searchClear]);

  // Personal food preferences (settings.js): the viewer's dietary needs
  // pre-select the matching menu chips, and flagged allergens shout below.
  const prefs = settings.get().diet;
  const avoid = new Set(prefs.avoid);
  const preselect = new Set(prefs.dietary);

  const presentTags = new Set(allItems.flatMap((i) => i.tags || []));
  const activeDiet = new Set();
  const dietChips = [];
  const available = DIET_FILTERS.filter((f) =>
    f.satisfies.some((t) => presentTags.has(t))
  );
  let dietRow = null;
  if (available.length) {
    dietRow = el("div", { className: "diet-chips", role: "group", "aria-label": "Dietary filters", "data-i18n-aria": "menu.diet.aria" });
    // Stamp the pre-selection this row was built from, so a later capture can
    // tell an ad-hoc chip toggle apart from the viewer's stored preference
    // (ui-state.js). By capture time settings.get() has already moved on.
    dietRow.dataset.preselect = [...preselect].join(" ");
    for (const f of available) {
      const on = preselect.has(f.key);
      if (on) activeDiet.add(f.key);
      const chip = el("button", {
        type: "button",
        className: "diet-chip",
        textContent: f.label,
      });
      // setAttribute (not an el() prop): "aria-pressed" is not an IDL property,
      // so Object.assign wouldn't reflect it to the attribute the CSS matches.
      chip.setAttribute("aria-pressed", String(on));
      chip.dataset.key = f.key;
      chip.addEventListener("click", () => {
        if (activeDiet.has(f.key)) activeDiet.delete(f.key);
        else activeDiet.add(f.key);
        chip.setAttribute("aria-pressed", String(activeDiet.has(f.key)));
        applyView();
      });
      dietChips.push({ f, chip });
      dietRow.append(chip);
    }
  }

  const nav = el("nav", { className: "section-nav", "aria-label": "Menu sections", "data-i18n-aria": "menu.sections.aria" });
  const navScroll = el("div", { className: "section-nav-scroll" });
  nav.append(navScroll);

  const toolbar = el("div", { className: "menu-toolbar" }, [searchField, nav]);
  main.append(toolbar);
  if (dietRow) main.append(dietRow);

  const menuWrap = el("div", { className: "menu-sections" });
  const sectionEls = [];
  for (const section of r.menu) {
    // A section whose rows are all offered as add-ons is not shown twice
    // (owner ruling, 2026-08-16). The rows stay in the data — a shared order
    // link naming "Extra halloumi" still decodes, and validate.py guarantees
    // every one of them is reachable as an option before the flag is allowed.
    if (section.addOnsOnly) continue;
    const id = `section-${slug(section.section)}`;
    navScroll.append(
      el("a", { className: "section-link", href: `#${id}`, textContent: section.section })
    );
    const dishes = el("ul", { className: "dish-list" });
    for (const item of section.items) dishes.append(renderDish(item, isRecipes, r, avoid, section));
    const sec = el("section", { className: "menu-section", id }, [
      el("h2", { className: "section-title", textContent: section.section }),
      dishes,
    ]);
    sectionEls.push(sec);
    menuWrap.append(sec);
  }
  main.append(menuWrap);

  const noResults = el("p", { className: "menu-status", hidden: true, "data-i18n": "menu.noMatch", textContent: "No dishes match." });
  main.append(noResults);

  // --- View logic: search hides, dietary dims -----------------------
  function applyView() {
    const q = search.value.trim().toLowerCase();
    searchClear.hidden = search.value.length === 0;
    let visibleTotal = 0;
    for (const sec of sectionEls) {
      let visibleInSection = 0;
      for (const dish of sec.querySelectorAll(".dish")) {
        const matchesSearch =
          !q || dish.dataset.name.includes(q) || dish.dataset.desc.includes(q);
        // Same predicate as the initial render (dietary.js) — one code path.
        const matchesDiet = dishSatisfiesDiet(dish.dataset.tags.split(" "), activeDiet);
        dish.hidden = !matchesSearch;
        dish.classList.toggle("dimmed", matchesSearch && !matchesDiet);
        if (matchesSearch) visibleInSection++;
      }
      sec.hidden = visibleInSection === 0;
      const link = navScroll.querySelector(`a[href="#${sec.id}"]`);
      if (link) link.hidden = visibleInSection === 0;
      visibleTotal += visibleInSection;
    }
    noResults.hidden = visibleTotal !== 0;
  }

  search.addEventListener("input", applyView);
  // Custom ✕ + Escape both clear the field (shared with the home search).
  wireSearchClear(search, searchClear, applyView);

  // --- Scroll-spy: highlight the section in view --------------------
  const links = [...navScroll.querySelectorAll(".section-link")];

  // Keep the highlighted jump-link in view: scroll the horizontal nav strip so
  // the active chip is centred (skipped when it's already near centre, and
  // instant under reduced motion). Otherwise, deep in the menu, the section
  // you're reading has no visible chip. Scrolls the strip only, not the page.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const centerNavLink = (link) => {
    const nr = navScroll.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    const delta = lr.left + lr.width / 2 - (nr.left + nr.width / 2);
    if (Math.abs(delta) < 4) return;
    navScroll.scrollBy({ left: delta, behavior: reduceMotion.matches ? "auto" : "smooth" });
  };
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id;
        // Do all the class/attr writes first, note which link *became* active,
        // then read its rect once — so centring doesn't force a reflow mid-loop.
        let activated = null;
        for (const l of links) {
          const on = l.getAttribute("href") === `#${id}`;
          if (on && !l.classList.contains("active")) activated = l;
          l.classList.toggle("active", on);
          if (on) l.setAttribute("aria-current", "true");
          else l.removeAttribute("aria-current");
        }
        if (activated) centerNavLink(activated);
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  for (const sec of sectionEls) spy.observe(sec);

  // Pin section headings (and dish scroll-jumps) just below the sticky
  // toolbar, whatever height it renders at. Measured once — the toolbar is a
  // single search + one-row nav, so its height is stable.
  const setToolbarH = () =>
    root.style.setProperty("--toolbar-h", `${Math.round(toolbar.getBoundingClientRect().height)}px`);
  requestAnimationFrame(setToolbarH);
  addEventListener("resize", setToolbarH);

  // Apply any pre-selected dietary preferences now (dims non-matching dishes).
  if (activeDiet.size) applyView();
}

// A slim contact bar that pins to the top of the menu on mobile once the full
// contact card has scrolled out of view — so "call to order" and the open-now
// status stay one tap away while you read down a long menu. Desktop keeps the
// sticky aside column instead (CSS suppresses this bar there). Returns null
// when there's nothing worth pinning (no phone and no determinate status).
function compactContactBar(r) {
  const inner = el("div", { className: "contact-bar-inner" });

  // Reads `r.hours` / `r.phone` and that is correct even for a multi-location
  // venue: `data.js` projects the primary branch up to the top level before
  // anything here sees the record, precisely so these consumers stay simple.
  // Open-now status, mirroring the full card's badge (dot + "Open · until 9pm").
  // A lifecycle closure replaces it — the same precedence the card applies.
  const closure = closureBadge(r, todayIn(venueTimezone(r)));
  if (closure) {
    closure.classList.add("contact-bar-status");
    inner.append(closure);
  } else if (r.hours) {
    const st = openStatus(r.hours, nowIn(venueTimezone(r)));
    if (st.state !== "unknown") {
      const badge = el("span", {
        className: "hours-badge contact-bar-status",
        textContent: st.detail ? `${st.label} · ${st.detail}` : st.label,
      });
      badge.dataset.state = st.state;
      inner.append(badge);
    }
  }

  // Call is the star: a compact tel: button. It's why the bar exists for
  // phone-order venues, so it stays reachable the whole way down the menu.
  if (r.phone) {
    inner.append(
      el("a", { className: "contact-bar-call", href: `tel:${r.phone.replace(/\s+/g, "")}` }, [
        el("span", { className: "contact-ico", textContent: "📞", "aria-hidden": "true" }),
        el("span", { "data-i18n": "menu.call", textContent: "Call to order" }),
      ])
    );
  }

  if (!inner.childElementCount) return null;
  return el("div", { className: "contact-bar", hidden: true }, [inner]);
}

// Reveal the compact bar (and drop the sticky toolbar below it) once the full
// contact card scrolls out of view. An IntersectionObserver on the card is
// cheaper and jitter-free vs a scroll listener; the .contact-bar-open body
// class is what CSS keys the toolbar offset off. Falls back to always-hidden
// where IntersectionObserver is missing — the full card still works.
function initContactBar(bar, cardEl) {
  if (!cardEl || !("IntersectionObserver" in window)) return;
  // The bar is a mobile affordance only (desktop has the sticky aside column,
  // where CSS forces it display:none). Match that 48rem breakpoint here so we
  // never toggle .contact-bar-open on desktop — otherwise the sticky toolbar
  // picks up a ~3rem offset for a bar that isn't shown. Re-evaluated on resize.
  const mobile = matchMedia("(max-width: 47.999rem)");
  // The toolbar offset and the bar's own min-height both key off --contact-bar-h.
  // Its 3rem default is only a guess; at large font settings the bar's content
  // is taller and the toolbar would overlap it. Measure the *inner* (not the
  // bar, whose box adds the safe-area padding — measuring that and feeding it
  // back would grow the bar every pass) and pin the var to it. Measured lazily
  // on first show, when the bar finally has a real width.
  const inner = bar.querySelector(".contact-bar-inner");
  let measured = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      const show = mobile.matches && !entry.isIntersecting;
      bar.hidden = !show;
      document.body.classList.toggle("contact-bar-open", show);
      if (show && inner && !measured) {
        measured = true;
        const h = Math.ceil(inner.getBoundingClientRect().height);
        if (h) document.documentElement.style.setProperty("--contact-bar-h", `${h}px`);
      }
    },
    { threshold: 0 }
  );
  io.observe(cardEl);
  // A desktop→mobile resize (or rotate) won't re-fire the observer on its own;
  // nudge it so the class reflects the new width without needing a scroll.
  mobile.addEventListener("change", () => {
    if (!mobile.matches) {
      bar.hidden = true;
      document.body.classList.remove("contact-bar-open");
    }
  });
}

// --- Boot ------------------------------------------------------------
// The order FAB rides along on every screen so a running order is always
// reachable — even on a stub page or if this menu fails to load.
initOrderUI();
initTransferReceive(); // a transfer link can land on any screen (Theme 9 v1)
initBackToTop();
// Remember where the page is scrolled to *before* the Settings dialog opens —
// opening it scrolls the document to the top, so reapply() would otherwise
// capture 0 and drop the viewer back at the top of the menu (ui-state.js).
initScrollMemory();
// Apply the stored UI language to the static chrome (the back link) and set
// <html lang>. Menu content — dish names, descriptions, section names — stays
// as the venue wrote it; generated chrome carries data-i18n and is translated
// after render() below. Safety text (tags, caveats) stays English (reo.js).
initReo();

// This screen reads the active profile's dietary/allergen prefs once, at render
// time (there's no switcher here — you switch on the home screen). If another
// tab switches profile while this menu is open, its chips/warnings would be
// stale — someone else's allergy filter. Reload so prefs re-apply fresh; only
// fire when the *active* profile actually changed (a plain settings edit
// re-reads without a reload elsewhere).
const activeProfileAtLoad = profiles.activeId();
window.addEventListener("storage", (e) => {
  if (e.key !== PROFILES_KEY) return;
  profiles.reload();
  if (profiles.activeId() !== activeProfileAtLoad) location.reload();
});

// The loaded restaurant, held at module scope so the SAFETY re-apply below can
// re-render the exact menu on screen. null until the first render, so a settings
// change or profile switch that lands *during* load re-points the stores now but
// defers painting to the first render (which then reads them fresh).
let current = null;

// SAFETY-CRITICAL re-apply. Re-runs the SAME render(current) the first paint
// uses — re-reading settings.get().diet and rebuilding every dish through the
// shared dietary.js predicates, so the initial and reactive paths cannot
// diverge. No-op until a menu has actually rendered.
//
// The capture/restore either side of it (owner ruling 2026-07-25) hands the
// viewer back their search query, dietary-chip toggles and scroll position. It
// deliberately brackets the re-render rather than touching it: render(current)
// is byte-for-byte the call it always was, and the restore only replays normal
// user-facing handlers afterwards. See ui-state.js for why that separation is
// the whole point.
function reapply() {
  if (!current) return;
  const ui = captureUiState(root);
  render(current);
  translate(root); // re-apply the stored UI language to the freshly built menu
  restoreUiState(root, ui);
}

// The header ⋯ menu (Favourites link / Settings / Share / About). Static markup
// in restaurant.html; wire the same shared modules the home screen uses and fill
// the "browsing as" caption. Independent of the menu load, so the chrome works
// even if the restaurant fails to fetch — which is *why* the Settings dialog and
// its profile switcher become interactive here BEFORE loadRestaurant resolves.
// That makes the store-reload wiring safety-critical to register EARLY, in the
// same synchronous pass as initSettingsUI(): a profile switch mid-load must
// re-point settings/favourites/ratings immediately, or the first render would
// bake in the previous person's allergen filter (stale = unsafe).
function initChrome() {
  initAboutUI();
  initShareApp();
  initReportEntry();
  initOverflowMenu();
  initSettingsUI();

  // Any settings change (allergen/dietary prefs included) → re-apply live.
  settings.subscribe(reapply);
  // Profile switch (in-dialog, any time — even while still "Loading…") →
  // re-point every per-profile store NOW; settings.reload() (last, by contract)
  // fires `reapply`, so the caption flip and the allergen re-apply come from the
  // one event, atomically. Before the first render `reapply` no-ops, but the
  // stores are already refreshed so that first render is the new person's.
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

const id = new URLSearchParams(location.search).get("id");
const errorEl = document.getElementById("menu-error");
const loadingEl = document.getElementById("menu-loading");

function fail() {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = false;
  root.setAttribute("aria-busy", "false");
}

// Jump to the dish named in location.hash once its row is in the DOM. The id
// is decoded because slugs are ASCII but the hash may arrive percent-encoded.
function scrollToHash() {
  const raw = location.hash.slice(1);
  if (!raw) return;
  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    id = raw; // malformed % escape — use as-is
  }
  let target = document.getElementById(id);
  // No element by that id, and it looks like a dish anchor: ask the resolver.
  // This is the half of `formerIds` that faces the outside world — a link
  // shared before a dish's id moved holds the OLD one, and nothing else on the
  // page can turn it back into a row. Scroll to whatever the dish is called
  // now; the address bar keeps the link the reader was sent, which is fine —
  // it will resolve again next time.
  if (!target && current && id.startsWith("dish-")) {
    const found = findDish(current, id.slice("dish-".length));
    if (found) target = document.getElementById(`dish-${dishId(found.item)}`);
  }
  if (!target) return;
  // Wait out render()'s own rAF (which measures --toolbar-h) so the target's
  // scroll-margin-top is correct when we land. Smooth-scroll so you see the dish
  // travel into view (orients you within the menu); instant under reduced motion.
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      target.scrollIntoView({ block: "start", behavior: reduce ? "instant" : "smooth" })
    )
  );
}

if (!id) {
  fail();
} else {
  loadRestaurant(id)
    .then((r) => {
      // Record the menu on screen so the early safety subscribers (initChrome)
      // can re-apply against it. Set BEFORE render so any change racing in during
      // this same microtask still repaints the right restaurant.
      current = r;
      render(r);
      // The chrome renders in English with data-i18n keys; this applies the
      // stored language to it (later switches re-translate the whole page).
      translate(root);
      // A #dish- deep-link (e.g. from the app-wide search) arrives before the
      // menu exists — the browser's native fragment scroll fires at parse time,
      // finds no target, and gives up. Now that the dish rows are in the DOM,
      // jump to it ourselves. Two rAFs so --toolbar-h (set in the first) is
      // applied before scroll-margin-top is honoured. Instant, to land exactly
      // like a hard reload of the same URL.
      scrollToHash();
    })
    .catch((err) => {
      console.error("Faves menu:", err);
      fail();
    });
}
