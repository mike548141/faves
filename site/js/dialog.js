// Standard <dialog> close affordances, wired once so the Settings, About and
// picker sheets behave identically. Escape is native to <dialog>; this adds the
// ✕ button and a backdrop click (a click landing outside the content).
//
// Two content shapes exist: pass `inner` when the content is a wrapper that
// doesn't fill the dialog's own box, so a click anywhere off it closes; omit it
// when the content fills the dialog and only a click on the dialog element
// itself (its padding around the content) should close.

import { el } from "./dom.js";

// The ✕ used by the injected sheets — same class, accessible name and i18n key
// everywhere. (aria-label set via data too so a language switch reaches it.)
export function closeButton() {
  const btn = el("button", {
    type: "button",
    className: "settings-close",
    textContent: "✕",
    "aria-label": "Close",
    "data-i18n-aria": "generic.close",
  });
  return btn;
}

export function wireDialog(dialog, { closeBtn, inner } = {}) {
  closeBtn?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    const onBackdrop = inner ? !inner.contains(e.target) : e.target === dialog;
    if (onBackdrop) dialog.close();
  });
  return dialog;
}
