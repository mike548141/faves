# ADR NNNN — Details provenance belongs to a branch, not to a chain

<!-- NUMBER NOT YET ALLOCATED. Drafted in a worktree; three parallel agents all
     took 0031 on 2026-07-23 and 0025 is permanently ambiguous because of the
     same habit (decisions/README.md). Allocate NNNN at merge to `main`, rename
     the file, and add the index entry IN THE SAME COMMIT. -->

**Status**: accepted
**Date**: 2026-08-16
**Builds on**: [0011](0011-multi-location-venues.md),
[0037](0037-confidence-reads-both-ways.md),
[0043](0043-a-venue-carries-its-own-clock-and-currency.md)

## Context

ADR 0037 gave the venue's **details** — phone, address, opening hours — their
own dated reading, separate from the menu's: `detailsVerified` +
`detailsVerifiedBy`, at the top of the record. ADR 0011 had already established
that a venue's address, phone and hours live **per branch** when it has several.

Those two shapes disagree, and Pandan Asian Cuisine proved it with one record on
2026-08-15. Its Melling address, phone and hours all come from Pandan's own site
(`official-site`). Its Press Hall hours are the **food hall's** published house
standard — the building operator's statement about its own premises, not
Pandan's about itself (`third-party`). With one venue-level field, the honest
read is weakest-wins, so the whole record dropped to `third-party` and the ⓘ told
every reader that Pandan's *own* address and phone number were "taken from a
directory listing". That is a false statement in the safe direction, but it is
still false, and it discards true information we paid to gather.

Deferred at the time — correctly — because one record is not an evidence base
for a schema change, the same restraint ADR 0037 applied to ageing the field.

**The owner's ruling of 2026-08-16 removed the reason to wait.** He ruled that a
**named** third-party source is acceptable for opening hours, which unblocks
McDonald's and Subway — 10 of the corpus's 22 branches, none of which carry
hours today. Capturing those hours under one venue-level field would drag two
whole chains to `third-party`, *including* branches whose address and phone came
from the company's own site. His instruction was explicit: **"Build per-branch
`detailsVerified`/`detailsVerifiedBy` first, then capture the hours."**

## Decision

**`detailsVerified` and `detailsVerifiedBy` are valid on a branch as well as on
the venue. The branch wins; the venue-level pair is the default for branches
that omit it.**

This copies `timezone` (ADR 0043) exactly, and deliberately does *not* copy
address / phone / hours. Those five are forbidden at the top level once
`locations` is set, because two answers to "where is it" is an ambiguity.
Provenance is not like that: "how we came to know this venue's details" has a
sensible chain-wide default that a branch may override, which is the same
relationship a venue's timezone has with a branch's.

**The pair is taken whole from one level or the other.** A branch date paired
with the venue's method would describe a reading nobody performed — precisely
the "guesses dressed as precision" ADR 0036 exists to refuse. A branch that
carries a date but no method is method-less, not inheriting.

**`temporal.js` reports which level answered.** `detailsVerification(record,
branch)` returns `scope: "branch" | "venue"` alongside the date and method, so
the caller can tell a branch-specific claim from a chain-wide one instead of
guessing.

**The menu screen's ⓘ describes the *nearest* branch** — the same branch whose
hours already drive the open/closed status and whose timezone already drives the
clock (`locations.js`, `place.js`). It names that branch when the reading is the
branch's own and there is more than one branch to tell apart. Pandan's note now
reads:

> Menu and prices checked against the place's own site on 15 Aug 2026. Phone,
> address and opening hours **at Melling** checked against the place's own site
> on 15 Aug 2026.

…where before it said *"…taken from a directory listing."*

**Not built: ageing the field per kind.** The owner also ruled that opening
hours should get their own decay limit, separate from phone and address. That
ruling settled the *shape* and explicitly not the *numbers* — "the numbers still
cannot come from this corpus", because every dated record sits inside one
48-hour window and nothing has had the chance to go stale. Inventing a threshold
here would be the mistake ADR 0036 had to correct, so nothing was invented.

## Rejected

**Keep it venue-level and let weakest-wins stand.** It is honest, and it was the
right call while one record showed the gap. It stops being tenable the moment
the hours ruling lands: two chains, 10 branches, every one of them first-party
for address and phone, all reading as a directory listing. The cost is paid by
the *good* data.

**Move the pair to the branch only, and forbid the top level.** Structurally
tidier and it matches address / phone / hours. Rejected on two counts. It breaks
every record in the corpus — 28 `detailsVerifiedBy` values, only two of which
belong to a venue that would keep them — for no gain a reader can see. And it is
wrong on the merits: a single-site venue has no branch to hang it on, and a
chain checked in one pass against one company site genuinely has one derivation
for all of it. Making that state unexpressible would force the same fact to be
copied onto 14 Hell Pizza branches.

**Split by kind now — `hoursVerified` separate from `contactVerified` — since
the owner ruled for that split anyway.** It composes with this change and doing
both in one pass is cheaper than twice, which the roadmap says out loud.
Rejected because the two halves are not equally ready: this one has a ruling and
a worked case, the other has a ruling and no numbers. Building the two-field
shape without limits would ship a distinction the UI cannot yet act on, and a
field nothing reads is the payload waste ADR 0047 forbids.

**Describe every branch's provenance in the ⓘ.** Truthful and unreadable: a
7-branch chain would put seven derivation sentences behind a tooltip whose whole
job is to answer one question quickly. The nearest branch is the one the reader
is being shown hours for, so it is the one the sentence is about.

## Consequences

- **Every existing record renders exactly as before.** The venue-level path is
  untouched, and a `detailsVerification(record)` call with no branch behaves
  identically. Asserted directly, and the assertion survives the
  break-it-to-prove-it run below unchanged — which is the point of it.
- **`validate.py` gained `check_details_verification(rid, obj, where)`**, called
  once for the venue and once per branch. `tools/test_validate.py` mutates the
  **real** Pandan record four ways (method with no date, date with no method,
  off-vocabulary method, non-date date); removing the per-branch call makes all
  four pass silently, which is how the check was proven to have teeth.
- **One record carries it: Pandan.** That is the field reporting the truth, not
  a backlog. It fills as the hours ruling is applied to McDonald's and Subway,
  which is the work this unblocks.
- **A chain can now say two different things about itself**, and the ⓘ names
  which branch it is speaking for. A reader nearest Press Hall is told the hours
  came from a listing; a reader nearest Melling is told they came from Pandan.
  Both statements are true, which was not previously possible.
- **`device_check.mjs` reads both levels now.** Its "the note claims venue
  details only when they have their own date" assertion asked only the venue,
  and would have gone quietly vacuous on a branch-scoped record.
- **The third-party-hours item can start.** Its precondition was this ADR.
