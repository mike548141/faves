- [ ] ⏳ **Move all user data to IndexedDB, in one go, when it pays** `[L]
      [data]` — owner-ruled 2026-09-30 "Defer the move" ([ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md)). **Triggered by**
      recipe photos arriving, or by measured storage use passing a threshold
      `040` sets; not before.

  Moves **every** user store at once (the owner's "never split" intent),
  including `faves.geo`, `faves.origin`, `faves.sync*` and `faves.personal`.
  It must:
  - close the connection on `versionchange` from the **first** build that opens
    the database, or a later upgrade stalls while an old tab is open;
  - replace the `storage` event, which seven modules use for cross-tab
    repaint;
  - never lose a write the page made before it was killed, above all an
    allergen flag, whether the stores go async or keep a memory mirror;
  - measure all four costs before and after (ADR 0145's addendum).
