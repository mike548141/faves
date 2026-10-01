# 0154 — Saved orders store ids, are per person, and stay off sync

**Status:** accepted
**Date:** 2026-10-02

## Context

Theme 26a (owner-raised 2026-08-16: *"saving an order for Subway that I use
each time"*) is a named order for one venue, recalled into the tally in one tap.
Three choices were open, each with a plausible alternative a later session might
re-propose. 26b (across devices) and 26c (the menu moving under a saved order)
are separate items; this record is what 26a decided so that neither needs a
migration.

## Decision

1. **A saved line references the menu by id and snapshots the rest.** It keeps
   the dish id and each add-on option's `{group, id}` — the identities the order
   line already keys on (ADR 0051, 0126) — plus the note (the reader's own text),
   and, as a *snapshot only*, the name and configured unit price. Recall resolves
   the ids in the venue's live record (`findDish`, `optionId`) and builds the
   tally line from what it finds, so name, option prices and unit price are
   today's. A line whose dish or any option no longer resolves, or whose
   selection the group's cap now refuses, is skipped and named; it is never
   added minus the missing option.
2. **Per person.** It reads through `profileScopedStorage()`, like favourites
   and notes: a usual is somebody's, and a profile's allergen flags are what the
   dish rows' warnings speak to once it is recalled.
3. **On this device only: outside `SCOPED_BASE_KEYS`, and not in the sync
   snapshot.** That list is what makes a store migrate, sync and travel; the
   brief for 26a is "never leaves the device". Sync's `writeSnapshot` writes four
   named keys and touches no others, so a build that does not know the store
   cannot erase it. `collectPersonalData` adds the store to the file the person
   asks for **only** with `{ localOnly: true }`; sync's three calls pass nothing,
   and a test fails if `sync.js` ever names the option — the default, not a
   filter further down, is what keeps it off the wire, because `mergePersonal`
   carries an unknown *profile* field through (ADR 0146 §3).
4. **The backup file includes it**, as a named per-person field, not the
   catch-all `other` bag (which is raw, unsanitised and not mapped to a person).
   It is the user's own file; "never leaves the device" is about sync.
   An import merges (yours win by id, then venue + name) and a replace restores.
5. Recall **adds** to the tally; it does not replace it.

## Rejected

- **Store the tally's lines verbatim.** Simplest, and shaped like the codec — but
   the stored price becomes the recalled price, putting a stale total in the
   tally (the one lie the price work avoids), and names would be the only handle
   left for 26c.
- **Device-level, like the tally and the shopping list.** The tally is one order
  for the table (ADR 0012); a usual is personal, and sharing it across people
  would hand one person's allergen-relevant choices to another.
- **Put it in `SCOPED_BASE_KEYS` now, "26b falls out for free".** It would sync
  the day it landed, against the brief, and an older build's sync would be
  reading and rewriting a store it cannot name. 26b is the item that decides.
- **Let the `other` bag carry it in the backup.** Works by accident, restores an
  unsanitised blob under whatever profile id the file had, and leaves the
  per-person mapping to chance.
- **Replace the tally on recall.** Destroys an order someone is mid-way through.

## Consequences

A saved order made in an older build is impossible (new store). 26c can say
"this is $2 dearer" from the stored snapshot without a migration. An import from
a file written by a build older than this one (which swept the key into `other`)
is cleaned and kept rather than dropped. `STORE_SCHEMA.savedOrders` is 1, so a
future shape change pauses an older build's import rather than being misread.
A person removed by a sync pull takes their saved orders with them.
