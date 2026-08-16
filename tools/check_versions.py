#!/usr/bin/env python3
"""Enforce the service-worker version lockstep (ADR 0015).

`site/sw.js` carries two version constants, and they are what tells an
installed phone to refetch:

    SHELL_VERSION → html/css/js/icons/webmanifest
    DATA_VERSION  → data/index.json, data/fx.json, every restaurant JSON

Change a file under `site/` and forget to bump the matching constant, and the
install step *skips the cache entirely* — `sw.js` only rebuilds a cache that
lacks its READY sentinel, so an existing cache under an unchanged version name
is left exactly as it was. The deploy goes out, CI is green, the site is
correct for anyone arriving fresh, and every phone that already had it keeps
serving the old shell **forever**, or until some later change happens to bump
the constant. There is no error anywhere; the failure is silent and invisible
from the repo.

That is not hypothetical. On 2026-08-16 the FX/localisation merge changed
`app.css`, `index.html` and 15 JS files while leaving `SHELL_VERSION` at
`2026-08-16.13`. The currency feature deployed and did not reach installed
phones. It surfaced only when the owner clicked a link on his own phone and
got a screen the deployed code could not have produced. This guard exists so
the next one is caught before it ships, not after.

    python3 tools/check_versions.py                  # staged changes (pre-commit)
    python3 tools/check_versions.py --range A..B     # a commit range (CI)
    python3 tools/check_versions.py --range A..B -v  # list the files that count

Exit 0 = every touched cache had its constant bumped; 1 = at least one didn't.
Stdlib only, no build step.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = "site/sw.js"

# Which cache a changed path belongs to. `site/data/` is the data payload;
# everything else under `site/` is the shell.
#
# `sw.js` itself belongs to NEITHER, and that exclusion is load-bearing. It is
# the carrier of the version constants, not a cached asset — it appears nowhere
# in the SHELL precache list, and the browser always fetches it fresh, which is
# what makes the update cycle run at all. Counting it as a shell file makes the
# guard demand a SHELL_VERSION bump for every data-only menu edit, since
# bumping DATA_VERSION *means* editing sw.js. That would fire on correct work,
# and a guard that cries wolf on the documented-correct action is one people
# learn to override — the exact way the other checks in this repo went
# decorative. Found by tools/test_check_versions.py on its first run.
DATA_PREFIX = "site/data/"
SITE_PREFIX = "site/"
CARRIER = "site/sw.js"

VERSION_RE = {
    "SHELL_VERSION": re.compile(r'^const SHELL_VERSION = "([^"]+)";', re.M),
    "DATA_VERSION": re.compile(r'^const DATA_VERSION = "([^"]+)";', re.M),
}


def git(*args):
    """Run git in the repo root and return stdout, or raise with its stderr."""
    r = subprocess.run(
        ["git", "-C", str(ROOT), *args], capture_output=True, text=True
    )
    if r.returncode != 0:
        raise SystemExit(f"check_versions: git {' '.join(args)} failed:\n{r.stderr}")
    return r.stdout


def versions_in(text):
    """The two constants as {name: value}; a missing one reads as None."""
    out = {}
    for name, rx in VERSION_RE.items():
        m = rx.search(text)
        out[name] = m.group(1) if m else None
    return out


def read_sw(ref):
    """`sw.js` at a ref, or at the index/worktree when ref is None."""
    if ref is None:
        return (ROOT / SW).read_text(encoding="utf-8")
    return git("show", f"{ref}:{SW}")


def changed_paths(base, head):
    """Paths that differ between two states, as repo-relative POSIX strings."""
    if base is None:
        # Staged: what a commit right now would contain, against HEAD.
        out = git("diff", "--cached", "--name-only")
    else:
        out = git("diff", "--name-only", f"{base}..{head}")
    return [p for p in out.splitlines() if p]


def classify(paths):
    """Split changed paths into the caches they invalidate."""
    shell, data = [], []
    for p in paths:
        if not p.startswith(SITE_PREFIX):
            continue  # tools/, docs/, tests/ ship nothing to a phone
        if p == CARRIER:
            continue  # see CARRIER above — it is how you bump, not what you cache
        (data if p.startswith(DATA_PREFIX) else shell).append(p)
    return shell, data


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Check sw.js version constants were bumped in lockstep with site/ changes.",
        epilog="With no --range, checks staged changes against HEAD (use as a pre-commit gate).",
    )
    ap.add_argument(
        "--range",
        dest="rng",
        metavar="A..B",
        help="Commit range to check instead of the staged changes, e.g. origin/main..HEAD",
    )
    ap.add_argument(
        "-v", "--verbose", action="store_true", help="List every file that counts"
    )
    args = ap.parse_args(argv)

    if args.rng:
        if ".." not in args.rng:
            ap.error("--range needs the form A..B")
        base, head = args.rng.split("..", 1)
        head = head or "HEAD"
        before, after = read_sw(base), read_sw(head)
    else:
        base, head = None, None
        before, after = read_sw("HEAD"), (ROOT / SW).read_text(encoding="utf-8")

    paths = changed_paths(base, head)
    shell, data = classify(paths)

    if not shell and not data:
        print("Version lockstep not in scope: nothing under site/ changed.")
        return 0

    old, new = versions_in(before), versions_in(after)
    problems = []
    # A constant that vanished (or was never there) is its own failure — the
    # regex silently reading None on both sides would otherwise report "clean".
    for name in VERSION_RE:
        if new[name] is None:
            problems.append(f"{name} is missing from {SW} — the cache has no version to name.")

    checks = (("SHELL_VERSION", shell, "shell"), ("DATA_VERSION", data, "data"))
    for name, touched, label in checks:
        if not touched or new[name] is None:
            continue
        if old[name] == new[name]:
            shown = touched if args.verbose else touched[:5]
            listing = "\n".join(f"      {p}" for p in shown)
            more = "" if len(shown) == len(touched) else f"\n      … and {len(touched) - len(shown)} more (-v for all)"
            problems.append(
                f"{name} is still {new[name]!r}, but {len(touched)} {label} file(s) changed:\n"
                f"{listing}{more}"
            )

    if problems:
        print("✗ Service-worker version lockstep broken.\n")
        for p in problems:
            print(f"  {p}\n")
        print(
            "  Bump the constant in site/sw.js. An unchanged version name means the\n"
            "  service worker SKIPS rebuilding that cache (it only rebuilds a cache\n"
            "  missing its READY sentinel), so installed phones keep serving the old\n"
            "  files indefinitely — silently, with CI green. See ADR 0015 and the\n"
            "  lockstep rules in CLAUDE.md."
        )
        return 1

    bits = []
    if shell:
        bits.append(f"SHELL_VERSION {old['SHELL_VERSION']} → {new['SHELL_VERSION']} ({len(shell)} file(s))")
    if data:
        bits.append(f"DATA_VERSION {old['DATA_VERSION']} → {new['DATA_VERSION']} ({len(data)} file(s))")
    print("Version lockstep holds: " + "; ".join(bits) + ".")
    if args.verbose:
        for p in shell + data:
            print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
