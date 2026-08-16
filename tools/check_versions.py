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


def version_key(value):
    """Sortable key for a `YYYY-MM-DD.N` constant, or None if it isn't one.

    The constants are cache NAMES, but they are also meant to be monotonic, and
    the two facts are easy to hold separately until it costs you a deploy. See
    `went_backwards` below for why.
    """
    if not value:
        return None
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})\.(\d+)", value.strip())
    if not m:
        return None
    y, mo, d, n = m.groups()
    return (int(y), int(mo), int(d), int(n))


def went_backwards(old, new):
    """True when `new` names an EARLIER version than `old`.

    Going backwards is as broken as not moving, and for the same mechanism —
    which is why the equality check alone was not enough. A version is a cache
    name, and the install step only rebuilds a cache that is missing its READY
    sentinel. So a push that returns SHELL_VERSION to a value already deployed
    earlier that day finds that cache **present and ready** on a phone that
    installed it, and serves the OLD files from it. Silently, with CI green:
    exactly the failure ADR 0015 and this whole check exist to prevent, reached
    from the other direction.

    Reachable in practice, not theoretically — it is what a rebase produces. A
    branch cut when main was at .42 and rebased onto a main that has since
    reached .55 lands carrying .54, and every equality test passes (2026-08-16,
    with four sessions live; found by reading the numbers rather than the
    verdict).

    Unparseable values return False: this check owns monotonicity, not format,
    and a constant that is missing entirely is already caught above.
    """
    a, b = version_key(old), version_key(new)
    return a is not None and b is not None and b < a


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


def precache_gaps():
    """Every file named in sw.js's SHELL list must exist on disk.

    WHY. On 2026-08-16 a commit added `js/bar-shrink.js` to SHELL while the
    module itself stayed untracked. The install handler throws on any non-`ok`
    response — deliberately, so a 404 during a deploy race rejects the install
    rather than silently caching a broken asset — so the WHOLE install rejected.
    The deployed site had **no service worker at all**: 0 registrations, 6 of 81
    shell entries cached, no data cache. Offline mode, installability and every
    precached menu were gone.

    It shipped past a completely green suite. `node --test`, `boot_check`,
    `validate.py`, `check_no_deps.py` and this tool's own lockstep check all
    passed, because not one of them asks whether a name in that list points at
    a real file. The list is hand-maintained and a phone is the only thing that
    ever reads it, which is exactly the shape that needs a gate.

    Cheap, total, and it cannot false-positive: the answer is on the filesystem.
    """
    sw = ROOT / SW
    if not sw.exists():
        return []
    block = re.search(r"const SHELL = \[(.*?)\];", sw.read_text(encoding="utf-8"), re.S)
    if not block:
        # No SHELL list = nothing to check, NOT a finding. `test_check_versions.py`
        # builds a synthetic repo whose sw.js carries only the two version
        # constants, and treating its absence as a failure made five of that
        # harness's cases fail — the guard reporting on a file that was never
        # claiming to have a precache. A missing SHELL_VERSION *constant* is
        # still an error; that is checked below, where it belongs.
        return []
    site = ROOT / "site"
    return [
        f'sw.js precaches "{url}", which does not exist — the install will throw '
        f"and NO service worker will register."
        for url in re.findall(r'"([^"]+)"', block.group(1))
        if url != "./" and not (site / url).exists()
    ]


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

    # Unconditional, and BEFORE the not-in-scope early return: a phantom
    # precache entry breaks the deployed site whether or not this particular
    # change touched site/, and "not in scope" must never be the last word on a
    # tree whose service worker cannot install.
    gaps = precache_gaps()
    if gaps:
        print(f"✗ precache: {len(gaps)} finding(s).")
        for g in gaps:
            print(f"  {g}")
        print("\n  Commit the missing file, or remove its line from SHELL in site/sw.js.")
        return 1

    paths = changed_paths(base, head)
    shell, data = classify(paths)

    if not shell and not data:
        # Bare mode reads STAGED changes only, so a clean tree makes it print
        # "not in scope" — which reads like an all-clear and proves nothing.
        # That is exactly how a DATA_VERSION collision reached main on
        # 2026-08-16: two sessions picked the same value, the tree was already
        # committed, the bare run said "not in scope", and only
        # `--range origin/main..HEAD` caught it. Twice now. A check that cannot
        # fail is a check nobody reads, so bare mode says what it did NOT do.
        if not args.rng:
            print(
                "Version lockstep not in scope: nothing under site/ is STAGED.\n"
                "  This says nothing about work already committed. To check a\n"
                "  finished branch, run:  check_versions.py --range origin/main..HEAD"
            )
            return 0
        # …but a version that moved BACKWARDS is wrong whatever else is in the
        # diff, so the ordering test is NOT gated on scope. The equality test
        # genuinely needs a payload change to mean anything ("did you bump when
        # you should have?"); going backwards needs no such precondition,
        # because it is never legitimate. Missing that distinction left a hole
        # in the very fix that closed the last one: a commit touching only
        # sw.js — which is exactly what "just fix the version" looks like after
        # a rebase conflict — returned 0 while sending SHELL_VERSION back to a
        # value already deployed that day. Found by a peer session on
        # 2026-08-16, hours after the backwards check landed. A guard written
        # to close a hole is not thereby free of holes of its own class.
        back = [
            f"{n} goes BACKWARDS, {versions_in(before)[n]!r} → {versions_in(after)[n]!r}, "
            f"in a commit that changes nothing else under site/."
            for n in VERSION_RE
            if went_backwards(versions_in(before)[n], versions_in(after)[n])
        ]
        if back:
            print("✗ Service-worker version went backwards.\n")
            for b in back:
                print(f"  {b}\n")
            print(
                "  A cache name already deployed is already installed: the worker finds\n"
                "  it present and READY and serves the OLD files from it. Pick a value\n"
                "  above the one on the integration branch."
            )
            return 1
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
        shown = touched if args.verbose else touched[:5]
        listing = "\n".join(f"      {p}" for p in shown)
        more = "" if len(shown) == len(touched) else f"\n      … and {len(touched) - len(shown)} more (-v for all)"
        if old[name] == new[name]:
            problems.append(
                f"{name} is still {new[name]!r}, but {len(touched)} {label} file(s) changed:\n"
                f"{listing}{more}"
            )
        elif went_backwards(old[name], new[name]):
            problems.append(
                f"{name} goes BACKWARDS, {old[name]!r} → {new[name]!r}, with "
                f"{len(touched)} {label} file(s) changed:\n{listing}{more}\n"
                f"      A cache name already deployed is already installed: the worker finds\n"
                f"      it present and READY and serves the OLD files from it. This is what a\n"
                f"      rebase produces when main moved on under a branch — pick a value above\n"
                f"      {old[name]!r}, never the one your branch happened to carry."
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
