- [x] 🔎 **The Python gates print no tree line, so CLAUDE.md's "EVERY check
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

  ✅ **DELIVERED 2026-09-09 (session faves-p1, ADR 0113, PR #31)** — option (1),
  the filing session's own recommendation. `tools/lib/tree.py` prints
  `tree <root> · shell <version> · <branch>@<sha>` in `browser.mjs`'s shape,
  registered from each tool's `__main__` block as an **exit hook**, so it lands
  on every exit path including a refusal and an uncaught exception.

  🔎 **The population is 26, not the six this item named** — enumerated from
  CLAUDE.md's verify list, `.github/workflows/ci.yml` and `.githooks/pre-commit`
  rather than from the symptom. The item's "and the rest" hid twenty: the three
  id seeders, seven tool test-suites (four of which only CI runs —
  `test_registry`, `test_find_addons`, `test_check_versions`,
  `test_tag_addon_options`), `check_precache`, `check_records`,
  `check_provenance`, `check_fallback`, `check_visibility`, `gen_sbom`,
  `fetch_fx`, `intake_index`, `products`, `recipe_estimates` and `serve.py`.
  25 announce at exit; `serve.py` prints at startup, because it does not return
  until Ctrl-C. Eleven further authoring tools are deliberately unwired and
  CLAUDE.md says which class they are.

  🔑 **The root is each gate's own `__file__`, never `os.getcwd()`.** All 26
  already resolved their data that way. A cwd-derived helper would print the
  right answer in every ordinary run and the wrong one in exactly the drifted-cwd
  case this exists to catch — [ADR 0072](../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
  face 5, rebuilt as its own fix. `--self-test` (11 cases, wired into CI's
  `repo invariants` job) stages that: a probe living in tree A run with `cwd = B`
  must still name A. Break-probed — reverting `tree_line` to `Path.cwd()` fails
  that case and **only** that case.

  🔎 **Two defects the self-test found in its own subject, on its first run.**
  `SHELL_VERSION` was read by "first quoted run after the constant's name" and
  `sw.js` names it in a comment seven lines above the assignment, so the real
  tree reported `shell version unknown`; and `git rev-parse --abbrev-ref HEAD
  --short HEAD` answers the branch name **twice** (`main@main`) because
  `--abbrev-ref` is a modifier applying to every rev after it, while the
  reordered `--short HEAD --abbrev-ref HEAD` is refused outright. Both were
  invisible to reasoning and immediate under measurement.

  🚩 **Nothing enforces that a tool ADDED to the verify list gets wired.** The
  26 are the ones something invokes today; a 27th would print no line and no
  gate would notice. Recorded in ADR 0113's consequences and in CLAUDE.md rather
  than fixed, because the fix (a gate that parses CLAUDE.md's fence) is a bigger
  thing than the defect and is not this item's ask.
