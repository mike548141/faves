# 0081 — A section's serving window annotates; it never filters

**Status:** Accepted.

**Date:** 2026-08-16

## Context

A menu section can be served only at certain hours, and the schema could not say
so. `available` on a section takes `{from, to, offBy, season, note}` — dates and
seasons only — so *"Mon–Fri 11:30–17:30"* was inexpressible and lived as prose in
`section.note`, where nothing read it. The stated consequence was real: Sprig +
Fern Tawa's Gold Card prices showed at 9pm on a Sunday with nothing saying they
are not served then.

**The item was written larger than it is, and the correction is worth keeping.**
ROADMAP 28c says *"six sections cram a time window into the section NAME"*. Zero
do. [ADR 0057](0057-a-section-heading-is-a-name-not-a-sentence.md) moved every
one of them into `note` on 2026-08-16 — and 28d/28f are marked **done** eleven
lines below the claim that they are not. The real workload was **5 sections in 4
venues, all already in `note`**, so this needed no name migration at all. A
roadmap item can be stale against work recorded in the same file.

The machinery also already existed. `site/js/hours.js` does the whole
weekday-and-interval job for venue opening hours, and — checked rather than
assumed — **none of its reasoning is coupled to a venue**: `segments`,
`openStatus`, `formatDay` and `groupWeek` are pure functions of a
`{mon: [[open, close]], …}` object. The section schema simply could not reach it.

## Decision

**1. `served` on a section, in exactly the shape of a venue's `hours`.** All
seven day keys, each a list of `[open, close]` `"HH:MM"` pairs, `[]` meaning not
served that day. Reusing the shape verbatim is the decision: `hours.js` then
applies to a section unchanged and there is **one** week-reasoning engine rather
than two. `segments()` was module-private and is now exported, following the
instruction `ranking.js` already carries about `tierFromHours` — *export it again
if a second caller needs this reasoning; don't duplicate it.*

**2. One extension over `hours`: `open` may be `null`, meaning "from opening".**
`hours` already allows a null *close* for "till late"; this is the symmetric
case, and real menus need it — The Borough's brunch says *"served till 2pm"* and
states no start. Writing a start time we were never told would be inventing
evidence, so `[[null, "14:00"]]` says exactly what the shop said. `formatDay`
renders it *"till 2pm"*, not as a range: the naive formatter produced
*"late–2pm"*, which is worse than saying nothing.

**3. `served` ANNOTATES. It never filters.** This is the load-bearing half, and
it deliberately diverges from how `available` behaves — `temporal.js` removes an
out-of-window section from the record entirely, before anything renders. Three
reasons, each of which is a bug we would otherwise ship:

- **The menu would change under the reader mid-session.** `available` resolves
  once per load from `todayIn()`, so it is date-granular and stable for a whole
  visit. A time-of-day window resolved the same way would have dishes vanish at
  2pm while someone is looking at them.
- **Hiding it destroys the information the reader wants.** At 9pm, "this venue
  has a Gold Card menu, served 11:30–17:30" is useful; an absence is not.
- 🔑 **Deep links would break as a function of the clock.** `#section-<id>` is a
  stored-id anchor since
  [ADR 0058](0058-a-section-has-an-id-and-its-heading-is-not-it.md). If the
  section were filtered away, a link someone was *sent* would work at 1pm and
  fail at 1am. ROADMAP Theme 34 exists to make sections URL-addressable so they
  can be handed to another person; a section that vanishes on a timetable is the
  direct negation of it. **This is the argument that settles it** — the other two
  are about comfort, this one is about a promise the app is about to make.

**4. A section served when its venue is shut is a WARNING, not an error.** The
venue's hours and the section's window are two separate readings and either may
be the stale one. The validator cannot know which, and silently trimming the
section to fit the hours would destroy what the menu actually said.

## Rejected

**Extending `available` with time-of-day keys.** One field, no new vocabulary,
and the obvious first move. It loses because `available` *filters* and its
semantics are load-bearing elsewhere (`offBy` is how a departed dish leaves the
payload, ADR 0023). Adding hours to it would either drag filtering behaviour onto
a serving window — Decision 3's three bugs — or make one field mean two things
depending on which key is set.

**Reusing the filter path for consistency.** Cheapest to build, and defensible on
the grounds that one mechanism is simpler than two. It ships all three bugs
above, and the third is not recoverable later: once links to sections are in the
wild, a link that fails at certain hours is a broken promise to someone who was
sent it.

**Requiring all seven days to state a real opening time.** Tidier, and it keeps
`served` identical to `hours` with no extension. It cannot express *"served till
2pm"* without our inventing a start time — the exact class of fabrication ADR
0038's `/CreationDate` rule exists to prevent, in a different field.

**Structuring `1841-bar-restaurant`'s Mains window.** Its note reads *"Monday to
Sunday, open till late"*, which is the venue's own hours restated. Given a
`served` block it would render a serving line that adds nothing and would drift
from `hours` the day the venue changes. Left as prose deliberately; only 4 of the
5 sections gained structure.

## Consequences

**`served` and `available` coexist and answer different questions** — "is this on
the menu during the recorded date window?" versus "is it being served at the hour
someone is reading?". A record may carry both.

**A window that crosses midnight is still inexpressible**, inheriting ADR 0006's
rule that past-midnight is a null close rather than a wrap. No section in the
corpus needs one; when one does, that is the ADR to revisit, not this.

**Eligibility is untouched.** Sprig + Fern's Gold Card section is *both* a window
(this record) and a rule about who may order (ROADMAP 28e) — the single hardest
case in the corpus. Only the window is structured here; "12 and under" and "Gold
Card" stay prose, and 28e remains open with the owner's question intact: a "show
me Gold Card prices" preference would be the first thing the app asks a reader
about themselves beyond diet.

**`tools/served_check.mjs` drives it on a FROZEN clock.** The outside-window
state cannot be asserted otherwise without waiting until 9pm, and a check whose
verdict depends on the hour gets switched off within a week — the lesson
[ADR 0054](0054-the-branch-offered-first-is-the-nearest-open-one.md) already paid
for. It asserts the served line renders, the not-served marker appears only
outside the window, the section and its prices remain present and legible, and
`#section-gold-card` still resolves at 9pm.

## What a green run does not show

**Whether the windows are true.** Every one was transcribed from a section note
that a human wrote from a menu; no gate can check a serving time against the
shop. The validator can only say the venue is not recorded as shut at the time —
and it says that as a warning, because it does not know which of the two readings
is stale.

**Whether the marker is understood.** "Not served right now" is a claim about a
reader's comprehension, and this repo ships no analytics — deliberately. The
evidence here is that the state is *reachable* and in the accessibility tree, not
that anyone reads it.
