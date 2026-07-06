// Menu screen. Reads ?id=<restaurant>, fetches its file, renders the
// header, "our picks", section nav (scroll-spy), and dish rows with
// allergen warnings. Search hides non-matches; dietary chips dim them.

import { loadRestaurant } from "./data.js";

const root = document.getElementById("menu-root");

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
};
const isAllergen = (t) => t in ALLERGEN;
const isSpicy = (t) => /^spicy-[123]$/.test(t);

function tagChip(t) {
  if (isAllergen(t)) {
    return el("span", {
      className: "tag tag-allergen",
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

function contactCard(r) {
  const rows = [];

  // Phone — the primary way to order. Big and first.
  if (r.phone) {
    rows.push(
      el("a", { className: "contact-row contact-call", href: `tel:${r.phone.replace(/\s+/g, "")}` }, [
        el("span", { className: "contact-ico", textContent: "📞", "aria-hidden": "true" }),
        el("span", { className: "contact-text" }, [
          el("span", { className: "contact-label", textContent: "Call to order" }),
          el("span", { className: "contact-value", textContent: r.phone }),
        ]),
      ])
    );
  }

  // Pickup address — link out to maps.
  if (r.address) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`;
    rows.push(
      el("a", { className: "contact-row", href: mapsUrl, rel: "noopener", target: "_blank" }, [
        el("span", { className: "contact-ico", textContent: "📍", "aria-hidden": "true" }),
        el("span", { className: "contact-text" }, [
          el("span", { className: "contact-label", textContent: "Pickup" }),
          el("span", { className: "contact-value", textContent: r.address }),
        ]),
      ])
    );
  }

  // Opening hours.
  if (r.hours?.length) {
    const hours = el("ul", { className: "hours-list" });
    for (const h of r.hours) {
      const time = h.open && h.close ? `${h.open}–${h.close}` : h.open || "";
      hours.append(
        el("li", {}, [
          el("span", { className: "hours-days", textContent: h.days }),
          el("span", { className: "hours-time", textContent: time }),
        ])
      );
    }
    rows.push(
      el("div", { className: "contact-row contact-hours" }, [
        el("span", { className: "contact-ico", textContent: "🕐", "aria-hidden": "true" }),
        el("span", { className: "contact-text" }, [
          el("span", { className: "contact-label", textContent: "Hours" }),
          hours,
        ]),
      ])
    );
  }

  return el("div", { className: "contact-card" }, rows);
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
  return el("section", { className: "order-block", "aria-label": "Order online" }, [
    el("h2", { className: "order-head", textContent: "Order online" }),
    btns,
  ]);
}

function renderHeader(r) {
  const isRecipes = r.kind === "recipes";
  const meta = isRecipes
    ? "Recipes for the nights you'd rather stay in"
    : [r.cuisine?.join(" · "), r.area].filter(Boolean).join(" — ");
  const bits = [
    el("h1", { className: "menu-title", textContent: r.name }),
    el("p", { className: "menu-sub", textContent: meta }),
  ];

  // Venues get a contact card + order links; a recipe collection has neither.
  if (!isRecipes) {
    bits.push(contactCard(r));
    const order = orderCard(r);
    if (order) bits.push(order);
  }

  if (r.verified) {
    const d = new Date(r.verified);
    const nice = isNaN(d)
      ? r.verified
      : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
    bits.push(el("p", { className: "menu-verified", textContent: `Verified ${nice}` }));
  } else if (!isRecipes) {
    bits.push(
      el("p", { className: "menu-caveat" }, [
        "⚠ Menu items and prices need a refresh — confirm with the venue when you order.",
      ])
    );
  }

  return el("header", { className: "menu-header" }, bits);
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
      ])
    );
  }
  return el("section", { className: "picks", "aria-label": "Our picks" }, [
    el("h2", { className: "picks-head", textContent: "If it’s your first time, try…" }),
    list,
  ]);
}

function renderDish(item, isRecipes = false) {
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

  const head = el("div", { className: "dish-head" }, [
    el("h3", { className: "dish-name", textContent: item.name }),
    aside,
  ]);
  const children = [head];
  if (item.desc) {
    children.push(el("p", { className: "dish-desc", textContent: item.desc }));
  }
  if (item.tags?.length) {
    const tags = el("div", { className: "dish-tags" });
    for (const t of tagOrder(item.tags)) tags.append(tagChip(t));
    children.push(tags);
  }
  if (isRecipes && (item.ingredients?.length || item.steps?.length)) {
    children.push(renderRecipeDetail(item));
  }
  const li = el("li", { className: isRecipes ? "dish recipe" : "dish", id: `dish-${slug(item.name)}` });
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
    body.push(el("h4", { className: "recipe-head", textContent: "Ingredients" }), ul);
  }
  if (item.steps?.length) {
    const ol = el("ol", { className: "method" });
    for (const step of item.steps) ol.append(el("li", { textContent: step }));
    body.push(el("h4", { className: "recipe-head", textContent: "Method" }), ol);
  }
  return el("details", { className: "recipe-detail" }, [
    el("summary", { className: "recipe-summary", textContent: "Ingredients & method" }),
    el("div", { className: "recipe-body" }, body),
  ]);
}

function render(r) {
  document.title = `${r.name} — Faves`;
  const isRecipes = r.kind === "recipes";
  const allItems = r.menu.flatMap((s) => s.items);

  root.replaceChildren();
  root.setAttribute("aria-busy", "false");
  root.append(renderHeader(r));

  const picks = renderPicks(r, allItems);
  if (picks) root.append(picks);

  // Stub / empty menu: show a friendly note instead of empty controls.
  if (allItems.length === 0) {
    const note = isRecipes
      ? "Recipes coming soon."
      : "Full menu coming soon" + (r.phone ? " — call ahead to order in the meantime." : ".");
    root.append(el("p", { className: "menu-status" }, [note]));
    return;
  }

  // Controls: search + dietary chips.
  const search = el("input", {
    type: "search",
    className: "menu-search",
    placeholder: isRecipes ? "Search recipes…" : "Search this menu…",
    autocomplete: "off",
    "aria-label": "Search this menu",
  });
  const controls = el("div", { className: "menu-controls" }, [search]);

  const presentTags = new Set(allItems.flatMap((i) => i.tags || []));
  const activeDiet = new Set();
  const dietChips = [];
  const available = DIET_FILTERS.filter((f) =>
    f.satisfies.some((t) => presentTags.has(t))
  );
  if (available.length) {
    const chipRow = el("div", { className: "diet-chips", role: "group", "aria-label": "Dietary filters" });
    for (const f of available) {
      const chip = el("button", {
        type: "button",
        className: "diet-chip",
        textContent: f.label,
        "aria-pressed": "false",
      });
      chip.dataset.key = f.key;
      chip.addEventListener("click", () => {
        if (activeDiet.has(f.key)) activeDiet.delete(f.key);
        else activeDiet.add(f.key);
        chip.setAttribute("aria-pressed", String(activeDiet.has(f.key)));
        applyView();
      });
      dietChips.push({ f, chip });
      chipRow.append(chip);
    }
    controls.append(chipRow);
  }
  root.append(controls);

  // Section nav (sticky) + sections.
  const nav = el("nav", { className: "section-nav", "aria-label": "Menu sections" });
  const navScroll = el("div", { className: "section-nav-scroll" });
  nav.append(navScroll);
  root.append(nav);

  const menuWrap = el("div", { className: "menu-sections" });
  const sectionEls = [];
  for (const section of r.menu) {
    const id = `section-${slug(section.section)}`;
    navScroll.append(
      el("a", { className: "section-link", href: `#${id}`, textContent: section.section })
    );
    const dishes = el("ul", { className: "dish-list" });
    for (const item of section.items) dishes.append(renderDish(item, isRecipes));
    const sec = el("section", { className: "menu-section", id }, [
      el("h2", { className: "section-title", textContent: section.section }),
      dishes,
    ]);
    sectionEls.push(sec);
    menuWrap.append(sec);
  }
  root.append(menuWrap);

  const noResults = el("p", { className: "menu-status", hidden: true, textContent: "No dishes match." });
  root.append(noResults);

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

  // --- Scroll-spy: highlight the section in view --------------------
  const links = [...navScroll.querySelectorAll(".section-link")];
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = e.target.id;
          for (const l of links) {
            const on = l.getAttribute("href") === `#${id}`;
            l.classList.toggle("active", on);
            if (on) l.setAttribute("aria-current", "true");
            else l.removeAttribute("aria-current");
          }
        }
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  for (const sec of sectionEls) spy.observe(sec);
}

// --- Boot ------------------------------------------------------------
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
  loadRestaurant(id).then(render).catch((err) => {
    console.error("Faves menu:", err);
    fail();
  });
}
