## 2026-08-15 — Scanners closed, the pin bumped, and a roadmap that stopped lying (wt: faves-scanner-close) — Opus 5

Orchestration session, run alongside the live `intake-round-two` session and
merged into its work twice. Lane taken deliberately away from intake: doctrine,
scanners and the roadmap's own accuracy.

**1. The pin bump was the whole session's leverage.** `atelier@5c16a59` →
`bde4928`, 21 commits of drift. Two items sitting in this roadmap as
*blocked-upstream* were closed by that bump, and neither would have been found
without running the check first:

- **`pathscan` E8 fixed** (`atelier@ab74014`) — its last 16 findings here were
  one upstream defect, queued 2026-08-09 under the queue-never-deliver rule.
  **pathscan is now clean here for the first time since it was adopted.**
- **The `plainscan` scope question ruled** (`atelier@e390382`) — and it ruled
  the *same way* this repo had ruled locally on 2026-08-09, without either
  seeing the other. Two independent rulings agreeing is the strongest evidence
  the line is in the right place.

Only one doctrine *text* file moved in 21 commits (`COMMUNICATION.md`). The
inlined floor was **re-verified rather than assumed**: `git diff 5c16a59..bde4928`
over the four canonical floor files returns empty, so our stamped copy has not
drifted.

**2. 🔎 The correction that matters more than the fix.** Our recorded root
cause for E8 was **wrong**. We reported the trigger as "the leading-slash-plus-dot
form", and the repro supported that honestly — because `/.well-known/security.txt`
was the only failing shape we had. The real trigger is **a hyphen anywhere before
the token's last `/`**; `.well-known` merely happens to contain one. **A repro
built from one failing shape confirms the shape, not the cause.** Next time a
cross-repo defect is queued, vary each suspected feature independently *before*
writing the diagnosis down. Recorded in `ROADMAP-DONE.md`, not just here.

**3. `docs/GLOSSARY.md`, which is plainscan's designed escape.** P2 fires on
every unexpanded acronym and the designed answer is a glossary; this repo had
none. Measured: **P2 96 → 13, total 620 → 543**, no prose rewritten. It earns
its place independently of the scanner — the repo is public and a stranger meets
"PWA", "CDN" and "SBOM" cold in `ARCHITECTURE.md`. Two findings from building it:
a glossary **cannot** fix P1 (`_load_glossary` feeds only the acronym check;
P1 needs a definition inside the same document), and **`D1` is a trap** — it sits
beside `S3`, `R2` and `WGS84` and reads like Cloudflare D1, but every occurrence
is `atelier D1`, a doctrine citation.

**4. Six stale claims in the roadmap, each verified before correcting.** The
"Recommended sequence" described 2026-07-08 and read as though nothing had
shipped (steps 1–4 and two thirds of step 6 are done); "Feedback intake: no
email; parked" was reversed on 2026-08-09; two sections were both numbered
Theme 17; 17e's oven bullet shipped as 18c; the legend defined none of `[XS]`,
`[~]`, the surface tags or the marks. And the stub tally was **wrong for the
second time in six days** — the fix is not the new number (16/18/34) but the
rule now written beside it: **a hand-copied count in prose is stale the moment
data lands; derive it, never retype it.**

**5. Two sessions, one conclusion.** The intake session independently found the
duplicate Theme 17 and renumbered it to 19 within the same hour. Merged by
taking intake's Theme 19 *content* (it has the round-two facts) at this branch's
*position* (theme order restored). Proved nothing was lost rather than eyeballing
it: every line new in intake's version was checked for presence in the
resolution — **zero dropped**.

**6. A standing finding the hook can never see.** The pre-commit hook scans
**staged files only**, so an *enforced* scanner can carry a standing finding
indefinitely in a file nobody touches. A whole-repo sweep at close found one:
`CHANGELOG.md`'s "within the last year". Verified against the code —
`VERIFY_MAX_AGE_MONTHS` is 12 and the caveat computes against the reader's own
now — so it is a rolling window, not a dated claim. Marked, not reworded.
The other 9 whole-repo findings are all in gitignored `intake/`.

**🚩 A number to distrust.** Running `plainscan .` or `pathscan .` bare in this
checkout walks the gitignored `.claude/worktrees/<name>/` nested clone and
**counts every finding twice** — 2000 reported against a real 623. The floor
passes explicit paths and is correct. This nearly produced a fabricated upstream
defect report. Reproduce a finding the way the floor invokes it before believing
it. (`sizescan` genuinely does double-report the worktree; that one is cosmetic.)

**Queued, not decided.** Two accepted ADRs are both numbered **0025**
(`settings-index-and-panels` 2026-08-08, `infer-allergens-by-default`
2026-08-09), with 24 inbound references. Both repair paths cost something, so it
is an owner call with a recommendation, not a unilateral renumber. The
*preventive* half needed no ruling and landed: `decisions/README.md` now states
that a number is allocated **at merge, never in a worktree**, and that ADRs are
cited by file path until the collision is resolved. The same failure had already
happened at larger scale (three agents all took 0031 on 2026-07-23) — a rule
learned but never written down is a rule the next session cannot follow.

**Verification.** `validate.py` (35 files), `test_validate.py` (14 mutations),
`check_no_deps`, `gen_sbom --check`, `check_visibility`, `node --test` 533/533,
`pathscan` **clean**, whole-repo `secretscan`/`leakscan`/`linkscan`/`datescan`/
`wrapscan`/`spellscan`/`licenscan` all clean. CI green on every push. Live
`sw.js` matches `main` (`2026-08-15.2`), so the deploy is confirmed, not assumed.

### Addendum, same session — three owner rulings taken live

**ADR 0025's duplicate: both stay.** Renumbering an accepted record would break
24 inbound references plus any external link on a public repo — dearer than the
oddity. Each file gained a header note; `0025` is now permanently ambiguous and
ADRs are cited **by file path, never by bare number**.
🔎 **The root cause was the index, not the number.** The allergen record had
never been added to the index in `decisions/README.md` — the one place a
duplicate number is visible — so nothing *could* have caught it. That entry now
exists, and the README carries the rule it earned: **add the index entry in the
same commit as the record.** An unindexed ADR is invisible to the next person
allocating a number.

**`plainscan`: accepted ADRs exempted.** They held the largest single block of
findings, and "never edit an accepted one" means not one could ever be fixed —
the same definition atelier used to exempt records, and the same way `pathscan`
went decorative here. The cost is stated rather than hidden: **new ADRs are no
longer checked at commit time.** Accepted because the reply plane has no scoping
and scans every reply an agent writes, including the prose that becomes a new
ADR — the check moves to where the fix is possible.

🔎 **The obvious glob was the wrong one, and the wrong one looked better.**
`docs/decisions` exempts the whole directory *including* `README.md` — but that
is the live index, rewritten whenever a record lands, so its prose **can** be
fixed and the ruling's own reasoning does not cover it. Correct glob:
`docs/decisions/0*.md`. Measured: **266 findings with the loose glob, 302 with
the correct one.** The number that flattered the work was the wrong number.

**The 35-word sentence cap: left alone, nothing swept.** Atelier's own docstring
calls it "a house call, not a published standard". Rewriting live docs against
an unratified threshold risks flattening meaning for no reader gain. P3/P4 stay
advisory.

**Where `plainscan` landed: 1177 on 2026-08-09 → 302 on 2026-08-15**, and
every one of the 302 sits in live, rewritable prose. None is in the
unfixable class. That is the difference between a scanner that can still be
read and one that cannot.

---

