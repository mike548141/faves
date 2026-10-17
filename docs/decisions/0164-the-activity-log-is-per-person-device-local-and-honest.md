# 0164 — The activity log is per person, device-local, capped, and honest

**Status:** accepted
**Date:** 2026-10-18
**Applies** the owner's 2026-08-16 ruling *"Activity history: honest log, no
escape hatch. Nothing can be erased short of wiping the whole log — removals
appear as removals, and there is no per-entry 'forget this'"* (roadmap
`430-*/README.md`) to roadmap `32a` (the recorder) and `32d` (export and wipe),
built as one change. **Follows** the shape of
[0154](0154-saved-orders-store-ids-not-names-and-stay-off-sync.md) for a
store that travels in the backup and not in sync.

## Context

An activity log is the most sensitive thing Faves would store: favourites and
ratings are current state, a log is behaviour (what you liked and then unliked,
and when). Theme 32's README names three consequences that are not optional —
per person and device-local, in the export and the wipe, and a stated answer to
the deletion paradox. The owner ruled the third; this record fixes the rest.

## Decision

1. **Per person, on this device, never sent.** `faves.activity.v1` is read through
   `profileScopedStorage()`, so a shared phone does not show one person's evening
   to another. It is **outside `SCOPED_BASE_KEYS`** (that list is what makes a
   store migrate and sync) and **not in the sync snapshot**: `collectPersonalData`
   adds it to the file the person asks for **only** with `{ localOnly: true }`,
   which sync never passes. Two tests hold that: one fails if `sync.js` names the
   option or the store, one that the default collect carries no log.
2. **An honest log.** Nothing is erased short of wiping the whole log: the module
   exposes `record` and `clear` and no per-entry delete, and entries are frozen,
   so a removal is recorded as a removal and the add stays above it.
3. **A ring buffer, capped at 500.** `ACTIVITY_CAP` is a constant the screen (32b)
   states ("the last 500"); the oldest entry is evicted on the 501st. 500 is the
   item's starting guess, and measured it is ~160 bytes an entry, ~80 KB at the
   cap per person — small beside localStorage's few megabytes, but it is a whole
   value rewritten on every event, so the cap is also what bounds that write.
4. **The label is snapshotted at write time**, with the venue id and dish id kept
   for navigation (0051). A dish can leave a menu; the sentence must still read.
5. **`settings.change` logs the dial, never the value.** A flagged allergen is a
   health fact about a named person, the one class this repo never stores. The rule
   is enforced in the recorder, not trusted to callers: for that kind the entry
   keeps only a `label` that is one of eight named dials (`SETTINGS_DIALS`),
   and `from`, `to`, `venue` and `dish` are discarded — on write, on read and on
   import. `picksClosed` (a remembered ✕ on a hint) is not a dial and is not
   logged. `reset.performed` names its scope from a closed list the same way.
6. **The log never goes first and never throws.** Each store records after its own
   real write, inside a `try`, and `record` swallows everything: a full, blocked
   or stale-tab storage cannot stop a favourite saving. Stores take the recorder
   as an option, so only the singletons record — an import, a sync write-back and
   the shopping list (which shares `createOrder`) record nothing.
7. **What is wired.** `favourite.add/remove` (toggle, a forgotten row, a received
   shortlist), `rating.set/clear` (a value that clamps to 0 is a clear),
   `order.add/remove/clear` (from/to are the line's quantity; a step down is a
   remove, a received or recalled order adds per line), `profile.switch` (recorded
   in the log of the profile chosen), `settings.change`, and `reset.performed`.
   Not wired: `report.sent` (report.js has its own path), the system kinds
   (`data.updated`, `app.updated`, `cache.refreshed` — 32c, in the vocabulary so a
   reader of the store already knows them), and the order line's note, finish and
   move edits.
8. **In the backup as a named per-person field**, never the `other` bag; an
   import **merges** (the union, in time order, de-duplicated, newest 500 kept —
   nothing "wins", an entry is a fact that happened) and a replace restores.
   `STORE_SCHEMA.activity` is 1, so a newer shape pauses an older build.
9. **Wiped with the person, and by a replace.** Profile removal (by hand and by
   sync pull) goes through `PURGED_BASE_KEYS`, and a replace import removes every
   `faves.` key bar the spared ones — the log is not spared.

## Rejected

- **Per-entry "forget this" (the README's recommendation).** Declined by the owner.
  Simpler as a result: no tombstones, no edit path to defend.
- **Removing the thing removes its trail.** The log would lie about what happened;
  it is exactly what a history is for.
- **Log the settings value, "it is only a diff".** The one class the repo never
  stores, and a log is read by more code than the setting is.
- **Sync it ("26b-style, for free").** A behaviour record on every paired device is
  a decision for its own item; and an older build's sync cannot erase a key it
  does not name.
- **Unbounded growth.** The failure mode is favourites ceasing to save.
- **Make Reset to defaults clear it.** That Reset is *one person's preferences*, and
  the owner has ruled that widening what it destroys is his call
  (`settings-ui.js`; roadmap 430's "two gated controls"). See Consequences.

## Consequences

The log is empty on first run and nothing before this release was recorded, so the
screen (32b) must say when it started; the store keeps no "started on" date (the
oldest entry is evicted), so 32b has to add one if it wants one. **Today's "Reset to
defaults" does not clear the log**, and records itself as `reset.performed`. The
owner's ruled "Delete everything" control (roadmap 430) is not built; when it is, it
must remove every person's log (`PURGED_BASE_KEYS` names the key; `clear()` empties
the active person's and is tested), and its confirmation must name the log.
A replace import destroys the logs on the device before restoring the file's, as it
does every other store.
