## 2026-08-09 — Queue run: four items, a stale floor fact, two new guards — Opus 5

Orchestrated session, four worktrees, all merged and put away; branches
deleted, `git worktree list` back to the primary checkout alone. Claims
landed on `main` before any work started and none were left phantom.

**Shipped (each merged, full suite on `main`, pushed = deployed):**
**`.order-head`** (wt: faves-orderhead — the menu screen's label and the
sheet family's header bar shared a class at equal specificity, so every
sheet title rendered uppercase; the outlier became `.order-block-head`)
· **13f `verified` carries its derivation** (wt:
faves-verified-derivation — ADR 0031, written up in its own entry above)
· **16f About's version stamp** (wt: faves-16f-stamp — ADR 0032, the
page asks the controlling worker over a `MessageChannel` instead of
inferring from cache names) · **Theme 15 "Your data" split** (wt:
faves-yourdata — ADR 0033, 1009 px and five actions in one summary split
by data model into 607 px + 449 px).

🔎 **The finding that mattered most was not on the queue.** `CLAUDE.md`'s
doctrine block still read *"PRIVATE for now — a push is not
publication"*. The repo went public at `a207a15` under Theme 8, and
`GO-PUBLIC.md` recorded it — but the floor's own visibility fact was
never updated, and every scanner passed the whole time because **nothing
compared the claim to reality**. That fact decides whether a mistake is
recoverable or is immediate world-readable publication, and therefore
whether a leaked secret can be deleted or must be **rotated**. `CLAUDE.md`
even names the command to check it; no session had run it. Corrected,
then made mechanical: `tools/check_visibility.py` parses the bullet and
compares it, wired into CI where the runner already holds the truth in
`github.event.repository.private` — no token, no API call. Confirmed it
catches the real defect: the old wording parses to `private` against an
actual `public`, exit 1. "Cannot verify" exits 2, never 0. A full-repo
`leakscan --require-terms` and `secretscan` came back clean, so nothing
escaped during the window.

🔎 **A validator's failure mode is silence.** `validate.py` gates all 31
records and CI trusts it; the repo had 483 JS tests and **zero** Python
ones, so no `tools/*.py` gate was exercised at all. Mutation-testing it —
break one real record, assert a non-zero exit — found a hole on the first
run: `price` was type-checked but never **sign**-checked, while
`pricePerPerson` ten lines above it had always required `> 0`, so a
negative price validated clean. Fixed at `>= 0` (a free item is a real
thing a menu can say; `null` already means "no price recorded"). The
durable half is `tools/test_validate.py` — 14 mutations, in CI, this
repo's first Python test. **Self-check that mattered:** deleting the new
sign check must make the harness exit 1, and it does. The first attempt
at that check was wrong — `$?` after a pipeline is `tail`'s status, not
the harness's — and read as a pass. A verification that cannot fail is
not a verification.

**Doctrine.** Pin bumped `4cab670` → `6887118` (26 commits). Two method
deltas: CONCURRENCY gains *work lands in the repo it changes* (queue a
cross-repo finding, never deliver it), and PROPAGATION gains *a child may
add, may not repeat, may not conflict* — grounded, by name, on this
repo's own MODEL-ECONOMICS drift. **No inlined-floor edit was owed**, and
that was checked rather than assumed: the canonical floor region extracts
byte-identical to the pinned version, and both new rules sit outside it,
so inlining them would itself be the forbidden repeat.

🚩 **Our inlined floor is a stamped copy nothing watches.** `stampscan`
reports "no stamped blocks" here — the block is stamped in prose, not in
machine-readable markers. We cannot adopt them yet: they pin a `source=`
path that exists only in atelier, and the child-side, pin-aware
resolution is atelier's open ST3, **already queued in its own roadmap**,
so there was nothing to deliver upstream. Checked by hand instead, and it
holds. Queued here.

🚩 **`pathscan` has gone decorative** — 25 standing warn-only findings
mean nobody reads it, so a real stale path would hide in the noise.
Triaged (queued, not fixed — three worktrees were live in the same docs):
~8 are an upstream defect, reproduced in a clean throwaway repo —
`/.well-known/security.txt` is mangled to `known/security.txt` while <!-- pathscan:allow: quoted as an example of the defect, not a live reference -->
`site/.well-known/sbom.json` passes, so the trigger is the
leading-slash-plus-dot form, not dot-directories at large. ~14 are ours
and genuinely loose. ~3 are correct as written and want allow-markers.

**Concurrency, lived.** ⚠️ **All three parallel agents took ADR `0031`**
off the same `main` — the allocate-at-merge failure mode, three for
three, and `0025` was already duplicated from an earlier instance of it.
Renumbered at merge to 0031/0032/0033; one agent's index entry was
missing entirely and was written at integration. **Every merge conflicted
on `site/sw.js`**, always the version constants: each branch was told a
number that a sibling had already shipped, so `SHELL_VERSION` walked
`.10 → .11 → .12 → .13`, one per deploy. Reusing a number would have
stranded installed phones on stale assets — exactly what the lockstep
rule exists to prevent. A keep-both merge in `ROADMAP-DONE.md` silently
filed one item under the wrong heading; caught by reading the result
rather than trusting the marker-strip. The grep-after-resolve habit fired
clean on every merge.

**Verified at close:** 505/505 tests · `device_check` 15/15 ·
validate · test_validate 14/14 · no-deps · SBOM · visibility · full-repo
leakscan + secretscan. Agent reports were checked, not taken: the "only
two dated records" claim re-derived from the data, the new derivation
rules mutation-tested, `GET_VERSIONS` asked of a real worker in real
headless Chrome, and the Settings split read off a real 390 px index.

🎯 **An open tension this session declined to resolve on its own.** The
newly-pinned CONCURRENCY rule says an auditing session *may* queue a
cross-repo finding in the target repo's own roadmap — "queue, never
deliver". The standing correction recorded in this file on 2026-08-09
says faves lives within the doctrine and does not create it, and that
correction is why the leakscan term-scoping mechanism was deliberately
not written into atelier from here. Those two do not obviously agree on
whether a faves session may write a *finding* (not doctrine) into
atelier's roadmap. It did not bite this run — `stampscan`'s ST3 gap is
already queued upstream, so there was nothing to add — but the `pathscan`
dot-path defect is a live case with nowhere agreed to put it. Surfaced
for the owner rather than resolved by picking a side, per the apex rule
on genuine dilemmas.

⚠️ **Correction, same session (owner caught it).** This session's write-up
of the visibility finding claimed the doctrine block "went stale for three
days". It did not. `main` was at `a207a15` when the repo was flipped —
2026-08-09T01:10:10Z — and the stale bullet was found the same day at
about 07:55Z. **Under seven hours, not three days.** The wrong number
reached `tools/check_visibility.py`'s module docstring and a `ci.yml`
comment (both corrected here) and two commit messages, which stand as
written history.

The cause is worth recording because it is not a typo. **No elapsed time
was ever computed** — the figure was asserted from a feeling of duration,
against evidence this session had already read: Theme 8 says
`DONE 2026-08-09`, and the session's own date was 2026-08-09. The
contradiction was on the page. A model has no sense of elapsed time and
must not narrate one; a duration is arithmetic on two timestamps or it is
not stated at all.

The finding itself survives the correction, and the guard's justification
is now written to match: a seven-hour window is small, and the corpus was
clean throughout (full-repo `leakscan --require-terms` + `secretscan`).
The reason to build the check was never the damage done — it was that
**no mechanism existed**, so nothing would have closed the window at seven
hours rather than seven weeks. That argument never needed the inflated
number, which is what made reaching for one careless rather than merely
wrong.

