// Settings dialog for the two ranking distances (settings.js): how much
// nearer a favourite counts, and how far is "too far tonight". Injected on
// the home screen (the only place ranking applies). Sliders write straight
// to the store; the home list re-ranks live via app.js's own subscription.

import { settings, BOUNDS } from "./settings.js";

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

export function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  if (!btn || document.querySelector(".settings-sheet")) return;
  btn.hidden = false;

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
        el("h2", { id: "settings-title", className: "settings-title", textContent: "Distance settings" }),
        (() => {
          const c = el("button", { type: "button", className: "settings-close", textContent: "✕" });
          c.setAttribute("aria-label", "Close");
          c.addEventListener("click", () => dialog.close());
          return c;
        })(),
      ]),
      el("p", { className: "settings-note", textContent: "These shape the home order when “Near me” is on." }),
      fav.row,
      far.row,
      el("div", { className: "settings-actions" }, [resetBtn]),
    ]),
  ]);
  document.body.append(dialog);

  // Reflect the current settings into the sliders + their value labels.
  function sync() {
    const s = settings.get();
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

  // Keep sliders in step with the store (reset, or a change from another tab).
  settings.subscribe(sync);
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.settings.v1") settings.reload();
  });
  sync();
}
