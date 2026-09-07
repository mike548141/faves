# 0094 — A close before its open means the next day

**Status:** accepted. Reverses the third *Rejected* alternative of
`0006-hours-model-and-timezone.md` (which itself is amended by `0043`); 0006
otherwise stands.

**Amended by `0098-the-verdict-reads-the-wall-clock-the-countdown-counts-real-time.md`
(2026-09-08).** Two lines below are no longer accurate and are left standing
rather than rewritten. *Consequences*: **"counts down correctly to its real
close"** was true only away from a daylight-saving transition — on one it was
out by up to an hour in April and showed no countdown at all in September; the
countdown is now measured between absolute instants. *Known and not built*:
**"No DST coverage. Every fixture is NZST June."** was closed on 2026-09-07 by
roadmap `190/030` (`tests/hours-dst.test.js`, and the DST half of
`midnight_check.mjs`). Everything else here — the wrap, the week boundary, the
`served` dialect, the `validate.py` rules — stands unchanged, and the
open/closed verdict is still decided exactly as this record left it.

**Date:** 2026-09-07

## Context

`hours` could not express a close after midnight. `segments()` in
`site/js/hours.js` expanded the week into absolute minutes as
`start = base + o`, `end = base + c`, so `["16:30", "03:00"]` became a segment
running from minute 990 to minute 180 — **one that ends before it starts**.
Nothing rejected it. `openStatus` simply never found `now` inside it, so a venue
trading till 3am read **closed for the whole evening**, and `validate.py` hard-
errored on `c <= o` anyway, so the shape could not be written down.

ADR 0006 had considered and rejected this wrap in 2026-07, on two grounds: that
it "adds edge cases (a segment spanning the week boundary) to every
computation", and that "the dataset's only late-night venues use `null`
('late') anyway". The first ground was correct and is paid below. The second
was a fact about the corpus, and **Dragonfly falsified it on 2026-09-07** — its
real hours are Mon–Tue to 11pm, Wed–Thu to midnight, Fri–Sat to **3am**.

Until then the record carried a `null` close for Wed–Sat: a knowing
understatement, right for Wed–Thu (a null close caps at midnight for "is it open
now") and **understated by three hours** on Fri–Sat. The app told a reader
Dragonfly was shut at 1am on a Saturday while it was trading. Understating was
chosen over `"23:59"` (which fabricates a close the venue never stated) and over
`["16:30","03:00"]` (which was silently broken) — wrong in the direction that
sends someone home early rather than the direction that says a place is shut all
evening. This is the concrete instance of roadmap `340/150`, *"the corpus is
uniformly healthy, so a whole class of behaviour ships unexercised"*.

## Decision

**A close at or before its open means the NEXT DAY.** Owner-ruled 2026-09-07,
put to him with three options, their costs and a recommendation. In
`segments()`:

```js
end: base + (c == null ? 1440 : c + (c <= o ? 1440 : 0)),
```

`closeMin` still carries the **wall-clock** close, so "until 3am" is read off
the data rather than off the wrapped arithmetic.

**The condition he approved carries a binding caveat: it changes the meaning of
data already on disk, so every existing record had to be checked for a span
that would newly wrap — verified, never assumed.** The item's own text predicted
there were none; a prediction is not evidence. **Measured 2026-09-07, before the
change landed: 155 JSON files across both stores, 72 `hours`/`served` blocks,
957 time strings (all valid `00:00`–`23:59`), 507 `[open, close]` spans — of
which 0 would newly wrap.** The latest close anywhere in the corpus was 23:00.
The sweep was positive-controlled against synthetic records of each shape it
must reach (venue `hours`, per-branch `hours` under `locations[]`, section
`served`, a `close == open` pair, and a deeply nested block) before its zero was
believed. The corpus now holds four wrapping spans, all Dragonfly's.

**Three consequences that are not the formula, and each of which fails on its
own:**

1. **The week boundary.** A span wrapping out of *Saturday* ends past the last
   minute of the week — Sat 16:30–03:00 runs to absolute minute 10260 where the
   week is 10080 long. Sunday 1am is minute 60, not 10140, so direct containment
   cannot see it. `containing()` therefore asks twice, the second time a week
   later. **This is exactly the edge ADR 0006 named**, and a fix without it
   passes every other assertion while failing the venue on its busiest hour.
2. **The countdown.** `left` is measured against the *wrapped* end via the
   coordinate `containing()` returns; the naive subtraction yields
   "Closes in -1315 min".
3. **`served` wraps too.** A section's window feeds the identical
   `segments()`, so allowing the wrap in `hours` and refusing it in `served`
   would leave one engine reading two dialects.

**Dragonfly's Wed–Thu "to midnight" is written `"00:00"`, not `null`.** Under
this rule `"00:00"` wraps to exactly the end of the day, which is what the venue
said. It is strictly better than the `null` it replaces: `null` also caps at
midnight but deliberately shows **no countdown**, because it means "we do not
know when it shuts" — and we do. It is better than `"23:59"`, which invents a
close and is a minute short. This is a **correction** (we recorded it wrong),
not a change by the shop, so it overwrites and appends no history (ADR 0047).

**`TIME_RE` is unchanged.** The wrap is carried by the pair, not by a new
notation. What did change in `validate.py`:

- `c < o` is legal and means the next day; the old hard error is gone.
- `c == o` **stays a hard error**. The formula makes it a 24-hour span, but
  nobody writes a day that way on purpose and a reader cannot tell it from a
  typo; both unambiguous spellings already exist.
- A **wrapped** span longer than **16 hours** is a warning. The risk this
  ruling introduces is a *transposition* — `["23:00","16:30"]` for
  `["16:30","23:00"]` used to be a hard error and is now silently a 17½-hour
  trading day. The threshold is measured, not invented: the longest closed-ended
  span in the corpus on 2026-09-07 was 15h30 (kaffee-eis, Fri 07:30–23:00).
  A warning rather than an error, because a genuinely long night is possible and
  the validator cannot know.
- `overlapping()` now compares **minutes, not strings**. The lexical form was
  right while every close followed its open and is wrong the moment one wraps:
  `[["16:30","03:00"], ["20:00","22:00"]]` is a real clash that the string sort
  put apart and never saw, because `"20:00" < "03:00"` is false.
- The `served`-after-venue-close **warning** compares in minutes for the same
  reason. Against a venue trading 16:30–03:00, `"22:00" > "03:00"` is true as
  text, so a section served squarely inside opening hours was warned about as
  being served after close — a false warning on the one venue the feature was
  built for, which is how a warning stream stops being read.

## Rejected

- **`"24:00"`–`"29:59"` as explicit next-day notation.** Unambiguous and
  self-documenting, and it needs no week-boundary reasoning at the point of
  authorship. It loses on cost and blast radius: it changes `TIME_RE` and every
  consumer of the string form — `formatDay`, `formatTime`, `openIsStated`,
  the Python mirror, and any future reader that assumes a valid clock time.
  **Declined by the owner, 2026-09-07.** Recorded so it is not re-proposed.
- **Leave it and accept the understatement**, documenting the cap in the venue
  record so nobody "fixes" it to `03:00` and breaks the evening. Cheapest, and
  it keeps the model honest at the cost of telling readers a trading venue is
  shut. **Declined by the owner, 2026-09-07.** Recorded so it is not
  re-proposed.
- **Emitting the wrapped tail as a second segment at the start of the week**
  rather than re-asking containment. It removes the second loop, but the tail
  segment then carries a `start`, a `dow` and an `openMin` that are not a real
  opening, and the "next opening" search would offer it as one. Two loops in one
  private function is the smaller cost.

## Consequences

`hours` and `served` can both express a close after midnight; a venue trading
till 3am now reads **Open · until 3am** at 1am, on the menu page and on the home
card, and counts down correctly to its real close. `groupWeek` needed no change
— it formats the raw strings, so "4:30pm–3am" and "4:30pm–12am" fall out.

**Guarded by `tools/midnight_check.mjs`** (new): a real browser at 390 px on a
clock frozen at six fixed instants, asserting the rendered badge on **two**
render paths (`menu.js hoursRow`, `app.js hoursBadge`), with the Sunday
week-boundary case asserted separately and a **control venue that closes at
23:00 and must read Closed at 1am** — without which a change making every venue
read open would pass everything else. 34 assertions. Plus 11 unit tests in
`tests/hours.test.js`.

**Both halves were verified by reintroducing the bug.** Restoring
`end = base + c` fails 8 unit tests and 9 browser assertions, every one naming
the wrap, and no control assertion. Deleting *only* the week-boundary re-ask
fails exactly 2 unit tests and 3 browser assertions, all naming Sunday, and
nothing else — so the boundary handling is independently load-bearing rather
than decorative (ADR 0072).

**Known and not built, recorded rather than guessed at:**

- **Cross-day overlap.** A span wrapping out of one day can overlap the *next*
  day's early window (Fri 16:30–03:00 against Sat 01:00–02:00). `overlapping()`
  is handed one day at a time and cannot see it. No record in the corpus has the
  shape; building it needs a different signature.
- **No DST coverage.** Every fixture is NZST June. A wrapped span crossing the
  NZDT switch in late September is untested ground.
- **`midnight_check` does not run in CI**, like thirteen of the other fourteen
  browser checks. It runs when a person types it.
