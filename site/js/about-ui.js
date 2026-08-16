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
import { currentVersions } from "./versions.js";

function group(title, ...paras) {
  return el("section", { className: "about-group" }, [
    el("h3", { className: "about-group-title", textContent: title }),
    ...paras.map((text) => el("p", { className: "about-text", textContent: text })),
  ]);
}

// The app ships as two independently versioned halves (ADR 0015), and the
// question people actually ask — "have I got the new menus?" — can only be
// answered by the *device*. ROADMAP 16f / ADR 0032: reads currentVersions(),
// which asks the *controlling* worker directly rather than inferring from
// cache names, so this can no longer show a version newer than what the page
// is actually running (the gap 16e left, per ADR 0027's consequences). Async:
// built with placeholders, then filled once the worker (or the cache-name
// fallback) answers.
function versionGroup() {
  const shellValue = el("dd", { className: "about-version-value", textContent: "…" });
  const dataValue = el("dd", { className: "about-version-value", textContent: "…" });
  const note = el("p", { className: "about-text about-version-note", textContent:
    "What this page is currently running." });
  // Hidden until a waiting worker is confirmed — most sessions never see this,
  // and an empty aria-live region is the standard way to keep it silent until
  // it has something true to announce.
  const waitingNote = el("p", {
    className: "about-text about-version-waiting",
    role: "status",
    "aria-live": "polite",
    hidden: true,
  });

  currentVersions().then(({ shell, data, controlling, waiting }) => {
    // No caches yet = a first visit, or a browser with no offline storage.
    // Say so plainly instead of showing a blank or an invented number.
    shellValue.textContent = shell || "not stored yet";
    dataValue.textContent = data || "not stored yet";

    if (!shell && !data) {
      note.textContent =
        "The offline copy hasn’t been stored on this device yet.";
    } else if (!controlling) {
      // True and distinct from "not stored": something is cached, but no
      // worker has taken over serving this page yet (first load, still
      // installing) — showing the numbers without this caveat would claim a
      // version the page isn't actually running.
      note.textContent =
        "Stored on this device, but not yet serving this page.";
    }
    // else: shown as-is — this is the controller's own reported version, so
    // the default "What this page is currently running." note already holds.

    if (waiting) {
      waitingNote.hidden = false;
      waitingNote.textContent =
        waiting.shell || waiting.data
          ? `An update is ready — App ${waiting.shell ?? "…"}, ` +
            `Menus ${waiting.data ?? "…"}. Refresh from the notice to switch.`
          : "An update is ready. Refresh from the notice to switch.";
    }
  });

  // Heading → prose → detail, the same order every other group in this dialog
  // uses. The note sat *below* the numbers, which read as a stray caption and
  // broke the one pattern the page has (owner, 2026-08-16).
  return el("section", { className: "about-group" }, [
    el("h3", { className: "about-group-title", textContent: "Version" }),
    note,
    el("dl", { className: "about-versions" }, [
      el("dt", { className: "about-version-key", textContent: "App" }),
      shellValue,
      el("dt", { className: "about-version-key", textContent: "Menus & prices" }),
      dataValue,
    ]),
    waitingNote,
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
      group(
        "Opening hours",
        "“Open now” is worked out on each place’s own clock, not your phone’s, " +
          "so a place still reads correctly when you’re looking it up from " +
          "somewhere else. Where the two differ, the hours say whose time they are."
      ),

      group(
        "Works offline",
        "Once you’ve visited, Faves keeps working in flight mode — menus and " +
          "all. Add it to your home screen for a full-screen, app-like launch."
      ),

      versionGroup(),

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
