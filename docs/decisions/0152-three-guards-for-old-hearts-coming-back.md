# 0152 — Three guards for old hearts coming back (510/320)

**Status:** accepted · **Date:** 2026-10-02 · roadmap `510/380`, `510/390`,
`510/400` (owner-ruled 2026-10-02, guards C, A and B of `510/320`)

## Context

On 2026-10-01 the owner's laptop showed four moved recipes hearted on both
their old and their moved ids, and three hearts removed days earlier back.
Every route that reproduces that shape needs an old list and a merge with no
last agreement (`docs/reviews/2026-10-01-1209-old-hearts-320-routes.md`), and
none matched his account. The owner ruled three guards and no more diagnostic
questions: a device log (C), no silent merge without a base (A), and hearts
that follow a moved recipe (B).

## Decision

1. **B — follow on read, never as a storage migration.** A heart, rating or
   note on an old id is rewritten to the moved id from the person's own
   cookbook (`movedFrom`), in memory, wherever a copy comes in: each store's
   read and write, a collect, and all three inputs of a sync merge. The stored
   string changes on the store's next write, as `renames.js` already does. A
   server copy still holding an old key is rewritten once.
2. **A — an unanswered question means nothing syncs.** The question lives in
   the device's sync config (one per device, every tab sees it). Until it is
   answered no cycle reads or sends anything. Neither answer is pre-selected.
3. **C — log what did something, not every sync.** A sync with a base that
   changed nothing here and sent nothing is not kept.

## Rejected

- **B as a step in the upgrade chain** (`user-schema.js`). It is the only
  sanctioned way to rewrite existing data in storage
  (`tests/storage-writers.test.js`), but a step means a `USER_SCHEMA` bump,
  which pauses every older tab and device on the new number (510/110) for a
  rewrite older builds can read anyway. **A one-off rewrite at page load**
  outside the chain was rejected for the same rule.
- **B from a list of moved ids in the app.** It would move a stranger's hearts
  on recipes they never moved; the person's own cookbook already says which.
- **A with a default answer for a dismissed panel.** "Keep what sync has"
  drops hearts the person may have just added; "add" is the silent merge the
  guard exists to stop. Waiting costs only time, and the Settings row says
  "Needs your answer".
- **A as a modal dialog.** Two tabs would each raise one; the existing
  allergen question already lives in the Sync panel, and the two now look and
  behave alike.
- **C logging every sync.** Every page load and foreground runs one: twenty
  entries would be under an hour of use, and each would cost a storage write
  that 510/190 removed from the no-op pull.
- **C in the sync config** (one write instead of two). It would put a log
  shown and copied on screen in the same object as the sync code.

## Consequences

- Each moved recipe can hold only one heart by any route; hearts removed and
  brought back by a base-less merge are A's to stop, and an Apply or a
  received shortlist still adds what the person chose to add.
- The 510/320 fuzz's "old beside moved" count is zero by construction; its
  positive control strips `movedFrom` to keep the shape reachable.
- A join holding hearts the server lacks now asks once, before anything moves.
- The log names pages, builds and heart ids, on the device only, never in a
  backup, spared by a Replace.
