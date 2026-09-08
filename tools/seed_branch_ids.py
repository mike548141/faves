#!/usr/bin/env python3
"""Write every branch's id into the data, so a branch stops being a position.

WHY THIS EXISTS. A branch was named two ways and neither is an identity.
`data.js:33-44` projects `locations[0]` to the top level, so the *primary*
branch is whichever one happens to be first — reorder the array and a different
shop becomes the venue's address, phone and hours, silently. The other way is
`label`, which is optional in the schema, free text in the corpus, and universal
only by habit. That is ADR 0051's fault a third time: identity must be
immutable, and a position is not immutable, nor is a display string.

Nothing pointed at a branch when the array was written, so nothing broke. Three
ruled things now do point at one: per-branch closure (`210/040`), per-branch
price overrides (ADR 0080 D4, which is Square's `absent_at_location_ids` shape —
a list of ids), and the owner's 2026-09-08 ruling that Cook at Home becomes a
venue with branches, where a reader adds private branches of their own on their
device. That last one is the sharpest: a key a reader stores on their phone
against a branch in a SHIPPED record must survive the next payload refresh
adding a branch above it. A position cannot.

This seeds `id` ONCE from each branch's `label`, so nothing moves on the day it
runs — the array order is untouched and every branch keeps the label it had.
After that the label is free to change, a branch is free to move in the array,
and the id does not follow either.

    python3 tools/seed_branch_ids.py --check   # report; exit 1 if any are missing
    python3 tools/seed_branch_ids.py           # write the files
    python3 tools/seed_branch_ids.py --only subway     # one venue
    python3 tools/seed_branch_ids.py --skip hell-pizza # leave one alone

THE FIELD IS `id`, NOT `branchId`, and the divergence from `dishId`/`sectionId`
is deliberate: a branch is a PLACE, and the record for a place already spells
its identity `id` at the top level. A reader who knows what a venue's `id` is
needs to learn nothing to read a branch's. A dish and a section are qualified
because `id` on a menu row would read as the row's HTML id, which is a
different (derived) thing.

`--skip` exists for a real situation rather than a hypothetical one, and it is
inherited from `seed_section_ids.py` for the same reason: a mechanical sweep
across the corpus is exactly the change that silently reverts another session's
uncommitted work. Seeding is idempotent, so a file left out today is not a
special case tomorrow — run it again.

Safe to run every time. A branch that already has an `id` is never touched, so a
second run is a no-op and an id, once written, is never rewritten by this tool.
That is the whole point.

FORMATTING and the offset parser are `seed_dish_ids.py`'s, imported rather than
copied: the corpus is hand-edited and not machine-formatted, so this does a
byte-exact text insertion driven by a real parse rather than a `json.dump` round
trip that would reflow files and bury the change.

Stdlib only. Writes only under site/data/restaurants/.
"""

import argparse
import json
import sys
from pathlib import Path

from seed_dish_ids import VENUES, WS, _Parser, slug

ROOT = Path(__file__).resolve().parent.parent


def each_branch(root):
    """Every branch Node in the record, in file order.

    A venue with no `locations` array yields nothing — it is a single-location
    record whose one location is the top level, which already has the venue's
    own `id`."""
    locations = root.child("locations")
    for branch in (locations.items if locations and locations.items else []):
        if branch.members is not None:
            yield branch


def _insertion(text, branch, branch_id):
    """Where to insert, and what — the two halves of a byte-exact edit.

    The id goes immediately after `"label"`, the same adjacency `dishId` and
    `sectionId` use: someone renaming a branch meets the identity on the very
    next line and leaves it alone. Before this, nothing in the file mentioned
    that a rename — or a reorder — had consequences."""
    _, key_start, _, val_end = branch.members["label"]
    line_start = text.rfind("\n", 0, key_start) + 1
    indent = text[line_start:key_start]

    if indent.strip():  # the whole pair is inline — don't break the line
        return val_end, f', "id": "{branch_id}"'

    j = val_end
    while j < len(text) and text[j] in WS:
        j += 1
    if j < len(text) and text[j] == ",":
        return j + 1, f'\n{indent}"id": "{branch_id}",'
    return val_end, f',\n{indent}"id": "{branch_id}"'


def _seed_one(path):
    """Return (new_text, added, skipped, seen) for one venue file. `seen` is how
    many branches the file holds at all — the summary reports it because
    "0 need seeding" is the same sentence whether the corpus is fully seeded or
    the tool walked past every branch in it."""
    text = path.read_text(encoding="utf-8")
    root = _Parser(text).parse()
    if root.value != json.loads(text):
        raise SystemExit(f"{path.name}: offset parse disagrees with json.loads — refusing to edit")

    # Every id already in the file, so a seeded one can never land on top of an
    # explicit one. Uniqueness is a venue-wide property: two branches sharing an
    # id means a per-branch override, a stored preference or a closure notice
    # lands on whichever one a lookup happens to find first.
    taken = {
        b.value["id"]
        for b in each_branch(root)
        if isinstance(b.value.get("id"), str) and b.value["id"]
    }

    edits, added, skipped, seen = [], [], [], 0
    for branch in each_branch(root):
        seen += 1
        existing = branch.value.get("id")
        if isinstance(existing, str) and existing:
            continue
        label = branch.value.get("label")
        if not isinstance(label, str) or not label.strip():
            # A branch with no label has nothing to derive an identity from.
            # Deliberately not falling back to the address: an address is the
            # field most likely to be corrected, and an id derived from it would
            # be exactly the mutable-source identity this tool exists to end.
            skipped.append(
                f"{path.name}: a branch has no label to derive an id from "
                "— give it an explicit \"id\" by hand"
            )
            continue
        branch_id = slug(label)
        if not branch_id:
            skipped.append(f"{path.name}: {label!r} slugs to nothing — give it an explicit \"id\" by hand")
            continue
        if branch_id in taken:
            # Deliberately a refusal, not an auto-suffix — `seed_section_ids.py`'s
            # rule, for its reason: a `-2` invents an identity nobody chose and
            # then freezes it forever, and a human picking the id is a minute's
            # work that happens once.
            skipped.append(
                f"{path.name}: {label!r} wants id {branch_id!r}, which is already used in this venue "
                "— give it an explicit \"id\" by hand"
            )
            continue
        taken.add(branch_id)
        edits.append(_insertion(text, branch, branch_id))
        added.append((label, branch_id))

    for offset, ins in sorted(edits, key=lambda e: -e[0]):
        text = text[:offset] + ins + text[offset:]
    return text, added, skipped, seen


def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n")[0],
        epilog='Never overwrites an existing branch "id": an id a tool can rewrite is not an identity.',
    )
    ap.add_argument("--check", action="store_true",
                    help="report what is missing and exit 1 if anything is; change nothing")
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="seed just this venue id (repeatable); default is every venue")
    ap.add_argument("--skip", metavar="VENUE", action="append",
                    help="leave this venue alone (repeatable) — e.g. a file another session holds open")
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="name every branch seeded, not just the per-file totals")
    args = ap.parse_args(argv)

    files = sorted(VENUES.glob("*.json"))
    if args.only:
        wanted = set(args.only)
        files = [f for f in files if f.stem in wanted]
        missing = wanted - {f.stem for f in files}
        if missing:
            print(f"error: no such venue file(s): {', '.join(sorted(missing))}", file=sys.stderr)
            return 1
    skipped_files = []
    if args.skip:
        skipping = set(args.skip)
        skipped_files = [f.stem for f in files if f.stem in skipping]
        files = [f for f in files if f.stem not in skipping]

    total, touched, complaints, branches = 0, 0, [], 0
    for path in files:
        new_text, added, skipped, seen = _seed_one(path)
        complaints += skipped
        branches += seen
        if not added:
            continue
        touched += 1
        total += len(added)
        print(f"  {path.stem}: {len(added)} branch(es) {'need' if args.check else 'seeded'}")
        if args.verbose:
            for label, branch_id in added:
                print(f"      {label}  →  {branch_id}")
        if not args.check:
            path.write_text(new_text, encoding="utf-8")

    for c in complaints:
        print(f"warning: {c}")
    # Named, never silent. A sweep that quietly covered less than the whole
    # corpus reads as "everything is seeded" when it isn't, and the next --check
    # is the only thing that would ever say otherwise.
    if skipped_files:
        print(f"\nskipped by request ({len(skipped_files)}): {', '.join(skipped_files)}")

    if args.check:
        if total:
            print(f"\n✗ {total} branch(es) across {touched} file(s) have no \"id\". "
                  "Run tools/seed_branch_ids.py.")
            return 1
        print(f"✓ every one of {branches} branch(es) in {len(files)} file(s) carries its own \"id\".")
        return 0

    print(f"\n✓ seeded {total} branch(es) across {touched} file(s) "
          f"({branches} branch(es) in {len(files)} file(s) scanned). Run tools/validate.py.")
    return 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260). Prints as the run's last line, on every
    # exit path including a refusal.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    sys.exit(main())
