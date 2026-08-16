#!/usr/bin/env python3
"""Write every dish's id into the data, so identity stops being a derivation.

WHY THIS EXISTS. ADR 0051 gave a dish a `dishId` and let it default to
`slug(name)` when the field was absent. That default is not an identity: it is a
*function of the display name*, so renaming a dish silently changes its id — and
a changed id detaches the heart, the rating, the shared link and the order line
that pointed at it. The owner ruled (2026-08-16) that favourites and ratings must
never be lost again, breaking changes now being cheaper than a silent loss later.
An id you can recompute from a mutable field cannot honour that; an id written
down can.

So this tool seeds the field ONCE from what the dish already resolves to, after
which the id is a stored fact. Nothing moves on the day it runs — every dish
keeps the exact id every anchor, heart, rating and order line already used.

What it buys is not enforcement, it is the transcriber's eye. Someone renaming a
dish opens the file and sees

    "name": "Cheeseburger",
    "dishId": "cheeseburger",

on adjacent lines. They change the name and leave the id, because the id is
sitting there. Before this, nothing in the file mentioned that a rename had
consequences, and there was nothing to leave alone.

    python3 tools/seed_dish_ids.py --check   # report; exit 1 if anything is missing
    python3 tools/seed_dish_ids.py           # write the files
    python3 tools/seed_dish_ids.py --only sprig-and-fern-tawa   # one venue

Safe to run every time, like `fetch_fx.py --bump`: a dish that already has a
`dishId` is never touched, so a second run is a no-op and an id, once written,
is never rewritten by this tool. That is the whole point — see `_seed_one`.

FORMATTING. The corpus is hand-edited and not uniformly machine-formatted (one
venue keeps its `tags` arrays on a single line), so this does a TEXT insertion
rather than a `json.dump` round trip: reflowing 47 files to add one field per
dish would bury the change and lose an editor's deliberate layout. The insertion
is driven by a real parse that records byte offsets, not by a regex over
`"name"` — a venue, an add-on group, an add-on option and a branch all have a
`name` too, and only dishes get an id.

Stdlib only. Writes only under site/data/restaurants/.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"

WS = " \t\n\r"

# Borrowed from the stdlib decoder rather than reimplemented: it handles the
# escapes and surrogate pairs that a hand-rolled scanner gets wrong, and it is
# the exact function `json.loads` itself uses, so the strings this reads and the
# strings json.loads reads can never disagree. Fall back to the Python
# implementation on a build without the C one.
_scanstring = getattr(json.decoder, "scanstring", None) or json.decoder.py_scanstring
# The JSON number grammar. Written out here because `json.decoder.NUMBER_RE` was
# a private detail and is gone in Python 3.14 — an import of it fails outright
# on a current interpreter.
_NUMBER_RE = re.compile(r"(-?(?:0|[1-9]\d*))(\.\d+)?([eE][-+]?\d+)?")


def slug(s):
    """The dish slug — a Python mirror of `slug` in site/js/slug.js, identical to
    the copy in tools/validate.py. Three copies is one too many, and this one
    exists because the id this tool writes must be the id the validator and the
    browser would have derived; importing validate.py to get it would drag its
    module-level file reads (renames.js, fx.json, addons.js) into a tool that
    needs none of them."""
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


class Node:
    """A parsed JSON object or array that remembers where its parts were.

    `json.loads` throws the offsets away, and the offsets are the whole job here:
    an insertion needs to know where *this* dish's `name` pair ended, in the
    file's own bytes, so the rest of the file can stay byte-identical.
    """

    def __init__(self, value, start, end, members=None, items=None):
        self.value = value      # the plain Python value, == json.loads' answer
        self.start = start      # offset of the opening brace/bracket
        self.end = end          # offset just past the closing one
        self.members = members  # {key: (Node|None, key_start, val_start, val_end)}
        self.items = items      # [Node|None] for arrays

    def child(self, key):
        m = (self.members or {}).get(key)
        return m[0] if m else None


class _Parser:
    """A minimal offset-tracking JSON reader. Deliberately not a validator: the
    text has already been through `json.loads` by the time this runs, so the only
    job left is to say where each piece was."""

    def __init__(self, text):
        self.s = text
        self.i = 0

    def _ws(self):
        while self.i < len(self.s) and self.s[self.i] in WS:
            self.i += 1

    def parse(self):
        self._ws()
        return self._value()

    def _value(self):
        c = self.s[self.i]
        if c == "{":
            return self._object()
        if c == "[":
            return self._array()
        if c == '"':
            start = self.i
            val, self.i = _scanstring(self.s, self.i + 1)
            return Node(val, start, self.i)
        for word, val in (("true", True), ("false", False), ("null", None)):
            if self.s.startswith(word, self.i):
                start = self.i
                self.i += len(word)
                return Node(val, start, self.i)
        m = _NUMBER_RE.match(self.s, self.i)
        integer, frac, exp = m.groups()
        start = self.i
        self.i = m.end()
        val = float(m.group()) if (frac or exp) else int(integer)
        return Node(val, start, self.i)

    def _object(self):
        start = self.i
        self.i += 1  # {
        members, value = {}, {}
        while True:
            self._ws()
            if self.s[self.i] == "}":
                self.i += 1
                break
            if self.s[self.i] == ",":
                self.i += 1
                continue
            key_start = self.i
            key, self.i = _scanstring(self.s, self.i + 1)
            self._ws()
            self.i += 1  # :
            self._ws()
            val_start = self.i
            node = self._value()
            members[key] = (node, key_start, val_start, self.i)
            value[key] = node.value
        return Node(value, start, self.i, members=members)

    def _array(self):
        start = self.i
        self.i += 1  # [
        items, value = [], []
        while True:
            self._ws()
            if self.s[self.i] == "]":
                self.i += 1
                break
            if self.s[self.i] == ",":
                self.i += 1
                continue
            node = self._value()
            items.append(node)
            value.append(node.value)
        return Node(value, start, self.i, items=items)


def each_dish(root):
    """Every menu item Node in the record, in file order. Mirrors `eachDish` in
    site/js/dish-id.js: sections hidden from the menu (`addOnsOnly`) are included,
    because a row nobody renders still answers to a link, a heart and a rating."""
    menu = root.child("menu")
    for section in (menu.items if menu and menu.items else []):
        items = section.child("items") if section.members else None
        for item in (items.items if items and items.items else []):
            if item.members is not None:
                yield item


def _insertion(text, item, dish_id):
    """Where to insert, and what — the two halves of a byte-exact edit.

    Returns (offset, inserted_text). The id goes immediately after `"name"` so a
    reader meets a dish's identity next to the thing they are about to change.
    """
    _, key_start, _, val_end = item.members["name"]
    line_start = text.rfind("\n", 0, key_start) + 1
    indent = text[line_start:key_start]

    # A dish written all on one line (some venues hand-compact their rows) gets
    # an inline pair rather than a stray newline in the middle of its object.
    if indent.strip():
        return val_end, f', "dishId": "{dish_id}"'

    j = val_end
    while j < len(text) and text[j] in WS:
        j += 1
    if j < len(text) and text[j] == ",":
        # The usual shape: another key follows, so slot a whole line in after the
        # comma the name pair already carries.
        return j + 1, f'\n{indent}"dishId": "{dish_id}",'
    # `name` was the last key — take the comma with us.
    return val_end, f',\n{indent}"dishId": "{dish_id}"'


def _seed_one(path):
    """Return (new_text, added, skipped) for one venue file. `added` is a list of
    (name, id); `skipped` is a list of complaints."""
    text = path.read_text(encoding="utf-8")
    root = _Parser(text).parse()
    # Cheap proof the offset parser agrees with the real one before its offsets
    # are trusted to edit the file.
    if root.value != json.loads(text):
        raise SystemExit(f"{path.name}: offset parse disagrees with json.loads — refusing to edit")

    edits, added, skipped = [], [], []
    for item in each_dish(root):
        # NEVER overwrite an existing id. An id that a tool can rewrite is not
        # immutable, and immutability is the entire reason this field is stored
        # rather than derived: the heart, rating, link and order line that point
        # at this dish all hold the old value.
        existing = item.value.get("dishId")
        if isinstance(existing, str) and existing:
            continue
        name = item.value.get("name")
        if not isinstance(name, str) or not name.strip():
            skipped.append(f"{path.name}: a menu item has no name — validate.py will say so")
            continue
        dish_id = slug(name)
        if not dish_id:
            skipped.append(f"{path.name}: {name!r} slugs to nothing — give it an explicit dishId by hand")
            continue
        edits.append(_insertion(text, item, dish_id))
        added.append((name, dish_id))

    # Rightmost first, so each earlier offset is still the offset it was measured at.
    for offset, ins in sorted(edits, key=lambda e: -e[0]):
        text = text[:offset] + ins + text[offset:]
    return text, added, skipped


def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__.split("\n")[0],
        epilog="Never overwrites an existing dishId: an id a tool can rewrite is not an identity.",
    )
    ap.add_argument("--check", action="store_true",
                    help="report what is missing and exit 1 if anything is; change nothing")
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="seed just this venue id (repeatable); default is every venue")
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="name every dish seeded, not just the per-file totals")
    args = ap.parse_args(argv)

    files = sorted(VENUES.glob("*.json"))
    if args.only:
        wanted = set(args.only)
        files = [f for f in files if f.stem in wanted]
        missing = wanted - {f.stem for f in files}
        if missing:
            print(f"error: no such venue file(s): {', '.join(sorted(missing))}", file=sys.stderr)
            return 1

    total, touched, complaints = 0, 0, []
    for path in files:
        new_text, added, skipped = _seed_one(path)
        complaints += skipped
        if not added:
            continue
        touched += 1
        total += len(added)
        print(f"  {path.stem}: {len(added)} dish(es) {'need' if args.check else 'seeded'}")
        if args.verbose:
            for name, dish_id in added:
                print(f"      {name}  →  {dish_id}")
        if not args.check:
            path.write_text(new_text, encoding="utf-8")

    for c in complaints:
        print(f"warning: {c}")

    if args.check:
        if total:
            print(f"\n✗ {total} dish(es) across {touched} file(s) have no \"dishId\". "
                  "Run tools/seed_dish_ids.py.")
            return 1
        print(f"✓ every dish in {len(files)} file(s) carries its own \"dishId\".")
        return 0

    print(f"\n✓ seeded {total} dish(es) across {touched} file(s) "
          f"({len(files)} scanned). Run tools/validate.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
