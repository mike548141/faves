# 0167 — "Delete everything" is an epoch the whole sync group honours

**Status**: accepted • **Date**: 2026-10-18 • **Roadmap**: `180/010`

## Context

The owner ruled on 2026-08-16 (roadmap 430) that Reset becomes **two gated
controls**: *Reset preferences* keeps today's narrow scope, and *Delete
everything* wipes all profiles, favourites, ratings and the order tally behind
its **own typed confirmation with different wording**, so the two cannot be
confused. He also ruled that once sync exists a reset propagates to every device
— *"everywhere, always"* — and, after ADR 0060's last consequence showed an
end-to-end blob cannot count devices, that the confirmation **names the scope
(every device signed in with this sync code) and never a number**.

Sync has existed since Theme 9 v2 and the second control was never built: no item
carried it. ADR 0164 (the activity log) and ADR 0154 (saved orders) each said it
must take their stores and the confirmation must name them.

Two facts make this harder than "call `removeItem` on a list":

1. **A three-way merge cannot carry a deletion of everything.** ADR 0060's merge
   reads an entry missing on one side as a *deletion* only when the last agreed
   snapshot (the base) held it. A device that wipes locally and syncs would
   delete what was in the base — but what the *other* device added since the last
   agreement is an addition against that base, and merges straight back, and is
   sent on to the device that deleted. A deletion the next pull can undo is not
   one.
2. **Four stores never enter the snapshot.** Saved orders (ADR 0154), the
   activity log (ADR 0164), the order tally and shopping list, and cook ticks are
   device-local by design. A merge has nothing to say about them, so "everywhere"
   cannot be a property of the merged data.

## Decision

1. **A second control, "Delete everything"**, beside *Reset preferences* (the
   old *Reset to defaults*, renamed to the ruling's own words; its scope is
   unchanged). It has its own typed phrase — **`delete everything`** — against
   Reset's **`I agree`**. One mechanism (`typedGate` in `settings-ui.js`:
   disabled button, case-insensitive, Enter submits, `aria-invalid`), two
   instances; what is typed for one arms nothing on the other.
2. **What it deletes** (`eraseEverything` in `personal-data.js`): every `faves.`
   key in localStorage **except a four-key keep-list**, and the Near-me origin in
   sessionStorage. Deletion is the *default*; a key is kept only by being named in
   `ERASE_KEEPS`. The four are facts about the device or browser, not anything a
   person put in: the **sync pairing** (the code is how the deletion reaches the
   other devices, and deleting data must not silently sign a device out), the
   **storage-layout stamp**, the **"already asked to keep the data"** flag and the
   **location-ask promise**. The profiles themselves go too (the device returns
   to a single empty "Me"), as do the sync base (a full second copy of the data),
   the sync log (it names hearts) and the pre-upgrade snapshot (a whole copy).
   The pairing is kept *without* the open "add these hearts?" question, whose
   sample names hearts.
3. **The guard against the store added later** is `tests/erase.test.js`: every
   `faves.` literal in `site/js` is classified `wiped` / `kept` / `session` /
   `label` in one table, the test fails on a literal that is not in it (or on a
   classified one that has gone), and a behavioural test seeds every wiped key for
   three people — one in no registry — and requires that exactly the keep-list
   survives. The wipe fails safe (an unclassified key is deleted); the table is
   what forces the *decision* for a key that should stay. A second test reads
   `live-stores.js` against the singletons the app builds: a store wiped on disk
   but not re-pointed in memory writes its old contents straight back at the next
   tap.
4. **Propagation is an epoch, not a merge.** The deleting device records a marker
   `{ id, at }` in its sync config **before** it erases (one synchronous run), and
   `sync.eraseEverywhere()` then runs a cycle at once. The marker rides in the
   snapshot (`wipe`) and so in the base, which is how a device knows which
   deletion it last honoured. `resolveWipe(base, mine, theirs)` (pure, in
   `sync-merge.js`) decides each cycle:
   - **mine wins** — this device's marker is not the server's: what the server
     holds is *void*. Its snapshot is taken as empty, its recipe buckets are
     overwritten, and the merge is run against nothing. A heart made here *after*
     the deletion survives; the other device's older ones do not.
   - **theirs wins** — the server carries a marker newer than the base's: what
     this device holds is *void*. It erases everything but the pairing (the same
     `eraseEverything`, so the four never-synced stores go too), writes the
     server's copy in, and re-points the live stores.
   - **neither** — equal markers (already honoured by both) or none: the ordinary
     three-way merge.
   Two deletions at once: the later id wins on both ends, so they converge. A
   deletion is **always sent**, even when the synced snapshot is already identical
   to the server's, because the markers are the only thing that empties the
   never-synced stores elsewhere.
5. **A deletion made offline waits.** The marker stays in the sync config until a
   cycle agrees; `holdsUnsent`, the `online` listener and the next foreground send
   it. The confirmation's result line says only what is true: *sent* (the server
   accepted it) or *will be sent*; "every other device empties itself the next time
   it syncs" is as far as it claims, since this device cannot see the others.
6. **The confirmation** names every store (including the activity history and
   saved orders, as ADRs 0154/0164 asked), says *all N profiles* by name, and when
   paired says it also erases everything *on every device signed in with this sync
   code* — **no device count**. Unpaired, it says there is no other copy. It
   points at *Download my data* first.

## Rejected

- **Make the local wipe an ordinary edit and let the merge carry it.** Tried in
  thought first: it propagates what was in the base and resurrects what was not,
  and cannot reach the four never-synced stores. The failure is silent — the
  deleting device is empty and every other device is not.
- **A roster of devices so a deletion can wait for each.** ADR 0060 / the owner
  already rejected the roster (an upper bound, not a count).
- **A "tombstone" per entry.** The ruling for the activity log forbids per-entry
  tombstones, and per-entry deletion markers would not reach the stores that do
  not sync anyway. The deletion is one marker for the whole layer.
- **Reuse a replace-import (`applyPersonalData(..., "replace")`) with an empty
  file.** It spares the sync log, the pre-upgrade snapshot and the Near-me origin
  (right for a restore, wrong for a deletion) and writes a registry; it also has
  no answer for the other devices.
- **Honour a marker on a device with no base.** A device joining a group has no
  history to be older than a deletion, and wiping it on arrival would destroy a
  new device's own data; it is asked instead (roadmap 510/390), as before.
- **Bump a store number so older builds pause on a marker.** `STORE_SCHEMA.profiles`
  would then be stamped on *every* blob and pause every older build whether or
  not anyone ever deleted anything. See the first consequence.

## Consequences

- **A build from before this change ignores the marker.** It carries the `wipe`
  field through (ADR 0146 §3) and merges as it always did, so against a deletion it
  empties what the base held but keeps what *it* added since — and on its next
  cycle writes that back. Closed by updating (the service worker does this on the
  next visit); not closed by a schema pause, for the reason above. A deletion
  reaches every device on the build that has this ADR.
- **A device with an open "add these hearts?" question does not honour a deletion
  until it is answered** — `syncNow` stops before the network while that question
  is open (510/390), and a device with no base does not honour one in any case.
  The cost is a delay, never a resurrection: nothing it holds is sent in between.
- **The sync log records that a deletion happened and never which hearts went**
  (`entry.wipe`, no `sent`/`here` lists), since those lists are the deleted data.
- **`tests/old-hearts-320.test.js` lists every remover of the sync base.**
  `eraseEverything` removes it by enumeration, which that scan cannot see; the
  test's comment now says so and where the removal is held. The cycle after a
  deletion reads no base (`resolveWipe` voids the side it outranks).
- **Reset preferences still propagates as an ordinary settings change.** Making
  it a "reset" event is not part of this ruling's second control and was not
  built.
- The activity log is **not** told "you deleted everything": the log is one of the
  things deleted, and a log of one entry saying so would be the only trace left.
- Sync state keeps `wipe` (pending, on the deleting device) and `wiped` (the last
  deletion this device went through, for the panel); neither is data.
