- [ ] 🚩 **Two orphaned stashes have sat on the shared stash stack for three
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

  🎯 **Options, none taken — the drop is the owner's call because the work is
  not this session's:**
  1. **Drop both**, having verified the contents reached `main` (done above).
     One command each, removes the hazard, unrecoverable by design.
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
