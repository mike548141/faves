# 0073 — A backup carries only what it can put back

**Status:** Accepted. Supersedes **decision 4's final clause only** of
[0067](0067-a-tick-is-keyed-on-the-line-not-its-place.md); the rest of that
record, and its other six decisions, stand untouched.

**Date:** 2026-08-16

## Context

The owner ruled it in one line on 2026-08-16: *"if it isn't restored, it
shouldn't be exported."* This record exists because acting on that ruling
falsified a sentence in an accepted ADR, and because the mechanism underneath it
was not what anybody had written down — including this session's own brief.

**What [ADR 0067] decision 4 says, and why it was reasonable.** The cook-mode
checklist is per-profile but deliberately absent from `SCOPED_BASE_KEYS`, the
named list `personal-data.js` exports, imports and purges. The reasoning was
sound: twelve-hour cooking progress is not part of a personal record, and adding
a `checklist` field to every backup that the import path then ignored is *"an
asymmetry dearer than the thing it carried"*. It then closes with a safety net:

> `collectPersonalData`'s catch-all still carries the raw key through a backup,
> so nothing is silently lost.

**That clause is false, and it was never true.** Three things were measured:

1. **The catch-all did carry the tick out.** `collectPersonalData()` sweeps every
   remaining `faves.` key into `data.other` verbatim, precisely so a new store
   does not need this file updated in lockstep. It picked the ticks up.
2. **But the round trip does not restore them usefully.** `parsePersonalData`
   keeps the scoped key in `other` — observed directly as
   `['faves.p.default.checklist.v1', …]` — and `applyPersonalData` writes every
   `other` entry back. So a tick *was* written back: under the **exporting**
   device's profile id, which the import path may have re-minted, and with a
   twelve-hour expiry that voids it by the next day. Restoring it is a no-op at
   best; at worst it hands a profile that merely shares an id somebody else's
   half-cooked recipe.
3. **And they were leaving the phone.** `sync.js` also calls
   `collectPersonalData`, while `sync-merge.js` never reads `other` — so ticks
   were being encrypted and shipped between devices in order to be discarded at
   the far end.

🔎 **The roadmap's own diagnosis was also wrong, in the opposite direction.** It
said ticks are *"never restored by import"*. They were restored — badly. The
owner's ruling lands either way, but the mechanism is *"restored uselessly, or
onto the wrong person"*, not *"silently dropped"*.

🛑 **A second trap, found only because a test was written first.** `EXCLUDED` is
a flat map matched with `key in EXCLUDED`. The checklist's key in storage is
never its base key: `profileScopedStorage()` rewrites `faves.checklist.v1` into
`faves.p.<id>.checklist.v1`, one per profile. So adding the base key to
`EXCLUDED` — the fix the roadmap specified, in as many words — would have
excluded **nothing at all, while looking exactly right**. Three of the four new
tests fail against that version.

## Decision

**1. The rule: a backup carries only what the import path can put back
usefully.** Not "everything we hold", which is what the catch-all optimises for.
A store that cannot be restored onto the right person, at a time when it still
means anything, has no business in the file.

**2. The checklist joins `EXCLUDED`, which *declares* the omission.** The same
mechanism that keeps the Near-me origin out. The exported file names both stores
and says why, in plain language, because a backup that silently omitted
something would be the dishonest kind of quiet. Exclusion is not deletion by
stealth; it is deletion announced.

**3. Exclusion is matched on the store, not on a literal key.** `excludedEntry()`
matches an exact key *or* any `faves.p.<id>.` suffix match, so it covers every
profile — **including one whose id has left the registry**, because the sweep
enumerates real storage rather than the roll of profiles, and an orphaned key is
exactly what a registry-driven loop would miss. Suffix rather than parsing out
`faves.p.<id>.`, because an imported profile id is untrusted text that may itself
contain dots.

**4. Excluded-from-backup is not exempt-from-deletion, and the two are named
separately.** `EXCLUDED` entries carry a `spare` flag. The origin is spared by a
`replace` import (sessionStorage, never ours to delete); the checklist is
**not** — "make this device look like the file" cannot also mean "and keep the
previous occupant's half-cooked recipe", especially as a restored profile often
takes the id `default` again.

**5. All three use sites move together.** The catch-all sweep, the
`parsePersonalData` re-import filter (so an *old* backup's ticks do not come
back), and the `replace` wipe. A partial conversion would leave the exclusion
true in one direction only.

## Consequences

- **Ticks no longer leave the device at all** — not in a backup, not in the sync
  blob. That is a reduction in what Faves transmits, which is the right
  direction for a store nobody could use at the far end.
- **[ADR 0067] decision 4's conclusion survives; only its justification changes.**
  The checklist still belongs out of `SCOPED_BASE_KEYS`. What it may no longer
  claim is that the catch-all makes that free.
- **`personal-data.js` now imports `CHECKLIST_KEY` from `checklist.js`** rather
  than duplicating the string. ⚠️ With no bundler, that executes `checklist.js`'s
  module body on every page importing `personal-data.js`. `checklist.js` is
  already in the SHELL precache so there is no new asset, and `recipe.js` already
  imports the same constant — but it is a real import-graph edge and
  `boot_check.mjs` is what would catch it going wrong.
- **The exported `excluded` block keeps its flat `{key: sentence}` shape**, so
  the user-facing JSON is unchanged and carries no profile ids.

🔑 **Worth keeping as method, and it is the general lesson rather than this
item's detail.** The roadmap's diagnosis was careful, was written by someone who
had read the code, was explicitly presented as having been *"wrong twice"*
already — and was still wrong a third time, in the specific direction that a
correct-looking fix would have shipped a no-op. What caught it was writing the
test before the fix and watching it fail. **A fix that cannot be seen failing
first is a fix nobody has evidence for**, and this repo's recurring
decorative-guard fault is the same shape one level down: the flat exclusion
would have been a guard that could never fire, sitting in the file that exists
to declare guards.

## Rejected

- **Add `faves.checklist.v1` to `EXCLUDED` and stop**, which is what the roadmap
  specified. Rejected on measurement: it matches no real storage key and excludes
  nothing, while reading as a complete fix.
- **Put the checklist into `SCOPED_BASE_KEYS` so the named path handles it.**
  That is [ADR 0067] decision 4 reversed, and it re-creates the asymmetry that
  record rejected — a `checklist` field in every backup that the import ignores.
  The owner's ruling points the other way: stop exporting it, do not start
  restoring it.
- **Drop the catch-all sweep entirely.** It earns its place: it is why *"everything
  you put in"* stays true without this file being updated in lockstep with every
  new store. The defect was an unbounded sweep with no way to declare an
  exception, not the sweep itself.
- **Spare the checklist from the `replace` wipe, for symmetry with the origin.**
  Considered and rejected: the two are excluded for different reasons. The origin
  is someone else's data in someone else's store; a tick is ours, in our store,
  and a device being made to match a file should not keep it.
- **A per-profile `EXCLUDED` built from the registry.** Rejected because the
  sweep reads storage, not the registry, so an orphaned key — the case most
  likely to carry a stranger's ticks — is precisely the one it would miss.

[ADR 0067]: 0067-a-tick-is-keyed-on-the-line-not-its-place.md
