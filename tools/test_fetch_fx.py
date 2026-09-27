#!/usr/bin/env python3
"""The FX refresh's DATA_VERSION bump never moves the constant backwards.

On 2026-09-28 the restamped FX PR (#52) stamped DATA_VERSION '2026-09-27.1'
over main's '2026-09-28.1': `date.today()` was the UTC runner's date, a day
behind the NZ date the constants use. check_versions.py refused the merge,
which is the backstop working; this pins the cause. The breaker re-runs the
cases against the old algorithm and requires the bug case to fail, so a test
that could not catch it cannot pass.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_fx import next_data_version  # noqa: E402

CASES = [
    ("same NZ day counts on", ("2026-09-28.1", "2026-09-28"), "2026-09-28.2"),
    ("a new day starts at .1", ("2026-09-27.3", "2026-09-28"), "2026-09-28.1"),
    ("a clock BEHIND main never goes backwards", ("2026-09-28.1", "2026-09-27"), "2026-09-28.2"),
    ("an undated constant restarts cleanly", ("garbage", "2026-09-28"), "2026-09-28.1"),
    ("a bare date counts as .0", ("2026-09-28", "2026-09-28"), "2026-09-28.1"),
]
BUG_CASE = "a clock BEHIND main never goes backwards"


def old_algorithm(old, today):
    """The pre-2026-09-28 bump, verbatim in effect: date prefix or restart."""
    if old.startswith(today):
        tail = old[len(today):].lstrip(".")
        return f"{today}.{int(tail) + 1}" if tail.isdigit() else f"{today}.1"
    return f"{today}.1"


def run(fn):
    return [name for name, args, want in CASES if fn(*args) != want]


def main():
    failures = run(next_data_version)
    for name, args, want in CASES:
        got = next_data_version(*args)
        print(f"  {'✅' if got == want else '❌'} {name:44} {args[0]} @ {args[1]} → {got}")
    broken = run(old_algorithm)
    caught = BUG_CASE in broken
    print(f"  {'✅' if caught else '❌'} break: the old UTC-blind bump{' ' * 14} "
          f"{'caught' if caught else 'PASSED WITH THE BUG BACK'}")
    if failures or not caught:
        print(f"\n{len(failures) + (not caught)} failure(s)", file=sys.stderr)
        return 1
    print(f"\nAll {len(CASES) + 1} cases behaved as specified.")
    return 0


if __name__ == "__main__":
    from lib.tree import announce
    try:
        sys.exit(main())
    finally:
        announce(Path(__file__).resolve().parent.parent)
