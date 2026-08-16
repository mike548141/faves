#!/usr/bin/env python3
"""Move what no screen renders out of the payload and into `data/` (ADR 0047).

WHY THIS EXISTS. `site/data/restaurants/<id>.json` is precached in full by the
service worker, so a field added there is downloaded by every phone whether a
screen reads it or not. The owner ruled (2026-08-16) that data the app will
never render must not be in the app's dataset — but must still be kept. Two
classes qualify, both verified against the code rather than assumed:

  • superseded price entries — a dish's `price` is a dated series (ADR 0023);
    the app resolves the current value and nothing outside `temporal.js` reads
    `priceSeries` or `priceNext`.
  • dishes marked `available.offBy` — `temporal.js` uses the marker only to
    decide the dish is *not* shown, so a dish removed and a dish marked gone
    render identically.

THE DANGER THIS TOOL CARRIES is that a relocation becomes a deletion. So the
move is reversible by construction and `--check` proves it: it reconstructs
each venue from payload + record and compares against the pre-split original
recorded in `data/history/`. If the two stores no longer reconstruct, the
check fails — that is the guard, and it is the reason the record keeps whole
item snapshots rather than diffs.

    python3 tools/split_data.py --dry-run   # what would move
    python3 tools/split_data.py             # do it
    python3 tools/split_data.py --check     # payload + record still reconstruct

Stdlib only. Writes only under site/data/restaurants/ and data/history/.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"
HIST = ROOT / "data" / "history"


def dish_key(section, item):
    """Stable enough to rejoin on, and readable by a human reading the record.

    Not the list index: indices shift the moment a section is reordered, and
    this record has to survive years of menu edits. `code` where the shop
    gives one, name otherwise, always scoped by section.
    """
    return {
        "section": section.get("section"),
        "name": item.get("name"),
        "code": item.get("code"),
    }


def same_dish(key, section, item):
    return (key.get("section") == section.get("section")
            and key.get("name") == item.get("name")
            and key.get("code") == item.get("code"))


def split_venue(doc):
    """Return (trimmed payload, price history rows, departed dish rows)."""
    prices, departed = [], []
    menu = doc.get("menu")
    if not isinstance(menu, list):
        return doc, prices, departed

    for section in menu:
        if not isinstance(section, dict):
            continue
        kept = []
        for item in section.get("items", []) or []:
            if not isinstance(item, dict):
                kept.append(item)
                continue

            # A dish confirmed off the menu renders nowhere — the whole item
            # moves, snapshot and all, so the record can put it back.
            avail = item.get("available")
            if isinstance(avail, dict) and avail.get("offBy"):
                departed.append({"key": dish_key(section, item), "item": item})
                continue

            # Keep the newest price entry: the app renders how old a price is
            # (ADR 0036) and derives from it (ADR 0031), so the current entry
            # keeps its `recorded` and method. Everything before it is record.
            p = item.get("price")
            if isinstance(p, list) and len(p) > 1:
                item = dict(item)
                item["price"] = [p[-1]]
                prices.append({"key": dish_key(section, item),
                               "superseded": p[:-1]})
            kept.append(item)
        section["items"] = kept
    return doc, prices, departed


def reconstruct(doc, prices, departed):
    """Payload + record → the pre-split document. The inverse of split_venue."""
    menu = doc.get("menu")
    if not isinstance(menu, list):
        return doc
    for section in menu:
        if not isinstance(section, dict):
            continue
        items = section.get("items", []) or []
        for item in items:
            if not isinstance(item, dict):
                continue
            for row in prices:
                if same_dish(row["key"], section, item):
                    item["price"] = row["superseded"] + item["price"]
        for row in departed:
            if row["key"].get("section") == section.get("section"):
                items.append(row["item"])
        section["items"] = items
    return doc


def read_history(vid):
    def load(kind):
        f = HIST / kind / f"{vid}.json"
        if not f.is_file():
            return []
        doc = json.loads(f.read_text())
        return doc.get("rows", [])
    return load("prices"), load("dishes")


def write_history(vid, kind, rows, note):
    d = HIST / kind
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{vid}.json"
    f.write_text(json.dumps(
        {"venue": vid, "note": note, "rows": rows}, indent=2,
        ensure_ascii=False) + "\n")


PRICE_NOTE = ("Price entries superseded by a later reading. Appended, never "
              "rewritten (ADR 0023); moved out of the payload by ADR 0047 "
              "because no screen renders them. The current price stays on the "
              "dish in site/data/.")
DISH_NOTE = ("Dishes confirmed off the menu (`available.offBy`). The whole "
             "item is kept so it can be restored verbatim if it returns.")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", help="report, change nothing")
    g.add_argument("--check", action="store_true",
                   help="assert payload + record still reconstruct the original")
    args = ap.parse_args(argv)

    files = sorted(VENUES.glob("*.json"))
    moved_p = moved_d = touched = 0
    failures = []

    for f in files:
        vid = f.stem
        doc = json.loads(f.read_text())

        if args.check:
            # Reconstruct from what is on disk in both stores, then split it
            # again. A stable round trip means nothing was lost in the move.
            hp, hd = read_history(vid)
            if not hp and not hd:
                continue
            rebuilt = reconstruct(json.loads(f.read_text()), hp, hd)
            again, p2, d2 = split_venue(json.loads(json.dumps(rebuilt)))
            if json.loads(f.read_text()) != again:
                failures.append(f"{vid}: payload does not survive a round trip")
            if len(p2) != len(hp) or len(d2) != len(hd):
                failures.append(
                    f"{vid}: record has {len(hp)} price row(s)/{len(hd)} dish "
                    f"row(s), round trip yields {len(p2)}/{len(d2)}")
            touched += 1
            continue

        _, prices, departed = split_venue(json.loads(json.dumps(doc)))
        if not prices and not departed:
            continue
        moved_p += sum(len(r["superseded"]) for r in prices)
        moved_d += len(departed)
        touched += 1
        if args.dry_run:
            print(f"  {vid}: {sum(len(r['superseded']) for r in prices)} "
                  f"superseded price(s), {len(departed)} departed dish(es)")
            continue

        trimmed, prices, departed = split_venue(doc)
        f.write_text(json.dumps(trimmed, indent=2, ensure_ascii=False) + "\n")
        if prices:
            write_history(vid, "prices", prices, PRICE_NOTE)
        if departed:
            write_history(vid, "dishes", departed, DISH_NOTE)

    if args.check:
        if failures:
            print(f"✗ split_data: {len(failures)} venue(s) do not reconstruct.")
            for x in failures:
                print(f"  {x}")
            print("\nThe two stores must rebuild the pre-split corpus between "
                  "them. A venue that cannot is history lost, not relocated.")
            return 1
        print(f"✓ split_data check clean — {touched} venue(s) with history; "
              f"payload and record reconstruct exactly.")
        return 0

    verb = "would move" if args.dry_run else "moved"
    print(f"✓ split_data: {verb} {moved_p} superseded price entr"
          f"{'y' if moved_p == 1 else 'ies'} and {moved_d} departed dish(es) "
          f"out of {touched} venue file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
