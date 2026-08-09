#!/usr/bin/env python3
"""Tag allergens the menu implies but doesn't spell out.

Owner ruling 2026-08-09 (ADR 0025, superseding 0024): where a menu-writer
hasn't bothered to state an allergen and we can be highly confident, INFER IT.
A dish containing satay contains peanuts, whether or not the menu says so.

THE ONE-WAY RULE. Inference may only ever add a `contains-*` tag. It must never
add `gf`, `df`, `v` or `vg`, and never remove a tag. Inferring presence is
fail-safe — the worst case is someone avoids a dish they could have eaten.
Inferring absence would be asserting safety from a guess, which is the failure
this whole feature exists to prevent. "No tag = not stated" still holds.

Two tiers, kept apart so the count is auditable (ADR 0025):

  STATED   the menu names the allergen or an unambiguous form of it —
           "Prawn Cutlet", "…with Oyster Sauce", "Almond Croissant".
  DERIVED  the menu names a dish whose defining ingredient it doesn't print —
           satay (peanut), tempura (wheat + egg), a laksa (belacan).

Three guards keep it honest:
  • EXCLUDE patterns per rule — "rice noodles" are not wheat, "peanut butter"
    is not dairy, a "doughnut" is not a tree nut.
  • CONTRADICTED_BY — a dish the data already calls gf/df/vegan is not
    silently overridden by an inference. Curation beats a pattern.
  • Paid add-ons are not ingredients — "add prawns +$7" doesn't make a garden
    salad shellfish.

    python3 tools/tag_allergens.py               # report (default)
    python3 tools/tag_allergens.py --tier DERIVED  # just the inferences
    python3 tools/tag_allergens.py --apply       # write them
"""

import argparse
import json
import pathlib
import re

DATA = pathlib.Path("site/data/restaurants")

# An existing tag that makes an inference untrustworthy. Curated/venue-stated
# dietary facts outrank a pattern match: a dish marked gluten free is not given
# contains-gluten because its name happens to contain "bun". `gf-option` is
# deliberately absent — the default preparation still contains gluten.
CONTRADICTED_BY = {
    "contains-gluten": {"gf"},
    "contains-dairy": {"vg", "df"},
    "contains-egg": {"vg"},
    "contains-shellfish": {"v", "vg"},
}

# (tag, tier, basis, pattern, exclude)
# `exclude` is checked against the same text; a hit vetoes the rule for that
# item. Every entry below is a claim about food that someone can check.
RULES = [
    # --- peanuts ------------------------------------------------------
    ("contains-peanuts", "STATED", "names peanut", r"\bpeanuts?\b", None),
    ("contains-peanuts", "DERIVED", "satay sauce is peanut sauce", r"\bsatays?\b", None),
    ("contains-peanuts", "DERIVED", "pad thai is finished with crushed peanuts", r"\bpad\s?thai\b", None),
    ("contains-peanuts", "DERIVED", "gado gado is dressed in peanut sauce", r"\bgado", None),
    ("contains-peanuts", "DERIVED", "massaman is a peanut curry", r"\bmassaman\b", None),
    ("contains-peanuts", "DERIVED", "kung pao is made with peanuts", r"\b(kung\s?pao|gong\s?bao)\b", None),

    # --- tree nuts ----------------------------------------------------
    # NEVER match a bare "nut": doughnut, butternut, nutmeg. Coconut is not a
    # tree nut for NZ allergen labelling and is deliberately not matched.
    ("contains-nuts", "STATED", "names a tree nut",
     r"\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|"
     r"pine\s?nuts?|brazil\s?nuts?|chestnuts?)\b", None),
    ("contains-nuts", "DERIVED", "pesto is made with pine nuts", r"\bpesto\b", None),
    ("contains-nuts", "DERIVED", "praline/marzipan/nougat are nut confections",
     r"\b(praline|marzipan|nougat|frangipane|baklava)\b", None),
    ("contains-nuts", "DERIVED", "Nutella is a hazelnut spread", r"\bnutella\b", None),

    # --- shellfish ----------------------------------------------------
    ("contains-shellfish", "STATED", "names a crustacean or mollusc",
     r"\b(prawns?|shrimps?|squid|calamari|scallops?|mussels?|oysters?|paua|crabs?|"
     r"kanikama|surimi|lobster|crayfish|clams?)\b", None),
    ("contains-shellfish", "DERIVED", "an unnamed seafood mix reliably includes prawn or squid", r"\bseafood\b", None),
    ("contains-shellfish", "DERIVED", "laksa paste contains belacan (dried shrimp)", r"\blaksa\b", None),
    ("contains-shellfish", "DERIVED", "XO sauce is made with dried scallop and shrimp", r"\bXO sauce\b", None),

    # --- gluten -------------------------------------------------------
    ("contains-gluten", "STATED", "names a wheat product",
     r"\b(bread|breaded|flour|wheat|barley|rye|semolina|couscous|pastry|pasta|"
     r"spaghetti|lasagne|lasagna|ravioli|fettuccine|penne|croissant|bagel|pita|"
     r"naan|rotis?|paratha|chapati|brioche|crumpet|pretzel|filo|panko|breadcrumb)\b", None),
    ("contains-gluten", "DERIVED", "battered/crumbed coatings are wheat flour",
     r"\b(battered|crumbed|schnitzel|katsu|tempura)\b", None),
    ("contains-gluten", "DERIVED", "a wheat-flour wrapper",
     r"\b(dumplings?|wontons?|gyoza|samosas?|spring\s?rolls?|dim\s?sims?|pork\s?buns?)\b",
     r"\brice\s?paper\b"),
    # "pie spice" is a spice blend, and a fish/crab/rice cake is not a bakery
    # cake — both found by dry-run against the real corpus.
    ("contains-gluten", "DERIVED", "a wheat bakery item",
     r"\b(buns?|burgers?|sandwich|toast|toastie|pies?|cakes?|biscuits?|cookies?|"
     r"brownies?|muffins?|scones?|doughnuts?|donuts?|pizzas?|pancakes?|waffles?|"
     r"crackers?|tarts?|slices?|danish|éclair|eclair)\b",
     r"\b(pie\s?spice|(fish|crab|rice)\s?cakes?)\b"),
    ("contains-gluten", "DERIVED", "a wheat noodle",
     r"\b(udon|ramen|egg\s?noodles?|chow\s?mein|lo\s?mein|hokkien|mee\s?goreng|"
     r"bami\s?goreng|chow\s?fun)\b", None),
    ("contains-gluten", "DERIVED", "soy sauce is brewed with wheat",
     r"\b(soy\s?sauce|soya\s?sauce|teriyaki|hoisin)\b", None),
    ("contains-gluten", "DERIVED", "beer is a barley product", r"\b(beer|lager|ale|stout|pilsner)\b", None),

    # --- dairy --------------------------------------------------------
    # "butter" must not fire on peanut/nut butter; "cream" must not fire on
    # coconut cream, which is the base of most laksa and Thai curry here.
    # "creamy" is deliberately NOT matched. In the cuisines on this list it
    # means coconut cream at least as often as dairy — it was tagging every
    # Malaysian laksa and curry. Losing a few real hits ("Creamy Mushrooms") is
    # the right trade: an inference should under-reach, not mis-fire.
    ("contains-dairy", "STATED", "names a dairy product",
     r"\b(cheese|cheesy|butter|buttermilk|creams?|milks?|milkshakes?|yoghurt|yogurt|"
     r"mozzarella|parmesan|feta|halloumi|paneer|camembert|brie|mascarpone|ricotta|ghee)\b",
     NON_DAIRY := r"\b(peanut|nut|almond|cashew|coconut|soya?|oat|rice)\s?(butter|milk|cream)\b"),
    ("contains-dairy", "DERIVED", "an espresso milk drink",
     r"\b(latte|cappuccino|mocha|flat\s?white|macchiato)\b", NON_DAIRY),
    ("contains-dairy", "DERIVED", "the sauce is cream- or butter-based",
     r"\b(alfredo|carbonara|butter\s?chicken|korma|tikka\s?masala|ganache|"
     r"cheesecake|tiramisu|panna\s?cotta)\b", None),

    # --- egg ----------------------------------------------------------
    # \begg\b never matches "eggplant".
    ("contains-egg", "STATED", "names egg", r"\beggs?\b", None),
    ("contains-egg", "DERIVED", "an egg emulsion",
     r"\b(mayonnaise|mayo|aioli|hollandaise|meringue|custard|pavlova)\b", None),
    ("contains-egg", "DERIVED", "egg is in the batter or base",
     r"\b(omelettes?|frittata|quiche|carbonara|tempura|tiramisu)\b", None),

    # --- soy ----------------------------------------------------------
    ("contains-soy", "STATED", "names soy",
     r"\b(soy|soya|tofu|edamame|miso|tempeh)\b", None),
    ("contains-soy", "DERIVED", "the sauce is soy-based",
     r"\b(teriyaki|hoisin|oyster\s?sauce|black\s?bean\s?sauce|satays?)\b", None),

    # --- sesame -------------------------------------------------------
    ("contains-sesame", "STATED", "names sesame", r"\b(sesame|tahini)\b", None),
    ("contains-sesame", "DERIVED", "hummus is made with tahini", r"\b(hummus|houmous|halva)\b", None),
]

COMPILED = [
    (tag, tier, why, re.compile(pat, re.I), re.compile(exc, re.I) if exc else None)
    for tag, tier, why, pat, exc in RULES
]

# A paid optional extra — "Add chicken, halloumi, prawns or beef +$7". The dish
# as served contains none of it. Both signals required (an "add" AND a "+$"),
# so a description that merely says "added" still counts as an ingredient.
ADD_ON = re.compile(r"\badd(?:s|ed|ing)?\b", re.I)
ADD_ON_PRICE = re.compile(r"\+\s*\$")


def ingredient_text(item):
    """Name + the parts of the description describing what you actually get.

    A Cook at Home recipe also carries an `ingredients` list, and that is the
    best allergen evidence anywhere in the corpus — it is not inference at all,
    it literally says "2 eggs" and "200g butter". Without it a chocolate
    self-saucing pudding reads as allergen-free, because nothing in its *name*
    implies flour, butter or egg.
    """
    kept = [item["name"]]
    for clause in re.split(r"[.;]", item.get("desc") or ""):
        if ADD_ON.search(clause) and ADD_ON_PRICE.search(clause):
            continue
        kept.append(clause)
    kept.extend(item.get("ingredients") or [])
    return " ".join(kept)


def audit(record, tier=None):
    """Yield (item, tag, tier, why) for every tag this record is missing."""
    for section in record.get("menu", []):
        for item in section["items"]:
            text = ingredient_text(item)
            tags = set(item.get("tags", []))
            for tag, rule_tier, why, pattern, exclude in COMPILED:
                if tag in tags:
                    continue
                if tier and rule_tier != tier:
                    continue
                if tags & CONTRADICTED_BY.get(tag, set()):
                    continue  # curation outranks a pattern
                if exclude and exclude.search(text):
                    continue
                hit = pattern.search(text)
                if hit:
                    tags.add(tag)  # one tag per item, whichever rule fires first
                    yield item, tag, rule_tier, f"{why} ({hit.group(0).lower()})"


# The data files are hand-maintained in two styles — one item per line in some
# records, fully expanded in others — so a json.dumps() round-trip would
# reformat whole files and bury the change. Patch the tags arrays in the raw
# text instead, and leave every other byte alone.
TAGS_ARRAY = re.compile(r'"tags"\s*:\s*\[[^\]]*\]')


class Unpatchable(Exception):
    """This record's tags can't be patched positionally — skip it, don't guess."""


def patch_tags(raw, items, additions):
    """Rewrite only the tags arrays that gained a tag, preserving each one's
    existing layout.

    Refuses to patch a record whose items don't each carry a literal `tags`
    array — mcdonalds.json omits the key entirely, and a positional patch
    against a partial list would write tags onto the wrong dishes. Refusing is
    the only safe answer; the caller reports it and moves on rather than
    aborting the whole run half-written.
    """
    spans = list(TAGS_ARRAY.finditer(raw))
    if len(spans) != len(items):
        raise Unpatchable(f"{len(spans)} tags arrays for {len(items)} items")
    out, last = [], 0
    for idx, span in enumerate(spans):
        if idx not in additions:
            continue
        tags = list(items[idx].get("tags", [])) + additions[idx]
        if "\n" in span.group(0):
            indent = " " * (span.start() - raw.rfind("\n", 0, span.start()) - 1)
            inner = f",\n{indent}  ".join(json.dumps(t) for t in tags)
            replacement = f'"tags": [\n{indent}  {inner}\n{indent}]'
        else:
            replacement = '"tags": [' + ", ".join(json.dumps(t) for t in tags) + "]"
        out.append(raw[last:span.start()])
        out.append(replacement)
        last = span.end()
    out.append(raw[last:])
    return "".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write the tags (default: report only)")
    ap.add_argument("--tier", choices=["STATED", "DERIVED"], help="only this tier")
    ap.add_argument("--quiet", action="store_true", help="counts only")
    args = ap.parse_args()

    total = {"STATED": 0, "DERIVED": 0}
    by_tag = {}
    skipped = []
    for path in sorted(DATA.glob("*.json")):
        raw = path.read_text()
        record = json.loads(raw)
        items = [it for sec in record.get("menu", []) for it in sec["items"]]
        index = {id(it): i for i, it in enumerate(items)}

        findings = list(audit(record, args.tier))
        if not findings:
            continue
        if not args.quiet:
            print(f"\n## {record['id']} ({len(findings)})")
        additions = {}
        for item, tag, tier, why in findings:
            if not args.quiet:
                print(f"  {tier:<7} {tag:<19} {item['name'][:42]:<42} — {why}")
            additions.setdefault(index[id(item)], []).append(tag)
            total[tier] += 1
            by_tag[tag] = by_tag.get(tag, 0) + 1
        if args.apply:
            try:
                path.write_text(patch_tags(raw, items, additions))
            except Unpatchable as exc:
                # Don't count what we didn't write — the summary line is the
                # only thing most runs are read for.
                skipped.append(f"{record['id']}: {exc} — {len(findings)} tag(s) NOT applied")
                for _, tag, tier, _ in findings:
                    total[tier] -= 1
                    by_tag[tag] -= 1

    verb = "applied" if args.apply else "missing (dry run)"
    print(f"\n{sum(total.values())} tag(s) {verb} — {total['STATED']} STATED, {total['DERIVED']} DERIVED")
    for tag, n in sorted(by_tag.items(), key=lambda kv: -kv[1]):
        print(f"  {tag:<22} {n}")
    # Never silent: a record we couldn't write is reported, not swallowed.
    for s in skipped:
        print(f"  SKIPPED (not written) — {s}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
