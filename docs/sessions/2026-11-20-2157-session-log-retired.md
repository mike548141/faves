# 2026-11-20 2157 UTC — the one-file session log retired into this folder

**Dispatched by** an estate health sweep (orchestrator session 19378351),
working headless in a detached worktree off `origin/main`, to bring the
session log to atelier's current form (atelier roadmap `010/270`): the
date-named `docs/sessions/` folder is the session log and its own index, and
`docs/SESSIONS.md` goes.

**The owner's words**, 2026-11-20, verbatim, as the dispatch quoted them:
*"This does not sound like doctrine, they should not be in one big sessions
file in the first place"*; then 💬 his answer to the three routes he was
offered, *"Retire SESSIONS.md"*. That was an answer to a question, not a
ruling. The board and session archives had already been cut by the previous
session (`a831b934`); `archivecut.py --plan` reported `ROADMAP-DONE.md` as
nothing to do.

## What changed

| Commit | What |
|---|---|
| `9350e892` | `.wrapscanignore` exempts `docs/sessions/` instead of the old index; `.plainscanignore` drops its `docs/SESSIONS.md` line |
| `f761f43b` | atelier's `archivecut.py --cut`: `docs/SESSIONS.md` (last commit `3c3fd8e5`) retired; its 212 entries placed word for word in the session files they link; its preamble fenced in the new `README.md` here |
| `32817742` | `CLAUDE.md` read order and closing rule, `CONTRIBUTING.md` (two places) and `docs/MODEL-ECONOMICS.md` now point at the folder |

**Every proof line read PASS** at `--plan` and `--cut`, and after the commit
`--verify` printed PASS for all three retired files: `ROADMAP-DONE.md`
(34 item files), `SESSIONS.md` (212 session files and the README) and
`SESSIONS-ARCHIVE.md` (38 detail files and the index block). Before the
commit `--verify` read FAIL for `SESSIONS-ARCHIVE.md`. That was expected: it
reads the index as it stood just before the commit that retires it, and that
commit did not exist yet.

**What the move broke first, and the fix.** The pre-commit hook refused the
retirement: `wrapscan` found 424 lines over 85 columns. All of them were the
tool's own label line and the verbatim index entries it placed at the top of
each session file. They cannot be rewrapped, because `--verify` rebuilds the
retired file from them byte for byte. Until now this repo exempted only the
index and kept the detail files column-checked. The exemption now covers the
folder, as atelier's own `.wrapscanignore` does. The cost is stated in the
ignore file: a new session file is no longer column-checked at commit time.
That went in as its own commit, so the retirement commit holds only the
tool's changes.

**Left as written.** `pathscan` (warn-only here) now reports `docs/SESSIONS.md`
as missing in about a dozen records: roadmap items, ADRs 0031 and 0137, the
changelog, and a dated read-cost measurement in `MODEL-ECONOMICS.md`. Each
records what was true then. atelier carries the same class and leaves it
standing (its `320/880`: pathscan cannot tell a record from a live page).

## Not done here

- 🚩 The atelier pin (`2a6d7a4`) is 251 commits behind, and the safety floor
  has moved since. The pin bump and the verbatim floor re-copy were not this
  run's task.
- `pdlistscan` (advisory, blocking from 2027-03-08) reports that this public
  repo has no `docs/PERSONAL-DATA.md` listing its two owner-approved
  personal-data exceptions. Writing that list is the owner's call.

## Evidence

- Local, before each commit: floor hook plane clean or advisory only;
  `linkscan` clean (1295 links); `board --check` current; `wrapscan` clean;
  `sizescan` clean; `check_visibility.py` holds.
- CI at `f761f43b` (the retirement): CI
  [success](https://github.com/mike548141/faves/actions/runs/44825446358),
  floor [success](https://github.com/mike548141/faves/actions/runs/44825446538).
- CI at `32817742` (the text changes): CI
  [success](https://github.com/mike548141/faves/actions/runs/44825747281),
  floor [success](https://github.com/mike548141/faves/actions/runs/44825747810),
  FX rates [success](https://github.com/mike548141/faves/actions/runs/44825747116).
- This file's own commit has its runs on GitHub; it changes one record only.
