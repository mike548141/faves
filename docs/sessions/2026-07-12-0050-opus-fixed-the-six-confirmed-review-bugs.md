- **2026-07-12 (Opus: fixed the six confirmed review bugs)**: Worked the
  numbered findings from the Fable review above; the #7 cleanup set is left for
  next time. **1** `sw.js` install now keeps `addAll`'s guard by hand — a shell
  URL that returns non-200 throws and rejects the install rather than caching a
  broken asset that offline visitors then serve. **2** `to-top.js` +
  `about-ui.js` `el()` made hyphen-aware (mirroring `menu.js`), so
  `aria-label`/`aria-labelledby`/`data-i18n(-aria)` land as real attributes: the
  ↑ button and About dialog now have accessible names and translate. (Targeted
  fix, not the shared-`el()` module the review floated — that's a #7 cleanup.)
  **3** `settings-ui.js` `refresh()` strips `.fits` before measuring, so the
  "Show all" clamp/toggle returns after the group is narrowed again (was a
  one-way latch). **4** `picker.js` gained a `MutationObserver` on `<body>` class
  that clears a stale `.is-tucked` when browse returns — the FAB is `display:none`
  during search/faves so a scroll event may never fire to reset it. **5**
  contact-bar CSS reordered so the desktop `top:0` reset wins (equal
  specificity, later rule), plus `initContactBar` now width-guards on the 48rem
  breakpoint (matchMedia + a resize handler) so `.contact-bar-open` is never set
  on desktop. **6** `.chips-toggle` given `min-height:44px` (+ inline-flex
  centring). SW `.59→.60`. **Verified over CDP** (headless Chrome, zero-dep WS
  driver) at 390px + desktop: SW cached 71 entries incl. all 27 menus and served
  a deep link offline; ↑/About accessible names + data-i18n present; latch
  toggle returned on re-narrow; FAB `is-tucked` cleared on search-exit
  (`transform:none,opacity:1`); desktop toolbar stayed `top:0px` while the bar
  was `display:none`, mobile `top:48px`; chips-toggle 44px; zero console errors
  on home/menu/stub. Static suite green (validate 27, no-deps, SBOM, 176 tests).
  Note: the working tree also carries unrelated in-flight edits (atelier pin
  bump, `qr.js`/`serve.py` leakscan annotations, `.github/workflows/floor.yml`)
  left untouched and uncommitted this session.

