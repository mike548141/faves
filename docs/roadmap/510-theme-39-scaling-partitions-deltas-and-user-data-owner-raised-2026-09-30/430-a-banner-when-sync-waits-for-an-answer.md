- [~] **A banner outside Settings while sync waits for an answer** `[S]
      [sync][ui]` — owner-ruled 2026-10-02 (session `faves-4f`), follow-on to
      `390`.

  Since `390`, sync pauses entirely when it would merge without a base and
  asks "keep what sync has" or "add this device's extras"; the only sign is
  the Settings row "Needs your answer". The owner ruled a banner on every
  screen until it is answered, so a paused sync cannot sit unnoticed while
  devices drift. It must link straight to the question, meet the house
  accessibility bar, and disappear in every tab once answered (the question
  is stored once in `faves.sync.v1.ask`). Extend `sync_check`'s `390` block.

  📌 **Claimed 2026-10-02 04:12 UTC (`faves-77`): the banner (worker in a
  worktree).**
