// The Settings dialog, injected on the home screen (opened from the ⋯ menu).
// Two sections:
//   • Food preferences — your dietary needs and the allergens to flag. These
//     apply on every menu: dietary needs pre-select the menu's dietary chips,
//     flagged allergens make matching ⚠ warnings shout. Safety framing is
//     load-bearing: we surface what venues told us, never assert safety.
//   • Distance — the two ranking dials (settings.js): how much nearer a
//     favourite counts, and how far is "too far tonight".
// Everything writes straight to the store; the home list re-ranks live via
// app.js's own subscription, and each menu reads the preferences on load.

import { settings, BOUNDS, DIETARY_PREFS, ALLERGEN_PREFS, MAPS_APPS } from "./settings.js";
import { profiles } from "./profiles.js";
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

// The language picker: a compact <select>, each option named in its own tongue
// (a language is always shown in its own name, whatever the current UI
// language). A dropdown — not a segmented toggle or a stack of radios — keeps
// the dialog tight, reads unmistakably as "choose one", and scales to more
// languages by adding an <option>. Styled to match the home Area/Cuisine
// selects. Writes settings.lang; reo.js re-translates off the store.
function langControl() {
  const select = el("select", { className: "lang-select-input" });
  select.setAttribute("aria-label", "Language");
  for (const { lang, label } of [
    { lang: "en", label: "English" },
    { lang: "mi", label: "Te Reo Māori" },
  ]) {
    select.append(el("option", { value: lang, textContent: label }));
  }
  select.addEventListener("change", () => settings.set({ lang: select.value }));
  const group = el("div", { className: "lang-select" }, [select]);
  return { group, select };
}

// Which maps app opens on an address tap. A compact <select> (same control as
// the language picker) — "one of four", scales by adding an <option>, and stays
// tight in the dialog. Default "Match my device" follows the platform; the rest
// force a provider (the web can't read the OS default, so we let the viewer say).
// Writes settings.mapsApp; geo.js reads it when building the handoff URL.
function mapsControl() {
  const select = el("select", { className: "lang-select-input" });
  select.setAttribute("aria-label", "Which maps app opens on an address");
  for (const { key, label } of MAPS_APPS) {
    select.append(el("option", { value: key, textContent: label }));
  }
  select.addEventListener("change", () => settings.set({ mapsApp: select.value }));
  const group = el("div", { className: "lang-select" }, [select]);
  return { group, select };
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

// Wrap a chip group so that, when the chips wrap past one row, the overflow is
// clamped behind a "Show all" toggle — keeping the dialog scannable. The toggle
// only appears when the chips genuinely overflow (measured on open/resize, when
// the dialog actually has a width); if they fit one row the clamp is dropped so
// there's no needless fade. Returns { wrap, refresh } — call refresh() whenever
// the group's available width may have changed.
function collapsible(group, count) {
  const toggle = el("button", { type: "button", className: "chips-toggle", hidden: true });
  toggle.setAttribute("aria-expanded", "false");
  const wrap = el("div", { className: "chips-collapsible is-collapsed" }, [group, toggle]);
  let expanded = false;

  function label() {
    toggle.textContent = expanded ? "Show fewer" : `Show all ${count}`;
  }
  function setExpanded(v) {
    expanded = v;
    wrap.classList.toggle("is-collapsed", !v);
    toggle.setAttribute("aria-expanded", String(v));
    label();
  }
  toggle.addEventListener("click", () => setExpanded(!expanded));
  label();

  function refresh() {
    if (expanded) return; // never fight a user who has opened the group
    // Measure against the collapsed clamp: taller than one row ⇒ offer the toggle.
    // .fits removes the max-height, so it must come off *before* measuring —
    // otherwise scrollHeight === clientHeight and the clamp/toggle could never
    // return once the chips have fit even once (e.g. landscape → portrait).
    wrap.classList.remove("fits");
    const overflowing = group.scrollHeight - group.clientHeight > 2;
    toggle.hidden = !overflowing;
    wrap.classList.toggle("fits", !overflowing); // fits one row ⇒ no clamp, no fade
  }
  return { wrap, refresh };
}

// The profiles section — a "who's using Faves?" switcher at the top of the
// dialog. Several people share one phone; each profile is a separate bucket of
// favourites + food preferences (profiles.js). Switching re-points those stores
// live so nobody browses under someone else's allergy filter. First names only,
// device-local, nothing sent anywhere — the privacy line says so plainly.
//
// Native radios back the switch (real keyboard + screen-reader semantics, styled
// as chips). One shared inline form does Add and Rename; Delete uses an inline
// confirm (removing a person wipes their data, so it's a stop-and-confirm), and
// the last profile can never be deleted. A visually-hidden live region announces
// each change. Returns { section, refresh } — refresh() rebuilds the radio list
// and re-applies which actions are available.
function profileSection() {
  const status = el("p", { className: "sr-only", role: "status", "aria-live": "polite" });
  const announce = (msg) => { status.textContent = ""; status.textContent = msg; };

  const heading = el("h3", { className: "settings-group-title", textContent: "Who’s using Faves?" });
  heading.dataset.i18n = "profile.title";
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

  const section = el("section", { className: "profile-section" }, [
    heading, privacy, list, actions, form, confirm, status,
  ]);
  refresh();
  translate(section); // pick up te reo on the freshly built subtree
  return { section, refresh };
}

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

  const profileUi = profileSection();
  const lang = langControl();
  const maps = mapsControl();
  const dietary = prefChips(DIETARY_PREFS, "dietary");
  const avoid = prefChips(ALLERGEN_PREFS, "avoid");
  const dietaryCollapse = collapsible(dietary.group, DIETARY_PREFS.length);
  const avoidCollapse = collapsible(avoid.group, ALLERGEN_PREFS.length);

  // The always-confirm allergy caveat now lives behind an ⓘ beside the
  // "Allergens to flag" heading (same disclosure as the menu caution) — on
  // demand rather than a standing block, but still one orange tap away. Safety
  // wording is load-bearing, so it stays verbatim and English (like all our
  // caveats). The heading row is position:relative so the note anchors to it.
  const [caveatBtn, caveatNote] = disclosure({
    noteId: "settings-allergen-caveat",
    label: "About allergen flagging",
    text: (() => {
      const frag = document.createDocumentFragment();
      frag.append(
        el("strong", { textContent: "Always confirm for allergies. " }),
        "We only show what venues told us — no tag means not stated, not that a " +
          "dish is free of it. This highlights and filters; it isn't a guarantee."
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
    label: "Favourites count as this much nearer",
    hint: "A gentle pull toward your favourites — higher means they win from further away.",
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

  const resetBtn = el("button", { type: "button", className: "settings-reset", textContent: "Reset to defaults" });
  const close = closeButton();

  const dialog = el("dialog", { className: "settings-sheet", "aria-labelledby": "settings-title" }, [
    el("div", { className: "settings-inner" }, [
      el("div", { className: "settings-head" }, [
        (() => {
          const h = el("h2", { id: "settings-title", className: "settings-title", textContent: "Settings" });
          h.dataset.i18n = "settings.title";
          return h;
        })(),
        close,
      ]),

      // --- Who's using Faves? (device-local profiles) ---
      profileUi.section,

      // --- Language / Te Reo ---
      (() => {
        const h = el("h3", { className: "settings-group-title", textContent: "Language" });
        h.dataset.i18n = "settings.langTitle";
        return h;
      })(),
      lang.group,

      // --- Maps app (address-tap handoff) ---
      el("h3", { className: "settings-group-title", textContent: "Maps app" }),
      el("p", { className: "settings-note", textContent: "Which app opens when you tap a venue’s address." }),
      maps.group,

      // --- Food preferences ---
      el("h3", { className: "settings-group-title", textContent: "Food preferences" }),
      el("p", { className: "settings-sub", textContent: "Your dietary needs" }),
      dietaryCollapse.wrap,
      allergenHeadRow,
      avoidCollapse.wrap,

      // --- Distance ---
      el("h3", { className: "settings-group-title", textContent: "Distance" }),
      el("p", { className: "settings-note", textContent: "These shape the home order when “Near me” is on." }),
      fav.row,
      far.row,

      el("div", { className: "settings-actions" }, [resetBtn]),
    ]),
  ]);
  document.body.append(dialog);

  // Reflect the current settings into every control.
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
  }

  fav.input.addEventListener("input", () => settings.set({ favBoostKm: Number(fav.input.value) }));
  far.input.addEventListener("input", () => settings.set({ farKm: Number(far.input.value) }));
  resetBtn.addEventListener("click", () => settings.reset());

  // Chip overflow can only be measured once the dialog is on screen with a
  // real width — so refresh after showModal, and again on resize while open.
  function refreshCollapsibles() {
    dietaryCollapse.refresh();
    avoidCollapse.refresh();
  }
  btn.addEventListener("click", () => {
    sync();
    dialog.showModal();
    refreshCollapsibles();
  });
  // rAF-throttle so a drag-resize coalesces to one measure per frame rather than
  // forcing a reflow per chip group on every resize event.
  let resizeTick = false;
  window.addEventListener("resize", () => {
    if (!dialog.open || resizeTick) return;
    resizeTick = true;
    requestAnimationFrame(() => {
      resizeTick = false;
      if (dialog.open) refreshCollapsibles();
    });
  });
  wireDialog(dialog, { closeBtn: close });

  // Keep controls in step with the store (reset, or a change from another tab).
  settings.subscribe(sync);
  // Rebuild the profile radios whenever the roster or active profile changes
  // (here, or synced from another tab via app.js's registry listener).
  profiles.subscribe(profileUi.refresh);
  window.addEventListener("storage", (e) => {
    // The settings key is now namespaced by the active profile.
    if (e.key === profiles.scopedKey("faves.settings.v1")) settings.reload();
  });
  sync();
}
