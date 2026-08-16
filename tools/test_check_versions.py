#!/usr/bin/env python3
"""Prove `check_versions.py` actually fires — on a real repo, not a fixture.

A guard's failure mode is silence: one that can never fire looks exactly like
a rule nobody ever breaks. That trap has been sprung four times in this repo
already (see the drift-check note in CLAUDE.md), so a new guard arrives with a
test that breaks the rule and watches it fail.

The method is the same crude, honest one `test_validate.py` uses: build a
throwaway git repo shaped like this one, commit a change that breaks the
lockstep, and assert the checker exits non-zero — then commit the version bump
and assert it goes quiet. Synthetic repos rather than this repo's own history,
because history gets rewritten and a test pinned to a SHA rots into a skip.

    python3 tools/test_check_versions.py        # run every case
    python3 tools/test_check_versions.py -v     # show each case's output

Exit 0 = the guard fired on every break and stayed quiet on every clean case;
1 = it missed one, which is a hole in the guard.
Stdlib only, no build step. Never writes outside a temporary directory.
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKER = ROOT / "tools" / "check_versions.py"

SW_TEMPLATE = """// stand-in for site/sw.js
const SHELL_VERSION = "{shell}";
const DATA_VERSION = "{data}";
"""


def git(repo, *args, check=True):
    r = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True
    )
    if check and r.returncode != 0:
        raise SystemExit(f"test setup: git {' '.join(args)} failed:\n{r.stderr}")
    return r


def write(repo, rel, text):
    p = repo / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def commit(repo, message):
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", message)
    return git(repo, "rev-parse", "HEAD").stdout.strip()


def make_repo(tmp):
    """A minimal repo with sw.js, one shell file and one data file committed."""
    repo = Path(tmp) / "repo"
    repo.mkdir()
    git(repo, "init", "-q")
    # git refuses to commit without an identity. `.invalid` is RFC 2606's
    # reserved unresolvable TLD, so this addresses nobody and can never be
    # delivered to.
    git(repo, "config", "user.email", "test@example.invalid")  # leakscan:allow: RFC 2606 reserved .invalid TLD — a required git identity for a throwaway repo, addresses no one
    git(repo, "config", "user.name", "Test")
    # The checker resolves paths from its OWN location, so it has to be run
    # against a tree that carries it — copy it in rather than pointing at ours.
    write(repo, "tools/check_versions.py", CHECKER.read_text(encoding="utf-8"))
    write(repo, "site/sw.js", SW_TEMPLATE.format(shell="v1", data="d1"))
    write(repo, "site/js/app.js", "// v1\n")
    write(repo, "site/data/index.json", '["a"]\n')
    write(repo, "docs/NOTES.md", "notes\n")
    base = commit(repo, "base")
    return repo, base


def run_checker(repo, rng):
    return subprocess.run(
        [sys.executable, "tools/check_versions.py", "--range", rng],
        cwd=str(repo),
        capture_output=True,
        text=True,
    )


# Each case: (name, mutate(repo), should_fail)
CASES = []


def case(name, should_fail):
    def deco(fn):
        CASES.append((name, fn, should_fail))
        return fn

    return deco


@case("shell file changed, SHELL_VERSION not bumped", True)
def _(repo):
    write(repo, "site/js/app.js", "// v2\n")


@case("shell file changed, SHELL_VERSION bumped", False)
def _(repo):
    write(repo, "site/js/app.js", "// v2\n")
    write(repo, "site/sw.js", SW_TEMPLATE.format(shell="v2", data="d1"))


@case("data file changed, DATA_VERSION not bumped", True)
def _(repo):
    write(repo, "site/data/index.json", '["a","b"]\n')


@case("data file changed, DATA_VERSION bumped", False)
def _(repo):
    write(repo, "site/data/index.json", '["a","b"]\n')
    write(repo, "site/sw.js", SW_TEMPLATE.format(shell="v1", data="d2"))


@case("both changed, only SHELL_VERSION bumped", True)
def _(repo):
    write(repo, "site/js/app.js", "// v2\n")
    write(repo, "site/data/index.json", '["a","b"]\n')
    write(repo, "site/sw.js", SW_TEMPLATE.format(shell="v2", data="d1"))


@case("both changed, both bumped", False)
def _(repo):
    write(repo, "site/js/app.js", "// v2\n")
    write(repo, "site/data/index.json", '["a","b"]\n')
    write(repo, "site/sw.js", SW_TEMPLATE.format(shell="v2", data="d2"))


@case("docs-only change needs no bump", False)
def _(repo):
    write(repo, "docs/NOTES.md", "notes v2\n")


@case("editing only sw.js needs no bump — it is the carrier, not an asset", False)
def _(repo):
    # sw.js is not in the SHELL precache list and the browser always fetches it
    # fresh, so a change to it reaches phones without any version bump. Counting
    # it as a shell file is what made the first version of this guard demand a
    # SHELL_VERSION bump for every data-only menu edit — bumping DATA_VERSION
    # *is* an edit to sw.js. This case pins the exclusion so it can't come back.
    write(
        repo,
        "site/sw.js",
        SW_TEMPLATE.format(shell="v1", data="d1") + "// a new comment\n",
    )


@case("a missing SHELL_VERSION constant is a failure, not a pass", True)
def _(repo):
    # The regex silently reading None on BOTH sides would compare equal and
    # report clean — the exact way a guard turns decorative.
    write(repo, "site/js/app.js", "// v2\n")
    write(repo, "site/sw.js", 'const DATA_VERSION = "d1";\n')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's output")
    args = ap.parse_args(argv)

    failures = []
    for name, mutate, should_fail in CASES:
        with tempfile.TemporaryDirectory() as tmp:
            repo, base = make_repo(tmp)
            mutate(repo)
            head = commit(repo, "change")
            r = run_checker(repo, f"{base}..{head}")
            fired = r.returncode != 0
            ok = fired == should_fail
            mark = "PASS" if ok else "FAIL"
            want = "should fail" if should_fail else "should pass"
            print(f"  {mark}  {name} ({want})")
            if args.verbose or not ok:
                for line in (r.stdout + r.stderr).splitlines():
                    print(f"        {line}")
            if not ok:
                failures.append(name)

    print()
    if failures:
        print(f"FAILED — the guard behaved wrongly on {len(failures)} case(s):")
        for f in failures:
            print(f"  · {f}")
        return 1
    print(f"OK — {len(CASES)} cases, the guard fired exactly when it should.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
