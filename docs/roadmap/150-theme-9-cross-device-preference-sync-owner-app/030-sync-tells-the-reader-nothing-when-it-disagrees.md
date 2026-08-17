- [ ] **Sync resolves conflicts and tells the reader nothing** `[M][js]` —
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), four findings that share a shape:
      the error view offers no way to **turn sync off**; **rating and setting
      conflicts, and profile-identity mismatches, are reported by the merge and
      surfaced nowhere**; an **older app version drops unknown allergen keys**
      and the deletion rule then un-flags them on the newer device — a silent
      *loss of an allergen flag*, which is the highest-consequence direction
      this bug could run; and the Worker's comment claims **128-bit `blobId`
      entropy when it is 65** — [ADR 0061](../../decisions/0061-the-sync-code-is-split-into-a-name-and-a-key.md)
      leans on that number, so the record overstates the guarantee.
      🔑 Also: ADR 0060's *"provisional union"* describes a value **nothing
      renders**; the copy was made true and the ADR was not.
