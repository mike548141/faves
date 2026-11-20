- [x] **28d — `available.note` is write-only** `[XS][js]` — ✅ **done
  2026-08-16** (`82ddb4b`), as part of 28f. `menu.js` now reads `available` off
  the resolved record — `resolveRecord` was already carrying it, so there was
  nothing to plumb — and renders the note under the heading. Verified live in
  headless Chrome at 390 px: The Borough's `Burger Wellington 2026` shows *"The
  Borough's entry in Wellington On a Plate's Burger Wellington."*
  Reassigned from `faves-inflight`, which had started it, because it is one
  `el()` call inside the section-heading block 28f rewrote whole and two
  sessions stacking two subtitles under one `<h2>` is worse than either alone.
  🚩 **The verification is deliberately NOT a committed test.** The corpus's
  only `available.note` has `to: "2026-08-23"`, so an assertion on it goes red
  on its own within a week and gets switched off — the failure mode
  `branch_check.mjs`'s header warns about. It was proved with a throwaway
  script instead. If a second venue ever carries a note with no end date, that
  is the one to write a real check against.
