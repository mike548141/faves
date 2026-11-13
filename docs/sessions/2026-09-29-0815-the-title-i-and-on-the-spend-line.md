## 2026-09-29 — the title ⓘ, and "~" on the spend line

- The ⓘ beside a venue or recipe name sat 3.9px below the name's capitals,
  measured with canvas ink metrics on both pages at 390 and 1200 px. A scoped
  `.menu-title-group > .caveat-btn { margin-top: -0.27em }` brings it to
  0.00px. Not changed for the ingredient, tag and Settings ⓘ, which use the
  same button inline.
- The restaurant spend line reads `$$ ~$16 per person` (owner, ADR 0143,
  amending 0141 row 1 from earlier today). The "~" is aria-hidden and spoken
  "about". The home card chip was not in the ask and stays `$$ $16pp`.
- Commit `51bc7c7`. Verified: node --test 1480/0, validate, boot_check 29,
  recipe_check 72, picks_check 20, focus_check 31.
- **Addendum:** tags now fold on the WHOLE row's size (owner, third pass
  today): 3 or fewer all show; 4 or more show the first 2 and fold the rest.
  `TAG_MIN_FOLD` is gone, replaced by `TAG_SHOW_ALL = 3`. The count includes
  declared chips, so a four-chip row with a selected preference sorted fourth
  folds a single chip. Break-probed: dropping the threshold fails the
  shipped-constants test. The home price chip also gains its "~" (ADR 0144).
- **Addendum:** the home search bar (`.home-tools`) is sticky, styled like
  the menu page's `.menu-toolbar` (owner ask). Measured pinned at `top: 0`
  after a 1,500px scroll at 390 and 1200px, with no sideways overflow, and
  the search input receives the hit-test there. `html:has(.home-tools)` gets
  `scroll-padding-top: 5rem` so a focused card is never under the bar. Chrome
  centres focus anyway (measured 405px down), so that half is untested in a
  browser that scrolls minimally (Safari). The inline filter row on wide
  screens is NOT pinned: only the search was asked for. Checks passed: boot,
  focus, to_top, filter_row, distance, geo and device.

