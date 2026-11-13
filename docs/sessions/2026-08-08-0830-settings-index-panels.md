## 2026-08-08 — Settings: index + panels (wt: faves-settings-ia) — Opus 5

**Ask:** "The Settings UI is getting cluttered. Find a better experience for
users." Open brief — no prescribed shape.

**Measured before designing.** At 390 px the sheet's content was **1578 px tall
with 31 controls**. A screenshot showed it cut off partway through "Your
dietary needs": the allergen chips, both distance dials, the maps app and the
reset were all past the fold, unsignposted, and the allergen list was clamped
behind "Show all 8" so *one* of eight was visible. So the complaint wasn't
aesthetics — the safety-critical controls were the ones you couldn't see.

**Built:** an index of six topic rows drilling into single-topic panels
(ADR 0025 has the deliberation and the rejected alternatives). Each row's
subtitle is that setting's current value, so the state reads off the first
screen. Profile switcher stays on the index (one-tap hand-off) and moves into
the People panel when it opens. Reset moved into "Your data" with an inline
confirm — on a one-screen index a bare reset button sits one stray tap from
clearing someone's flagged allergens; on the old scroll, being buried *was* its
safety rail. After: index **552 px, fits one screen**; panels 174–441 px, all
fitting. `collapsible()` and its resize-measure machinery deleted.

🛑 **Moved to a worktree mid-session, correctly.** `node --test` failed on an
untracked `site/js/temporal.js`; `git status` showed modified restaurant JSONs,
`data.js`, `app.js` and `ranking.js` that this session never touched — positive
proof of a live concurrent session, against a tree that was clean at start.
Saved my three files as a patch, restored them in the primary tree, took
`/Users/mike/worktrees/faves-settings-ia`, reapplied. 320/320 passed there. The
`temporal.js` failure was theirs, not mine.

🔎 **Two bugs the browser caught that reading wouldn't have.**
- `translate()` caches an element's English text the first time it sees a
  `data-i18n`, so the one retitled `<h2>` could not carry a key — every panel
  after the first would have reverted to "Settings". `renderTitle()` does its
  own `t()` lookup. It also has to run on a **microtask**: `app.js` registers
  `initSettingsUI` before `initReo`, so when our settings subscriber fires, reo
  still holds the *old* language. Verified live — switching to te reo retitles
  the open panel to "Te Reo" and the index to "Ngā Tautuhinga", with `lang="mi"`
  marked per part.
- **Escape-steps-back was built, measured, and removed.** It needs
  `preventDefault()` on `cancel`, and Chrome's close-watcher only honours that
  while the page holds close-request budget. Six drill-in → Escape cycles with
  real `Input.dispatchMouseEvent` clicks and identical timing: **stepped back
  four times, force-closed twice**, no learnable pattern. Two-times-in-three is
  worse than never pretending, so Escape closes the sheet like every other
  dialog and the always-visible `‹` is the back affordance.

⚠️ **Test bugs, not app bugs, twice — worth recording so the next session
doesn't re-chase them.** The first driver seeded `{active, people}` when the
registry is `{v, activeId, profiles}`, so every summary read as defaults. The
second scoped `.profile-confirm` document-wide when **two** panels own one
(People's delete, Your data's reset) and the hidden one sorts first — clicks
landed at (0,0) and cascaded into eight false failures. Panel-scoped selectors
(`.settings-panel:not([hidden])`) fixed it.

**Verified:** validate 31 files (15 warnings, pre-existing); `node --test`
320 pass; no-deps; SBOM; a 12-check browser suite at 390 px over CDP — reset
confirm (asks, names the person, cancel is safe, confirm resets only the active
profile), export still writes its file, every visible target ≥44 px, the same
dialog on `restaurant.html` with a live pref change reaching the menu, and a
panel still visible under `prefers-reduced-motion`. Lighthouse mobile:
**a11y 100, best practices 100, SEO 100**; performance 83/84/83 across three
runs against **84 on unmodified main** — no regression. ⚑ That performance
number is the *dev server's* (python `http.server`, no compression, no HTTP/2),
not production, so it is not a reading against CLAUDE.md's ≥95 bar either way.

🔎 **Rebase turned up an ADR-number collision.** Two sessions landed while this
one worked: the allergen tag sweep (0024) and a time-dimension record (0023).
This one had also taken 0023, so it renumbered to **0025** on rebase. Their
`settings-ui.js` edit — the allergen disclosure string, reworded because some
tags are now *derived* rather than venue-stated — was carried into the
restructured file by hand, as their session log asked whoever rebased to do;
the same rewording was applied to this module's header comment.

**Three sessions, two rebases.** The time-dimension work (`temporal.js`,
ADR 0023) landed mid-rebase as well, so this rebased twice. Both took a shell
version this one had already claimed (`.98`, then `.99`), so the shell moved to
a fresh date — **`2026-08-08.1`** — rather than keep chasing a counter three
sessions were incrementing at once; data stays at their `.83`. 🚩 **Records
0023 and 0024 have files but no line in `docs/decisions/README.md`'s index.**
Left for those sessions rather than written on their behalf — but it means the
index reads 0022 → 0025.

⏳ **Left for the owner:** eyeball it on a real phone. The 390 px work is
headless Chrome, which is not a thumb. Also still open from Theme 12a — the
"Your data" placement question it flagged is now answered differently (it's a
row, and reset lives with it), so that check is worth folding into the same
look.

