- [ ] 🚩 **CI runs NONE of the browser checks** `[M][docs]` — found 2026-08-16
      while closing the item above, and it is the reason that one could sit dead
      through a whole settings refactor. `.github/workflows/ci.yml` runs
      `node --test` and the Python gates. It does **not** run `sync_check`,
      `cook_check`, `device_check`, `boot_check`, `addon_check`, `branch_check`,
      `to_top_check` or `filter_row_check` — **eight** browser guards, every one
      of them written *because* unit tests had already missed something real (a
      leaked wake lock, a silent `init()` throw, a mistapped price, an unsafe
      add-on). They run only when a person or an agent types them from
      CLAUDE.md's list.
      🔑 **The asymmetry is the point:** the cheap guards that catch the least
      are automated, and the expensive guards that catch the most are on the
      honour system. So "CI is green" is not evidence about anything on that
      list, and the checks most likely to be skipped under time pressure are
      exactly the ones nothing else covers.
      🤔 **Not obviously a "wire them into CI" job, which is why this is an item
      and not a fix.** They need headless Chrome, a throwaway profile and a live
      server; `sync_check` drives **two** browsers and takes minutes; several are
      timing-sensitive, and a flaky required check trains people to re-run until
      green, which is worse than no check. Options worth costing before choosing:
      a nightly/pre-deploy job rather than per-push; a fast subset
      (`boot_check` alone is seconds and catches the worst class); or leaving
      them manual and making the *list* impossible to skip. ⚑ Owner's call on
      whether CI minutes get spent here.
      ✅ **RULED 2026-08-16: the FAST SUBSET, per push. `[S][tools]` — DONE
      2026-08-17 (`344adfb`), claim discharged.** Wire **`boot_check.mjs` into
      `.github/workflows/ci.yml` on every push**; the other seven stay manual on
      CLAUDE.md's list. The full-CI and nightly options were both put to him with
      their costs and both declined.
      🔑 **Why this is the right subset and not a compromise:** `boot_check` runs
      in seconds, needs no timing assumptions, and catches the single worst class
      — *a screen whose JavaScript does not run at all*. That is the exact failure
      it was written for (2026-08-16: `app.js` threw on a missing import, the home
      screen silently served its no-JS fallback, and **570 unit tests,
      `device_check` 19/19 and `cook_check` 36/36 were all green**).
      🛑 **And it is the one that is safe to make REQUIRED**, which is the whole
      point: `cook_check` is measurably contention-flaky (see the item above) and
      `sync_check` drives two browsers for minutes. A flaky required check trains
      everyone to hit re-run, which is worse than no check. Do **not** quietly
      add the others later without re-testing that assumption.
      ⚠️ **This does not close the item.** Seven guards remain on the honour
      system, so *"CI is green"* still is not evidence about most browser
      behaviour. Keep the 🛑 note in CLAUDE.md's verify list saying so.
