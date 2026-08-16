// A floating "back to top" control for long lists. It appears only after you've
// scrolled down a bit and scrolls back up (instant under prefers-reduced-motion).
// Shared by the menu screen and the home restaurant list. Body-level and guarded
// against a double-append so either caller can invoke it safely.
//
// WHY IT TUCKS AWAY WHEN YOU SCROLL DOWN (Theme 29, owner-raised from his own
// phone: the ↑ sat over the "French fries" row and hid the right-hand end of
// its price). A fixed control over a scrolling list will always overlap
// something, so "move it" is not a fix — there is nowhere at 390 px that is not
// over the list. Measured in headless Chrome at 390 × 844, root 16 px, over a
// real menu (thai-tara-express, 21 667 px of document, 547 scroll positions):
// the button covered a `.dish-price` at 96 of them — 17.6 % of everywhere you
// can stop — and the worst case covered a price 100 %, leaving 0 px of "$8"
// readable. On the home list the same button covered a venue's ♥ at 64 of 169
// positions, worst case 88.8 %, leaving 5.4 px of a 48 px control.
//
// The other half of the roadmap's framing — "give the list enough end padding" —
// was already true and is not the bug: at the very bottom of the document the
// button overlapped nothing in any of the eight width × text-size combinations
// measured, because `main`'s padding-bottom already reserves its band. The
// damage is all mid-scroll, which only the second option reaches: let the
// control get out of the way while the list is moving.
//
// So: scrolling DOWN tucks it off the bottom edge; scrolling UP brings it back.
// Scrolling up is the gesture that means "take me back", so the control arrives
// exactly when it is wanted and is absent for the whole of a downward read —
// including when you stop, because a stop after a downward scroll leaves it
// tucked. It starts tucked, so a deep link that lands past the threshold does
// not open with a button over a price.
//
// Rejected: re-tucking after an idle timeout. It would also clear the page at
// rest, but it takes the control away *between* the reader deciding to tap it
// and reaching it — the one moment it must not move.
//
// The tuck is opacity + transform, never `visibility`/`pointer-events`: the
// button stays focusable and stays in the accessibility tree while tucked, and
// `.to-top.is-tucked:focus-visible` in app.css brings it straight back on Tab.
// It is also never tucked while it holds focus.

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

  const SHOW_AT = 600; // px of scroll before the control is offered at all
  // Ignore sub-pixel drift and iOS rubber-banding, which would otherwise flip
  // the direction (and so the tuck) on a stationary page.
  const JITTER = 6;

  let lastY = window.scrollY;
  let goingDown = true; // start tucked — see the header note

  const apply = () => {
    const y = window.scrollY;
    const dy = y - lastY;
    if (Math.abs(dy) >= JITTER) {
      goingDown = dy > 0;
      lastY = y;
    }
    btn.hidden = y < SHOW_AT;
    // A keyboard reader who has tabbed to the button keeps it, whichever way
    // the page then moves.
    if (document.activeElement !== btn) btn.classList.toggle("is-tucked", goingDown);
  };

  // rAF-throttled (like the picker FAB) so a fast scroll coalesces to one
  // read+write per frame rather than one per scroll event.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  // Tab moving focus onto a tucked button has to un-tuck it for good, not just
  // for as long as :focus-visible happens to match.
  btn.addEventListener("focus", () => btn.classList.remove("is-tucked"));
  btn.classList.add("is-tucked");
  apply(); // initial state, no need to wait for a frame

  btn.addEventListener("click", () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    btn.blur();
  });
}
