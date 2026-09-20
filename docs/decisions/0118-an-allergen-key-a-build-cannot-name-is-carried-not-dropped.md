# 0118 — An allergen key a build cannot name is carried, not dropped

**Status:** accepted
**Date:** 2026-09-20

## Context

The 2026-08-17 three-day cold review filed four findings against sync under one
heading — *"sync resolves conflicts and tells the reader nothing"* (roadmap
`150/030`). Two of them are engineering rather than design, and this record
covers both. The other two — surfacing rating/setting conflicts and profile
identity mismatches — need a ruling on what the reader is shown and are
deliberately untouched here.

### 1. An older build drops an allergen key, and the merge then deletes it

Filed as a suspicion. **It is real, it was reproduced end to end in two real
browsers, and every step in the chain is individually correct** — which is why
no module's own tests could see it.

- `settings.js` `sanitiseDiet` filtered `avoid` through `cleanKeys(…,
  ALLERGEN_KEYS)`: a key not in **this build's** `ALLERGEN_PREFS` was dropped on
  every read. Right for a hand-edited file; wrong for a synced one.
- Two of a person's devices need not run the same build. A phone serves
  whatever its service worker last cached, and a laptop opened once a month can
  be months behind. So the day a key is added to `ALLERGEN_PREFS`:
  1. the newer device flags it and pushes;
  2. the older device pulls. `writeSnapshot` puts the raw settings object into
     storage, unknown key and all — but `createSettings.read()` strips it in
     memory, and the **next `set()` commits the stripped state back over the
     top**. One tap on any preference does it;
  3. the older device's `collectPersonalData` now reads the stripped list and
     pushes it;
  4. on the newer device `mergeSettings` compares `mine`, `theirs` and `base`
     for the `diet` field, finds `same(mine, base)` and `theirs` different, and
     takes the third branch — *"only they moved"*. **That is a deletion**, and
     it is applied silently: the branch is reached before the `DIET_FIELD`
     special case, so no `CONFLICT_DIET` is raised and nothing is reported.

The result is an allergen flag cleared by the act of syncing, told to nobody.
Measured on `sync-surfacing` at 2026-09-20 with the old sanitiser in place:
device A's stored list went from `["contains-peanuts","contains-zzz-future"]`
to `["contains-peanuts","contains-nuts"]` across one round trip.

🔑 **Nothing in the chain is a bug on its own.** The sanitiser is right to
distrust input, the settings store is right to write what it holds, and the
merge is right to propagate a deletion — ADR 0060 exists precisely so that
un-hearting and un-ticking work. The loss lives in the seam, which is why 1,311
unit tests stayed green over it.

### 2. The error view had no way out

`sync-ui.js`'s `buildError()` rendered a message and a **Retry** button, and
nothing else. The panel shows exactly one view and `ERROR` outranks every other
(`computeViewKey`), so a reader whose sync was broken for a reason retrying
cannot fix — a code that no longer matches the data on the server, a Worker that
has gone away, a device wedged offline — could not reach the one verb that ends
it. `sync.disable()` was reachable from every state **except the one that needed
it**.

## Decision

**An allergen key this build has no chip for is carried, not destroyed.**
`sanitiseDiet`'s `avoid` list now keeps unrecognised keys, bounded three ways
because the list is sealed into a synced blob: the `contains-` namespace an
allergen key is actually written in, a 40-character length, and a cap of 20.
Carried keys are appended **sorted, after the known ones**, so the value is a
function of the set rather than of whichever device's array order it arrived in
— two devices that agree on the set but not the order serialise differently and
ping-pong writes forever against ADR 0017's scarce KV budget.

Carrying costs nothing that matters: no dish in the corpus is tagged with the
key, so `dishFlagged` never matches it and no filter reads it. Dropping it
cannot be undone. `sync.js` already holds this exact rule one level up for whole
stores — *"overwriting data we do not understand is worse than not syncing
it"* — and this applies it inside the one field where getting it wrong can hurt
somebody.

**`sanitiseDiet` is the only gate that needed changing**, which is why the fix
is eleven lines. Every path that touches a diet value goes through it: the
settings store's read and write, the import plan's comparison (`existingDiet`),
the import's apply, and `mergeSettings`'s union branch.

**The Settings screen says it is holding them.** A flag nothing can show, name
or clear is a held value with no door — the defect class this repo keeps
finding. `futureAllergens()` is exported and the Food preferences panel carries
one hint line when the list is non-empty. It is hidden for every reader today,
by construction.

**The error view gets the same "Turn off sync on this device" control as the
"on" view**, with the same confirmation, factored into one `turnOffControl()`
used by both — a rule with two implementations is one this repo has watched go
out of step before, each copy locally correct and only one updated. The
confirmation's wording is ADR 0060's addendum ruling (name the scope, never a
device count) and now has one home.

## Rejected

- **Teaching the merge to refuse any narrowing of `diet`.** The direct fix for
  the *symptom*: treat an incoming diet that removes a key as a blocking
  `CONFLICT_DIET` rather than a silent deletion. Rejected. It cannot tell a
  stripped key from a deliberate un-tick — no signal in the blob distinguishes
  them — so it would ask the safety question every time somebody un-ticked an
  allergen on their other phone, and the answer *"keep mine"* would re-ask on
  the next sync forever. It also changes what the reader is *shown*, which is
  the half of `150/030` that is the owner's call, not a worker's.
- **Declaring each client's allergen vocabulary inside the blob**, so the merge
  could tell *"they never knew this key"* from *"they cleared it"*. This is the
  only rule that closes the hole for builds **already deployed**, and it is
  genuinely better. Rejected for now as disproportionate: it adds a field to the
  synced snapshot (and so to `collectPersonalData`, which ADR 0074 governs), it
  needs a decision about what to do when the other side declares nothing, and it
  buys nothing over the fix above for any build from today onward. Recorded as
  the next step if a key is ever added while pre-2026-09-20 clients are still in
  the field.
- **Giving `dietary` the same treatment.** Deliberately not done, and recorded
  as a test so nobody "tidies" the asymmetry away. A dietary key has no
  namespace — `v`, `vg`, `gf`, `df` — so no test separates *"a claim key a later
  version added"* from a typo, and keeping everything would mean keeping junk.
  The cost is accepted and is not symmetrical with the other half: a dropped
  dietary key costs a filter someone re-ticks; a dropped allergen key costs a
  warning.
- **Re-ordering `cleanKeys`' known keys into vocabulary order.** Its comment
  claimed it did this and the code never has. The comment was corrected instead:
  the order is what is stored, exported and synced, and changing it would
  rewrite every reader's settings blob to no purpose.

## Consequences

- **`sync_check.mjs` goes from 16 assertions to 22** — three for the allergen
  key, three for the error view's way out. The allergen key is **seeded** into
  the store rather than clicked, because by definition no control on this build
  can set it; everything after the seed is the real app, including a real tap on
  device B's allergen chips, which is the step that makes an older build commit
  its stripped view of the list.
- **Break-probed.** Reverting `sanitiseDiet` to `cleanKeys` fails
  *"an allergen flag on A is NOT cleared by syncing with a device that has no
  chip for that key"* and **nothing else** — 21 passed, 1 failed. Its two
  neighbours are what make that meaningful: the precondition (*the key reaches
  B's store at all*) still passes, so the probe is not a delivery failure, and
  the control (*the ordinary allergen B flagged still crossed back to A*) still
  passes, so a merge that had simply stopped accepting anything from B — a worse
  bug — cannot satisfy the assertion.
- **A hole remains, and it is stated rather than papered over.** A build cached
  before 2026-09-20 still strips, so if an allergen key is added while one is in
  the field, the loss can still happen. What closes it is the vocabulary
  declaration above, or simply the passage of time.
- **An import now sees a difference it used to be blind to.** `planImport`
  compares two diets through `sanitiseDiet`; when both sides were stripped, a
  key present in the file and not on the device was invisible and no safety
  question was asked. It is now a real difference and asks. Correct in the
  direction this app cares about, and a behaviour change worth knowing about.
- **`dietSummary` counts carried keys**, so the Settings index row can read
  *"3 allergens flagged"* beside two lit chips. That is true, and the hint line
  under the chips is what explains it.
