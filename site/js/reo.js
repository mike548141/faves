// Te reo Māori UI toggle (ROADMAP "Also parked"). A device-local language
// switch for the app *chrome* — buttons, labels, headings, placeholders. It
// deliberately does NOT translate menu content (dish names, descriptions,
// place names, cuisines): those are as the venues wrote them. English is the
// source of truth in the HTML/JS; a key absent from MI below simply stays
// English, so partial coverage is always safe and never blank.
//
// HOW IT WORKS. Static chrome carries data attributes — `data-i18n` (text
// content), `data-i18n-aria` (aria-label), `data-i18n-ph` (placeholder) — and
// translate() swaps them for the current language, capturing the original
// English once so switching back restores it exactly. JS-built strings call
// t(key, english). Changing the language in Settings re-runs translate() over
// the whole document (this module subscribes to the store).
//
// ⚠ WORDING IS A FIRST PASS and wants a reo review before the public launch
// (Phase 7). Macrons (tohutō) are intentional — do not strip them. Safety
// text stays English on purpose until reviewed, rather than ship uncertain te
// reo where a misreading could hurt someone: allergen/dietary tag chips and
// filter labels, the "menu needs a refresh" caveat, the allergy-preferences
// framing, the privacy note, and error prose. It all falls through to English
// automatically. Also still English: strings built by interpolation ("Serves
// 4", "Verified 3 Jul", open-hours badges, order-sheet counts) — the engine
// swaps whole strings only.

import { settings, LANGS } from "./settings.js";

// Māori chrome strings, keyed. Add a key here + a data-i18n on the element (or
// a t() call) to extend coverage. Entries flagged "draft" especially want the
// reviewer's eye.
const MI = {
  // Home header
  "app.sub": "Ā mātou kai tino pai o Pōneke — ngā tahua kai, kotahi te wāhi.", // draft
  // Search
  "search.ph": "Rapua he wāhi, he kai rānei…",
  "search.clear": "Whakawātea rapu",
  "nav.backToTop": "Hoki ki runga",
  // Home list toggles
  "toggle.openNow": "E tuwhera ana",
  "toggle.cheapEats": "Kai utu-iti",
  "toggle.nearMe": "E tata ana",
  // Service segmented control
  "service.all": "Ngā wāhi katoa",
  "service.takeaway": "Mau atu",
  "service.dineIn": "Kai ā-whare",
  // Filter select defaults
  "filter.allAreas": "Ngā rohe katoa",
  "filter.allCuisines": "Ngā momo kai katoa",
  // Overflow / navigation
  "nav.more": "Ētahi atu",
  "nav.favourites": "Ngā Makau",
  "nav.settings": "Ngā Tautuhinga",
  "nav.allRestaurants": "← Ngā wharekai katoa",
  "nav.back": "← Hoki",
  // Favourites view
  "fav.title": "Ngā Makau",
  "fav.allPlaces": "Ngā wāhi katoa",
  "fav.share": "Tuaritia ēnei",
  // "Pick for us"
  "pick.button": "Whiriwhiria mā mātou",
  "pick.eyebrow": "I tēnei pō, ko…",
  "pick.usual": "♥ tētahi o ō makau",
  "pick.go": "Koia tēnā",
  "pick.again": "Anō",
  "pick.empty": "Kāore he wāhi e tau ana — whakawhānuitia ō tātari, ka panoni anō.", // draft
  // Generic
  "generic.close": "Katia",
  // Empty / status prose (draft)
  "result.empty": "Kāore he wāhi e tau ana ki ēnā tātari. Whakawhānuitia.", // draft
  "tz.note": "Kei te wā o Aotearoa ngā wā tuwhera/kati.", // draft
  // Footer
  "footer.made": "Nā",
  // Settings dialog
  "settings.title": "Ngā Tautuhinga",
  "settings.langTitle": "Te Reo",
  // Menu screen chrome (dish names, descriptions and section names are
  // venue content and are never translated; safety text stays English — see
  // the header note)
  "menu.loading": "E uta ana te tahua kai…", // draft
  "menu.call": "Waea atu ki te ōta", // draft
  "menu.pickup": "Tiki atu", // draft
  "menu.hours": "Ngā hāora",
  "menu.hoursNz": "Ngā hāora · wā o Aotearoa", // draft
  "menu.orderOnline": "Ōta ā-ipurangi", // draft
  "menu.picksHead": "He wā tuatahi nōu? Whakamātauria…", // draft
  "menu.picksAria": "Ā mātou kōwhiringa", // draft
  "menu.goesWith": "He pai i te taha o", // draft
  "menu.search.ph": "Rapua tēnei tahua kai…",
  "menu.search.recipes.ph": "Rapua ngā tohutao…",
  "menu.search.aria": "Rapua tēnei tahua kai",
  "menu.sections.aria": "Ngā wāhanga o te tahua kai",
  "menu.diet.aria": "Ngā tātari kai",
  "menu.aside.aria": "Te whakapā me te ōta", // draft
  "menu.noMatch": "Kāore he kai e tau ana.",
  "menu.stub": "Kei te haere mai te tahua kai katoa.",
  "menu.stubCall": "Kei te haere mai te tahua kai katoa — waea atu ki te ōta i te wā nei.", // draft
  // Recipe screens (Cook at Home)
  "recipe.loading": "E uta ana te tohutao…", // draft
  "recipe.stub": "Kei te haere mai ngā tohutao.", // draft
  "recipe.ingredients": "Ngā huānga", // draft
  "recipe.method": "Te tukanga", // draft
  "recipe.detail": "Ngā huānga me te tukanga", // draft
};

// documentElement lang value per language, for screen-reader pronunciation.
const HTML_LANG = { en: "en-NZ", mi: "mi" };

let current = "en";

// Captured English originals, so switching back to English is lossless even
// though the dictionary only stores the Māori side.
const capText = new WeakMap();
const capAria = new WeakMap();
const capPh = new WeakMap();

const mi = (key) => (current === "mi" && key in MI ? MI[key] : null);

/** Current-language string for a JS-built label; falls back to `english`. */
export function t(key, english) {
  return mi(key) ?? english;
}

export function getLang() {
  return current;
}

/** Translate all tagged chrome under `root` (default: the whole document). */
export function translate(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    if (!capText.has(el)) capText.set(el, el.textContent);
    el.textContent = mi(el.dataset.i18n) ?? capText.get(el);
  }
  for (const el of root.querySelectorAll("[data-i18n-aria]")) {
    if (!capAria.has(el)) capAria.set(el, el.getAttribute("aria-label") || "");
    el.setAttribute("aria-label", mi(el.dataset.i18nAria) ?? capAria.get(el));
  }
  for (const el of root.querySelectorAll("[data-i18n-ph]")) {
    if (!capPh.has(el)) capPh.set(el, el.getAttribute("placeholder") || "");
    el.setAttribute("placeholder", mi(el.dataset.i18nPh) ?? capPh.get(el));
  }
}

function readLang() {
  const l = settings.get().lang;
  return LANGS.includes(l) ? l : "en";
}

/**
 * Read the stored language, apply it to the document, and re-apply whenever it
 * changes. Call once per page after the static chrome (and any JS-built dialogs
 * the caller wants covered) is in the DOM.
 */
export function initReo() {
  current = readLang();
  document.documentElement.lang = HTML_LANG[current];
  translate(document);
  settings.subscribe(() => {
    const l = readLang();
    if (l === current) return;
    current = l;
    document.documentElement.lang = HTML_LANG[current];
    translate(document);
  });
}
