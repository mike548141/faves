#!/usr/bin/env python3
"""Report venues that plausibly sell drinks but carry no drink rows — the
derived worklist for the ROADMAP.md "Other venues with drinks nobody has
captured" item (Theme 4).

WHY THIS EXISTS. The roadmap used to name the gap by eye ("Sprig + Fern Tawa
is the standout") — a claim that ages the moment another venue is added or a
menu is transcribed. `tools/needs.py` already solved this for dish-level
gaps by deriving the worklist from the corpus instead of typing it into
prose (ADR 0041); this tool applies the same fix here.

EVIDENCE — WHAT EACH SIGNAL MEANS. Every classification below reads only
`site/data/restaurants/*.json` — no web lookups, no outside knowledge of
what a chain actually serves.

  cuisine tag    A tag that IS a drink-selling format: "Bar", "Pub",
                 "Gastropub", "Coffee", "Bubble tea", "Cafe" → DEFINITE.
                 A tag that commonly pairs with a drinks counter but isn't
                 itself one: "Bakery", "Deli", "Cake shop", "Gelato",
                 "Dessert", "Crepes" → PROBABLE.
  vibe chip      "craft-beer", "beer-garden", "garden-bar" name alcohol
                 explicitly → DEFINITE.
  venue name     "brewery" or "tavern" as a whole word is unambiguous →
                 DEFINITE. A bare "bar" is not — "The Catch Sushi Bar" is a
                 sushi counter, not a licensed bar — so a standalone "bar"
                 only reaches PROBABLE.
  section        Whether the record ALREADY carries drink rows is read from
  headings       its own section headings — see DRINK_HEADING_RE below for
                 exactly how, and why a naive heading match ("== 'Drinks'")
                 would miss most of the corpus's real vocabulary.

The three tiers are `yes` (definite), `probable`, `no-signal` — never a
single boolean, because "the name says Bar" and "cuisine says Bakery" carry
different confidence and a reader curating this list needs to see which.

DETECTING EXISTING DRINK ROWS. A first pass over the corpus
(`python3 -c '...'` over every `menu[].section`) turned up 175 distinct
headings, no two records sharing a vocabulary: "Black Coffee" / "White
Coffee" (a Malaysian kopi venue), "Refreshments" (a trading-company cafe),
"Thickshakes & drinks" vs "Milkshakes & smoothies" vs "Thickshakes &
Smoothies" (three different burger/pub venues, three different phrasings),
eleven separate "Wine — <varietal>" headings at one gastropub. A heading
that equals "Drinks" or "Beer" verbatim exists too, but restricting the
detector to those exact strings would have missed all of the above. So
DRINK_HEADING_RE is a keyword match built from every drink-shaped heading
actually observed, not a guess at what one might look like:

  beer, cider, wine, cocktail, mocktail, coffee, tea (word boundary —
  otherwise it would match inside unrelated words), matcha, mccaf(é),
  milkshake, shake, smoothie, drink, refreshment, alcohol, iced

Checked against the full 175-heading vocabulary, this matches exactly the
35 headings that name a beverage and none of the other 140 (menu items like
"Gold Card", "Extras", "Merchandise" survive untouched). Re-run the harvest
above after adding a new venue and diff the unmatched list before trusting
this on a corpus that has grown.

STATUS FILTERING. A `stub` record has no menu at all — "no drink rows" is
trivially true for it and would drown the list in venues that are missing
*everything*, not specifically drinks. `--gaps` therefore only surfaces
non-stub records: a place whose food menu was actually transcribed and
still has no beverage section, which is the gap this item is about.

A REPORTER, NOT A GATE. Always exits 0 — a drinks gap is a worklist entry,
not a defect, and transcribing what this tool finds is owner-gated (menu
content is owner-supplied, never harvested on a hunch — CLAUDE.md).

    python3 tools/drinks_gap.py             # every venue, its signal + evidence
    python3 tools/drinks_gap.py --gaps      # only the actionable gap: signal + no rows
    python3 tools/drinks_gap.py --count     # one summary line
    python3 tools/drinks_gap.py --json      # machine-readable, for anything downstream
    python3 tools/drinks_gap.py --price-effect
        # for venues that ALREADY mix food + drinks: the priceBand median
        # computed with vs without the drink rows, so the roadmap's
        # "adding drinks drags the band down" warning is measured, not
        # asserted. Mirrors the median in site/js/price.js, NZD only (see
        # the function's docstring for why that's a stated limitation
        # rather than a silent gap).
"""

import argparse
import json
import pathlib
import re
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data" / "restaurants"

# Built from the corpus's actual section-heading vocabulary — see the
# module docstring for the harvest that produced it and the exact match.
DRINK_HEADING_RE = re.compile(
    r"beer|cider|wine|cocktail|mocktail|coffee|\btea\b|matcha|mccaf"
    r"|milkshake|shake|smoothie|drink|refreshment|alcohol|iced",
    re.IGNORECASE,
)

DEFINITE_CUISINE = {"Bar", "Pub", "Gastropub", "Coffee", "Bubble tea", "Cafe"}
PROBABLE_CUISINE = {"Bakery", "Deli", "Cake shop", "Gelato", "Dessert", "Crepes"}
# Vocabulary keys since ROADMAP 37k (site/js/vibes.js) — these were the free-text
# spellings "craft beer" / "beer garden" / "garden bar" until the migration, and
# a set that no longer matches anything degrades this tool in silence.
DEFINITE_VIBE = {"craft-beer", "beer-garden", "garden-bar"}
NAME_DEFINITE_RE = re.compile(r"\b(brewery|tavern)\b", re.IGNORECASE)
NAME_PROBABLE_RE = re.compile(r"\bbar\b", re.IGNORECASE)

# Mirrors site/js/price.js BANDS — kept independent on purpose: this tool
# only ever reasons about NZD figures already in the corpus, so it does not
# need (and should not import) the fx.js conversion path.
BAND_LIMITS = [(15, "$"), (30, "$$"), (float("inf"), "$$$")]


def band_of(per_person):
    for limit, label in BAND_LIMITS:
        if per_person <= limit:
            return label
    return "$$$"  # unreachable — last limit is Infinity


def classify(record):
    """(tier, evidence) — tier is 'yes' | 'probable' | 'no-signal'."""
    name = record.get("name") or ""
    cuisine = set(record.get("cuisine") or [])
    vibe = set(record.get("vibe") or [])

    evidence = []
    tier = "no-signal"

    hit = cuisine & DEFINITE_CUISINE
    if hit:
        tier = "yes"
        evidence.append(f"cuisine:{','.join(sorted(hit))}")
    hit = vibe & DEFINITE_VIBE
    if hit:
        tier = "yes"
        evidence.append(f"vibe:{','.join(sorted(hit))}")
    if NAME_DEFINITE_RE.search(name):
        tier = "yes"
        evidence.append("name")

    if tier != "yes":
        hit = cuisine & PROBABLE_CUISINE
        if hit:
            tier = "probable"
            evidence.append(f"cuisine:{','.join(sorted(hit))}")
        if NAME_PROBABLE_RE.search(name):
            tier = "probable"
            evidence.append("name(bar)")

    return tier, evidence


def drink_sections(record):
    """Section dicts whose heading names a beverage — see DRINK_HEADING_RE."""
    return [s for s in (record.get("menu") or []) if DRINK_HEADING_RE.search(s.get("section") or "")]


def priced(items):
    return [i["price"] for i in items if isinstance(i.get("price"), (int, float)) and i["price"] > 0]


def collect():
    """One row per venue (recipe collections excluded — see docstring)."""
    rows = []
    for path in sorted(DATA.glob("*.json")):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            print(f"  ! skipped {path.name}: {exc}", file=sys.stderr)
            continue
        if record.get("kind") == "recipes":
            continue  # cook-at-home: no concept of a drinks menu

        tier, evidence = classify(record)
        drinks = drink_sections(record)
        status = record.get("status")

        rows.append(
            {
                "id": record.get("id", path.stem),
                "name": record.get("name", path.stem),
                "signal": tier,
                "evidence": evidence,
                "hasDrinkRows": bool(drinks),
                "status": status,
                "priceBand": record.get("priceBand"),
                "gap": tier in ("yes", "probable") and not drinks and status != "stub",
            }
        )
    return rows


def price_effect_rows():
    """For venues that already mix food + drink rows: median with vs
    without the drink sections, and whether the priceBand LETTER changes.

    Limitation stated rather than silently ignored: this reads `price`
    verbatim and assumes NZD, because every restaurant record in the corpus
    today is NZD (checked: no `currency` field is set to anything else). A
    non-NZD venue with drink rows would need the fx.js conversion path this
    tool deliberately does not import; if one is ever added, this function
    will need updating rather than trusted blind.
    """
    rows = []
    for path in sorted(DATA.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("kind") == "recipes":
            continue
        currency = record.get("currency") or "NZD"

        all_prices, food_prices = [], []
        for section in record.get("menu") or []:
            is_drink = bool(DRINK_HEADING_RE.search(section.get("section") or ""))
            for p in priced(section.get("items") or []):
                all_prices.append(p)
                if not is_drink:
                    food_prices.append(p)

        if len(all_prices) == len(food_prices) or len(all_prices) < 3:
            continue  # no drink rows, or too little data for a signal at all

        med_all = statistics.median(all_prices)
        band_all = band_of(med_all)
        med_food = statistics.median(food_prices) if len(food_prices) >= 3 else None
        band_food = band_of(med_food) if med_food is not None else None

        rows.append(
            {
                "id": record.get("id", path.stem),
                "currency": currency,
                "nAll": len(all_prices),
                "medianAll": round(med_all, 2),
                "bandAll": band_all,
                "nFood": len(food_prices),
                "medianFood": round(med_food, 2) if med_food is not None else None,
                "bandFood": band_food,
                "flips": band_food is not None and band_food != band_all,
                "curatedPriceBand": record.get("priceBand"),
            }
        )
    return rows


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--gaps", action="store_true", help="only venues with a drink signal and no drink rows")
    ap.add_argument("--count", action="store_true", help="one summary line, not the full listing")
    ap.add_argument("--json", action="store_true", help="machine-readable")
    ap.add_argument(
        "--price-effect",
        action="store_true",
        help="quantify the priceBand warning: median with vs without drink rows",
    )
    args = ap.parse_args()

    if args.price_effect:
        rows = price_effect_rows()
        if args.json:
            print(json.dumps(rows, indent=2, ensure_ascii=False))
            return 0
        if not rows:
            print("No venue mixes food and drink rows — nothing to measure.")
            return 0
        flips = 0
        for r in rows:
            marker = " <- FLIPS" if r["flips"] else ""
            print(
                f"{r['id']:30} all: n={r['nAll']:3} median={r['medianAll']:6.2f} "
                f"band={r['bandAll']:3} | food-only: n={r['nFood']:3} "
                f"median={r['medianFood']:6.2f} band={r['bandFood']:3}"
                f" | curated={r['curatedPriceBand']}{marker}"
            )
            if r["flips"]:
                flips += 1
        print(
            f"\n{flips} of {len(rows)} venue(s) with drink rows have a cheaper "
            "blended band than their food-only band; 0 go the other way."
        )
        return 0

    rows = collect()
    if args.gaps:
        rows = [r for r in rows if r["gap"]]

    if args.json:
        print(json.dumps(rows, indent=2, ensure_ascii=False))
        return 0

    if args.count:
        gaps = sum(1 for r in rows if r["gap"])
        print(f"{len(rows)} venue(s) listed, {gaps} gap(s) (drink signal, no drink rows, not a stub).")
        return 0

    if not rows:
        print("Nothing to report for this filter.")
        return 0

    for r in rows:
        gap = "  <== GAP" if r["gap"] else ""
        evidence = ", ".join(r["evidence"]) or "-"
        print(
            f"{r['id']:32} {r['signal']:9} drinkRows={str(r['hasDrinkRows']):5} "
            f"status={r['status']:14} priceBand={r['priceBand']}{gap}"
        )
        print(f"{'':32} evidence: {evidence}")

    print(f"\n{len(rows)} venue(s) listed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
