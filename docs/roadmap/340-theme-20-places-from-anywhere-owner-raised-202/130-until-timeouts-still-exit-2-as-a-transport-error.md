- [ ] 🚩 **`until()` timeouts still exit 2, so a deleted element a check WAITS
      for still reads as a transport flake** `[S][tools]` — the half `070` did
      not close, filed separately 2026-08-19 rather than left inside a closed
      item.

  `need()` fixed **dereferences**: a check that reaches for a missing element
  now fails by name at exit 1. A check that **waits** for one is untouched —
  `boot_check`'s `until(… "#about-btn" …)` throws `timed out waiting for
  <label>`, which becomes an unhandled rejection and **exit 2**. Exit 2 is this
  repo's code for *"the browser stopped answering; nothing here says anything
  about the site"*, and CLAUDE.md tells readers to believe the exit code over
  the message. So deleting an element a check waits on still produces a site
  regression wearing a transport flake's clothes.

  🎯 **The judgement is real and was deliberately not taken by the finder.**
  Options, with what each costs:
  1. **Classify `until` timeouts as assertion failures (exit 1).** Simplest —
     but a genuinely slow machine then reads as a regression, which is the
     loaded-laptop problem inverted. This repo has measured that problem: 2 of
     4 and 4 of 8 runs failing on a five-session laptop.
  2. **Split `until` into `untilPresent` (a claim about the SITE, exit 1) and
     `untilSettled` (a claim about TIMING, exit 2).** Says what each wait is
     for, at the cost of touching every call site once.
  3. **Leave it and document it**, on the grounds that exit 2 is conservative.

  🔑 **Why option 2 looks right and is still not a decision:** every `until`
  already knows which kind it is — the author knew when they wrote it — and the
  present encoding throws that knowledge away. But it is a rename across 13
  tools during a period when several sessions run in parallel, so the cost is
  coordination, not code.
