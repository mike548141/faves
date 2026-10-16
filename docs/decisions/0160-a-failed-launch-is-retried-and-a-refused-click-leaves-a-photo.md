# 0160 — A failed browser launch is retried, and a refused click leaves a photo

**Status:** accepted
**Date:** 2026-10-16
**Follows:**
[0101](0101-a-click-waits-for-a-still-box-and-a-starved-wait-buys-one-whole-retry.md)
(the whole-check retry, and why a per-call retry is forbidden) ·
[0093](0093-one-place-decides-what-a-thrown-error-means.md) (one place
decides what an error means)

## Context

Roadmap `510/420` collected the flakes of 2026-10-02. Two of them are
about the browser harness rather than the site:

1. **CI's `every screen boots` job exited 2 with "timed out waiting for
   Chrome's DevToolsActivePort"**, three times: twice on 2026-10-02 and once on
   2026-10-16 (`62b9c1cf`, 20 s from "sweep" to the timeout, no Chrome stderr at
   all). Each was green on re-run. Chrome never started, so nothing can be said
   about the site, but the run is red and a person has to click re-run.
2. **`device_check` failed twice in ways nobody could explain** —
   `UNREACHABLE ELEMENT: #overflow-btn covered by #geo-dialog` and `UNSTABLE
   ELEMENT: #favourites-toggle has no clickable box` (0×0 after 2 s). Each
   passed on the next run. The message said what was measured but not what the
   page looked like, so the cause stayed a guess. ADR 0101 forbids retrying
   either (an unsettled or covered control is a defect a person would hit), so
   the only thing missing was evidence.

## Decision

**1. `launchChrome` starts Chrome a second time if, and only if, the first
never wrote its `DevToolsActivePort` file.** Exactly one more go. Before it, the
stuck Chrome is stopped and the profile directory is emptied (not removed: the
caller owns it), because a Chrome that died half way up can leave a
`SingletonLock` and a half-written profile that a second Chrome would inherit.
It keys on one condition (the port-file timeout, tagged on the error), not on
exit code 2: a missing binary, a transport death and an unclassified error all
still end the run on the spot.

**2. It is loud.** `↻ LAUNCH RETRY — …` before the second go, `↻ THE LAUNCH
RETRY WORKED` after it (a pass with a flake recorded, not a clean run) or `↻ THE
LAUNCH RETRY FAILED TOO` before the error is raised. Under GitHub Actions each
also prints a `::warning::` annotation, so it appears on the run's summary page
rather than only inside a log. A retry nobody can see is ADR 0072's decorative
guard pointed the other way.

**3. The wait is `FAVES_LAUNCH_TIMEOUT_MS` (default 20 000)**, a machine-shaped
knob like `FAVES_CDP_TIMEOUT_MS`; the same warning applies (never lower it to
make a run finish). The test shortens it.

**4. A refused click or scroll leaves evidence.** When `click` raises
`UnreachableElementError` or `UnstableElementError`, or `scrollTo` raises
`UnstableElementError`, the message gains a `page state:` line (visibility,
focus, open dialogs, the focused element, the URL and viewport) and the path of
a PNG from `Page.captureScreenshot`. The PNG goes to `$FAVES_SHOT_DIR` or the OS
temp directory; never `site/`, never the repo, and not the profile directory,
which the harness deletes on exit. The calls are *soft*: bounded at 8 s each,
and a timeout is an ordinary `Error` that cannot latch `transportBroken`, so
evidence about a verdict can never replace the verdict. A **hidden** page is not
screenshotted, because `captureScreenshot` waits for a frame that never comes;
the state line says `hidden` instead, which is itself the finding.

## Why in the library, and why not the alternatives

- **A retry in the CI job** (`node tools/boot_check.mjs || node
  tools/boot_check.mjs`) protects one check on one runner. Every other check,
  on a laptop, would keep failing the same way, and the code under test would
  not be the code that runs locally. It also cannot tell this failure from
  others: exit 2 is also an unclassified error and a dead transport, so it would
  re-run those, the "re-run until green" shape this repo keeps writing ADRs
  against.
- **The whole-check retry of ADR 0101** would work, but it restarts the process,
  the server and the profile for a failure that happens before any of them has
  done anything, and it needs a per-check flag to say "this one was a launch".
  The narrower tool is the right one.
- **A per-call retry** stays forbidden. This is not one: a launch that timed out
  has no page, no connection and no navigation, so there is nothing a second
  attempt could re-issue. That is the whole of the distinction, and it is why
  this is allowed where ADR 0078's is not.
- **More than one retry.** Two timeouts of 20 s in a row is a broken Chrome or a
  broken machine, and exit 2 is the correct word for that.
- **Capturing the screenshot in the retry path or on every failure.** Not
  needed: the two error classes are the ones whose cause was unknown, and a
  screenshot taken on every `FAIL` would write files on routine regressions.

## Consequences

- 🚩 **The retry hides one launch failure per run, by design, and shows it.** If
  the `::warning::` starts appearing weekly, the runner or the Chrome pin is the
  finding; the retry is then a bandage and the item to reopen is `510/420`.
- ⚠️ **Not proven: that a real Chrome which timed out once starts on its second
  go.** It rests on the three CI occurrences all being green on re-run. The
  mechanism is proven with a fake Chrome that hangs once, always and never
  (`tests/launch-retry.test.js`) and end to end with a wrapper that hangs the
  real Chrome's first start (`boot_check` ran on after both ↻ lines).
- The screenshot lands in the runner's temp directory on CI, which is discarded.
  Wiring `$FAVES_SHOT_DIR` to an artefact upload is a CI change and is not made
  here.
- Untouched: the exit codes, the retry rules of ADR 0101, `HarnessError`.
