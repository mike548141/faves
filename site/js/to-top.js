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

  const onScroll = () => {
    btn.hidden = window.scrollY < 600;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    btn.blur();
  });
}
