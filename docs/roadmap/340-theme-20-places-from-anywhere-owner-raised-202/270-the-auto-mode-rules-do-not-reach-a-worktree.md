- [ ] 🚩 **The machine-side half of the 2026-08-17 force-push ruling does not
      reach a worktree** `[XS][process]` — found 2026-09-08 (session faves-o1)
      when a sub-agent reported `.claude/settings.local.json` "missing", and it
      was: from its worktree. The file is present in the primary checkout.

  **The fact.** CLAUDE.md's *A blocked command is a decision* bullet says the
  `autoMode` denials — any force-push to `main` by any syntax, and re-running
  a refused command under a different spelling — live in the gitignored
  `.claude/settings.local.json`, and that a fresh clone has none of it. A
  worktree is the same shape: a separate directory with no copy, and the
  harness reads that file per directory. So the one place this repo tells
  agents to work (a worktree, by the concurrency rule) is the one place the
  ruling's mechanism is absent.

  🔑 Not a breach — nothing was force-pushed — and the sub-agents this session
  ran inherited the orchestrator's permissions. But a session opened *in* a
  worktree (`claude` from that directory) runs with none of it, which is the
  case the ruling was written for: the 2026-08-17 tunnelling was a sub-agent.

  📋 **Options.** (1) Move those `autoMode` rules to the user-level settings
  file so every directory on the machine inherits them — the deny is about
  `main` on this repo, so scope the rule text accordingly. (2) Copy the file
  into each worktree at `worktree add` time (a line in the setup command the
  briefs already carry). (3) Record only. Recommendation: (1); the rule is
  about the machine, and a per-directory file was always the wrong home for
  a rule that must hold everywhere the repo is checked out. Owner's call —
  it edits his settings, not the repo.
