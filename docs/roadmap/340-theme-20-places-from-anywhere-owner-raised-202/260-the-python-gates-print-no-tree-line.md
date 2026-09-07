- [ ] 🔎 **The Python gates print no tree line, so CLAUDE.md's "EVERY check
      prints a second indented line naming the tree it served" is false for
      the half of the list that is not a browser check** `[S][tools]` — found
      2026-09-08 (session faves-o1) by the agent delivering `490/020`, while
      reading the tree lines it was told to read.

  **The fact.** `validate.py`, `check_no_deps.py`, `check_versions.py`,
  `check_decisions.py`, `split_data.py --check` and the rest of the Python
  gates print their verdict and nothing about which tree produced it. Only
  the `tools/*_check.mjs` family calls `report.summary(SITE)`. The sentence
  in CLAUDE.md is written as a mechanism against the drifted-cwd failure
  (a session verified green against the wrong worktree), and for these gates
  it is a discipline again.

  🔑 **Why it matters here specifically.** Sub-agents in this repo run from
  worktrees by rule, and the orchestrator reads their pasted output. A
  `validate.py` line reading `All 57 restaurant file(s) valid` carries no
  evidence of *which* 57 files, and the primary checkout and a worktree can
  differ by exactly the change under test.

  📋 **Options.** (1) A one-line helper in `tools/` that every Python gate
  calls last, printing `tree <root> · <branch>@<sha>` in the same shape as
  the browser checks — the shape is already defined, so this is copying it.
  (2) Narrow the CLAUDE.md sentence to the browser checks and leave the
  gates as they are. (3) Both: narrow the sentence now, widen the mechanism
  when the next gate is touched. Recommendation: (1) — the sentence is right
  about what a check should do, and the fix is smaller than the paragraph
  explaining the gap.
