# 0054 — The branch offered first is the nearest **open** one

**Status:** accepted
**Date:** 2026-08-16
**Amends:** [0011](0011-multi-location-venues.md) — which branch the menu screen
surfaces, and how many. 0011's data shape and its "nearest branch drives
distance, status and the maps handoff" rule are untouched.

## Context

The contact card on a chain's menu page showed the **two nearest branches, both
fully expanded**, then a "Show all N branches" button. The owner, looking at
McDonald's on his phone, asked for three changes:

> I think only the closest branch should be open at the top of the branches
> list, then I think we should have 2-4 more branches in some kind of collapsed
> state so they are easily accessible and a user can pick a different branch to
> use in a single step. Then if there are more than 3-5 branches we continue to
> use the two step process to show a fuller list of branches available, but this
> would still be limited by the settings configuration that says only show
> places with X km/miles
>
> Note the top most branches must not only be closest, but open as well

Two of those are layout. The third — *closest **and open*** — is a rule, and
writing it exposed something the layout question would never have surfaced.

**Ten of this corpus's twenty-two branches carry no hours at all**: every
McDonald's (5) and every Subway (5). Measured, not assumed. So a two-state
open/closed rule would have treated "nobody ever captured these hours" as
"shut", and the openness half of the rule would have been **incapable of firing
on the very venue that prompted it**. That is the decorative-check pattern this
repo has now hit five times — a rule that reads as working because nothing ever
proves it isn't.

## Decision

**Three states, three tiers, and the dial is never silent.**

1. **Openness is `open` | `closed` | `unknown`.** A branch with no `hours` is
   `unknown`, and `unknown` is never rendered as a status chip. Printing
   "Closed" beside a branch whose hours nobody captured is a lie that sends
   someone across town; printing "Open" is a worse one.

2. **The lead branch is chosen in three tiers, each nearest-first**
   (`locations.leadBranch`):
   1. a branch we know is **open**;
   2. a branch whose hours we **don't have** — unverified beats known-shut,
      because absence of evidence is not evidence of closure;
   3. the nearest branch, even though we know it is closed.

   Tier 2 is the whole reason the three-state enum exists. Without it every
   McDonald's branch would be "closed" and the tier-1 rule would be dead code.

3. **One lead expanded, up to four one-tap rows, then the second step**
   (`locations.branchCard`, `NEAR_BRANCH_LIMIT = 4`). Four is the top of both
   ranges the owner gave ("2-4 more", second step past "3-5"), and it is what
   retires the second step for four of the five chains we hold — including
   McDonald's, the venue in the screenshot. Only TJ Katsu's seven still needs
   it.

4. **A collapsed row is a disclosure button inside its heading.** One real
   click reveals that branch's own phone, address and hours. The heading keeps
   branch-by-branch navigation working for a screen reader; the button carries
   `aria-expanded`/`aria-controls`; the row is a ≥44 px target.

5. **The distance dial filters both lists, and says so.** Branches beyond the
   viewer's limit are dropped from the one-tap rows *and* from behind the second
   step, per the owner's "would still be limited by the settings configuration".
   But the count of what was dropped is rendered as a sentence with a button
   that opens the setting. A cap the reader cannot see reads as "these are all
   of them".

6. **The lead always survives the dial.** A card that can render empty is worse
   than one that occasionally over-shows, and "your nearest is 40 km away" is a
   useful answer where silence is not.

7. **With no distances at all** — no captured location, or coordless branches —
   the dial cannot be applied and nothing is dropped. An unknown distance is not
   evidence of a far one.

## Consequences

- `locations.branchesToShow` is **deleted**, not deprecated: `branchCard`
  replaces it and nothing else imported it.
- A new real-browser check, `tools/branch_check.mjs` — fourth of the family
  after `device_check`, `cook_check` and `addon_check`. Its assertions are
  deliberately **time-independent**, because a check that passes at 1pm and
  fails at 1am gets switched off within a week. It asserts against the *data*
  that no branch is given a status it has no hours to support, and asserts the
  weaker, always-testable form of the lead rule: the lead is never known-closed
  while a known-open branch is on the card.
- **What is still not built, and was not asked for:** the lead is a
  *presentation* choice, not a *selection*. Tapping a row reveals that branch;
  it does not make it the page's active branch, so the header's open/closed
  status, the distance shown and the maps handoff still follow ADR 0011's
  nearest-branch rule. The owner's phrase "pick a different branch to use" can
  be read either way; the reveal is a strict subset of the selection, so
  building it first wastes nothing if he wants the fuller version.
- 🚩 **The rule is under-exercised until the data improves.** With McDonald's
  and Subway carrying no hours, tier 1 never fires for them. Capturing branch
  hours for those ten branches is the content item that makes this decision
  real, and it is on the roadmap.
- `favBoostKm` now unambiguously means "branch distance limit" and its name says
  neither of those things. Flagged in `settings.js`; renaming the storage key
  needs a migration.
