#!/usr/bin/env python3
"""Enforce the no-JS fallback lockstep: `site/index.html` vs `site/data/index.json`.

CLAUDE.md has carried this rule since the repo's working conventions were
written:

    Keep the no-JS fallback `<ul>` in `site/index.html` in step with
    `site/data/index.json` (it's a hand-maintained mirror for fail-soft).

Nothing has ever checked it. The home screen is drawn by `app.js`; the `<ul>`
is what a reader sees when the JavaScript has not run — no-JS, a slow first
paint, or `app.js` throwing on import, which has actually happened (see
`tools/boot_check.mjs`, and the 2026-08-16 `venueTimezone` import that made the
home screen silently serve this list while 570 unit tests stayed green). A
fallback that has drifted is worse than no fallback: it fails *quietly*, and it
fails on exactly the day something else is already broken.

🔎 WHY THIS TOOL EXISTS RATHER THAN A ONE-LINE grep — and it is not the reason
you would guess. `docs/ROADMAP.md` recorded, as a measured finding, that the
fallback was "**35 venues behind** `site/data/index.json`". It is not, and on
2026-08-16 it never had been: the list holds all 55, in `index.json` order.

The "35" came from counting `restaurant.html?id=` hrefs in the markup and
comparing that to the 55 ids. But **a stub venue is deliberately rendered
without a link** — it is a `<div class="card-body">` carrying a "Menu coming
soon" chip, because there is no menu to open. So the href count measures
"venues with a menu", not "venues in the list", and the two read identically
in prose. 55 − 20 linked = 35, and a real-looking defect appears out of a
correct file.

That is the same class of error the roadmap warns about one item earlier —
*"a count derived from 'records with more than one branch' answers a different
question from 'records that are a chain', and reads identically in prose"* —
and it caught a second reader the day this tool was written, who reproduced the
35 before noticing the stubs. So the check below deliberately asserts the
LINK RULE as well as membership: encoding *why* a card has no href is what
stops the next person re-measuring it wrong.

Checks, in order:

1. **Membership** — every id in `index.json` has exactly one card, and every
   card matches a record. No extras, no strays.
2. **Order** — the cards are in `index.json` order. `index.json` *is* the
   display order, so a fallback in a different order shows a different home
   screen than the app does.
3. **Name** — each card's `<h3 class="card-name">` matches the record's `name`.
4. **Link state matches status** — a record whose `status` is `stub` must be
   rendered WITHOUT a link (nothing to open); every other record must be
   rendered WITH `href="restaurant.html?id=<id>"`. This is the rule the "35"
   measurement did not know about.

    python3 tools/check_fallback.py           # report and exit non-zero on drift
    python3 tools/check_fallback.py -v        # list every card as it is read

Exit 0 = the mirror is in step; 1 = it has drifted. Stdlib only, no build step.
"""

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_JSON = ROOT / "site" / "data" / "index.json"
INDEX_HTML = ROOT / "site" / "index.html"
RESTAURANTS = ROOT / "site" / "data" / "restaurants"

LIST_OPEN = '<ul id="restaurant-list"'
CARD_RE = re.compile(r"<li class=\"card[^\"]*\".*?</li>", re.S)
NAME_RE = re.compile(r"<h3 class=\"card-name\">(.*?)</h3>", re.S)
HREF_RE = re.compile(r"href=\"restaurant\.html\?id=([^\"]+)\"")


def fallback_cards(markup):
    """The `<li>` cards inside the fallback list, in document order.

    Sliced by string index rather than parsed: this repo ships no dependencies
    (ADR 0001), and the markup is hand-maintained and stable. A regex over the
    whole file would also match cards in any other list that grows later.
    """
    try:
        start = markup.index(LIST_OPEN)
    except ValueError:
        return None
    end = markup.index("</ul>", start)
    return CARD_RE.findall(markup[start:end])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="list every card as it is read")
    args = ap.parse_args()

    ids = json.loads(INDEX_JSON.read_text())
    records = {}
    for rid in ids:
        path = RESTAURANTS / f"{rid}.json"
        if not path.exists():
            print(f"✗ {rid}: in index.json, no site/data/restaurants/{rid}.json")
            return 1
        records[rid] = json.loads(path.read_text())

    cards = fallback_cards(INDEX_HTML.read_text())
    if cards is None:
        print(f"✗ no `{LIST_OPEN}…>` list found in site/index.html — "
              "the fallback has been renamed or removed; update this tool with it")
        return 1

    problems = []

    if len(cards) != len(ids):
        problems.append(
            f"count: {len(cards)} card(s) in the fallback, {len(ids)} id(s) in "
            f"index.json"
        )

    # Walk the two lists in parallel — order is part of the contract, so a
    # positional comparison says WHERE they diverge, which a set difference
    # cannot.
    for pos, rid in enumerate(ids):
        rec = records[rid]
        want_name = rec.get("name", "")
        is_stub = rec.get("status") == "stub"

        if pos >= len(cards):
            problems.append(f"[{pos}] {rid} ({want_name}): missing from the fallback")
            continue

        card = cards[pos]
        got = NAME_RE.search(card)
        got_name = html.unescape(got.group(1)).strip() if got else None
        linked = HREF_RE.search(card)

        if got_name != want_name:
            problems.append(
                f"[{pos}] {rid}: fallback says {got_name!r}, record says {want_name!r}"
            )
        if linked and linked.group(1) != rid:
            problems.append(
                f"[{pos}] {rid}: card links to {linked.group(1)!r}"
            )

        # The rule the href-count measurement did not know about.
        if is_stub and linked:
            problems.append(
                f"[{pos}] {rid}: status is `stub` but the card is a link — a stub "
                "has no menu to open, so it renders as a 'Menu coming soon' card"
            )
        if not is_stub and not linked:
            problems.append(
                f"[{pos}] {rid}: status is {rec.get('status')!r} but the card has "
                "no link — a reader with no JavaScript cannot reach this menu"
            )

        if args.verbose:
            mark = "·" if is_stub else "→"
            print(f"  {mark} [{pos:>2}] {rid}: {got_name}")

    for pos in range(len(ids), len(cards)):
        got = NAME_RE.search(cards[pos])
        got_name = html.unescape(got.group(1)).strip() if got else "?"
        problems.append(f"[{pos}] {got_name!r}: card in the fallback with no id in index.json")

    if problems:
        print(f"✗ the no-JS fallback has drifted from index.json — {len(problems)} finding(s):")
        for p in problems:
            print(f"  {p}")
        print("\nFix site/index.html's `restaurant-list` so it mirrors index.json:")
        print("  same ids, same order, same names, and a link on everything that")
        print("  is not a `stub`. It is hand-maintained on purpose — it is the")
        print("  screen a reader gets when app.js does not run.")
        return 1

    linked = sum(1 for r in records.values() if r.get("status") != "stub")
    print(f"✓ no-JS fallback in step — {len(ids)} venue(s), "
          f"{linked} linked, {len(ids) - linked} stub(s) unlinked, order matches.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
