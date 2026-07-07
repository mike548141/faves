#!/usr/bin/env python3
"""Enforce the zero-dependency invariant (ADR 0001).

Faves ships no third-party components: no npm packages, no bundler, no
CDN. `package.json` exists only to declare that `site/js` is ES modules
and to hold the `node --test` script — it must never grow a dependency.
This guard fails CI (and is runnable locally) the moment that slips, so
the promise ADR 0001 rests on can't rot silently.

    python3 tools/check_no_deps.py

Exit 0 = clean; 1 = a dependency, lockfile, or install tree appeared.
Stdlib only, no build step.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Any of these in package.json means a dependency crept in.
DEP_KEYS = (
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
)

# A lockfile or install tree means a package manager is in play.
FORBIDDEN_PATHS = (
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "node_modules",
)


def main() -> int:
    problems = []

    pkg_path = ROOT / "package.json"
    if pkg_path.is_file():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"ERROR: package.json is not valid JSON: {e}", file=sys.stderr)
            return 1
        for key in DEP_KEYS:
            value = pkg.get(key)
            if value:  # present AND non-empty
                names = ", ".join(value) if isinstance(value, dict) else str(value)
                problems.append(f"package.json declares {key}: {names}")

    for name in FORBIDDEN_PATHS:
        if (ROOT / name).exists():
            problems.append(f"{name} is present — a package manager has been used")

    if problems:
        print("Zero-dependency invariant violated (see ADR 0001):", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print(
            "\nFaves ships no third-party components. If a dependency is truly "
            "needed,\nthat's an architecture change: write an ADR superseding "
            "0001 before\nrelaxing this guard.",
            file=sys.stderr,
        )
        return 1

    print("Zero-dependency invariant holds: no deps, no lockfile, no node_modules.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
