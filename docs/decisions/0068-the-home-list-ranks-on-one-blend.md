# 0068 — The home list has one ranking, and distance is in it

**Status:** Accepted — design ratified, **code not written**. See "Not built here".
**Superseded in part (added 2026-08-17):** item 4 (the on-load prompt) is
superseded by [0069](0069-the-location-ask-is-primed-not-sprung.md); items 1–3
stand untouched.

**Date:** 2026-08-16

## Context

The owner, looking at the home screen on 2026-08-16: *"I also don't see the need
for the nearest first sort by button. The restaurants are already sorted by
closest first with weighting for being open, close, a favourite etc. Remove
nearest first removes the need for the sort section of the filters altogether."*

The premise was checked before acting on it. It is wrong — but wrong in a way
that took three readings to state accurately, and acting on it in either
direction without checking would have shipped a defect. The checking is as much
the point of this record as the decision is.

**What the code does.** `rankVenues` has two branches, chosen by whether an
`origin` was supplied:

```js
if (origin) {                                   // "Nearest first"
  return cmp(a.dist, b.dist) || byAvailability || a.i - b.i;
}
return byAvailability || byEffective || tail;   // default
```

The **second** branch is almost exactly the algorithm he described from memory:
availability first, then a distance in which a favourite counts as nearer
(`effective = dist - (isFav ? favBoostKm : 0)`), then a curated tiebreak. So the
blend he remembered **is built**, and has been since 2026-07-08 (`702c572`).

It has also never once run. `state.origin` is `null` at initialisation and is
written in exactly one place — inside `withOrigin()`, reachable only from the
sort `<select>`'s change handler, which holds the only `getCurrentPosition` call
in the codebase. `git log -S` confirms neither has ever lived anywhere else. So
in the default order `origin` is always `null`, every venue's `effective` is
`Infinity`, and the distance term is inert. **Distance has never participated in
the default home order, in the whole history of the project.**

**Three findings that changed the shape of the fix.**

1. **The favourite credit is 10 km, not "a few hundred metres".** His
   recollection was *"where distance is similar (say a few hundred metres) the
   favourite would push one restaurant above another"* — a near-tie breaker.
   `FAV_BOOST_KM` is **10**, and the commit that introduced it says what it
   meant: *"a favourite 8 km away beats a plain place 2 km away."* That is a
   strong preference weighting, not a tiebreaker. Wiring `origin` through
   without touching it would ship a list where a hearted venue across town
   outranks the shop next door, and it would read as simply broken. The gap
   between the 10 km that was built and the few hundred metres he remembers
   asking for is **discussed nowhere in the repo**; neither number was ever
   challenged.
2. **`favBoostKm` cannot carry the tiebreak, because it is no longer a favourite
   dial.** On 2026-07-23 (`e65632a`) it was repurposed as the **branch-proximity
   cutoff** for multi-location venues, which is what Settings now labels it
   ("Show branches within"). The storage key was kept so saved values would not
   reset, and `settings.js` already carries a `#!##` marker saying the name is a
   lie in both directions. Re-tuning it to 0.4 km for the ranking would silently
   break every chain's menu page.
3. **The 2026-07-23 "pure distance" ruling was scoped to Nearest-first only**,
   and said so in the applying commit: *"Default (no-location) order unchanged."*
   So it is no obstacle here. But it **has no verbatim owner quote**, unlike the
   three rulings recorded beside it, and the question that produced it was put
   as a yes/no about Nearest-first. He was never asked about the default order.
   Read it as narrow, because narrow is all it was ever asked.

**And there was no ADR for ranking at all.** All 68 existing records were
checked; none covers home-list ordering. The only specification lives in commit
messages, `ROADMAP-DONE.md` and `SESSIONS-ARCHIVE.md`, every line of it in a
scribe's voice rather than the owner's. That absence is how a design he
remembers agreeing to could sit 10 km wide of what he meant with nothing
anywhere to catch it. This record closes the gap.

## Decision

**1. One ranking, and no sort control.** "Along a route" is removed outright —
its suburb-centroid detour estimate is a proxy poor enough to mislead
([ADR 0014](0014-pick-along-a-route.md), now superseded). "Nearest first" is
removed because it becomes redundant. With both gone the `<select>` has one
option left, so the SORT BY group goes with it.

**2. The one ranking is his, in his order:**

> reachable → **open or opening soon** → **distance** → **favourite breaks a
> near-tie** → curated

which is the existing default branch, finally given an `origin`. Note the order:
availability leads, distance follows. That is the *opposite* of the retired
Nearest-first branch, deliberately — a closed shop 200 m away is not a better
answer than an open one at 900 m.

**3. The favourite is a tiebreak, at a tiebreak's size.** A new constant,
separate from `favBoostKm` (which keeps its branch job and its 10 km), set to
**0.4 km**, applied by **bucketing rather than subtraction**:

```js
const bucket = dist === Infinity ? Infinity : Math.round(dist / FAV_TIE_KM);
// … a.bucket - b.bucket || a.favTie - b.favTie || cmp(a.dist, b.dist)
```

Subtracting a credit is what produced the 10 km problem, and it cascades: a
favourite is *always* pushed ahead of anything inside the credit. Bucketing says
what he actually said — *where the distance is similar, prefer the favourite* —
and nothing more. Two venues in the same 400 m band tie and the heart breaks it;
outside the band distance wins and the heart cannot touch it.

**4. Location is requested on the home screen, and refusal is silent.** This is
the change with teeth: Faves has never asked for a permission unprompted. If
granted, the list ranks as above. If refused or unavailable, it falls back to
exactly today's order (availability → favourite float → curated) with no error,
no nag and no second ask.

## Consequences

- **The filter row loses a whole control**, which is most of the visible win.
- **Faves shows a permission prompt on first visit.** A real cost, taken
  knowingly by the owner over the alternative of a distance feature nothing ever
  offers. 🚩 The known risk: an unexplained geolocation prompt on load is the
  classic route to a *permanent* denial, and a denial is far harder to undo than
  an ungranted permission. If the deny rate looks bad in use, the fix is a
  priming affordance **before** the prompt, not moving the prompt.
- **[ADR 0045](0045-prices-convert-and-localisation-can-follow-you.md)'s
  principle still holds and must keep holding.** It refused geolocation for
  currency because *"turning a permission granted for one purpose into a second,
  unasked-for use is a bad trade."* The permission is still requested for
  ranking and used for ranking, and becomes a licence for nothing else.
- **`ARCHITECTURE.md` is stale and must be corrected with the build.** Its
  current-truth section still describes pre-2026-07-23 behaviour
  ("favourite-boosted distance → availability"), which stopped being true when
  `9a4ed78` landed and was never updated. A current-truth file that is wrong is
  worse than one that is silent.
- **`FAV_BOOST_KM` keeps its 10 km and its branch job.** Renaming it needs a
  `store.js` migration and is out of scope; the `#!##` marker stays.

## Not built here, and why

The design is ratified; the code is not written. The reason is specific rather
than a shortage of time: **item 4 is the first unprompted permission prompt in
this app's history**, and a new trust surface begun at the tail of a long
session is how a half-built one ships. The same call was made about the timer's
alarm (ROADMAP 36d) on 2026-08-16, for the same reason.

What a fresh session picks up: the four decisions above; `ranking.js` needing
only its two branches collapsed into one; a new `FAV_TIE_KM` in `defaults.js`;
the `getCurrentPosition` call moving out of `wireLocation()` to load; and
`ARCHITECTURE.md`'s ranking paragraph rewritten to match. `tests/ranking.test.js`
is the guard — it is pure, and the bucketing rule is exactly the kind of thing it
can pin before any of this reaches a browser.

## Rejected

- **Removing "Nearest first" literally, as asked, and accepting the loss.**
  Smallest change and cleanest filter row, and it would delete the only mode in
  which distance does anything — leaving an app that knows every venue's
  coordinates and never uses them. Put to the owner as an option and declined.
- **Blending, but only using a permission already granted.** No new prompt, and
  therefore no new prompt to grant: nothing would ever ask, so distance would
  exist and never appear. Put to the owner and declined.
- **Re-tuning `favBoostKm` to 0.4 km.** Would serve the ranking and break the
  branch list on every chain's menu page, because the constant has two jobs and
  one name. Finding 2 above.
- **Keeping the subtraction and just making it smaller.** Still cascades, and
  still makes "how much nearer is a heart worth" a number someone has to feel
  their way to. The bucket asks a question that has an answer: *is this the same
  sort of distance away?*
