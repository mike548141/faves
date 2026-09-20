# 0119 — The inlined floor is a VERBATIM stamp, and our enrichments live beneath it

**Status**: accepted
**Date**: 2026-09-21
**Supersedes** the owner's 2026-08-17 ruling *"the two forks: KEPT"*, recorded
in roadmap
[`340/060`](../roadmap/340-theme-20-places-from-anywhere-owner-raised-202/060-our-inlined-floor-is-a-stamped-copy-nothing-wa.md)
and inlined in `CLAUDE.md` as a bullet of the doctrine block itself · **does not
touch** [0086](0086-the-board-is-one-file-per-item.md), which is the board's
shape, not the floor's

## Context

`CLAUDE.md`'s doctrine block is a *stamped copy* of atelier's canonical `floor`
region — the text a child inlines so the safety floor binds even where nothing
else of the house is read. Since 2026-07-25 this repo's copy was not a copy. It
was an **enriched and compressed restatement**: richer than the region in six
places, shorter than it in others, and carrying two departures the owner
deliberately ratified on 2026-08-17 with the words *"keep them, and here is
why"*. The reasoning was good at the time and is recorded in full in `340/060`.

Two things then happened upstream.

1. **atelier ruled `115/030` on 2026-09-19: *"Floor copy verbatim."*** A
   child's copy of the `floor` region is the canonical text word for word — no
   compression, and **no declared narrowing**: `narrow=` on a `region=floor`
   stamp now *reds* instead of excusing anything. `PROPAGATION.md` drops "may
   compress" for this one region, and `stampscan.py` carries the rule by
   (`source`, `region`) identity rather than by the region's name.
2. **The better half of fork (1) was fixed at the source.** That fork existed
   because the region's own drift command was `git -C <path> log --oneline
   <SHA>..HEAD` — no `fetch`, and bare `HEAD` — which ships the exact
   stale-checkout silent pass this repo diagnosed on 2026-08-09. The canonical
   region now carries the `fetch` and reads `origin/main`. Converging is no
   longer adopting a known defect; it is adopting our own fix, returned.

So a ruling this repo must follow collided head-on with a ruling its owner had
made, on evidence that had since changed. That is a genuine dilemma and not a
session's to resolve, so it was put to him on 2026-09-21 with the collision
stated in full and three options.

**His ruling: re-stamp the floor region VERBATIM, and relocate every
faves-specific enrichment into the repo-specific onramp directly beneath it.
Nothing is to be lost — this is a move, not a delete.**

## Decision

### 1. The block is the canonical region, constructed rather than transcribed

`CLAUDE.md` lines 3–101 are atelier's `floor` region at `09cd4d2`, extracted
between its `floor:begin` / `floor:end` markers **by script**, its presentation
fence stripped, and its four placeholders filled **by script** — `<SHA>` →
`09cd4d2`, `<atelier-path>` → `../atelier`, `<visibility fact>` and
`<owner/repo>` → this repo's facts. "Verbatim" is therefore a property of the
construction, not a claim about anyone's care.

The block is wrapped in the machine-readable markers the house defines:

    <!-- stamp:begin source=docs/method/PROPAGATION.md region=floor -->
    <!-- stamp:end -->

**No `narrow=`.** On a `region=floor` stamp it reds, by design.

🚩 **The pin in the heading carries no date.** The canonical heading is
`## Doctrine — inherited from atelier (pinned `atelier@<SHA>`)` and nothing
else; our old heading appended *"owner-ratified 2026-07-25, bumped
2026-09-09"*, and an addition reds exactly like a reword. The dates live in
this record and in `SESSIONS.md`, which is where a date belongs.

### 2. Every enrichment moves below the stamp, under a named heading

Nothing was deleted. The onramp now opens with *"everything from here down is
ours"* and carries, each with the evidence that earned it: the three `00-APEX`
practice clauses; **BS1** and the whole dirty-checkout history including the
three-session deadlock of 2026-08-16 and the 2026-09-06 correction to its
stated reason; the staged-index provenance note; the cancelled-run sub-clause;
the `Source & drift` operating notes and the worktree trap; the two retired
forks *with* their reasoning; *"a house rule is not ours to write"*; and the
publication-bound reading of estate resources.

🔑 **Keeping the retired forks' reasoning is the load-bearing part.** A future
session will re-derive the same objection — *the region's command looks wrong*,
*the rationale is less actionable than the practice clauses* — and must find the
answer rather than re-open the fork.

### 3. The hand check is documented, with its command, as the only instrument

`stampscan` **cannot** run against this block, for two independent reasons, both
measured here on 2026-09-21 rather than assumed:

| Obstacle | Measurement |
|---|---|
| **ST3 — source confinement.** `resolve_source()` rejects a `source=` outside `--root`; the canonical region lives in atelier. | `stampscan --root <this repo> CLAUDE.md` → `[missing-source] canonical source does not resolve: docs/method/PROPAGATION.md`, **exit 2** | <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
| **Placeholder substitution.** Substitution *rewords*, and `stampscan` reds on anything not obtainable by pure deletion. No fix to ST3 touches this. | With the canonical file staged beside a copy of `CLAUDE.md` so `source=` resolves: **exit 1, drift**, first offending line the filled pin |

Both are atelier's open finding `320/160` — *"a child cannot stamp its inlined
floor at all: `source=` may not leave `--root`, and every child must reword the
canonical region anyway"* — still `[ ]` as at 2026-09-21. The consequence that
item draws, and which this repo now adopts: **the hand check is not a stopgap
pending a better `stampscan`.** It is the only instrument that can pass a
compliant child, and it runs **every pin bump**. The onramp carries the
command.

Run against this commit it reports **zero drift outside the six
placeholder-bearing canonical lines, zero residual placeholders, and no line at
or over 86 columns.**

## Rejected

- **Keep the forks and declare `narrow=`.** It is the shape the mechanism was
  built for, and it is the one thing `115/030` explicitly removed: `narrow=` on
  a `region=floor` stamp reds. It would also not have helped — a declaration
  excuses *omission*, and our forks were rewordings and additions.
- **Keep the forks and add no markers**, which is what this repo did until
  today and what one private child still does, on the honest reasoning that a
  stamp you cannot check asserts a compliance you cannot vouch for. Rejected
  because the marker is not the claim — the verbatim text is, and the markers
  make the block *findable* by the tool the day ST3 lands. The claim is carried
  by the hand check, which is now written down with its command instead of
  living in a session's habits.
- **Converge the text but leave the enrichments inside the block, merged into
  the canonical bullets.** This is what the old block did and is precisely the
  failure `320/160` measured elsewhere: a compressed local restatement dropped a
  qualifier, a session read its own block, concluded the house had a gap it does
  not have, and wrote a local duplicate. Our own block did the same thing on
  2026-09-06, asserting *"the hook cannot see it"* when the hook could.
- **Reinstate the `Source & drift` fork on its merits.** It was the better text
  for five weeks. It is not any more, because the finding was filed upstream and
  upstream fixed it — which is the whole point of § *Pointing up*, and the
  reason a local fork is the wrong instrument even when its reasoning is right:
  the edit is invisible to the parent, so the defect it works around stays in
  every *other* child.

## Consequences

- **Bumping the pin is now a two-file job with a mechanical step.** Re-extract
  the region, re-fill the four placeholders by script, run the hand check, and
  commit the re-inline **in the same commit as the pin**. A bump that moves the
  pin without moving the text converts a known debt into an invisible one.
- **A line of the floor we think is wrong now has exactly one route: up.** We
  no longer have the option of quietly being right locally. That is a real cost
  — fork (1) bought this repo five weeks of correctness — and it is the cost the
  ruling accepts, because it bought the house nothing.
- **`CLAUDE.md` grew by ~180 lines.** The enrichments are longer set out under
  their own headings than woven into bullets. `sizescan` already advises on this
  file; it is current truth on the hot path, which that advisory explicitly
  permits.
- 🚩 **One thing this does NOT buy: an automated check.** The block is now
  *checkable* and nothing checks it. `stampscan` is not in `floor.py`'s
  registry, so neither the hook nor CI runs it, and it would exit 2 here if they
  did. Until atelier closes `320/160`, the only thing standing between this
  block and silent drift is a human typing the hand check at a pin bump — which
  is [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
  decorative-guard shape one step removed, and is stated here rather than
  rounded to "now watched".
