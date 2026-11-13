## 2026-08-16 15:08 UTC — the alarm, a guard that had been dead for a refactor, and four collisions between correct decisions

Orchestration session on the primary checkout, one worktree (`faves-cook`),
three agents, and **five peer sessions live in the same repo the whole time**.
Delivered: **36d** the cook-mode timer's alarm (ADR 0071), **36g** cook-mode
ticks out of the backup export and the sync blob (ADR 0074), and the repair of
`tools/sync_check.mjs`, which had been proving nothing since `e745923`. Merged
as `42b1a7a`. Three roadmap items closed on measurement, three new ones opened.

⏱️ **Note on the stamp**: this entry is stamped from `date -u` per CLAUDE.md.
The entry above it carries **15:40 UTC**, which was in the future when this was
written at 15:08. Flagged, not edited — but "newest last" cannot be trusted to
mean "latest" while entries are stamped from different clocks.

### 🎯 The work I could not take, and why that is the interesting part

The owner asked for cook mode and recipes first. **Almost all of it was claimed
within two minutes of this session starting** — 37c/d/e/j/l/m by faves-recipe,
37g by faves-ranking, 37n by faves-allergens. His standing instruction is that a
live claim overrides even a direct instruction to take that item, so the
recipe-page pass was left alone.

🔑 **The item I *chose* not to claim taught more than the ones I did.** 36a
(getting the estimated per-step minutes into the payload) was unclaimed,
owner-ruled and ready. I left it, because it rewrites `steps` inside
`cook-at-home.json` — the same records, adjacent keys, that 37l was rewriting
`ingredients` in, and it lands the ADR 0067 tick-rehash trap **twice, from two
sessions, in one file**. A merge conflict there is the *good* outcome; the bad
one is a clean textual merge that silently detaches every tick.
**File-disjointness is the unit of parallel safety, not item-disjointness.**

### 🔎 Three roadmap items were stale, and each had expired in a different silence

1. **"Whole-repo scanner runs are inflated by every live worktree"** — measured
   with five worktrees live: `leakscan .` clean (the item predicts 101 findings
   and a blocked commit), `plainscan .` 652 with no doubling. Worktrees moved to
   `~/worktrees/`, **outside** the tree, so `.` no longer holds a second
   checkout. The item's premise was *a convention in a neighbouring repo* that it
   never named as a premise. Closed on evidence, not on the upstream fix it was
   waiting for.
2. **"`sync_check.mjs` aborts before its last three assertions"** — it aborts
   before its **first**, with zero PASS lines, because `e745923` folded Sync into
   "Your data" and the check still clicked the old row. 🛑 **The documented
   symptom in CLAUDE.md misled in the dangerous direction**: it told you to watch
   for *"a wall of PASS lines followed by a harness error"*, so a reader matching
   the real output concludes they are looking at something else.
3. **The overflow-menu race that item described was never a product hazard.**
   Both causes were the check's own: `scrollTo(0, 0)` obeys
   `scroll-behavior: smooth` and returned mid-animation — which fully explains
   the old trace's *"scrollY:879 then scrollY:0"* as **one unfinished scroll, not
   a second scroller** — and `initContactBar()`'s observer dropped
   `body.contact-bar-open` a frame later, so the click's coordinates went stale
   between rect read and dispatch. **Nothing in `site/js/` changed to make it
   pass.** Two sessions had that hazard written down as real, and I claimed the
   item partly on its strength. ⚠️ Honest residue: the old trace's third
   observation (`aria-expanded` reporting two cycles from one click) never
   reproduced — unexplained, not disproved.

### 🛑 The structural finding: CI runs none of the browser checks

`.github/workflows/ci.yml` runs `node --test` and the Python gates. It does not
run `sync_check`, `cook_check`, `device_check`, `boot_check`, `addon_check`,
`branch_check`, `to_top_check` or `filter_row_check` — **eight** guards, every
one written *because* unit tests had already missed something real. They run only
when a person types them. That is the whole answer to how `sync_check` stayed
dead through a refactor: nothing was calling it.
🔑 **The cheap guards that catch the least are automated; the expensive guards
that catch the most are on the honour system.** Now a 🛑 note in CLAUDE.md's
verify list and a roadmap item — deliberately *not* fixed by wiring them into
CI, because several are timing-sensitive and a flaky required check trains people
to re-run until green.

⚠️ **Which is not hypothetical — `cook_check` did it to me the same hour.** Four
completed runs of one commit: 75/0, **73/2**, 75/0, 75/0. I re-ran and it went
green, which is precisely the trained behaviour. Recorded as its own item rather
than enjoyed. The two failing assertions were **not captured** — a real gap in
that evidence.

### 🔑 An assertion nobody has watched fail is not yet a guard

The 36d agent broke each new `cook_check` assertion on purpose: inverting the
15-minute guard failed exactly the two notification assertions; dropping the
vibrate call failed exactly the five vibration ones and left the tone green.
**And one of its own new assertions failed to fail** — the ring-once guard could
not bite, because the tick that rings the last timer also stops the interval. It
was decorative, and it was written *in the same session that was hunting
decorative guards elsewhere*. Replaced with a two-timer scenario.

Same shape one level down in 36g: the fix the roadmap specified in as many words
— add `faves.checklist.v1` to `EXCLUDED` — **would have excluded nothing at all
while reading as complete**, because `profileScopedStorage()` makes the real key
`faves.p.<id>.checklist.v1`. Three of four new tests fail against that version.
The roadmap bullet had already announced itself as *"wrong twice"* and was wrong
a third time. What caught it was writing the test first and watching it fail.

### 🚩 Four collisions between two correct decisions — the class our doctrine cannot name

Named jointly with the peer sessions and carried into their **ADR 0072**:
**the defect lives in the gap between two correct decisions taken by different
sessions, and the party it stops is usually neither of them.**

| # | Decision A | Decision B | Who it stopped |
|---|---|---|---|
| 1 | my 36d claim asserted file-disjointness | ADR 0070 pulled `cook-ui.js` into 37l | both, silently |
| 2 | I reserved SHELL `.84` | faves-ranking spent `.84` and pushed | a rebase would have *absorbed* the bump |
| 3 | a forward `[ADR 0073]` link (fine under warn-only `pathscan`) | `pathscan` promoted to enforced | **every session's commits** |
| 4 | a correct harvest of delivered items | `sizescan` harvest-integrity is enforced | **every session's commits** |

🔑 **Two sessions each holding a correct map of their own files still had a
collision neither could see.** A file map is a claim about your own writes; a
collision is a fact about somebody else's. What found #1 was a *third* session
noticing two answers to one broadcast. The broadcast is the mechanism that
works, not the map.
🔑 **And #3 sharpened it**: renumbering 0073→0074 felt like the repair and
changed nothing, because **it was never the number that was wrong — it was the
reference existing before the referent.** A guard firing on the right condition
can still send you to the wrong repair when two faults land on one line.
🎯 **The practical rule, owed upstream:** a change that makes the repo's *gates*
stricter is a change to everyone's ability to commit. Announce it the way we
announce a `SHELL_VERSION`.

### 🛑 An incident in the shared checkout, and a `git push` that lied

A `git pull --rebase --autostash` in the primary checkout landed **mid-rebase
replaying a peer's four commits**, stopped on a conflict, and swept my
uncommitted roadmap write-up into the autostash. **`git push` then reported
success while pushing nothing**, because `main` was mid-rebase. Recovery: verify
every peer commit was already reachable from `origin/main` **before** touching
anything; back the autostash out to a file (`git show <sha>:docs/ROADMAP.md`)
*before* aborting; then `rebase --abort`. Nothing lost.
🚩 **We have a careful protocol for shared *files* and none for the shared
checkout's *repository state*.** A rebase in progress produces no `[~]` claim, no
dirty-file signal, and nothing in `git status --short` that reads as "stop".

### 🚩 My own orchestration fault, self-reported by the agent

I put two agents in **one** worktree on disjoint files. One ran `git add -A` and
**swallowed 101 lines of the other's in-progress `sync_check.mjs` work** into its
commit. Nothing was lost and the tree stayed consistent, but the attribution in
`fdd6a99` is wrong. **Disjoint file ownership does not make a shared worktree
safe, because `git add -A` is not file-scoped** — either give each agent its own
worktree, or forbid `-A` in the brief. I did neither.

### Left deliberately

**36a's payload/render** (see above — 37l's file). **The three owner questions on
36d**: a notification fires even when you are looking at the page; there is no
visible on-screen cue when a timer ends; `cook.notifyBlocked` has no te reo
string. All three want `app.css`/`reo.js`, held by peers all session.

### 🔎 Addendum — the flaky check had a cause, and a clean bisect got it wrong

After close, the 36d agent retracted its own diagnosis of a `cook_check` stall
and ran a five-arm bisect **plus a control on the tree before any of its work**.
Every arm stalled at the identical point, control included. It correctly
concluded *"not my code"* — then overreached to *"`cook_check` cannot complete on
this machine"*.

🔑 **It could not, because the confound was still running underneath every arm.**
Six orphaned headless-Chrome processes, leaked from its own killed runs, had
pushed load past **100**; the same agent cleaned them up only afterwards.
Re-running once they were gone, on a quiet machine: **`OK — 75 passed, 0
failed`** — including the two-timer assertion it had reported as unverifiable.

- 🛑 **A killed browser check leaks its Chrome.** Nothing reaps it. At the
  resulting load the check does not fail, it **stalls with no summary line** —
  manufacturing, from no code change at all, the exact trap CLAUDE.md documents
  for `sync_check`. `pgrep -f faves-.*-check` finds them.
- 🔑 **A bisect whose every arm carries the same confound returns a uniform,
  confident, meaningless result — and its *control* is the thing that makes it
  look rigorous.** The control did real work here (it cleared the code) and the
  overreach rode on the credibility the control earned.
- ✅ **What settled it was the cheapest possible test**: remove the confound, run
  it once. Not more bisecting.
⚠️ Still unexplained: the 73/2 run during integration, at load 5.9–15.8, well
below the orphan-driven level. Its failing assertions were not captured.

### Owner rulings taken at the close (2026-08-16)

Four questions were put to him rather than resolved quietly. All four changed
something, and one of them changed the *shape* of the question.

- 🎯 **`contains-fish` → ADD IT, and land it WITH 37n.** Asked with the cost
  stated (schema change + corpus sweep + a tagger rule). His reasoning: it is a
  major declarable allergen we currently warn about **zero** times, and sweeping
  the corpus once beats sweeping it twice. The dishes already found and left
  untagged are listed on the roadmap item so nothing is re-derived.
- 🎯 **Trace allergens → he split the question.** Asked as "tag `T` or not";
  he answered *"keep tagging only P as you recommended, but extend the data
  model to enable us to capture both present and trace allergens at a data
  level."* 🔑 **The displayed warning and the recorded fact are two decisions,
  and only one of them was actually being asked about.** Tagging `T` would fire
  nut/sesame/shellfish warnings on every pizza; *discarding* `T` throws away the
  venue's own graded statement and makes recovering it a 55-menu re-read. Both
  costs avoided by separating them.
  🚩 **It leaves a real design question, recorded rather than assumed:** under
  [ADR 0047] `site/data/` holds only what a screen renders, and under this
  ruling no screen renders trace — so the trace tier probably belongs in the
  repo-only record `data/`. That would make the split-store rule load-bearing
  for **safety** data for the first time. Recommended, not built; his call.
- 🎯 **The Victoria Tavern → fetch it, record the weaker provenance.** Its TLS
  certificate is a self-signed Plesk placeholder from a 2026-08-03 hosting move,
  so the menu is only reachable with verification disabled. Transcribed as
  `paper-menu` rather than `official-site`: we read a menu document, and we
  could **not** establish that the server is the venue's own site — which is
  exactly what the certificate would have proved. 🔑 **A provenance value is a
  claim about what we verified, not about where the bytes came from.**
- 🎯 **Subway → build it, every price `null`.** Subway NZ publishes no price
  anywhere first-party (franchise pricing varies by store), so `null` is the
  correct record rather than a failure. Dish names plus a first-party allergen
  guide is most of what the app is for; the price band already reads as unknown.

### After the rulings — two more venues, and what they taught

Both owner-ruled venues were built in a second worktree (`faves-menus2`,
branch `menus-14b`) after the first had been closed out.

- **The Victoria Tavern, 138 items**, `verifiedBy: paper-menu` rather than
  `official-site`, because the certificate we had to bypass is exactly what
  would have established the server was theirs. `verified` is 2024-10-04, the
  older of the two source PDFs.
- **Subway, 141 items, every price `null`**, tagged from its own **NZ Allergen
  Web Guide (May 2026)** — fetched past an Akamai block that had defeated both
  `curl` and headless Chromium, then rendered page by page and read visually.

🔑 **Subway's own data settled a design question this session had been deciding
by judgement all day.** The same filling is sold as a sub, a wrap and a salad,
and Subway's guide gives the three **different** allergen sets — soy `●` on the
Sweet Onion Chicken Teriyaki sub but only `*` on the wrap; the Chicken Strips
salad has no gluten row at all. So they are three products, not one printed
three times, and **the difference is the bread, which is the gluten**. 44
explicit `dishId`s, justified by evidence rather than by the [ADR 0051] analogy.

🔎 **And its allergen guide graded present vs trace exactly as Pizza Hut's did**
(`●` contains, `*` may contain) — the second instance the same day, which is
the evidence that the owner's data-model ruling above is worth building rather
than a one-venue curiosity.

🚩 **A false alarm worth recording, because it cost nothing to check and would
have cost a correction to accept.** The Victoria Tavern's agent reported that
`detailsVerifiedBy: "third-party"` on the existing stub was "not in the closed
set". It is — `ARCHITECTURE.md` line 369 defines it, and `validate.py` agrees.
**A sub-agent's challenge is a hypothesis too.**

🚩 **The two venues also produced an inconsistency, and it is a real question
rather than a slip.** Subway keeps 141 unpriced rows because the owner ruled it
should; the Victoria Tavern's agent dropped ~40 unpriced spirits on the corpus
convention that unpriced lines are simply omitted — a convention it verified
against two other venues before following. Both defensible, and opposite.
🎯 Left with the owner: is an unpriced row a record of what the venue sells, or
noise until someone prices it?

### ✅ Owner rulings taken at the close (2026-08-16)

Four questions were put to him rather than resolved quietly. All four were
answered, and **one overruled the session's own recommendation** — recorded here
because the reasoning is the part that carries forward.

- **A notification while you are looking at the page → LEAVE IT, duration only.**
  The alternative ("only if the tab is hidden") was offered with its costs and
  declined. 🔑 **A rule with one condition is predictable; a second condition
  buys quiet and spends predictability** — and "hidden" is a poor proxy anyway,
  since a phone locking mid-bake counts as hidden. Nothing to build.
- **No visible cue when a timer ends → BUILD IT, and style the blocked line
  too.** `[S][css]`, open and unclaimed. This was the highest-value of the three
  in his own case: iOS ignores `navigator.vibrate`, so on his phone the alarm is
  tone plus notification, and **a silenced phone with notifications denied
  currently gives no alarm at all**. A silenced phone in a kitchen is the likely
  case, not the edge case.
- **`cook.notifyBlocked` te reo string → to the reo review queue.** Falls back to
  English safely meanwhile.
- **CI and the browser checks → the FAST SUBSET, per push.** `boot_check` into
  `ci.yml`; the other seven stay manual. Full-CI and nightly were both offered
  and declined. 🔑 **The subset is chosen for what is safe to make *required*,
  not for what is cheap**: `boot_check` needs no timing assumptions, while
  `cook_check` is contention-flaky and `sync_check` drives two browsers for
  minutes — and a flaky *required* check trains everyone to hit re-run, which is
  worse than no check.

### 🎯 And the one he overruled — five parallel sessions stay

This session recommended cutting to **three**, each given a *file territory*
rather than a roadmap item, on the evidence above: a ready owner-ruled item
declined purely for file contention, version-range negotiation by message, and
**two occasions where one session's entirely correct action hard-blocked every
other session's commits**.

**He heard it and kept five**, judging the raw parallel output worth the
per-session friction. 🔑 **Which reframes the work rather than ending it: the job
is to make five work, not to argue about five.** The mechanisms that
demonstrably paid for themselves are now written into the roadmap as standing
practice — broadcast the *file set* not just the claim, announce version
*ranges* and re-verify after every rebase, ask peers what the owner has ruled at
their end, announce any change that makes the repo's **gates** stricter, and give
each agent its own worktree or forbid `git add -A`.

