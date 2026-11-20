# 2026-11-20 1045 UTC — the pre-split archives cut into the stores, board index in its new form

**Dispatched by** an estate health sweep (orchestrator session 19378351),
working headless in a detached worktree off `origin/main`, to bring the board
to atelier's current form: cut the two frozen pre-split archives into their
stores, then rebuild `docs/ROADMAP.md` in the form `board.py` now writes.

**The owner's words**, 2026-11-20, verbatim, as the dispatch quoted them:
*"I think we should find a way that the old ROADMAP-DONE.md is either split
back out into files to match the current design for board work management. Or
worst case if that is not going to work or ruin the historical record held in
ROADMAP-DONE.md then we create a theme folder to store ROADMAP-DONE.md in so
its not in the docs/ folder anymore"*. Then 💬 his answer to the route he was
offered, *"Split, fall back to move (Recommended)"*, covering
`SESSIONS-ARCHIVE.md` too. That was an answer to a question, not a ruling.

## What changed

atelier's `archivecut.py` chose route (a), the split, for both files, and every
proof line read PASS:

| Source (last commit) | Became | Proof |
|---|---|---|
| `docs/ROADMAP-DONE.md` (`d57e359f`) | 34 item files and a section README in `docs/roadmap/990-done-before-the-split/` | 51 headings in order; 2438 non-heading lines matched; rebuilt byte for byte |
| `docs/SESSIONS-ARCHIVE.md` (`0243e9cc`) | 38 files `docs/sessions/*-archived-NNN-*.md` (000 is its preamble), one index line each | 949 non-heading lines matched; rebuilt byte for byte |

After the commit, `archivecut.py --verify` printed PASS for both against the
committed copy. The tool re-pointed 119 links in 27 files to the new paths,
one of them a link definition in ADR 0033: a target, not its substance.

**What the move broke, and the fix for each:**

- Two re-pointed lines ran past 85 columns. Rewrapped (theme 050 and 340
  READMEs).
- The frozen 990 README re-adds, as new lines, one line that trips a local
  literal term. The same line had been public in the old file since 2026-08,
  and a per-line marker would change the bytes `--verify` rebuilds from. So one
  reasoned `.leakscanignore` line covers that file alone.
- `.plainscanignore` and `CONTRIBUTING.md` named the old paths and now name
  the new ones.
- In this index's preamble, the re-point turned the archive link into a link to
  this file itself. The link text is restored and now points at the archive's
  `000` file. A paragraph under the 2026-11-13 split note says so.

**Board index.** `board.py rebuild` wrote the new form: a summary table, then
the unfinished items only (294 lines, was 513). `board --check` is clean. It
landed in the cut commit, because the floor blocks a stale index.

## Evidence

- Cut commit `a831b934`. CI, floor and FX rates all **success** at that SHA:
  [CI](https://github.com/mike548141/faves/actions/runs/44722885069),
  [floor](https://github.com/mike548141/faves/actions/runs/44722885504).
- Floor, ci plane, run locally before the commit: everything clean or advisory
  except leakscan's local terms. Its 11 remaining findings all predate this
  session (a review, an ADR, two theme-39 items, one session file, the
  estimates README), and none is in a file this session touched. CI has no local
  term list, so it cannot see them.

## Left for the owner

- 🚩 This repo's atelier pin is 235 commits behind, and the floor text has moved
  since. A pin bump re-copies the floor verbatim; this session did not do it.
- 🤔 The 11 local-term leakscan findings: these are names already published in
  this repo's history. Whether any of them should change is the owner's call.
