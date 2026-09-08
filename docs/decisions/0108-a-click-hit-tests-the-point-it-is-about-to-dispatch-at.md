# 0108 — A click hit-tests the point it is about to dispatch at

**Status**: accepted • **Date**: 2026-09-09

## Context

Roadmap `340/190` (a) has been open since 2026-09-07: `picks_check.mjs` fails
intermittently on a pristine baseline with `#settings-btn has no clickable
box`. Its history is a sequence of confident wrong diagnoses — a bisect that
blamed a new `menu.js`, then a re-read that blamed an animation. [ADR 0101]
made `driver.click` wait for a still box on 2026-09-08 and measured that it
did **not** cure this one, correctly reporting `anims: 0`.

Measured here on 2026-09-09, in the failing click itself. `driver.click`
already scrolled its target into view with `behavior: "instant"`, and that
scroll **works**: the trail's first sample reads `scrollY 0` with
`#overflow-btn`'s centre at viewport `y = 40`. **One animation frame later the
page has moved to `scrollY 51` and the centre is at `y = -11`** — above the top
of the screen. Two frames agree there, so the settle loop calls the box stable,
and the click is dispatched at **(350, -11)**. Nothing is at a negative
coordinate. The ⋯ menu never opens, and the failure surfaces one line later as
`#settings-btn has no clickable box` — the wrong element, the wrong line and
the wrong cause.

```
[trail #overflow-btn] settled@25.9ms f2 -> dispatch (350.0,-11.0)
[{"f":0,"ms":0,"sy":0,"y":40,"w":48},{"f":1,"ms":11.2,"sy":51,"y":-11,"w":48},
 {"f":2,"ms":25.9,"sy":51,"y":-11,"w":48}]
[probe after overflow click] {"scrollY":51,"btn":{"t":-35,...},
 "expanded":"false","menuHidden":true,"menuDisplay":"none"}
```

Whether the run passes or fails is decided by that one number: the page settles
at 23 (centre `y = +17`, the click lands, green) or at 51 / 79 (centre `y = -11`
/ `-39`, the click misses, red).

🔎 **What moves the page was measured, and it is not the site.** `window.scrollTo`,
`Element.prototype.scrollIntoView` and `HTMLElement.prototype.focus` were all
monkey-patched for the whole sequence: the only entry recorded is the harness's
own `scrollIntoView`, followed by a bare `SCROLL-EVENT`. The document's height
does not change across the frame, and no `.toast` appears or disappears. It is
reproducible on demand and one-shot — from `scrollY 547`,
`scrollTo({top: 0, behavior: "instant"})` lands at 0 and is at 51 on the next
frame and stays; a *second* identical scroll from 51 lands at 0 and **holds for
twelve frames**:

```
[{"phase":"after scrollTo(0) sync","sy":0},{"f":0,"sy":51},…,{"f":11,"sy":51},
 {"phase":"after siv sync","sy":0},{"g":0,"sy":0},…,{"g":11,"sy":0}]
```

⚠️ **Scroll anchoring was the obvious explanation and it is ruled out.** With
`*, *::before, *::after { overflow-anchor: none !important }` injected, the
bounce is unchanged (0 → 23, 0 → 51). **The Chrome mechanism responsible is not
identified**, and this record does not pretend otherwise. It does not need to
be: the fix asks about the *outcome* — can this point be clicked? — not about
the cause.

🔑 **The gap [ADR 0101] left is a category, not an oversight.** Its wait asks
whether the box is *still*. A box eleven pixels above the viewport is perfectly
still and is 48 × 48, so both of its conditions hold. **Stillness and
reachability are different questions and only the first was being asked.**

## Decision

**1. After the box settles, `click` hit-tests the point it is about to
dispatch at.** In the same `Runtime.evaluate` the click already makes, so the
CDP round-trip count is unchanged (the constraint [ADR 0101] set): is the centre
inside the viewport, and does `document.elementFromPoint` there return the
target or a descendant of it? A descendant counts — clicking the `<span>` inside
a button reaches the button by bubbling. **An ancestor does not**: if a
control's own centre hit-tests to its parent, the control is not painted there
and its handler will not run.

**2. An off-screen target is re-scrolled, up to three goes, inside the one
existing budget.** Two is what the measured fault needs. `FAVES_CLICK_SETTLE_MS`
(default 2000) bounds the *whole* call, not each attempt, so the worst case is
what it was before — three two-second waits would have turned a bounded wait
into a six-second one.

**3. A covered target is reported immediately and is NEVER scrolled away
from.** This is the half that matters most, and it is the reason the two cases
are separated rather than both retried. A control a person cannot tap because
something is painted over it is precisely the defect `to_top_check` exists for —
the back-to-top button owning the tap on a dish price at 100% of its width. A
harness that quietly moved the page until the overlay stopped covering the
target would convert that defect into a green run **in seventeen tools at
once**. So `covered` fails on the spot, naming what is on top, with its
`position` and `z-index` — the two properties that put it there.

**4. Both failures are claims about the SITE: `UnreachableElementError` →
`FAIL UNREACHABLE ELEMENT`, exit 1, not retried.** This is the classification
question roadmap `340/190` (a) held open, and it is answered the same way
`210/070` answered its neighbour: *a control that cannot be reached is a defect
a person would hit.* It is not retried for the same reason `UnstableElementError`
is not — the harness has already scrolled at this target and re-measured, so
what is left is the page, not the machine. `HarnessError` is untouched at
exit 2.

**5. A click whose selector matches nothing now raises
`MissingElementError`.** It was a plain `Error`, so `exitFromError`'s fallback
sent it to **exit 2 with no `FAIL` line** — the exact shape `340/190` filed.
`need()` has classified this since 2026-08-17; the click path had been missed.

**6. `exitFromError`'s fallback stays at exit 2, deliberately.** The item asked
whether it should change. It should not: an *unclassified* throw says nothing
about the site, and writing it down as a site claim is the error [ADR 0093]
exists to prevent. What changes is that **no geometry or presence failure
reaches the fallback any more** — the fallback's job is now only the genuinely
unknown.

**7. Every run reports whether it had to scroll twice**, on the same third line
[ADR 0101] added, and `clickStats` is exported so a check can assert on it:

```
clicks 6 · 5 still on the first frame, 1 waited · 272ms total,
worst 158.1ms (…) · 1 re-scrolled (worst 2 goes at #overflow-btn)
```

🛑 **The zero is printed too.** `0 re-scrolled` is the sentence that says every
control was reachable where it was first put. A silent mechanism that scrolls
until clicks land is [ADR 0072]'s decorative guard pointed the other way, and
the line going quietly non-zero is how that would start.

## Consequences

**The measured cure, paired and interleaved** — base (`efb7272`, this branch's
own parent, so the change is the only variable) alternating with the branch,
ten each, zero orphan Chromes at every sample:

| arm | failures | shape |
|---|---|---|
| base | **5 / 10** | `FAIL UNSTABLE ELEMENT — #settings-btn has no clickable box` |
| branch | **1 / 10** | `FAIL UNREACHABLE ELEMENT — #overflow-btn is covered…` |

⚠️ **The machine was NOT quiet: 1-minute load ran 29–85 across the block.** The
direction is not in doubt — the base arm's five failures are the documented
fault, and the branch's zero occurrences of it are the point — but the *rates*
are load-inflated and should not be quoted as the quiet-machine numbers. On the
quieter samples the branch ran **41 consecutive passes** (11 + 30) with the
re-scroll firing and being reported.

🚩 **One residual, unexplained, and stated rather than buried.** The branch's
single failure was a **covered** verdict on `#overflow-btn` — a shape never seen
before this change existed to see it. It has not reproduced in 30 subsequent
runs, and **what was covering the button is not known**: the message named it,
and the measuring loop truncated the line at 70 characters. That is a
self-inflicted loss of the one observation that mattered, and the diagnostic
now carries `position` and `z-index` so the next one is actionable. Until it
recurs there is no way to say whether it was a real overlay or a false positive
of this check, and this record claims neither.

**No false positives across the rest of the family.** All seventeen checks pass
on the branch, and the other tools' **261 clicks** report `0 re-scrolled` and
raise no reachability failure — so the strict "descendant yes, ancestor no" rule
does not break any existing call site.

**Break-probed both halves, verbatim.** The re-scroll capped at one go:

```
FAIL  UNREACHABLE ELEMENT — #overflow-btn could not be brought into the
viewport: after 1 scrolls at it its centre is (350.0, -11.0) in a 390x844
viewport (scrollY 51). A control that will not scroll into view is one a
person cannot reach.
```

4 of 6 runs, exit 1 — the old fault, now naming the right element and the right
cause. And a fixed overlay laid over the page:

```
FAIL  UNREACHABLE ELEMENT — #overflow-btn is covered at its own centre: it
settled to a 48.0x48.0 box, but a click at (350.0, 40.0) would land on
#probe-overlay (fixed, z-index 99999) instead. Something is painted over a
control this check presses, which is a tap a person would also miss.
```

Exit 1, and it did **not** re-scroll to escape the overlay.

🔎 **Sixteen in-page `.click()` call sites are outside all of this**, across
`boot_check` (8), `device_check` (2), `focus_check` (2), `sync_check` (2),
`geo_check` (1) and `filter_row_check` (1). `HTMLElement.click()` dispatches
straight to the element with no hit test, so those sites can never suffer this
fault — and can never detect a covered control either. Left alone: converting
them to real clicks would change what they assert, which is a separate decision.

**This is not a product bug**, and the evidence is what says so rather than an
opinion. The page runs no scroll code at the moment in question, the header is
not sticky, and the drift is 23–79 px on a 844 px viewport. A person scrolling
with a thumb sees where they land and taps the button; only a program that reads
a coordinate, waits, and then dispatches at the remembered value can be caught
by it.

[ADR 0072]: 0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
[ADR 0093]: 0093-one-place-decides-what-a-thrown-error-means.md
[ADR 0101]: 0101-a-click-waits-for-a-still-box-and-a-starved-wait-buys-one-whole-retry.md
