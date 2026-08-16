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

Six faces, all observed in this repo or its parent:

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

## Consequences

**Two practical rules follow, and they are the useful part.**

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

**Two-thirds of the instances were found by a peer, not by the author.** Face 2
was found reviewing someone else's ADR; face 4 while reading a tool for a
different reason; face 5 by comparing two agents' counts. This is the reason to
write the record at all: the author of a decorative guard is, by construction,
the person least able to see it — they are looking at the thing it guards, which
is fine.

**This record is itself subject to its own test.** It is a checklist, not a
check: nothing executes it. It earns its place only if someone reaches for it,
which is why it is short, why the test is one sentence, and why the faces are
named rather than described.

## Rejected

**A lint that detects the pattern.** Faces 1–4 are mechanically different — a
stale constant, an unobservable trigger, a scope default, an exception handler —
and faces 5 and 6 are not in the code at all. Anything general enough to catch
all six would fire constantly, which would make it face 1.

**Leaving it as prose in `CLAUDE.md`.** That is where it lived for ten instances,
and every session rediscovered it. Prose in an instruction file is read once at
session start and is not something anyone points at in review; a numbered record
is.

## What this record does not do

It does not tell you whether a given guard is decorative. Applying the test still
needs someone to ask "what would this output if the thing were broken?" — and
that question is only ever asked by somebody who is not busy being right.
