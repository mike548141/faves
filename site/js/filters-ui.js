// The home screen's filter sheet — the UI half of the filter state app.js owns.
//
// WHY A SHEET. Measured 2026-08-16 in real Chrome at 390 × 844: the home
// screen's seven filter/sort controls sat in two places (a chip row above the
// list and a fixed bottom bar) and cost 427.9 px — 50.7 % of the viewport, or
// 58.4 % arriving from a venue's facet link. Three cards were visible; two in
// the facet state. The owner: "there is too much filter/sort stuff on the
// screen… we need something that is both feature rich and simple to use without
// flooding the screen with UI selectors." So the controls collapse behind one
// thumb-reachable button and the bar keeps its DESIGN.md mandate at 4.4rem
// instead of 7.6.
//
// THE RULE THAT GOVERNS EVERYTHING HERE: a filter that is on is never
// invisible. Hiding a control is fine; hiding the *fact* that it is narrowing
// the list is not — a reader meeting a short list must always be able to see
// why. Three independent tells, deliberately redundant:
//   1. the badge on this button — "Filters" + 2, and the button goes accented;
//   2. the dismissible chips beside the count, which name each one and clear it
//      in a tap (ADR 0050's escape, generalised from two filters to all five);
//   3. the count itself — "6 of 51 places".
// All three read the same `activeFilters(state)` (filters.js), so they cannot
// drift apart.
//
// NOT BUILT LAZILY, unlike Settings and About. The sheet's markup is in
// index.html and lives in the DOM from first paint: `filtersFromQuery` has to
// set the selects before anything is opened (ADR 0050 — the control and the
// list must agree on arrival), and boot_check.mjs reads #filter-cuisine's value
// without opening a dialog. A closed <dialog> keeps its children, so this costs
// nothing but the markup.
//
// THE DESKTOP ROW IS A DOM MOVE, NOT A MEDIA QUERY (Theme 15x — asked for
// twice). A sheet is the right answer at 390 px and the wrong one at 1280,
// where there is room to simply show the controls. But a *closed* <dialog>
// cannot render its children on the page — `display: none` is not negotiable
// from CSS — so no media query can put the sheet's controls inline. What can:
// move `#filter-controls` out of the dialog and into `#filter-controls-inline`
// in <main>. One element, moved; never a duplicate, because a duplicate is two
// sets of listeners and two sources of truth for what "Cuisine: Thai" means.
//
// THE BREAKPOINT LIVES IN JS, NOT CSS. `place()` sets `body.filters-inline`
// and every inline style rule keys off that class. If CSS carried its own
// `@media (min-width: …)` the two could disagree, and the failure mode is
// grim — a row styled as an inline panel while it is actually sitting inside a
// closed dialog, i.e. invisible controls that CSS insists are fine.
//
// `matchMedia().addEventListener("change")` rather than a resize listener: it
// fires on breakpoint crossings only, so there is nothing to debounce, and
// `place()` early-returns when the controls are already in the right host, so
// a spurious call costs nothing.
//
// NO APPLY BUTTON, ever (DESIGN.md: "Filters are instant, no apply button").
// The footer's primary is a *dismiss* that names what is already true.

import { wireDialog } from "./dialog.js";
import { t } from "./reo.js";

/**
 * Wire the sheet. `onClearAll` clears every active filter and re-renders.
 * Returns `{ sync, open }`; app.js calls `sync` from its own render so the
 * badge, the footer count and the sheet's own live region can never lag the
 * list. Returns inert no-ops if the markup or <dialog> support is missing —
 * the page must still work, just without the sheet.
 */
export function initFiltersUI({ onClearAll } = {}) {
  const btn = document.getElementById("filters-btn");
  const sheet = document.getElementById("filter-sheet");
  const noop = { sync() {}, open() {} };
  if (!btn || !sheet || typeof sheet.showModal !== "function") return noop;

  const badge = document.getElementById("filters-count");
  const closeBtn = document.getElementById("filter-sheet-close");
  const clearBtn = document.getElementById("filters-clear");
  const doneBtn = document.getElementById("filters-done");
  const doneLabel = document.getElementById("filters-done-label");

  // ---- The desktop row: one element, two homes (see the header note) -------
  const controls = document.getElementById("filter-controls");
  const inlineHost = document.getElementById("filter-controls-inline");
  const sheetHost = document.getElementById("filter-sheet-body");
  const foot = sheet.querySelector(".filter-foot");
  // 60rem = the content column's own max width, so the row goes inline exactly
  // when the page stops being one narrow column. `rem` in a media query
  // resolves against the browser's default font size, not the CSS root size —
  // so a reader who has turned their browser text up gets the sheet for longer,
  // which is right: the same controls need more room at 24 px than at 16.
  const wide = matchMedia("(min-width: 60rem)");

  function place(isWide) {
    if (!controls || !inlineHost || !sheetHost) return;
    const host = isWide ? inlineHost : sheetHost;
    if (controls.parentElement !== host) {
      // Capture BEFORE anything moves or closes: sheet.close() below runs the
      // close handler, which parks focus on `btn` — and `btn` is about to be
      // hidden. Reading activeElement after that would restore the wrong thing.
      const active = document.activeElement;
      const hadFocus = !!active && controls.contains(active);
      // Everything outside an OPEN modal <dialog> is inert. Moving the controls
      // inline while the sheet is open would render them on the page and then
      // refuse every click on them, which looks like a broken row rather than a
      // modal. Close first; the reader is getting the controls either way.
      if (isWide && sheet.open) sheet.close();
      host.append(controls);
      // "Clear all" travels too, so it is not a phone-only affordance. It is
      // the same button moved, not a second one — the sheet's footer keeps the
      // dismiss, which is all it needs when the controls are elsewhere.
      if (clearBtn) {
        if (isWide) controls.append(clearBtn);
        else foot?.insertBefore(clearBtn, doneBtn ?? null);
      }
      inlineHost.hidden = !isWide;
      btn.hidden = isWide; // an entry point to an emptied sheet is a dead end
      document.body.classList.toggle("filters-inline", isWide);
      // Last, after the hiding above — a focus restore before it would be
      // undone by hiding whatever we just focused.
      if (hadFocus) {
        // Chrome drops focus to <body> when a focused node's ancestor is moved.
        // Going wide the element is on the page and can simply take it back;
        // going narrow it has just landed inside a CLOSED dialog, where nothing
        // is focusable, so the button that now stands for the controls gets it.
        if (isWide && active.isConnected) active.focus();
        else btn.focus();
      }
      return;
    }
    inlineHost.hidden = !isWide;
    btn.hidden = isWide;
    document.body.classList.toggle("filters-inline", isWide);
  }

  place(wide.matches);
  wide.addEventListener("change", (e) => place(e.matches));

  // Who to hand focus back to. A modal <dialog> restores focus itself, but the
  // element that opened it may be a "+2 more" chip that this very interaction
  // removes from the DOM — and focus on a detached node falls to <body>. So
  // remember the opener, and fall back to the bar button, which always exists.
  let opener = null;
  function open(from) {
    // Inline, the sheet has no body to show. app.js's "+2 more" chip calls this
    // to reveal the filters it could not fit — so send the reader to the row
    // that already holds them rather than to an empty modal.
    if (wide.matches && controls?.isConnected) {
      controls.scrollIntoView({ block: "nearest" });
      const first = controls.querySelector("select, button:not([hidden])");
      (first ?? controls).focus?.();
      return;
    }
    opener = from || btn;
    sheet.showModal();
  }
  btn.addEventListener("click", () => open(btn));
  doneBtn?.addEventListener("click", () => sheet.close());
  clearBtn?.addEventListener("click", () => onClearAll?.());
  // ✕ + a click on the backdrop close; Escape is the <dialog> default.
  wireDialog(sheet, { closeBtn });
  sheet.addEventListener("close", () => {
    const target = opener?.isConnected ? opener : btn;
    target.focus();
    opener = null;
  });

  function setEntryLabel(n) {
    // Composed, so it cannot carry a data-i18n key — reo.js swaps whole strings
    // only. The noun comes from the table; the count is a number either way.
    const noun = t("filter.button", "Filters");
    if (n > 0) btn.setAttribute("aria-label", `${noun} — ${n} on`);
    else btn.removeAttribute("aria-label"); // the button's own text names it
  }

  return {
    open,
    /**
     * `active` is filters.activeFilters(state); `shown`/`total` are the list
     * lengths behind "6 of 51 places".
     */
    sync({ active, shown, total }) {
      const n = active.length;
      if (badge) {
        badge.textContent = n ? String(n) : "";
        badge.hidden = n === 0;
      }
      if (clearBtn) clearBtn.disabled = n === 0;
      if (doneLabel) {
        // English-composed for the same reason as the entry label above. This
        // span is the live region while the sheet is open: showModal() makes
        // #result-count inert, so its announcements stop reaching anyone, and
        // DESIGN.md requires a live region for the result count.
        doneLabel.textContent =
          shown === 0
            ? "No places match"
            : shown === total
              ? `Show all ${total} places`
              : `Show ${shown} place${shown === 1 ? "" : "s"}`;
      }
      // A language switch arrives through app.js's settings subscription, which
      // is registered before reo.js's — so at this instant t() still answers in
      // the old language. A microtask lands after reo has caught up. Same
      // reasoning, same fix, as settings-ui.js's renderTitle().
      queueMicrotask(() => setEntryLabel(n));
      // There is no sort group left to show or hide (ADR 0068): one ranking,
      // distance inside it, and the location that feeds it is asked for by
      // #geo-row up beside the list rather than by a control in this sheet. The
      // rule that outlived the group is the one worth keeping — whether a
      // control can exist at all is a browser-capability question, decided once
      // by app.js on the one path that proves the capability is there, never
      // re-decided per render from ids this file happens to hold.
    },
  };
}
