#!/usr/bin/env python3
"""Find dish CLASSES whose allergen tagging disagrees across the corpus.

Seatoun's "Sausages n Fries" carries `contains-gluten` because NZ sausages
standardly contain wheat rusk. Tawa's "Sausages" and "Cheerio Sausages" carry no
such tag, and nothing about the food distinguishes them — the difference is
which session read which menu. That is the defect this reports (item 37n): a
reader who finds one sausage flagged and an identical one not flagged learns
that the absence of a tag means nothing, and once they learn that, every
*correct* tag in the corpus stops working too. Inconsistency does not fail safe.
It fails quiet.

WHAT A CLASS IS. A set of dishes whose food is materially the same for allergen
purposes even though the names differ. Classes are an explicit table below —
one regex, one exclusion, one watched allergen list, one sentence of food
reasoning each — not a similarity score. That is deliberate. A grouper that
guessed would put "Chicken Sausage Roll" next to "Cheerio Sausages", and a
report with noise in it is a report nobody reads, which is the same outcome as
no report at all. Every row of the table is a claim about food that a person
can check and argue with; adding a class is adding a row.

WHAT IT CAN SEE
  • Every dish in all 55 venue files: name, description, recipe ingredients,
    and any section note that speaks for the whole section — read through
    `tag_allergens.section_clauses`, so an "available on request" line cannot
    sweep a heading into a class.
  • The `contains-*` tags each dish carries, and which dishes in a class differ.

WHAT IT CANNOT SEE
  • Whether the tagging is TRUE. It compares dishes to each other, not to food.
    A class where every member is wrong the same way reports nothing.
  • Whether a difference is real. Two venues' sausages may genuinely differ —
    a gluten-free butcher exists. So this reports, and a human rules.
  • Anything a menu doesn't print. A dish described as "Sausages" and nothing
    else is in the class on its name alone.
  • Add-on options. They carry tags too (ADR 0048) and are read by default;
    pass `--dishes-only` to leave them out.

EXIT CODE. Always 0, unless you ask for `--strict`. Disagreements exist right
now by construction — that is the whole reason the item is open — so a check
that exits non-zero would fire on every run from the day it landed, and this
repo has repeatedly found that a check which always fires is a check nobody
reads. When the corpus is swept clean, `--strict` in CI is what keeps it clean.

    python3 tools/allergen_disagreements.py                 # the report
    python3 tools/allergen_disagreements.py --class sausage # one class
    python3 tools/allergen_disagreements.py --missing-only  # just the gaps
    python3 tools/allergen_disagreements.py --any-tag       # widen past `watch`
    python3 tools/allergen_disagreements.py --strict        # exit 1 on any
"""

import argparse
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
# One food fact, one home. `gf` blocking `contains-gluten` is the same rule here
# as it is in the tagger, and two copies of it would drift.
from tag_allergens import CONTRADICTED_BY, ingredient_lines, section_clauses  # noqa: E402

DATA = pathlib.Path("site/data/restaurants")

# (name, why this is one food, match, exclude, watch)
#
# `watch` is the point of the row: the allergens this class is ABOUT. It is
# deliberately not "every tag some member happens to carry" — a sausage platter
# tagged contains-shellfish would then drag every other sausage into a shellfish
# disagreement, which is noise dressed as a finding. `--any-tag` opens it up for
# exploring; the default stays narrow.
CLASSES = [
    (
        "sausage",
        "an NZ sausage is bound with wheat rusk unless the butcher says otherwise",
        r"\b(sausages?|snarlers?|cheerios?|saveloys?|savs?|bangers?|frankfurters?|"
        r"hot\s?dogs?|hotdogs?)\b",
        # A sausage ROLL is pastry — its gluten is obvious and its class is
        # different. Cured continental sausages are a different food entirely:
        # chorizo, salami, pepperoni and lap cheong carry no rusk, and lumping
        # them in is exactly the false positive that makes a report ignorable.
        r"\bsausage\s?rolls?\b|\b(chorizo|salami|pepperoni|kransky|lap\s?cheong|"
        r"chinese\s+sausages?)\b",
        ["contains-gluten"],
    ),
    (
        "crumbed",
        "a breadcrumb coating is wheat flour and, where a kitchen crumbs its own, "
        "an egg wash",
        # `tenders` PLURAL only. "Tender lamb cooked with spices" is an
        # adjective, and matching it put six Indian and Malaysian curries in the
        # crumbed class on the first run — the exact noise this table exists to
        # avoid.
        r"\b(crumbed|breaded|panko|schnitzels?|schnitty|katsu|parmigianas?|parmas?|"
        r"goujons?|nuggets?|tenders|popcorn\s+chicken|cordon\s+bleu)\b",
        r"\bparma\s+ham\b",  # prosciutto, not a chicken parma
        ["contains-gluten", "contains-egg"],
    ),
    (
        "battered",
        "a batter is wheat flour; unlike a crumb it may or may not carry egg",
        r"\b(battered|batter|tempura)\b",
        # Beer-battered is still battered — but a "batter" in a dessert section
        # is a pancake, which the bakery rules already own.
        #
        # Considered and REJECTED for this class: salt & pepper squid and
        # karaage. Both are dusted rather than battered, and both are cornflour
        # or potato starch as often as wheat — so they are not materially the
        # same food as a beer-battered fish, and putting them here made five
        # venues' squid look like an untagged gluten gap. A class that has to
        # be argued about is a class that gets ignored.
        r"\b(pancake|waffle|muffin)\s?batter\b",
        ["contains-gluten"],
    ),
    (
        "pizza",
        "a pizza base is wheat dough and a pizza is cheese-topped by default",
        r"\b(pizzas?|calzones?)\b",
        # A "pizza sauce" or "pizza spice" dip is not a pizza.
        r"\bpizza\s+(sauce|spice|seasoning)\b",
        ["contains-gluten", "contains-dairy"],
    ),
    (
        "brioche",
        "brioche is a wheat dough enriched with butter and egg",
        r"\bbrioche\b",
        None,
        ["contains-gluten", "contains-dairy", "contains-egg"],
    ),
    (
        "milk-bun",
        "a milk bun is a wheat dough enriched with milk — dairy, not egg",
        r"\b(milk|potato)\s?buns?\b",
        None,
        ["contains-gluten", "contains-dairy"],
    ),
    (
        "sesame-bun",
        "a sesame seed bun is wheat and sesame, and the sesame is the whole point",
        r"\bsesame\s?(seed\s?)?buns?\b",
        None,
        ["contains-gluten", "contains-sesame"],
    ),
    (
        "mayo",
        "mayonnaise and everything built on it is an egg emulsion",
        r"\b(mayonnaise|mayo|aioli|tartare\s?sauce|tartar\s?sauce|remoulade|"
        r"thousand\s?island)\b",
        # A vegan mayo really is egg-free, and several venues print it by name.
        r"\b(vegan|egg[\s-]?free|plant[\s-]?based)\s+(mayonnaise|mayo|aioli)\b",
        ["contains-egg"],
    ),
    (
        "ranch",
        "ranch is a mayonnaise loosened with buttermilk — egg AND dairy",
        r"\branch\b",
        r"\branch\s+(hand|style\s+home)\b",  # a place name, not a dressing
        ["contains-egg", "contains-dairy"],
    ),
    (
        "pesto",
        "pesto is pine nuts and parmesan",
        r"\bpesto\b",
        # Both exist and both are printed by name when a kitchen makes them.
        r"\b(nut[\s-]?free|vegan|dairy[\s-]?free)\s+pesto\b",
        ["contains-nuts", "contains-dairy"],
    ),
]

COMPILED = [
    (name, why, re.compile(pat, re.I), re.compile(exc, re.I) if exc else None, watch)
    for name, why, pat, exc, watch in CLASSES
]


def dish_text(item, section_text):
    """Everything the menu says about this dish, plus what the heading says.

    The section note is included because that is where the qualifier often
    lives — Thorndon prints "All burgers served with … on a sesame bun" once
    above three burgers — but only the clauses that speak for the whole section
    (`section_clauses`), so an "available on request" line cannot sweep a whole
    heading into a class.
    """
    parts = [item.get("name") or "", item.get("desc") or ""]
    # `ingredients` entries are strings OR {component, items[]} groups since
    # ADR 0070 — flattened here rather than read raw, or a grouped recipe hands
    # a dict to " ".join and the whole report dies on it. A component name is a
    # label ("Sauce"), never a thing anyone is allergic to, so only its items
    # reach the match text.
    parts.extend(ingredient_lines(item))
    parts.append(section_text)
    return " ".join(parts)


def members(dishes_only=False):
    """Every taggable row in the corpus, as (venue, kind, id, name, text, tags)."""
    rows = []
    for path in sorted(DATA.glob("*.json")):
        record = json.loads(path.read_text())
        venue = record.get("id", path.stem)
        for section in record.get("menu", []):
            note = " ".join(c for c, verdict in section_clauses(section.get("note"))
                            if verdict is None)
            for item in section.get("items", []):
                rows.append((
                    venue, "dish", item.get("dishId") or "(no dishId)",
                    item.get("name") or "", dish_text(item, note),
                    set(item.get("tags") or []),
                ))
        if dishes_only:
            continue
        for group in record.get("addOnGroups") or []:
            for option in group.get("options") or []:
                # An option has no dishId — it is identified by its group.
                rows.append((
                    venue, "add-on", f"{group.get('id')}/{option.get('name')}",
                    option.get("name") or "", option.get("name") or "",
                    set(option.get("tags") or []),
                ))
    return rows


def classify(rows):
    """{class name: [row, …]} — a row may belong to more than one class."""
    grouped = {name: [] for name, *_ in CLASSES}
    for row in rows:
        text = row[4]
        for name, _why, pattern, exclude, _watch in COMPILED:
            if exclude and exclude.search(text):
                continue
            if pattern.search(text):
                grouped[name].append(row)
    return grouped


def disagreements(grouped, any_tag=False):
    """Yield (class, why, tag, carriers, missing) for every split in a class.

    A row whose own dietary tags contradict the allergen is dropped rather than
    reported: a pizza marked `gf` is not missing `contains-gluten`, it is a
    different pizza. Same table the tagger uses, so the two can't drift.
    """
    for name, why, _pattern, _exclude, watch in COMPILED:
        rows = grouped[name]
        if len(rows) < 2:
            continue  # a class of one cannot disagree with itself
        tags = list(watch)
        if any_tag:
            seen = {t for row in rows for t in row[5] if t.startswith("contains-")}
            tags += sorted(seen - set(watch))
        for tag in tags:
            eligible = [r for r in rows if not (r[5] & CONTRADICTED_BY.get(tag, set()))]
            carriers = [r for r in eligible if tag in r[5]]
            missing = [r for r in eligible if tag not in r[5]]
            if carriers and missing:
                yield name, why, tag, carriers, missing


def _line(row, mark):
    venue, kind, ident, name, _text, tags = row
    shown = sorted(t for t in tags if t.startswith("contains-")) or ["—"]
    label = f"{venue}/{ident}" if kind == "dish" else f"{venue}/{ident} [add-on]"
    return f"    {mark} {label[:58]:<58} {name[:34]:<34} {' '.join(shown)}"


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--class", dest="only", metavar="NAME",
                    choices=[c[0] for c in CLASSES], help="report one class only")
    ap.add_argument("--missing-only", action="store_true",
                    help="list only the dishes lacking the tag, not the ones carrying it")
    ap.add_argument("--any-tag", action="store_true",
                    help="also report allergens outside the class's watch list "
                         "(exploratory — expect noise)")
    ap.add_argument("--dishes-only", action="store_true",
                    help="ignore add-on options, which carry tags of their own")
    ap.add_argument("--strict", action="store_true",
                    help="exit 1 if any disagreement is found (for CI, once clean)")
    args = ap.parse_args()

    grouped = classify(members(args.dishes_only))
    splits = 0
    dishes = set()
    for name, why, tag, carriers, missing in disagreements(grouped, args.any_tag):
        if args.only and name != args.only:
            continue
        splits += 1
        dishes.update((r[0], r[2]) for r in missing)
        total = len(carriers) + len(missing)
        print(f"\n## {name} — {why}")
        print(f"   {tag}: {len(carriers)} of {total} carry it, {len(missing)} do not")
        if not args.missing_only:
            for row in sorted(carriers):
                print(_line(row, "✓"))
        for row in sorted(missing):
            print(_line(row, "✗"))

    print(f"\n{splits} class/allergen split(s); "
          f"{len(dishes)} distinct row(s) lack a tag their class carries.")
    if not splits:
        print("No class in the table disagrees with itself. That is not proof the "
              "tagging is right — only that it is consistent.")
    # See the module docstring: 0 by default, on purpose.
    return 1 if (args.strict and splits) else 0


if __name__ == "__main__":
    raise SystemExit(main())
