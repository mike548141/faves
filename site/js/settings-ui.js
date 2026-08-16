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
//   • Distance — the two dials (settings.js): how far is "too far tonight",
//     then the branch-proximity cutoff within one place.
//   • Units — metric or imperial, for every distance on screen and the oven
//     temperatures in a recipe. Display only: the dials still store kilometres.
//   • Maps app / Language / Units — one <select> each.
//   • People — the device-local profile roster (add / rename / delete).
//   • Your data — export everything, import a backup, or transfer one person
//     to another device. All three move the personal data blob itself.
//   • Refresh & reset — force a full refresh of the stored menus and app
//     code, or reset this profile's preferences. Split from "Your data"
//     (Theme 15): its one-line summary had grown to naming five actions
//     across two things that don't share a data model — see the panel
//     builders below for why they're paired with each other instead.
// The profile *switcher* itself stays on the index (and moves into the People
// panel while that's open) because switching is one tap and it's the context
// every other setting sits inside — nobody should browse under someone else's
// allergen filter by accident.
//
// Everything writes straight to the store; the home list re-ranks live via
// app.js's own subscription, and each menu reads the preferences on load.

import { settings, DIETARY_PREFS, ALLERGEN_PREFS, MAPS_APPS, AS_CHARGED, LOCAL } from "./settings.js";
import { recallOrigin } from "./geo.js";
import { UNIT_OPTIONS, dialSpec, dialValue, dialKm, formatDial } from "./units.js";
import { fxAsOf, fxCurrencies } from "./fx.js";
import { localCurrency } from "./locale.js";
import { profiles, deviceStorage } from "./profiles.js";
import {
  collectPersonalData,
  personalDataFilename,
  personalDataJson,
  summarisePersonalData,
} from "./personal-data.js";
import { forceRefresh } from "./cache-refresh.js";
import { importControls, transferControls } from "./personal-io-ui.js";
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
// Export everything (every profile, not just the active one), import it back,
// or transfer one person to another device. All three move the *personal data
// blob itself* — out, back in, or across to another device — which is one
// topic under ADR 0025 even though it's three actions: none of them is
// reachable without the same "here's what's in it, choose how to apply it"
// review (personal-data.js), so grouping them reads as one coherent story
// (backup → restore → transfer) rather than a junk drawer.
//
// Refresh (the app's cached menus/code) and Reset (this profile's
// preferences) used to live in this panel too, on the theory that "what's
// stored, and how do I get rid of it" was one topic. Splitting them out
// (Theme 15) turned up the real seam: those two never touch the personal
// data blob this panel is about — see refreshResetSection() below.
//
// Order is deliberate: out, back in, across. The import and transfer halves
// live in personal-io-ui.js (they share one applier with the receive path on
// every screen); this panel only places them.
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
  btn.dataset.i18n = "data.download";
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

  const imports = importControls();
  const transfer = transferControls();

  const panel = el("div", { className: "settings-panel" }, [
    note, btn, status,
    imports.node,
    transfer.node,
  ]);
  return {
    panel,
    close: () => {
      // An abandoned import review must not still be sitting there, one tap
      // from applying, when the panel is reopened later.
      imports.close();
    },
  };
}

// --- Refresh & reset -----------------------------------------------------
// Two "clear it out and start clean" actions that don't belong under "Your
// data" (Theme 15 split it out): neither touches the personal data blob that
// panel is about.
//   • Refresh — the escape hatch for a phone stuck on a stale copy (Theme
//     16c). Clears the *app's* cached menus and code and re-downloads them;
//     touches none of what the person has saved.
//   • Reset — scoped to the *active profile's* preferences (settings.reset());
//     it leaves favourites, ratings and everyone else alone.
// They're grouped with each other, not because they share a data model (they
// don't), but because both are destructive-with-confirm housekeeping on
// locally stored state, and the index is short enough now that a bare button
// for either would sit one stray tap from wiping something — same reasoning
// that put Reset behind a confirm in the first place. Both confirm inline,
// same pattern as deleting a person.
function refreshResetSection() {
  const intro = el("p", {
    className: "settings-note",
    textContent: "What Faves has stored on this device to work offline, and to remember your preferences.",
  });

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

  const resetHead = el("p", { className: "settings-sub", textContent: "Start over" });
  // Two sentences, in the order the reader needs them: what goes, then what
  // stays. The old copy opened with a five-item list of setting names — the
  // reader has to hold all five to work out whether this is the button they
  // want. "Everything you've told Faves about how you eat" is the one that
  // matters and it goes first, by name, because clearing it silently is the
  // real risk here.
  const resetNote = el("p", {
    className: "settings-hint",
    textContent:
      "Clears everything you’ve told Faves about how you eat — dietary needs, " +
      "flagged allergens — along with your distance, units, language and maps " +
      "app, and puts them back to how they arrived. " +
      "It only affects the person browsing: your favourites, your ratings and " +
      "everyone else’s settings stay exactly as they are.",
  });
  const resetBtn = el("button", { type: "button", className: "settings-reset", textContent: "Reset to defaults" });
  const resetConfirmText = el("p", { className: "profile-confirm-text" });
  const resetGo = el("button", { type: "button", className: "profile-btn profile-btn-danger", textContent: "Reset" });
  const resetCancel = el("button", { type: "button", className: "profile-btn", textContent: "Cancel", "data-i18n": "generic.cancel" });
  const resetConfirm = el("div", { className: "profile-confirm profile-confirm-danger", role: "group", hidden: true }, [
    resetConfirmText, el("div", { className: "profile-form-actions" }, [resetGo, resetCancel]),
  ]);
  resetConfirm.setAttribute("aria-label", "Confirm reset");
  const resetStatus = el("p", { className: "settings-note settings-data-status", role: "status", "aria-live": "polite" });

  resetBtn.addEventListener("click", () => {
    const who = profiles.active().name;
    // Names what actually goes, and does not overstate it. The owner asked the
    // phrase to acknowledge "the destruction of all of their personal data";
    // this action clears one profile's PREFERENCES — dietary needs, flagged
    // allergens, distances, units, language, maps app — and leaves favourites,
    // ratings, the order tally and other profiles alone. Saying otherwise would
    // make the scariest sentence in the app the least accurate one, and a
    // warning that overstates gets discounted the first time someone notices.
    // Widening what Reset destroys is the owner's call, not a side effect of
    // rewording its warning (ROADMAP).
    resetConfirmText.textContent =
      `This wipes ${who}’s saved preferences on this device — dietary needs and ` +
      `flagged allergens included — and cannot be undone. Favourites, ratings and ` +
      `other profiles are not touched.`;
    typeLabel.textContent = "Type I agree to confirm";
    typeHelp.textContent =
      "Typed, not tapped: this one destroys settings you may rely on to eat safely.";
    typeInput.value = "";
    syncArmed();
    resetConfirm.hidden = false;
    typeInput.focus();
  });
  resetCancel.addEventListener("click", () => {
    resetConfirm.hidden = true;
    typeInput.value = "";
    syncArmed();
    resetBtn.focus();
  });
  // THIRD STEP: type it out. Owner, 2026-08-16: *"I want a disruptive/unusal UX
  // … that jars people and they won't keep tapping on by mistake."* Two taps is
  // still two taps, and a Reset button that appears exactly where your thumb
  // already is gets hit by momentum. Typing cannot be done by momentum — it is
  // the one confirmation that requires you to have read the sentence, which is
  // why every tool that destroys something you cannot get back uses it.
  //
  // The gate is deliberately strict-but-forgiving: case and surrounding spaces
  // are ignored (a phone keyboard capitalises the "I" for you either way), the
  // words are not. Enter submits, so the flow ends where the hands already are.
  const PHRASE = "i agree";
  const typeLabel = el("label", { className: "reset-type-label", htmlFor: "reset-type" });
  const typeInput = el("input", {
    type: "text",
    id: "reset-type",
    className: "reset-type-input",
    autocomplete: "off",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: false,
    placeholder: "I agree",
  });
  typeInput.setAttribute("aria-describedby", "reset-type-help");
  const typeHelp = el("p", { className: "reset-type-help", id: "reset-type-help" });
  const armed = () => typeInput.value.trim().toLowerCase() === PHRASE;
  function syncArmed() {
    const ok = armed();
    resetGo.disabled = !ok;
    // The field itself answers, the moment the words match — red while it is a
    // barrier, green once it is not. The buttons deliberately do NOT change
    // colour (owner): the destructive one should look destructive throughout,
    // and the reassurance belongs on the thing the reader is actually typing
    // into. `aria-invalid` carries the same state to a screen reader, which a
    // border colour never could.
    typeInput.classList.toggle("is-armed", ok);
    typeInput.setAttribute("aria-invalid", ok ? "false" : "true");
  }
  typeInput.addEventListener("input", syncArmed);
  typeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && armed()) {
      e.preventDefault();
      resetGo.click();
    }
  });
  const typeRow = el("div", { className: "reset-type" }, [typeLabel, typeInput, typeHelp]);
  // Between the sentence and the buttons — the order you read it in.
  resetConfirmText.after(typeRow);

  resetGo.addEventListener("click", () => {
    // Belt and braces: the button is disabled until the phrase matches, but a
    // disabled button is a UI state, not a guarantee — this is the check that
    // actually stands between a stray tap and someone's data.
    if (!armed()) {
      typeInput.focus();
      return;
    }
    settings.reset();
    resetConfirm.hidden = true;
    resetStatus.textContent = "Settings reset to defaults.";
    resetBtn.focus();
  });

  const panel = el("div", { className: "settings-panel" }, [
    intro,
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


// Currency names for the picker. Only codes fx.json carries a rate for can be
// offered — anything else would be a choice that changes nothing. `Intl` names
// the currency, so this list stays a list of codes rather than a second table
// of names to keep in step.
function currencyOptions() {
  const codes = [...fxCurrencies()].sort();
  const name = (code) => {
    try {
      const parts = new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: code,
        currencyDisplay: "name",
      }).formatToParts(1);
      const n = parts.find((p) => p.type === "currency")?.value;
      return n ? `${n.charAt(0).toUpperCase()}${n.slice(1)} (${code})` : code;
    } catch {
      return code;
    }
  };
  return [
    { key: LOCAL, label: "Local — match where I am" },
    { key: AS_CHARGED, label: "As each place charges" },
    ...codes.map((code) => ({ key: code, label: name(code) })),
  ];
}

// What the Language & units row says it is currently on. A resolved "Local"
// shows what it resolved TO — "Local (NZD)" — because "Local" alone leaves the
// reader to guess, and the guess is the whole thing they came here to check.
function localeSummary(raw, resolved) {
  const langLabel = resolved.lang === "mi" ? "Te Reo Māori" : "English";
  const unitLabel = UNIT_OPTIONS.find((o) => o.key === resolved.units)?.label ?? "";
  const cur =
    raw.currency === AS_CHARGED
      ? "as charged"
      : raw.currency === LOCAL
        ? localCurrency(fxCurrencies())
        : raw.currency;
  const mark = (isLocal, text) => (isLocal ? `${text} (local)` : text);
  return [
    mark(raw.lang === LOCAL, langLabel),
    mark(raw.units === LOCAL, unitLabel),
    mark(raw.currency === LOCAL, cur),
  ].join(" · ");
}

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

  const people = peopleSection();
  const data = dataSection();
  const storage = refreshResetSection();
  // "Local" heads all three localisation lists: it is the default, and it is
  // the answer most readers want without knowing they want it (ADR 0045).
  const localOption = { key: LOCAL, label: "Local — match where I am" };
  const lang = selectControl({
    ariaLabel: "Language",
    // A language is always named in its own tongue, whatever the UI language is.
    options: [localOption, { key: "en", label: "English" }, { key: "mi", label: "Te Reo Māori" }],
    onChange: (v) => settings.set({ lang: v }),
  });
  const units = selectControl({
    ariaLabel: "Units for distances and temperatures",
    options: [localOption, ...UNIT_OPTIONS],
    onChange: (v) => settings.set({ units: v }),
  });
  // Options are built from the rate table, not hard-coded: a currency with no
  // rate would be a choice that silently does nothing. Rebuilt when the table
  // arrives (fx.json is fetched, so it can land after this dialog is built).
  const currency = selectControl({
    ariaLabel: "Currency to show prices in",
    options: currencyOptions(),
    onChange: (v) => settings.set({ currency: v }),
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
      // Plain words, short sentences, and the two things that must not be
      // misread carried in bold (owner, 2026-08-16 — the previous copy said
      // all of this, but at 60 words of hedged prose nobody finishes it).
      // Every safety point survives the trim: ask the place, some tags are
      // ours not theirs, we over-tag on purpose, and no tag is not a
      // clearance. Do not shorten past that last sentence.
      frag.append(
        el("strong", { textContent: "If you have an allergy, always ask the place. " }),
        "Some tags come from their menu. Most we work out ourselves — satay " +
          "means peanuts, schnitzel means wheat — because menus rarely say. " +
          "We tag more rather than less, on purpose. ",
        el("strong", { textContent: "No tag means we don’t know, not that it’s safe." })
      );
      return frag;
    })(),
  });
  const allergenHeadRow = el("div", { className: "settings-sub-row" }, [
    el("p", { className: "settings-sub", textContent: "Allergens to flag" }),
    caveatBtn,
    caveatNote,
  ]);

  // Both dials STORE kilometres whatever the reader's units; in imperial they
  // run on a round mile grid instead (units.js / ADR 0029). sync() re-specs
  // min/max/step on every settings change, so these are just the starting grid.
  //
  // These two sit side by side and do genuinely different jobs, so each label
  // names its own subject (ADR 0035): `far` filters WHICH PLACES you see,
  // `fav` picks WHICH BRANCHES OF ONE PLACE its contact card shows. Without
  // "a place's" in the second label the pair reads as two dials for one job.
  const far = field({
    id: "set-far",
    label: "Hide places further than",
    hint: "Beyond this, a place is treated as too far to reach tonight and drops off your list.",
    ...dialSpec("farKm", "metric"),
  });
  // A dial that cannot bite must say so. `farKm` filters on straight-line
  // distance, and with no captured location every distance is Infinity, so
  // ranking.js hides nothing and the reader is left dragging a slider that
  // changes a list of 55 into a list of 55. That is the decorative-control
  // pattern; the fix is not to make it guess a location but to state its own
  // precondition, where the control is, at the moment it is inert.
  const farIdle = el("p", { className: "settings-hint settings-hint-idle" }, [
    "⚠️ Not in effect yet — Faves doesn’t know where you are. Tap ",
    el("strong", { textContent: "Near me" }),
    " on the home screen and this will start hiding places.",
  ]);
  far.row.append(farIdle);
  const fav = field({
    id: "set-fav-boost",
    label: "Show a place’s branches within",
    hint: "When one place has several branches (McDonald’s, say), this is how far out we will offer you one. The nearest open branch leads its contact card, the next few sit one tap below, and anything past this distance is not offered — the card says how many that hid.",
    ...dialSpec("favBoostKm", "metric"),
  });

  // Point the slider at the active unit grid and write its readout. The value
  // must be set AFTER min/max/step or the browser clamps it to the old range.
  // Readout and thumb both come from dialValue(), so they can never disagree —
  // including for a value chosen on the other unit's grid.
  function applyDial(f, key, km, units) {
    const spec = dialSpec(key, units);
    f.input.min = String(spec.min);
    f.input.max = String(spec.max);
    f.input.step = String(spec.step);
    f.input.value = String(dialValue(km, key, units));
    f.out.textContent = formatDial(km, key, units);
  }

  const dietPanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-sub", textContent: "Your dietary needs" }),
    dietary.group,
    allergenHeadRow,
    avoid.group,
  ]);
  const distancePanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-note", textContent: "How far you’ll go, and how many branches of one place you see." }),
    far.row,
    fav.row,
  ]);
  // Two panels rather than four. Language and units are one question — how the
  // app talks to you — and distance and the maps app are the other: how it gets
  // you to a place. Splitting each into its own row made the index longer to
  // read without making any single choice clearer (owner, 2026-08-16). Each half
  // keeps its own sub-heading inside, so nothing lost its label.
  // How old the rates are, stated where the choice is made. A converted price
  // is only as good as its rate, and a reader who can see the date can decide
  // for themselves whether to trust it — which is the whole of the honesty we
  // can offer for a number we did not get from the shop.
  const fxNote = el("p", { className: "settings-note settings-note-quiet" });
  function syncFxNote() {
    const asOf = fxAsOf();
    fxNote.textContent = asOf
      ? `Exchange rates from ${asOf}. They update about once a day, and work offline.`
      : "Exchange rates haven’t loaded yet, so prices show as each place charges them.";
  }
  syncFxNote();

  const localePanel = el("div", { className: "settings-panel" }, [
    el("p", {
      className: "settings-note",
      textContent:
        "Three ways of asking the same thing: how should this look, for someone here? " +
        "Each can follow where you are — set it to Local and it changes when you travel.",
    }),
    el("p", { className: "settings-sub", textContent: "Language" }),
    el("p", {
      className: "settings-note",
      textContent:
        "The language of the app’s buttons and labels. Menus stay as each place wrote them.",
    }),
    lang.group,
    el("p", { className: "settings-sub", textContent: "Units" }),
    el("p", {
      className: "settings-note",
      // Was "Menu prices stay in New Zealand dollars", which stopped being true
      // when a place gained its own currency (ADR 0043). Prices are not a unit
      // preference at all — you pay the menu price, in the menu's currency —
      // so this says what it does cover and points at where the rest is said.
      textContent:
        "How distances and oven temperatures are shown. Prices always stay in each place’s own currency.",
    }),
    units.group,
    el("p", { className: "settings-sub", textContent: "Currency" }),
    el("p", {
      className: "settings-note",
      textContent:
        "Prices are shown in this currency wherever we have a rate. Each place still " +
        "charges in its own — a menu says which, and by how much, when the two differ.",
    }),
    currency.group,
    fxNote,
  ]);
  const placesPanel = el("div", { className: "settings-panel" }, [
    el("p", { className: "settings-sub", textContent: "How far you’ll go" }),
    el("p", {
      className: "settings-note",
      textContent: "How far you’ll go, and how many branches of one place you see.",
    }),
    far.row,
    fav.row,
    el("p", { className: "settings-sub", textContent: "Directions" }),
    el("p", {
      className: "settings-note",
      textContent: "Which app opens when you tap a place’s address.",
    }),
    maps.group,
  ]);

  // The index, grouped by the question each row answers, and ordered by how
  // often it gets asked: who is this (a hand-off between two people is the most
  // common reason to open Settings), what can they eat, then how the app finds
  // and shows things, then housekeeping. `summary` is re-run by sync() on every
  // store change, so a row always reads true.
  const TOPICS = [
    { key: "people", title: "Who’s using Faves?", i18n: "profile.title", panel: people.panel, summary: peopleSummary },
    { key: "diet", title: "Food preferences", i18n: null, panel: dietPanel, summary: (s) => dietSummary(s) },
    {
      key: "places",
      title: "Distance & directions",
      i18n: "settings.placesTitle",
      panel: placesPanel,
      // Both halves in one line, in panel order, so the row still says what
      // each setting is currently on.
      summary: (s) =>
        `Hide places past ${formatDial(s.farKm, "farKm", s.units)} · ${
          MAPS_APPS.find((m) => m.key === s.mapsApp)?.label ?? ""
        }`,
    },
    {
      key: "locale",
      title: "Language & units",
      i18n: "settings.localeTitle",
      panel: localePanel,
      summary: (s) => localeSummary(settings.raw(), s),
    },
    { key: "data", title: "Your data", i18n: "data.title", panel: data.panel, summary: () => "Save a copy, bring it back, or hand it to another device" },
    { key: "refreshReset", title: "Refresh & reset", i18n: "settings.refreshResetTitle", panel: storage.panel, summary: () => "Refresh the offline copy, or reset your preferences" },
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
    storage.close();
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
    // The SELECTS show the stored preference (so "Local" stays ticked); every
    // other consumer here reads the resolved values off `s`.
    const stored = settings.raw();
    lang.select.value = stored.lang;
    maps.select.value = s.mapsApp;
    units.select.value = stored.units;
    // fx.json is fetched, so the rate table can land after this dialog was
    // built. Rebuild the currency list when its contents have changed rather
    // than leaving a picker that offers nothing but "Local".
    const codes = fxCurrencies();
    if (codes.size !== currency.select.options.length - 2) {
      currency.select.replaceChildren();
      for (const { key, label } of currencyOptions()) {
        currency.select.append(el("option", { value: key, textContent: label }));
      }
      syncFxNote();
    }
    currency.select.value = stored.currency;
    const dietarySet = new Set(s.diet.dietary);
    for (const { key, chip } of dietary.chips) chip.setAttribute("aria-pressed", String(dietarySet.has(key)));
    const avoidSet = new Set(s.diet.avoid);
    for (const { key, chip } of avoid.chips) chip.setAttribute("aria-pressed", String(avoidSet.has(key)));
    applyDial(fav, "favBoostKm", s.favBoostKm, s.units);
    applyDial(far, "farKm", s.farKm, s.units);
    // Re-read on every sync rather than once at build: the sheet is built lazily
    // but stays in the DOM, so a reader who taps Near me and comes back must see
    // the warning gone.
    farIdle.hidden = !!recallOrigin();
    for (const topic of TOPICS) topic.value.textContent = topic.summary(s);
    // A language switch arrives through this same subscription, and app.js
    // registers us *before* reo.js — so at this instant reo still holds the old
    // language. Subscribers run in one synchronous loop, so a microtask lands
    // after reo has caught up and t() answers in the language just chosen.
    queueMicrotask(renderTitle);
    syncSwitcher();
  }

  // The slider reads in the viewer's units; dialKm turns that back into the
  // kilometres we store, so the ranking never sees a mile.
  fav.input.addEventListener("input", () =>
    settings.set({ favBoostKm: dialKm(fav.input.value, "favBoostKm", settings.get().units) })
  );
  far.input.addEventListener("input", () =>
    settings.set({ farKm: dialKm(far.input.value, "farKm", settings.get().units) })
  );

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
