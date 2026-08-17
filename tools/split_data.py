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
move is reversible by construction and `--check` asks four questions of EVERY
venue file, printing the population it covered before its verdict:

  1. is the payload already split — no superseded price series, no `offBy`
     dish still shipping to every phone;
  2. does payload + record round-trip back to the pre-split document;
  3. does every history row still point at a real dish (a price row's dish
     live or departed, a departed row's dish NOT also live);
  4. does the record hold at least as much history as it did at HEAD.

Only (2) existed until 2026-08-17, and it ran on 2 of 55 files: a venue with
no history file was `continue`d, which is the state a DELETED history file
leaves behind. Worse, (2) alone cannot see a deleted row at all — it derives
its expectation from the same file it is checking, so a row removed from the
record is removed from both sides of its own comparison and passes. (3) and
(4) are the independent halves. (4) needs the previous state and git is the
only place that exists, so it catches the commit doing the damage rather than
damage already committed; that is a real limit, stated rather than papered over.

    python3 tools/split_data.py --dry-run   # what would move
    python3 tools/split_data.py             # do it
    python3 tools/split_data.py --check     # the four questions above

Stdlib only. Writes only under site/data/restaurants/ and data/history/.
"""

import argparse
import json
import subprocess
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
    key = {
        "section": section.get("section"),
        "name": item.get("name"),
        "code": item.get("code"),
    }
    # An explicit `dishId` (ADR 0051) is the one part of a dish that survives a
    # rename, so carry it when the data gives one — a renamed dish would
    # otherwise orphan its own price history. Only when it is explicit: adding
    # the derived `slug(name)` would say nothing name doesn't already say, and
    # would rewrite every history file that predates dish ids for no gain.
    did = item.get("dishId")
    if isinstance(did, str) and did:
        key["dishId"] = did
    return key


def same_dish(key, section, item):
    if key.get("section") != section.get("section"):
        return False
    # An id on the key decides on its own, because that is what an id is for.
    # A key written before ids existed carries none and matches the way it
    # always did — so no existing history row changes meaning.
    if key.get("dishId"):
        return key["dishId"] == item.get("dishId")
    return (key.get("name") == item.get("name")
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


def check_orphans(vid, doc, hp, hd):
    """Complaints about history rows that no longer line up with the payload.

    The round trip below proves the two stores are MUTUALLY CONSISTENT, which
    is a weaker claim than it looks: it derives its expectation from the very
    file it is checking, so a row deleted from the record is deleted from both
    sides of its own comparison and passes. This is the independent half — it
    asks whether each row still points at something real.

      • a price row whose dish is neither on the menu nor in the departed rows
        is a dish that was DELETED rather than moved, which is the one failure
        this tool's docstring says it exists to prevent.
      • a departed row whose dish is also live is a dish recorded as gone and
        printed on the menu at the same time — a restoration that left its
        tombstone behind, so the menu now shows it twice.
    """
    problems = []
    live = [(s, i) for s in doc.get("menu") or []
            if isinstance(s, dict)
            for i in s.get("items") or [] if isinstance(i, dict)]
    for row in hp:
        key = row.get("key") or {}
        if any(same_dish(key, s, i) for s, i in live):
            continue
        if any(r.get("key") == key for r in hd):
            continue
        problems.append(
            f"{vid}: price history for {key.get('name')!r} in "
            f"{key.get('section')!r} points at no dish — live nor departed")
    for row in hd:
        key = row.get("key") or {}
        if any(same_dish(key, s, i) for s, i in live):
            problems.append(
                f"{vid}: {key.get('name')!r} in {key.get('section')!r} is "
                f"recorded as departed AND still on the menu")
    return problems


def rows_at_head(vid, kind):
    """`data/history/<kind>/<vid>.json`'s rows as committed at HEAD, or None
    when git cannot answer (no checkout, no git, file absent at HEAD).

    None means "no baseline", never "clean" — the caller skips rather than
    passing, because a check that treats an unavailable baseline as agreement
    is the decorative shape (ADR 0072)."""
    rel = f"data/history/{kind}/{vid}.json"
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "show", f"HEAD:{rel}"],
            capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    try:
        return json.loads(out.stdout).get("rows", [])
    except json.JSONDecodeError:
        return None


def weight(rows, kind):
    """How much history a row list holds: superseded price entries for prices,
    whole dishes for departed dishes. Counted rather than compared entry by
    entry, because a CORRECTION legitimately rewrites what a superseded entry
    says (`did the shop change it, or did we?` — ARCHITECTURE, "Refreshing a
    menu") while never removing one. Counts separate the two; identities would
    fail an honest correction."""
    if kind == "prices":
        return sum(len(r.get("superseded") or []) for r in rows)
    return len(rows)


def check_append_only(vid):
    """Complaints where the record holds LESS history than the last commit did.

    ADR 0023's guarantee is that a refresh cannot silently destroy history, and
    that is a claim about a CHANGE, so it needs the previous state to compare
    against — git is the only place that state exists. What this therefore
    catches is the commit doing the damage, not damage already committed; said
    plainly because the difference decides whether a green run means anything.
    """
    problems = []
    baseline = False
    hp, hd = read_history(vid)
    for kind, rows in (("prices", hp), ("dishes", hd)):
        was = rows_at_head(vid, kind)
        if was is None:
            continue
        baseline = True
        before, after = weight(was, kind), weight(rows, kind)
        if after < before:
            noun = "superseded price entr(y/ies)" if kind == "prices" else "departed dish row(s)"
            extra = ("" if kind == "prices" else
                     " (a departed dish genuinely returning is the one legitimate "
                     "cause — say so in the commit message)")
            problems.append(
                f"{vid}: data/history/{kind}/ held {before} {noun} at HEAD and "
                f"now holds {after} — history was destroyed, not relocated{extra}")
    return problems, baseline


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
    checked = with_history = against_head = 0
    failures = []

    for f in files:
        vid = f.stem
        doc = json.loads(f.read_text())

        if args.check:
            # EVERY venue, not only the ones that happen to have a history
            # file. Until 2026-08-17 this skipped a venue whose record was
            # empty — 53 of 55 — and an empty record is exactly the state a
            # deleted history file leaves behind, so the check reported "clean"
            # over 2 files and said nothing about the other 53. Worse, a venue
            # never split at all (superseded prices still sitting in the
            # payload, shipping to every phone) was skipped for the same
            # reason: no history file, nothing to compare, silence.
            hp, hd = read_history(vid)
            payload = json.loads(f.read_text())
            checked += 1
            if hp or hd:
                with_history += 1

            # Is the payload already split? Asked FIRST, because "there are
            # still superseded prices in site/data/" and "the two stores
            # disagree" are different faults and the round trip below reports
            # both with the same words.
            _, left_p, left_d = split_venue(json.loads(json.dumps(payload)))
            if left_p or left_d:
                failures.append(
                    f"{vid}: payload still holds "
                    f"{sum(len(r['superseded']) for r in left_p)} superseded "
                    f"price entr{'y' if sum(len(r['superseded']) for r in left_p) == 1 else 'ies'} "
                    f"and {len(left_d)} departed dish(es) — run "
                    f"`python3 tools/split_data.py` (ADR 0047)")

            # Reconstruct from what is on disk in both stores, then split it
            # again. A stable round trip means nothing was lost in the move.
            rebuilt = reconstruct(json.loads(json.dumps(payload)), hp, hd)
            again, p2, d2 = split_venue(json.loads(json.dumps(rebuilt)))
            if payload != again:
                failures.append(f"{vid}: payload does not survive a round trip")
            if len(p2) != len(hp) or len(d2) != len(hd):
                failures.append(
                    f"{vid}: record has {len(hp)} price row(s)/{len(hd)} dish "
                    f"row(s), round trip yields {len(p2)}/{len(d2)}")

            failures += check_orphans(vid, payload, hp, hd)
            appended, baseline = check_append_only(vid)
            failures += appended
            if baseline:
                against_head += 1
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
        # The population, always — before the verdict, and whether it passed or
        # failed. "Clean" over 2 of 55 files reads identically to "clean" over
        # 55, and that is how this check spent its life saying nothing (ADR
        # 0072). A number that shrinks is now visible on the line above the tick.
        print(f"  scope: {checked} of {len(files)} venue file(s) checked · "
              f"{with_history} with a history file · {against_head} compared "
              f"against HEAD for append-only")
        if failures:
            print(f"✗ split_data: {len(failures)} problem(s).")
            for x in failures:
                print(f"  {x}")
            print("\nThe two stores must rebuild the pre-split corpus between "
                  "them. A venue that cannot is history lost, not relocated.")
            return 1
        print(f"✓ split_data check clean — {checked} venue file(s); payload and "
              f"record reconstruct exactly, no orphaned history rows, nothing "
              f"shed since HEAD.")
        return 0

    verb = "would move" if args.dry_run else "moved"
    print(f"✓ split_data: {verb} {moved_p} superseded price entr"
          f"{'y' if moved_p == 1 else 'ies'} and {moved_d} departed dish(es) "
          f"out of {touched} venue file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
