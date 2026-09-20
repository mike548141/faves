- [~] 🚩 **Two orphaned stashes have sat on the shared stash stack for three
      weeks, and nothing in the house rules says anyone should ever look**
      `[XS][tools]` — found 2026-09-07 (session faves-b1) while reviewing an
      agent's branch, and filed rather than acted on: **a stash is another
      session's uncommitted work and dropping one is not a delivering session's
      call.**

  **What is there**, read with `git stash show` only — nothing was applied,
  popped or dropped:

  | entry | dated | branch it came from | contents |
  |---|---|---|---|
  | `stash@{0}` | 2026-08-17 19:57 | *(an `autostash`)* | `app.js`, `reo.js`, `search.js`, `search-hints.js`, `sw.js`, `tests/search.test.js` — 179 insertions |
  | `stash@{1}` | 2026-08-16 23:31 | `faves-content-growth` | `burgerfuel.json`, `hell-pizza.json`, `sw.js` — `priceBand`/`pricePerPerson` |

  ✅ **NOTHING WAS LOST — checked, not assumed.** For `stash@{0}`,
  `site/js/search.js`, `site/js/search-hints.js` and `tests/search.test.js` are
  **byte-identical** to `main` today; `app.js` differs by 207 lines, which is
  `main` having moved on over three weeks rather than work missing (the file
  `search-hints.js` is dated six minutes *after* the autostash, so the session
  finished and committed). For `stash@{1}`, `priceBand` is present on both
  `burgerfuel.json` and `hell-pizza.json` on `main`. So this is **residue, not a
  loss** — which is the finding, because residue is what nobody investigates.

  ⚠️ **THE PARENT ALREADY COVERS MOST OF THIS, AND THIS ITEM SAID IT DID NOT
  UNTIL THE FILE WAS OPENED.** The first draft claimed the stash stack was *"the
  one surface `CONCURRENCY.md` does not name"*. That was written from this
  repo's inlined summary, which is exactly the mistake the house rule forbids —
  *read the parent's actual file, never this block's summary of it*. Reading
  `../atelier/docs/method/CONCURRENCY.md` shows two of the three halves are <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
  already there:
  - **Creation is covered** (line 98): *"back any autostash out to a file before
    aborting"* — precisely the interrupted rebase that made `stash@{0}`.
  - **Use is covered** (line 105): *"never `checkout`, `restore` or `stash`,
    each of which reaches their work as well as yours."*
  - ❌ **Cleanup is not.** Nothing says an entry left behind should ever be
    looked at again, and nothing says the stack is per-**repository** rather
    than per-worktree — the fact that makes `stash@{0}` possibly a stranger's.
  🔑 So the honest finding is **a findability defect plus a narrow real gap**,
  not a missing rule. That is a smaller claim than the one this item opened
  with, and it is the correct one.

  🛑 **Why the residue still matters.** The stash stack is a shared surface:
  it is per-**repository**, so every worktree —
  and therefore every parallel session — sees and mutates one stack. A bare
  `git stash pop` in any of them pops **`stash@{0}`, whoever made it**. Today
  that would silently restore an app shell dated 2026-08-17 over the current
  one, and `sw.js` with it, which is a version-constant collision arriving from
  a direction no gate watches.
  🔎 **An `autostash` is the sharp edge, and it is worth naming separately.**
  Nobody types it: `git pull --rebase --autostash` creates it, and the *session
  start* command this repo mandates carries `--autostash`. A rebase that is
  interrupted — a conflict, a killed terminal, a session that ended — leaves the
  entry behind with no owner and a label that says nothing about who made it.
  The rule that produces it is the same rule that never mentions cleaning it up.


  🔎 **RE-MEASURED 2026-09-08 03:30 NZST (session faves-o1): the stack is EMPTY.**
  `git stash list` in the primary checkout prints nothing. Both entries are gone
  and no record in this repo says who dropped them or when — so option 1 has
  been taken by somebody, unrecorded, which is the residue problem this item is
  about arriving from the other side. Nothing is lost by it (the contents were
  verified on `main` above).
  ✅ **The hand-up half is already filed, by a peer, and needs no second
  filing.** atelier PR #71 (`report/concurrency-autostash-at-session-start`,
  item `320/150`, 2026-09-07) reports that the session-start `--autostash`
  bookend writes to a stash stack shared across every worktree, quotes the
  same "back any autostash out to a file" line this item found, and sketches
  three gates. That covers the shared-stack fact and the autostash edge; the
  only thing it does not say is that an entry found on the stack is somebody's
  to reconcile — a one-line rider best added to that item when atelier rules,
  not a competing PR.
  🎯 **What is still this repo's to decide: option 2 alone.** A session-start
  warning when the stack is non-empty and any entry predates today. Cheap, and
  a mechanism where the drop above was a discipline. Owner's call.

  🎯 **[PARTLY MOOT — option 1 is gone; see the re-measurement above and the
  note at the foot. Kept for the record.]
  Options, none taken — the drop is the owner's call because the work is
  not this session's:**
  1. ❌ **MOOT — the stack is already empty.** ~~**Drop both**, having verified
     the contents reached `main` (done above).
     One command each, removes the hazard, unrecoverable by design.~~
  2. **Leave them and add a stash check** to the session-start routine or the
     pre-commit floor: warn when the stack is non-empty and any entry predates
     today. Cheap, and it makes the residue visible to whoever *can* judge it.
  3. **Leave them and write the rule down** — a line in the concurrency section
     saying the stash stack is shared, never use bare `stash`/`pop`, and always
     `git stash push -m "<unique-tag>"` then `apply <sha>`. Costs nothing and
     catches the *next* one rather than this one.
  🔑 **1 and 3 are not alternatives.** Dropping these two does nothing about the
  next interrupted rebase; writing the rule down does nothing about these two.
  The real choice is whether 2 is worth building on top of both.

  🚩 **Points up, narrowly.** *"Anything that would be true in a repo sharing
  none of our stack is the house's"* — a shared stash stack is true of every git
  repository with worktrees and parallel agents, so the **rule half belongs to
  atelier**, not here. But the hand-up is now the *narrow* one the reading
  above supports, offered and not recommended: that `CONCURRENCY.md` says the
  stash stack is per-repository and shared across worktrees, and that an
  autostash left by an interrupted rebase is somebody's to reconcile rather than
  nobody's. **Options 1 and 2 are local and stay here** — the residue in this
  repo is this repo's to clear, and no house rule is needed to do it.

  📝 **BOARD HYGIENE 2026-09-09 — of the three options, only one is still a
  question, and this item's own text already said so before the options block
  did.** Nothing here is new analysis; it is the item's later findings applied
  to its earlier list, which were left contradicting each other.

  | Option | Status, checked 2026-09-09 |
  |---|---|
  | **1 — drop both** | ❌ **Moot.** `git stash list` in the primary checkout prints **nothing** — re-run 2026-09-09, read-only, confirming the 2026-09-08 measurement. Somebody dropped them, unrecorded. |
  | **2 — a session-start / floor warning** | 🎯 **The only one still open**, and the item already names it: *"What is still this repo's to decide: option 2 alone."* Local, `[XS][tools]`. |
  | **3 — write the rule down** | ✅ **Filed upstream, needs nothing here.** atelier PR #71 (`report/concurrency-autostash-at-session-start`, item `320/150`, 2026-09-07). By this item's own pointing-up note the rule half is **atelier's**, not ours. |

  🔎 **So the item was carrying two 🎯 blocks that disagreed with each other.**
  The one at *"What is still this repo's to decide"* is correct; the options
  block below it still offered a drop of stashes that no longer exist and a rule
  this repo may not write. Option 1 is struck in place and option 3's disposition
  is recorded, so a reader arriving at the list is not handed three live choices
  where there is one.
  🛑 **Left deliberately as the owner's, NOT reclassified.** The item says of
  option 2 *"Owner's call"*, and this pass does not overturn that — it is cheap
  and local, but whether to spend a session-start check on it is his to say. The
  bracket stays `- [ ]`.

  ✅ **THE HAND-UP CAME BACK AS DOCTRINE — 2026-09-20 (session `3e87e0bf`),
  and it moves option 2, not just option 3.** Verified at atelier's
  `origin/main`, not taken from this item's own text:
  - **atelier PR #71 is real and MERGED 2026-09-17** —
    *"320/150 hand-up: the session-start autostash reaches a peer's
    uncommitted work"*. ⚠️ **The item number in the table above is wrong**:
    `320/150` is the PR's *branch* name and atelier's live `320/150` is a
    different finding (the open-time sync command's misleading error text).
    This hand-up settled as atelier **`320/210`**, *"the session-start
    autostash contradicts the shared checkout premise"*. Cite that.
  - **The rule landed in the FLOOR REGION itself** at atelier `54201e0`, so it
    binds every child, not just this one. The Concurrency bullet's opening
    clause is now: *"At session start read `git status` first — dirty work this
    session didn't make means stop and move, never autostash it — then, where
    there is a remote, `git pull --rebase --autostash`; push after each
    commit."*
  - 🔑 **So option 2 is largely answered from above.** It asked for *"a
    session-start / floor warning"*; the house put the check at session start
    in the floor and named the failure mode. What is left here is strictly
    narrower and is still the owner's: whether to **mechanise** it locally
    (a `tools/` check, or a line on the verify list) rather than rely on a
    session reading the floor. `[XS][tools]`, and it stays `- [ ]`.
  - 📌 **The stash stack is still empty, re-measured today** — `git stash list`
    prints nothing in the primary checkout *and* in a live worktree, and
    `git reflog show stash` now errors with *"unknown revision"*, meaning the
    ref itself is gone. **Who dropped them, and when, is unrecoverable** — the
    reflog went with the ref. Said plainly rather than smoothed over: this item
    can report the residue is cleared and cannot report by whom.
  - 🔎 **And the shape worth keeping.** This repo filed a finding upward, the
    house ruled on it, and *nothing in this repo changed on that day* — the
    same silent-staleness this section's `040` item was just closed for. A
    child's upstream filings need re-reading at every pin bump, because their
    close event happens somewhere else.

  🎯 **OWNER RULED 2026-09-21 (session `3e87e0bf`): BUILD THE LOCAL CHECK.**
  Option 2 was put to him against *"leave it to the floor"*, with the argument
  for leaving it stated — the house rule now covers this at session start, and
  this repo already carries ~20 gates a human must type. He chose the
  mechanism. **Claimed the same day.** The reasoning he was given, and which
  he took: a doctrine line is a discipline, and ADR 0072 in this repo is
  precisely about a guard that exists but cannot change an outcome. Scope is
  the item's own words — *warn when the stack is non-empty and any entry
  predates today* — and nothing wider.

  ✅ **BUILT 2026-09-21 (session `3e87e0bf`, branch `stash-residue-check`) —
  `tools/check_stashes.py`, [ADR 0119](../../decisions/0119-the-stash-residue-check-warns-and-is-deliberately-not-automated.md).**
  Stdlib only, one git command (`git stash list --format=…`) and no other.
  Scope held to the item's sentence: it warns, it never drops, pops, applies,
  shows or clears, and it adds no flag that could.

  🔎 **THE SHARED-STACK FACT, MEASURED RATHER THAN QUOTED** (git 2.50.1,
  2026-09-21). From the worktree `/Users/…/worktrees/faves-stashcheck`,
  `git rev-parse --git-dir --git-common-dir` answers
  `…/faves/.git/worktrees/faves-stashcheck` and `…/faves/.git` — two different
  paths — and `git stash list` run there lists entries pushed from the
  **primary checkout**, in the same order, under the same `stash@{N}`
  selectors. `refs/stash` lives in the common dir. The item's premise holds:
  one stack, every worktree. The check therefore prints the **common git dir**
  in its verdict alongside the checkout it read from, so two worktrees visibly
  name the same stack rather than the fact living only in a docstring.

  🔎 **AND A SHARP EDGE THE ITEM DID NOT HAVE, found while building the
  fixture.** An autostash reaches `refs/stash` only when the rebase
  **completes** and the *re-apply* conflicts — git then prints *"Your changes
  are safe in the stash"* and **exits 0**. A successful-looking rebase is what
  leaves somebody's uncommitted work on the shared stack. Conversely a rebase
  *stopped* by a conflict keeps its autostash in `.git/rebase-merge/autostash`,
  where this check cannot see it — stated as a blind spot rather than left to
  be discovered; the tree line's `REBASE IN PROGRESS` marker covers that state
  from the other direction.

  🛑 **DELIBERATELY NOT IN `.githooks/pre-commit` OR `ci.yml`, and that is a
  decision, not an omission** (ADR 0119 §3). Exit 1 here describes *somebody
  else's* uncommitted work: in the floor, one peer's live stash would block
  every commit in the repository — the blocking this item refuses — and in CI a
  fresh clone's stack is empty by construction, which is ADR 0072 face 2. It
  belongs on CLAUDE.md's verify list, typed in the checkout that has the stack.
  The verify-list line is handed to the merging session rather than written
  here: this worker's file set was `tools/` and `docs/`, and a peer held
  `CLAUDE.md`.

  📌 **`--selftest` EVIDENCE — 14 cases, all passing, in throwaway repositories
  under a temp dir; this repo's stack was never touched.** Both halves, because
  a check that only ever refuses and a check that never refuses both pass half
  a suite:

  | Half | Cases |
  |---|---|
  | **Stays QUIET** | an empty stack (`Stash stack OK: 0 entries`); a stack of two entries dated 2026-09-21; `2026-09-21T00:00:00` against the same frozen `--now` |
  | **FIRES** | one entry dated 2026-08-17 (exit 1, names `stash@{0}` and `35d old`); a **mixed** stack counted honestly as `1 of 2` with the 2026-09-21 entry still listed; `2026-09-20T23:59:59` against a frozen `--now` of 2026-09-21; a genuine leftover **autostash** named as one |
  | **Neither — "did not check" ≠ "checked and fine"** | a directory that is not a checkout exits **2**; an unparseable `--now` exits **2** rather than falling back to a default |
  | **The promises** | a firing run leaves the stack **byte-identical** (selectors + SHAs before/after); a **worktree** sees the primary checkout's stash and both name the same stack home; the **tree line** still names this gate's tree and not the fixture |
  | **Controls** | the fixtures really put entries on their stacks — without it every "fires" case would be testing an empty stack |

  🔑 **The boundary is testable, which is the half a date guard usually
  lacks.** `--now` freezes today, and one case pushes **one fixed instant**
  (`2026-09-20T13:30:00+00:00`) and runs the check twice under two `TZ` values,
  demanding **opposite verdicts**: quiet under `Pacific/Auckland`, firing under
  `UTC`. Local was chosen over UTC and over a hard-coded `Pacific/Auckland` —
  the reasoning is in ADR 0119 §2 and in `predates_today`'s docstring.

  ✅ **BREAK-PROBED FOUR WAYS, each reverted and the file restored
  byte-identical.** A selftest that cannot fail is the thing this item's own
  ADR 0072 citation is about:

  | Break | Cases that failed |
  |---|---|
  | `predates_today` → always `False` (can never fire) | **6**, every "fires" case; all "quiet" cases still passed |
  | `predates_today` → always `True` (always fires) | **4**, every "quiet" case and both boundary cases |
  | entry dates read in **UTC** instead of local | **4**, including the two-zone case that exists for exactly this |
  | a `git stash drop` added to the read path (guarded to fixtures) | **9**, the read-only before/after assertion among them |

  📌 **The stack is still empty here** — `python3 tools/check_stashes.py` from
  the worktree prints `Stash stack OK: 0 entries, none predating 2026-09-21
  (local). Stack: /Users/mike/.pets/faves/.git (read from …)`, exit 0. So the
  check has never yet fired on real residue, and says so: its evidence is the
  selftest and the break-probes, not a live catch.

  ⏳ **The bracket is LEFT AT `[~]` on purpose, and two things are owed to the
  merging session.** (1) The state line flips to `[x]` with a `board.py rebuild`
  in the same commit; this worker was told not to rebuild while peers were live,
  and flipping the bracket without it fails the floor's `board` check. (2) The
  verify-list line for `CLAUDE.md` is handed over rather than written — a peer
  held that file. The line to add, after `check_decisions.py`:

  ```
  python3 tools/check_stashes.py # the shared stash stack is not carrying somebody
                                # ELSE'S uncommitted work (ADR 0119). refs/stash
                                # lives in the COMMON git dir, so every worktree
                                # shares one stack and a bare `git stash pop`
                                # anywhere pops stash@{0}, whoever made it — two
                                # entries sat there three weeks, one an autostash
                                # nobody typed. It WARNS and never mutates; an
                                # entry is not a delivering session's to drop.
                                # 🛑 Deliberately NOT in the floor or CI: exit 1
                                # describes a PEER'S work, so in pre-commit one
                                # live stash blocks every commit in the repo, and
                                # a CI clone's stack is empty by construction.
                                # `--selftest` (14 cases, throwaway repos) is what
                                # proves it can still fire, because this repo's
                                # stack has been empty since 2026-09-08
  ```
