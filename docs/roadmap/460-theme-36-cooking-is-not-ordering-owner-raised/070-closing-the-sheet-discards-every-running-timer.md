- [x] 🚩 **Closing the sheet discards every running timer and its bell**
      `[S][js][design]`
      ✅ **SHIPPED 2026-08-17 (`5468179`).** Persist, do not confirm — the item's
      own design call, followed. `cook.js` gains an injected store keyed by
      recipe id + step holding a wall clock; `createTimer` comes back already
      running.
      **Three calls the item did not cover, decided in the build and recorded:**
      - **Device-level, not per-profile.** A tick is what *you* put in the bowl;
        a timer is what the *oven* is doing. Switching profile mid-bake must not
        take the bell.
      - **A record more than an hour past due is dropped.** A bell that fell due
        while you took a phone call is still news; one from three days ago is a
        jump scare about a meal already eaten.
      - **The record is spent the moment it rings.** The first design kept a
        `rung` flag and that **broke four EXISTING alarm assertions** — a stored
        00:00 came back with its toggle *disabled*, so the next cook could not
        start the timer at all. Measured, then changed.
      `personal-data.js` excludes the new key from the backup and therefore from
      the sync blob: a wall clock restored onto another phone either says nothing
      or claims something is in an oven that is not.
      🛑 **Said in the file rather than implied: the bell CANNOT ring while the
      sheet is closed.** The one interval is cleared on close ([ADR 0034]'s leak
      class), a discarded tab has none, and no scheduled-notification API exists
      here. A due timer announces itself on the way back in — that is the whole
      promise, and it is smaller than "your timer keeps running".
      🔎 **A new unit test caught a real bug in the fix before it landed:**
      `Number(null) === 0` is finite, so the *no saved timer* path read as a
      timer that ended at the epoch — **every countdown in the app would have
      opened at 00:00.**
      Break-proven: making `saveTimer` a no-op fails exactly the 4 survival
      assertions; removing `timerStore.clear` from `ringFor` fails only the
      ring-once one; dropping the `notify &&` guard fails only the
      no-notification one. ⚠️ Two honest caveats carried up: assertions 1 and 2
      (close/reopen vs full reload) are **not independently isolable** — one
      mechanism at two depths — and a fourth probe could not be read because the
      browser wedged before reaching it (see `340/120`). 1117 unit tests;
      `SHELL_VERSION` → `.126`. Original filing follows — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). No warning, no persistence. Three
      routes lose a timer: closing the sheet, reloading, and iOS discarding the
      tab. 🔎 **The measurement that makes this urgent rather than tidy: 10 of
      24 recipes carry their timer on the LAST step**, whose primary button is
      *Done* — and Done closes the sheet. So the single most likely tap at the
      moment a timer matters is the one that destroys it.
      ⇒ Persist `endsAt` keyed by recipe id + step so a timer survives a
      reload, or confirm before a close that would discard one. The first is
      better: a confirmation asks the reader to think at exactly the moment
      they are holding a hot tray.

[ADR 0034]: ../../decisions/0034-cook-mode-overlay-and-wake-lock.md
