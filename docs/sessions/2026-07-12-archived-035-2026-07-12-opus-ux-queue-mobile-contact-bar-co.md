- **2026-07-12 (Opus: UX queue — mobile contact bar collapse)**: First of the
  queued UX polish items. On a phone the tall contact card (call/pickup/hours)
  used to scroll off with the header, taking "call to order" with it down a long
  menu. Added a slim fixed bar that pins to the top once the full `.contact-card`
  leaves the viewport (IntersectionObserver, not a scroll listener), showing the
  open-now status badge + a compact `tel:` "Call to order" button. The sticky
  search/section toolbar offsets below it via a `.contact-bar-open` body class
  (`--contact-bar-h` + notch inset); desktop keeps its sticky aside column so the
  bar is `display:none` there. Body-level like the FAB (viewport-relative fixed);
  translated on create since boot's `translate()` scopes to `root`. Verified over
  CDP at 390px on the Hell Pizza menu (hidden at top → shown on scroll, toolbar
  pushed to 48px, call+status present → re-hidden on scroll back; `display:none`
  at desktop width; zero console errors); full verify suite green. SW `.55→.56`.
  **Queue remaining:** Footer privacy → About surface [M]; Share-this-app menu
  item [S]; Pick-for-us relocation/hide-on-scroll [S].
