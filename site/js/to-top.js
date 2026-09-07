// A floating "back to top" control for long lists. It appears once you've
// scrolled down a bit — on the way DOWN as well as on the way up — and scrolls
// back up (instant under prefers-reduced-motion). Shared by the menu screen and
// the home restaurant list. Body-level and guarded against a double-append so
// either caller can invoke it safely.
//
// WHY IT DODGES INSTEAD OF DISAPPEARING (Theme 29, both halves owner-raised
// from his own phone).
//
// The first report was that the ↑ sat over the "French fries" row and hid the
// right-hand end of its price. The answer then was to tuck the control away
// while the reader was scrolling DOWN and summon it on a flick UP. The second
// report, 2026-09-07, is that this made the control unreachable on the way
// down: *"the arrow should appear the moment I start to scroll down the page."*
// The straight revert — show it on the way down and accept the occlusion — was
// put to the owner with the measurements below and DECLINED. Both asks stand:
// offered while scrolling down, AND never on top of a price or a ♥.
//
// The sentence that makes this hard, and it is still true: a fixed control over
// a scrolling list will always overlap something, so "move it 20 px" is not a
// fix — at 390 px the content column is `100% - 2 * --space-3`, so the gutter
// either side is 16 px and a 44 px-minimum target cannot live in it. Measured
// 2026-09-07 in headless Chrome by `tools/to_top_check.mjs` with the dodge
// below switched off — i.e. exactly the declined "just show it on the way
// down" — sweeping the whole document in 37 px steps:
//
//   menu  390 px / 16 px text   151 of 554 positions occluded, worst 100 % of a
//                               `.dish-price` — 0 px of "$8" legible
//   menu  390 px / 24 px text   184 of 844, worst 100 %
//   home  390 px / 16 px text   134 of 200, worst 88.8 % of a ♥
//   home  390 px / 24 px text   174 of 389, worst 77.9 %
//   home 1200 px / 16 px text    60 of  97, worst 86.2 %
//   home 1200 px / 24 px text    70 of 157, worst 94.6 %
//
// (The menu at 1200 px is the one layout with nothing to solve: the column
// stops at 756 px and the button sits at 1004 px, clear of it.) These are not
// the same numbers as the 2026-08 report's 96 of 547 — that measured a document
// 21 667 px tall where this one is 21 330 px, so the corpus itself has moved;
// no attempt has been made to reconcile the two.
//
// What the same sweep also showed is the way out: at EVERY one of those
// positions there was a clear resting place within a short move UP the same
// column, with a median of 0 (i.e. usually the corner is already free). There
// is nowhere at 390 px that is not over the list; there is always somewhere
// that is not over anything of the READER'S. Sweeping the same eight
// combinations again with the dodge in place: occlusion 0 of 3 452 positions.
// It has to step aside at 151 of 537 positions on the menu at 390 px (by at
// most 82 px) and 132 of 183 on the home list (by at most 109 px); the largest
// step anywhere was 172 px, on the home list at 24 px root text.
//
// ✅ THE STEPPER IS PROTECTED TOO — owner-ruled 2026-09-07, and the movement
// cost was accepted with its number in front of him. The list is the ruling's
// list (a price, a ♥, the names) PLUS the tappable controls on a dish row:
// `.stepper-add, .stepper-btn, .dish-photo-btn, .dish-report`. The reason is
// that the button is now on screen for the whole of a downward read where it
// used to be tucked, so without this it comes to rest on a dish's ＋ / −
// stepper and owns that tap — the same harm class as the order pill eating a
// dietary chip's tap, and a mis-tap that silently changes an order.
// 🚩 THE PRICE, MEASURED AND KNOWINGLY PAID: on the menu at 390 px the control
// is displaced at 326 of 537 positions instead of 151, and travels further. So
// it floats above its corner for MORE THAN HALF of a downward read. That is
// deliberate. If a future session finds the movement distracting, the fix is to
// argue the trade with the owner again — not to quietly shorten this list,
// which is how the mis-tap comes back.
// ✅ RE-MEASURED ON THE SHIPPED CONFIGURATION 2026-09-07 (64/64, occlusion 0,
// dodge inside its travel limit in all 8 combinations): menu 390/16 steps
// aside at 326 of 537 — the predicted figure, to the position — and 376 of 827
// at 24 px text. The home list is 132 of 183 and 172 of 374, IDENTICAL to
// before the stepper was added, which is the evidence for the claim below that
// cards carry no stepper. The two menu-at-1200 px combinations step aside 0
// times of 495 and 681: that layout has nothing to solve, the column stopping
// at 756 px while the button sits at 1004 px.
// The whole-card link on the home list is deliberately NOT protectable: it
// spans the card, so counting it would leave nowhere clear at all — and a
// mis-tap on it costs a reader nothing they cannot undo with Back.
//
// So the control stays offered the whole way down and steps out of the way of
// whatever is actually beneath it: each frame it reads the boxes of the things
// this app exists to make legible — a dish price, a dish name, a venue name, a
// ♥ — and if any of them is under the button it slides up the smallest distance
// that clears the topmost one, with CLEARANCE px of air. The corner is the
// preferred home and it returns there the moment the corner is free.
//
// Rejected: re-tucking after an idle timeout. It would also clear the page at
// rest, but it takes the control away *between* the reader deciding to tap it
// and reaching it — the one moment it must not move. The dodge is not that
// mistake: it only re-evaluates while the page is scrolling, so a control the
// reader is reaching for on a still page never moves.
// Rejected: fading it over the list. A translucent circle still owns the tap
// and still makes the number under it unreadable — the two harms measured.
// Rejected: reserving a right-hand rail so the column never reaches the button.
// It works and it never moves, but it costs 56 px of a 358 px reading column on
// every phone screen, always, for a control that only appears past 600 px of
// scroll. That is a change to the app's reading width and is the owner's to
// make, not a side effect of this fix.
//
// The tuck is opacity + transform, never `visibility`/`pointer-events`: the
// button stays focusable and stays in the accessibility tree while tucked, and
// `.to-top.is-tucked:focus-visible` in app.css brings it straight back on Tab.
// It is also never tucked while it holds focus. Tucking is now only the safety
// valve for a page so dense that no clear resting place exists within
// MAX_DODGE — never observed in the corpus, and the check would report it.

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
  // The things the control may never sit on: the two prices/names a menu row is
  // read for, the venue name on a card, and the ♥ that saves it. Kept in step
  // with the selector list `tools/to_top_check.mjs` measures against — if one
  // list grows and the other does not, the check stops covering the new thing.
  const PROTECTED =
    ".dish-price, .dish-name, .heart, .card-name, " +
    ".stepper-add, .stepper-btn, .dish-photo-btn, .dish-report";
  const CLEARANCE = 6; // px of air left between the button and what it dodged
  // Headroom over the largest dodge the sweep has ever needed: 172 px, on the
  // home list at 390 px with 24 px root text (the menu at 390 px never needed
  // more than 94). Past this the control tucks rather than climb absurdly far
  // up the screen — and `tools/to_top_check.mjs` FAILS if that valve is ever
  // reached, so this staying unused is observed on every run, not assumed.
  const MAX_DODGE = 220;

  let dodge = 0; // px the control is currently displaced UP from its corner

  // The dodge rides a custom property rather than the `transform` shorthand so
  // that `:active`'s press-scale and `.is-tucked`'s slide can compose with it
  // in app.css instead of cancelling it.
  const setDodge = (d) => {
    if (d === dodge) return;
    dodge = d;
    btn.style.setProperty("--to-top-dodge", `${-d}px`);
  };

  const apply = () => {
    const y = window.scrollY;
    btn.hidden = y < SHOW_AT;
    if (btn.hidden) {
      setDodge(0);
      btn.classList.remove("is-tucked");
      return;
    }

    // One layout read per frame, all of it before the single write below —
    // reads and writes are never interleaved, so this costs one flush, not one
    // per element. `getBoundingClientRect()` on the button already carries the
    // current dodge, so add it back to recover the corner position.
    const r = btn.getBoundingClientRect();
    const homeTop = r.top + dodge;
    const homeBottom = r.bottom + dodge;
    const lo = homeBottom - MAX_DODGE - r.height;
    const boxes = [];
    for (const node of document.querySelectorAll(PROTECTED)) {
      const b = node.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      if (b.bottom < lo || b.top > homeBottom) continue; // outside the travel
      if (b.right <= r.left || b.left >= r.right) continue; // not in this column
      boxes.push(b);
    }

    // Climb: clear the topmost box currently under the control, then look
    // again — moving above one box can put it under the one before it.
    let d = 0;
    let clear = true;
    for (let i = 0; i < 12; i++) {
      const top = homeTop - d;
      const bottom = homeBottom - d;
      let hit = null;
      for (const b of boxes) {
        if (b.bottom > top && b.top < bottom && (!hit || b.top < hit.top)) hit = b;
      }
      if (!hit) break;
      const next = homeBottom - hit.top + CLEARANCE;
      // No progress means the geometry is degenerate (a box taller than the
      // travel); stop rather than spin.
      if (next <= d || next > MAX_DODGE) {
        clear = false;
        break;
      }
      d = next;
    }

    setDodge(clear ? d : 0);
    // A keyboard reader who has tabbed to the button keeps it, whichever way
    // the page then moves.
    if (document.activeElement !== btn) btn.classList.toggle("is-tucked", !clear);
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
  // A resize (or the browser's text size changing) moves every box the dodge is
  // computed from, and neither fires a scroll event.
  addEventListener("resize", onScroll, { passive: true });
  // Tab moving focus onto a tucked button has to un-tuck it for good, not just
  // for as long as :focus-visible happens to match.
  btn.addEventListener("focus", () => btn.classList.remove("is-tucked"));
  apply(); // initial state, no need to wait for a frame

  btn.addEventListener("click", () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    btn.blur();
  });
}
