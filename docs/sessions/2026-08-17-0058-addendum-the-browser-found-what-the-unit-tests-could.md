## 2026-08-17 00:58 UTC — addendum: the browser found what the unit tests could not

Closing note on the sync build. **Sync is live in production** — verified twice
over: two simulated devices against the **real deployed Worker** converge and
propagate a deletion, and the deployed site serves all six sync modules with the
Settings row present.

### 🔎 The bug that only a browser could find

`writeSnapshot` rewrote `localStorage`; the live `favourites`/`ratings`/
`settings` singletons hold their state **in memory**. So a synced heart was
correct on disk and **no open screen moved** until a reload. Sixteen engine unit
tests were green and blind — every one of them reads storage directly, which is
exactly the shape of the thing that was wrong.

`personal-io-ui.js` has called `reloadProfileStores()` after an import since
Theme 12b for precisely this reason. Sync never did. Fixed as an injected
`onApplied` hook so the engine stays free of the live stores, called **before**
the base is written so a repaint that throws cannot leave a base claiming an
agreement whose local half never landed.

🚩 **The generalisable bit:** unit tests that assert against the *store* cannot
see a stale *view*. Any feature that writes storage behind a live singleton
needs one assertion at the view, and this repo's browser checks are where that
lives. Three tests now pin it, including that a failed sync repaints nothing.

### ⚠️ The check is landed knowingly incomplete, and says so at the top

`tools/sync_check.mjs` passes every sync assertion — including the headline, *a
heart removed on A is removed on B rather than re-added* — and then **aborts**
before three more that are written and have never been observed. Its header
opens with that, because **a wall of PASS lines followed by "harness error"
reads exactly like a pass**, and this repo has been caught by tail-reading
before.

The trace points at a real hazard rather than a flaky check: `menu.js`'s
`reapply()` now fires on every device via the new `onApplied` hook and races the
UI — the scroll snapped back on its own, and the ⋯ button's handler reported
**two** open/close cycles from **one** click. Queued as its own item with the
evidence; owner is `overflow-ui.js`/`menu.js`, not the sync engine.

### Coordination artefact worth recording

🔎 **A subagent concluded a rival session had duplicated its work.** It had not —
it had written its files into the shared worktree, gone quiescent, and *I*
committed them; it then saw its own output land under a commit message it did
not write and reasoned, carefully and wrongly, that a parallel session had been
given the identical brief. Nothing was lost, but it nearly re-did the work.
**When an orchestrator commits an agent's output, the agent cannot tell that
from a collision** — say so in the brief, or the agent's own diligence becomes
the hazard.

### Left for the next session

- `sync_check.mjs`'s three unobserved assertions + the `reapply()` race.
- **Theme 36g**, handed over by a peer and owner-ruled: cooking ticks must leave
  the backup export (*"if it isn't restored, it shouldn't be exported"*). The
  fix is `EXCLUDED` in `personal-data.js`, not an ad-hoc skip, and it wants a
  test proved by breaking it. Deliberately **not** taken here — the export path
  is the wrong place for a hurried edit at close.

