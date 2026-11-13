## 2026-08-09 — Owner round 2: transport ruled, PWA staleness diagnosed, a CSS fix — Opus 5

Follow-on to the same day's roadmap session. One ruling recorded, two themes
added, one bug found and fixed.

**Feedback transport ruled: compose-and-share** (Theme 4c). Recorded with the
two alternatives kept alive rather than struck out — the GitHub-issue path
unblocks when the repo goes public, and the Pages Function is the right front
door once the audience stops being people who can already message the owner.

🔎 **The PWA staleness report was diagnosed, not just filed** (Theme 16), and
the cause is ours. [`sw-register.js`](../../site/js/sw-register.js) is nine lines:
it registers on `load` and does nothing else — no `registration.update()`, no
`updatefound` handler, no reload path. A browser only re-fetches `sw.js` on a
navigation (plus a ~24 h background check), and a standalone PWA resumed from
memory performs no navigation. So killing the app is currently the *only* way
to trigger a check, which is exactly the owner's workaround.

**The half that would have been missed:** even after the new worker installs,
`sw.js` already calls `skipWaiting()` + `clients.claim()`, so it takes control
immediately — but nothing reloads the page that is already on screen. "Check
for an update" and "show the new version" are two separate fixes; shipping only
the first would change nothing visible and would have read as the fix not
working. Both are written up, along with the version-skew risk `skipWaiting()`
carries once updates start landing mid-session.

**Bug fixed: the menu-page back-link was double-inset.** `.menu-topbar` is a
`.wrap` (already inset by `--space-3`) and `.skip` added the same inset again,
because `.skip` also serves `recipe.html`, where it sits *outside* a wrap. Only
`padding-bottom` was being reset. Measured over CDP at 390 px, before → after:
back-link `32 → 16`, ⋯ button `32 → 16`, against page content at `16`
throughout. The owner reported the left one; the right was the same fault and
went with it. `SHELL_VERSION` → `2026-08-09.1` (CSS is shell); data untouched.

**Home-screen filter split** recorded as Theme 15c. The merge is sound — same
job in two places — but the entry names what it costs: the bottom bar is
reachable at any scroll depth and `.list-toggles` is not, so the real decision
is how to keep thumb reach (sticky group, or a collapsing "Filters (2)" sheet),
not where to put the markup. Also flagged that `--bar-h` is referenced in six
places, so removing the bar re-anchors the FAB, back-to-top and order bar.

All gates green (`validate`, `check_no_deps`, `gen_sbom --check`, `node --test`
50 tests). ⏳ **Owner:** the back-link fix wants a glance on the phone — and
since it's a shell bump, foregrounding the PWA *won't* show it until the app is
killed, which is Theme 16 demonstrating itself.

