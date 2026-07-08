// Header overflow ("⋯") menu. Consolidates the account-less app chrome —
// Favourites and Settings — under one button so the home header stays
// uncluttered (the Open-now/Cheap-eats/Near-me toggles act on the list and
// stay put; per-restaurant dish filters are untouched). The menu items keep
// their own IDs and are wired by app.js / settings-ui.js exactly as before —
// this module only owns opening/closing the popup and its keyboard model.

export function initOverflowMenu() {
  const wrap = document.querySelector(".overflow");
  const btn = document.getElementById("overflow-btn");
  const menu = document.getElementById("overflow-menu");
  if (!wrap || !btn || !menu) return;
  wrap.hidden = false; // JS is present — reveal the button (no dead no-JS chrome)

  const items = () => [...menu.querySelectorAll('[role="menuitem"]:not([hidden])')];
  const isOpen = () => btn.getAttribute("aria-expanded") === "true";

  function setOpen(open, focusFirst) {
    if (open === isOpen()) return;
    btn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    // Capture-phase so it still fires when an inner handler stops bubbling.
    const fn = open ? "addEventListener" : "removeEventListener";
    document[fn]("pointerdown", onOutside, true);
    document[fn]("keydown", onKey, true);
    if (open && focusFirst) items()[0]?.focus();
  }

  function onOutside(e) {
    if (!wrap.contains(e.target)) setOpen(false);
  }

  function onKey(e) {
    if (e.key === "Escape") {
      setOpen(false);
      btn.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const list = items();
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement);
      const step = e.key === "ArrowDown" ? 1 : -1;
      list[(i + step + list.length) % list.length].focus();
    }
  }

  btn.addEventListener("click", () => setOpen(!isOpen(), true));
  // Activating an item runs its own handler (toggle favourites, open settings);
  // close the popup after so we don't leave it hanging over the result.
  menu.addEventListener("click", (e) => {
    if (e.target.closest('[role="menuitem"]')) setOpen(false);
  });
}
