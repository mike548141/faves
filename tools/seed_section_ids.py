#!/usr/bin/env python3
"""Write every menu section's id into the data, so an anchor stops being a
derivation of a heading.

WHY THIS EXISTS. ADR 0057 moved the time qualifier out of six section headings
("Brunch (served till 2pm)" → "Brunch" + a note). Every deep link to those
sections broke in the same commit, because the anchor was
`section-${slug(section.section)}` — computed from the *display name*. That is
ADR 0051's fault one level up the tree: the owner's ruling there was that
**identity must be immutable**, and an id recomputed from a mutable field is
not an identity, it is a coincidence that has held so far.

The owner ruled (2026-08-16) to build section ids rather than record the finding
— against the recommendation put to him, which was to log it and move on.

This seeds `sectionId` ONCE from what each section already resolves to, so
nothing moves on the day it runs: every section keeps the exact anchor every
link, bookmark and scroll-spy entry already used. After that the heading is free
to change and the anchor does not follow it.

    python3 tools/seed_section_ids.py --check   # report; exit 1 if any are missing
    python3 tools/seed_section_ids.py           # write the files
    python3 tools/seed_section_ids.py --only the-borough-tawa   # one venue
    python3 tools/seed_section_ids.py --skip burgerfuel         # leave one alone

`--skip` exists for a real situation rather than a hypothetical one: this tool
was written while a parallel session held six venue files open, and a mechanical
sweep across the corpus is exactly the change that silently reverts someone
else's uncommitted work. Seeding is idempotent, so a file left out today is not
a special case tomorrow — run it again.

Safe to run every time. A section that already has a `sectionId` is never
touched, so a second run is a no-op and an id, once written, is never rewritten
by this tool. That is the whole point.

FORMATTING and the offset parser are `seed_dish_ids.py`'s, imported rather than
copied: the corpus is hand-edited and not machine-formatted, so both tools do a
byte-exact text insertion driven by a real parse. A fourth copy of a JSON
scanner in this repo would be one more place for a fix to be applied once and
missed once — `slug` is already written three times and says so.

Stdlib only. Writes only under site/data/restaurants/.
"""

import argparse
import json
import sys

from seed_dish_ids import VENUES, WS, _Parser, slug


def each_section(root):
    """Every menu section Node in the record, in file order.

    `addOnsOnly` sections are included. A section nothing renders still has an
    identity, and skipping it here would make the field's presence depend on a
    rendering flag — which is how a "required" field becomes optional in
    practice."""
    menu = root.child("menu")
    for section in (menu.items if menu and menu.items else []):
        if section.members is not None:
            yield section


def _insertion(text, section, section_id):
    """Where to insert, and what — the two halves of a byte-exact edit.

    The id goes immediately after `"section"`, so someone renaming a heading
    meets the identity on the very next line and leaves it alone. That
    adjacency is the entire mechanism: before it, nothing in the file mentioned
    that a rename had consequences."""
    _, key_start, _, val_end = section.members["section"]
    line_start = text.rfind("\n", 0, key_start) + 1
    indent = text[line_start:key_start]

    if indent.strip():  # the whole pair is inline — don't break the line
        return val_end, f', "sectionId": "{section_id}"'

    j = val_end
    while j < len(text) and text[j] in WS:
        j += 1
    if j < len(text) and text[j] == ",":
        return j + 1, f'\n{indent}"sectionId": "{section_id}",'
    return val_end, f',\n{indent}"sectionId": "{section_id}"'


def _seed_one(path):
    """Return (new_text, added, skipped) for one venue file."""
    text = path.read_text(encoding="utf-8")
    root = _Parser(text).parse()
    if root.value != json.loads(text):
        raise SystemExit(f"{path.name}: offset parse disagrees with json.loads — refusing to edit")

    # Every id already in the file, so a seeded one can never land on top of an
    # explicit one. Uniqueness is a venue-wide property: two sections sharing an
    # id means one anchor, and the second section becomes unreachable.
    taken = {
        s.value["sectionId"]
        for s in each_section(root)
        if isinstance(s.value.get("sectionId"), str) and s.value["sectionId"]
    }

    edits, added, skipped = [], [], []
    for section in each_section(root):
        existing = section.value.get("sectionId")
        if isinstance(existing, str) and existing:
            continue
        name = section.value.get("section")
        if not isinstance(name, str) or not name.strip():
            skipped.append(f"{path.name}: a menu section has no name — validate.py will say so")
            continue
        section_id = slug(name)
        if not section_id:
            skipped.append(f"{path.name}: {name!r} slugs to nothing — give it an explicit sectionId by hand")
            continue
        if section_id in taken:
            # Deliberately a refusal, not an auto-suffix. A `-2` invents an
            # identity nobody chose and freezes it forever; a human picking the
            # id is a minute's work and happens once.
            skipped.append(
                f"{path.name}: {name!r} wants id {section_id!r}, which is already used in this venue "
                "— give it an explicit sectionId by hand"
            )
            continue
        taken.add(section_id)
        edits.append(_insertion(text, section, section_id))
        added.append((name, section_id))

    for offset, ins in sorted(edits, key=lambda e: -e[0]):
        text = text[:offset] + ins + text[offset:]
    return text, added, skipped


def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n")[0],
        epilog="Never overwrites an existing sectionId: an id a tool can rewrite is not an identity.",
    )
    ap.add_argument("--check", action="store_true",
                    help="report what is missing and exit 1 if anything is; change nothing")
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="seed just this venue id (repeatable); default is every venue")
    ap.add_argument("--skip", metavar="VENUE", action="append",
                    help="leave this venue alone (repeatable) — e.g. a file another session holds open")
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="name every section seeded, not just the per-file totals")
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

    total, touched, complaints = 0, 0, []
    for path in files:
        new_text, added, skipped = _seed_one(path)
        complaints += skipped
        if not added:
            continue
        touched += 1
        total += len(added)
        print(f"  {path.stem}: {len(added)} section(s) {'need' if args.check else 'seeded'}")
        if args.verbose:
            for name, section_id in added:
                print(f"      {name}  →  {section_id}")
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
            print(f"\n✗ {total} section(s) across {touched} file(s) have no \"sectionId\". "
                  "Run tools/seed_section_ids.py.")
            return 1
        print(f"✓ every section in {len(files)} file(s) carries its own \"sectionId\".")
        return 0

    print(f"\n✓ seeded {total} section(s) across {touched} file(s) "
          f"({len(files)} scanned). Run tools/validate.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
