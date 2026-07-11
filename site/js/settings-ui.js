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
import { disclosure } from "./disclosure.js";

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
    const overflowing = group.scrollHeight - group.clientHeight > 2;
    toggle.hidden = !overflowing;
    wrap.classList.toggle("fits", !overflowing); // fits one row ⇒ no clamp, no fade
  }
  return { wrap, refresh };
}

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

  const lang = langControl();
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
  window.addEventListener("resize", () => {
    if (dialog.open) refreshCollapsibles();
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
