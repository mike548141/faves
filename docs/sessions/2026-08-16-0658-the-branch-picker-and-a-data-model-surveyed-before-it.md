## 2026-08-16 06:58 UTC — the branch picker, and a data model surveyed before it was designed

Ran alongside the Theme 25 session for the first half. The concurrency worked
the way `CONCURRENCY.md` intends and is worth recording as evidence rather than
as reassurance: they messaged first with their lane, I **verified the claim**
against `origin/faves-dish-ids` rather than taking it on trust, and two of the
things I sent back turned into their landed fixes rather than roadmap lines —
`check_versions.py` bare mode (which printed an all-clear on a clean tree
because it reads only *staged* changes, and had let two version collisions
through that day) and an ADR-index audit.

🔎 **Being corrected, then being right anyway.** I told them ADR 0050 was
missing from `decisions/README.md`; it was not — I had read the numeric tail of
an append-ordered file. They corrected me. Taking their own advice, I then
audited *every* ADR filename against the index with a one-line loop and found
**five genuinely absent** — 0023, and a contiguous 0042–0045. A four-wide hole
is the shape most likely to cause a number reuse. They fixed all five and built
`tools/check_decisions.py`, so a convention that had silently failed seven times
is now a gate. **The lesson is about the method, not the number:** the eyeball
check produced a false positive *and* would have missed five true ones; the
mechanical check produced neither.

### The branch picker (ADR 0054, shipped)

Owner's ask, from his phone: one branch open at the top, 2–4 more collapsed and
pickable in one step, the second step only beyond that, all bounded by the
distance dial — and the top one must be *"not only closest, but open as well"*.

The layout was the easy half. Writing the openness rule turned up that **10 of
the corpus's 22 branches carry no hours at all** — every McDonald's, every
Subway. A two-state open/closed rule would have read "never captured" as "shut",
and the openness half of the rule would have been **incapable of firing on the
venue that prompted the change**. That is the decorative-check pattern, fifth of
its shape here, and it was found by measuring the corpus before writing the
predicate rather than after.

So openness is three-state and `unknown` outranks `known-closed`. Delivered:
`leadBranch` (three tiers, each nearest-first), `branchCard` (lead + 4 one-tap
rows + remainder), `branchesToShow` deleted rather than deprecated, the dial
filtering both lists but **counting what it hid** with a button to the setting,
and a collapsed row as a disclosure button inside its heading.

`tools/branch_check.mjs` is the fourth of the browser-check family. Its design
constraint is worth carrying to the next one: **every assertion is
time-independent**, because a check that passes at 1pm and fails at 1am is
switched off within a week. It asserts the honesty rule against the *data* (no
status chip where the file has no hours) and the weaker always-testable form of
the lead rule (never known-closed while a known-open branch is on the card). It
caught two real bugs in its own first runs — both times I was counting rows
behind the hidden second step as though they were on the card.

⚠️ **What I did not build, and flagged rather than assumed.** "Pick a different
branch to use" can mean *reveal* or *select*. I built reveal, said so in the
ADR, and said why: it is a strict subset of selection, so nothing is wasted if
the owner wants the fuller version, whereas selection overrides ADR 0011's
nearest-branch rule and reaches into the order tally.

### Themes 30 and 31 — researched, then written

The owner asked for a data model that *"future needs don't break"*, explicitly
including needs outside Faves (price history, closed venues as trend data), and
named high-end through fast food, multiple parts of the world, and
hierarchy-vs-ontology. Four subagents did the survey; the themes were written
from it rather than from intuition.

Three things worth carrying even if the themes never ship:

- **The owner's hardest case was settled in his favour by evidence.** He asked
  for overlapping menus (an all-day brunch alongside lunch). Deliveroo's API
  *forbids* overlapping mealtimes — and can only afford to because it is
  delivery-only. Oracle Simphony, thirty years of real hospitality, allows
  overlap and resolves it by **explicit priority, first match wins**. The tidier
  model was the wrong one.
- **ADR 0051 arrived exactly in time.** Multiple menus need a dish to be an
  entity referenced from several places rather than an object nested in one.
  `dishId` — landed by the parallel session the same day — is that primitive.
  Without it, overlapping menus mean duplicated dishes that drift.
- **We are in better shape than the ask implies.** Bitemporality (world time vs
  record time), reduced-precision ISO dates, lifecycle events instead of a
  `closed` flag, IANA zones, BCP-47, provenance-with-method: all already here,
  and all independently match what the literature prescribes. The genuine gaps
  are narrower and nameable — the cuisine facet mixes origin with dish form (the
  identical flaw OSM documents in its own `cuisine=` key), the null-vs-missing
  problem is a *safety* issue on allergens rather than a style one, and
  `premises` as an entity distinct from `venue` is the missing key for the
  historical analysis the owner described.

Theme 31 collapsed from a feature to a data change. There is no "app URL" to
store — only universal links, which are ordinary `https` URLs the OS upgrades.
Verified against Apple's AASA CDN and Google's Digital Asset Links API, not
against blog posts: **three of our four aggregators already open their native
apps today** with the links we ship. Two findings the owner needs: a page can
*never* detect a third-party app, so no button may ever say "open in app"; and
**McDonald's NZ — his own example — is the one chain with no association file at
all**, while Subway's would hand an iPhone to the wrong app entirely.

### The staleness sweep

An audit of every open roadmap item against the tree, prompted by finding one
such item by accident. Six were stale or partly stale: venue timezone and
per-venue currency both **fully delivered and never ticked**; seasons-assume-
southern-hemisphere delivered; 28a's "blocked on Theme 25" discharged; 17e's
ingredient-first search shipped; McDonald's photos closed part (b). One was
never true at all — the `picks` item named a venue that has carried three picks
since before the line was written, so it had been misdirecting the worklist from
the day it was typed.

🎯 **Left for the owner:** the reveal-vs-select question on branches, and
whether Theme 30a is built now against a venue he can supply or held until one
arrives (recommendation: hold the build, write the shape's ADR now while the
survey is fresh).

