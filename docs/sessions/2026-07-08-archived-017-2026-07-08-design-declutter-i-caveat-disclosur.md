- **2026-07-08 (design declutter: ⓘ caveat disclosure + page footer)**:
  Owner picked the "design declutter" pair from the roadmap's ready-to-build
  queue. Two small Theme 3 wins. (1) The menu screen's always-on "Menu items
  and prices need a refresh…" banner is now an accessible **ⓘ disclosure**
  beside the venue name (`caveatDisclosure` in `menu.js`): a real
  `<button aria-expanded>` + `aria-controls` note, toggled on click, revealed
  on hover for pointer devices via CSS, closing on Escape (focus returns to
  the button) or an outside tap (a capture-phase document listener, added
  only while open). The note is a popover absolutely positioned inside the
  `.menu-title-group` (its positioning context) with `width: max-content` +
  `max-width: min(28rem, 88vw)` so it never overflows — verified. Replaced
  the old `.menu-caveat` banner CSS. (2) A `.site-footer` on the home page —
  a plain-language privacy note (no accounts / no tracking / no third-party
  scripts; favourites, order and settings stay on the device; only the
  site's own pages are fetched) + "Made by cakeIT". Static HTML (shows
  without JS), placed inside `<main>` so the fixed filter bar's bottom
  padding clears it. Business attribution only — no contact details.
  Browser-verified via headless Chrome + a CDP driver (Node 24's built-in
  WebSocket, zero install) at 390 px: ⓘ toggles open→close, Escape and
  outside-click both close, aria-expanded tracks state, popover stays in
  bounds (left 16 → right 359 of 390), the venue ♥ is untouched; and the
  footer clears the fixed bar at an 800 px viewport (footer bottom 702 ≤ bar
  top 732, the ~30 px = `--space-4` gap). node --test 100 pass; validate.py
  + check_no_deps.py clean. VERSION → 2026-07-08.21 (no new modules; edits to
  precached index.html + app.css + menu.js). CHANGELOG + ROADMAP updated
  (both items marked done). No ADR — reversible implementation choices.
