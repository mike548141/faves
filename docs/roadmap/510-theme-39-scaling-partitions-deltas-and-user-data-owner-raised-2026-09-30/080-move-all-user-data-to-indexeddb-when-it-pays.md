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

  📏 **The threshold, set by `040` on 2026-09-30: 1,000,000.** Measured as
  `userStorageSize` (`site/js/user-schema.js`): UTF-16 code units in every
  `faves.` key and value; the constant is `STORAGE_THRESHOLD`.
  - **Why that number.** Browsers give a site about 5 MB of local storage; the
    strictest reading counts it in UTF-16 bytes, 2.5 million units (assumed
    from browser documentation, not measured here). An upgrade holds a second
    copy of everything until the new version has run, measured at 2.1× the
    data. So the data must stay under about 1.2 million; 1,000,000 leaves 20%
    for the write that is happening when it fills.
  - **What that is in use.** Measured on synthetic devices: the fixture
    device (2 people, a few hearts, sync on) holds 1,841; a heavy one (3
    people × 200 hearts, 300 ratings, 50 notes, sync on) 286,885. A personal
    recipe of about 1,650 B costs about 3,300 with sync on (it is in the sync
    base too), so the threshold is roughly 200–300 personal recipes.
  - **How to read it on a real device** (nothing reports it; no telemetry is
    built): in the browser console on the Faves page,
    `Object.keys(localStorage).filter(k => k.startsWith("faves.")).reduce((n,
    k) => n + k.length + localStorage.getItem(k).length, 0)`.
  - 🚩 **Sync binds first.** The Worker caps a sync copy at 256 KiB
    (`worker/sync-worker.js`). The heavy device's copy is already about half
    that before encryption, so recipes in the core copy would hit the cap
    long before this threshold. `050`'s recipe buckets are what prevent that.
