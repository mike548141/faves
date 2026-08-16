#!/usr/bin/env python3
"""Every decision record is listed in the decisions index, and every number is used once.

WHY THIS EXISTS. `docs/decisions/README.md` is not a table of contents anyone
reads for pleasure — it is the **allocator**. The rule in that file is "allocate
NNNN at merge, never in a worktree", and the way you allocate is by reading the
index. So an ADR that exists on disk but is missing from the index is invisible
to the next session, which then reuses its number.

That is not hypothetical. A duplicate `0025` already survived in this repo for
exactly that reason. On 2026-08-16 an audit found **seven** unindexed records —
0023, 0042, 0043, 0044, 0045 (a contiguous four-wide hole, the shape most likely
to cause a reuse), plus 0048 and 0049 which a closing session had flagged and
left for a session that closed without doing it.

The index was a guard that had silently failed seven times. A convention nobody
can forget beats a convention everybody is reminded of, so this makes it a gate.

Checks, in the order they fail:
  1. every `docs/decisions/NNNN-*.md` is referenced from `README.md`
  2. no two records share a number
  3. no reference in `README.md` points at a file that is not there

Deliberately NOT checked: whether the index *entry* is any good. A one-line
pointer that misdescribes its record is a real problem and no script can see it.

    python3 tools/check_decisions.py        # exit 1 on any finding
    python3 tools/check_decisions.py -v     # also list what it matched
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECISIONS = ROOT / "docs" / "decisions"
INDEX = DECISIONS / "README.md"

# A record is NNNN-slug.md. README.md and anything else is not one.
RECORD_RE = re.compile(r"^(\d{4})-.+\.md$")

# The one duplicate that already exists, and why it is tolerated rather than
# fixed. `0025` was allocated twice — once for allergen inference, once for the
# settings redesign — precisely because the index was incomplete, which is the
# fault this tool now prevents. Renumbering either one today would break every
# inbound reference in the code comments, the other ADRs and the session log,
# to correct a record whose substance is right; the house rule is to supersede
# an accepted ADR, never to edit it, and a renumber is an edit.
#
# So it is grandfathered, LOUDLY: the tool still reports it on every clean run,
# because a silent exemption is how the original fault survived. It is a
# statement of history, not a licence — a NEW duplicate fails.
KNOWN_DUPLICATE = "0025"


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Check every ADR is indexed in docs/decisions/README.md and every number is unique.",
        epilog="The index is what a future session reads to allocate the next number.",
    )
    ap.add_argument("-v", "--verbose", action="store_true", help="List every record checked")
    args = ap.parse_args(argv)

    if not INDEX.exists():
        print(f"✗ {INDEX.relative_to(ROOT)} is missing — there is no index to check against.")
        return 1

    index_text = INDEX.read_text(encoding="utf-8")
    records = sorted(p for p in DECISIONS.glob("*.md") if RECORD_RE.match(p.name))

    problems = []

    unindexed = [p.name for p in records if p.name not in index_text]
    for name in unindexed:
        problems.append(
            f"{name} is not listed in docs/decisions/README.md — "
            f"invisible to whoever allocates the next number."
        )

    by_number = defaultdict(list)
    for p in records:
        by_number[RECORD_RE.match(p.name).group(1)].append(p.name)
    grandfathered = []
    for number, names in sorted(by_number.items()):
        if len(names) < 2:
            continue
        if number == KNOWN_DUPLICATE:
            grandfathered.append(f"{number} ({', '.join(sorted(names))})")
            continue
        problems.append(
            f"number {number} is used by {len(names)} records ({', '.join(sorted(names))}) — "
            f"supersede one and renumber it."
        )

    # A link in the index to a file nobody wrote (or that was renamed) sends the
    # reader nowhere. linkscan catches this for markdown links; this catches a
    # bare filename mention too, which is how several entries are written.
    on_disk = {p.name for p in records}
    for cited in sorted(set(re.findall(r"\(?(\d{4}-[a-z0-9-]+\.md)\)?", index_text))):
        if cited not in on_disk:
            problems.append(f"docs/decisions/README.md cites {cited}, which is not in docs/decisions/.")

    if problems:
        print(f"✗ decisions index: {len(problems)} finding(s).")
        for p in problems:
            print(f"  {p}")
        print("\n  Fix by adding the missing one-line pointer to docs/decisions/README.md")
        print("  (append it; the list is in the order records were indexed, not numeric order).")
        return 1

    if args.verbose:
        for p in records:
            print(f"  ✓ {p.name}")
    print(f"✓ decisions index clean — {len(records)} record(s), all indexed.")
    for g in grandfathered:
        print(f"  ⚠ grandfathered duplicate: {g} — predates this check; a NEW duplicate fails.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
