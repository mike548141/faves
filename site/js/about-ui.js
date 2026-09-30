// The About dialog — what Faves is, its privacy stance, and how it works
// offline. Opened from the footer's "About & privacy" link, on every page. Modelled on the
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
// WHAT IS NOT HERE, AND WHY (ROADMAP 23a/23c, 2026-08-17). This dialog was a
// sediment: each block arrived because some item needed somewhere to put it,
// and nobody had since asked whether a reader would look for it here. The test
// applied was the owner's — not "is this fact about the app" but "what outcome
// is someone chasing when they need it".
//
//   • The version stamps and "an update is ready" → Settings → Refresh &
//     reset. They are evidence for an action, and the action is there.
//   • Prices/currency → the ⓘ beside the venue's prices, which now states the
//     currency in both of its tones. Someone wondering "is this NZD?" is
//     looking at a price when they wonder it, never at this dialog.
//   • Opening hours on the venue's own clock → the home screen's timezone note
//     and the menu's "Hours · NZ time" label, both of which appear exactly
//     when the reader's clock differs from the venue's. This dialog told
//     everyone, always, about a situation most of them are not in.
//
// Adding a block here needs a reason of the same shape. `boot_check.mjs`
// asserts the group list by name so a new one cannot arrive unnoticed.

import { el } from "./dom.js";
import { closeButton, wireDialog } from "./dialog.js";
import { translate } from "./reo.js";
import { persistence, storageSentences } from "./storage-persist.js";

function group(title, ...paras) {
  return el("section", { className: "about-group" }, [
    el("h3", { className: "about-group-title", textContent: title }),
    ...paras.map((p) => (typeof p === "string" ? el("p", { className: "about-text", textContent: p }) : p)),
  ]);
}

// Build the dialog DOM. Deferred to first open (see initAboutUI) — most sessions
// never open About, so there's no point spending the boot on ~10 nodes.
function buildDialog() {
  const close = closeButton();
  const title = el("h2", { id: "about-title", className: "settings-title", textContent: "About Faves" });
  const storageNote = el("div", { className: "about-storage" });

  const dialog = el("dialog", { className: "settings-sheet about-sheet", "aria-labelledby": "about-title" }, [
    el("div", { className: "settings-inner" }, [
      el("div", { className: "settings-head" }, [title, close]),

      // What Faves is, and the one limit that changes how you use it. The
      // limit rides with the statement rather than sitting in a "Prices" block
      // of its own: "this is a copy someone wrote down" is the same fact as
      // "check the price at the counter", and splitting them made the second
      // read as small print (ROADMAP 23a).
      el("div", { className: "about-intro" }, [
        el("p", { className: "about-lede", textContent:
          "A hand-picked guide to our favourite places to eat — menus, " +
          "prices and allergen info, gathered in one place so deciding what’s for " +
          "dinner is quick." }),
        el("p", { className: "about-lede", textContent:
          "Every menu here was copied down by hand, so Faves is a record rather " +
          "than a live feed. Prices and dishes change without notice — confirm " +
          "with the place when you order." }),
        // Owner-ruled 2026-09-29 (ADR 0141). In the intro, not a group of its
        // own: it is a fact about what Faves IS, and boot_check pins the groups.
        el("p", { className: "about-lede", textContent:
          "Faves is independent and in no way associated with any of the " +
          "restaurants listed." }),
      ]),

      group(
        "Private by design",
        "No accounts, no cookies, no personal information. Your favourites, " +
          "order and settings stay on your device. Like any website, our host " +
          "(Cloudflare) sees each visit, and we use its cookie-free visitor " +
          "statistics to see how Faves is used and keep it secure and running.",
          // ↑ ADR 0134. Keep in step with the no-JS footer in index.html.
        // Whether this browser will keep that data (roadmap 510/010, ADR 0146
        // §4). Inside "Private by design", not a group of its own: it is the
        // other half of "stays on your device", and boot_check pins the
        // groups. Filled on every open — the answer can change after a write.
        storageNote
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
  const wired = wireDialog(dialog, { closeBtn: close });
  wired.refreshStorage = () => refreshStorage(storageNote);
  return wired;
}

/** Say whether this browser has agreed to keep the data. Async, so the dialog
 *  opens at once and the sentence lands a moment later; a failure leaves the
 *  "doesn't say" wording rather than nothing. */
async function refreshStorage(node) {
  let state;
  try {
    state = await persistence.state();
  } catch {
    state = "unknown";
  }
  node.replaceChildren(
    ...storageSentences(state, persistence.onHomeScreen()).map((text) =>
      el("p", { className: "about-text", textContent: text })
    )
  );
}

export function initAboutUI() {
  // The footer link is the only opener: About left the ⋯ menu when the footer
  // came to every page (owner, 2026-09-29, ADR 0142).
  const footerLink = document.getElementById("about-open");
  // Guard against a double-init wiring the opener twice.
  if (!footerLink || footerLink.dataset.wired) return;
  footerLink.dataset.wired = "1";

  let dialog = null;
  const open = () => {
    if (!dialog) dialog = buildDialog(); // lazily build the DOM on first open
    dialog.showModal();
    dialog.refreshStorage?.();
  };

  // Swap the no-JS footer privacy note for the compact link that opens here.
  const footerNote = document.querySelector(".footer-privacy");
  if (footerNote) footerNote.hidden = true;
  footerLink.hidden = false;
  footerLink.addEventListener("click", open);
}
