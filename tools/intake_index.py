#!/usr/bin/env python3
"""Index what the prior food exports in `intake/ingredients/` NAME.

    python3 tools/intake_index.py            # regenerate data/intake/name-index.json
    python3 tools/intake_index.py --check    # …and fail if it is out of date
    python3 tools/intake_index.py --dir DIR  # where the exports live

WHY THIS EXISTS. ADR 0090 ruled that the five JSON exports the owner collected
before Faves — ChatGPT and Gemini passes over the same pantry — *"are a good
index of what exists; they are not data"*, and that they would be *"kept as a
name index only."* **No such index was ever written.** An accepted record
describing a thing that does not exist is worse than a gap, because the next
reader stops looking (roadmap item 500/040).

🛑 NAMES AND SOURCE ONLY. NO NUTRITION FIGURE COMES THROUGH — not one, ever.
ADR 0090 measured those exports as wrong where it mattered: one recorded
*"Sweetcorn (62%), Water, Sugar, Salt"* where the label reads *"Sweetcorn
(48%), Water, Corn Starch, Sugar, Salt, Acidity Regulator (Citric Acid)"* — a
wrong percentage and two dropped ingredients, in a list that reads perfectly.
Copying those numbers into `data/` would launder bad data into the repo behind
this repo's own provenance rules. The index exists so a future session can see
WHAT WAS COLLECTED and go and read the packet; it is not a source to believe.

🛑 `conversation_export_partial.json` IS EXCLUDED ENTIRELY. It is a chat
transcript logging meals eaten — eating events, barred by ADR 0090 rule 2 and
by CLAUDE.md's absolute no-health-data rule. This tool does not open it, does
not count its rows and never names it as a source of a product. It is named in
the generated header only to record that it was seen and refused, because
"nobody looked" and "looked and refused" are otherwise identical.

🛑 NOTHING ABOUT A PERSON. These are the owner's own files and a few rows carry
a household attribution or an order modification that reads as a personal
dietary note. `REDACTIONS` below is an explicit, reviewable table rather than a
regex: a rule keyed on an apostrophe-s would eat Wattie's, Griffin's, Pam's,
Rose's, Danny's, Lisa's and Grandpa's, which are brands. Every redacted row
says so in the output, so the removal is visible rather than silent.

WHAT THE MATCH COLUMN IS AND IS NOT. `product` names a `data/products/` record
whose brand and name tokens are a subset of the export's, or the reverse. It is
a HINT for a reader, not a claim that the two are the same SKU — a 1 kg tub and
a 500 g tub of the same yoghurt share every token. Its value is the negative
direction: a name with no record is a thing that was collected once and is
recorded nowhere in this repo, and there are dozens.

`intake/**` is gitignored, so on a fresh clone and in CI there is nothing to
read: this says so and exits 0 rather than failing.

Stdlib only (ADR 0001 binds the tools by habit).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "data" / "products"
OUT = ROOT / "data" / "intake" / "name-index.json"
DEFAULT_DIR = "intake/ingredients"

# The five exports ADR 0090 read. Named explicitly rather than globbed, so a
# new file appearing in `intake/` is a deliberate decision by whoever adds it
# here and not a silent widening of what this tool publishes.
EXPORTS = [
    "all_foods_with_provenance.json",
    "full_food_database (1).json",
    "mike_food_database.json",
    "food_database (1).json",
    "Gemini food DB 1st 20 photos",
]
# Read, and refused. See the header.
EXCLUDED = {
    "conversation_export_partial.json":
        "chat messages logging meals eaten — eating events, barred by ADR 0090 "
        "rule 2 and by CLAUDE.md's absolute no-health-data rule. Not opened by "
        "this tool.",
}

# Explicit and reviewable, keyed on the exact string the export carries.
# `None` on the right means the row is dropped entirely.
REDACTIONS = {
    "Pasta Salad (Ruth’s recipe)":
        ("Pasta Salad", "a household member's name removed"),
    "Potato Salad (Ruth’s recipe)":
        ("Potato Salad", "a household member's name removed"),
    "Chocolate Self-saucing Pudding (Clements family recipe)":
        ("Chocolate Self-saucing Pudding", "a family name removed"),
    "Hot Spicy Chicken with Cashew and Vegetables (no cashews) + Rice":
        ("Hot Spicy Chicken with Cashew and Vegetables + Rice",
         "an order modification that reads as a personal dietary note removed"),
}

# Matches the token rule proposed and a human said no. Reviewed 2026-09-08
# against `data/products/`; the rule cannot see that "spaghetti in tomato
# sauce" is a different packet from "tomato sauce", because the second's tokens
# are a subset of the first's. Keyed on (export name, product id) so a later
# rename of either surfaces as the match coming back rather than as a silent
# deny that no longer applies to anything.
REVIEWED_WRONG = {
    ("Wattie's Spaghetti in Tomato Sauce", "watties-tomato-sauce"):
        "tinned spaghetti is not the sauce",
    ("Wattie’s Spaghetti in Rich Tomato Sauce", "watties-tomato-sauce"):
        "tinned spaghetti is not the sauce",
    ("Cadbury Perky Nana Bar", "cadbury-unnamed-bar-45g"):
        "the record's photograph showed no product name; naming it Perky Nana "
        "would be the guess this store exists to refuse",
    ("Mexicano Corn Chips Cheese Flavour", "unbranded-cheese-corn-chips-b015"):
        "the record is explicitly unbranded — it may or may not be Mexicano",
    ("Mexicano Corn Chips Jalapeño Flavour", "unbranded-cheese-corn-chips-b015"):
        "different flavour, and the record is unbranded",
    ("Goody Goody Gumdrops Ice Cream", "tip-top-gold-rush-ice-cream"):
        "a different Tip Top line",
    ("Tip Top Hokey Pokey Ice Cream", "tip-top-gold-rush-ice-cream"):
        "a different Tip Top line",
    ("Griffin’s Krispie Chocolate Half-Coated", "arnotts-tiny-teddy-milk-chocolate-200g"):
        "different maker; the shared tokens are 'half coated milk chocolate'",
    ("Griffin’s Krispies Original", "griffins-snax-original-250g"):
        "Krispies and Snax are different biscuits; only 'Griffin's original' "
        "is shared",
    # Denying a pair promotes the next-best candidate, so both J. Bush honeys
    # had to be refused in turn — the apiary has several lines and the exports
    # name one this store has not recorded.
    ("J. Bush & Sons Marlborough Honey", "jbush-blue-borage-molesworth-honey-1kg"):
        "same apiary, different honey",
    ("J. Bush & Sons Marlborough Honey", "jbush-bee-keepers-honey-1kg"):
        "same apiary, different honey",
    ("Meadow Fresh Trim Milk", "pams-value-trim-milk-2l"): "different brand",
    ("Meadow Fresh Trim Milk (green lid)", "pams-value-trim-milk-2l"):
        "different brand",
    ("Trim Milk (Standard NZ Trim Milk)", "pams-value-trim-milk-2l"):
        "the export's own row says generic, not a brand",
    ("Pam’s Basmati Rice (dry)", "amber-basmati-rice-5kg"): "different brand",
    ("Dried Peaches (Countdown pack)", "moore-wilsons-dried-peaches-500g"):
        "different retailer's pack",
    ("Nescafé Caramel Coffee Sachet (Instant)", "shott-caramel-coffee-syrup-1l"):
        "a coffee sachet is not a syrup",
    ("Trident Rice Noodles Vietnamese Chicken Flavour",
     "fantastic-2-minute-noodles-beef"): "different maker and flavour",
    ("Trident Rice Noodles Vietnamese Chicken Flavour (prepared)",
     "fantastic-2-minute-noodles-beef"): "different maker and flavour",
    # Composite dishes the exports estimated. They mention a packet; they are
    # not one, and pointing them at a product record would read as a claim that
    # the packet's label describes the meal.
    ("Beef Burger Pattie (pan fried)",
     "angel-bay-gourmet-beef-burger-patties-720g"): "a cooked dish, not a pack",
    ("Pita Burger (beef pattie, pita bun, cheese, lettuce, pineapple, beetroot)",
     "angel-bay-gourmet-beef-burger-patties-720g"): "a composite meal",
    ("Bell Black Tea with 1/2 tsp sugar and splash of trim milk",
     "bell-tea-original-black-tea-100-bags"): "a made drink, not a pack",
    ("Bell Black Tea with 1/2 tsp sugar and splash of trim milk",
     "pams-value-trim-milk-2l"): "the milk it mentions is not the row",
    ("Homemade Fried Rice (basmati, egg, broccoli, mushroom, chicken)",
     "amber-basmati-rice-5kg"): "a composite meal",
    ("Toastie / Toasty Pie (mince & cheese, creamed corn, or spaghetti)",
     "woolworths-creamed-corn-400g"): "a composite meal",
}

STOPWORDS = {"the", "and", "with", "in", "of", "a", "as", "per"}
# Pack sizes and the burst handles that end some record ids. Dropped from both
# sides before comparing: `corona-extra-355ml` and "Corona Extra 355 ml" are
# the same name written twice, and leaving the size in makes one of them look
# richer than the other for no reason a reader would recognise.
NOISE = re.compile(r"^(?:\d+(?:g|kg|ml|l|mg)?|b\d{3}|ml|g|kg|l|pack|piece)$")


def tokens(*parts: object) -> set[str]:
    text = " ".join(str(p) for p in parts if p)
    text = text.replace("’", "'").replace("‘", "'").lower()
    return {t for t in re.split(r"[^a-z0-9]+", text)
            if t and t not in STOPWORDS and not NOISE.match(t)}


def rows_of(path: Path) -> list[tuple[str, str | None]]:
    """(name, brand) for one export. The two shapes are the two tools that
    wrote them; nothing else in the file is read."""
    doc = json.loads(path.read_text())
    raw = doc["foods"] if isinstance(doc, dict) else doc
    out = []
    for r in raw:
        if "names" in r:                       # the Gemini shape
            out.append((r["names"]["primary"], None))
        else:                                  # the ChatGPT shapes
            out.append((r["name"], r.get("brand")))
    return out


def build(source_dir: Path) -> tuple[dict, list[str]]:
    products = []
    for p in sorted(STORE.glob("*.json")):
        rec = json.loads(p.read_text())
        products.append((rec["id"], tokens(rec.get("brand"), rec.get("name"),
                                           rec.get("variant"))))

    entries: dict[tuple[str, str], dict] = {}
    counts: dict[str, int] = {}
    notes: list[str] = []
    for name in EXPORTS:
        path = source_dir / name
        if not path.exists():
            notes.append(f"missing export: {name}")
            continue
        pairs = rows_of(path)
        counts[name] = len(pairs)
        for raw_name, brand in pairs:
            redaction = None
            if raw_name in REDACTIONS:
                replacement, why = REDACTIONS[raw_name]
                if replacement is None:
                    notes.append(f"row dropped ({why})")
                    continue
                raw_name, redaction = replacement, why
            key = (raw_name, brand or "")
            entry = entries.setdefault(key, {
                "name": raw_name,
                "brand": brand,
                "sources": [],
                "product": None,
            })
            if redaction:
                entry["redacted"] = redaction
            if name not in entry["sources"]:
                entry["sources"].append(name)

    for entry in entries.values():
        want = tokens(entry["brand"], entry["name"])
        # Best overlap wins, and a TIE names nothing. Two records scoring the
        # same on one name means the tokens cannot tell them apart, and picking
        # whichever sorted first would be a coin toss printed as a fact.
        scored: list[tuple[int, str]] = []
        for pid, have in products:
            if (entry["name"], pid) in REVIEWED_WRONG:
                continue
            shared = len(want & have)
            if shared >= 2:
                scored.append((shared, pid))
        scored.sort(reverse=True)
        if scored and (len(scored) == 1 or scored[0][0] > scored[1][0]):
            entry["product"] = scored[0][1]
        else:
            entry["product"] = None

    ordered = sorted(entries.values(), key=lambda e: (e["name"].lower(),
                                                      e["brand"] or ""))
    doc = {
        "note": (
            "What the prior food exports in intake/ingredients/ NAME — nothing "
            "more. ADR 0090 promised this index and did not write it (roadmap "
            "500/040). NO NUTRITION FIGURE FROM THOSE EXPORTS IS RECORDED HERE: "
            "ADR 0090 measured them wrong where it mattered, and copying their "
            "numbers would launder bad data into this repo. A name with no "
            "'product' is a thing collected once and recorded nowhere else in "
            "this repo — that is the whole value of the file. 'product' is a "
            "token-match HINT, not a claim that the two are the same SKU. "
            "Generated by tools/intake_index.py; edit the tool, never this file."
        ),
        "excluded": EXCLUDED,
        "sources": counts,
        "names": len(ordered),
        "withProductRecord": sum(1 for e in ordered if e["product"]),
        "entries": ordered,
    }
    return doc, notes


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Index what the prior food exports in intake/ name.",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--dir", default=DEFAULT_DIR,
                    help=f"where the exports live (default: {DEFAULT_DIR}). "
                         "Gitignored, so absent on a fresh clone and in CI — "
                         "then this prints and exits 0.")
    ap.add_argument("--check", action="store_true",
                    help="fail if the committed index is out of date")
    args = ap.parse_args()

    source_dir = (ROOT / args.dir).resolve()
    if not source_dir.exists():
        print(f"intake not present ({args.dir}) — the committed index is left "
              "as it is. Nothing to regenerate here.")
        return 0

    doc, notes = build(source_dir)
    for n in notes:
        print(f"note: {n}")
    text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"

    if args.check:
        if not OUT.exists():
            print(f"error: {OUT.relative_to(ROOT)} does not exist — run this "
                  "tool without --check")
            return 1
        if OUT.read_text() != text:
            print(f"error: {OUT.relative_to(ROOT)} is out of date — run "
                  "`python3 tools/intake_index.py` and commit the result")
            return 1
        print(f"{OUT.relative_to(ROOT)} is up to date — {doc['names']} name(s), "
              f"{doc['withProductRecord']} with a data/products/ record, "
              f"{doc['names'] - doc['withProductRecord']} without.")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)} — {doc['names']} name(s) from "
          f"{len(doc['sources'])} export(s); {doc['withProductRecord']} have a "
          f"data/products/ record, {doc['names'] - doc['withProductRecord']} "
          "have none.")
    return 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260). Prints as the run's last line, on every
    # exit path including a refusal.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
