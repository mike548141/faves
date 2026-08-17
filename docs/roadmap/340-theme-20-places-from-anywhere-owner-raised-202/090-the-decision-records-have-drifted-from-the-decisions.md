- [~] **The decision records have drifted from the decisions** `[S][docs]`
      **CLAIMED 2026-08-17 12:35 UTC (wt: record-drift-0817-1235)** —
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
