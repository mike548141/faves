// The About dialog — what Faves is, its privacy stance, and how it works
// offline. Opened from the ⋯ menu and from the footer link. Modelled on the
// Settings dialog (settings-ui.js): a <dialog> injected into <body>, closed by
// the ✕, Escape (native), or a backdrop click.
//
// Progressive enhancement: the home footer ships the privacy statement as
// static HTML so a no-JS visitor still sees it. When this runs we hide that
// paragraph and reveal the compact "About & privacy" link instead — the fuller
// text lives here. The prose stays English on purpose (reo.js keeps the privacy
// note and app description English until a reo review); only the chrome labels
// carry data-i18n.

import { el } from "./dom.js";
import { closeButton, wireDialog } from "./dialog.js";
import { translate } from "./reo.js";

function group(title, ...paras) {
  return el("section", { className: "about-group" }, [
    el("h3", { className: "about-group-title", textContent: title }),
    ...paras.map((text) => el("p", { className: "about-text", textContent: text })),
  ]);
}

// Build the dialog DOM. Deferred to first open (see initAboutUI) — most sessions
// never open About, so there's no point spending the boot on ~10 nodes.
function buildDialog() {
  const close = closeButton();
  const title = el("h2", { id: "about-title", className: "settings-title", textContent: "About Faves" });

  const dialog = el("dialog", { className: "settings-sheet about-sheet", "aria-labelledby": "about-title" }, [
    el("div", { className: "settings-inner" }, [
      el("div", { className: "settings-head" }, [title, close]),

      el("p", { className: "about-lede", textContent:
        "A hand-picked guide to our favourite Wellington places to eat — menus, " +
        "prices and allergen info, gathered in one place so deciding what’s for " +
        "dinner is quick." }),

      group(
        "Private by design",
        "No accounts, no tracking, no third-party scripts. Your favourites, " +
          "order and settings stay on your device — the only thing this site " +
          "ever fetches is its own pages."
      ),

      group(
        "Works offline",
        "Once you’ve visited, Faves keeps working in flight mode — menus and " +
          "all. Add it to your home screen for a full-screen, app-like launch."
      ),

      el("p", { className: "about-made" }, [
        el("span", { "data-i18n": "footer.made", textContent: "Made by" }),
        " ",
        el("span", { className: "footer-brand", textContent: "cakeIT" }),
      ]),
    ]),
  ]);
  document.body.append(dialog);
  // The boot-time translate pass already ran; translate this subtree now that it
  // exists (and later language switches re-translate the whole document).
  translate(dialog);
  return wireDialog(dialog, { closeBtn: close });
}

export function initAboutUI() {
  const btn = document.getElementById("about-btn");
  // Guard against a double-init wiring the openers twice.
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.hidden = false;

  let dialog = null;
  const open = () => {
    if (!dialog) dialog = buildDialog(); // lazily build the DOM on first open
    dialog.showModal();
  };
  btn.addEventListener("click", open);

  // Swap the no-JS footer privacy note for the compact link that opens here.
  const footerNote = document.querySelector(".footer-privacy");
  const footerLink = document.getElementById("about-open");
  if (footerNote) footerNote.hidden = true;
  if (footerLink) {
    footerLink.hidden = false;
    footerLink.addEventListener("click", open);
  }
}
