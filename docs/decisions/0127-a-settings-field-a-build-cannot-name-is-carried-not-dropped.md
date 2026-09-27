# 0127 — A settings field a build cannot name is carried, not dropped

**Status:** accepted
**Date:** 2026-09-28

## Context

Roadmap `150/040` filed two findings, both surfaced while walking every
export/import/codec/sync/precache table looking for siblings of the allergen
bug ADR 0118 fixed. Both are the same shape as that ADR — *"a value this build
cannot name is carried, not dropped"* — applied in one more place each; this
record is the one they were filed together to close.

### (a) `sanitise()` drops an unknown settings field

`settings.js`'s `sanitise()` built its return value field by field, naming
each one. A key present in the stored object but not in that list — a
preference a newer build added — was simply absent from the result. The same
seam ADR 0118 found one level down: two of a person's devices need not run the
same build, so the day a new settings field ships:

1. the newer device sets it and pushes;
2. the older device pulls; `read()` strips the field it has never heard of,
   and the very next `set()` of *anything* — unrelated — commits the stripped
   object back over the top of its own storage;
3. the older device pushes that back; `mergeSettings` (`sync-merge.js`) unions
   the field names actually present on each side, so a field missing from one
   side and unchanged on the other reads as *"only they moved — to absent"*, a
   deletion, and it is applied.

This was reasoned through the code rather than reproduced end to end in two
real browsers the way ADR 0118 was — the unit test added here proves the
seam at the `sanitise()`/`mergeSettings()` boundary, not a live two-device
round trip. The cost is a reverted preference, not a lost allergen warning,
which is why the item ranked this fix second.

### (b) `mergePersonal` never carries the `other` bag

`collectPersonalData` (`personal-data.js`) gathers any `faves.`-prefixed store
it does not recognise into an `other` map, so a manual backup genuinely
contains "everything you put in". `sync.js` passes that same snapshot shape
into `mergePersonal` (`sync-merge.js`) — but `mergePersonal` never reads
`mine.other`/`theirs.other`, and the `merged` object it returns has no `other`
key at all. The result: a store a newer build introduces is collected,
sealed into the next push's plaintext, and then discarded when `merged` is
built — it never reaches the server and is never applied from a peer.

Nothing is destroyed: the local copy is untouched, so the effect is that an
unnamed store simply never syncs. The problem was that this was written down
nowhere — `sync.js`'s own governing sentence, *"overwriting data we do not
understand is worse than not syncing it"*, already justifies exactly this
behaviour one level down in `writeSnapshot`, but nothing said `mergePersonal`
was the place upstream where that same rule was already being applied.

## Decision

**(a) — fixed.** `sanitise()` now carries an unrecognised top-level field
through opaquely via a new `futureSettings()` helper, the same pattern as ADR
0118's `cleanAvoid`: never read, rendered or interpreted by this build, only
round-tripped as JSON, and bounded three ways because the object is sealed
into a synced blob — at most 20 unknown fields, each key ≤ 40 characters, each
value's `JSON.stringify` length ≤ 2000 characters. The three property names
that would let a plain assignment reach an object's prototype instead of its
data (`__proto__`, `constructor`, `prototype`) are refused outright, on the
same reasoning as bounding size: a value round-tripped without being
interpreted must not be able to act on anything it touches, including the
plain object `sanitise()` itself builds. Surviving fields are kept in sorted
order — the surviving *set* has to be what determines the serialised value,
not which device's field order it arrived in, or two devices that agree on
content but not order ping-pong writes forever against ADR 0017's scarce KV
budget (the same reasoning `cleanAvoid` already carries for allergen keys).

`mergeSettings` needed no change: it already unions the field names present in
`mine`/`theirs` rather than a hardcoded list (its own docstring notes a
whitelist in this position "has already rotted once"), so a carried field is
just one more field name in that union and is resolved by the same
same/tie-break rules as any other setting.

**(b) — documented, not fixed.** `mergePersonal`'s docstring now states
plainly that `other` is read by neither side and is absent from `merged`,
names the governing rule it already follows, and says where the bag *does* do
its job (`applyPersonalData`'s manual restore). `collectPersonalData`'s
comment in `personal-data.js` gets the mirror note. No merge behaviour
changes: teaching sync to write a store it cannot validate is exactly the
outcome the existing rule refuses, and the item that filed this said as much
— *"the honest first step is a comment saying so, not a merge."*

## Rejected

- **Declaring each client's settings-field vocabulary in the blob**, so a
  future merge could tell "this build never knew the field" from "this build
  deliberately cleared it." This is ADR 0118's own rejected alternative,
  applying with the same force here, and it is not re-litigated: it is the
  one fix that would close (a), (b) and ADR 0118's residual hole together, and
  it remains too large for the value of any one of them alone. Left as the
  next step if it is ever needed for more than one reason at once.
- **Merging `other` with a generic recursive three-way merge.** Rejected for
  the reason `mergePersonal`'s new docstring gives: this build cannot validate
  a store it does not name, and writing unvalidated bytes into a reader's
  device is a worse failure than a store that simply does not sync yet.
- **Unbounded carry-through for (a).** Rejected on the same grounds as ADR
  0118's allergen keys: the settings object is sealed into a synced blob, so
  an uncapped number, key length or value size lets a corrupt or hostile
  payload grow it without limit. The three bounds chosen are generous for an
  ordinary preference (a string, a number, a short array or small object) and
  cost a corrupt payload nothing more than the fields it can't fit.

## Consequences

- `site/js/settings.js`: `sanitise()` carries unknown top-level fields via the
  new `futureSettings()` helper; `KNOWN_SETTINGS_FIELDS` is derived from
  `Object.keys(DEFAULTS)` rather than duplicated, so a field added to
  `DEFAULTS` in a future change is automatically excluded from being treated
  as "future" the moment it becomes real.
- `tests/settings.test.js` gains cases for: an unknown field surviving the
  read → unrelated-set → read round trip an older client performs; the count,
  key-length and value-size bounds; the refused prototype-touching key names;
  and that `reset()` still clears carried fields along with known ones.
  **Break-probed**: reverting `sanitise()` to omit `...futureSettings(obj)`
  fails exactly the round-trip carry test and no other in the file — the
  known-field validation tests are the control that shows nothing else moved.
- `site/js/sync-merge.js` and `site/js/personal-data.js` gain documentation
  only; no test changes there because no behaviour changed.
- `tools/sync_check.mjs` gains no new assertion. Like ADR 0118's allergen
  seam, this is a cross-build defect invisible to a single-build browser
  check — it requires two different `sanitise()` implementations disagreeing
  about one field's name, which a live browser test running one build cannot
  stage. Whether `sync_check.mjs` should gain a *seeded* assertion analogous
  to ADR 0118's (seeding a "future" field directly into a store, the way that
  ADR seeded a future allergen key) is left for the owner rather than decided
  here — it would be the first assertion in that file that pins a defect
  neither side of the browser under test can actually produce.
- A hole remains, stated rather than papered over: a build cached before
  today still strips an unknown field on read. If a new settings field ships
  while such a build is in the field, the loss above can still happen once.
  What closes it fully is the vocabulary declaration above, or the passage of
  time — the same residual ADR 0118 already recorded for allergen keys.
