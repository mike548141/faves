#!/usr/bin/env python3
"""Prove `split_data.py` joins history to dishes by ID, not by name.

WHY THIS EXISTS. From the day the record store was created until 2026-09-08 it
keyed every row on `{section heading, dish name, code}` — 226 of 227 rows carried
no `dishId` at all — while `ARCHITECTURE.md` and ADR 0051's own consequences both
said the id was what carried a dish's price history across a rename. Nothing
disagreed with them, because nothing had ever renamed a dish in a venue that had
history. ADR 0099 made the join id-first; this is what stops it drifting back.

THE METHOD is the one `test_registry.py` and `test_validate.py` established, with
one addition. Each case builds a synthetic venue in a temporary tree, applies a
change the data model PERMITS — a dish renamed with its id pinned, a section
heading renamed, a dish id retired into `formerIds`, a venue id corrected — and
asserts `--check` still passes. That alone would be satisfiable by a check that
passes on everything, so every one of those cases is paired with a BREAK-PROBE:
the same fixture run against a copy of the tool with the id-first lookup reverted
to what it was, which must FAIL. A case whose probe passes is reported as a hole.

Two cases run the other way round and need no probe, because they assert a
refusal: a history file under an id no record claims must FAIL, and a refresh
must not destroy the rows it did not touch.

    python3 tools/test_split_data.py        # run every case
    python3 tools/test_split_data.py -v     # show each run's output

Exit 0 = every case behaved and every probe fired. 1 = a hole.
Stdlib only; the temporary tree is deleted on exit and nothing outside it is read
or written.
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

VENUE = {
    "id": "test-venue",
    "name": "Test Venue",
    "menu": [
        {
            "section": "Mains",
            "sectionId": "mains",
            "items": [
                {"name": "Fish and Chips", "dishId": "fish-and-chips",
                 "price": [{"value": 12.0, "recorded": "2026-08-08"}]},
                {"name": "Burger", "dishId": "burger", "price": 15.0},
            ],
        },
    ],
}

PRICE_ROWS = [{
    "key": {"section": "Mains", "sectionId": "mains",
            "name": "Fish and Chips", "code": None, "dishId": "fish-and-chips"},
    "superseded": [{"value": 10.0, "recorded": "2025-01-01"}],
}]

DISH_ROWS = [{
    "key": {"section": "Mains", "sectionId": "mains",
            "name": "Old Special", "code": None, "dishId": "old-special"},
    "item": {"name": "Old Special", "dishId": "old-special", "price": 9.0,
             "available": {"offBy": "2026-02-02"}},
}]


# (name, what it does to the payload) — each is a change the model PERMITS, and
# `--check` must still pass. `venue_file` renames the file the payload lands in.
def _rename_dish(v):
    v["menu"][0]["items"][0]["name"] = "Fish & Chips"


def _rename_heading(v):
    v["menu"][0]["section"] = "Main Courses"


def _retire_dish_id(v):
    item = v["menu"][0]["items"][0]
    item["dishId"] = "fish-n-chips"
    item["formerIds"] = ["fish-and-chips"]


def _rename_venue(v):
    v["id"] = "test-venue"
    v["formerIds"] = ["old-test-venue"]


# Each probe reverts ONE line of the tool to what it did before ADR 0099. The
# paired case must then fail — if it still passes, the case was never testing
# what its name says.
PERMITTED = [
    ("a dish renamed with its dishId pinned", _rename_dish, None,
     ('    kid = _text(key.get("dishId"))', "    kid = None")),
    ("a section heading renamed with its sectionId pinned", _rename_heading,
     None, ("    if ksid and sid:", "    if False and ksid and sid:")),
    ("a dish id retired into formerIds", _retire_dish_id, None,
     ("        return former and kid in former_ids(item)",
      "        return False")),
    ("a venue id corrected, history still under the old id", _rename_venue,
     "old-test-venue",
     ('    for old in doc.get("formerIds") or []:', "    for old in []:")),
]


def build(tree, venue, history_stem=None, extra_history=None):
    """Lay out a one-venue repo. `history_stem` names the history files, which
    is how the venue-rename case puts them under the id the venue used to have."""
    for d in ("site/data/restaurants", "data/history/prices",
              "data/history/dishes"):
        (tree / d).mkdir(parents=True, exist_ok=True)
    (tree / "site/data/restaurants" / f"{venue['id']}.json").write_text(
        json.dumps(venue, indent=2) + "\n")
    stem = history_stem or venue["id"]
    (tree / "data/history/prices" / f"{stem}.json").write_text(json.dumps(
        {"venue": stem, "note": "test", "rows": PRICE_ROWS}, indent=2) + "\n")
    (tree / "data/history/dishes" / f"{stem}.json").write_text(json.dumps(
        {"venue": stem, "note": "test", "rows": DISH_ROWS}, indent=2) + "\n")
    if extra_history:
        (tree / "data/history/prices" / f"{extra_history}.json").write_text(
            json.dumps({"venue": extra_history, "note": "test",
                        "rows": []}, indent=2) + "\n")


def fresh_tree(tmp, name, mutation=None):
    """A tree with the tools in it. `mutation` is (old, new) applied to
    split_data.py — the break-probe."""
    tree = Path(tmp) / name
    (tree / "tools").mkdir(parents=True)
    for tool in ("split_data.py", "seed_dish_ids.py"):
        shutil.copy(ROOT / "tools" / tool, tree / "tools")
    if mutation:
        f = tree / "tools" / "split_data.py"
        src = f.read_text()
        old, new = mutation
        if old not in src:
            raise SystemExit(
                f"break-probe cannot find its line in split_data.py: {old!r}\n"
                "The probe is stale — fix the probe, do not delete it.")
        f.write_text(src.replace(old, new, 1))
    return tree


def run(tree, args, verbose):
    r = subprocess.run([sys.executable, "tools/split_data.py"] + args,
                       cwd=tree, capture_output=True, text=True)
    if verbose:
        print(f"    $ split_data.py {' '.join(args)} → {r.returncode}")
        print("    " + r.stdout.strip().replace("\n", "\n    "))
    return r


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)
    holes, cases = [], 0

    with tempfile.TemporaryDirectory() as tmp:
        # The control. Without it a suite that fails to build its tree at all
        # reports every "must fail" case as caught.
        cases += 1
        tree = fresh_tree(tmp, "control")
        build(tree, copy.deepcopy(VENUE))
        if run(tree, ["--check"], args.verbose).returncode != 0:
            holes.append("the unmutated fixture does not pass — the test is "
                         "wrong, not the tool")
            print("  ✗ control: a clean fixture FAILS --check")
        else:
            print("  ✓ control: a clean fixture passes --check")

        for i, (name, mutate, stem, probe) in enumerate(PERMITTED):
            cases += 1
            venue = copy.deepcopy(VENUE)
            mutate(venue)
            tree = fresh_tree(tmp, f"permitted{i}")
            build(tree, venue, stem)
            if run(tree, ["--check"], args.verbose).returncode != 0:
                holes.append(f"{name}: --check FAILED on a permitted change")
                print(f"  ✗ {name}: --check failed")
                continue
            probed = fresh_tree(tmp, f"probe{i}", probe)
            build(probed, copy.deepcopy(venue), stem)
            r = run(probed, ["--check"], args.verbose)
            if r.returncode == 0:
                holes.append(f"{name}: the break-probe PASSED — reverting "
                             f"{probe[0].strip()!r} changed nothing, so this "
                             f"case proves nothing")
                print(f"  ✗ {name}: break-probe passed (proves nothing)")
            else:
                print(f"  ✓ {name}: passes, and the probe fails it")

        # A history file under an id no record claims. Asserts a REFUSAL, so it
        # needs no probe: a tool that never fails cannot produce this.
        cases += 1
        tree = fresh_tree(tmp, "orphan")
        build(tree, copy.deepcopy(VENUE), extra_history="ghost-venue")
        r = run(tree, ["--check"], args.verbose)
        if r.returncode == 0 or "was read by no venue" not in r.stdout:
            holes.append("a history file under an unclaimed id passed --check")
            print("  ✗ an orphaned history file: not caught")
        else:
            print("  ✓ an orphaned history file: --check refuses it")

        # A refresh must APPEND (ADR 0023). Until 2026-09-08 the writer replaced
        # the file with whatever the current run moved, so refreshing one dish
        # deleted every other dish's history — and `--check --against` caught it
        # only afterwards, on damage the writer should never have done.
        for label, mutation in (
                ("a refresh appends rather than replacing", None),
                ("…and the probe that replaces is caught",
                 ('    existing = json.loads(f.read_text()).get("rows", []) '
                  'if f.is_file() else []', "    existing = []"))):
            cases += 1
            venue = copy.deepcopy(VENUE)
            burger = venue["menu"][0]["items"][1]
            burger["price"] = [{"value": 15.0, "recorded": "2026-01-01"},
                               {"value": 16.5, "recorded": "2026-09-01"}]
            tree = fresh_tree(tmp, f"refresh{bool(mutation)}", mutation)
            build(tree, venue)
            run(tree, [], args.verbose)
            rows = json.loads(
                (tree / "data/history/prices/test-venue.json").read_text())["rows"]
            kept = any(r["key"].get("dishId") == "fish-and-chips" for r in rows)
            added = any(r["key"].get("dishId") == "burger" for r in rows)
            ok = (kept and added) if mutation is None else not kept
            if not ok:
                holes.append(f"{label}: kept={kept} added={added}")
                print(f"  ✗ {label}")
            else:
                print(f"  ✓ {label}")

    print(f"{'✓' if not holes else '✗'} split_data: {cases - len(holes)}/{cases} "
          f"cases behaved.")
    if holes:
        print("\nA hole here means a rename the data model permits can orphan a "
              "price series, silently and forever:")
        for h in holes:
            print(f"  {h}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
