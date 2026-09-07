#!/usr/bin/env python3
"""Tag an add-on option with what its own name says it IS.

ROADMAP 14h, owner-ruled 2026-08-22 (ADR 0092). Configuring a dish ran the
picker's absence-shaped line — "We can't say whether Bacon is vegetarian, so we
can't say this still is." — on options whose own name settles the question. The
ruling was to CLOSE THE DATA GAP first and collapse only the genuine residue,
so this is the (a) half: a re-runnable sweep, modelled on tag_allergens.py,
never a hand pass across the venues.

TWO AXES, NEVER ONE IMPLEMENTED IN TERMS OF THE OTHER (ADR 0095, owner-ruled
2026-09-07). `has-meat` and `has-fish` are DIETARY markers and sit outside the
`contains-` namespace on purpose. Meat is not an allergen; a `contains-meat`
would have walked straight into four allergen tables (the chips in menu.js and
recipe.js, the avoid list in settings.js, the report filter in report.js) as one
nobody can filter on. What they do is contradict `v` and `vg` in
site/js/addons.js `CONTRADICTS`, which turns the picker's line into a fact:
"Bacon is meat, so this is no longer vegetarian."

Fish is BOTH. It breaks a vegetarian claim (the dietary axis, `has-fish`) and it
is a declarable allergen in New Zealand (`contains-fish`). So an option naming a
finfish gains BOTH tags, each read independently off the option's own NAME —
neither is derived from the other, and deleting either rule must leave the other
firing. Until 2026-09-07 only the dietary half was written, so a reader who had
ticked "avoid Fish" in Settings and added Salmon to a fish-free dish was told
NOTHING: `site/js/addons.js` builds its allergen union off the `contains-`
prefix, and `has-fish` carries nothing into it.

EVERY OTHER ALLERGEN COMES FROM THE DISH RULES (2026-09-07, Theme 5 item 060,
owner-ruled: fix the hedge first, then sweep once). Until then this tool wrote
no `contains-*` but fish, so a hummus extra was sesame and a Nutella extra was
nuts and NOBODY WAS TOLD — two live misses in the corpus, one of them peanuts'
neighbour. The literal reading of the owner's ruling on ADR 0095 is what is
implemented: an add-on has its own allergen tags the same way a dish does, so
tag_allergens.py's rule set is looked up and run over the option's NAME.

WHY THAT COULD NOT BE DONE FIRST. A naive reuse produced 8 candidates of which
THREE were the venue's own gluten HEDGE — "No gluten added bun" →
`contains-gluten`, the one direction a safety sweep may never move. The hedge
guard lives in tag_allergens.py (`hedge_before`, `first_unhedged`) and is
shared, not reimplemented; with it on, the same sweep produces exactly the two
real misses and refuses the three hedges. The narrowing is deliberately NOT an
item-level veto: an option named "No gluten added bun with smoked salmon" keeps
its salmon.

`contains-fish` is the one dish rule this sweep does NOT borrow, because it
already has its own rule below. That is ADR 0095's decision standing, not an
oversight: only the STATED species list is shared, so an option named
"Worcestershire" is not given a fish allergen the way a dish is. Measured
2026-09-07: ZERO options in the corpus would gain `contains-fish` from the
DERIVED fish rules, so the carve-out costs nothing today and is filed rather
than reopened here.

THE ONE-WAY RULE STILL BINDS, and it is why this tool is small. Inference may
only ever state what IS present. It must never add `gf`, `df`, `v` or `vg` to
an option, and never remove a tag. So:

  • Bacon, Salami, Prosciutto, "Extra meat"   → `has-meat`. The name says so.
  • Salmon, Kingfish, Anchovies               → `has-fish` AND `contains-fish`.
    The name says so, twice over: it is not vegetarian and it is an allergen.
  • Spinach, Tomatoes, Rocket, Aloe Vera      → NOTHING. "Spinach is vegetarian"
    is a claim of ABSENCE (no meat, no fish, no stock) and this tool may not
    make it, however obvious it looks. They fall to the (b) half — one quiet
    collapsed sentence in the picker.
  • "No added gluten bun", "Oat", "Coconut"   → NOTHING, and REVIEWED. The
    option's own name makes an absence claim, and promoting a venue's hedge
    ("no added gluten" is deliberately weaker than "gluten free") into a safety
    tag is the owner's call, never a sweep's.
  • Gravy, Patty, Port jus, "Dry rubbed"      → NOTHING, and REVIEWED. Meat or
    not is a judgement the name does not settle — and the corpus proves it: it
    already carries one `Gravy` tagged `v` and two tagged nothing at all.

WHAT IT DELIBERATELY REFUSES TO DECIDE is therefore most of the gap, and the
report says so out loud rather than leaving it looking finished. A tool that
quietly guesses is worse than one that reports a gap.

WHAT THE EXIT CODE MEANS, same as tag_allergens.py: a dry run always exits 0 —
reporting the residue is its whole job. An `--apply` run exits 1 if a record it
wanted to write could not be written, because a sweep that silently skipped a
venue is how the gap it closes was made.

    python3 tools/tag_addon_options.py            # report (default)
    python3 tools/tag_addon_options.py --gaps     # every option still silent
    python3 tools/tag_addon_options.py --stats    # the 14h coverage numbers
    python3 tools/tag_addon_options.py --apply    # write them
"""

import argparse
import json
import pathlib
import re
import sys

# The raw-text scanner is tag_allergens.py's, imported rather than copied. Two
# implementations of "find this object's tags array without reformatting the
# file" would read correct in every diff and drift on the first fix to either.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from tag_allergens import (  # noqa: E402
    CONTRADICTED_BY as DISH_CONTRADICTED_BY,
    MULTILINE_TAGS,
    RULES as ALLERGEN_RULES,
    Unpatchable,
    _elements,
    _member,
    _skip_ws,
    first_unhedged,
)

DATA = pathlib.Path("site/data/restaurants")

# An existing tag on the OPTION that makes a match untrustworthy. Curation beats
# a pattern, exactly as in tag_allergens.py: an option the venue itself calls
# vegetarian or vegan is never given meat or fish, whatever its name looks like.
# ("Extra falafel" is tagged `v`; a "Vegan sausage" would be caught here.)
#
# LOOKED UP, NOT RETYPED — same reasoning as FINFISH below, and the same fault
# waiting at the end of a copy. The dish table is already a strict superset: it
# carries `has-meat`/`has-fish` (put there so validate.py can check it against
# `CONTRADICTS` in site/js/addons.js) plus the guards this sweep now needs for
# every OTHER allergen — `contains-gluten: {gf}` is what stops a "GF bun" option
# being told it contains gluten. A local copy would have had to grow the same
# five entries by hand on the day the sweep widened.
CONTRADICTED_BY = dict(DISH_CONTRADICTED_BY)

# ONE list of finfish for the whole repo, looked up out of tag_allergens.py's
# STATED fish rule rather than retyped here.
#
# 🔎 The two lists HAD already drifted, which is why this is a lookup and not a
# tidy-up. Measured 2026-09-07: the copy that lived here carried 13 species
# where the dish sweep carries thirty-odd, so `Kingfish`, `Gurnard`, `Eel`,
# `Barramundi`, `Anchovies` (it had only `anchovy`) and two dozen more were fish
# on a dish and not fish on an add-on. Nothing would ever have reported that —
# both sweeps were green, and each was right about its own list.
#
# The species list is the only part borrowed. The exclusion below is this
# tool's own, because an OPTION is named the way an option is named ("Vegan
# fish-free sauce") and a dish is not.
FINFISH = next(
    pat for tag, tier, why, pat, exc in ALLERGEN_RULES
    if tag == "contains-fish" and tier == "STATED"
)
NOT_FISH = r"\b(vegan|vegetarian|veggie|plant[\s-]?based|mock|fish[\s-]?free)\b"

# (tag, basis, pattern, exclude). Every exclusion below is a specific, checkable
# claim about a specific false positive — never a broad word that happens to
# help. Chicken salt is seasoning, not chicken; a beef tomato is a tomato.
RULES = [
    ("has-meat", "names a cured or preserved meat",
     r"\b(bacon|hams?|prosciutto|pancetta|salami|pepperoni|chorizo|pastrami|"
     r"speck|kransky)\b",
     r"\b(vegan|vegetarian|veggie|plant[\s-]?based|mock|facon|hamburger)\b"),
    ("has-meat", "names the animal it is made of",
     r"\b(chicken|beef|steak|pork|lamb|mutton|venison|duck|turkey|brisket|"
     r"sausages?|meatballs?|mince|salumi)\b",
     r"\b(vegan|vegetarian|veggie|plant[\s-]?based|mock|chicken\s+salt|"
     r"beef\s+tomato(es)?)\b"),
    ("has-meat", "the option's own name is 'meat'", r"\bmeats?\b",
     r"\b(vegan|vegetarian|veggie|plant[\s-]?based|mock|meat[\s-]?free|"
     r"no\s+meat|meat\s+free)\b"),
    # TWO RULES, ONE PIECE OF EVIDENCE, TWO AXES (ADR 0095). Both read the
    # option's own NAME; neither reads the other's tag. Written apart on purpose
    # — collapsing them into one entry that emits a pair would make the allergen
    # a consequence of the dietary marker, which is exactly what item 010 and
    # the owner's ruling forbid, and would make the fish allergen the only one in
    # the app that cannot exist without a dietary claim beside it.
    ("has-fish", "names a finfish", FINFISH, NOT_FISH),
    ("contains-fish", "names a finfish, and fish is a declarable allergen in NZ",
     FINFISH, NOT_FISH),
]

# Every OTHER allergen, read off the option's own name by the DISH rules — the
# literal reading of "an add-on should have its own allergen and dietary tags
# the same way a dish does" (owner, 2026-09-07). Compiled here rather than
# retyped, so a rule added for dishes reaches add-ons on the same commit.
#
# `contains-fish` is dropped because this tool already carries its own paired
# rule above; borrowing the dish version as well would write the tag twice and,
# worse, would make the ADR 0095 breaker that DELETES the local rule pass with
# the bug back — the dietary/allergen pair would silently be carried by one
# source again. It also keeps ADR 0095's standing decision that only the STATED
# species list crosses over.
#
# TIERS ARE NOT REPORTED HERE. tag_allergens.py separates STATED from DERIVED so
# a dish sweep's count is auditable; an option name is three words long and the
# distinction buys nothing at this size. The `why` string still names the rule.
ALLERGEN_SWEEP = [
    (tag, why, re.compile(pat, re.I), re.compile(exc, re.I) if exc else None)
    for tag, tier, why, pat, exc in ALLERGEN_RULES
    if tag != "contains-fish"
]

# Options whose name reaches for a decision this tool may not take. Reported for
# a person, never tagged. `why` is printed as-is, so it has to say what to do.
REVIEW = [
    ("the name makes an ABSENCE claim; 'no added gluten' is deliberately weaker "
     "than 'gluten free' and only the owner may promote it",
     r"\b(gluten[\s-]?free|no\s+(added\s+)?gluten|dairy[\s-]?free|vegan)\b"),
    # Anchored to the WHOLE name on purpose: "Oat" and "Coconut" in a milk group
    # are milk alternatives; "Coconut Jelly" is a bubble-tea topping and reading
    # a dairy-free claim into it would be an invention. A bare one-word name is
    # what separates them, and it is checkable.
    ("names a milk alternative — 'dairy free' is the owner's call, not a sweep's",
     r"^(oat|almond|coconut|soy|soya|rice)$"),
    ("meat or not is a judgement this name does not settle — the corpus already "
     "carries the same option name tagged both ways",
     r"\b(gravy|patty|patties|jus|broth|stock|dripping|dry\s+rubbed)\b"),
]


def _matches(pattern, exclude, text):
    if not re.search(pattern, text, re.I):
        return False
    return not (exclude and re.search(exclude, text, re.I))


def options_of(record):
    """(group, option) for every add-on option in this record, in file order."""
    for group in record.get("addOnGroups", []) or []:
        if not isinstance(group, dict):
            continue
        for option in group.get("options", []) or []:
            if isinstance(option, dict):
                yield group, option


def audit(record):
    """Yield (group, option, tag, why) for every tag this record's add-on
    options are missing. Idempotent by construction: a tag already present is
    never yielded, so a second run after `--apply` reports nothing."""
    for group, option in options_of(record):
        name = option.get("name") or ""
        tags = set(option.get("tags") or [])
        for tag, why, pattern, exclude in RULES:
            if tag in tags:
                continue
            if tags & CONTRADICTED_BY.get(tag, set()):
                continue  # the venue called it vegetarian; that beats our regex
            if _matches(pattern, exclude, name):
                yield group, option, tag, why
        # …then every other allergen, off the same name, through the DISH rules.
        # `written` is local to this option and is what stops two rules for one
        # allergen yielding it twice — the dish sweep gets the same guarantee
        # from `tags.add(tag)` in its own loop.
        written = set(tags)
        for tag, why, pattern, exclude in ALLERGEN_SWEEP:
            if tag in written:
                continue
            if tags & CONTRADICTED_BY.get(tag, set()):
                continue
            if exclude and exclude.search(name):
                continue
            # `first_unhedged`, not `pattern.search`: "No gluten added bun" is
            # the VENUE SAYING THE ALLERGEN IS ABSENT, and tagging the
            # gluten-free alternative as containing gluten is the one direction
            # a safety sweep may never move. The guard cancels only the match
            # the negation precedes, so an option named "No gluten added bun
            # with smoked salmon" would still keep its salmon.
            match = first_unhedged(tag, pattern, name)
            if match:
                written.add(tag)
                yield group, option, tag, f"{why} ({match.group(0).lower()})"


def review(record):
    """Yield (group, option, why) for options a PERSON has to decide about.

    Only ever options this sweep left with nothing at all — a review note on an
    option we just tagged, or one the venue already described, is noise.
    """
    wanted = {id(o) for _, o, _, _ in audit(record)}
    for group, option in options_of(record):
        if option.get("tags") or id(option) in wanted:
            continue
        name = option.get("name") or ""
        for why, pattern in REVIEW:
            if re.search(pattern, name, re.I):
                yield group, option, why
                break


def option_tag_spans(raw):
    """(start, end) of every add-on option's own `tags` array, in file order.

    `None` for an option carrying no literal `tags` key — validate.py requires
    one, so that is a file we do not write to rather than one we repair.
    """
    groups = _member(raw, _skip_ws(raw, 0), "addOnGroups")
    if groups is None:
        return []
    spans = []
    for g_start, _ in _elements(raw, groups[0]):
        opts = _member(raw, g_start, "options")
        if opts is None:
            continue
        for o_start, _ in _elements(raw, opts[0]):
            spans.append(_member(raw, o_start, "tags"))
    return spans


def patch_tags(raw, options, additions):
    """Rewrite only the option tags arrays that gained a tag, keeping each one's
    existing layout. `additions` is {flat option index: [tag, …]}.

    Deliberately a text patch, not a JSON round-trip: 7 of the 55 records do not
    survive `json.dumps(indent=2)` byte-for-byte, and a sweep that reformats a
    file buries its own one-line change in a thousand-line diff.
    """
    spans = option_tag_spans(raw)
    if len(spans) != len(options):
        # The scanner and json.loads disagree about the file's shape, so one of
        # them is wrong. Never write on that.
        raise Unpatchable(f"scanned {len(spans)} options, parsed {len(options)}")
    absent = [i for i in additions if spans[i] is None]
    if absent:
        raise Unpatchable(
            "no literal tags array on " + ", ".join(repr(options[i]["name"]) for i in absent)
        )
    multiline = bool(MULTILINE_TAGS.search(raw))
    out, last = [], 0
    for idx in sorted(additions):
        start, end = spans[idx]
        tags = list(options[idx].get("tags") or []) + additions[idx]
        existing = raw[start:end]
        line_start = raw.rfind("\n", 0, start) + 1
        indent = re.match(r"[ \t]*", raw[line_start:]).group(0)
        # `MULTILINE_TAGS` reads the WHOLE file, and in a record whose dishes are
        # laid out one key per line but whose add-on options are written one per
        # line — bambina-pizzeria is exactly this — it says "multiline" and
        # explodes `{ "name": "Pepperoni", "tags": [] }` across four lines. The
        # option's own line settles it: if the object opened on this line, the
        # array stays on it.
        inline_object = "{" in raw[line_start:start]
        if "\n" in existing or (existing == "[]" and multiline and not inline_object):
            inner = f",\n{indent}  ".join(json.dumps(t) for t in tags)
            replacement = f"[\n{indent}  {inner}\n{indent}]"
        else:
            replacement = "[" + ", ".join(json.dumps(t) for t in tags) + "]"
        out.append(raw[last:start])
        out.append(replacement)
        last = end
    out.append(raw[last:])
    return "".join(out)


def coverage(record):
    """(options, tagged) for this record — the 14h numbers, per venue."""
    opts = list(options_of(record))
    return len(opts), sum(1 for _, o in opts if o.get("tags"))


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--apply", action="store_true", help="write the tags (default: report only)")
    ap.add_argument("--gaps", action="store_true", help="list every option still stating nothing")
    ap.add_argument("--stats", action="store_true", help="coverage counts only")
    args = ap.parse_args()

    total = 0
    by_tag = {}
    reviews = []
    gaps = []
    options_seen = tagged_seen = 0
    # Options gaining their FIRST tag — NOT the tag count. "Cheese & beef gravy"
    # was already tagged `contains-dairy` and gains `has-meat`, so adding 18 tags
    # moves coverage by 17. Reporting the tag count as the coverage delta made
    # the tool predict 82/161 and then measure 81/161 on the very next run.
    newly_tagged = 0
    unwritable = []

    for path in sorted(DATA.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        opts, tagged = coverage(record)
        if opts == 0:
            continue
        options_seen += opts
        tagged_seen += tagged
        rid = record.get("id", path.stem)

        flat = [o for _, o in options_of(record)]
        # Keyed on IDENTITY, never on the dict's value: gong-cha lists a "Pearl"
        # option with the same name, price and tags in six different groups, so
        # `flat.index(option)` would resolve every one of them to the first and
        # patch the same span six times.
        at = {id(o): i for i, o in enumerate(flat)}
        additions = {}
        for group, option, tag, why in audit(record):
            additions.setdefault(at[id(option)], []).append(tag)
            total += 1
            by_tag[tag] = by_tag.get(tag, 0) + 1
            if not args.stats:
                print(f"{rid:28} {group.get('id',''):22} {option['name']:26} + {tag}  ({why})")

        for group, option, why in review(record):
            reviews.append((rid, group.get("id", ""), option["name"], why))
        gained = {id(flat[i]) for i in additions}
        newly_tagged += sum(1 for i in additions if not flat[i].get("tags"))
        for group, option in options_of(record):
            if not option.get("tags") and id(option) not in gained:
                gaps.append((rid, group.get("id", ""), option["name"]))

        if args.apply and additions:
            raw = path.read_text(encoding="utf-8")
            try:
                path.write_text(patch_tags(raw, flat, additions), encoding="utf-8")
            except Unpatchable as e:
                unwritable.append((rid, str(e)))

    if reviews and not args.stats:
        print("\nFOR A PERSON TO DECIDE — never tagged by this tool:")
        for rid, gid, name, why in reviews:
            print(f"  {rid:28} {gid:22} {name:26} {why}")

    if args.gaps:
        print(f"\nSTILL STATING NOTHING — {len(gaps)} options:")
        for rid, gid, name in gaps:
            print(f"  {rid:28} {gid:22} {name}")

    after = tagged_seen + newly_tagged
    pct = (lambda n: n * 100 // options_seen if options_seen else 0)
    print(
        f"\n{total} tags to add ({', '.join(f'{v} {k}' for k, v in sorted(by_tag.items())) or 'none'}). "
        f"Coverage {tagged_seen}/{options_seen} ({pct(tagged_seen)}%)"
        + (f" → {after}/{options_seen} ({pct(after)}%)" if newly_tagged else "")
    )
    print(
        f"{len(gaps)} options state nothing and this tool refuses to guess them "
        f"({len(reviews)} of those are flagged for a person). They are the residue "
        f"the picker collapses into one sentence (ADR 0092)."
    )

    if unwritable:
        for rid, why in unwritable:
            print(f"COULD NOT WRITE {rid}: {why}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
