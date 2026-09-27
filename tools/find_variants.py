#!/usr/bin/env python3
"""Enumerate candidate size/protein "variant ladders" and say what a merge costs.

WHY THIS EXISTS. The owner ruled (2026-09-09) that a size or a protein is a
CHOICE ON ONE DISH, not a separate dish. `490/050`'s decomposition (Theme 28)
turns that ruling into a migration, and this tool is item `28h` — nothing
downstream (`28i`…`28s`) can be sized without a real count of what it touches.

TWO POPULATIONS, and they carry opposite risk.

  A — PROSE LADDERS. A dish whose `desc` states a second price in prose —
      "Regular $14.50; large $16.00." One row, one `dishId`. Converting it to
      a real `selects` group is purely ADDITIVE: the id never moves. This is
      `find_addons.py`'s own `size-ladder` class, and this tool REUSES that
      parser (`clauses`/`classify`) rather than re-deriving the same regex a
      second time a month apart — which is exactly how Theme 14b and Theme 28b
      ended up sized off two disagreeing counts of the same field.

  B — SPLIT-ROW LADDERS. A dish already split into siblings that are one
      dish in different sizes or proteins — Abrakebabra's Chicken/Lamb/
      Vegetarian Kebab, each its own row with its own `dishId`. Merging these
      SURRENDERS ids: N sibling rows become 1 base dish + (N-1) `formerIds`.
      No tool in this repo counted this population before — `find_addons.py`
      reads prose in `desc` and cannot see a split that already happened in
      the schema.

WHAT "SIBLINGS" MEANS HERE, so a human can judge false positives. Within one
venue and one menu SECTION (never across sections — "Kebab" and "Kebab
Nachos" are different dishes that happen to share a word), two or more items
are siblings when each one's name, after stripping exactly one LEADING or
TRAILING token that names a protein/filling or a size, leaves the SAME
remainder. "Chicken Kebab" and "Lamb Kebab" both strip to "kebab"; "Ham
Burger" and "Cheese Burger" strip to nothing (neither "ham" nor "cheese" is in
the vocabulary below) and are correctly left alone — they are different
recipes, not the same dish in different fillings. The vocabulary is a
judgement call, stated in full as `PROTEIN_WORDS`/`SIZE_WORDS` below, and is
the single biggest source of false positives or negatives this tool can have;
eyeball the `--only` output for a venue before trusting a count from it.

SHAPE. `protein` (the row differs by filling), `size` (the row differs by
portion), or `size × protein` — a protein-shaped group where a member's own
`desc` ALSO carries a population-A prose size ladder, i.e. the protein is the
row and the size is the prose on it (Abrakebabra's Kebab family: eight rows by
filling, each one ALSO priced "Regular $x; large $y" in its own description).

DIFFICULTY. `mechanical` when every sibling agrees on `tags`, on `desc` once
its prices are blanked out, and on `prices` (the per-channel map) — differing
only in `name` and `price`, which is the whole point of a ladder. Otherwise
`needs-human`, naming which of those three fields is the one that disagrees.

WHAT JOINS INTO A SURRENDERED ID. For every group, one member is the arbitrary
placeholder survivor (first in file order — WHICH one survives is `28o`/`28p`'s
call, not this tool's; the counts below do not depend on the choice, since
merging N rows into 1 always surrenders N-1 ids regardless of which one that
is). For every OTHER member, this tool reports what currently keys off its
`dishId`: a row in `data/history/prices/<venue>.json`, a row in
`data/images/<venue>.json`, an entry in the venue's `picks`, or an incoming
`goesWith` reference (same-venue or cross-venue `id#Dish`) from any dish in
the corpus.

EXIT 0, ALWAYS — like `find_addons.py`. This is prose and judgement (which
word is a "protein", which merge is "mechanical" enough), and a gate that can
never reach zero gets switched off (this repo's own lesson, ADR 0072).

    python3 tools/find_variants.py                  # every group, by venue
    python3 tools/find_variants.py --quiet           # the tallies only
    python3 tools/find_variants.py --only abrakebabra  # one venue (repeatable)
    python3 tools/find_variants.py --json            # machine-readable
    python3 tools/find_variants.py --selftest        # break-probes; see below

Stdlib only (ADR 0001). Reads only; never writes menu data.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"
PRICE_HISTORY = ROOT / "data" / "history" / "prices"
IMAGES = ROOT / "data" / "images"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import find_addons as addons  # noqa: E402 — reuse its prose parser, not a copy of it


# --- population B's vocabulary ---------------------------------------------
# The single biggest source of false positives/negatives in this tool. Kept
# narrow on purpose: a word only belongs here if, in the corpus read while
# building this tool, it occupied the SAME slot as an unambiguous protein or
# size word in a real ladder (Abrakebabra's Kebab/Iskender/Burger/Souvlaki/
# Turkish-Pizza families; Wellington Kebab Grill's Kebabs/Salad/Greek-pita
# families; Spices Indian's Biryani section; kk-malaysian's Curry/Laksa
# sections; Takeaway at Churton's Fried-Rice/Chow-Mein/Chop-Suey/Curry-on-Rice/
# Egg-Fu-Young/Satay/Black-Bean families). Deliberately EXCLUDES words that are
# toppings rather than fillings — "cheese", "egg", "ham", "mushroom",
# "hawaiian" — because Takeaway at Churton's "Burgers (Standard)" section
# proves those name genuinely different recipes, not the same burger in a
# different protein (Ham/Cheese/Egg/Mushroom/Hawaiian Burger span $7.50–$9.30
# with no shared desc template; Chicken/Fish/Vegetarian Burger in the SAME
# section are the real ladder). "Diablo" and "Supreme" are not proteins but
# are kept: at Abrakebabra they occupy the identical slot, in the identical
# section, against the identical desc template as Chicken/Lamb/Vegetarian —
# the ladder's own name for its hottest and its house-special member.
PROTEIN_WORDS = {
    "chicken", "lamb", "beef", "pork", "mutton", "duck", "goat",
    "prawn", "prawns", "shrimp", "fish", "seafood", "squid", "calamari",
    "tofu", "paneer", "halloumi", "falafel",
    "vegetarian", "vegetable", "veg", "vege", "vegan",
    "mixed", "mix", "combination", "steak", "bacon",
    "muciver", "mucver",  # wellington-kebab-grill's own spelling of mücver
    "diablo", "supreme",
}

SIZE_WORDS = {
    "small", "regular", "medium", "large", "mini", "king", "jumbo",
    "family", "personal", "single", "double", "triple", "half", "full",
    "junior", "entree", "entrée",
}

MODIFIER_VOCAB = (("protein", PROTEIN_WORDS), ("size", SIZE_WORDS))

_STRIP_PUNCT = re.compile(r"[()/,:]")
_STRIP_HYPHEN = re.compile(r"\s*-\s*")
_STRIP_OTHER = re.compile(r"[^a-z0-9&\s]")


def normalize_tokens(name):
    """A dish name as lowercase word tokens, punctuation flattened to spaces.

    Parenthetical and hyphenated modifiers matter here — "Nasi Lemak
    (Chicken)"/"Nasi Lemak (Beef)" and "Steamed Rice - Small" are both real
    ladders in the corpus — so both are folded to plain word boundaries rather
    than dropped.
    """
    s = (name or "").lower()
    s = _STRIP_PUNCT.sub(" ", s)
    s = _STRIP_HYPHEN.sub(" ", s)
    s = _STRIP_OTHER.sub(" ", s)
    return s.split()


def strip_modifier(tokens):
    """Remove exactly one leading or trailing protein/size token.

    Leading is tried first (the overwhelming pattern: "Chicken Kebab"), then
    trailing (the minority pattern: "Steamed Rice - Small", "Nasi Lemak
    (Chicken)"). Returns (word, kind, remainder) or (None, None, tokens)
    unchanged. The remainder must be non-empty — a bare "Chicken" has nothing
    left to be a sibling of.
    """
    if len(tokens) < 2:
        return None, None, tokens
    for kind, vocab in MODIFIER_VOCAB:
        if tokens[0] in vocab:
            return tokens[0], kind, tokens[1:]
    for kind, vocab in MODIFIER_VOCAB:
        if tokens[-1] in vocab:
            return tokens[-1], kind, tokens[:-1]
    return None, None, tokens


def desc_signature(desc):
    """`desc` with every price blanked out, so two siblings whose only
    difference is the number after "Regular $" still compare equal.

    Reuses `find_addons.MONEY` — the same pattern that already knows "$14.50"
    from "$1" — rather than a second money regex that could disagree with it.
    """
    return addons.MONEY.sub("$_", desc or "").strip()


def has_size_ladder_prose(item):
    """True when this item's OWN `desc` carries a population-A prose size
    ladder — the test for the `size × protein` shape upgrade. Reuses
    `find_addons.clauses`/`classify` directly, at item granularity, rather
    than matching against `scan()`'s truncated `where` strings (which are not
    unique and were never meant to be a join key).
    """
    for clause in addons.clauses(item.get("desc")):
        cls, _ = addons.classify(clause, name=item.get("name") or "")
        if cls == "size-ladder":
            return True
    return False


# --- loading -----------------------------------------------------------------

def _load(only=None):
    files = sorted(VENUES.glob("*.json"))
    if only:
        wanted = set(only)
        files = [f for f in files if f.stem in wanted]
        missing = wanted - {f.stem for f in files}
        if missing:
            print(f"error: no such venue file(s): {', '.join(sorted(missing))}", file=sys.stderr)
            return None
    return files


def load_records(only=None):
    files = _load(only)
    if files is None:
        return None
    records = []
    for path in files:
        try:
            records.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError as exc:
            print(f"error: {path.name}: {exc}", file=sys.stderr)
    return records


def load_price_history():
    """{venue: {dishId: [superseded rows]}} from `data/history/prices/`."""
    out = {}
    if not PRICE_HISTORY.is_dir():
        return out
    for path in sorted(PRICE_HISTORY.glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        by_id = {}
        for row in doc.get("rows", []) or []:
            did = (row.get("key") or {}).get("dishId")
            if did:
                by_id.setdefault(did, []).append(row)
        out[doc.get("venue", path.stem)] = by_id
    return out


def load_images():
    """{venue: {dishId: entry}} from `data/images/`."""
    out = {}
    if not IMAGES.is_dir():
        return out
    for path in sorted(IMAGES.glob("*.json")):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        by_id = {}
        for entry in doc.get("images", []) or []:
            did = entry.get("dishId")
            if did:
                by_id[did] = entry
        out[doc.get("venue", path.stem)] = by_id
    return out


def build_goeswith_index(records):
    """Every outgoing `goesWith` reference in the corpus, as a flat list of
    (source_venue, source_dish, ref_string) — so an incoming lookup for a
    surrendered id is a linear scan rather than a second cross-record pass
    over the whole tree.
    """
    out = []
    for record in records:
        vid = record.get("id", "?")
        for section in record.get("menu", []) or []:
            if not isinstance(section, dict):
                continue
            for item in section.get("items", []) or []:
                if not isinstance(item, dict):
                    continue
                for ref in item.get("goesWith") or []:
                    if isinstance(ref, str):
                        out.append((vid, item.get("name") or "", ref))
    return out


def incoming_goes_with(index, venue, dish_id, dish_name):
    hits = []
    for src_venue, src_dish, ref in index:
        if "#" in ref:
            ref_venue, _, ref_name = ref.partition("#")
            if ref_venue == venue and ref_name == dish_name:
                hits.append(f"{src_venue}#{src_dish}")
        elif src_venue == venue and ref in (dish_id, dish_name):
            hits.append(f"{src_venue}#{src_dish}")
    return hits


# --- population A: prose ladders --------------------------------------------

def population_a(records):
    """(offer_count, {(venue, dishId)}, {venue}) for `find_addons`'s own
    `size-ladder` class, re-derived at item granularity so rows are countable
    (its `scan()` reports truncated, non-unique `where` strings).
    """
    offers = 0
    rows = set()
    venues = set()
    for record in records:
        vid = record.get("id", "?")
        for section in record.get("menu", []) or []:
            if not isinstance(section, dict):
                continue
            sname = section.get("section") or ""
            is_combo_section = False  # combo-ness is per row below
            for item in section.get("items", []) or []:
                if not isinstance(item, dict):
                    continue
                iname = item.get("name") or ""
                did = item.get("dishId") or iname
                is_combo = bool(addons.COMBO_CONTEXT.search(f"{iname} {sname}"))
                price = item.get("price")
                for clause in addons.clauses(item.get("desc")):
                    cls, _ = addons.classify(clause, name=iname, section=sname)
                    if cls != "size-ladder":
                        continue
                    if is_combo and not addons._other_prices(clause, price):
                        continue  # mirrors scan()'s combo-prose suppression
                    offers += 1
                    rows.add((vid, did))
                    venues.add(vid)
    return offers, rows, venues


# --- population B: split-row ladders ----------------------------------------

def find_variant_groups(record):
    """Every candidate sibling group in one venue record — section-scoped,
    size >= 2, each member individually stripped of exactly one modifier
    token. See the module docstring for what "siblings" means and why.
    """
    vid = record.get("id", "?")
    groups = []
    for section in record.get("menu", []) or []:
        if not isinstance(section, dict):
            continue
        sname = section.get("section") or ""
        buckets = {}
        for item in section.get("items", []) or []:
            if not isinstance(item, dict):
                continue
            iname = item.get("name") or ""
            # The row IS an add-on (ADR 0049), not a size/protein choice on a
            # dish — "Extra falafel"/"Extra mucver"/"Extra halloumi" at
            # wellington-kebab-grill's own Extras section is the false
            # positive that found this: three add-on options, each a
            # DIFFERENT topping priced separately, not one dish in three
            # fillings. Reuses `find_addons`'s own anchored detector rather
            # than a second guess at the same rule.
            if addons.ADDON_ROW_NAME.match(iname):
                continue
            # A bundle of several items (Theme 14f), not a portion of one —
            # pizza-hut's "Double/Triple Value Deal (Delivered)" is the false
            # positive that found this: "Double"/"Triple" are stripped as
            # SIZE_WORDS, but the deals differ in CONTENTS, not portion. Same
            # detector `find_addons.scan()` uses to route a row to 14f.
            if addons.COMBO_CONTEXT.search(f"{iname} {sname}"):
                continue
            word, kind, remainder = strip_modifier(normalize_tokens(iname))
            if word is None or not remainder:
                continue
            base = " ".join(remainder)
            buckets.setdefault(base, []).append((item, word, kind))
        for base, members in buckets.items():
            if len(members) < 2:
                continue  # a group of one is not a ladder — never reported
            groups.append(dict(venue=vid, section=sname, base=base, members=members))
    return groups


def classify_shape(group):
    """(shape, explanation) for one group. See the module docstring."""
    kinds = {kind for _, _, kind in group["members"]}
    prose_members = [item.get("name") for item, _, _ in group["members"]
                      if has_size_ladder_prose(item)]
    if kinds == {"protein"}:
        if prose_members:
            return ("size × protein",
                    f"protein varies by row; {len(prose_members)}/{len(group['members'])} "
                    f"row(s) also carry a prose size ladder in their own desc")
        return "protein", "the row varies by filling, no nested size prose"
    if kinds == {"size"}:
        if prose_members:
            return ("size × protein",
                    f"size varies by row AND {len(prose_members)} row(s) carry their own "
                    "prose ladder too — unexpected, check by hand")
        return "size", "the row varies by portion"
    return ("mixed-modifier",
            f"members disagree on modifier KIND ({sorted(kinds)}) — not one of the "
            "three named shapes; eyeball this group")


def classify_difficulty(members):
    """(level, {field: [distinct normalised values]}) for one group's items.

    `members` is a list of the raw item dicts (not the (item, word, kind)
    triples `find_variant_groups` returns) so this stays a pure function a
    fixture can call directly — the shape the selftest's break-probes need.
    """
    diverging = {}

    tag_sets = [tuple(sorted(it.get("tags") or [])) for it in members]
    if len(set(tag_sets)) > 1:
        diverging["tags"] = tag_sets

    descs = [desc_signature(it.get("desc")) for it in members]
    if len(set(descs)) > 1:
        diverging["desc"] = descs

    prices = [json.dumps(it.get("prices"), sort_keys=True) for it in members]
    if len(set(prices)) > 1:
        diverging["prices"] = prices

    level = "needs-human" if diverging else "mechanical"
    return level, diverging


def surrendered_report(group, price_hist, images, goeswith_index):
    """(survivor_name, [{id, name, joins: {...}}]) for one group.

    The survivor is the first member in file order — an arbitrary
    placeholder, not a migration decision (`28o`/`28p` own that). The
    surrendered COUNT never depends on which member is chosen; what CAN
    depend on it is which id's history/images/picks/goesWith this prints, so
    the placeholder is named up front.
    """
    vid = group["venue"]
    members = [item for item, _, _ in group["members"]]
    survivor, *rest = members
    out = []
    ph = price_hist.get(vid, {})
    im = images.get(vid, {})
    picks = group.get("_picks", [])
    for item in rest:
        did = item.get("dishId")
        name = item.get("name")
        joins = {}
        if did and did in ph:
            joins["priceHistory"] = len(ph[did])
        if did and did in im:
            joins["image"] = im[did].get("file")
        if did and did in picks or name in picks:
            joins["picks"] = True
        gw = incoming_goes_with(goeswith_index, vid, did, name)
        if gw:
            joins["goesWith"] = gw
        out.append(dict(id=did, name=name, joins=joins))
    return survivor.get("dishId") or survivor.get("name"), out


# --- reporting ---------------------------------------------------------------

def build_report(records):
    price_hist = load_price_history()
    images = load_images()
    goeswith_index = build_goeswith_index(records)

    a_offers, a_rows, a_venues = population_a(records)

    b_groups = []
    for record in records:
        groups = find_variant_groups(record)
        for g in groups:
            g["_picks"] = record.get("picks") or []
        b_groups.extend(groups)

    b_rows = {(g["venue"], (item.get("dishId") or item.get("name")))
              for g in b_groups for item, _, _ in g["members"]}
    b_venues = {g["venue"] for g in b_groups}
    b_ids_surrendered = sum(len(g["members"]) - 1 for g in b_groups)

    overlap = a_rows & b_rows

    shapes = {"protein": 0, "size": 0, "size × protein": 0, "mixed-modifier": 0}
    difficulty_counts = {"mechanical": 0, "needs-human": 0}
    field_divergence = {"tags": 0, "desc": 0, "prices": 0}

    enriched = []
    for g in b_groups:
        shape, shape_note = classify_shape(g)
        shapes[shape] = shapes.get(shape, 0) + 1
        members_raw = [item for item, _, _ in g["members"]]
        level, diverging = classify_difficulty(members_raw)
        difficulty_counts[level] += 1
        for field in diverging:
            field_divergence[field] += 1
        survivor, surrendered = surrendered_report(g, price_hist, images, goeswith_index)
        enriched.append(dict(
            venue=g["venue"], section=g["section"], base=g["base"],
            members=[it.get("name") for it in members_raw],
            shape=shape, shape_note=shape_note,
            difficulty=level, diverging=sorted(diverging),
            survivor=survivor, surrendered=surrendered,
        ))

    return dict(
        population_a=dict(offers=a_offers, rows=len(a_rows), venues=len(a_venues)),
        population_b=dict(groups=len(b_groups), rows=len(b_rows), venues=len(b_venues),
                           ids_surrendered=b_ids_surrendered),
        overlap_rows=len(overlap),
        shapes=shapes,
        difficulty=difficulty_counts,
        field_divergence=field_divergence,
        groups=enriched,
    )


def print_report(report, quiet=False):
    by_venue = {}
    for g in report["groups"]:
        by_venue.setdefault(g["venue"], []).append(g)

    if not quiet:
        for venue in sorted(by_venue):
            rows = by_venue[venue]
            print(f"\n## {venue} ({len(rows)} group(s))")
            for g in rows:
                print(f"  § {g['section']} — \"{g['base']}\" "
                      f"[{g['shape']}, {g['difficulty']}]")
                print(f"      members: {', '.join(g['members'])}")
                print(f"      ↳ {g['shape_note']}")
                if g["diverging"]:
                    print(f"      ↳ diverges on: {', '.join(g['diverging'])}")
                print(f"      survivor (placeholder, not a ruling): {g['survivor']}")
                for s in g["surrendered"]:
                    joins = ", ".join(f"{k}={v}" for k, v in s["joins"].items()) or "nothing joins"
                    print(f"      surrenders {s['id']!r} ({s['name']!r}): {joins}")

    a = report["population_a"]
    b = report["population_b"]
    print(f"\nPopulation A (prose size ladders, reusing find_addons's `size-ladder` class): "
          f"{a['offers']} offer(s) on {a['rows']} row(s), {a['venues']} venue(s). "
          f"0 ids at risk — a prose ladder never moves an id.")
    print(f"Population B (split-row ladders): {b['groups']} group(s) / {b['rows']} row(s) / "
          f"{b['venues']} venue(s) — {b['ids_surrendered']} dishId(s) would be surrendered "
          f"(one survivor id per group, arbitrary placeholder — see above).")
    print(f"In both (a population-B row whose own desc ALSO carries a population-A prose "
          f"ladder): {report['overlap_rows']} row(s).")

    print("\nShape, of the population-B groups:")
    for shape in ("protein", "size", "size × protein", "mixed-modifier"):
        n = report["shapes"].get(shape, 0)
        if n or shape != "mixed-modifier":
            print(f"  {shape:<16} {n:>4}")

    print("\nMerge difficulty, of the population-B groups:")
    for level in ("mechanical", "needs-human"):
        print(f"  {level:<14} {report['difficulty'][level]:>4}")
    print("  (needs-human groups diverge on:", end=" ")
    print(", ".join(f"{f} {n}" for f, n in report["field_divergence"].items() if n), end="")
    print(")")


def print_roadmap_comparison(report):
    """The item's own numbers, printed beside today's — never silently
    swapped for them. `28h`'s own lesson: a number typed into a roadmap item
    has gone stale here at least five times.
    """
    a, b = report["population_a"], report["population_b"]
    print("\nROADMAP 28h's numbers (measured at an older commit, e50c0ee, with a "
          "throwaway script) vs today's, from THIS tool:")
    print(f"  population A     roadmap 336 offers / 187 rows / 11 venues     "
          f"measured {a['offers']} offers / {a['rows']} rows / {a['venues']} venues")
    print(f"  population B     roadmap 133 groups / 381 rows / 21 venues / 248 ids     "
          f"measured {b['groups']} groups / {b['rows']} rows / {b['venues']} venues / "
          f"{b['ids_surrendered']} ids")
    print(f"  in both          roadmap 42 rows     measured {report['overlap_rows']} rows")
    print(f"  shape            roadmap protein 78 / size 47 / size×protein 8     "
          f"measured protein {report['shapes'].get('protein', 0)} / "
          f"size {report['shapes'].get('size', 0)} / "
          f"size×protein {report['shapes'].get('size × protein', 0)}")
    print(f"  difficulty       roadmap mechanical 63 / needs-human 70     "
          f"measured mechanical {report['difficulty']['mechanical']} / "
          f"needs-human {report['difficulty']['needs-human']}")


# --- selftest ----------------------------------------------------------------

def _fixture_members(*, agree=True):
    base = dict(name="Chicken Kebab", dishId="chicken-kebab",
                desc="Served in flat bread. Regular $14.50; large $16.00.",
                tags=["contains-gluten"], price=14.5)
    sib = dict(name="Lamb Kebab", dishId="lamb-kebab",
               desc="Served in flat bread. Regular $14.00; large $15.50.",
               tags=["contains-gluten"], price=14.0)
    if not agree:
        sib = dict(sib, tags=["contains-gluten", "v"])
    return [base, sib]


def selftest():
    """Break-probes named in roadmap `310/…/050-28h`:
    - siblings whose tags agree classify mechanical;
    - siblings whose tags diverge do not, and the divergence names `tags`;
    - a group of one is never reported;
    - the unmutated corpus still classifies without error;
    - and a probe that fails if the difficulty classifier itself is broken.
    """
    failures = 0

    def check(name, ok):
        nonlocal failures
        failures += 0 if ok else 1
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")

    level, diverging = classify_difficulty(_fixture_members(agree=True))
    check("agreeing tags/desc/prices classify mechanical", level == "mechanical")

    level, diverging = classify_difficulty(_fixture_members(agree=False))
    check("diverging tags classify needs-human", level == "needs-human")
    check("…and name `tags` as the diverging field", "tags" in diverging)

    lone_record = {
        "id": "fixture-lone", "menu": [
            {"section": "Curry", "items": [
                {"name": "Chicken Curry", "dishId": "chicken-curry", "desc": None,
                 "price": 18.0, "tags": []},
            ]},
        ],
    }
    check("a group of one is never reported",
          find_variant_groups(lone_record) == [])

    pair_record = {
        "id": "fixture-pair", "menu": [
            {"section": "Curry", "items": [
                {"name": "Chicken Curry", "dishId": "chicken-curry", "desc": None,
                 "price": 18.0, "tags": []},
                {"name": "Lamb Curry", "dishId": "lamb-curry", "desc": None,
                 "price": 19.0, "tags": []},
            ]},
        ],
    }
    groups = find_variant_groups(pair_record)
    check("two siblings ARE reported, as one group", len(groups) == 1)
    if groups:
        shape, _ = classify_shape(groups[0])
        check("…classified `protein`", shape == "protein")

    real_records = load_records()
    try:
        report = build_report(real_records)
        crashed = False
    except Exception as exc:  # noqa: BLE001 — the assertion IS "it does not crash"
        crashed = True
        print(f"  FAIL  the unmutated corpus raised {exc!r}")
    if not crashed:
        check("the unmutated real corpus is classified without error and finds groups",
              report["population_b"]["groups"] > 0)
        print(f"        ({report['population_b']['groups']} group(s), "
              f"{report['population_a']['offers']} prose offer(s) — see the plain run "
              "for the full comparison against the roadmap item's numbers)")

    # The breaker: a classifier broken to always say "mechanical" must fail
    # the diverging-tags case above, or this whole selftest is decorative
    # (ADR 0072) — it would pass identically whether classify_difficulty
    # worked or had been gutted.
    def _broken_always_mechanical(members):
        return "mechanical", {}

    real_level, _ = classify_difficulty(_fixture_members(agree=False))
    broken_level, _ = _broken_always_mechanical(_fixture_members(agree=False))
    check("BREAKER: a classifier hard-wired to `mechanical` disagrees with the "
          "real one on the diverging-tags fixture (proves the case above has teeth)",
          real_level != broken_level)

    total = failures
    print(f"\n{'OK' if not total else 'REFUSED'} — selftest {'passed' if not total else 'failed'}, "
          f"{total} failure(s)")
    return 1 if total else 0


# --- CLI ---------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", metavar="VENUE", action="append",
                    help="report just this venue id (repeatable); default is every venue")
    ap.add_argument("--quiet", action="store_true", help="the tallies only, no groups")
    ap.add_argument("--json", action="store_true", help="machine-readable report on stdout")
    ap.add_argument("--selftest", action="store_true",
                    help="prove the classifiers still discriminate (break-probes)")
    args = ap.parse_args(argv)

    if args.selftest:
        return selftest()

    records = load_records(args.only)
    if records is None:
        return 1

    report = build_report(records)

    if args.json:
        json.dump(report, sys.stdout, indent=2, ensure_ascii=False)
        print()
        return 0

    print_report(report, quiet=args.quiet)
    if not args.only:
        print_roadmap_comparison(report)
    return 0


if __name__ == "__main__":
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
