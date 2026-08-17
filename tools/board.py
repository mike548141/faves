#!/usr/bin/env python3
"""board — delegate to atelier's board tool, which owns the board's grammar.

WHY A SHIM AND NOT A COPY. The floor's scanners are atelier's tools, one source;
children do not vendor a copy (`.githooks/pre-commit` says so at length, and
ADR 0008 is the reason — a policy copied into every clone is a policy that
updates in none of them). `board` is one of those scanners, so this file holds
no board logic at all: it finds atelier's `board.py` and runs it.

WHY IT EXISTS AT ALL, THEN. The index that `board` generates opens with a banner
naming the rebuild command as `python3 tools/board.py rebuild`, and that string
is written by atelier's generator, not by us. In atelier it is true. In every
child repo it names a file that does not exist — so the one instruction a reader
gets, at the top of the file they are forbidden to hand-edit, is wrong. This
shim makes it true here rather than leaving the banner lying. Reported upstream;
if the generator learns to name the resolved path, this file goes.

Resolution order is the hook's, deliberately — one convention, not two:
    ATELIER_TOOLS  →  git config hooks.atelierTools  →  ../atelier/tools

    python3 tools/board.py            # check: is docs/ROADMAP.md in step?
    python3 tools/board.py rebuild    # regenerate it from docs/roadmap/

Exit codes are atelier's: 0 clean/not-in-scope · 1 stale or invalid · 2 no tool.
"""

from __future__ import annotations

import os
import runpy
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def atelier_tools() -> Path | None:
    env = os.environ.get("ATELIER_TOOLS")
    if env:
        return Path(env)
    try:
        out = subprocess.run(
            ["git", "config", "--get", "hooks.atelierTools"],
            cwd=ROOT, capture_output=True, text=True, check=False).stdout.strip()
    except OSError:
        out = ""
    if out:
        return Path(out)
    sibling = ROOT.parent / "atelier" / "tools"
    return sibling if sibling.is_dir() else None


def main() -> int:
    tools = atelier_tools()
    board = tools / "board.py" if tools else None
    if board is None or not board.is_file():
        print("✗ board: atelier's board.py not found. It is not vendored here "
              "— point at it with one of:", file=sys.stderr)
        print("    ATELIER_TOOLS=<atelier>/tools python3 tools/board.py",
              file=sys.stderr)
        print("    git config hooks.atelierTools <atelier>/tools",
              file=sys.stderr)
        return 2
    # The tool defaults --root to the cwd; anchor it here so the command works
    # from anywhere in the tree, which is how it is actually typed.
    argv = sys.argv[1:]
    if not any(a.startswith("--root") for a in argv):
        argv += ["--root", str(ROOT)]
    sys.argv = [str(board), *argv]
    sys.path.insert(0, str(tools))
    try:
        runpy.run_path(str(board), run_name="__main__")
    except SystemExit as exit_:
        return int(exit_.code or 0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
