# 0091 — The distance limit cuts the list, and every screen it empties says so

**Status**: accepted • **Date**: 2026-09-07

## Context

Settings has said **"Hide places further than…"** since the dial existed, with
a hint under it promising the same thing — that beyond the dial a place
*"drops off your list"*. Neither was true. `ranking.js` carried a `far` key that
**sank** a distant venue below everything reachable and nothing more: a reader
who set 5 km still saw all 55 places, in a slightly different order.

The three-day cold review
(`docs/reviews/2026-08-17-0643-three-day-cold-review.md`) found it and stated
the cost plainly: *a reader who sets a distance and still sees a far-away venue
concludes the setting is broken, which is worse than the setting not existing.*

The owner was asked **which side was wrong** — reword the copy to describe
ranking, or make the control filter — with both costed. On **2026-08-22** he
chose the feature. The cheap reword was **explicitly declined**, and the option
he took was the one labelled *"changes what the home screen is"*. That
consequence is accepted, not overlooked.

The ruling opened three questions it did not answer, and named them: the empty
state, the count, and the direct link. He ruled the **direct link** the same
day — it opens, carrying one quiet line — and left the other two as
implementation. This record settles those two and says why.

## Decision

**1. The limit cuts.** `splitByDistanceLimit` (ranking.js) removes a venue whose
nearest branch is past `farKm` before the home list is ranked. Nothing is cut
without an origin, and a venue with **no coordinates is kept**: only a *known*
too-far distance excludes, exactly as `isAvailableNow` has always read it.

**2. The ranking stays.** The owner's own words: *"sinking distant places was
never wrong on its own — it is what the list does within the limit."* This adds
a cut; it does not replace the sort. `rankVenues` is unchanged.

**3. The count is stated — following the house pattern, not inventing one.**
It already was: `#result-count` reads `"12 of 57 places"`, and it now tells the
truth for free because the cut lands before the render. **A second line names
the limit** beside it, because the count alone says the list is short and not
*what* shortened it.

The pattern is **ADR 0088's**, one screen down. When the owner ruled on
2026-09-06 that a menu filter should REMOVE dishes, the objection — that
narrowing hides things from the person handed the phone — was answered *"by
making the narrowing LOUD rather than by refusing to narrow"*: `summarise()`
in `dish-filters.js` renders **both** numbers beside a one-tap "Show all", and
its own comment says why in terms of this very question —

> Deliberately states BOTH numbers. "35 hidden" alone makes a reader do
> arithmetic to find out how big the menu is; "showing 12 of 47" is the form
> that answers "did the collection shrink?" without being asked — **the same
> question the home screen's distance limit raised (Theme 27).**

So the house had already reasoned about *this* screen while building that one.
Two filtering surfaces in one app behaving differently would be the defect;
**one decision, applied twice**, is what this records.

What is adopted is the **shape** — both numbers, always visible while anything
is withheld, a one-tap way back — not the literal string. The home screen says
`"12 of 57 places"` where the menu says `"Showing 12 of 47 dishes"`; that
divergence predates this work, `boot_check` pins the home wording, and
re-cutting it is churn belonging to neither this item nor this ruling.

**Where the two surfaces genuinely differ, and how they are kept in step:** a
menu filter narrows a list you are already reading and can leave it empty of
*matches*; the distance limit can empty the **home screen itself**. So the count
line and the empty state are designed as one thing rather than two. The note
beside the count and the empty state are built by a single function
(`renderDistanceCut`) from one set of numbers, they name the same limit in the
same words, and they carry the same widen button — and the empty state
**replaces** the generic "no places match those filters" line rather than
joining it, so a blank screen never carries two explanations.

**4. An empty state of its own**, where the list would be: what the limit is,
how many places it is holding back, and a button that widens it. It **stands in
place of** the generic "no places match those filters" line rather than beside
it — and the short-list note above stands down while it is showing, because
both are visible at 390 px without scrolling and would otherwise say the same
sentence twice with a button each.

**5. The direct link opens whole**, with one line on the venue page naming the
distance, the limit, and the way out.

**6. The way out is a figure that works.** `widenDialTo` (units.js) rounds **up**
to a position the dial actually has, and returns `null` past the dial's own
maximum — where the offer becomes "open the dial" rather than a number that
would not help.

## Rejected

- **Reword the copy to describe ranking.** The cheap option, costed and put to
  the owner, and **declined by him**. Recorded so nobody re-proposes it as a
  simplification: it is not an oversight, it is the road not taken.
- **Saying nothing, and letting the count speak for itself.** Weighed and lost
  on ADR 0088's evidence above: the count answers *"did the collection shrink?"*
  but not *"what shortened it?"*, and every other narrowing on this screen wears
  a chip that names itself. A cut with no visible cause is the shape of the bug
  this item was raised for, one step along.
- **Checking the filter sheet's "Show all N places" for a new lie.** It has
  none: `filters-ui.sync` only says "Show all `total` places" when
  `shown === total`, which the cut makes false, so it correctly falls through to
  "Show 38 places". Recorded because it is the obvious place for one and a
  future reader will check — and pinned by an assertion rather than left as a
  reading.
- **A dismissible chip in the active-filters row.** Consistent-looking and
  wrong. Those chips clear a **view filter** with a ✕ and are gone on reload;
  this is a **stored setting** that survives every reload and every screen. A ✕
  on it would either lie (clear it, and it comes back) or silently rewrite a
  preference the reader set elsewhere. The note names the setting and *widens*
  it instead, and says which.
- **An "off" position on the dial.** There is none: the range is 5–100 km
  (5–60 mi). Widening to the maximum is the honest equivalent, and naming the
  smallest limit that actually brings a place back is more useful than naming
  the largest.
- **Blocking a direct link to a place beyond the limit.** Ruled out by the owner
  on 2026-08-22, with the reasoning worth keeping: *the sender never knew what
  limit the recipient set*, so a blocked link fails for a reason neither party
  can see. And the note is not an apology for the filter — it is **the one
  moment the setting becomes legible**, answering "why was this missing from
  home?" on the page the reader is already looking at, beside the control that
  fixes it.
- **Cutting search results and the favourites view too.** Not touched.
  Searching a place by name, or opening one you hearted, is a request for *that
  place* — the same class of act as following a link, and the link ruling
  governs it. The cut is a property of **browsing the list**, not of the data.
- **A te reo draft for the new copy.** Every string here interpolates a live
  number ("your 5 km distance limit"), and `reo.js` swaps **whole strings only**
  — it could not render a translation of these even if one existed. The keys are
  parked in `docs/reo-review-queue.md` rather than guessed at.

## Consequences

- **The home screen can now be empty**, which it could not be before. That is
  the accepted cost of the option the owner took, and §4 is what makes it
  survivable: a blank home screen with no explanation is indistinguishable from
  a broken app.
- 🚩 **On today's data the limit cannot empty the screen on its own.**
  `cook-at-home` and `cosmic-vape-and-coffee` carry no coordinates, so they are
  never cut, and one of them always remains. The empty state is reachable
  through a **combination** (a cuisine plus a tight limit) and becomes reachable
  on distance alone the day every record has coordinates. Said here because a
  future session measuring "can this even happen?" will otherwise conclude the
  empty state is dead code and delete it.
- **`rankVenues`'s `far` key never fires on the home list any more** — nothing
  beyond the limit reaches the ranker. It is kept because `rankVenues` is a
  general ranker whose callers are free not to cut, and because deleting it
  would make the ruling's "the sort stays" half unrecoverable.
- **A tap on the widen button rewrites a stored, per-profile setting** and
  re-renders both screens through the existing `settings.subscribe` path. On the
  venue page that re-render is synchronous inside `settings.set` and throws the
  button away, so the confirmation is a toast and focus is parked on the title —
  otherwise a keyboard reader lands on `<body>`.
- **Guarded by `tools/distance_check.mjs`** (19 assertions), not by CI: CI runs
  `boot_check` and nothing else in that family. Three were break-probed by
  reintroducing the bug they cover — the note firing on every venue (1
  assertion), two explanations on one blank screen (1), the short-list note
  refusing to stand down on the empty one (1), and **the original bug itself**,
  ranking the uncut set, which fails exactly the six assertions describing the
  cut and none of the direct-link ones. The rest are not individually
  break-proven, said plainly rather than left to be assumed.
