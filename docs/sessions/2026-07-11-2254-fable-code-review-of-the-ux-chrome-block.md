- **2026-07-12 (Fable: code review of the UX/chrome block)**: The deferred
  review, scoped to `8706f23~1..HEAD` under `site/` (~1.19k insertions, 17
  files). Eight finder angles fanned out on Opus, every candidate verified
  independently; 16 of 17 confirmed. **Findings, most severe first — fixes to
  apply on Opus, none applied this session:**
  1. `sw.js:73` — install swapped `cache.addAll(SHELL)` for per-URL
     `cache.put(await fetchClean(u))`, losing addAll's `response.ok` guard: a
     404/500 during a deploy race gets cached as a shell asset, install still
     resolves, and offline visitors serve the broken file until the next
     VERSION bump.
  2. `to-top.js:6` + `about-ui.js:13` — both new modules cloned the naive
     `Object.assign` `el()` instead of the hyphen-aware one (`menu.js:20-25`
     has the guard + warning comment), so `aria-label`/`aria-labelledby`/
     `data-i18n(-aria)` become inert expandos: the ↑ button is an unnamed
     control to screen readers and untranslatable; the About dialog has no
     accessible name; "Made by" can't reach its existing `footer.made` = "Nā"
     key. Repo-wide there are now 11 private `el()` copies (7 naive, 4
     hyphen-aware) — the root-cause fix is one shared hyphen-aware export.
  3. `settings-ui.js:109` — the chip-group `.fits` state is a one-way latch:
     `.fits` removes the max-height clamp, and `refresh()` measures without
     stripping it first, so once chips fit (e.g. landscape) the clamp/"Show
     all" toggle can never return after rotating narrower.
  4. `picker.js:189` — `.is-tucked` is only ever cleared by a scroll event;
     the scroll listener keeps running while the FAB is `display:none` in
     search, so exiting search can restore "Pick for us" still translated
     off-screen.
  5. `app.css:2195` — the unconditional `.contact-bar-open .menu-toolbar`
     top-offset comes after the equal-specificity desktop `top:0` rule, and
     `initContactBar` (`menu.js:733`) has no width guard, so on a short
     desktop window the toolbar drops ~3rem while the bar itself is
     `display:none`.
  6. `app.css:1828` — `.chips-toggle` computes to ~29px tall (no min-height):
     breaks the 44px target rule.
  7. Cleanup (all confirmed): `sw.js:118` cacheFirst re-inlines fetchClean
     (`return hit || fetchClean(req)`); search-clear ✕ wiring duplicated
     `app.js:1030` vs `menu.js:610`; share-app vs share-ui duplicate the
     share/clipboard/AbortError flow; three divergent hand-rolled `<dialog>`
     lifecycles; to-top's scroll listener is unthrottled (picker's is
     rAF-gated) and home now boots two scroll listeners; settings resize →
     forced reflow per chip group; `centerNavLink` builds a fresh matchMedia
     per call and reads rects after class writes; About dialog DOM built
     eagerly on every home boot; `--contact-bar-h: 3rem` is assumed, never
     measured (overlap risk at large font settings).
  Refuted (don't re-raise): disclosure.js leaving orphaned listeners when
  Settings closes with the ⓘ note open — the capture-phase click listener
  fires before the ✕/backdrop handlers and self-closes cleanly.

