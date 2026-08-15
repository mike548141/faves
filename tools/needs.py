#!/usr/bin/env python3
"""Report every dish-level gap the corpus knows about — the derived worklist.

WHY THIS EXISTS. These gaps used to be typed into ROADMAP.md by hand: "Gold
Lining — two unread prices … the Falafel Wrap and the Bliss Balls". Prose like
that is wrong the moment someone brings a price back and forgets the roadmap,
and this repo has already watched a hand-copied tally go stale three times (the
stub count, corrected 2026-08-09, again on 2026-08-15, and again hours later).
So the gap lives on the dish, in `needs`, and the roadmap points here instead of
naming dishes it cannot keep up with.

A REPORTER, NOT A GATE. Always exits 0 — an open gap is a normal state of the
corpus, not a defect, and `validate.py` already errors on a malformed `needs`.
Use `--exit-code` if you want a non-zero exit while any gap is open (handy in a
one-off check; deliberately not the default, or it would fail every build for
doing its job).

    python3 tools/needs.py                  # everything outstanding
    python3 tools/needs.py --what price     # just the unread prices
    python3 tools/needs.py --venue gold-lining-cafe
    python3 tools/needs.py --count          # one line per venue
    python3 tools/needs.py --json           # for anything downstream
"""

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data" / "restaurants"

# Mirrors site/js/needs.js KINDS and validate.py NEED_KINDS. Only used to order
# the report and validate --what, so it can lag harmlessly; validate.py is the
# one that errors, and test_validate.py is what keeps the three in step.
KINDS = ("price", "ingredients", "allergens", "name", "availability")


def collect():
    """[{venue, venueId, section, dish, what, note, since}] — corpus order."""
    rows = []
    for path in sorted(DATA.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            print(f"  ! skipped {path.name}: {exc}", file=sys.stderr)
            continue
        for section in data.get("menu") or []:
            for item in section.get("items") or []:
                for n in item.get("needs") or []:
                    if not isinstance(n, dict):
                        continue
                    rows.append(
                        {
                            "venue": data.get("name", data.get("id", path.stem)),
                            "venueId": data.get("id", path.stem),
                            "section": section.get("section"),
                            "dish": item.get("name"),
                            "what": n.get("what"),
                            "note": n.get("note"),
                            "since": n.get("since"),
                        }
                    )
    return rows


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--what", choices=KINDS, help="only this kind of gap")
    ap.add_argument("--venue", help="only this venue id")
    ap.add_argument("--count", action="store_true", help="one summary line per venue")
    ap.add_argument("--json", action="store_true", help="machine-readable")
    ap.add_argument(
        "--exit-code",
        action="store_true",
        help="exit 1 while any gap is open (off by default — a gap is not a defect)",
    )
    args = ap.parse_args()

    rows = collect()
    if args.what:
        rows = [r for r in rows if r["what"] == args.what]
    if args.venue:
        rows = [r for r in rows if r["venueId"] == args.venue]

    if args.json:
        print(json.dumps(rows, indent=2, ensure_ascii=False))
        return 1 if (rows and args.exit_code) else 0

    if not rows:
        print("No dish-level gaps recorded — nothing outstanding.")
        return 0

    by_venue = {}
    for r in rows:
        by_venue.setdefault(r["venue"], []).append(r)

    if args.count:
        for venue, rs in by_venue.items():
            kinds = ", ".join(f"{k}×{sum(1 for r in rs if r['what'] == k)}"
                              for k in KINDS if any(r["what"] == k for r in rs))
            print(f"{venue}: {len(rs)} ({kinds})")
    else:
        for venue, rs in by_venue.items():
            print(f"\n## {venue} ({len(rs)})")
            for r in rs:
                since = f"  [noticed {r['since']}]" if r["since"] else ""
                print(f"  {r['what']:<13} {r['dish']}{since}")
                if r["section"]:
                    print(f"                → in “{r['section']}”")
                if r["note"]:
                    print(f"                {r['note']}")

    total = len(rows)
    venues = len(by_venue)
    print(f"\n{total} open gap(s) across {venues} venue(s).")
    return 1 if args.exit_code else 0


if __name__ == "__main__":
    sys.exit(main())
