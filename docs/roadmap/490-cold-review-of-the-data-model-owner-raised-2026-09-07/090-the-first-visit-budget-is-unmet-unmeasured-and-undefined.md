- [x] 🎯 **The first-visit budget is unmet, unmeasured and undefined**
      `[S][perf][ci]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §2, §7 D4). Owner's
      number; a recommendation that whichever number he picks gets a check.

  ✅ **OWNER RULED 2026-09-08 — OPTION 3, DROP THE NUMBER.** He declined both
  the restated budget (option 1) and the shell cut (option 2). ADR 0047's
  discipline — name the screen that renders it — stays and is what actually
  governs payload growth.
  🚩 **The consequence, stated so nobody re-derives it as a defect later:**
  there is now **no ceiling on first-visit transfer**, deliberately. The
  measured position at the time of the ruling was ~380 KB to paint the home
  screen and ~660 KB precached, against a bar of 300 KB that nothing had ever
  measured. So the number was not being met and was not being watched; dropping
  it removes a claim the repo could not support rather than removing a
  guarantee it was keeping.
  ✅ **DELIVERED 2026-09-08 (session faves-o1).** CLAUDE.md's *Quality bar*
  now states the absence and why, names the ruling and its date, quotes the
  line it replaced, and tells a future session **not to reinstate a number
  without asking him** — because the failure mode here is not that the bar is
  missing, it is that a well-meaning session re-adds an unmeasured one.
  `docs/WORKPLAN.md:133` is closed with a dated withdrawal note; its
  2026-07-08 measurement and the owner's real-device pass are kept, because
  those are evidence and only the *budget* was withdrawn.
  🔎 Verified: `grep -n "300 KB" CLAUDE.md docs/WORKPLAN.md docs/STRATEGY.md`
  now returns only the two lines that quote the withdrawn wording in order to
  say it is withdrawn.


  **The bar.** CLAUDE.md: *"Total transfer for first visit < 300 KB (excluding
  photos, which lazy-load)."* `WORKPLAN.md` carries it as `[~]`. No tool measures
  it. The last recorded figure was ADR 0047's on 2026-08-16: venue files 56 KB
  gzipped.

  **Measured at `de6d2b7`** (gzip; the import graph is static — no dynamic
  `import()` exists under `site/js`):

  | What | gzip |
  |---|---|
  | Home screen JS, static graph (72 of 85 modules) | **315 KB** |
  | Menu page JS graph (78 modules) | 366 KB |
  | All 85 modules, as precached | 416 KB |
  | `app.css` + three shells | 66 KB |
  | Venue payload, 57 files | **178 KB** (1.26 MB raw) |
  | Precache total, first visit | ≈ 660 KB |

  The payload has grown seven-fold in raw bytes since 2026-07-15 (154 KB → 1,261
  KB) and the shell is still more than twice the data. 🔑 So ADR 0047's discipline
  is right and is not where the bytes are; and the budget does not say whether it
  means the page's first paint (~380 KB) or the precache (~660 KB), which differ
  by a factor of two.

  📋 **Options.**
  1. **Restate it as what it can mean and measure it in CI** — home first paint,
     JS + CSS + HTML, a number he chooses — with a check that fails when a commit
     crosses it, in the shape of `check_versions.py`.
  2. **Keep 300 KB and cut the shell.** 72 modules on the home screen's static
     graph is the lever; dynamic `import()` is inside the zero-build rule; the
     menu-only and recipe-only modules are candidates.
  3. **Drop the number** and keep ADR 0047's discipline, which is working.

  🎯 No recommendation on the number. The recommendation is that it gets a check,
  because a quality bar nothing measures is the decorative-guard class ADR 0072
  names, and this one went unmeasured while the thing it bounds grew seven-fold.
