// The Settings dialog, injected on the home and restaurant screens (opened from
// the ⋯ menu).
//
// SHAPE: an index of rows that drill down into single-topic panels, the way
// every phone's own Settings works (ADR 0025). One flat scroll used to hold
// every control at once; at 390 px that was ~1600 px of sheet, which put the
// safety-critical allergen chips and the distance dials below the fold with no
// hint they existed. Each index row now carries its *current value* as its
// subtitle, so the state you'd have scrolled to read is legible without opening
// anything, and a new topic (import, sync, recipes) is one more row rather than
// another slab of scroll.
//
// The topics:
//   • Food preferences — dietary needs and the allergens to flag. These apply on
//     every menu: dietary needs pre-select the menu's dietary chips, flagged
//     allergens make matching ⚠ warnings shout. Safety framing is load-bearing:
//     we surface what the data records, never assert safety.
//   • Distance — the two dials (settings.js): the branch-proximity cutoff, and
//     how far is "too far tonight".
//   • Maps app / Language — one <select> each.
//   • People — the device-local profile roster (add / rename / delete).
//   • Your data — export everything, force a full refresh of the stored menus
//     and app code, and reset this profile's preferences.
// The profile *switcher* itself stays on the index (and moves into the People
// panel while that's open) because switching is one tap and it's the context
// every other setting sits inside — nobody should browse under someone else's
// allergen filter by accident.
//
// Everything writes straight to the store; the home list re-ranks live via
// app.js's own subscription, and each menu reads the preferences on load.

import { settings, BOUNDS, DIETARY_PREFS, ALLERGEN_PREFS, MAPS_APPS } from "./settings.js";
import { profiles, deviceStorage } from "./profiles.js";
import {
  collectPersonalData,
  personalDataFilename,
  personalDataJson,
  summarisePersonalData,
} from "./personal-data.js";
import { forceRefresh } from "./cache-refresh.js";
import { disclosure } from "./disclosure.js";
import { el } from "./dom.js";
import { closeButton, wireDialog } from "./dialog.js";
import { t, translate } from "./reo.js";

function field({ id, label, hint, min, max, step }) {
  const input = el("input", { type: "range", id, min, max, step, className: "settings-range" });
  const out = el("output", { className: "settings-out", htmlFor: id });
  const row = el("div", { className: "settings-field" }, [
    el("label", { className: "settings-label", htmlFor: id }, [
      el("span", { textContent: label }),
      out,
    ]),
    input,
    hint ? el("p", { className: "settings-hint", textContent: hint }) : null,
  ]);
  return { row, input, out };
}

// A compact <select> — used for both Language and Maps app. A dropdown, not a
// segmented toggle or a stack of radios, because each reads unmistakably as
// "choose one" and scales to more entries by adding an <option>. Styled to match
// the home Area/Cuisine selects.
function selectControl({ ariaLabel, options, onChange }) {
  const select = el("select", { className: "lang-select-input" });
  select.setAttribute("aria-label", ariaLabel);
  for (const { key, label } of options) {
    select.append(el("option", { value: key, textContent: label }));
  }
  select.addEventListener("change", () => onChange(select.value));
  return { group: el("div", { className: "lang-select" }, [select]), select };
}

// A group of multi-select toggle chips backed by one list on the diet prefs
// (`kind` is "dietary" or "avoid"). Toggling rewrites the whole diet object.
function prefChips(prefs, kind) {
  // Avoided allergens read as a warning (red) when set; dietary needs as accent.
  const cls = kind === "avoid" ? "pref-chips pref-chips-avoid" : "pref-chips";
  const group = el("div", { className: cls, role: "group" });
  const chips = [];
  for (const p of prefs) {
    const chip = el("button", {
      type: "button",
      className: "pref-chip",
      textContent: p.label,
      "aria-pressed": "false",
    });
    chip.dataset.key = p.key;
    chip.addEventListener("click", () => {
      const diet = settings.get().diet;
      const set = new Set(diet[kind]);
      set.has(p.key) ? set.delete(p.key) : set.add(p.key);
      settings.set({ diet: { ...diet, [kind]: [...set] } });
    });
    chips.push({ key: p.key, chip });
    group.append(chip);
  }
  return { group, chips, kind };
}

// --- Index row summaries ------------------------------------------------
// Each row's subtitle is the setting's current value in plain words. These are
// the payload of the redesign: the answer to "is my nut allergy flagged?" now
// reads off the first screen instead of two scrolls down. All English on
// purpose — reo.js's safety boundary keeps dietary/allergen wording English,
// and the rest are interpolated strings the swap engine doesn't cover anyway.

function dietSummary(s) {
  const needs = DIETARY_PREFS.filter((p) => s.diet.dietary.includes(p.key)).map((p) => p.label);
  const n = s.diet.avoid.length;
  const bits = [];
  if (needs.length) bits.push(needs.join(", "));
  if (n) bits.push(`${n} allergen${n === 1 ? "" : "s"} flagged`);
  return bits.length ? bits.join(" · ") : "None set";
}

function peopleSummary() {
  const names = profiles.list().map((p) => p.name);
  return names.length > 1 ? names.join(", ") : `Just ${names[0]}`;
}

/** Hand `text` to the browser as a downloaded file. Object URLs leak until
 *  revoked, so revoke on the next tick — after the click has been handled. */
function downloadText(filename, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// --- People ------------------------------------------------------------
// Several people share one phone; each profile is a separate bucket of
// favourites + food preferences (profiles.js). Switching re-points those stores
// live. First names only, device-local, nothing sent anywhere — the privacy line
// says so plainly.
//
// Native radios back the switch (real keyboard + screen-reader semantics, styled
// as chips). One shared inline form does Add and Rename; Delete uses an inline
// confirm (removing a person wipes their data, so it's a stop-and-confirm), and
// the last profile can never be deleted. A visually-hidden live region announces
// each change. Returns { panel, list, refresh } — `list` is the radiogroup, which
// the dialog moves between the index and this panel; refresh() rebuilds it.
function peopleSection() {
  const status = el("p", { className: "sr-only", role: "status", "aria-live": "polite" });
  const announce = (msg) => { status.textContent = ""; status.textContent = msg; };

  // Privacy framing stays English on purpose (like the app's other privacy
  // prose — reo.js leaves it English until a reo review).
  const privacy = el("p", {
    className: "settings-note",
    textContent: "Profiles stay on this device — nothing is sent anywhere, and no one else can see them.",
  });

  const list = el("div", { className: "profile-list", role: "radiogroup" });
  list.setAttribute("aria-label", "Choose who’s using Faves");
  list.dataset.i18nAria = "profile.choose";

  const addBtn = el("button", { type: "button", className: "profile-btn", "data-act": "add", textContent: "Add someone" });
  addBtn.dataset.i18n = "profile.add";
  const renameBtn = el("button", { type: "button", className: "profile-btn", "data-act": "rename", textContent: "Rename" });
  renameBtn.dataset.i18n = "profile.rename";
  const deleteBtn = el("button", { type: "button", className: "profile-btn profile-btn-danger", "data-act": "delete", textContent: "Delete" });
  deleteBtn.dataset.i18n = "profile.delete";
  const actions = el("div", { className: "profile-actions" }, [addBtn, renameBtn, deleteBtn]);
  // Rename/Delete act on whoever is selected above, which isn't obvious once the
  // switcher and the actions are the only two things on screen together.
  const scope = el("p", { className: "settings-hint", textContent: "Rename and Delete apply to the person selected above." });

  // Shared Add/Rename form. `mode` is "add" | "rename"; hidden until invoked.
  const nameInput = el("input", {
    type: "text", id: "profile-name-input", className: "profile-name-input",
    maxLength: 24, autocomplete: "off", autocapitalize: "words", enterKeyHint: "done",
  });
  const nameLabel = el("label", { className: "sr-only", htmlFor: "profile-name-input", textContent: "First name" });
  nameLabel.dataset.i18n = "profile.firstName";
  const saveBtn = el("button", { type: "submit", className: "profile-btn profile-btn-primary", textContent: "Save" });
  saveBtn.dataset.i18n = "profile.save";
  const formCancel = el("button", { type: "button", className: "profile-btn", "data-act": "cancel", textContent: "Cancel" });
  formCancel.dataset.i18n = "generic.cancel";
  const form = el("form", { className: "profile-form", hidden: true }, [
    nameLabel, nameInput, el("div", { className: "profile-form-actions" }, [saveBtn, formCancel]),
  ]);
  let mode = "add";

  // Inline delete confirm — its own group so the destructive action is a
  // deliberate second tap, never a stray one.
  const confirmText = el("p", { className: "profile-confirm-text" });
  const confirmDelete = el("button", { type: "button", className: "profile-btn profile-btn-danger", "data-act": "confirm-delete", textContent: "Delete" });
  confirmDelete.dataset.i18n = "profile.delete";
  const confirmCancel = el("button", { type: "button", className: "profile-btn", "data-act": "cancel", textContent: "Cancel" });
  confirmCancel.dataset.i18n = "generic.cancel";
  const confirm = el("div", { className: "profile-confirm", role: "group", hidden: true }, [
    confirmText, el("div", { className: "profile-form-actions" }, [confirmDelete, confirmCancel]),
  ]);
  confirm.setAttribute("aria-label", "Confirm delete");

  function hidePanels(restoreFocus = true) {
    form.hidden = true;
    confirm.hidden = true;
    // Add is always present + enabled — a safe home for focus so a keyboard user
    // is never dropped to <body> when a panel closes (or its control vanishes).
    if (restoreFocus) addBtn.focus();
  }
  function openForm(nextMode) {
    mode = nextMode;
    confirm.hidden = true;
    nameInput.value = nextMode === "rename" ? profiles.active().name : "";
    form.hidden = false;
    nameInput.focus();
    nameInput.select();
  }
  function openConfirm() {
    form.hidden = true;
    confirmText.textContent =
      `Delete ${profiles.active().name}? This removes their favourites and food ` +
      `preferences from this device. It can’t be undone.`;
    confirm.hidden = false;
    confirmDelete.focus();
  }

  addBtn.addEventListener("click", () => openForm("add"));
  renameBtn.addEventListener("click", () => openForm("rename"));
  deleteBtn.addEventListener("click", openConfirm);
  formCancel.addEventListener("click", hidePanels);
  confirmCancel.addEventListener("click", hidePanels);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value;
    if (mode === "rename") {
      if (profiles.rename(profiles.activeId(), name)) announce(`Renamed to ${profiles.active().name}.`);
    } else {
      const id = profiles.create(name);
      if (id) announce(`Added ${profiles.active().name}. Now browsing as ${profiles.active().name}.`);
    }
    hidePanels();
  });
  confirmDelete.addEventListener("click", () => {
    const name = profiles.active().name;
    if (profiles.remove(profiles.activeId())) announce(`Deleted ${name}. Now browsing as ${profiles.active().name}.`);
    hidePanels();
  });

  // Switching profile: native radio change. profiles.setActive triggers the
  // store subscribers (favourites/settings reload + re-render) elsewhere.
  list.addEventListener("change", (e) => {
    const radio = e.target.closest('input[type="radio"]');
    if (!radio) return;
    if (profiles.setActive(radio.value)) {
      hidePanels(false); // keep focus on the radio the user just activated
      announce(`Now browsing as ${profiles.active().name}.`);
    }
  });

  // Signature of the roster (ids + names). A mere active-profile *switch* leaves
  // it unchanged, so we only flip the `checked` flags — the radio DOM nodes
  // survive and keyboard focus stays put. A full rebuild happens only when the
  // roster genuinely changes (add / rename / delete).
  let lastSig = null;
  function refresh() {
    const people = profiles.list();
    const activeId = profiles.activeId();
    const sig = people.map((p) => `${p.id}\n${p.name}`).join("|");
    if (sig === lastSig) {
      for (const r of list.querySelectorAll("input.profile-radio")) r.checked = r.value === activeId;
    } else {
      lastSig = sig;
      list.replaceChildren(
        ...people.map((p) => {
          const input = el("input", { type: "radio", name: "faves-profile", className: "sr-only profile-radio", value: p.id });
          input.checked = p.id === activeId;
          const label = el("label", { className: "profile-chip" }, [input, el("span", { textContent: p.name })]);
          return label;
        })
      );
    }
    // The last profile can't be deleted (someone must stay active).
    deleteBtn.disabled = people.length <= 1;
  }

  // `list` is appended by the dialog, not here — it lives on the index while the
  // index is showing and slides in with this panel when the panel opens.
  const listSlot = el("div", { className: "profile-list-slot" });
  const panel = el("div", { className: "settings-panel" }, [
    privacy, listSlot, actions, scope, form, confirm, status,
  ]);
  refresh();
  return { panel, list, listSlot, refresh, hidePanels };
}

// --- Your data ---------------------------------------------------------
// Export everything (every profile, not just the active one), the full refresh
// (Theme 16c — cached menus and app code only, never the personal layer), plus
// the reset.
// Reset lives here rather than on the index because the index is now short
// enough that a bare "Reset" button would sit one stray tap from wiping the
// allergen flags — and because "what's stored, and how do I get rid of it" is
// one topic. It confirms inline, same pattern as deleting a person.
function dataSection() {
  const note = el("p", {
    className: "settings-note",
    textContent:
      "Everything you’ve added — favourites, ratings, settings, everyone’s profiles and the order tally — " +
      "lives in this browser only. Save a copy you can keep.",
  });
  const btn = el("button", {
    type: "button",
    className: "settings-reset",
    textContent: "Download my data",
  });
  // Polite, not assertive: the result is a confirmation, not an interruption.
  const status = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });

  btn.addEventListener("click", () => {
    try {
      const exportedAt = new Date().toISOString();
      const data = collectPersonalData(deviceStorage, { exportedAt });
      const s = summarisePersonalData(data);
      const name = personalDataFilename(exportedAt);
      downloadText(name, personalDataJson(data));
      const bits = [
        `${s.profiles} ${s.profiles === 1 ? "person" : "people"}`,
        `${s.favourites} ${s.favourites === 1 ? "favourite" : "favourites"}`,
        `${s.ratings} ${s.ratings === 1 ? "rating" : "ratings"}`,
      ];
      if (s.orderItems) bits.push(`${s.orderItems} order ${s.orderItems === 1 ? "item" : "items"}`);
      status.textContent = `Saved ${name} — ${bits.join(", ")}.`;
    } catch {
      // Storage blocked, or the browser refused the download (some in-app
      // browsers do). Say so plainly rather than leaving a dead button.
      status.textContent =
        "Couldn’t save the file. Your browser may be blocking downloads — try opening Faves in Safari or Chrome.";
    }
  });

  // Reset — scoped to the *active profile's* preferences (settings.reset()), so
  // say exactly that; it leaves favourites, ratings and everyone else alone.
  const resetHead = el("p", { className: "settings-sub", textContent: "Start over" });
  const resetNote = el("p", {
    className: "settings-hint",
    textContent:
      "Puts food preferences, distance, language and maps app back to their defaults for the person browsing. " +
      "Favourites, ratings and other people’s settings are untouched.",
  });
  const resetBtn = el("button", { type: "button", className: "settings-reset", textContent: "Reset to defaults" });
  const resetConfirmText = el("p", { className: "profile-confirm-text" });
  const resetGo = el("button", { type: "button", className: "profile-btn profile-btn-danger", textContent: "Reset" });
  const resetCancel = el("button", { type: "button", className: "profile-btn", textContent: "Cancel", "data-i18n": "generic.cancel" });
  const resetConfirm = el("div", { className: "profile-confirm", role: "group", hidden: true }, [
    resetConfirmText, el("div", { className: "profile-form-actions" }, [resetGo, resetCancel]),
  ]);
  resetConfirm.setAttribute("aria-label", "Confirm reset");
  const resetStatus = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });

  resetBtn.addEventListener("click", () => {
    resetConfirmText.textContent =
      `Reset ${profiles.active().name}’s preferences to defaults? Any dietary needs and flagged allergens will be cleared.`;
    resetConfirm.hidden = false;
    resetGo.focus();
  });
  resetCancel.addEventListener("click", () => {
    resetConfirm.hidden = true;
    resetBtn.focus();
  });
  resetGo.addEventListener("click", () => {
    settings.reset();
    resetConfirm.hidden = true;
    resetStatus.textContent = "Settings reset to defaults.";
    resetBtn.focus();
  });

  // Refresh — the escape hatch for a phone stuck on a stale copy (Theme 16c).
  // It sits in "Your data" because that is where someone goes asking "what is
  // stored on my phone, and how do I get rid of it" — so the wording has to
  // draw the line the panel's other two actions don't: this clears the *app's*
  // stored copy of the menus and code, and touches none of their stuff.
  const refreshHead = el("p", { className: "settings-sub", textContent: "Refresh menus and app" });
  const refreshNote = el("p", {
    className: "settings-hint",
    textContent:
      "Throws away the offline copy of the menus and the app code, downloads the lot again, and reloads. " +
      "Your favourites, ratings, settings, profiles and order tally aren’t touched — this only refreshes " +
      "what Faves has stored to work offline. Needs a connection.",
  });
  const refreshBtn = el("button", { type: "button", className: "settings-reset", textContent: "Refresh now" });
  const refreshConfirmText = el("p", { className: "profile-confirm-text" });
  const refreshGo = el("button", { type: "button", className: "profile-btn profile-btn-primary", textContent: "Refresh" });
  const refreshCancel = el("button", { type: "button", className: "profile-btn", textContent: "Cancel", "data-i18n": "generic.cancel" });
  const refreshConfirm = el("div", { className: "profile-confirm", role: "group", hidden: true }, [
    refreshConfirmText, el("div", { className: "profile-form-actions" }, [refreshGo, refreshCancel]),
  ]);
  refreshConfirm.setAttribute("aria-label", "Confirm refresh");
  const refreshStatus = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });

  // Offline is a refusal, not a warning: clearing the caches with no network
  // leaves the app with nothing to serve at all.
  const offlineMessage =
    "You’re offline, so Faves can’t download a fresh copy — and clearing what’s stored now would leave " +
    "you with no menus at all. Try again once you’re back on Wi-Fi or data.";
  const offline = () => globalThis.navigator?.onLine === false;

  refreshBtn.addEventListener("click", () => {
    if (offline()) {
      refreshStatus.textContent = offlineMessage;
      return;
    }
    refreshStatus.textContent = "";
    refreshConfirmText.textContent =
      "Download the menus and app code again? It uses a few hundred kilobytes and reloads the page. " +
      "Nothing you’ve saved is affected.";
    refreshConfirm.hidden = false;
    refreshGo.focus();
  });
  refreshCancel.addEventListener("click", () => {
    refreshConfirm.hidden = true;
    refreshBtn.focus();
  });
  refreshGo.addEventListener("click", async () => {
    refreshConfirm.hidden = true;
    refreshGo.disabled = true;
    refreshStatus.textContent = "Refreshing…";
    // Re-checked here, not just on the first tap: the connection can drop
    // between opening the confirm and confirming it.
    const res = await forceRefresh();
    refreshGo.disabled = false;
    if (res.ok) return; // the reload takes it from here
    refreshStatus.textContent =
      res.reason === "offline"
        ? offlineMessage
        : "Couldn’t refresh — your browser wouldn’t clear the stored copy. Everything you’ve saved is still here.";
    refreshBtn.focus();
  });

  const panel = el("div", { className: "settings-panel" }, [
    note, btn, status,
    refreshHead, refreshNote, refreshBtn, refreshConfirm, refreshStatus,
    resetHead, resetNote, resetBtn, resetConfirm, resetStatus,
  ]);
  return {
    panel,
    close: () => {
      resetConfirm.hidden = true;
      refreshConfirm.hidden = true;
    },
  };
}

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

  const people = peopleSection();
  const data = dataSection();
  const lang = selectControl({
    ariaLabel: "Language",
    // A language is always named in its own tongue, whatever the UI language is.
    options: [{ key: "en", label: "English" }, { key: "mi", label: "Te Reo Māori" }],
    onChange: (v) => settings.set({ lang: v }),
  });
  const maps = selectControl({
    ariaLabel: "Which maps app opens on an address",
    // "Match my device" follows the platform; the rest force a provider (the web
    // can't read the OS default, so we let the viewer say).
    options: MAPS_APPS,
    onChange: (v) => settings.set({ mapsApp: v }),
  });
  const dietary = prefChips(DIETARY_PREFS, "dietary");
  const avoid = prefChips(ALLERGEN_PREFS, "avoid");

  // The always-confirm allergy caveat lives behind an ⓘ beside the "Allergens to
  // flag" heading (same disclosure as the menu caution) — on demand rather than
  // a standing block, but still one orange tap away. Safety wording is
  // load-bearing, so it stays verbatim and English (like all our caveats). The
  // heading row is position:relative so the note anchors to it.
  const [caveatBtn, caveatNote] = disclosure({
    noteId: "settings-allergen-caveat",
    label: "About allergen flagging",
    text: (() => {
      const frag = document.createDocumentFragment();
      frag.append(
        el("strong", { textContent: "Always confirm for allergies. " }),
        "Some tags come from the venue. Most we work out from the dish itself " +
          "where it's near-certain — satay means peanuts, a schnitzel means " +
          "wheat — because menus rarely say. We flag generously on purpose. " +
          "No tag still means not stated, never that a dish is free of it. " +
          "This highlights and filters; it isn't a guarantee."
      );
      return frag;
    })(),
  });
  const allergenHeadRow = el("div", { className: "settings-sub-row" }, [
    el("p", { className: "settings-sub", textContent: "Allergens to flag" }),
    caveatBtn,
    caveatNote,
  ]);

  const fav = field({
    id: "set-fav-boost",
    label: "Show branches within",
    hint: "For a multi-branch venue (e.g. McDonald's), the two nearest branches inside this distance show on the contact card — the rest tuck under “Show all branches”.",
    min: BOUNDS.favBoostKm[0],
    max: 30,
    step: 1,
  });
  const far = field({
    id: "set-far",
    label: "Hide places further than",
    hint: "Beyond this, a venue is treated as too far to reach tonight.",
    min: 5,
    max: 100,
    step: 5,
  });

  const dietPanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-sub", textContent: "Your dietary needs" }),
    dietary.group,
    allergenHeadRow,
    avoid.group,
  ]);
  const distancePanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-note", textContent: "How far you'll go, and how nearby branches show up." }),
    fav.row,
    far.row,
  ]);
  const mapsPanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-note", textContent: "Which app opens when you tap a venue’s address." }),
    maps.group,
  ]);
  const langPanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-note", textContent: "The language of the app’s buttons and labels. Menus stay as the venues wrote them." }),
    lang.group,
  ]);

  // The index, in order: safety first, then how-far, then the rest. `summary`
  // is re-run by sync() on every store change, so a row always reads true.
  const TOPICS = [
    { key: "diet", title: "Food preferences", i18n: null, panel: dietPanel, summary: (s) => dietSummary(s) },
    { key: "distance", title: "Distance", i18n: null, panel: distancePanel, summary: (s) => `Hide places past ${s.farKm} km` },
    { key: "maps", title: "Maps app", i18n: null, panel: mapsPanel, summary: (s) => MAPS_APPS.find((m) => m.key === s.mapsApp)?.label ?? "" },
    { key: "lang", title: "Language", i18n: "settings.langTitle", panel: langPanel, summary: (s) => (s.lang === "mi" ? "Te Reo Māori" : "English") },
    { key: "people", title: "Who’s using Faves?", i18n: "profile.title", panel: people.panel, summary: peopleSummary },
    { key: "data", title: "Your data", i18n: null, panel: data.panel, summary: () => "Download a copy, refresh, or start over" },
  ];

  const rows = el("ul", { className: "settings-rows" });
  for (const topic of TOPICS) {
    const title = el("span", { className: "settings-row-title", textContent: topic.title });
    if (topic.i18n) title.dataset.i18n = topic.i18n;
    const value = el("span", { className: "settings-row-value" });
    const row = el("button", { type: "button", className: "settings-row" }, [
      el("span", { className: "settings-row-text" }, [title, value]),
      el("span", { className: "settings-row-chevron", "aria-hidden": "true", textContent: "›" }),
    ]);
    row.addEventListener("click", () => open(topic, row));
    topic.row = row;
    topic.value = value;
    rows.append(el("li", {}, [row]));
  }

  // The profile switcher sits above the rows so a hand-off between two people is
  // one tap. With only one profile there's nothing to switch, so it's hidden and
  // the People row carries the whole story.
  const switcherSlot = el("div", { className: "settings-switcher" });
  const index = el("div", { className: "settings-index" }, [switcherSlot, rows]);

  const back = el("button", {
    type: "button",
    className: "settings-back",
    textContent: "‹",
    "aria-label": "Back to Settings",
    hidden: true,
  });
  const close = closeButton();
  // The one heading is retitled per panel, so it can't carry a data-i18n:
  // translate() captures an element's English text the first time it sees one
  // and would restore *that* caption for every later panel. renderTitle() does
  // the lookup itself instead, via t()'s safe English fallback.
  const title = el("h2", { id: "settings-title", className: "settings-title", textContent: "Settings" });
  title.tabIndex = -1; // focus target on drill-in, so the panel's name is announced

  const body = el("div", { className: "settings-body" }, [
    index,
    ...TOPICS.map((topic) => {
      topic.panel.hidden = true;
      return topic.panel;
    }),
  ]);

  const dialog = el("dialog", { className: "settings-sheet", "aria-labelledby": "settings-title" }, [
    el("div", { className: "settings-inner" }, [
      el("div", { className: "settings-head" }, [back, title, close]),
      body,
    ]),
  ]);
  document.body.append(dialog);

  // --- Navigation --------------------------------------------------------
  // `current` is the open topic, or null for the index. The dialog's accessible
  // name is the <h2>, so retitling it per panel also retitles the dialog.
  let current = null;
  let returnFocus = null;

  function renderTitle() {
    title.textContent = current
      ? current.i18n
        ? t(current.i18n, current.title)
        : current.title
      : t("settings.title", "Settings");
  }

  function open(topic, fromRow) {
    current = topic;
    index.hidden = true;
    for (const other of TOPICS) other.panel.hidden = other !== topic;
    // The switcher belongs to whichever view is showing: the index for a one-tap
    // hand-off, the People panel so you can see who Rename/Delete will hit.
    if (topic.key === "people") people.listSlot.append(people.list);
    renderTitle();
    back.hidden = false;
    returnFocus = fromRow;
    title.focus();
  }

  function showIndex({ focusRow = true } = {}) {
    current = null;
    for (const other of TOPICS) other.panel.hidden = true;
    switcherSlot.append(people.list);
    people.hidePanels(false);
    data.close();
    index.hidden = false;
    renderTitle();
    back.hidden = true;
    if (focusRow && returnFocus) returnFocus.focus();
    returnFocus = null;
    syncSwitcher();
  }

  back.addEventListener("click", () => showIndex());
  // Escape closes the whole sheet, panel or not — the plain <dialog> default.
  // Making it step back one level instead was tried and dropped: it needs
  // preventDefault() on `cancel`, and Chrome's close-watcher only honours that
  // while the page holds close-request "budget" from a recent interaction.
  // Measured headless (Chrome 151, real input, identical timing): six drill-in →
  // Escape cycles stepped back four times and force-closed twice, with no
  // pattern a user could learn. A back gesture that works two times in three is
  // worse than one that never pretends to — so ‹ is the back affordance, and
  // Escape means the same thing here as in every other dialog in the app.
  // Reopening always starts at the top, however the sheet was dismissed.
  dialog.addEventListener("close", () => showIndex({ focusRow: false }));

  // --- Keeping the controls and the row summaries true -------------------
  function syncSwitcher() {
    // Nothing to switch between with a single profile.
    switcherSlot.hidden = profiles.list().length < 2 || current !== null;
  }

  function sync() {
    const s = settings.get();
    lang.select.value = s.lang;
    maps.select.value = s.mapsApp;
    const dietarySet = new Set(s.diet.dietary);
    for (const { key, chip } of dietary.chips) chip.setAttribute("aria-pressed", String(dietarySet.has(key)));
    const avoidSet = new Set(s.diet.avoid);
    for (const { key, chip } of avoid.chips) chip.setAttribute("aria-pressed", String(avoidSet.has(key)));
    fav.input.value = String(s.favBoostKm);
    fav.out.textContent = `${s.favBoostKm} km`;
    far.input.value = String(s.farKm);
    far.out.textContent = `${s.farKm} km`;
    for (const topic of TOPICS) topic.value.textContent = topic.summary(s);
    // A language switch arrives through this same subscription, and app.js
    // registers us *before* reo.js — so at this instant reo still holds the old
    // language. Subscribers run in one synchronous loop, so a microtask lands
    // after reo has caught up and t() answers in the language just chosen.
    queueMicrotask(renderTitle);
    syncSwitcher();
  }

  fav.input.addEventListener("input", () => settings.set({ favBoostKm: Number(fav.input.value) }));
  far.input.addEventListener("input", () => settings.set({ farKm: Number(far.input.value) }));

  btn.addEventListener("click", () => {
    sync();
    dialog.showModal();
  });
  wireDialog(dialog, { closeBtn: close });

  // Keep controls in step with the store (reset, or a change from another tab).
  settings.subscribe(sync);
  // Rebuild the profile radios whenever the roster or active profile changes
  // (here, or synced from another tab via app.js's registry listener).
  profiles.subscribe(() => {
    people.refresh();
    sync();
  });
  window.addEventListener("storage", (e) => {
    // The settings key is now namespaced by the active profile.
    if (e.key === profiles.scopedKey("faves.settings.v1")) settings.reload();
  });

  switcherSlot.append(people.list);
  translate(dialog); // pick up te reo on the freshly built subtree
  sync();
}
