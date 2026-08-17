- [ ] 🚩 **Closing the sheet discards every running timer and its bell**
      `[S][js][design]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). No warning, no persistence. Three
      routes lose a timer: closing the sheet, reloading, and iOS discarding the
      tab. 🔎 **The measurement that makes this urgent rather than tidy: 10 of
      24 recipes carry their timer on the LAST step**, whose primary button is
      *Done* — and Done closes the sheet. So the single most likely tap at the
      moment a timer matters is the one that destroys it.
      ⇒ Persist `endsAt` keyed by recipe id + step so a timer survives a
      reload, or confirm before a close that would discard one. The first is
      better: a confirmation asks the reader to think at exactly the moment
      they are holding a hot tray.
