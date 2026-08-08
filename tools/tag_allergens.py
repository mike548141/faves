#!/usr/bin/env python3
"""Sweep venue data for allergen tags that should be there and aren't.

Why this exists as a *tool* rather than a one-off edit: the gap it closes was
created by hand-tagging venue by venue over many sessions, which is exactly how
"Battered Mussel is tagged but Prawn Cutlet isn't" happens. Re-run it after any
menu transcription and it reports what a human missed.

Two tiers, and the difference matters (ADR 0024):

  STATED   the menu itself names the ingredient — "Prawn Cutlet", "…with Oyster
           Sauce". Tagging is *reading the menu*, not guessing, and needs no
           licence beyond the existing rule.

  DERIVED  the menu names a dish whose defining ingredient it doesn't spell
           out — "Satay" (peanut), an unspecified "seafood" mix, "laksa"
           (belacan/dried shrimp). Enumerated below, never open-ended, because
           each one is a judgement the owner ratified rather than a fact a
           venue supplied.

Never removes a tag and never touches anything else in the record.

    python3 tools/tag_allergens.py            # report only
    python3 tools/tag_allergens.py --apply    # write the tags
"""

import argparse
import json
import pathlib
import re

DATA = pathlib.Path("site/data/restaurants")

# --- STATED: the menu names a crustacean or mollusc ------------------------
# "oyster" covers oyster *sauce*, which is oyster extract — a real and widely
# missed shellfish exposure. Checked against the data for oyster-mushroom style
# false positives; there are none.
SHELLFISH_STATED = re.compile(
    r"\b(prawns?|shrimps?|squid|calamari|scallops?|mussels?|oysters?|paua|crab|"
    r"kanikama|surimi|lobster|crayfish|clams?)\b",
    re.I,
)

# --- DERIVED: enumerated dish conventions (ADR 0024) -----------------------
SATAY = re.compile(r"\bsatay\b", re.I)
SEAFOOD = re.compile(r"\bseafood\b", re.I)
LAKSA = re.compile(r"\blaksa\b", re.I)

# A dish the venue itself calls vegetarian or vegan can't be carrying belacan or
# a seafood mix — its own tag is the better evidence, so the derived rules that
# rest on an unstated ingredient stand down. (Satay is unaffected: peanut sauce
# is entirely compatible with a vegetarian dish, and "Vegetarian Satay" is
# exactly the dish someone would wrongly assume is safe.)
VEG = {"v", "vg"}

# A paid optional extra — "Add chicken, halloumi, prawns or beef +$7", "Surf +
# turf: add prawns +$7". The dish as served contains none of it, so tagging it
# would warn a shellfish-allergic reader off a plain garden salad. Both signals
# are required (an "add" AND a "+$" price) so a description that merely uses the
# word "added" still counts as an ingredient.
ADD_ON = re.compile(r"\badd(?:s|ed|ing)?\b", re.I)
ADD_ON_PRICE = re.compile(r"\+\s*\$")


def ingredient_text(item):
    """The dish's name + the parts of its description that describe what you
    actually get — optional paid extras stripped out."""
    kept = [item["name"]]
    for clause in re.split(r"[.;]", item.get("desc") or ""):
        if ADD_ON.search(clause) and ADD_ON_PRICE.search(clause):
            continue
        kept.append(clause)
    return " ".join(kept)


def audit(record):
    """Yield (item, tag, tier, why) for every tag this record is missing."""
    for section in record.get("menu", []):
        for item in section["items"]:
            text = ingredient_text(item)
            tags = set(item.get("tags", []))
            veg = bool(tags & VEG)

            if "contains-shellfish" not in tags:
                hit = SHELLFISH_STATED.search(text)
                if hit:
                    yield item, "contains-shellfish", "STATED", f"names {hit.group(0).lower()}"
                elif not veg and SEAFOOD.search(text):
                    yield item, "contains-shellfish", "DERIVED", "unspecified seafood mix"
                elif not veg and LAKSA.search(text):
                    yield item, "contains-shellfish", "DERIVED", "laksa paste (belacan)"

            if "contains-peanuts" not in tags and SATAY.search(text):
                yield item, "contains-peanuts", "DERIVED", "satay sauce is peanut sauce"


# The data files are hand-maintained in two different styles — one item per line
# in some records, fully expanded in others — so a json.dumps() round-trip would
# reformat whole files and bury 100 tag additions in a 3,400-line diff. Patch the
# tags arrays in the raw text instead, and leave every other byte alone.
TAGS_ARRAY = re.compile(r'"tags"\s*:\s*\[[^\]]*\]')


def patch_tags(raw, items, additions):
    """Rewrite only the tags arrays that gained a tag, preserving each one's
    existing layout. `additions` maps an item's index to the tags to append."""
    spans = list(TAGS_ARRAY.finditer(raw))
    if len(spans) != len(items):
        raise SystemExit(
            f"refusing to patch: found {len(spans)} tags arrays for {len(items)} items"
        )
    out, last = [], 0
    for idx, span in enumerate(spans):
        if idx not in additions:
            continue
        tags = list(items[idx].get("tags", [])) + additions[idx]
        body = ", ".join(json.dumps(t) for t in tags)
        if "\n" in span.group(0):
            # Expanded style: match the indent of the line the array opens on.
            indent = " " * (span.start() - raw.rfind("\n", 0, span.start()) - 1)
            inner = f",\n{indent}  ".join(json.dumps(t) for t in tags)
            replacement = f'"tags": [\n{indent}  {inner}\n{indent}]'
        else:
            replacement = f'"tags": [{body}]'
        out.append(raw[last:span.start()])
        out.append(replacement)
        last = span.end()
    out.append(raw[last:])
    return "".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write the tags (default: report only)")
    args = ap.parse_args()

    total = 0
    for path in sorted(DATA.glob("*.json")):
        raw = path.read_text()
        record = json.loads(raw)
        items = [it for sec in record.get("menu", []) for it in sec["items"]]
        index = {id(it): i for i, it in enumerate(items)}

        findings = list(audit(record))
        if not findings:
            continue
        print(f"\n## {record['id']} ({len(findings)})")
        additions = {}
        for item, tag, tier, why in findings:
            print(f"  {tier:<7} {tag:<19} {item['name']}  — {why}")
            additions.setdefault(index[id(item)], []).append(tag)
        total += len(findings)
        if args.apply:
            path.write_text(patch_tags(raw, items, additions))

    verb = "applied" if args.apply else "missing (dry run)"
    print(f"\n{total} tag(s) {verb}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
