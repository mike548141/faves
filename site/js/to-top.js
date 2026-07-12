// A floating "back to top" control for long lists. It appears only after you've
// scrolled down a bit and scrolls back up (instant under prefers-reduced-motion).
// Shared by the menu screen and the home restaurant list. Body-level and guarded
// against a double-append so either caller can invoke it safely.

import { el } from "./dom.js";

export function initBackToTop() {
  if (document.querySelector(".to-top")) return;
  const btn = el(
    "button",
    {
      type: "button",
      className: "to-top",
      hidden: true,
      "aria-label": "Back to top",
      "data-i18n-aria": "nav.backToTop",
    },
    [el("span", { "aria-hidden": "true", textContent: "↑" })]
  );
  document.body.append(btn);

  // rAF-throttled (like the picker FAB) so a fast scroll coalesces to one
  // read+write per frame rather than one per scroll event.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.hidden = window.scrollY < 600;
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  btn.hidden = window.scrollY < 600; // initial state, no need to wait for a frame

  btn.addEventListener("click", () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    btn.blur();
  });
}
