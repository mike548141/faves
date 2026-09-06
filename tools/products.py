#!/usr/bin/env python3
"""Validate the packaged-product record store in `data/products/`.

    python3 tools/products.py            # validate every record
    python3 tools/products.py --stats    # …and what the corpus holds
    python3 tools/products.py --reshoot  # products whose photos cannot answer

WHAT THIS STORE IS. Labels off packaged food in the owner's house, harvested
from his own photographs: manufacturer, identifiers, pack size, servings,
nutrition, ingredients, allergens, storage, origin. It exists because the
photographs exist and the facts on them are worth having before the packets go
in the bin; what reads it later — cook-at-home quantities, a food diary, meal
planning, or a separate app entirely — is not decided here.

WHERE IT LIVES, AND WHY IT IS NOT IN `site/data/`. ADR 0047 cuts the two stores
on rendered / not rendered, and the service worker precaches every byte of
`site/data/` onto every phone. No screen renders a barcode, a manufacturer's
address or a sodium figure, so none of this may go there. `data/` is the record
store: never served, never precached, never referenced from `site/`.

────────────────────────────────────────────────────────────────────────────
THREE RULES THAT ARE NOT NEGOTIABLE, and the reasons are not stylistic.

1. NO LOCATION. EVER. These photographs were taken in the owner's kitchen and
   137 of 183 carry EXIF GPS clustered inside one 73 m × 51 m box — his home.
   `source` records the file and the capture DATE and nothing else. A product
   record carrying lat/lng would publish a private address to a PUBLIC repo,
   and a date plus a position is a movement record. The schema has no field
   for it and this validator rejects one if it appears.

2. NO EATING EVENTS. This is a store of PRODUCTS, not of meals. "Mike had this
   for lunch on Tuesday" is health-adjacent personal data about a named person
   in a public repo. The transcripts in `intake/` are full of it; none of it
   comes through here. A record says what is on a label, never what anyone did
   with the packet.

3. AN ALLERGEN LIST IS QUOTED, NEVER INFERRED. `allergens.contains` holds what
   the label's own "Contains:" statement says, in the label's words. It is not
   the app's `contains-*` vocabulary and it is not derived from the ingredient
   list. The reason is the harvest's own evidence: an LLM pass over these same
   photos produced an ingredient list that read plausibly and had silently
   dropped two entries and changed a percentage. The owner has a peanut
   allergy. A list that is quoted can be checked against the photograph; a list
   that is reconstructed cannot, and looks identical.
────────────────────────────────────────────────────────────────────────────

WHAT A CLEAN RUN HERE DOES NOT MEAN. This checks SHAPE, not TRUTH. It cannot
tell you the sodium figure was read correctly, that the barcode digits are the
ones under the bars, or that an ingredient list is complete. Nothing but a
second person and the photograph can. What it does guarantee is that a record
which could not be read says so in `needs` rather than quietly omitting a
field — the difference between "we looked and it isn't legible" and "nobody
looked", which is otherwise invisible for ever.

Stdlib only (ADR 0001 binds the tools by habit).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "data" / "products"

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

TOP_KEYS = {
    "id", "name", "brand", "variant", "manufacturer", "identifiers", "pack",
    "servings", "nutrition", "ingredients", "allergens", "storage", "origin",
    "category", "source", "needs", "note",
}
# Deliberately closed and deliberately WITHOUT lat/lng or any place field —
# see rule 1 above. `kind` names how the fact reached us.
SOURCE_KEYS = {"kind", "files", "burst", "captured", "read"}
SOURCE_KINDS = {
    "own-photo",       # the owner photographed the packet himself
    "label-text",      # transcribed from a label he supplied as text
    "manufacturer",    # the maker's own published specification
}
MANUFACTURER_KEYS = {"name", "address", "country"}
IDENTIFIER_KEYS = {"gtin", "sku", "mpn"}
PACK_KEYS = {"size", "unit", "count"}
SERVING_KEYS = {"perPack", "size", "unit"}
NUTRITION_KEYS = {"basis", "per100", "perServing", "perPiece"}
ALLERGEN_KEYS = {"contains", "mayContain"}
UNITS = {"g", "kg", "ml", "l", "each"}
BASES = {"per-100g", "per-100ml"}
# What a panel can state. Names follow the NZ/AU panel, not a US one — this is
# a kilojoule jurisdiction, and `energyKcal` is optional precisely because most
# of these packets do not print it.
NUTRIENTS = {
    "energyKj", "energyKcal", "protein", "fatTotal", "fatSaturated",
    "fatTrans", "carbohydrate", "sugars", "dietaryFibre", "sodium",
    "calcium", "iron", "potassium",
}
# The vocabulary for "the photographs could not answer this". Every one of
# these is a re-shoot request, which is why the list is short and concrete.
NEEDS = {"nutrition", "ingredients", "allergens", "gtin", "pack", "servings",
         "manufacturer", "origin", "storage"}


def err(problems: list[str], rid: str, msg: str) -> None:
    problems.append(f"{rid}: {msg}")


def check_map(problems, rid, where, value, allowed):
    if value is None:
        return False
    if not isinstance(value, dict):
        err(problems, rid, f"{where} must be an object")
        return False
    for k in value:
        if k not in allowed:
            err(problems, rid, f"{where}.{k} is not a field this store holds "
                               f"(allowed: {', '.join(sorted(allowed))})")
    return True


def validate(path: Path, problems: list[str]) -> dict | None:
    try:
        rec = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        problems.append(f"{path.name}: not valid JSON — {e}")
        return None
    rid = rec.get("id") or path.stem

    for k in rec:
        if k not in TOP_KEYS:
            err(problems, rid, f"unknown key {k!r} — this store's fields are "
                               f"{', '.join(sorted(TOP_KEYS))}")
    if not ID_RE.match(str(rec.get("id", ""))):
        err(problems, rid, "id must be kebab-case")
    if rec.get("id") != path.stem:
        err(problems, rid, f"id must equal the filename stem ({path.stem})")
    if not str(rec.get("name", "")).strip():
        err(problems, rid, "name is required")

    check_map(problems, rid, "manufacturer", rec.get("manufacturer"), MANUFACTURER_KEYS)
    check_map(problems, rid, "identifiers", rec.get("identifiers"), IDENTIFIER_KEYS)
    check_map(problems, rid, "pack", rec.get("pack"), PACK_KEYS)
    check_map(problems, rid, "servings", rec.get("servings"), SERVING_KEYS)

    gtin = (rec.get("identifiers") or {}).get("gtin")
    if gtin is not None and not re.fullmatch(r"\d{8}|\d{12,14}", str(gtin)):
        err(problems, rid, f"gtin {gtin!r} is not 8, 12, 13 or 14 digits — a "
                           "barcode read at an angle is a wrong number, not a short one")

    pack = rec.get("pack") or {}
    if pack.get("unit") and pack["unit"] not in UNITS:
        err(problems, rid, f"pack.unit {pack['unit']!r} not in {sorted(UNITS)}")

    nut = rec.get("nutrition")
    if check_map(problems, rid, "nutrition", nut, NUTRITION_KEYS):
        if nut.get("basis") not in BASES:
            err(problems, rid, f"nutrition.basis must be one of {sorted(BASES)}")
        for panel in ("per100", "perServing", "perPiece"):
            block = nut.get(panel)
            if block is None:
                continue
            if not isinstance(block, dict):
                err(problems, rid, f"nutrition.{panel} must be an object")
                continue
            for k, v in block.items():
                if k not in NUTRIENTS:
                    err(problems, rid, f"nutrition.{panel}.{k} is not a panel row")
                elif not isinstance(v, (int, float)):
                    err(problems, rid, f"nutrition.{panel}.{k} must be a number, got {v!r}")

    alg = rec.get("allergens")
    if check_map(problems, rid, "allergens", alg, ALLERGEN_KEYS):
        for k in ALLERGEN_KEYS:
            v = alg.get(k)
            if v is not None and (not isinstance(v, list)
                                  or not all(isinstance(x, str) for x in v)):
                err(problems, rid, f"allergens.{k} must be a list of strings, "
                                   "quoted from the label")

    src = rec.get("source")
    if src is None:
        err(problems, rid, "source is required — a fact with no provenance is a rumour")
    elif check_map(problems, rid, "source", src, SOURCE_KEYS):
        if src.get("kind") not in SOURCE_KINDS:
            err(problems, rid, f"source.kind must be one of {sorted(SOURCE_KINDS)}")
        if not src.get("files"):
            err(problems, rid, "source.files must name what was read")
        for f in src.get("files") or []:
            if not isinstance(f, str) or f.startswith("/") or ".." in f:
                err(problems, rid, f"source.files entry {f!r} must be a path "
                                   "relative to intake/ingredients/")
        for k in ("captured", "read"):
            if src.get(k) and not DATE_RE.match(str(src[k])):
                err(problems, rid, f"source.{k} must be YYYY-MM-DD")

    # Rule 1, enforced rather than trusted. A location can only arrive by
    # someone adding a field, and every spelling of it is refused here.
    blob = json.dumps(rec).lower()
    for banned in ("\"lat\"", "\"lng\"", "\"latitude\"", "\"longitude\"", "\"gps\"", "\"coords\""):
        if banned in blob:
            err(problems, rid, f"{banned} is present — these photographs were taken "
                               "at a private address and this repo is public (rule 1)")

    # An address may appear in exactly ONE place: `manufacturer.address`, which
    # is a factory printed on the back of a retail packet. Anywhere else, a
    # street address in this store is a private one — these photographs were
    # taken in a kitchen, and a Kmart receipt is visible on the bench in at
    # least one frame.
    #
    # This check exists because `.leakscanignore` exempts `data/products/*.json`
    # from leakscan's `nz-address` rule: a regex cannot tell a Hastings cannery
    # from someone's house, and 32 legitimate factory addresses were
    # blocking the store. Exempting the file without replacing the check would
    # have left the one thing worth catching uncaught, so the check moved here,
    # where it can use the schema to tell the two apart. Do not delete this
    # without narrowing that glob.
    street = re.compile(r"\b\d+[A-Za-z]?\s+[A-Z][A-Za-z'\-]+(\s+[A-Z][A-Za-z'\-]+)*\s+"
                        r"(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|"
                        r"Terrace|Way|Crescent|Cres|Quay|Parade|Grove|Close)\b")
    for key, value in rec.items():
        if key == "manufacturer":
            continue
        for found in street.finditer(json.dumps(value)):
            err(problems, rid, f"{key} contains what looks like a street address "
                               f"({found.group(0)!r}). Only manufacturer.address may hold "
                               "one; these photographs were taken at a private address "
                               "and this repo is public (rule 1)")

    for n in rec.get("needs") or []:
        if n not in NEEDS:
            err(problems, rid, f"needs entry {n!r} not in {sorted(NEEDS)}")
    # The rule that makes `needs` mean something. A record with no nutrition
    # and no `needs: nutrition` is indistinguishable from one nobody looked at.
    for field, need in (("nutrition", "nutrition"), ("ingredients", "ingredients")):
        if not rec.get(field) and need not in (rec.get("needs") or []):
            err(problems, rid, f"has no {field} and does not say it needs one — "
                               f"add {need!r} to needs, or the gap is silent")
    return rec


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Validate data/products/.",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--stats", action="store_true", help="what the corpus holds")
    ap.add_argument("--reshoot", action="store_true", help="products needing another photo")
    args = ap.parse_args()

    if not STORE.exists():
        print("data/products/ does not exist yet — nothing to validate.")
        return 0
    files = sorted(STORE.glob("*.json"))
    problems: list[str] = []
    records = [r for r in (validate(p, problems) for p in files) if r]

    for p in problems:
        print(f"error: {p}")

    if args.reshoot:
        # RANKED, because an unranked list is one nobody walks. Every record
        # that lacks a barcode would otherwise sit beside one that cannot say
        # whether it contains peanuts, and the second is the only one worth
        # getting off the sofa for. The tiers are what a re-shoot BUYS, not
        # how many fields are blank.
        tiers = [
            ("🔴 SAFETY — no allergen statement was readable", {"allergens", "ingredients"}),
            ("🟠 NUTRITION — no panel was readable", {"nutrition"}),
            ("🟡 DETAIL — pack size, servings, maker, origin, storage",
             {"pack", "servings", "manufacturer", "origin", "storage"}),
            ("⚪ BARCODE only", {"gtin"}),
        ]
        placed = set()
        print(f"\nRe-shoot list — {len([r for r in records if r.get('needs')])} of "
              f"{len(records)} product(s) have a gap.\n"
              "Photograph the BACK of the pack, filling the frame with the panel.\n")
        for title, fields in tiers:
            rows = [
                r for r in records
                if r["id"] not in placed and set(r.get("needs") or []) & fields
            ]
            if not rows:
                continue
            print(f"{title} — {len(rows)}")
            for r in sorted(rows, key=lambda x: x["id"]):
                placed.add(r["id"])
                label = " ".join(x for x in (r.get("brand"), r["name"]) if x)
                print(f"  · {label}")
                print(f"      missing: {', '.join(r['needs'])}")
            print()

    if args.stats:
        have = Counter()
        for r in records:
            for f in ("nutrition", "ingredients", "allergens", "manufacturer", "pack", "servings"):
                if r.get(f):
                    have[f] += 1
            if (r.get("identifiers") or {}).get("gtin"):
                have["gtin"] += 1
        print(f"\n{len(records)} product(s):")
        for f, n in have.most_common():
            print(f"  {f:14} {n:3} ({n * 100 // max(1, len(records))}%)")

    print(f"\nscope: {len(files)} file(s) read, {len(records)} valid, {len(problems)} error(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
