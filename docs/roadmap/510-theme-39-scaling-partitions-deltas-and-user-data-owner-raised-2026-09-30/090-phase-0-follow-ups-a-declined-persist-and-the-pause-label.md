- [x] **Phase 0 follow-ups: a declined storage request, and the pause label**
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

  ✅ **Shipped 2026-09-30 (`faves-0b` worker, branch `510-040-upgrade-chain`).**

  1. `storage-persist.js` records `faves.persist.asked.v1` (`{ at,
     homeScreen }`) BEFORE calling `persist()`, so a prompt dismissed by
     closing the tab counts too, and never asks again — with one exception:
     a browser asked from a tab is asked once more from the Home Screen,
     because installing can turn a no into a yes. The key is in the backup's
     `EXCLUDED` table, spared by a replace. Four tests; removing the check
     fails two.
  2. `sync.js` has a `PAUSED` state. The row reads "Paused — update Faves";
     the panel keeps the message, says a Refresh button appears when the
     update is ready, and offers "Turn off sync" but no Retry. A test pins
     the label and the view key against the error's; reverting to `ERROR`
     fails two.

  **Where the code differed from this item:** none; `persisted()` was the
  only guard, as cited.

  **Four costs, before → after:** *processing* one small read before the
  ask; *storage* +~50 bytes once asked; *network* and *server* none.
