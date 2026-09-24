#!/usr/bin/env python3
"""Mutation-test `allergen_disagreements.py`'s CLASS TABLE.

The table in that tool is ten-plus claims about food, each one a regex, and
until 2026-09-24 **nothing in the repo tested any of them**. It is not on
CLAUDE.md's verify list and it is not in CI, so a class could be silently
narrowed to nothing and the only symptom would be a report that got shorter —
which reads exactly like progress. That is ADR 0072's decorative-guard shape
aimed at the guard itself.

Three owner rulings of 2026-09-21 narrowed the table (roadmap `470/030`), and
each narrowing is the kind that is right today and quietly wrong tomorrow:

  • a Turkish pizza leaves the cheese-by-default class but keeps the wheat one;
  • `crumbed` stops watching for `contains-egg`, which the house has already
    ruled it will never infer;
  • an Italian sausage leaves the wheat-rusk class.

METHOD. Two halves, and the second is the one that matters.

  1. CASES assert what the table does — against the real corpus for the rows
     the rulings were made about, and against SYNTHETIC menu lines for the
     shapes the corpus does not contain yet. A synthetic line is built into a
     real row and handed to the real `classify`, never to a re-implementation
     of it, because two copies of one rule read correct in every diff.
  2. BREAKERS put each old behaviour back into the tool and assert **exactly
     which cases fail** — not merely that the covered ones do, but that no
     other one does. "It fails, and it fails alone" is the claim; a case that
     fires on every breaker is a case that localises nothing.

🛑 TWO OF THE SIX BREAKERS ARE ABOUT THE MECHANISM, NOT THE OUTCOME. Both
narrowings could have been written as an `exclude` entry, which in this tool
vetoes the row's membership of the WHOLE class. On today's corpus that gives
the identical report, so no outcome test can tell the two apart — and the repo
has now twice shipped the veto and paid for it (the water chestnut that would
have taken the almonds with it; the cabinet slice on the line
`'Caramel slice, with slices of ham'`). `b3` and `b6` rebuild each narrowing as
the veto and require the matching synthetic line to be the one and only thing
that notices.

    python3 tools/test_allergen_disagreements.py       # run every case
    python3 tools/test_allergen_disagreements.py -v    # show each failure

Exit 0 = every case behaved and every reintroduced behaviour was caught, by
the cases that should catch it and by no others. Stdlib only, no build step.
Never writes outside a temporary copy.
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOL = "tools/allergen_disagreements.py"

# Handed to every case. `synthetic` builds a real row and calls the real
# `classify`, so a case can ask about a menu line the corpus has never carried
# without this file owning a second copy of the matching rule.
PRELUDE = '''
import subprocess, sys
sys.path.insert(0, "tools")
import allergen_disagreements as ad

ROWS = ad.members()
G = ad.classify(ROWS)
WATCH = {c[0]: list(c[4]) for c in ad.CLASSES}

def ids(name):
    return {r[0] + "/" + r[2] for r in G[name]}

def synthetic(text):
    """Which classes would this menu line fall into? Real classify, real row."""
    row = ("probe", "dish", "probe", "probe", text, set())
    return {k: bool(v) for k, v in ad.classify([row]).items()}

def report(*args):
    out = subprocess.run([sys.executable, "tools/allergen_disagreements.py", *args],
                         capture_output=True, text=True, check=True)
    return out.stdout

TURKISH = [
    "abrakebabra/chicken-turkish-pizza",
    "abrakebabra/lamb-turkish-pizza",
    "abrakebabra/mixed-turkish-pizza",
    "abrakebabra/vegetarian-turkish-pizza",
    "abrakebabra/diablo-turkish-pizza",
]
'''

CASES = {
    # --- ruling 1: Turkish pizza ------------------------------------------
    "R1 a Turkish pizza is out of the cheese-by-default class": '''
    stragglers = sorted(r[0] + "/" + r[2] for r in G["pizza"]
                        if "turkish pizza" in r[4].lower())
    assert not stragglers, "still in the pizza class: " + ", ".join(stragglers)
''',
    "R1 a Turkish pizza is still watched for gluten": '''
    # The half the narrowing must NOT take with it. A table that dropped the
    # rows on the floor satisfies every "no longer reported" case in this file
    # perfectly, which is why this one exists and why it is not folded in.
    assert len(G["turkish-pizza"]) >= 2, \\
        "the turkish-pizza class has %d member(s) — a class of one cannot " \\
        "disagree with itself, so it is watching nothing" % len(G["turkish-pizza"])
    assert WATCH["turkish-pizza"] == ["contains-gluten"], WATCH["turkish-pizza"]
    missing = sorted(r[0] + "/" + r[2] for r in G["turkish-pizza"]
                     if "contains-gluten" not in r[5])
    assert not missing, "untagged for gluten and unreported: " + ", ".join(missing)
    assert set(TURKISH) <= ids("turkish-pizza"), \\
        "not matched: " + ", ".join(sorted(set(TURKISH) - ids("turkish-pizza")))
''',
    "R1 the five untagged Turkish pizzas no longer report": '''
    out = report()
    still = [i for i in TURKISH if i in out]
    assert not still, "still reported: " + ", ".join(still)
''',
    "R1 an ordinary pizza is still cheese-topped by default": '''
    c = synthetic("Margherita Pizza  Tomato, mozzarella and basil.")
    assert c["pizza"], "a margherita fell out of the pizza class"
    assert not c["turkish-pizza"], "a margherita was read as a Turkish pizza"
    assert "sprig-and-fern-tawa/cheese-pizza" in ids("pizza")
    assert "contains-dairy" in WATCH["pizza"]
''',
    # The mechanism probe for ruling 1. `b6` is its breaker.
    "R1 a line naming BOTH pizzas keeps the Italian one watched": '''
    c = synthetic("Turkish pizza, or a Margherita pizza with mozzarella")
    assert c["pizza"], \\
        "the cheese-topped pizza on the same line left the pizza class — the " \\
        "narrowing vetoed the row instead of neutralising the word"
''',
    "R1 the Pizza Slice in Sides still reports": '''
    # DELIBERATE, and pinned so nobody silences it by reflex. Abrakebabra's
    # $4 "Pizza Slice / Chicken." in the Sides section prints neither the word
    # "Turkish" nor anything else that says which pizza it is cut from, so the
    # narrowing — which reads what the menu prints — leaves it where it was.
    # The report is the right home for a row nobody can call.
    out = report()
    assert "abrakebabra/pizza-slice" in out, \\
        "the Pizza Slice stopped reporting — it was silenced, not decided"
''',

    # --- ruling 2: crumbed stops watching for egg -------------------------
    "R2 the crumbed class no longer watches for egg": '''
    assert "contains-egg" not in WATCH["crumbed"], WATCH["crumbed"]
''',
    "R2 the crumbed class still watches for gluten, and still has members": '''
    # Deleting the class satisfies the case above. This is the other half.
    assert "contains-gluten" in WATCH["crumbed"], WATCH["crumbed"]
    assert len(G["crumbed"]) >= 60, len(G["crumbed"])
    assert "hotel-bristol/chicken-schnitty" in ids("crumbed")
    assert "tj-katsu/katsu" in ids("crumbed")
''',
    "R2 no crumbed row is reported for a missing egg tag": '''
    out = report()
    assert "## crumbed" not in out, out[out.index("## crumbed"):][:400]
''',
    "R2 the report writes nothing — no dish gains or loses a tag": '''
    import hashlib, pathlib
    def fingerprint():
        h = hashlib.sha256()
        for p in sorted(pathlib.Path("site/data").rglob("*.json")):
            h.update(p.name.encode()); h.update(p.read_bytes())
        return h.hexdigest()
    before = fingerprint()
    report(); report("--any-tag"); report("--class", "crumbed")
    assert fingerprint() == before, "the report mutated site/data"
''',

    # --- ruling 3: an Italian sausage is a continental sausage ------------
    "R3 an Italian sausage is out of the wheat-rusk class": '''
    stragglers = sorted(r[0] + "/" + r[2] for r in G["sausage"]
                        if "italian sausage" in r[4].lower())
    assert not stragglers, "still in the sausage class: " + ", ".join(stragglers)
''',
    "R3 an ordinary NZ sausage is still in the wheat-rusk class": '''
    for i in ("sprig-and-fern-tawa/sausages", "sprig-and-fern-tawa/cheerio-sausages",
              "takeaway-at-churton/battered-sav", "little-sprig-seatoun/sausages-n-fries",
              "southern-cross/sausages-2", "takeaway-at-churton/hot-dog-on-stick"):
        assert i in ids("sausage"), i + " left the sausage class"
    assert len(G["sausage"]) >= 30, len(G["sausage"])
    assert WATCH["sausage"] == ["contains-gluten"]
''',
    # The mechanism probe for ruling 3. `b3` is its breaker, and it is the
    # reason the narrowing is a lookbehind rather than an exclude entry.
    "R3 a plate naming BOTH sausages keeps the plain one watched": '''
    c = synthetic("Big Breakfast  Pork sausages, italian sausage, bacon, eggs, toast.")
    assert c["sausage"], \\
        "the PORK sausages on the same line left the wheat-rusk class — the " \\
        "narrowing vetoed the row instead of neutralising the word"
''',
    "R3 no sausage row is reported for a missing gluten tag": '''
    out = report()
    assert "## sausage" not in out, out[out.index("## sausage"):][:400]
''',
}

# bug label -> ([(old, new), …], {cases that must fail — and only these})
BREAKERS = {
    "b1 the Turkish pizzas fall back into the cheese class": (
        [(r'r"\b((?<!turkish )(?<!turkish-)pizzas?|calzones?)\b"',
          r'r"\b(pizzas?|calzones?)\b"')],
        {"R1 a Turkish pizza is out of the cheese-by-default class",
         "R1 the five untagged Turkish pizzas no longer report"},
    ),
    "b2 the gluten half of the Turkish class is dropped": (
        [(r'r"\bturkish[ -]pizzas?\b"', r'r"\bturkish[ -]pizzas?-never\b"')],
        {"R1 a Turkish pizza is still watched for gluten"},
    ),
    "b3 the Italian sausage is VETOED instead of narrowed": (
        [(r'r"\b((?<!italian )(?<!italian-)sausages?|snarlers?|cheerios?|saveloys?|"',
          r'r"\b(sausages?|snarlers?|cheerios?|saveloys?|"'),
         (r'r"\bsausage\s?rolls?\b|\b(chorizo|salami|pepperoni|kransky|lap\s?cheong|"',
          r'r"\bsausage\s?rolls?\b|\b(italian\s+sausages?|chorizo|salami|pepperoni|'
          r'kransky|lap\s?cheong|"')],
        {"R3 a plate naming BOTH sausages keeps the plain one watched"},
    ),
    "b4 an Italian sausage is an ordinary NZ sausage again": (
        [(r'r"\b((?<!italian )(?<!italian-)sausages?|snarlers?|cheerios?|saveloys?|"',
          r'r"\b(sausages?|snarlers?|cheerios?|saveloys?|"')],
        {"R3 an Italian sausage is out of the wheat-rusk class",
         "R3 no sausage row is reported for a missing gluten tag"},
    ),
    "b5 the crumbed class watches for egg again": (
        [("        # `contains-gluten` below is still the claim this row exists to police.\n"
          '        ["contains-gluten"],',
          "        # `contains-gluten` below is still the claim this row exists to police.\n"
          '        ["contains-gluten", "contains-egg"],')],
        {"R2 the crumbed class no longer watches for egg",
         "R2 no crumbed row is reported for a missing egg tag"},
    ),
    "b6 the Turkish narrowing is VETOED instead of narrowed": (
        [(r'r"\b((?<!turkish )(?<!turkish-)pizzas?|calzones?)\b"',
          r'r"\b(pizzas?|calzones?)\b"'),
         (r'r"\bpizza\s+(sauce|spice|seasoning)\b"',
          r'r"\bpizza\s+(sauce|spice|seasoning)\b|\bturkish\s+pizzas?\b"')],
        {"R1 a line naming BOTH pizzas keeps the Italian one watched"},
    ),
}


def run_case(work, source, verbose):
    """None if the case held, else the complaint."""
    body = "".join("    " + line + "\n" for line in source.strip("\n").split("\n"))
    script = PRELUDE + "\ndef case():\n" + body + "\ncase()\n"
    out = subprocess.run([sys.executable, "-c", script], cwd=work,
                         capture_output=True, text=True)
    if out.returncode == 0:
        return None
    lines = [l for l in out.stderr.strip().split("\n") if l.strip()]
    if verbose:
        print(out.stderr, file=sys.stderr)
    return (lines[-1] if lines else "exit %d" % out.returncode)[:180]


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="print the full traceback of every failing case")
    args = ap.parse_args()

    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp) / "faves"
        (work / "site").mkdir(parents=True)
        shutil.copytree(ROOT / "tools", work / "tools")
        shutil.copytree(ROOT / "site" / "data", work / "site" / "data")

        for name, source in CASES.items():
            complaint = run_case(work, source, args.verbose)
            print("  %s %-58s %s" % ("❌" if complaint else "✅", name,
                                     complaint or "as specified"))
            if complaint:
                failures.append(name)

        # …and now put each old behaviour back and see who notices.
        tool = work / TOOL
        good = tool.read_text(encoding="utf-8")
        for bug, (edits, covered) in BREAKERS.items():
            broken = good
            for old, new in edits:
                if old not in broken:
                    broken = None
                    break
                broken = broken.replace(old, new, 1)
            if broken is None:
                print("  ❌ %-58s PATCH MATCHED NOTHING — the table moved and "
                      "this breaker is now decorative" % ("break: " + bug))
                failures.append("breaker " + bug)
                continue
            tool.write_text(broken, encoding="utf-8")
            try:
                caught = {n for n, s in CASES.items()
                          if run_case(work, s, args.verbose) is not None}
            finally:
                tool.write_text(good, encoding="utf-8")
            # Both directions. A case that fires on every breaker localises
            # nothing, so "it fails ALONE" is asserted, not just "it fails".
            slept = covered - caught
            extra = caught - covered
            verdict = []
            if slept:
                verdict.append("SURVIVED THE BUG: " + ", ".join(sorted(slept)))
            if extra:
                verdict.append("ALSO FAILED (not alone): " + ", ".join(sorted(extra)))
            print("  %s %-58s %s" % ("❌" if verdict else "✅", "break: " + bug,
                                     " / ".join(verdict) or
                                     "caught by %d case(s), alone" % len(covered)))
            if verdict:
                failures.append("breaker " + bug)

    if failures:
        print("\n%d failure(s): %s" % (len(failures), ", ".join(failures)),
              file=sys.stderr)
        return 1
    print("\nAll %d cases behaved as specified." % (len(CASES) + len(BREAKERS)))
    return 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260).
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    sys.exit(main())
