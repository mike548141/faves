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
//
// What is NOT here, and why: the version stamps and the "an update is ready"
// line moved to Settings → Refresh & reset on 2026-08-17 (ROADMAP 23c). They
// are evidence for an action — "am I up to date, and if not, fix it" — and the
// action lives there, so splitting the two across two screens made the reader
// carry the join. Do not bring them back; check Settings first.

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
        "A hand-picked guide to our favourite places to eat — menus, " +
        "prices and allergen info, gathered in one place so deciding what’s for " +
        "dinner is quick." }),

      group(
        "Private by design",
        "No accounts, no tracking, no third-party scripts. Your favourites, " +
          "order and settings stay on your device — the only thing this site " +
          "ever fetches is its own pages."
      ),

      // This used to say "all prices are in NZD", which was true only while
      // every place was in New Zealand. There is no site-wide currency now
      // (ADR 0043) — a price belongs to a venue, so the *venue* names its
      // currency, in the ⓘ that sits beside its prices (ADR 0037). What About
      // can still say is the general rule, which is what a reader here is
      // asking for. Still not appended to all 1,200 dish prices: that would
      // cost every reader legibility to answer a question almost none of them
      // are asking, and a menu in one currency only needs saying once.
      group(
        "Prices",
        "Each place’s prices are in its own local currency, exactly as its own " +
          "menu shows them — the ⓘ beside a menu’s prices names the currency. " +
          "Each menu page also says when we last read that menu, and how.",
        "Prices change without notice. Confirm with the place when you order."
      ),

      // Same shape of honesty for the clock. Opening hours are a fact about the
      // place, so they are shown on the place's clock — which is worth stating
      // once now that the places are not all in one timezone.
      // Rewritten 2026-08-16: the owner couldn't read the old version. It was
      // one 30-word sentence that stated the rule ("worked out on each place's
      // own clock") before giving anything to picture, so you had to hold the
      // abstraction in your head to reach the point. This one leads with the
      // rule in six words, then spends a sentence on the case that makes it
      // matter. Same three facts, no jargon, nothing dropped.
      group(
        "Opening hours",
        "“Open now” uses the place’s own clock, not your phone’s. So a place " +
          "in Wellington still reads correctly when you look it up from " +
          "London. Where the two clocks differ, the hours say which one " +
          "they’re on."
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
