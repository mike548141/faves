# 2026-11-13 0614 UTC — atelier pin `0a2b7a7` → `2a6d7a4`, and an estate health sweep

**Dispatched by** an estate health sweep (orchestrator session e820bff5),
working headless in a detached worktree off `origin/main`, on the owner's
estate-wide request, verbatim: *"I want you to bring each repo up to an
operational and healthy state. That means, * The latest atelier pin * CI is
green * The repo conforms with the latest atelier expectations like the board
and session files and if you think there are other things we should be doing
to make them healthy then ask me"*. Headless, so nothing was asked; what needs
the owner is in the report to the orchestrator and on the board.

## What was read

- **In full:** `git -C <atelier> diff 0a2b7a7 origin/main --
  docs/method/PROPAGATION.md` (820 lines; the floor region and everything
  around it), plus atelier `CONCURRENCY.md` § *Claiming at a dirty primary
  checkout* and `RECORD.md` § *The session log* at `origin/main`.
- **From a digest, not read line by line here:** the rest of the 340-commit
  delta (`docs/method`, templates, hooks, tool behaviour), from an estate-wide
  digest written the same day by a read-only session that read those hunks in
  full. Its obligations were applied as it states them.

## What changed

- **Floor block** re-copied word for word from atelier `origin/main`'s
  `floor` region; pin `0a2b7a7` → `2a6d7a4` in the heading and the drift
  command. `pins.py --child <this worktree>`: `current`, `✓ identical`; the
  hand check in `CLAUDE.md` printed no drift, no residual placeholder and no
  line of 86 columns or more. The floor's *Asking* bullet still says
  "(one extra turn)" where atelier `COMMUNICATION.md` now says the same turn;
  that is already pointed up in atelier and was copied as it stands.
- **`CLAUDE.md` below the block**, where the delta made it false:
  - § *Concurrency — BS1* retired. It said it would go when atelier
    `010/160` was ruled; CF3 now stops a claim only for the same item. A
    pointer to the house text replaces the rule; the history stays.
  - § *Estate resources* rewritten. The floor no longer says "never by
    name"; this repo keeps the stricter form as a narrowing, on the
    dispatching brief's instruction, marked as the session's call.
  - § *Checking the stamp above*: `pins.py` now compares the copy too.
  - § *Where to start* gains the cold-reviewer clause (`REVIEW.md` rule 2).
  - The pending-upstream step names the `Pending upstream:` marker form.
    `grep -rn 'Pending upstream:'` found none in the tree.
  - One record-of-history line corrected: the 2026-08-18 instance was a
    path-blind house command, not a gap the house lacked (`PROPAGATION.md`
    § *The instance*, as revised).
- **`.leakscanbinaries`** written: all 50 tracked binaries listed with
  reasons, `by=agent`; nothing stripped, nothing under `site/` changed.
  Board `340/340` closed; `340/330` kept open for its strip-or-keep `icc`
  question only.
- **`.atelier-floor.json`** declares `"visibility": "public"` (true since
  2026-08-09). That brings `pdlistscan` into scope: it warns on a missing
  `docs/PERSONAL-DATA.md` and blocks from 2027-03-08. Filed as `340/350`.
- **`.githooks/commit-msg` and `.githooks/pre-merge-commit`** added, copied
  unchanged from atelier's samples. `core.hooksPath` points at the primary
  checkout's `.githooks/`, so they take effect there on its next pull.

## Measured

- `floor.py --plane ci` exit 0 before and after; pathscan's remaining
  findings are pre-existing and warn-only.
- `leakscan --root .`: 0 G3 findings (was 93).
- `allowmarker --census`: 0 malformed. `board --check`: current.
  `sizescan --check`: clean. `attribscan` (whole tree, report-only): 301.
- This repo's own gates that read the touched files: `check_visibility`,
  `check_no_deps`, `gen_sbom --check`, `check_decisions`, `check_images`,
  `check_records`, `check_fallback`, `check_precache`, `validate` — all
  exit 0. No browser check was run: nothing under `site/` changed.
- CI at the pushed head: in the closing report to the orchestrator, by run
  URL.

## Not done, and why

- **The session index is not rotated.** `docs/SESSIONS.md` is 13,000+ lines;
  `RECORD.md` sanctions rotating older entries verbatim to
  `SESSIONS-ARCHIVE.md`. That is a bulk move in a record store, so it is put
  to the owner rather than done.
- **The pre-commit hook** in `.githooks/` is older than atelier's current
  sample (the sample adds a missing-`python3` guard). Left as is.

## Identifiers

- **Session:** 52b6d566 (headless, Opus 5.5), dispatched by e820bff5.
- **Commits:** `d222fdef` (pin bump), `99cdc6fc` (binaries, visibility,
  hooks, board), and the commit that adds this record.
- **Pull requests:** none.
- **Board:** `340/340` closed; `340/330` updated; `340/350` filed.
- **Worktrees:** the dispatcher's detached worktree; the launcher removes it.
- **Agents:** none launched.
