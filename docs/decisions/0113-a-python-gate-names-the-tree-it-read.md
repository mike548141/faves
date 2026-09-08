# 0113 — A Python gate names the tree it read, and it is never the working directory

**Status**: accepted • **Date**: 2026-09-09

## Context

`CLAUDE.md` has said since 2026-08-17 that **every** check prints a second,
indented line naming the tree it served, that tree's `SHELL_VERSION` and its
`branch@sha`, and it says why: a session's shell cwd drifted out of its
worktree via one compound command containing a `cd`, its edits were safe
(absolute paths) and its *verification* ran against a tree without the change.
Everything green, everything meaningless. It surfaced only because a **passing**
run reported 22 assertions where the agent had just said 25.

That sentence was **false for the Python gates**, which are more than half the
verify list. Only `tools/*_check.mjs` called `report.summary(SITE)`. `validate.py`
printed `All 57 restaurant file(s) valid` and named no tree at all — and the
primary checkout and a worktree differ by exactly the change under test. Found
2026-09-08 (roadmap `340/260`) by the agent delivering `490/020`, while reading
the tree lines it had been told to read.

The gap matters here specifically because sub-agents in this repo work from
worktrees **by rule**, and an orchestrator merges on their pasted output.

## Decision

**`tools/lib/tree.py` prints the line, and every Python gate on the verify list
registers it.** The shape is byte-compatible with `browser.mjs`'s
`treeIdentity` — a second shape for one fact is a second thing to learn:

```
   tree /Users/mike/worktrees/faves-3b-gate-tree-line · shell 2026-09-09.2 · p1-gate-tree-line@cbfca81 · worktree
```

Three things about it are decisions rather than details.

**1. The root is the gate's own `Path(__file__).resolve().parent.parent`, never
`os.getcwd()`.** Every gate already resolves its data that way, so that — and
only that — is the tree it read. A cwd-derived helper would print the *right*
answer in every ordinary run and the *wrong* one in exactly the drifted-cwd
case it exists to catch: [ADR
0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
decorative guard, face 5, rebuilt as a fix for itself.

**2. It fires from an exit hook, registered in each tool's `__main__` block.**
Every gate has several return points — a pass, one or more refusals, an
argument error — and `browser.mjs`'s own comment names the alternative failure:
a line added to nine places and missed in the tenth. `atexit` covers all of
them, including an uncaught exception, which is the path where *"which tree was
that?"* is hardest to answer afterwards. Registering inside `__main__` rather
than at import keeps a tool that imports another tool (`seed_section_ids`
imports `seed_dish_ids`) from printing two lines.

**3. The states that read as "fine" are named out loud.** A detached HEAD
prints `detached@<sha>`, because `git branch --show-current` is **empty** there
and an empty branch rendered as nothing looks like an ordinary run. A stopped
rebase — the commonest route to an accidental detached HEAD, and the state a
concurrent session is most often in — prints `REBASE IN PROGRESS`. A linked
worktree prints `worktree`. A tree with no git prints `not a git checkout`
rather than falling silent, because an absent identity is otherwise
indistinguishable from a clean one. Nothing here raises: a verdict line that
dies takes the verdict with it.

`python3 tools/lib/tree.py --self-test` proves the line still discriminates —
eleven cases, run in CI. The decisive one stages the incident itself: a probe
that lives in tree A is run with `cwd = B`, and the line must still name A.
**Break-probed 2026-09-09**: replacing the caller's root with `Path.cwd()` fails
that case and only that case.

## Rejected

- **Narrow the `CLAUDE.md` sentence to the browser checks** (the filing
  session's option 2). It is the cheaper edit and it makes the document true.
  It loses because the sentence is *right about what a check should do*, and the
  paragraph explaining the exemption would be longer than the helper.
- **Copy the browser line's SITE-directory root.** The browser checks name
  `…/faves/site` because that is literally what they served over HTTP. The
  Python gates read `site/`, `data/`, `docs/` and `tools/`, so the repo root is
  the honest answer for them. The two lines therefore differ by one path
  segment on purpose, and `CLAUDE.md` says so.
- **A call at the end of each `main()`** instead of an exit hook. Visible in
  the source, which is the argument for it, and it silently skips every early
  return — including the refusals, which are the runs whose tree a reader most
  needs.
- **A fail-soft `try: import … except ImportError: pass`.** It would have saved
  editing the three self-tests that build minimal fixture trees carrying one or
  two tools. It is also the exact shape of a guard that stops working and says
  nothing: the announcement would vanish wherever the helper failed to travel.
  The import is hard, and `check_records.py --selftest`, `test_split_data.py`
  and `test_check_versions.py` copy `tools/lib/` into their fixture trees.

## Consequences

- **26 Python entry points carry it** — every one CLAUDE.md's verify list,
  `.github/workflows/ci.yml` or `.githooks/pre-commit` invokes. 25 announce at
  exit; `serve.py` prints at startup instead, because it does not return until
  Ctrl-C and an identity printed then arrives after the browser has already
  been looking at the wrong site.
- **Nothing that parses these gates' output was disturbed.** Checked
  2026-09-09 across `tools/*.py`, the CI workflow and the hook: every consumer
  asserts on an exit code or on a substring's presence, and none counts lines
  or parses the whole of stdout. No gate on the list has a machine-readable
  stdout mode. `FAVES_NO_TREE_LINE=1` suppresses the line, as insurance for a
  future consumer rather than a present need.
- **The fixture trees the self-tests build now carry `tools/lib/`.** A tool
  copied without it dies on the import — loudly, which is the intended
  failure.
- **It reports; it does not gate.** No run fails because its tree is odd. What
  the line buys is that a wrong-tree green run is *visible in the artefact
  everyone already reads*, which is the difference between a mechanism and a
  discipline.
- 🚩 **The 26 are the ones something invokes today.** Eleven other Python
  tools under `tools/` — `registry.py`, `tag_allergens.py`, `find_addons.py`
  and the rest — are authoring tools that no gate list runs, and they are not
  wired. A future tool joining the verify list must be wired by hand; nothing
  enforces that, and this record is the only place that says so.
