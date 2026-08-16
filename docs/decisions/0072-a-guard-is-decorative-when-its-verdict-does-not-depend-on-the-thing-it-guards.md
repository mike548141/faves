# 0072 — A guard is decorative when its verdict does not depend on the thing it guards

**Status:** Accepted.

**Date:** 2026-08-16

## Context

This repo keeps finding the same defect wearing different clothes, and until now
there was nothing to point at — only prose in `CLAUDE.md`, a note in a memory,
and a trail of session logs. By 2026-08-16 the count was **ten**, across two
repos, and three separate sessions hit fresh instances **on the same day**, in
parallel, without knowing about each other. Three occurrences is where a pattern
stops being a coincidence.

The instances are not variations on one bug. They are structurally different
mechanisms that share one property, and it took collecting them side by side to
see what the property is.

## Decision

**A guard is decorative when its output is the same whether or not the thing it
guards is broken.** That is the test. It is cheap to apply, it does not require
knowing why the guard was written, and every instance below fails it.

Twelve faces, all observed in this repo or its parent, over a single day of
parallel work plus the trail behind it:

**1. It always fires.** The atelier drift check hard-coded a baseline that was
never bumped with the pin. It had fallen 31 commits behind, so it reported 40
commits of which 31 were already read. A check that always fires is a check
nobody reads. *(Fixed by deriving the baseline from the pin, so the two are
incapable of diverging.)*

**2. It can never fire.** [ADR 0069](0069-the-location-ask-is-primed-not-sprung.md)
found that ADR 0068's safety valve — "prime the ask if the deny rate looks bad" —
has a trigger nothing can observe, because the app ships no telemetry at all. The
revisit resolves to never. **A deferred decision whose trigger nothing can
observe is not deferred; it is taken, silently** — which makes this a doctrine
problem rather than a bug.

**3. It answers a different question than the one it is read as.**
`tools/check_versions.py` in its bare form reads only *staged* changes, so on a
clean tree it says "not in scope". That reads as a pass. Two sessions collided on
a version the bare form called clean. *(The `--range origin/main..HEAD` form is
the one that answers the question people think they are asking.)*

**4. It declines, and reports the decline as success.**
`tools/tag_allergens.py` patches `tags` positionally, matching every `"tags"`
array in the raw file text, and bails when the count does not equal the item
count. **7 of 55 files** cannot be written. It prints `SKIPPED (not written)` and
exits 0. This face is the most dangerous of the six, because a green run does not
merely fail to warn you — it looks exactly like a clean sweep of the whole corpus.

🔑 **And measurement said something reasoning had not: the decline is correlated
with the need.** The first diagnosis found six files and attributed all of them
to add-on options carrying their own `tags` (the count comes out too HIGH). A
peer session then measured the corpus and found a seventh with no add-ons at all,
breaking the other way — six of its 87 items carry no `tags` key, so the count
comes out too LOW. On that file the two tags the tool identified and then failed
to write were **both on items with no `tags` key**. An item with no tags array is
simultaneously the most likely to be missing a tag *and* the thing that makes the
entire file unpatchable. So the decline is not randomly distributed across the
corpus: it concentrates on exactly the records the tool exists to protect. A fix
aimed only at the first cause would have left the seventh file just as broken and
been reported as done.

**5. It runs correctly, and is pointed at the wrong target.** A session's shell
working directory drifted from its worktree back to the primary checkout, via one
compound command containing a `cd`. Its file edits used absolute paths and were
safe; for a stretch its **verification** ran against a tree that did not contain
the change. Everything green, everything meaningless.

**6. It is a claim, not a check, and its truth lives outside the author's
reach.** A record that says "the first X in Faves' history" is not a claim about
the change — it is a claim about *every other change*, including ones being
written in parallel that the author cannot see. Two sessions each wrote it on the
same day for different features. It cannot be verified from inside the repo, and
it rots without anybody touching the file it sits in.

**7. It runs, and nothing ever calls it.** `.github/workflows/ci.yml` runs
`node --test` and the Python gates and **none of the eight headless-browser
checks** — not `sync_check`, `cook_check`, `device_check`, `boot_check`,
`addon_check`, `branch_check`, `to_top_check` or `filter_row_check`. Every guard
in this repo written *because* unit tests missed something real runs only when a
human types it. That is how `sync_check.mjs` stayed dead through an entire
refactor. 🔑 **The cheap guards that catch the least are automated; the
expensive guards that catch the most are on the honour system.**

**8. Its own bug manufactures a plausible finding, and somebody acts on it.**
`sync_check.mjs` reported an overflow-menu race that read as a real product
hazard — two sessions wrote it down as real and one claimed a roadmap item partly
on its strength. Both causes were in the check: `window.scrollTo(0, 0)` (the
two-argument form) obeys `app.css`'s `html { scroll-behavior: smooth }` and
returned mid-animation, which is the whole of the mysterious *"scrollY:879 then
scrollY:0"* trace — one unfinished scroll, not a second scroller; and scrolling
to the top made an IntersectionObserver drop `body.contact-bar-open` a frame
later, so the click's rect went stale between read and dispatch. Nothing in
`site/js/` changed to make it pass. **A guard that manufactures false findings
costs more than one that finds nothing, because someone acts on it.** ⚠️ Honest
residue: one of the three original observations — `aria-expanded` reporting two
open/close cycles from one click — never reproduced. Unexplained, not disproved.

**9. It passes before it has gone anywhere.** The *replacement* assertion written
for face 8 was itself dead: `!!document.querySelector(".sync-body")` passes on
the index screen, because `sync-ui.js` builds that node once at construction and
the panel merely un-hides it. A guard that passes before you have navigated
anywhere is not checking navigation. It now requires a laid-out box.

**10. Two sessions read one output and misattribute the same blocker.** Two
sessions independently concluded `pathscan` had been promoted from warn-only to
enforced, because a `✗ pathscan: N finding(s)` line appeared above a failed
commit. It had not. The blocker was `sizescan` both times — cold-content once,
harvest-integrity the second — and its `BLOCKED by:` line sat further down the
same output. **Both of us acted on the wrong mechanism, and one of us renumbered
an ADR that did not need renumbering because of it.** A gate that prints every
scanner's findings and its own verdict in one stream invites this: the ✗ that
catches the eye is not necessarily the ✗ that stopped you. 🔑 **A guard that
reports honestly can still be read wrongly, and two people reading it wrongly
the same way is not evidence.** The fix is on the reporter — name the blocking
gate where the reader is already looking, not thirty lines below.

**11. It is flaky, and flakiness defeats the rule we rely on.** `cook_check`
returned 75/0, **73/2**, 75/0, 75/0 across four runs of one unchanged commit,
and `Runtime.evaluate` / `Input.dispatchKeyEvent` timeouts on two more under
parallel load. This repo's discipline is *"a wall of PASS followed by an error is
not a pass — read the summary line"*. Flakiness beats that rule **specifically**,
because the summary line is present and says FAILED, and the correct response to
a flake is indistinguishable from the wrong response to a real regression: run it
again. It went green. That is the trained behaviour. ⚠️ And it binds with face 7:
a check too flaky to gate CI is also too flaky to trust when typed by hand, so
"leave them manual" quietly assumes the manual runs are believed.

**12. `git add -A` is not file-scoped, so disjoint file ownership does not make a
shared worktree safe.** Two agents on disjoint files in one worktree; one ran
`git add -A` and swallowed 101 lines of the other's in-progress work into its
commit. Nothing was lost and the tree stayed consistent — the *attribution* was
wrong, which is the kind of damage no gate looks for. The author of this record
did the same thing in the same session, sweeping a new tool and a changelog into
an ADR commit. Either one worktree per agent, or forbid `-A` in the brief.

**10. Two identical values do not conflict — they absorb.** A session bumped
`SHELL_VERSION` to `.88` while `main` independently moved to `.88`. A rebase does
not conflict on that; it **absorbs** it. The constant then reads exactly the
number its author intended *and is unbumped relative to `origin/main`*, which
makes the service worker skip the shell cache and leaves installed phones on the
old files, with CI green. Only `check_versions.py --range origin/main..HEAD`
caught it. This is face 3 with the safety catch removed: the guard that answers
the right question exists, and the one people reach for by default does not.

## Consequences

**Three practical rules follow, and they are the useful part.**

**A guard must be able to distinguish "I checked and it is fine" from "I did not
check".** Faces 1–4 all collapse those two states into one output. `SKIPPED` and
`OK` must not both exit 0; "not in scope" must not read like a pass. Where a tool
genuinely cannot check something, that is a **non-zero** outcome or a loud line
in its summary, not silence.

**A verdict is worthless without the identity of what it checked.** Face 5 was
caught by nothing in the repo — it surfaced only because a *passing* run reported
22 where an agent had just reported 25, and someone looked at a discrepancy
between two greens. So a check that reports PASS should also report what it
checked: its tree, its version, its count. Those are what you compare. The word
PASS is not.

**And that rule wants a mechanism, not a discipline.** The session that hit face
5 had the identity available the whole time — `pwd`, one command — and never
asked for it, *because a PASS does not prompt you to*. Nobody interrogates a
green run. So the concrete thing this record should cause is that the
headless-browser harnesses under `tools/` print the tree they served and the
version they ran against in their own summary line, so `OK — 25 passed` becomes
an artefact that carries its own provenance, and a wrong-tree run is then
visible to everyone who reads the output rather than only to whoever happens to
compare two numbers. Recorded here and queued on the roadmap; not built by this
record.

**A guard that is not automated is not a guard.** Face 7 is the structural one
and it undercuts the other nine: a check nobody runs cannot fail, so its output
is trivially the same whether or not the thing it guards is broken. Before adding
a check, say what will call it. Before trusting one, check that something does.

**Most instances were found by a peer, not by the author.** Face 2 was found
reviewing someone else's ADR; face 4 while reading a tool for a different reason
and then corrected by a third session's measurement; face 5 by comparing two
agents' counts; faces 7–10 by three sessions that only discovered they
overlapped because a fourth noticed they had answered the same broadcast. This
is the reason to write the record at all: the author of a decorative guard is,
by construction, the person least able to see it — they are looking at the thing
it guards, which is fine.

**This record is itself subject to its own test.** It is a checklist, not a
check: nothing executes it. It earns its place only if someone reaches for it,
which is why it is short, why the test is one sentence, and why the faces are
named rather than described.

## Rejected

**A lint that detects the pattern.** The faces are mechanically different — a
stale constant, an unobservable trigger, a scope default, an exception handler, a
CI omission, a selector that matches too early — and faces 5 and 6 are not in the
code at all. Anything general enough to catch them all would fire constantly,
which would make it face 1.

**Leaving it as prose in `CLAUDE.md`.** That is where it lived for ten instances,
and every session rediscovered it. Prose in an instruction file is read once at
session start and is not something anyone points at in review; a numbered record
is.

## What this record does not do

It does not tell you whether a given guard is decorative. Applying the test still
needs someone to ask "what would this output if the thing were broken?" — and
that question is only ever asked by somebody who is not busy being right.
