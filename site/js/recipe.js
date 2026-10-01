// Recipe detail screen. Opened by tapping a dish name in the Cook at Home
// list: recipe.html?id=<collection>&dish=<dish id>. Shows the whole recipe on
// its own focused, shareable page — meta, photo, ingredients, method, and
// "goes well with" links to the other recipes. Self-contained helpers, in
// keeping with the other screen modules.
//
// It renders BOTH kinds of recipe (roadmap 510/050): a published one, fetched
// from site/data/, and a person's own, read from their user data. A personal
// recipe's URL is the same shape, `recipe.html?id=u:mine&dish=u:<slug>`
// (recipes.js MY_RECIPES) — so a heart, a shopping-list group and cook mode
// link to it with the builders they already had — and the record is the
// published shape, so the one render() below draws both.

// FIRST, on purpose: runs the user-data upgrade chain before any store module
// below reads storage (roadmap 510/040, upgrade-start.js).
import { markUpgradeRan } from "./upgrade-start.js";
import { loadRestaurant } from "./data.js";
import { RECIPES_KEY, isPersonalVenue, recipes } from "./recipes.js";
import { composeRecipe } from "./ingredients.js";
import { slug } from "./slug.js";
import { dishId, findDish } from "./dish-id.js";
import { initOrderUI } from "./cart-ui.js";
import { startSync } from "./sync-start.js";
import { startPersistence } from "./storage-persist.js";
import { heartButton, ownerLabel } from "./favourites-ui.js";
import { settings } from "./settings.js";
import { effectiveAvoid, declaredClaims } from "./dietary.js";
import { convertTemperatures } from "./units.js";
import { profiles, PROFILES_KEY, reloadProfileStores } from "./profiles.js";
import { initReo, translate } from "./reo.js";
import { cookButton } from "./cook-ui.js";
import { initShoppingEntry, shoppingButton } from "./shopping-ui.js";
import { CHECKLIST_KEY, checklist, recipeId } from "./checklist.js";
import { syncTicks, tickRow } from "./checklist-ui.js";
import { notes } from "./notes.js";
import { noteControl } from "./notes-ui.js";
import { ingredientBlocks, noteText } from "./ingredients.js";
import { SCALES, DEFAULT_SCALE, scaleFor, scaleLineStatus, scaleServes } from "./quantity.js";
import { el } from "./dom.js";
import { disclosure } from "./disclosure.js";
import { tagRow, traceEntries } from "./tags.js";
import { recipeStats } from "./recipe-stats.js";
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

// The tag row is tags.js's — the same module the menu row uses, so the two
// screens cannot word, order or collapse the same dish differently (350/020).

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
  // A personal recipe has no collection page to go back to (there is no list
  // of your own recipes yet — the editor item will bring one), so its back
  // link goes home rather than to a menu that does not exist.
  back.href = isPersonalVenue(id) ? "index.html" : `restaurant.html?id=${id}`;
  back.textContent = isPersonalVenue(id) ? "← All places" : `← ${collection.name}`;

  // Two regions, laid out by CSS (ADR 0125): the HERO — photo, title,
  // description, stats, tags, the cook and shopping controls — and the BODY, where the
  // ingredients sit beside the method on a wide screen and above it on a phone.
  // Built as two lists so the DOM order is the phone's reading order and the
  // wide layout is a grid over it, never a reordering the keyboard would miss.
  const parts = [];
  const body = [];
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
  // Where it came from sits behind an ⓘ beside the name (owner, 2026-09-28) —
  // the same control and the same place a venue keeps its "last checked" note,
  // so provenance reads the same on both screens and stays out of the lede.
  // The field ships WITH this control and never before it: site/data/ is
  // precached to every phone, so a field no screen renders is a download nobody
  // asked for (ADR 0047). A source credit is not personal data; a family
  // attribution in a home recipe is owner-approved (CLAUDE.md Exception 1).
  // With `attributionUrl` the credit links to the recipe as its source
  // published it; it leaves the app, hence a new tab.
  const titleGroup = el("div", { className: "menu-title-group" }, [
    el("h1", { className: "menu-title", textContent: item.name }),
  ]);
  if (item.attribution) {
    const credit = item.attributionUrl
      ? el("a", { href: item.attributionUrl, rel: "noopener", target: "_blank", textContent: item.attribution })
      : item.attribution;
    const [btn, note] = disclosure({
      noteId: `recipe-credit-${id}-${dishId(item)}`,
      label: "Where this recipe comes from",
      text: el("span", { className: "recipe-credit" }, [credit]),
    });
    btn.classList.add("is-info");
    note.classList.add("is-info");
    titleGroup.append(btn, note);
  }
  parts.push(el("div", { className: "menu-title-row" }, [titleGroup, heart]));
  // Whose it is, in words, under the name (roadmap 510/300) — the one label
  // Favourites and the Cook at Home list use. Only a recipe from your own
  // cookbook carries one; "Our recipe" joins it when sharing exists.
  if (isPersonalVenue(id)) parts.push(el("p", { className: "recipe-owner-line" }, [ownerLabel("mine")]));
  // The description sits straight under the title and ABOVE the stats panel
  // (owner, 2026-09-29: "should be below 'Chocolate Lava Cakes' and above the
  // box that specifies Prep, Cook, Serves, Difficulty"). ADR 0125 listed it
  // after the stats; this is the owner's later call on a reversible layout.
  if (item.desc) parts.push(el("p", { className: "recipe-lede", textContent: item.desc }));

  // `serves` restated at the chosen scale (17a). Only 3 of the 24 recipes carry
  // it, so most read exactly as they always did; where it IS carried, a reader
  // on 2× is told "Serves 12", not left to double 6 in their head. `time` is
  // NOT scaled and never will be: a doubled mixture in a deeper dish takes
  // longer but not twice as long, and for anything meat-based an under-scaled
  // time is a food-safety failure rather than a disappointing dinner (17a's 🚩).
  const scaled = scaleServes(item.serves, scaleFor(scaleKey));
  const servesText = item.serves
    ? scaled != null && scaleKey !== DEFAULT_SCALE
      ? `Serves ${scaled}`
      : `Serves ${item.serves}`
    : null;
  // The stats panel (ADR 0125), Whittaker's shape: Prep · Cook · Serves ·
  // Difficulty. A value that is OUR estimate is shown like any other — the
  // owner ruled the "est." marker off on 2026-09-28 (ADR 0135). `time` is not
  // repeated here: prep + cook say it better, and the list screen still shows it.
  const stats = recipeStats(item, servesText ? (scaled != null && scaleKey !== DEFAULT_SCALE ? scaled : item.serves) : null);
  if (stats.length) {
    const dl = el("dl", { className: "recipe-stats" });
    for (const c of stats) {
      const dd = el("dd", { className: "recipe-stat-value" }, [c.value]);
      // No "est." beside a value we estimated — owner-ruled 2026-09-28 (ADR
      // 0135, amending 0125). The data still records which values are ours
      // (`estimated`, data/estimates/), so the list row's "about" and the
      // working stay; only this marker went.
      dl.append(el("div", { className: "recipe-stat", "data-stat": c.key }, [
        el("dt", { className: "recipe-stat-label", textContent: c.label }),
        dd,
      ]));
    }
    parts.push(dl);
  } else if (item.time) {
    parts.push(el("p", { className: "menu-sub", textContent: item.time }));
  }

  const trace = traceEntries(item);
  if (item.tags?.length || trace.length) {
    // The reader's own allergens and diets drive loudness, order and what may
    // collapse — both halves, where this page used to read only `avoid`.
    // `trace` is the "may contain" tier (ADR 0136): never a tag, shown as a
    // line in every tip and as a chip only for a reader who flagged it.
    // Halal/Kosher widen the flagged set through the same dietary.js function
    // the menu reads (ADR 0140).
    const all = settings.get();
    const { avoid, dietary } = all.diet;
    const tags = el("div", { className: "dish-tags" });
    tagRow(tags, {
      avoid: effectiveAvoid(avoid, all.foodPrefs),
      dietary: declaredClaims(dietary, all.foodPrefs),
      notes: item.tagNotes,
      recipe: true,
      idPrefix: "tip-recipe",
      trace,
    }).paint(item.tags || []);
    parts.push(tags);
  }

  // Cook mode sits above the recipe, not below it: someone who opened this page
  // to cook from should not have to scroll past the method to find it. Absent on
  // the one recipe with no steps (cook-ui returns null) — nothing to step through.
  // The scale goes through as a GETTER, read at the tap: this page rebuilds on
  // a scale change so a plain value would work today, but cook mode showing 1×
  // quantities beside a 2× page is a silent wrong number in a kitchen (owner,
  // 2026-08-17), and that is not a bug to leave one refactor away from
  // returning.
  const cook = cookButton(item, { venueId: id, scale: () => scaleKey });

  // Ticking off what you have already done (ROADMAP 17e). Every ingredient and
  // every step is a real checkbox, keyed on the RAW line — never on the
  // converted render, or an imperial reader would lose their ticks the moment
  // they flipped units, and never on the index, or an edited recipe would slide
  // every tick onto the wrong line (checklist.js).
  const rid = recipeId(id, item);

  // The shopping list (17e), beside cook mode. `scale` goes through as a getter
  // for the same reason cook mode's does: a list built off a stale scale is a
  // wrong amount discovered in a supermarket.
  const shop = shoppingButton(item, { venueId: id, rid, scale: () => scaleKey });

  // Personal notes on this recipe (17e, ADR 0131) — "used half the sugar,
  // better". Keyed on the same `rid` cook mode and the shopping list use, so a
  // recipe renamed on the page keeps its note (ADR 0051: `dishId` is a stored
  // fact, never derived from the name). Always offered, quiet when empty.
  //
  // All three actions sit in ONE row (owner, 2026-09-28 — they were stacked
  // down the page at three widths). The row is CSS's job, not this code's: the
  // shopping and note controls keep their own markup, and `.recipe-actions`
  // lets their BUTTONS join the row while their status line, the note itself
  // and the note editor drop below it, full width (app.css).
  parts.push(el("div", { className: "cook-start-row recipe-actions" }, [cook, shop, noteControl(rid, item.name)]));

  const blocks = ingredientBlocks(item.ingredients);
  if (blocks.length) {
    // Always shown. It used to fold away behind a ▴ that was remembered for
    // every recipe (37c); the owner removed it on 2026-09-29: "I don't think we
    // need this at all. The ingredients dont need a hide feature."
    const scale = scaleFor(scaleKey);
    // Every line's verdict, computed once so the picker and the list agree.
    const verdicts = blocks.flatMap((b) => b.lines.map((l) => scaleLineStatus(l.text, scale)));
    const blocked = verdicts.filter((v) => v.status === "blocked").length;

    const listBody = [];
    // The scale picker, offered only where it can do something. A recipe of
    // nothing but "Garlic" and "Herbs" — and the corpus has several — would get
    // a control that changes nothing on screen, which reads as a broken button
    // rather than as an honest one.
    if (verdicts.some((v) => v.status === "scaled")) {
      const group = el("div", {
        className: "scale-row", role: "radiogroup", "aria-label": "Scale the ingredients",
      });
      for (const s of SCALES) {
        const on = s.key === scaleKey;
        const b = el("button", {
          type: "button", className: on ? "scale-btn is-on" : "scale-btn",
          textContent: s.label, role: "radio", "aria-checked": String(on),
        });
        // Re-render rather than patching the lines in place: the blocked-line
        // notice, the ticks and `Serves` all move together, and one path that
        // rebuilds everything cannot drift the way three update paths would.
        b.addEventListener("click", () => {
          if (scaleKey === s.key) return;
          scaleKey = s.key;
          reRender();
        });
        group.append(b);
      }
      listBody.push(group);
      // 🚩 The honesty line. A recipe where some lines scaled and others could
      // not is HALF-SCALED, and nothing else on the page would say so — the
      // reader sees doubled flour beside un-doubled chocolate and no hint that
      // the second was a refusal rather than a quantity that happens to be
      // written that way. Counted, not listed: the lines carry their own mark.
      if (blocked && scaleKey !== DEFAULT_SCALE) {
        listBody.push(el("p", {
          className: "scale-note",
          textContent:
            blocked === 1
              ? "1 line below is marked — it cannot be scaled, so it is shown as written."
              : `${blocked} lines below are marked — they cannot be scaled, so they are shown as written.`,
        }));
      }
    }
    let vi = 0;
    for (const b of blocks) {
      // A component heading is h3 under the "Ingredients" h2 — a real heading,
      // so the list is navigable by heading on a screen reader rather than a
      // bolded line that only looks like one.
      if (b.component) {
        listBody.push(el("h3", { className: "ingredient-component", textContent: b.component }));
      }
      const ul = el("ul", { className: "ingredients" });
      // `line.key` carries the component, `line.text` does not: the tick is
      // keyed on the line's full identity while the reader sees the text under
      // its heading, unrepeated (ingredients.js, ADR 0070).
      for (const line of b.lines) {
        const v = verdicts[vi++];
        // `line.key` is the RAW line and never the scaled render — checklist.js:
        // "HASH THE DATA, NEVER THE RENDER". A tick made at 2× is still there at
        // ½×, by the same mechanism that already survives a metric/imperial
        // flip. Only the display text moves.
        const li = el("li", {}, [tickRow(rid, "i", line.key, v.text)]);
        // An ingredient's note (22e step 4) opens from an ⓘ at the end of its
        // line — disclosure(), the control the venue's "last checked" and the
        // tag tips use, so it opens, closes and dismisses the same everywhere.
        // Outside the tick's <label>: tapping the ⓘ must not tick the line.
        const said = noteText(line);
        if (said) {
          const [btn, note] = disclosure({
            noteId: `ing-note-${rid}-${vi}`.replace(/[^\w-]/g, "-"),
            label: `A note on ${line.text}`,
            text: said,
          });
          btn.classList.add("is-info", "ingredient-note-btn");
          note.classList.add("is-info");
          li.classList.add("has-note");
          li.append(btn, note);
        }
        if (v.status === "blocked" && scaleKey !== DEFAULT_SCALE) {
          li.classList.add("is-unscaled");
          // Marked in TEXT as well as in colour: the whole point is that this
          // line disagrees with the scale the reader chose, and a colour alone
          // says nothing to a screen reader or to anyone who cannot see it
          // (WCAG 1.4.1 — never colour as the only carrier of meaning).
          li.append(el("span", { className: "scale-mark", textContent: "as written" }));
        }
        ul.append(li);
      }
      listBody.push(ul);
    }
    body.push(el("section", { className: "recipe-ingredients" }, [
      el("h2", { className: "recipe-head", "data-i18n": "recipe.ingredients", textContent: "Ingredients" }),
      el("div", { className: "ingredients-body" }, listBody),
    ]));
  }
  if (item.steps?.length) {
    const method = [el("h2", { className: "recipe-head", "data-i18n": "recipe.method", textContent: "Method" })];
    // Oven temperatures live inside the step text, so an imperial reader gets
    // the °C swapped for °F as the step is built (units.js, ADR 0029). The
    // stored recipe is untouched; settings.subscribe below repaints on a flip.
    const units = settings.get().units;
    const ol = el("ol", { className: "method" });
    item.steps.forEach((step, index) => {
      const row = tickRow(rid, "s", step, convertTemperatures(step, units), { steps: item.steps, index });
      ol.append(el("li", {}, [row]));
    });
    method.push(ol);
    body.push(el("section", { className: "recipe-method" }, method));
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
    body.push(wrap);
  }

  // The photo leads the hero and is NOT lazy: it is the first thing on the page,
  // and lazy-loading an above-the-fold image only delays the paint it is for.
  // Explicit width/height give the box its shape before the bytes arrive, so
  // nothing below it jumps (CLS).
  const hero = item.image
    ? el("header", { className: "recipe-hero has-photo" }, [
        el("img", {
          className: "recipe-photo", src: item.image, alt: item.alt || "",
          width: 800, height: 800, decoding: "async",
        }),
        el("div", { className: "recipe-hero-text" }, parts),
      ])
    : el("header", { className: "recipe-hero" }, [el("div", { className: "recipe-hero-text" }, parts)]);

  // recipe-body so the shared .ingredients/.method list styling applies.
  root.replaceChildren(el("article", { className: "recipe-detail-page recipe-body" }, [
    hero,
    el("div", { className: "recipe-columns" }, body),
  ]));
  // Chrome renders in English with data-i18n keys; apply the stored language
  // (later switches re-translate the whole page via reo's subscription).
  translate(root);
  root.setAttribute("aria-busy", "false");
}

// The recipe on screen, held so a live settings change can repaint it with the
// SAME render() the first paint used (its ⚠ allergen tags are recomputed from
// fresh prefs — no separate, drift-prone update path). null until first render.
let current = null;

// The chosen ingredient scale (17a). Deliberately NOT persisted, and not in
// `settings`: ADR 0034 refused to persist cook mode's step index on the
// grounds that "where I am" is a position rather than a fact, and a recipe
// reopened days later at 3× is the same bug wearing the same feature's clothes.
// It is also per-page rather than per-recipe because a page holds one recipe.
let scaleKey = DEFAULT_SCALE;

// Re-apply on any settings change — re-reads settings.get().diet.avoid and
// rebuilds the tags. No-op until the recipe has rendered.
function reRender() {
  if (!current) return;
  render(current.collection, current.item);
}

async function main() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const dishRef = params.get("dish");
  if (!id || !dishRef) return fail();
  try {
    // A personal recipe is read from this device's own store — no fetch, so it
    // opens offline without ever having been precached. The published loader
    // composes a recipe's part tags (data.js composeParts); a personal recipe
    // gets the same composition here, so an allergen its ingredients state is
    // shown exactly as it would be on the published copy.
    const personal = isPersonalVenue(id);
    const collection = personal ? recipes.collection() : await loadRestaurant(id);
    const found = recipeByRef(collection, dishRef);
    const item = personal && found ? composeRecipe(found) : found;
    if (!item) return fail();
    current = { collection, item };
    render(collection, item);
    markUpgradeRan(); // the upgraded data has been read and drawn (510/040)
  } catch (err) {
    console.error("Recipe load failed:", err);
    fail();
  }
}

initOrderUI(); // the running order stays reachable from the recipe screen too
startSync(); // continual sync, if the user turned it on (Theme 9 v2)
startPersistence(); // ask the browser to keep your data, after the first write (510/010)
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
  initShoppingEntry(); // the ⋯ menu's route to the list, on every screen (17e)
  // A profile switch inside that dialog must re-point THIS page's stores before
  // anything repaints, or the new person would inherit the last one's hearts.
  // settings.reload() fires last by contract, so the reRender below is already
  // the new person's. Without this line the ⋯ menu would have shipped a
  // cross-profile data leak, which is the whole reason it is here.
  profiles.subscribe(() => reloadProfileStores({ favourites, ratings, notes, settings }));
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

// Ticks can change from somewhere other than these boxes: cook mode ticking
// the same lines in the modal sitting over this page. Re-read them rather than
// re-render — `syncTicks` sets properties only, so the boxes follow without
// rebuilding the recipe underneath the reader.
checklist.subscribe(() => {
  if (current) syncTicks(root, recipeId(current.collection.id, current.item));
});

// A personal recipe changed under this page — a sync pull, an import, or
// another tab. Re-read it through the same resolver and repaint; a recipe
// deleted elsewhere shows the not-found state rather than a stale copy.
recipes.subscribe(() => {
  if (!current || !isPersonalVenue(current.collection.id)) return;
  const collection = recipes.collection();
  const found = recipeByRef(collection, current.item.dishId);
  if (!found) {
    // render() has already replaced the loading and error lines, so fail()
    // has nothing to show: say it here instead.
    current = null;
    root.replaceChildren(
      el("p", { className: "menu-status" }, [
        "This recipe is no longer in your recipes. ",
        el("a", { href: "index.html", textContent: "Back to all places" }),
        ".",
      ])
    );
    return;
  }
  current = { collection, item: composeRecipe(found) };
  reRender();
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
  // This person's own recipes (per profile since roadmap 510/120).
  if (e.key === profiles.scopedKey(RECIPES_KEY)) recipes.reload();
});

main();
