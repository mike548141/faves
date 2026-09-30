- [~] **Phase 0 follow-ups: a declined storage request, and the pause label**
      `[S] [sync][pwa]` — found 2026-09-30 (session `faves-0b`) reviewing
      `010`'s hand-back (PR #54).

  1. **A declined persistence request is asked again on every page load.**
     `storage-persist.js` skips the ask only when `persisted()` is already
     true. Where the browser prompts (Firefox), someone who said no is asked
     again after the next write on every visit. Fix: remember that the ask
     was made, in a key the backup already excludes or excluded on purpose.
  2. **The "Update Faves" pause reuses the error state**, so the Settings row
     reads "Couldn't sync — tap to retry" while the panel says to update.
     Tapping retry cannot help. Fix: its own state and row label.

  📌 **Claimed 2026-09-30 (`faves-0b`)** — with `040`, same worktree.
