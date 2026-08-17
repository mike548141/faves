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
// filter labels, the "menu needs a refresh" caveat — all three of its wordings
// now (ADR 0036 added a delivery-app/third-party one and a stale one, and they
// stay English with the original) — the allergy-preferences
// framing, the privacy note, and error prose. It all falls through to English
// automatically. Also still English: strings built by interpolation ("Serves
// 4", "Verified 3 Jul", open-hours badges, order-sheet counts) — the engine
// swaps whole strings only.
//
// The fluent-speaker review queue lives in docs/reo-review-queue.md, NOT here.
// A draft parked in MI below is not inert — translate() renders it the moment
// someone flips the toggle — so anything the SAFETY BOUNDARY excludes waits in
// that document instead. It is a document rather than a module for two reasons
// worth not rediscovering: an unrendered table in this file still ships to
// every phone (measured at +2,171 B gzipped when it was tried), and a fluent
// speaker reviewing te reo will not open a JavaScript module.

import { settings, LANGS } from "./settings.js";

// Māori chrome strings, keyed. Add a key here + a data-i18n on the element (or
// a t() call) to extend coverage. Entries flagged "draft" especially want the
// reviewer's eye.
//
// SAFETY BOUNDARY (do not cross): never add an allergen, dietary, or other
// safety-load-bearing string to this table. Those stay English on purpose (a
// misread could hurt someone) and fall through to English automatically because
// they carry no key here. This includes the dietary/allergen tag chips and the
// individual filter chip labels; only neutral chrome (headings, buttons, the
// landmark/aria names) belongs here.
const MI = {
  // Home header
  "app.sub": "Ā mātou kai tino pai — ngā tahua kai, kotahi te wāhi.", // draft
  // Search
  "search.ph": "Rapua he wāhi, he kai rānei…",
  // The rotating search hints (search-hints.js, 2026-08-16) are NOT translated
  // yet, so `t` falls back to their English. Deliberately left rather than
  // guessed: these are eight full sentences, and te reo here is checked
  // against the owner's nominated dictionary, not improvised. Untranslated
  // reads as English; invented reads as wrong, and only one of those is
  // recoverable. Keys owed: search.hint.dish/place/ingredient/diet/cuisine/
  // vibe/area/service/phone.
  "search.clear": "Whakawātea rapu",
  "nav.backToTop": "Hoki ki runga",
  // Home list toggles
  "toggle.openNow": "E tuwhera ana",
  "toggle.cheapEats": "Kai utu-iti",
  // The location ask (ADR 0083; the #geo-ask pill it names was removed with
  // that record). `toggle.nearMe` / "E tata ana" — the
  // key the "Near me" pill carried, then the retired "Sort by" select's second
  // option — is GONE with the last thing that rendered it. A translated string
  // no screen shows is not an asset; it is a claim that something is covered.
  //
  // 🚩 `geo.use` is English-only and IS a new queue item, opened deliberately.
  // The owner authorised it on 2026-08-17, having been asked, against his own
  // 2026-08-16 parking of this queue: "Near me" names the result, "Use my
  // location" names the action, and this is the one button in Faves whose tap
  // raises a browser permission prompt. A reader surprised by that prompt taps
  // Block, which is sticky and far harder to undo than an ungranted permission.
  //
  // ⚑ ADR 0083 added SIX more English-only keys, and they are declared here
  // rather than slipped in: `geo.title`, `geo.why`, `geo.private`, `geo.never`,
  // `geo.skip`, `geo.banner`, `geo.banner.dismiss`. They are the location
  // dialog and its banner — a feature the owner asked for on 2026-08-17, so the
  // strings are a consequence of that request rather than a new front opened on
  // the parked queue. `geo.use` was NOT duplicated: both "Use my location"
  // buttons reuse the key that already existed, because a second key carrying
  // identical English is a second thing to translate for no gain.
  // 🚩 `geo.private` is the one to look at first — "Your location never leaves
  // your device" is a PRIVACY CLAIM, and a mistranslation of it is not a
  // cosmetic fault, it is an untrue promise on the screen that asks for the
  // permission. Better English-only indefinitely than approximately translated.
  //
  // English-only keys now owed, all falling back safely (translate() captures
  // the English on its first pass before mi() can miss): the seven above,
  // `geo.use`, and `menu.opensNewWindow` (the WCAG G201 new-window warning
  // menu.js appends to every off-site link, 31d). `sort.usual` left with its
  // select.
  // ⚠ Not on that list and not a reo item: the #geo-status sentences are set
  // from app.js by textContent, like every other JS-composed status string in
  // this app. They are English wherever they appear, which is the honest state.
  // Service segmented control
  // Re-glossed 2026-08-17 with the English (ROADMAP 37j). It read "Everywhere"
  // / "Ngā wāhi katoa" — a PLACE word on a control that picks dine-in vs
  // takeaway, and in te reo it collided outright with the "All places" of
  // "fav.allPlaces"/"nav.allRestaurants", a different job (leave a panel).
  // "Any service" takes the parallel form of its two neighbours in the row,
  // "All areas" and "All cuisines". The te reo follows the same `Ngā … katoa`
  // frame those two already use, over the noun this file already carries for
  // this exact sense ("filter.service": "Ratonga") — so it is this file's own
  // established pattern applied, not a fresh translation guessed at. The reo
  // queue is parked (owner ruled 2026-08-16); this CLOSES a queued item rather
  // than opening one, which is why it was in scope.
  "service.all": "Ngā ratonga katoa",
  "service.takeaway": "Mau atu",
  "service.dineIn": "Kai ā-whare",
  // Filter select defaults
  "filter.allAreas": "Ngā rohe katoa",
  "filter.allCuisines": "Ngā momo kai katoa",
  // "All styles" — the style-of-dining select (37k). Same `Ngā … katoa` frame
  // as its two neighbours, over the noun drafted for "filter.style" below.
  "filter.allStyles": "Ngā tāera kai katoa", // draft
  // The filter sheet — the bar's one button and the sheet's own chrome.
  // "tātari" (to filter/sift) is the word already used in "pick.empty" below,
  // so this stays consistent with a string that has been in the app a while;
  // "Rohe" and "Momo kai" are the singular forms of the two select defaults
  // just above. The group headings and "clear all" are fresh drafts.
  // ⚠ The button's badge ("Filters — 2 on") and the footer's "Show 6 places"
  // are composed with a number, so they stay English by the rule at the top of
  // this file: the engine swaps whole strings only.
  "filter.button": "Ngā tātari",
  "filter.title": "Ngā tātari",
  "filter.narrow": "Whakawhāitihia ki", // draft — "narrow to"
  "filter.sort": "Raupapa mā", // draft — "order by"
  "filter.sortNote": "He whakaraupapa anō i te rārangi. Kāore e whakapoto.", // draft
  "filter.clearAll": "Whakawāteahia katoa", // draft — "clear all"
  "filter.service": "Ratonga", // draft — "service" (dine-in / takeaway)
  "filter.area": "Rohe",
  "filter.cuisine": "Momo kai",
  // "Style" — how the meal happens (quick eats → fine dining), the `style`
  // facet of `vibe`. `tāera` is the owner-nominated dictionary's own entry for
  // "style, method, technique, fashion, way" (a loan word, and the only
  // attested one in this sense — `huatau` and `tōrire` are style-as-elegance,
  // which is not what this control asks). `kai` qualifies it the same way
  // "Momo kai" qualifies "momo" just above, and keeps the two from colliding:
  // cuisine is what you eat, style is how you eat it.
  //
  // 🚩 It is a DRAFT and it renders the moment someone flips the toggle, so it
  // wants a fluent speaker's eye — but it is chrome, not safety text, so it is
  // inside this table's boundary rather than English-only. The individual vibe
  // LABELS ("Fine dining", "Quick eats") carry no key at all and stay English;
  // the queue is parked and this closes a control's chrome, not a vocabulary.
  "filter.style": "Tāera kai", // draft
  // Overflow / navigation
  "nav.more": "Ētahi atu",
  "nav.favourites": "Ngā Makau",
  "nav.settings": "Ngā Tautuhinga",
  "nav.about": "Mō tēnei", // draft
  "nav.shareApp": "Tuaritia tēnei taupānga", // draft
  "nav.report": "Tukua mai he kōrero", // draft — "send us word"
  // English is now "← All places" (ADR 0035: one noun, "place", for a venue as
  // the reader sees it). "wharekai" is specifically a restaurant/eating-house,
  // so it desynced the moment the English stopped saying "restaurants"; this
  // re-uses the already-reviewed "Ngā wāhi katoa" of "fav.allPlaces" below —
  // same English, same Māori — rather than drafting a fresh string.
  "nav.allRestaurants": "← Ngā wāhi katoa",
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
  "generic.cancel": "Whakakore",
  // Profiles (device-local "who's using Faves?" switcher) — draft; names are
  // user content and are never translated. The privacy note stays English.
  "profile.title": "Ko wai kei te whakamahi i a Faves?", // draft
  "profile.choose": "Tīpakohia ko wai kei te whakamahi i a Faves", // draft
  "profile.browsingAs": "Kei te tirotiro hei", // draft
  "profile.add": "Tāpirihia tētahi", // draft
  "profile.rename": "Whakaingoa anō", // draft
  "profile.delete": "Mukua", // draft
  "profile.save": "Tiaki", // draft
  "profile.firstName": "Ingoa tuatahi", // draft
  // Empty / status prose (draft)
  "result.empty": "Kāore he wāhi e tau ana ki ēnā tātari. Whakawhānuitia.", // draft
  "tz.note": "Kei te wā o Aotearoa ngā wā tuwhera/kati.", // draft
  // Footer
  "footer.made": "Nā",
  "footer.about": "Mō tēnei me te tūmataiti", // draft
  // Settings dialog
  "settings.title": "Ngā Tautuhinga",
  // Language and units share one row now, so the two old keys
  // ("settings.langTitle" = "Te Reo", "settings.unitsTitle" = "Ngā Waeine")
  // are recombined rather than replaced — no new vocabulary, so nothing here
  // needs a fluent speaker to have judged a word we invented.
  "settings.localeTitle": "Te Reo me ngā Waeine", // draft
  // Update notice (a newer app version is waiting). "whakahou" = renew /
  // refresh / update and "putanga" = issue, edition, both per
  // maoridictionary.co.nz; "ā muri ake" = later, afterwards.
  // The English gained "with the latest menus and prices" (2026-08-16); this
  // draft still reads "a new version of Faves is ready" and is owed a redraft
  // against the owner's nominated dictionary — see ROADMAP Theme 23b.
  "update.ready": "Kua rite he putanga hou o Faves.", // draft, now understated
  "update.refresh": "Whakahoutia", // draft
  "update.refreshing": "E whakahou ana…", // draft
  "update.later": "Ā muri ake", // draft
  // Distance and the maps app share a row. "mamao" = distance and "aratohu" =
  // to guide/direct, both per maoridictionary.co.nz; "ngā aratohu" reads as
  // "the directions". Flagged for the fluent-speaker queue like the rest.
  "settings.placesTitle": "Te Mamao me ngā Aratohu", // draft
  // "Your data" — save a copy, bring one back, keep your devices in step
  // (draft). Only the neutral chrome is swapped: the import review itself
  // stays English, because most of it is interpolated counts and the rest is
  // allergen wording, which the safety boundary above keeps English. Sync's
  // own section is untranslated for the same reason its panel always was —
  // it is nearly all prose, not chrome.
  // kōnae = file · raraunga = data · kawe = carry/convey — all per
  // maoridictionary.co.nz.
  "data.title": "Ō raraunga", // draft — "your data"
  "data.download": "Tikina ō raraunga", // draft — "fetch your data"
  "data.importTitle": "Kawea mai anō he raraunga", // draft — "bring data back in"
  "data.chooseFile": "Tīpakohia he kōnae", // draft — "choose a file"
  // Row title for the panel Theme 15 split "Your data" into: refresh the
  // app's cached menus/code, or reset this profile's preferences. Paired
  // with "settings.localeTitle"/"settings.placesTitle" above, not "data.*" —
  // it's an index-row title, not part of the personal-data-blob group.
  // whakahou = renew/refresh/update (per maoridictionary.co.nz, used already
  // for "update.refresh" above); tautuhi = to set/specify, the same root as
  // "Ngā Tautuhinga" (Settings) — "tautuhi anō" reads as "set again", reset.
  "settings.refreshResetTitle": "Whakahou, Tautuhi anō", // draft
  // Menu screen chrome (dish names, descriptions and section names are
  // venue content and are never translated; safety text stays English — see
  // the header note)
  "menu.loading": "E uta ana te tahua kai…", // draft
  "menu.call": "Waea atu ki te ōta", // draft
  "menu.pickup": "Tiki atu", // draft
  "menu.hours": "Ngā hāora",
  "menu.hoursNz": "Ngā hāora · wā o Aotearoa", // draft
  // Lifecycle closures (temporal.js). "kati" = closed/shut, "pūmau" =
  // permanent/fixed, both per maoridictionary.co.nz.
  "closure.temporary": "Kua kati mō te wā", // draft
  "closure.permanent": "Kua kati pūmau", // draft
  "closure.back": "hoki mai", // draft
  "menu.orderOnline": "Ōta ā-ipurangi", // draft
  "menu.picksHead": "He wā tuatahi nōu? Whakamātauria…", // draft
  "menu.picksAria": "Ā mātou kōwhiringa", // draft
  // "huna" = hide/conceal (maoridictionary.co.nz). The ✕ on the picks block.
  "menu.picksClose": "Hunaia ēnei kōwhiringa", // draft
  "menu.goesWith": "He pai i te taha o", // draft
  "rating.our": "Tā mātou whakatauranga", // draft — curated household rating label
  "menu.search.ph": "Rapua tēnei tahua kai…",
  "menu.search.recipes.ph": "Rapua ngā tohutao…",
  "menu.search.aria": "Rapua tēnei tahua kai",
  "menu.sections.aria": "Ngā wāhanga o te tahua kai",
  "menu.diet.aria": "Ngā tātari kai",
  "menu.aside.aria": "Te whakapā me te ōta", // draft
  "menu.noMatch": "Kāore he kai e tau ana.",
  "menu.stub": "Kei te haere mai te tahua kai katoa.",
  "menu.stubCall": "Kei te haere mai te tahua kai katoa — waea atu ki te ōta i te wā nei.", // draft
  // "Tell us what's wrong or missing" (report-ui.js). Neutral chrome only: the
  // allergen report type, the safety note and every status line carry NO key
  // here, so they stay English per the safety boundary above. "hē" (macron) is
  // the verb/noun "to be wrong / error"; bare "he" is the indefinite article and
  // makes the phrase nonsense — do not strip it.
  "report.title": "Kua hē tētahi mea i konei?", // draft — "has something gone wrong here?"
  "report.titleApp": "Tukua mai he kōrero", // draft
  "report.what": "He aha te hē?", // draft — "what is the error?"
  "report.note": "Ētahi atu kōrero (ki tō hiahia)", // draft — "any other word (if you wish)"
  "report.share": "Tuaritia", // draft — "share it"
  "report.copy": "Tāruatia", // draft — "copy it"
  "report.preview": "Ko tēnei ka tukuna", // draft — "this is what gets sent"
  "report.contactLabel": "Kua hē tētahi mea?", // draft
  "report.contactValue": "Tukua mai he kōrero", // draft
  "report.type.price": "Kei te hē te utu", // draft — "the price is wrong"
  "report.type.gone": "Kua mutu tēnei kai", // draft — "this dish has ended"
  "report.type.dishOther": "Tētahi atu mea mō tēnei kai", // draft
  "report.type.venueOther": "Kua tawhito ētahi kōrero", // draft — "some information is out of date"
  "report.type.suggest": "Tāpirihia he wāhi", // draft — "add a place"
  // draft — "hapa" is Te Aka's "error/mistake", but its first gloss is the
  // loanword "supper"; on a food app that collision wants the reviewer's eye.
  "report.type.app": "He hapa, he whakaaro rānei mō te taupānga",
  // Recipe screens (Cook at Home)
  "recipe.loading": "E uta ana te tohutao…", // draft
  "recipe.stub": "Kei te haere mai ngā tohutao.", // draft
  "recipe.ingredients": "Ngā huānga", // draft
  "recipe.method": "Te tukanga", // draft
  "recipe.detail": "Ngā huānga me te tukanga", // draft
  // Cook mode — one step at a time, screen held awake (ROADMAP 17d, ADR 0034).
  // The step counter carries NO key: "Step 3 of 9" is interpolated, and this
  // engine swaps whole strings only. Per maoridictionary.co.nz: aratau = mode ·
  // tunu = to cook/bake · whai ake = next/following · oti = finished ·
  // mataara = awake/alert · mata = screen/face.
  // "Start cooking", not "Cook mode": the button was relabelled 2026-08-16
  // because it named a mode the app has rather than the thing you are about to
  // do. tīmata = to begin. Every line here is still a DRAFT awaiting a fluent
  // speaker (Theme 23 tracks the review).
  "cook.start": "Tīmata te tunu", // draft — "start the cooking"
  "cook.close": "Katia te aratau tunu", // draft — "close cook mode"
  "cook.next": "Whai ake", // draft — "next"
  "cook.prev": "Hoki", // draft — "back"
  "cook.done": "Kua oti", // draft — "it is finished"
  "cook.awake": "Ka noho mataara te mata", // draft — "the screen stays awake"
  // The per-step panel and countdown (2026-08-16). hipanga = step ·
  // tāima = time/timer · tatari = wait · okioki = pause/rest · anō = again.
  "cook.needs": "Ngā huānga mō tēnei hipanga", // draft — "ingredients for this step"
  "cook.timerStart": "Tīmata te tāima", // draft — "start the timer"
  "cook.timerPause": "Okioki", // draft — "pause"
  "cook.timerResume": "Haere tonu", // draft — "carry on"
  "cook.timerDone": "Kua oti te tāima", // draft — "the time is finished"
  "cook.timerReset": "Tīmata anō", // draft — "start again"
  "cook.stepDone": "Kua oti tēnei hipanga", // draft — "this step is finished"
  "cook.read": "Pānui ā-waha", // draft — "read aloud"
  "cook.readStop": "Kāti", // draft — "stop"
};

let current = "en";

// Captured English originals, so switching back to English is lossless even
// though the dictionary only stores the Māori side.
const capText = new WeakMap();
const capAria = new WeakMap();
const capPh = new WeakMap();
// Captured original `lang` (usually none) so reverting to English is lossless.
const capLang = new WeakMap();

const mi = (key) => (current === "mi" && key in MI ? MI[key] : null);

/** Current-language string for a JS-built label; falls back to `english`. */
export function t(key, english) {
  return mi(key) ?? english;
}

export function getLang() {
  return current;
}

// Language of Parts (WCAG 2.2 SC 3.1.2). The document root stays `en-NZ`
// (English is the source of truth and every venue/menu/recipe string, all
// safety text, and the interpolated strings are English); we mark ONLY the
// chrome we actually render in te reo with lang="mi". Flipping the whole
// document to "mi" — the old behaviour — made a screen reader pronounce all
// that untranslated English as Māori, which on a menu screen is most of the
// page. An element counts as te reo when any of its i18n keys resolved to a
// Māori string this pass.
function markLang(el, isMi) {
  if (!capLang.has(el)) capLang.set(el, el.getAttribute("lang"));
  if (isMi) {
    el.setAttribute("lang", "mi");
  } else {
    const orig = capLang.get(el);
    if (orig == null) el.removeAttribute("lang");
    else el.setAttribute("lang", orig);
  }
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
  for (const el of root.querySelectorAll(
    "[data-i18n],[data-i18n-aria],[data-i18n-ph]",
  )) {
    const isMi =
      mi(el.dataset.i18n) != null ||
      mi(el.dataset.i18nAria) != null ||
      mi(el.dataset.i18nPh) != null;
    markLang(el, isMi);
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
  // Root stays en-NZ regardless of the UI language; te reo is marked per part
  // by translate() (see markLang). Defensive re-assert in case something moved it.
  document.documentElement.lang = "en-NZ";
  translate(document);
  settings.subscribe(() => {
    const l = readLang();
    if (l === current) return;
    current = l;
    translate(document);
  });
}
