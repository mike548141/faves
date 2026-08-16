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
  const sortGroup = document.getElementById("filter-sort-group");
  const nearBtn = document.getElementById("near-me");
  const routeBtn = document.getElementById("along-route");

  // Who to hand focus back to. A modal <dialog> restores focus itself, but the
  // element that opened it may be a "+2 more" chip that this very interaction
  // removes from the DOM — and focus on a detached node falls to <body>. So
  // remember the opener, and fall back to the bar button, which always exists.
  let opener = null;
  function open(from) {
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
      // No geolocation means neither sort control was unhidden; a group heading
      // over nothing is worse than no group.
      if (sortGroup) {
        sortGroup.hidden = !!nearBtn?.hidden && !!routeBtn?.hidden;
      }
    },
  };
}
