// Menu screen. Reads ?id=<restaurant>, fetches its file, renders the
// header, "our picks", section nav (scroll-spy), and dish rows with
// allergen warnings. Search hides non-matches; dietary chips dim them.

import { loadRestaurant } from "./data.js";
import { mapsUrl, recallOrigin } from "./geo.js";
import { orderedBranches, isMultiLocation, branchAsPlace } from "./locations.js";
import { formatDistance } from "./distance.js";
import { openStatus, groupWeek, nzNow, viewerOnNzTime } from "./hours.js";
import { slug } from "./slug.js";
import { dishStepper, initOrderUI } from "./cart-ui.js";
import { heartButton } from "./favourites-ui.js";
import { ratingControl, curatedRating } from "./ratings-ui.js";
import { priceBand } from "./price.js";
import { settings } from "./settings.js";
import { profiles, PROFILES_KEY } from "./profiles.js";
import { initReo, translate } from "./reo.js";
import { disclosure } from "./disclosure.js";
import { initBackToTop } from "./to-top.js";
import { el } from "./dom.js";
import { wireSearchClear } from "./search-clear.js";

const root = document.getElementById("menu-root");
const EMPTY_SET = new Set();

const money = (n) =>
  n == null ? "" : `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;

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

// --- Dietary filter model -------------------------------------------
// A filter is satisfied if the dish carries a qualifying tag.
const DIET_FILTERS = [
  { key: "v", label: "Vegetarian", satisfies: ["v", "vg", "v-option"] },
  { key: "vg", label: "Vegan", satisfies: ["vg"] },
  { key: "gf", label: "Gluten free", satisfies: ["gf", "gf-option"] },
  { key: "df", label: "Dairy free", satisfies: ["df"] },
];

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

// Pickup address — hand off to the maps app for *driving directions* from the
// viewer's location, so it shows the real drive time (see geo.js). `place` is a
// {name,address,lat,lng} — for a multi-location venue it's the chosen branch, so
// the directions target that branch, not the primary one.
function addressRow(place) {
  const href = mapsUrl(place);
  // All handoffs are http(s) universal links now (they open the native maps
  // app on mobile, a browser on desktop), so target/rel apply. Kept as a
  // guard in case a non-http scheme returns here again.
  const web = href.startsWith("http");
  return el("a", { className: "contact-row", href, ...(web ? { rel: "noopener", target: "_blank" } : {}) }, [
    el("span", { className: "contact-ico", textContent: "📍", "aria-hidden": "true" }),
    el("span", { className: "contact-text" }, [
      el("span", { className: "contact-label", "data-i18n": "menu.pickup", textContent: "Pickup" }),
      el("span", { className: "contact-value", textContent: place.address }),
    ]),
  ]);
}

// Opening hours: a live "Open · until 9pm" status, then the week grouped into
// ranges (splits shown as "12pm–3pm, 5pm–9pm"), today highlighted.
function hoursRow(hours, now) {
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
  // Label the clock as NZ time only for a viewer whose device isn't on it —
  // locals (the common case) see no redundant qualifier.
  const onNz = viewerOnNzTime();
  const text = el("span", { className: "contact-text" }, [
    el("span", {
      className: "contact-label",
      "data-i18n": onNz ? "menu.hours" : "menu.hoursNz",
      textContent: onNz ? "Hours" : "Hours · NZ time",
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
function branchRows(r, b, now) {
  const rows = [];
  if (b.phone) rows.push(callRow(b.phone));
  if (b.address) rows.push(addressRow(branchAsPlace(r, b)));
  if (b.hours) rows.push(hoursRow(b.hours, now));
  return rows;
}

// One branch of a multi-location venue: a heading (its label, or its address as
// a fallback name) with a distance chip when we know the viewer's location, then
// that branch's own call / address / hours rows. A real heading — not a bare
// row — so a screen-reader user can navigate branch-by-branch.
function branchBlock(r, b, now) {
  const heading = b.label || b.address || r.name;
  const head = el("h3", { className: "branch-head" }, [
    el("span", { className: "branch-name", textContent: heading }),
    b.distanceKm != null && b.distanceKm !== Infinity
      ? el("span", { className: "branch-distance", textContent: `📍 ${formatDistance(b.distanceKm)}` })
      : null,
  ]);
  return el("section", { className: "contact-branch", "aria-label": `${r.name} — ${heading}` }, [
    head,
    ...branchRows(r, b, now),
  ]);
}

// The contact block: for a single-location venue, the familiar call/address/
// hours rows. For a multi-location venue (locations.js, ADR 0011), one block per
// branch — nearest first when the home screen has captured the viewer's location
// this session (recallOrigin), else data order — each with its own directions
// link, phone and hours.
function contactCard(r) {
  const now = nzNow();
  if (!isMultiLocation(r)) {
    return el("div", { className: "contact-card" }, branchRows(r, orderedBranches(r)[0], now));
  }
  const branches = orderedBranches(r, recallOrigin());
  return el("div", { className: "contact-card contact-card-multi" }, [
    el("h2", { className: "contact-branches-head", "data-i18n": "menu.branches", textContent: "All branches" }),
    ...branches.map((b) => branchBlock(r, b, now)),
  ]);
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
    el("h2", { className: "order-head", "data-i18n": "menu.orderOnline", textContent: "Order online" }),
    btns,
  ]);
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
      isRecipe: isRecipes,
      sub: meta,
    },
    r.name
  );
  venueHeart.classList.add("heart-lg");

  // Title + heart. An unverified venue tucks its "needs a refresh" note
  // behind an ⓘ disclosure next to the name (see caveatDisclosure) rather
  // than an always-on banner, so the header reads clean.
  const titleGroup = el("div", { className: "menu-title-group" }, [
    el("h1", { className: "menu-title", textContent: r.name }),
  ]);
  const titleRow = el("div", { className: "menu-title-row" }, [titleGroup, venueHeart]);
  if (!r.verified && !isRecipes) {
    const [caveatBtn, caveatNote] = caveatDisclosure(r.id);
    // Button after the title, note absolutely positioned within the group
    // (its positioning context) so it can appear on hover of its sibling.
    titleGroup.append(caveatBtn, caveatNote);
  }

  const bits = [titleRow, el("p", { className: "menu-sub", textContent: meta })];

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
      parts.push(` about $${pb.perPerson} per person `);
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

  if (r.verified) {
    const d = new Date(r.verified);
    const nice = isNaN(d)
      ? r.verified
      : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
    bits.push(el("p", { className: "menu-verified", textContent: `Verified ${nice}` }));
  }

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

// The "menu needs a refresh" note as an accessible disclosure: a small ⓘ
// button beside the venue name that reveals the note on tap/click (and on
// hover for mouse users, via CSS). A button + aria-expanded, not a bare
// `title`, so it works on touch. Returns [button, note] for the caller to
// place — the note must be a later sibling of the button for the hover
// reveal to work.
function caveatDisclosure(id) {
  return disclosure({
    noteId: `menu-caveat-${id}`,
    label: "Why this menu needs a refresh",
    text: "⚠ Menu items and prices need a refresh — confirm with the venue when you order.",
  });
}

function renderPicks(r, allItems) {
  if (!r.picks?.length) return null;
  const list = el("div", { className: "picks-list" });
  for (const name of r.picks) {
    const item = allItems.find((i) => i.name === name);
    list.append(
      el("a", { className: "pick", href: `#dish-${slug(name)}` }, [
        el("span", { className: "pick-name", textContent: name }),
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
function pairingLinks(refs) {
  const wrap = el("div", { className: "dish-pairs" }, [
    el("span", { className: "dish-pairs-label", "data-i18n": "menu.goesWith", textContent: "Goes well with" }),
  ]);
  for (const ref of refs) {
    const hash = ref.indexOf("#");
    const [id, name] = hash === -1 ? [null, ref] : [ref.slice(0, hash), ref.slice(hash + 1)];
    const href = id ? `restaurant.html?id=${id}#dish-${slug(name)}` : `#dish-${slug(name)}`;
    wrap.append(el("a", { className: "pair-chip", href, textContent: name }));
  }
  return wrap;
}

// Lazy-loaded, layout-stable dish photo (only when the item has one).
function dishPhoto(item) {
  if (!item.image) return null;
  return el("img", {
    className: "dish-photo",
    src: item.image,
    alt: item.alt || "",
    loading: "lazy",
    decoding: "async",
  });
}

function renderDish(item, isRecipes = false, r = null, avoid = EMPTY_SET) {
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
        className: "dish-price",
        textContent: item.price == null ? "—" : money(item.price),
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

  // A recipe's name links to its own full page; a restaurant dish is plain
  // text (its detail already lives inline on the menu).
  const nameEl =
    isRecipes && collectionId
      ? el("h3", { className: "dish-name" }, [
          codeBadge,
          el("a", {
            className: "dish-name-link",
            href: `recipe.html?id=${collectionId}&dish=${slug(item.name)}`,
            textContent: item.name,
          }),
        ].filter(Boolean))
      : el("h3", { className: "dish-name" }, [
          codeBadge,
          el("span", { className: "dish-name-text", textContent: item.name }),
        ].filter(Boolean));

  const head = el("div", { className: "dish-head" }, [nameEl, aside]);
  // Note: li.append() below stringifies null, so only push real nodes.
  const children = [head];
  const photo = dishPhoto(item);
  if (photo) children.push(photo);
  if (item.desc) {
    children.push(el("p", { className: "dish-desc", textContent: item.desc }));
  }
  if (item.tags?.length) {
    const tags = el("div", { className: "dish-tags" });
    for (const t of tagOrder(item.tags)) tags.append(tagChip(t, avoid));
    children.push(tags);
  }
  if (isRecipes && (item.ingredients?.length || item.steps?.length)) {
    children.push(renderRecipeDetail(item));
  }
  if (item.goesWith?.length) {
    children.push(pairingLinks(item.goesWith));
  }
  // Actions: a ♥ on every dish (restaurant + recipe); a quantity stepper on
  // restaurant dishes only — Cook at Home is for cooking, not an order to
  // read down the phone.
  if (r) {
    const dishEntry = { type: "dish", venueId: r.id, venueName: r.name, name: item.name, isRecipe: isRecipes };
    const actions = el("div", { className: "dish-actions" }, [
      ratingControl(dishEntry, item.name),
      heartButton(dishEntry, item.name),
    ]);
    if (!isRecipes) {
      actions.append(
        dishStepper({
          venueId: r.id,
          venueName: r.name,
          phone: r.phone,
          name: item.name,
          price: item.price ?? null,
        })
      );
    }
    children.push(actions);
  }
  // A dish carrying an allergen the viewer flagged gets a warning accent so it
  // stands out while scanning — surfacing our tag, never asserting safety.
  const hasFlagged = (item.tags || []).some((t) => avoid.has(t));
  const cls =
    (isRecipes ? "dish recipe" : "dish") + (hasFlagged ? " dish-flagged" : "");
  const li = el("li", { className: cls, id: `dish-${slug(item.name)}` });
  li.dataset.name = item.name.toLowerCase();
  // Include ingredients in the search haystack so "lemon" finds the pasta.
  li.dataset.desc = [item.desc, ...(item.ingredients || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  li.dataset.tags = (item.tags || []).join(" ");
  li.append(...children);
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
    const ol = el("ol", { className: "method" });
    for (const step of item.steps) ol.append(el("li", { textContent: step }));
    body.push(el("h4", { className: "recipe-head", "data-i18n": "recipe.method", textContent: "Method" }), ol);
  }
  return el("details", { className: "recipe-detail" }, [
    el("summary", { className: "recipe-summary", "data-i18n": "recipe.detail", textContent: "Ingredients & method" }),
    el("div", { className: "recipe-body" }, body),
  ]);
}

function render(r) {
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

  const picks = renderPicks(r, allItems);
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
    const id = `section-${slug(section.section)}`;
    navScroll.append(
      el("a", { className: "section-link", href: `#${id}`, textContent: section.section })
    );
    const dishes = el("ul", { className: "dish-list" });
    for (const item of section.items) dishes.append(renderDish(item, isRecipes, r, avoid));
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
  const dishSatisfiesDiet = (dish) => {
    if (!activeDiet.size) return true;
    const tags = dish.dataset.tags.split(" ");
    return [...activeDiet].every((key) => {
      const f = DIET_FILTERS.find((x) => x.key === key);
      return f.satisfies.some((t) => tags.includes(t));
    });
  };

  function applyView() {
    const q = search.value.trim().toLowerCase();
    searchClear.hidden = search.value.length === 0;
    let visibleTotal = 0;
    for (const sec of sectionEls) {
      let visibleInSection = 0;
      for (const dish of sec.querySelectorAll(".dish")) {
        const matchesSearch =
          !q || dish.dataset.name.includes(q) || dish.dataset.desc.includes(q);
        const matchesDiet = dishSatisfiesDiet(dish);
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

  // Open-now status, mirroring the full card's badge (dot + "Open · until 9pm").
  if (r.hours) {
    const st = openStatus(r.hours, nzNow());
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
initBackToTop();
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

const id = new URLSearchParams(location.search).get("id");
const errorEl = document.getElementById("menu-error");
const loadingEl = document.getElementById("menu-loading");

function fail() {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = false;
  root.setAttribute("aria-busy", "false");
}

if (!id) {
  fail();
} else {
  loadRestaurant(id)
    .then((r) => {
      render(r);
      // The chrome renders in English with data-i18n keys; this applies the
      // stored language to it (later switches re-translate the whole page).
      translate(root);
    })
    .catch((err) => {
      console.error("Faves menu:", err);
      fail();
    });
}
