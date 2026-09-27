#!/usr/bin/env python3
"""Write every add-on option's id into the data, so an option stops being its name.

WHY THIS EXISTS (ADR 0126, roadmap 28q). An order line's identity includes the
add-on selection, and `selectionKey` (site/js/addons.js) identified each chosen
option by its group id and its DISPLAY NAME. So a venue renaming "Large" to
"Lg" re-keyed every saved order line, every backup and every outstanding share
link that chose it — the failure ADR 0051 fixed for dishes and left open for
options. It mattered little while an option was a sauce; after `490/050` an
option is a SIZE or a PROTEIN, and a mis-keyed one is the difference between a
$14.50 plate and a $29.00 one.

This seeds `id` ONCE from `slug(name)` — which is exactly what the new
`optionId()` falls back to for a line stored before ids existed — so nothing
moves on the day it runs: every option keeps the identity every stored line
already resolves to. After that the name is free to change and the id does not
follow it.

    python3 tools/seed_option_ids.py --check   # report; exit 1 if any are missing
    python3 tools/seed_option_ids.py           # write the files
    python3 tools/seed_option_ids.py --only sprig-and-fern-tawa
    python3 tools/seed_option_ids.py --skip kk-malaysian   # a file another session holds

THE FIELD IS `id`, like an add-on GROUP's and a branch's, not `optionId`: the
group it sits in already spells its identity `id`, one line above, and an option
is never rendered with an HTML id that the word could be mistaken for.

Uniqueness is WITHIN A GROUP, because that is the scope the order line keys on
(`<group>\\x1f<option>`). Two groups may each have a "large". A seeded id that
would collide inside its group is REFUSED, never suffixed — `seed_section_ids`'s
rule, for its reason: a `-2` invents an identity nobody chose and then freezes it.

Safe to run every time. An option that already has an `id` is never touched, so
a second run is a no-op and an id, once written, is never rewritten by this tool.

FORMATTING and the offset parser are `seed_dish_ids.py`'s, imported rather than
copied: byte-exact text insertion driven by a real parse, so hand-compacted
option rows stay on one line and nothing else in the file moves.

Stdlib only. Writes only under site/data/restaurants/.
"""

import argparse
import json
import sys
from pathlib import Path

from seed_dish_ids import VENUES, WS, _Parser, slug

ROOT = Path(__file__).resolve().parent.parent


def each_group(root):
    """Every add-on group Node in the record, in file order."""
    groups = root.child("addOnGroups")
    for g in (groups.items if groups and groups.items else []):
        if g.members is not None:
            yield g


def each_option(group):
    options = group.child("options")
    for o in (options.items if options and options.items else []):
        if o.members is not None:
            yield o


def _insertion(text, option, option_id):
    """Where to insert, and what. The id goes immediately after `"name"`, the
    adjacency `dishId`, `sectionId` and a branch's `id` all use: someone renaming
    an option meets its identity on the same line or the next and leaves it."""
    _, key_start, _, val_end = option.members["name"]
    line_start = text.rfind("\n", 0, key_start) + 1
    indent = text[line_start:key_start]

    if indent.strip():  # the option is written inline — keep it on its line
        return val_end, f', "id": "{option_id}"'

    j = val_end
    while j < len(text) and text[j] in WS:
        j += 1
    if j < len(text) and text[j] == ",":
        return j + 1, f'\n{indent}"id": "{option_id}",'
    return val_end, f',\n{indent}"id": "{option_id}"'


def _seed_one(path):
    """Return (new_text, added, skipped, seen) for one venue file."""
    text = path.read_text(encoding="utf-8")
    root = _Parser(text).parse()
    if root.value != json.loads(text):
        raise SystemExit(f"{path.name}: offset parse disagrees with json.loads — refusing to edit")

    edits, added, skipped, seen = [], [], [], 0
    for group in each_group(root):
        gid = group.value.get("id")
        taken = {
            o.value["id"]
            for o in each_option(group)
            if isinstance(o.value.get("id"), str) and o.value["id"]
        }
        for option in each_option(group):
            seen += 1
            existing = option.value.get("id")
            if isinstance(existing, str) and existing:
                continue
            name = option.value.get("name")
            if not isinstance(name, str) or not name.strip():
                skipped.append(f"{path.name}: an option in group {gid!r} has no name — validate.py will say so")
                continue
            option_id = slug(name)
            if not option_id:
                skipped.append(
                    f"{path.name}: {name!r} in group {gid!r} slugs to nothing — give it an explicit \"id\" by hand"
                )
                continue
            if option_id in taken:
                skipped.append(
                    f"{path.name}: {name!r} wants id {option_id!r}, already used in group {gid!r} "
                    "— give it an explicit \"id\" by hand"
                )
                continue
            taken.add(option_id)
            edits.append(_insertion(text, option, option_id))
            added.append((gid, name, option_id))

    for offset, ins in sorted(edits, key=lambda e: -e[0]):
        text = text[:offset] + ins + text[offset:]
    return text, added, skipped, seen


def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n")[0],
        epilog='Never overwrites an existing option "id": an id a tool can rewrite is not an identity.',
    )
    ap.add_argument("--check", action="store_true",
                    help="report what is missing and exit 1 if anything is; change nothing")
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="seed just this venue id (repeatable); default is every venue")
    ap.add_argument("--skip", metavar="VENUE", action="append",
                    help="leave this venue alone (repeatable) — e.g. a file another session holds open")
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="name every option seeded, not just the per-file totals")
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

    total, touched, complaints, options = 0, 0, [], 0
    for path in files:
        new_text, added, skipped, seen = _seed_one(path)
        complaints += skipped
        options += seen
        if not added:
            continue
        touched += 1
        total += len(added)
        print(f"  {path.stem}: {len(added)} option(s) {'need' if args.check else 'seeded'}")
        if args.verbose:
            for gid, name, option_id in added:
                print(f"      {gid} / {name}  →  {option_id}")
        if not args.check:
            path.write_text(new_text, encoding="utf-8")

    for c in complaints:
        print(f"warning: {c}")
    # Named, never silent: a sweep that covered less than the corpus reads as
    # "everything is seeded" when it isn't.
    if skipped_files:
        print(f"\nskipped by request ({len(skipped_files)}): {', '.join(skipped_files)}")

    if args.check:
        if total or complaints:
            print(f"\n✗ {total} option(s) across {touched} file(s) have no \"id\""
                  f"{f', {len(complaints)} cannot be seeded' if complaints else ''}. "
                  "Run tools/seed_option_ids.py.")
            return 1
        print(f"✓ every one of {options} add-on option(s) in {len(files)} file(s) carries its own \"id\".")
        return 0

    print(f"\n✓ seeded {total} option(s) across {touched} file(s) "
          f"({options} option(s) in {len(files)} file(s) scanned). Run tools/validate.py.")
    return 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT, resolved from this file, never
    # the cwd (ADR 0113). Prints as the run's last line on every exit path.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    sys.exit(main())
