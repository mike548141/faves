#!/usr/bin/env python3
"""Say which tree a gate actually read — the Python half of CLAUDE.md's
"every check prints a second, indented line naming the tree it served".

    python3 tools/lib/tree.py --self-test   # prove the line still discriminates

WHY THIS EXISTS. A session's shell cwd drifted out of its worktree via one
compound command containing a `cd`. Its edits used absolute paths and were
safe; its VERIFICATION ran against a tree without the change — everything
green, everything meaningless. It surfaced only because a *passing* run
reported 22 assertions where the agent had just said 25. Nobody interrogates a
green run, so the tree's identity has to be in the artefact everyone already
reads.

`tools/lib/browser.mjs` has printed that line since 2026-08-17 and CLAUDE.md
said EVERY check did. It was false for the Python gates, which are half the
verify list: `validate.py`'s `All 57 restaurant file(s) valid` named no tree at
all, and the primary checkout and a worktree differ by exactly the change under
test (roadmap `340/260`, [ADR 0113](../../docs/decisions/0113-a-python-gate-names-the-tree-it-read.md)).

🛑 **THE ROOT IS THE GATE'S OWN, NEVER `os.getcwd()`.** Every gate on the
verify list resolves its paths from `Path(__file__).resolve().parent.parent`,
so that — and only that — is the tree it read. A helper that reported the
working directory would print the *right* answer in every ordinary run and the
*wrong* one in exactly the drifted-cwd case it exists to catch: [ADR
0072](../../docs/decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
decorative guard, face 5. The self-test's decisive case runs a probe out of
tree A with `cwd=B` and demands the line still name A.

SHAPE. Byte-compatible with `browser.mjs`'s `treeIdentity`, because a second
shape for one fact is a second thing to learn:

    tree /Users/…/faves · shell 2026-09-09.2 · main@cbfca81

with these extra parts, each of which exists because the state it names reads
as "fine" when it is not:

  · worktree               a linked worktree, which is where sub-agents work
  · detached@<sha>         in place of <branch>@<sha> — `git branch
                           --show-current` is EMPTY here, and an empty branch
                           rendered as nothing looks like an ordinary run
  · REBASE IN PROGRESS     the commonest way to end up detached by accident
  · not a git checkout     said out loud, because a silently absent identity
                           is indistinguishable from a clean one
  · ⚠ not the git root: X  the gate's root is not where git thinks the tree
                           starts — true of the throwaway fixture trees the
                           self-tests build, and of nothing healthy

IT NEVER RAISES. A verdict line that dies takes the verdict with it, so every
lookup here degrades to a plainer line rather than an exception. It is also
never a *failure*: this reports, it does not gate.

`FAVES_NO_TREE_LINE=1` suppresses it. Nothing in this repo parses these gates'
stdout for anything but substrings and exit codes (checked 2026-09-09 across
`tools/*.py`, `.github/workflows/ci.yml` and `.githooks/pre-commit`), so the
switch is insurance for a future machine consumer, not a present need.

Stdlib only — ADR 0001, and `check_no_deps.py` enforces it.
"""

import atexit
import os
import re
import subprocess
from pathlib import Path

ENV_OFF = "FAVES_NO_TREE_LINE"

# Long enough for a cold FS, short enough that a wedged index cannot hold the
# verdict hostage. Same budget browser.mjs uses.
GIT_TIMEOUT_S = 2


def _git(root, *args):
    """git, read-only, in `root`. Returns stripped stdout, or None."""
    try:
        r = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True,
            text=True,
            timeout=GIT_TIMEOUT_S,
        )
    except (OSError, subprocess.SubprocessError):
        return None  # no git on the machine, or it hung — neither is fatal here
    return r.stdout.strip() if r.returncode == 0 else None


def _shell_version(root):
    """The tree's `SHELL_VERSION`, or None.

    This is the half that survives two checkouts having the same path *shape*:
    two worktrees of faves differ by one directory name, which is easy to skim
    past, and they almost never carry the same version stamp.
    """
    try:
        src = (Path(root) / "site" / "sw.js").read_text(encoding="utf-8")
    except OSError:
        return None
    # The ASSIGNMENT, not the first mention. `sw.js` names the constant in a
    # comment seven lines above it, and a "first quoted run after the name"
    # scan reads that comment and answers None — which it did, on the real
    # tree, until the first run of this file's self-test.
    m = re.search(r"SHELL_VERSION\s*=\s*[\"']([^\"']+)[\"']", src)
    return m.group(1) if m else None


def _git_identity(root):
    """The git half of the line, as a list of parts. Never raises."""
    # One call for the three path facts: it works even on an unborn HEAD, which
    # the branch/sha call below does not.
    paths = _git(root, "rev-parse", "--show-toplevel", "--git-dir",
                 "--git-common-dir")
    if not paths:
        return ["not a git checkout"]
    lines = paths.splitlines()
    toplevel = lines[0] if len(lines) > 0 else ""
    git_dir = lines[1] if len(lines) > 1 else ""
    common_dir = lines[2] if len(lines) > 2 else ""

    parts = []

    # `--git-dir` may come back relative to `root`; resolve both before any
    # comparison, or a linked worktree reads as an ordinary checkout.
    def _abs(p):
        p = Path(p)
        return (Path(root) / p) if not p.is_absolute() else p

    git_dir_abs = _abs(git_dir) if git_dir else None
    common_abs = _abs(common_dir) if common_dir else None

    # TWO calls, not one. `--abbrev-ref` is a MODIFIER that applies to every
    # rev after it, so `rev-parse --abbrev-ref HEAD --short HEAD` answers the
    # branch name twice — `main@main` — and `rev-parse --short HEAD
    # --abbrev-ref HEAD` is refused outright. Both measured 2026-09-09.
    branch = _git(root, "rev-parse", "--abbrev-ref", "HEAD")
    sha = _git(root, "rev-parse", "--short", "HEAD")
    if not branch and not sha:
        # A repo with no commit yet. Saying so beats a blank where a name goes.
        parts.append("no commits yet")
    else:
        branch = (branch or "").splitlines()[0] if branch else ""
        sha = (sha or "").splitlines()[0] if sha else ""
        # git answers the literal string "HEAD" when detached, and
        # `git branch --show-current` answers with NOTHING — which is the
        # shape that reads as "fine". Name it.
        if branch == "HEAD" or not branch:
            parts.append(f"detached@{sha}" if sha else "detached")
        else:
            parts.append(f"{branch}@{sha}" if sha else branch)

    if git_dir_abs and common_abs:
        try:
            if os.path.realpath(git_dir_abs) != os.path.realpath(common_abs):
                parts.append("worktree")
        except OSError:
            pass

    # A rebase is the commonest route to a detached HEAD, and the state a
    # session is most likely to be in when it forgets which tree it is in.
    # Read off the git dir we already have — no extra subprocess.
    if git_dir_abs:
        for marker in ("rebase-merge", "rebase-apply"):
            try:
                if (git_dir_abs / marker).exists():
                    parts.append("REBASE IN PROGRESS")
                    break
            except OSError:
                pass

    if toplevel:
        try:
            if os.path.realpath(toplevel) != os.path.realpath(str(root)):
                parts.append(f"⚠ not the git root: {toplevel}")
        except OSError:
            pass

    return parts


def tree_line(root):
    """The one line, indented three spaces to sit under a verdict.

    `root` is the gate's OWN root — `Path(__file__).resolve().parent.parent` —
    and passing anything derived from `os.getcwd()` defeats the whole point.
    """
    root = Path(root)
    parts = [f"tree {root}"]
    version = _shell_version(root)
    parts.append(f"shell {version}" if version else "shell version unknown")
    parts.extend(_git_identity(root))
    return "   " + " · ".join(parts)


def announce(root):
    """Print the tree line when this process exits, however it exits.

    WHY `atexit` AND NOT A CALL AT THE END OF `main()`. Every gate here has
    several return points — a clean pass, one or more refusals, an argument
    error — and browser.mjs's own comment names the failure this avoids: a line
    added to nine places and missed in the tenth. An exit hook fires on all of
    them, including an uncaught exception, which is the path where "which tree
    was that?" is hardest to answer afterwards.

    Call it from the `if __name__ == "__main__":` block, not at import time, so
    a tool that imports another tool (seed_section_ids imports seed_dish_ids)
    does not print two lines.
    """
    if os.environ.get(ENV_OFF):
        return
    resolved = Path(root)
    atexit.register(lambda: print(tree_line(resolved)))


# --- Proving it still discriminates ---------------------------------------
# Everything below is the self-test and runs only from the command line.

def _self_test():  # noqa: C901 — a flat list of cases reads better than five
    """Build real trees and demand the line tells them apart.

    A helper that printed the same string from two different trees would be
    decorative in ADR 0072's exact sense: its output would be the same whether
    or not the thing it guards is broken.
    """
    import shutil
    import sys
    import tempfile

    failures = []

    def check(name, ok, detail=""):
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if detail and (not ok or "-v" in sys.argv):
            print(f"        {detail}")
        if not ok:
            failures.append(name)

    here = Path(__file__).resolve().parent

    def git(repo, *args, check_rc=True):
        r = subprocess.run(["git", "-C", str(repo), *args],
                           capture_output=True, text=True)
        if check_rc and r.returncode != 0:
            raise SystemExit(f"self-test setup: git {' '.join(args)}\n{r.stderr}")
        return r

    def make_tree(base, name, shell_version, branch):
        """A tree carrying this helper and a probe that uses it exactly as a
        gate does — resolving its root from its own __file__."""
        root = base / name
        (root / "tools" / "lib").mkdir(parents=True)
        (root / "site").mkdir(parents=True)
        shutil.copy(here / "tree.py", root / "tools" / "lib" / "tree.py")
        (root / "tools" / "lib" / "__init__.py").write_text("")
        (root / "site" / "sw.js").write_text(
            f'const SHELL_VERSION = "{shell_version}";\n')
        (root / "tools" / "probe.py").write_text(
            "import sys\n"
            "from pathlib import Path\n"
            "sys.path.insert(0, str(Path(__file__).resolve().parent))\n"
            "from lib.tree import announce\n"
            "ROOT = Path(__file__).resolve().parent.parent\n"
            "if __name__ == '__main__':\n"
            "    announce(ROOT)\n"
            "    print('probe ran')\n")
        git(root, "init", "-q", "-b", branch)
        # RFC 2606 reserves .invalid — this addresses nobody and cannot be
        # delivered to. git refuses to commit without an identity.
        git(root, "config", "user.email", "t@example.invalid")  # leakscan:allow: RFC 2606 reserved .invalid TLD, throwaway repo
        git(root, "config", "user.name", "T")
        git(root, "config", "commit.gpgsign", "false")
        git(root, "add", "-A")
        git(root, "commit", "-qm", "base", "--no-verify")
        return root

    def run_probe(root, cwd):
        # The probe is named by ABSOLUTE path and the cwd is set separately —
        # that separation IS the drift case. Naming it relatively runs whatever
        # probe happens to be under the cwd, which is a different experiment
        # and one this self-test ran, and passed on, in its first draft.
        r = subprocess.run([sys.executable, str(Path(root) / "tools" / "probe.py")],
                           cwd=str(cwd), capture_output=True, text=True)
        for line in r.stdout.splitlines():
            if line.lstrip().startswith("tree "):
                return line
        return f"(no tree line; rc={r.returncode} err={r.stderr.strip()[:120]})"

    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        a = make_tree(base, "alpha", "2026-01-01.1", "branch-a")
        b = make_tree(base, "beta", "2026-02-02.2", "branch-b")

        line_a = run_probe(a, a)
        line_b = run_probe(b, b)

        check("a tree names itself",
              str(a) in line_a and "branch-a@" in line_a and
              "shell 2026-01-01.1" in line_a, line_a)
        check("a DIFFERENT tree produces a DIFFERENT line",
              line_a != line_b, f"A: {line_a}\n        B: {line_b}")
        check("the other tree names ITSELF, not the first",
              str(b) in line_b and str(a) not in line_b and
              "branch-b@" in line_b, line_b)

        # THE ONE THAT MATTERS. This is the drifted-cwd incident, staged: the
        # gate lives in A, the shell is standing in B. A cwd-derived helper
        # would print B here and the guard would be worthless.
        drifted = run_probe(a, b)
        check("cwd drift does NOT move the answer — a gate in A run from B "
              "still names A",
              drifted == line_a, f"cwd=B: {drifted}\n        expected: {line_a}")

        # A control. If two runs of the same tree could differ, "different
        # line" above would prove nothing.
        check("the same tree twice gives the same line",
              run_probe(a, a) == line_a, line_a)

        # Detached HEAD: `git branch --show-current` is empty here, which is
        # the state that reads as an ordinary run when it is rendered as
        # nothing at all.
        sha = git(a, "rev-parse", "HEAD").stdout.strip()
        git(a, "checkout", "-q", "--detach", sha)
        det = run_probe(a, a)
        check("a detached HEAD says so, and does not read as a branch",
              "detached@" in det and "branch-a@" not in det, det)
        git(a, "checkout", "-q", "branch-a")

        # Mid-rebase. Deliberately a REAL interrupted rebase rather than a
        # hand-made rebase-merge directory: the claim is about the state git
        # actually leaves behind.
        git(a, "checkout", "-q", "-b", "side")
        (a / "conflict.txt").write_text("side\n")
        git(a, "add", "-A")
        git(a, "commit", "-qm", "side", "--no-verify")
        git(a, "checkout", "-q", "branch-a")
        (a / "conflict.txt").write_text("main\n")
        git(a, "add", "-A")
        git(a, "commit", "-qm", "main-side", "--no-verify")
        git(a, "checkout", "-q", "side")
        stopped = git(a, "rebase", "branch-a", check_rc=False)
        mid = run_probe(a, a)
        check("a stopped rebase is named, not rendered as a blank branch",
              "REBASE IN PROGRESS" in mid,
              f"{mid}\n        (rebase rc={stopped.returncode})")
        git(a, "rebase", "--abort", check_rc=False)

        # A linked worktree — where every sub-agent in this repo works.
        wt = base / "alpha-wt"
        git(a, "worktree", "add", "-q", "-b", "wt-branch", str(wt))
        shutil.copy(here / "tree.py", wt / "tools" / "lib" / "tree.py")
        wt_line = run_probe(wt, wt)
        check("a worktree names the worktree and is marked as one",
              str(wt) in wt_line and "worktree" in wt_line and
              "wt-branch@" in wt_line, wt_line)
        check("the worktree's line differs from its parent checkout's",
              wt_line != run_probe(a, a), wt_line)

        # A tree with no git at all still identifies itself; a silently absent
        # identity is indistinguishable from a clean one.
        bare = base / "nogit"
        (bare / "tools" / "lib").mkdir(parents=True)
        shutil.copy(here / "tree.py", bare / "tools" / "lib" / "tree.py")
        (bare / "tools" / "lib" / "__init__.py").write_text("")
        (bare / "tools" / "probe.py").write_text(
            (a / "tools" / "probe.py").read_text())
        bare_line = run_probe(bare, bare)
        check("a tree with no git says so out loud",
              str(bare) in bare_line and "not a git checkout" in bare_line and
              "shell version unknown" in bare_line, bare_line)

        # The opt-out has to actually opt out, or the switch is a lie.
        env = {**os.environ, ENV_OFF: "1"}
        off = subprocess.run([sys.executable, "tools/probe.py"], cwd=str(a),
                             capture_output=True, text=True, env=env)
        check("FAVES_NO_TREE_LINE=1 suppresses the line",
              "tree " not in off.stdout and "probe ran" in off.stdout,
              off.stdout.strip())

    print()
    if failures:
        print(f"✗ tree-line self-test — {len(failures)} failed: "
              f"{', '.join(failures)}")
        return 1
    print("✓ tree-line self-test — all cases passed; the line discriminates "
          "between trees and is not derived from the working directory")
    return 0


if __name__ == "__main__":
    import sys as _sys
    if "--self-test" in _sys.argv:
        _sys.exit(_self_test())
    # No argument: print this tree's own line, which is the cheapest way to
    # see what a gate is about to say.
    print(tree_line(Path(__file__).resolve().parent.parent.parent))
