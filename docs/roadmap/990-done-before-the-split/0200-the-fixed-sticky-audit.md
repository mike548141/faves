- [x] ✅ **The fixed/sticky audit** (`f619722`). `a.app-home-link` was
  **81.7 × 31.9 px**, under the 44 px floor — now 44. The pinned contact bar,
  toolbar and section titles occlude scrolling content **by design** (opaque
  pinned headers) and are not defects; jump-nav landing clearance was measured at
  **+5.5 px** (390/16px) and **+8.4 px** (390/24px) — passing, but thin.
  `a.menu-sub-link` at 31.1 × 22.8 px was left alone: it is an already-documented
  WCAG 2.5.8 *inline* exception, and the CSS comment says so.
  ⚠️ One measurement was **not** acted on and is now its own open item: the order
  pill eating a "Gluten free" chip's tap at *Very large* text.
