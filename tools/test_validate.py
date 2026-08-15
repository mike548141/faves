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
import re
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
def check_need_kinds_agree():
    """The `needs` vocabulary is written down three times — return a complaint
    if they have drifted, else None.

    `validate.py` decides what data is legal, `site/js/needs.js` decides what
    the reader actually sees, and `tools/needs.py` decides what the worklist
    reports. A kind in the validator but not the renderer is the dangerous
    direction: the data would claim a gap that silently never appears on the
    page, which is precisely the "decorative guard" failure this repo keeps
    finding. Parsed rather than imported — needs.js is an ES module and the
    tooling is stdlib-only Python (ADR 0001).
    """
    def quoted_names(path, pattern):
        """The quoted strings inside the first match of `pattern`."""
        text = (ROOT / path).read_text(encoding="utf-8")
        m = re.search(pattern, text, re.S | re.M)
        return set(re.findall(r'"([a-z]+)"', m.group(1))) if m else set()

    # needs.js is an object literal, so take its top-level keys, not its
    # bodies — those carry prose full of words that would match anything.
    js_text = (ROOT / "site/js/needs.js").read_text(encoding="utf-8")
    js_block = re.search(r"const KINDS = \{(.*?)\n\};", js_text, re.S)
    js = set(re.findall(r"^  ([a-z]+): \{", js_block.group(1), re.M)) if js_block else set()
    py = quoted_names("tools/validate.py", r"NEED_KINDS = \((.*?)\)")
    rep = quoted_names("tools/needs.py", r"^KINDS = \((.*?)\)")

    if not (js and py and rep):
        return f"could not read one of the lists (js={len(js)}, validate={len(py)}, report={len(rep)})"
    if js == py == rep:
        return None
    return (
        f"needs.js={sorted(js)} validate.py={sorted(py)} needs.py={sorted(rep)}"
    )


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
    # --- dish-level gaps, `needs` ----------------------------------------
    "needs kind off the closed set": (
        lambda d: _first_item(d).update(needs=[{"what": "vibes"}]),
        "error",
    ),
    "needs with an unknown key": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "why": "x"}]),
        "error",
    ),
    "needs is empty rather than absent": (
        lambda d: _first_item(d).update(needs=[]),
        "error",
    ),
    "needs since is not a date": (
        lambda d: _first_item(d).update(needs=[{"what": "price", "since": "last Tuesday"}]),
        "error",
    ),
    "same needs kind claimed twice": (
        lambda d: _first_item(d).update(needs=[{"what": "name"}, {"what": "name"}]),
        "error",
    ),
    # The one that keeps the worklist honest: a dish that has been priced but
    # still carries needs.what='price' renders no indicator, so the gap would
    # sit in the data invisibly and needs.py would keep reporting a done job.
    "priced dish still claiming an unread price": (
        lambda d: _first_item(d).update(price=9.5, needs=[{"what": "price"}]),
        "error",
    ),
    "a well-formed needs entry is legal": (
        lambda d: _first_item(d).update(
            price=None, needs=[{"what": "price", "note": "label obscured", "since": "2026-08-07"}]
        ),
        "clean",
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

    drift = check_need_kinds_agree()
    if drift:
        print(f"  ❌ {'needs vocabulary agrees across files':38} {drift}")
        failures.append("needs vocabulary drift")
    else:
        print(f"  ✅ {'needs vocabulary agrees across files':38} in step")

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
