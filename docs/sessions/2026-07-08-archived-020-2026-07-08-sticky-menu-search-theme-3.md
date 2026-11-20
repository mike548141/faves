- **2026-07-08 (sticky menu search, Theme 3)**: Completed the last piece of
  the sticky-menu work — the search field now stays pinned. Wrapped the
  search + section jump-nav in one sticky `.menu-toolbar` (top:0, z 6);
  moved the dietary chips out of the pin to a non-sticky row below (they
  filter the sections and scroll away), keeping pinned chrome light. The
  toolbar height is measured once (rAF, + on resize) into `--toolbar-h` on
  `#menu-root`, and the section-title sticky `top` + section/dish
  `scroll-margin-top` now key off that var (fallback 6.6rem) instead of the
  old `--nav-h` — so section headings pin exactly under the toolbar and
  deep-links clear it, whatever the render height. Scroll-spy unchanged
  (percentage rootMargin). Search-above-nav chosen over the roadmap's
  literal "under the nav" so the primary action leads and reading order
  stays natural. Browser-verified via CDP at 390px: after scrolling 1600px
  the search is stuck at top:0, toolbar measured 108px, "Starters" heading
  pins at 107, a dish scrollIntoView lands clear of the toolbar. node --test
  108 pass; check_no_deps clean. VERSION → 2026-07-08.24 (menu.js/css only,
  no new module). CHANGELOG + ROADMAP updated (item done).
