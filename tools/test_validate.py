#!/usr/bin/env python3
"""Mutation-test `validate.py` — prove the data gate actually catches things.

`validate.py` is the gate every menu edit passes through, and CI trusts it
to keep bad data out of a live site. Until 2026-08-09 nothing tested it.
That matters because the failure mode of a validator is *silence*: a check
that never fires looks exactly like data that is always clean, and the repo
had 483 JS tests and zero Python ones, so no gate here was exercised at all.

The method is deliberately crude and therefore honest: take a **real**
record, break it in one specific way, and assert `validate.py` exits
non-zero. Real records rather than fixtures, because a fixture drifts from
the schema and then tests nothing. It found a real hole on its first run —
a negative price validated clean, since `price` was type-checked but never
sign-checked while `pricePerPerson` ten lines above it always was.

    python3 tools/test_validate.py          # run every case
    python3 tools/test_validate.py -v       # show each case's output

Exit 0 = every mutation was caught (and the unmutated tree still passes);
1 = at least one mutation slipped through, which is a hole in the gate.
Stdlib only, no build step. Never writes outside a temporary copy.
"""

import argparse
import copy
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# A venue with a full priced menu and a derivation, so one file exercises
# prices, picks, tags, status and verified/verifiedBy together.
SUBJECT = "site/data/restaurants/gold-lining-cafe.json"


def _first_item(d):
    """The first menu item of the first section — where price/tag cases land."""
    return d["menu"][0]["items"][0]


# name -> (mutate, expectation). "error" = must exit non-zero. "warn" = must
# exit zero but say something; the no-backfill accommodations live here, and
# they are asserted so a later change cannot silently promote or drop them.
CASES = {
    # --- shape and type ---------------------------------------------------
    "required id removed": (lambda d: d.pop("id", None), "error"),
    "menu item loses its name": (lambda d: _first_item(d).pop("name", None), "error"),
    "price becomes a string": (lambda d: _first_item(d).update(price="free"), "error"),
    "price becomes a boolean": (lambda d: _first_item(d).update(price=True), "error"),
    "status set to nonsense": (lambda d: d.update(status="banana"), "error"),
    "bogus dietary tag": (lambda d: _first_item(d).update(tags=["not-a-real-tag"]), "error"),
    # --- values, not just types (the class the first run found a hole in) --
    "negative price": (lambda d: _first_item(d).update(price=-5), "error"),
    "free item is legal": (lambda d: _first_item(d).update(price=0), "clean"),
    # --- referential integrity -------------------------------------------
    "pick names a non-existent dish": (
        lambda d: d.update(picks=["Totally Invented Dish 9000"]),
        "error",
    ),
    # --- derivation, ADR 0031 --------------------------------------------
    "verifiedBy off the closed set": (lambda d: d.update(verifiedBy="vibes"), "error"),
    "verifiedBy names a person": (lambda d: d.update(verifiedBy="owner-mike"), "error"),
    "method with no date": (lambda d: d.update(verified=None), "error"),
    "status verified without a derivation": (
        lambda d: d.update(status="verified", verified=None, verifiedBy=None),
        "error",
    ),
    "date with no method still only warns": (
        lambda d: d.update(verifiedBy=None),
        "warn",
    ),
}


def run_validate(cwd: Path):
    proc = subprocess.run(
        [sys.executable, "tools/validate.py"],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    return proc.returncode, proc.stdout + proc.stderr


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true", help="show each case's output")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory(prefix="faves-validate-") as tmp:
        work = Path(tmp) / "repo"
        # Only what validate.py reads. Copying the whole repo would drag the
        # git dir and site assets through a temp dir for no benefit.
        work.mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")

        rc, out = run_validate(work)
        if rc != 0:
            print("BASELINE FAILED — the unmutated tree does not validate.", file=sys.stderr)
            print(out, file=sys.stderr)
            return 1
        print(f"baseline: clean ({SUBJECT.split('/')[-1]} is the subject)")

        subject = work / SUBJECT
        original = subject.read_text(encoding="utf-8")
        base = json.loads(original)

        failures = []
        for name, (mutate, expect) in CASES.items():
            d = copy.deepcopy(base)
            mutate(d)
            subject.write_text(json.dumps(d, indent=2), encoding="utf-8")
            rc, out = run_validate(work)
            subject.write_text(original, encoding="utf-8")

            if expect == "error":
                ok = rc != 0
                got = "caught" if ok else "PASSED SILENTLY"
            elif expect == "warn":
                ok = rc == 0 and "warning" in out.lower()
                got = "warned" if ok else ("errored" if rc else "silent")
            else:  # clean
                ok = rc == 0
                got = "accepted" if ok else "REJECTED"

            print(f"  {'✅' if ok else '❌'} {name:38} {got}")
            if args.verbose:
                for line in out.splitlines():
                    print(f"       | {line}")
            if not ok:
                failures.append(name)

    if failures:
        print(
            f"\n{len(failures)} hole(s) in the gate: {', '.join(failures)}\n"
            "A mutation that validates clean is data validate.py would let into "
            "the live site.",
            file=sys.stderr,
        )
        return 1

    print(f"\nAll {len(CASES)} mutations behaved as specified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
