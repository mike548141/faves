- [x] **The decision records have drifted from the decisions** `[S][docs]`
      ✅ **SHIPPED 2026-08-17 (`52a204d`) — claim released.**
      🔎 **TWO OF THE FIVE SUPERSESSIONS THIS ITEM NAMES ARE NOT REAL**, and that
      is worth more than the tidy edits. Verified independently by the merging
      session, not on the builder's report: [ADR 0075]'s Status reads *"Supersedes
      **§3 only** of ADR 0037"* — not 0045, which it never mentions (grep: 0
      hits); [ADR 0074]'s reads *"Supersedes **decision 4's final clause only**
      of 0067"* — not 0017, which it never mentions either. The likely source of
      the first error: [ADR 0047] was briefly numbered 0045 before a same-day
      renumber. **The real pairs were marked instead** — forward pointers on 0037
      and 0067 — and 0069→0083, 0080→0085, 0068→0069 all held.
      🔑 **The generalisable lesson: a cold review's enumeration is evidence, not
      a work order.** A list of five reads as uniformly verified, so a reader
      spends their scepticism on whether to *do* the work rather than whether the
      work is real. Checking cost one `grep` and one read of each Status line.
      **Both stale figures were re-derived, not copied.** The per-session
      read-path cost measured by byte count over every file actually read:
      **~27k → ~53k** — and the growth is **NOT** mostly `ARCHITECTURE.md` as the
      review implies in isolation; both `CLAUDE.md` files and the memory index
      carry most of it. [ADR 0076]'s table re-measured by importing the real
      `quantity.js` against the real corpus: **157 / 42 / 5** at 2×, matching the
      claim, with the cause named — the `CONJOINED_QTY` guard shipped *after* the
      table was taken.
      `ARCHITECTURE.md` no longer documents a dated phone/address series:
      `validate.py` routes only `price` through `check_temporal()`, which was read
      rather than assumed. The `0079` allocator hole is documented beside the
      existing `0082` note. Every ADR edit **appends to the Status header only**
      — no accepted record's Context, Decision or Rejected section was touched.
      ⏳ **Two further REAL supersessions were found and deliberately left**, out
      of scope and still owed: **0017→0060** and **0043→0045**, each unmarked on
      the earlier record's side.
      Original filing follows —
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). **Five partial supersessions are unmarked**: 0069→0083,
      0080→0085, 0068→0069, 0045→0075, 0017→0074. A reader meeting the
      superseded record has nothing telling them to read on, which is the exact
      failure ADR 0047's own record already suffered once.
      **`0079` was never allocated or mentioned anywhere** — a hole in the
      allocator's sequence with no note saying why, the same shape as 0082's
      hole but undocumented.
      **Two figures are stale**: `MODEL-ECONOMICS.md`'s read-path ~27k is about
      **2× low**, and ADR 0076's table is now **157/42/5 at 2×**.
      **And `ARCHITECTURE.md` documents a phone/address dated series that
      `validate.py` refuses** — the compact current-truth describing a shape
      the gate rejects.

[ADR 0075]: ../../decisions/0075-currency-is-stated-once-where-it-is-asked.md
[ADR 0074]: ../../decisions/0074-a-backup-carries-only-what-it-can-put-back.md
[ADR 0047]: ../../decisions/0047-the-app-ships-only-what-it-renders.md
[ADR 0076]: ../../decisions/0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md
