# 0078 — A harness owns its own lifecycle, and a transport failure is not a test failure

**Status:** Accepted.

**Date:** 2026-08-17

## Context

Ten real-browser checks share `tools/lib/browser.mjs`. Each launches headless
Chrome on a throwaway profile, drives a page over the DevTools Protocol, and
prints `OK — N passed, N failed`. They exist because unit tests had already
missed a leaked wake lock, a silent `init()` throw, a mistapped price and an
unsafe add-on.

Three separate faults surfaced within one day, and they only look separate.

**The harness leaked its own browser.** A check killed mid-run — a timeout, a
Ctrl-C, an agent giving up — left Chrome alive and reparented to `ppid=1`. Six
orphans pushed 1-minute load past 100, at which point a check does not fail: it
**stalls silently** on a CDP call and exits with no summary line, producing a
wall of PASS with no verdict. An agent then bisected across five arms plus a
control, every arm stalled identically, and it confidently concluded the check
could not run on this machine. It could not, because the orphans were running
underneath every arm.

**It leaked its profile directories far worse, and mostly on the happy path.**
189 unheld directories were measured in `$TMPDIR` on 2026-08-17 (2.6 GB an hour
earlier). 128 of them were `boot_check`'s. That was not an abnormal-exit
problem: `boot_check`, `to_top_check` and `filter_row_check` never removed
theirs **on a fully successful run** — 178 of the 189.

**It could not say which tree it had measured.** A session's shell cwd drifted
out of its worktree via one compound command containing a `cd`. Its edits used
absolute paths and were safe; its *verification* ran against a tree without the
change. Everything green, everything meaningless. It surfaced only because a
**passing** run reported 22 assertions where an agent had just said 25.

**And a broken transport reported itself as a broken product.** A 30-second CDP
timeout was caught by the same `catch` every check wraps its assertions in, and
rendered as `FAIL home: the filter bar is live` with exit 1 —
byte-indistinguishable from a real regression. Measured on a five-session
laptop: `boot_check` failed **2 of 4** runs and `recipe_check` aborted **4 of 8**,
every one of them that timeout.

## Decision

**A harness is responsible for facts about itself, and must never let a fact
about itself masquerade as a fact about the product.** Three obligations follow,
and all three live in `browser.mjs` rather than in the tools.

**1. It cleans up after itself, and says which half is reliable.** Registered
children and their profile directories are killed and removed on `exit`,
`SIGINT`, `SIGTERM` and `uncaughtException`. `SIGKILL` cannot be caught, so a
startup sweep removes unheld `faves-*-check-*` profiles as well. **The handlers
are the reliable half; the sweep is the opportunistic half**, and the code says
so in those words — presenting them as equals would overstate the cover.

**2. Its verdict names the tree it measured.** Every check prints a second
indented line carrying the served tree, that tree's `SHELL_VERSION`, and its
`branch@sha`. The `OK — N passed, N failed` first line is byte-identical,
because `CLAUDE.md` instructs readers to grep for it.

**3. A transport failure is a harness error, not an assertion failure.** A CDP
timeout aborts with `HARNESS ERROR — the browser stopped answering`, exit **2**,
and never prints a `FAIL` line carrying an assertion's name.

## Alternatives rejected

**Fix each tool where it leaks.** Rejected. `browser.mjs` exists precisely
because a second copy of a shared mechanism is a second place for a quirk to be
fixed once and missed once — and the profile-dir leak proves it: three tools had
the same happy-path bug, so a per-tool pass would have fixed it twice and missed
it once. It also makes the roadmap's premise true rather than working around it;
the item assumed `browser.mjs` already owned the summary, and it did not — all
ten hand-rolled the same tail.

**A distinct error class alone, without a latch.** Rejected on inspection: every
tool catches broadly by design and discards the exception's type, so a
`HarnessError` subclass would have been swallowed and re-rendered as `FAIL`
anyway. The latch is set in the error's constructor and read in `Report.check` —
the single funnel all ten tools' assertions pass through.

**A bounded retry on transport errors.** Rejected, and this is the one worth
recording. The proposal was defensible — retry the transport, never the
assertion — but **CDP calls are not idempotent**: re-issuing
`Input.dispatchMouseEvent` taps twice and `Page.navigate` reloads, so a
transport retry silently changes what the downstream assertion measures. That
is one step from running it again until green, which is the behaviour this repo
is trying to break. `FAVES_CDP_TIMEOUT_MS` gives a loaded machine rope instead.

**A sweep that only ever spares.** Rejected as untestable-in-the-direction-that-
matters. A cleanup guard that never deletes passes the "it spared a live run"
case trivially — a peer session shipped exactly that and found afterwards its
guard had been checking nothing, because a shell expansion produced junk. The
sweep here is proven to **discriminate**: with its age guard neutralised so the
process-table test stood alone, the same directory survived a sweep while its
check was live and was removed once its Chrome was killed.

## Consequences

A green run is now falsifiable in a way it was not. `OK — 24 passed, 0 failed`
against the wrong worktree is visible at a glance because three discriminators
differ — path, version and sha — where before it took someone noticing an
assertion count.

**Flakiness is relocated, not cured.** The timeout is in the transport, shared
by all ten checks, so it was never `cook_check`'s. The owner's CI ruling picked
`boot_check` because it "makes no timing assumptions" — true of its *assertions*,
and the timeout is in the *transport*, so a body with zero timing assumptions
inherits the flakiness anyway. What this record fixes is that a flake can no
longer impersonate a regression. The underlying contention stays open.

🛑 **`SIGKILL` still orphans both the browser and its directory, and always
will.** After a `kill -9`, run `pgrep -f 'user-data-dir=.*faves-'` before
believing what the next run tells you. This is stated rather than smoothed over,
because the failure mode is a *stall*, not a red — see
[ADR 0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md).

**And this is one more face of 0072.** A cleanup that guards nothing, a summary
that cannot tell two trees apart, and a timeout that prints an assertion's name
all share the property that record names: the output is the same whether or not
the thing being reported on is broken. The sharpest statement of it came from a
peer session on the same day — *the failure and the success produce identical
observable output, so the correct response and the wrong one are
indistinguishable* — and its cure generalises: **make the all-clear carry a
denominator.** Records swept, browsers reaped, checks attempted, tree measured.
"Nothing found" is unfalsifiable; "nothing found in 55" is not.
