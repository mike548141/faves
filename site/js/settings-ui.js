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

import { settings, BOUNDS, DIETARY_PREFS, ALLERGEN_PREFS } from "./settings.js";

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

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

// The language switch: two buttons in their own tongue (a language is always
// shown in its own name, whatever the current UI language). Writes settings
// .lang; reo.js re-translates the whole document off the store subscription.
function langControl() {
  const group = el("div", { className: "segmented lang-segmented", role: "group" });
  group.setAttribute("aria-label", "Language");
  const buttons = [
    { lang: "en", label: "English" },
    { lang: "mi", label: "Te Reo Māori" },
  ].map(({ lang, label }) => {
    const b = el("button", { type: "button", textContent: label, "aria-pressed": "false" });
    b.dataset.lang = lang;
    b.addEventListener("click", () => settings.set({ lang }));
    group.append(b);
    return b;
  });
  return { group, buttons };
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

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

  const lang = langControl();
  const dietary = prefChips(DIETARY_PREFS, "dietary");
  const avoid = prefChips(ALLERGEN_PREFS, "avoid");

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

  const dialog = el("dialog", { className: "settings-sheet", "aria-labelledby": "settings-title" }, [
    el("div", { className: "settings-inner" }, [
      el("div", { className: "settings-head" }, [
        (() => {
          const h = el("h2", { id: "settings-title", className: "settings-title", textContent: "Settings" });
          h.dataset.i18n = "settings.title";
          return h;
        })(),
        (() => {
          const c = el("button", { type: "button", className: "settings-close", textContent: "✕" });
          c.setAttribute("aria-label", "Close");
          c.addEventListener("click", () => dialog.close());
          return c;
        })(),
      ]),

      // --- Language / Te Reo ---
      (() => {
        const h = el("h3", { className: "settings-group-title", textContent: "Language" });
        h.dataset.i18n = "settings.langTitle";
        return h;
      })(),
      lang.group,

      // --- Food preferences ---
      el("h3", { className: "settings-group-title", textContent: "Food preferences" }),
      el("p", { className: "settings-sub", textContent: "Your dietary needs" }),
      dietary.group,
      el("p", { className: "settings-sub", textContent: "Allergens to flag" }),
      avoid.group,
      el("p", { className: "settings-safety" }, [
        el("strong", { textContent: "Always confirm for allergies. " }),
        "We only show what venues told us — no tag means not stated, not that a " +
          "dish is free of it. This highlights and filters; it isn't a guarantee.",
      ]),

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
    for (const b of lang.buttons) b.setAttribute("aria-pressed", String(b.dataset.lang === s.lang));
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

  btn.addEventListener("click", () => {
    sync();
    dialog.showModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Keep controls in step with the store (reset, or a change from another tab).
  settings.subscribe(sync);
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.settings.v1") settings.reload();
  });
  sync();
}
