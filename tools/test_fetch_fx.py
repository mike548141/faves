#!/usr/bin/env python3
"""The FX refresh's `--bump` makes installed phones fetch the new rates.

Until roadmap 510/030 `--bump` moved `DATA_VERSION` in sw.js, and this file
pinned that the move was NZ-dated and never went backwards (PR #52, 2026-09-28:
the UTC runner stamped a version BELOW main's). That constant is retired: a
phone now learns of new rates from fx.json's fingerprint in
`site/data/catalogue.json`, so what `--bump` must get right is different, and
so is how it can fail. A changed fx.json whose fingerprint the catalogue does
not carry is simply never fetched — every installed phone keeps the old rates,
silently.

So this runs the real `restamp_catalogue()` against a throwaway copy of the
tree, with a rate changed, and asserts:

  1. the BREAKER first: with fx.json changed and the catalogue NOT restamped,
     `gen_summaries.mjs --check` must fail — so the gate that catches a
     forgotten restamp is live, and a test that could not tell the difference
     cannot pass;
  2. after the restamp, `--check` passes;
  3. the catalogue names exactly the new bytes' fingerprint;
  4. nothing else moved — the summary and search index are byte-identical,
     because `--catalogue` must not re-resolve every venue against today;
  5. the retired constant is gone from the tool, so it cannot be reintroduced
     half-way.

Needs `node` (the catalogue's one writer is tools/gen_summaries.mjs).
"""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import fetch_fx  # noqa: E402


def gen(root, *args):
    return subprocess.run(
        ["node", str(root / "tools" / "gen_summaries.mjs"), *args],
        capture_output=True, text=True,
        env={"PATH": shutil.os.environ.get("PATH", ""), "FAVES_NO_TREE_LINE": "1"},
    )


def copy_tree(dst):
    """Just what gen_summaries.mjs reads: itself, the app modules it imports,
    the data, and package.json (which makes site/js/*.js ES modules)."""
    (dst / "tools").mkdir()
    shutil.copy2(ROOT / "tools" / "gen_summaries.mjs", dst / "tools")
    shutil.copy2(ROOT / "package.json", dst)
    (dst / "site").mkdir()
    shutil.copytree(ROOT / "site" / "js", dst / "site" / "js")
    shutil.copytree(ROOT / "site" / "data", dst / "site" / "data")


def main():
    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  {'✅' if ok else '❌'} {name}{f' — {detail}' if detail and not ok else ''}")

    if not shutil.which("node"):
        print("❌ node is not on PATH — this test cannot run, and a skip is not a pass",
              file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        copy_tree(root)
        data = root / "site" / "data"
        before = {f: (data / f).read_bytes() for f in ("summary.json", "search-index.json")}
        base = gen(root, "--check")
        check("the copied tree starts clean", base.returncode == 0, base.stdout + base.stderr)

        fx = json.loads((data / "fx.json").read_text())
        code = next(c for c in fx["rates"] if c != fx["base"])
        fx["rates"][code] = round(fx["rates"][code] * 1.01, 6)
        fx["asOf"] = "2099-01-01"
        new_fx = json.dumps(fx, ensure_ascii=False, indent=2) + "\n"
        (data / "fx.json").write_text(new_fx)

        stale = gen(root, "--check")
        check("break: a rate change WITHOUT the restamp fails the catalogue gate",
              stale.returncode != 0 and "catalogue.json" in stale.stderr,
              stale.stdout + stale.stderr)

        print("  " + fetch_fx.restamp_catalogue(root))
        after = gen(root, "--check")
        check("after --bump's restamp, the gate passes", after.returncode == 0,
              after.stdout + after.stderr)

        cat = json.loads((data / "catalogue.json").read_text())
        want = hashlib.sha256(new_fx.encode("utf-8")).hexdigest()[:12]
        check("the catalogue names the NEW fx.json's fingerprint",
              cat["files"]["data/fx.json"] == want,
              f"{cat['files'].get('data/fx.json')} ≠ {want}")
        moved = [f for f, b in before.items() if (data / f).read_bytes() != b]
        check("nothing but the catalogue moved (no re-resolve of every venue)",
              not moved, f"changed: {moved}")

    src = (HERE / "fetch_fx.py").read_text()
    check("the retired DATA_VERSION bump is gone from the tool",
          not hasattr(fetch_fx, "bump_data_version")
          and "const DATA_VERSION" not in src
          and "site/sw.js" not in src.replace("`DATA_VERSION` in sw.js", ""),
          "fetch_fx.py still names the constant or writes sw.js")

    failed = results.count(False)
    if failed:
        print(f"\n{failed} of {len(results)} check(s) failed", file=sys.stderr)
        return 1
    print(f"\nAll {len(results)} checks behaved as specified.")
    return 0


if __name__ == "__main__":
    from lib.tree import announce
    try:
        sys.exit(main())
    finally:
        announce(ROOT)
