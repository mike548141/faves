#!/usr/bin/env python3
"""Mutation-test `registry.py` — prove the provenance bound actually bites.

`registry.py` is the whole mechanism behind ADR 0046. The owner's ruling
permits personal data in a **public** repo on one condition, so the check that
enforces the condition is load-bearing in a way a data validator usually is
not: if it silently passes a record with no provenance, the repo has quietly
widened past what was authorised, and a push publishes that.

The method is the one `test_validate.py` established: build a record that is
*valid*, break it in exactly one way, and assert the checker exits non-zero.
Unlike that test we cannot use real records — the store ships empty, because
ownership facts are research and inventing one about a real business would be
a claim beyond its evidence. So these fixtures are transparently synthetic
("Example Holdings Limited", "Test Person One") and live only in a temporary
tree that is deleted on exit. They are fixtures, never assertions about anyone.

    python3 tools/test_registry.py          # run every case
    python3 tools/test_registry.py -v       # show each case's output

Exit 0 = every mutation was caught and the clean fixture still passes.
1 = a mutation slipped through, which is a hole in the bound.
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

GOOD_SOURCE = {
    "kind": "public-record",
    "ref": "NZ Companies Office, company number 1234567",
    "recorded": "2026-08-16",
}

ENTITY = {
    "id": "example-holdings-ltd",
    "kind": "company",
    "name": "Example Holdings Limited",
    "registry": {"nzbn": "9429000000000", "number": "1234567"},
    "contact": [{"type": "email", "value": "hello@example.test",  # leakscan:allow:email: synthetic fixture on the reserved .test TLD (RFC 2606)
                 "source": dict(GOOD_SOURCE, kind="given",
                                ref="emailed us for Faves, 2026-08-16")}],
    "source": GOOD_SOURCE,
}

PERSON = {
    "id": "test-person-one",
    "name": "Test Person One",
    "contact": [{"type": "phone", "value": "04 000 0000",  # leakscan:allow:nz-phone: synthetic all-zero fixture, reaches nobody
                 "source": dict(GOOD_SOURCE, kind="given",
                                ref="gave it to us for Faves, 2026-08-16")}],
    "source": GOOD_SOURCE,
}


def ownership(venue_id):
    return {"edges": [
        {"holder": "person:test-person-one", "holds": "entity:example-holdings-ltd",
         "role": "director", "from": "2015-03-04", "to": None,
         "source": GOOD_SOURCE},
        {"holder": "entity:example-holdings-ltd", "holds": f"venue:{venue_id}",
         "role": "operator", "from": "2015-03-04", "to": None,
         "source": GOOD_SOURCE},
    ]}


# (name, what it mutates) — each must be REJECTED.
CASES = [
    ("entity with no source", lambda e, p, o: e.pop("source")),
    ("person with no source", lambda e, p, o: p.pop("source")),
    ("edge with no source", lambda e, p, o: o["edges"][0].pop("source")),
    ("contact detail with no source",
     lambda e, p, o: p["contact"][0].pop("source")),
    ("source kind outside the closed set",
     lambda e, p, o: e["source"].update(kind="scraped")),
    ("source with a blank ref", lambda e, p, o: e["source"].update(ref="   ")),
    ("source with a non-ISO recorded date",
     lambda e, p, o: p["source"].update(recorded="16 August")),
    ("person carrying a home address",
     lambda e, p, o: p.update(address="1 Example St")),  # leakscan:allow:nz-address: synthetic fixture; the case asserts this is REJECTED
    ("person carrying a date of birth",
     lambda e, p, o: p.update(dateOfBirth="1900-01-01")),  # leakscan:allow:pii-key-context: synthetic fixture; the case asserts rejection
    ("person carrying a nested health detail",
     lambda e, p, o: p.update(notes={"medical": "asthma"})),
    ("contact type outside email/phone",
     lambda e, p, o: p["contact"][0].update(type="postal")),
    ("edge role outside the closed set",
     lambda e, p, o: o["edges"][0].update(role="landlord")),
    ("edge pointing at a venue that does not exist",
     lambda e, p, o: o["edges"][1].update(holds="venue:no-such-place")),
    ("edge pointing at an entity with no record",
     lambda e, p, o: o["edges"][0].update(holds="entity:ghost-ltd")),
    ("entity kind outside the closed set",
     lambda e, p, o: e.update(kind="conglomerate")),
    ("id that disagrees with its filename",
     lambda e, p, o: e.update(id="something-else")),
]


def run(tree, verbose):
    r = subprocess.run([sys.executable, "tools/registry.py"], cwd=tree,
                       capture_output=True, text=True)
    if verbose:
        print(r.stdout, r.stderr)
    return r


def build(tree, entity, person, edges):
    d = tree / "data"
    (d / "entities").mkdir(parents=True, exist_ok=True)
    (d / "people").mkdir(parents=True, exist_ok=True)
    (d / "entities" / "example-holdings-ltd.json").write_text(
        json.dumps(entity, indent=2))
    (d / "people" / "test-person-one.json").write_text(
        json.dumps(person, indent=2))
    (d / "ownership.json").write_text(json.dumps(edges, indent=2))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    index = json.loads((ROOT / "site" / "data" / "index.json").read_text())
    ids = index.get("restaurants", index) if isinstance(index, dict) else index
    venue = (ids[0]["id"] if isinstance(ids[0], dict) else ids[0])

    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        tree = Path(tmp) / "repo"
        tree.mkdir()
        (tree / "tools").mkdir()
        shutil.copy(ROOT / "tools" / "registry.py", tree / "tools")
        shutil.copytree(ROOT / "site", tree / "site",
                        ignore=shutil.ignore_patterns("img", "*.png", "*.jpg"))

        build(tree, ENTITY, PERSON, ownership(venue))
        clean = run(tree, args.verbose)
        if clean.returncode != 0:
            print("✗ the unmutated fixture does not pass — the test is wrong, "
                  "not the gate")
            print(clean.stdout)
            return 1
        print("✓ clean fixture passes")

        for name, mutate in CASES:
            e, p, o = (copy.deepcopy(ENTITY), copy.deepcopy(PERSON),
                       copy.deepcopy(ownership(venue)))
            mutate(e, p, o)
            build(tree, e, p, o)
            r = run(tree, args.verbose)
            if r.returncode == 0:
                failures.append(name)
                print(f"  ✗ SLIPPED THROUGH: {name}")
            elif args.verbose:
                print(f"  ✓ caught: {name}")

    total = len(CASES)
    caught = total - len(failures)
    print(f"{'✓' if not failures else '✗'} registry gate: {caught}/{total} "
          f"mutations caught")
    if failures:
        print("\nA mutation that slips through is a record the ruling did not "
              "authorise, passing CI on a public repo.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
