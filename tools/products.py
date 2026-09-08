#!/usr/bin/env python3
"""Validate the packaged-product record store in `data/products/`.

    python3 tools/products.py            # validate every record
    python3 tools/products.py --stats    # …and what the corpus holds
    python3 tools/products.py --reshoot  # products whose photos cannot answer
    python3 tools/products.py --coverage # …and how much of the intake was READ

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

────────────────────────────────────────────────────────────────────────────
`--coverage` — THE RECONCILIATION, and why it lives HERE rather than in
`tools/product_bursts.py`.

Two tools existed and nothing joined them. `product_bursts.py` prints the
POPULATION (183 photographs, 59 bursts); this one validates the RECORDS (87).
"How much of the intake has been read" was therefore a question the repo could
not answer, and 15 bursts sat uncited for two days with every gate green — a
guard whose output is identical whether or not the thing it guards is complete
(ADR 0072).

The join belongs to this file because the claim it settles is a claim about
THIS STORE: has it read what it was given? `--reshoot` already reports the gaps
*inside* a record; `--coverage` reports the gaps *between* the records and the
photographs, which is the same question one level out. `product_bursts.py` is
the population's tool and knows nothing about `data/products/` — making it read
this store would invert the dependency, and a burst grouper that fails because a
product record is malformed is a worse tool than the one we have. So this file
shells out to it exactly as it shells out to `intake_exif.py`.

🛑 `source.burst` IS SOMETIMES A COMPOSITE — `"b026+b045"`, one product whose
front and back landed either side of a 45-second pause. An exact-string
comparison reports 17 uncited bursts where the true answer is 15, because
`b026` and `b051` are named only inside a composite. The field is PARSED here,
never compared, and `--probe` prints the naive answer beside the parsed one so
that the difference stays measurable rather than remembered.

🔑 A GAP IS NOT A FAILURE, AND A CONTRADICTION IS. Uncited bursts and unnamed
photographs are WORK — they are reported with counts and the exit code stays 0,
because a check that can never reach zero is a check somebody switches off
inside a month. What exits 1 is the store disagreeing with the population: a
record citing a burst or a file that does not exist, an exclusion naming a burst
that does not exist or whose file count has moved, or an exclusion for a burst
that also has a product record.

`data/intake/not-products.json` is how a burst says "read, and deliberately not
a product" — the 26 recipe and menu-leaflet photographs. It carries what each
burst holds, who read it and when, so the answer is EVIDENCE rather than a
silence. Its shape is checked on every run, including runs with no `intake/`.

WHAT `--coverage` CANNOT TELL YOU. That a record is *about* the photograph it
cites. It joins identifiers, so a record citing the wrong burst reconciles
perfectly. Only the images can settle that.
────────────────────────────────────────────────────────────────────────────

Stdlib only (ADR 0001 binds the tools by habit).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "data" / "products"
# Read, and deliberately not a product — see the `--coverage` block above.
NOT_PRODUCTS = ROOT / "data" / "intake" / "not-products.json"
# `intake/**` is gitignored, so this folder is absent on a fresh clone and in
# CI. That is not an error: `--coverage` says so and exits 0.
PHOTOS_DEFAULT = "intake/ingredients/raw_food_photos"
# `source.files` are relative to `intake/ingredients/`; the burst grouper emits
# whatever path it was given. Everything is normalised onto the first by
# cutting at this segment, so the two are comparable however the tool was run.
INGREDIENTS_SEGMENT = "/ingredients/"

BURST_RE = re.compile(r"^b\d{3}$")
NOT_PRODUCT_KEYS = {"id", "files", "kind", "what", "read", "readBy", "seeAlso"}
# Closed on purpose. A free-text `kind` is a place to write "misc" and stop
# looking, which is the exact silence this file exists to replace.
NOT_PRODUCT_KINDS = {"recipe", "menu", "other"}

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# How a transcriber marks "the pack says more than the photograph shows".
TRUNCATED = re.compile(r"\[cut off\]|illegible|\.\.\.|…")

TOP_KEYS = {
    "id", "name", "brand", "variant", "manufacturer", "identifiers", "pack",
    "servings", "nutrition", "ingredients", "allergens", "storage", "origin",
    "category", "source", "alsoRead", "needs", "note",
}
# A second reading, from somewhere other than the photograph. `source` stays
# the primary — what came off the packet in this house — and `alsoRead` names
# every field that did NOT, and where it came from instead.
#
# WHY THE FIELD LIST IS MANDATORY. A record whose allergens came from a
# manufacturer's website and whose nutrition came from the photograph is two
# readings of two artefacts, and the website's product may not be the packet in
# the cupboard: recipes get reformulated, pack sizes differ by market, and a
# "Contains" line that is right for the current SKU can be wrong for the one
# photographed last November. Saying WHICH fields travelled is what lets a
# reader weigh them separately. A single `source.kind` could not.
ALSO_READ_KEYS = {"kind", "ref", "read", "fields"}
ALSO_READ_KINDS = {
    "manufacturer",  # the maker's own published specification
    "retailer",      # a supermarket's product listing (weaker: they transcribe too)
}
# Only facts. Never `source`, `needs` or `note` — those describe the record,
# not the product, and cannot be "read from" anywhere.
CITABLE = {
    "allergens", "ingredients", "nutrition", "identifiers", "manufacturer",
    "origin", "storage", "pack", "servings",
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
ALLERGEN_KEYS = {"contains", "mayContain", "declaredNone"}
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
        for k in ("contains", "mayContain"):
            v = alg.get(k)
            if v is not None and (not isinstance(v, list)
                                  or not all(isinstance(x, str) for x in v)):
                err(problems, rid, f"allergens.{k} must be a list of strings, "
                                   "quoted from the label")
            # 🛑 AN EMPTY LIST IS THE ONE SHAPE THIS FIELD MAY NOT TAKE.
            # `contains: []` is indistinguishable from `contains: []` written by
            # someone who never found the statement — it looks like a fact and
            # carries none. This repo's whole allergen doctrine is that absence
            # of a tag means NOT STATED, never FREE OF IT (ADR 0025), and an
            # empty list quietly says the opposite.
            #
            # It is refused rather than tolerated because it was written for
            # real: a lookup found a maker declaring its drinks "free of
            # Allergens as defined by the Food Standards Code" and recorded that
            # as `contains: []`. The claim was true AND the record was worse than
            # the source — the same page also warns of possible gluten
            # cross-contamination, which an empty list has nowhere to put. Say it
            # with `declaredNone` and put the caveat in `mayContain`, or say
            # nothing and keep `allergens` in `needs`.
            if isinstance(v, list) and not v:
                err(problems, rid, f"allergens.{k} is an empty list — that reads as "
                                   "'free of allergens' and this repo never asserts "
                                   "an absence. Use allergens.declaredNone for a "
                                   "maker's own statement, or omit the field and "
                                   "keep 'allergens' in needs")
        dn = alg.get("declaredNone")
        if dn is not None:
            if dn is not True:
                err(problems, rid, "allergens.declaredNone is a claim or it is absent; "
                                   "it may only ever be `true`")
            if alg.get("contains"):
                err(problems, rid, "allergens.declaredNone cannot sit beside a "
                                   "non-empty contains — the maker cannot both "
                                   "declare none and declare some")
            # A declared absence is the strongest thing this store can say and
            # the most dangerous to get wrong, so it must be attributable.
            cited = any("allergens" in (e.get("fields") or [])
                        for e in rec.get("alsoRead") or [])
            if not cited:
                err(problems, rid, "allergens.declaredNone must cite where the maker "
                                   "says it — add an alsoRead entry naming 'allergens'")

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

    also = rec.get("alsoRead")
    if also is not None:
        if not isinstance(also, list) or not also:
            err(problems, rid, "alsoRead must be a non-empty list")
            also = []
        for i, entry in enumerate(also):
            where = f"alsoRead[{i}]"
            if not check_map(problems, rid, where, entry, ALSO_READ_KEYS):
                continue
            if entry.get("kind") not in ALSO_READ_KINDS:
                err(problems, rid, f"{where}.kind must be one of {sorted(ALSO_READ_KINDS)}")
            ref = str(entry.get("ref", ""))
            if not ref.startswith("https://"):
                err(problems, rid, f"{where}.ref must be an https URL — a citation "
                                   "nobody can re-open is not a citation")
            if not DATE_RE.match(str(entry.get("read", ""))):
                err(problems, rid, f"{where}.read must be YYYY-MM-DD")
            fields = entry.get("fields")
            if not isinstance(fields, list) or not fields:
                err(problems, rid, f"{where}.fields must name what came from there")
                continue
            for f in fields:
                if f not in CITABLE:
                    err(problems, rid, f"{where}.fields entry {f!r} not in {sorted(CITABLE)}")
                # The rule that stops a citation floating free of anything: a
                # field cited to a website must actually be in the record.
                elif not rec.get(f):
                    err(problems, rid, f"{where} cites {f!r} but the record has no {f}")

    for n in rec.get("needs") or []:
        if n not in NEEDS:
            err(problems, rid, f"needs entry {n!r} not in {sorted(NEEDS)}")
    # The rule that makes `needs` mean something. A record with no nutrition
    # and no `needs: nutrition` is indistinguishable from one nobody looked at.
    for field, need in (("nutrition", "nutrition"), ("ingredients", "ingredients")):
        if not rec.get(field) and need not in (rec.get("needs") or []):
            err(problems, rid, f"has no {field} and does not say it needs one — "
                               f"add {need!r} to needs, or the gap is silent")

    # A PARTIAL READING MUST KEEP SAYING IT IS PARTIAL. An ingredient string
    # that trails off at the frame edge still occupies a field that reads as
    # complete, and the danger is not the ingredients — it is what a truncated
    # list implies about the allergens beside it.
    #
    # Written after exactly that: Angel Bay's allergen line was photographed as
    # "…, soy, milk." and stored as `contains: ["Soy","Milk"]`. The maker and a
    # retailer independently give "wheat, gluten, egg, soy, milk" — the stored
    # list was short by three, and nothing in the record's shape said so. The
    # check found thirteen more of the same shape on its first run.
    if TRUNCATED.search(str(rec.get("ingredients") or "")) and \
            "ingredients" not in (rec.get("needs") or []):
        err(problems, rid, "the ingredient string is cut off (it carries an ellipsis "
                           "or an illegibility marker) but 'ingredients' is not in "
                           "needs — a partial reading in a field that reads as "
                           "complete is how a short allergen list looks finished")
    return rec


def parse_burst(raw: object) -> list[str] | None:
    """The burst ids a `source.burst` field names, or None if it is not a shape
    this store defines.

    🛑 THIS IS THE FUNCTION THE NAIVE VERSION DOES NOT HAVE. One product's front
    and back can land either side of the grouper's 45-second gap, so a record
    may cite `"b026+b045"`. Comparing that string against the burst list marks
    BOTH halves uncited and reports 17 gaps where there are 15 — a wrong answer
    that looks exactly like a right one, on the two bursts a reader is least
    likely to check. `--probe` prints both numbers for that reason.

    The re-emit rule is ADR 0076's: a parse that cannot reproduce its input
    exactly has not read the field, it has guessed at it. So an unfamiliar
    spelling — spaces round the `+`, a trailing separator, `B026`, a range —
    comes back None and is reported as a malformed field rather than being
    quietly half-understood.
    """
    if not isinstance(raw, str):
        return None
    parts = raw.split("+")
    if not parts or not all(BURST_RE.match(p) for p in parts):
        return None
    if "+".join(parts) != raw:
        return None
    return parts


def load_not_products(problems: list[str]) -> dict[str, dict]:
    """`data/intake/not-products.json`, shape-checked.

    Checked on EVERY run, not only under `--coverage`, because the shape can be
    checked with no `intake/` present and `--coverage` cannot — so on a fresh
    clone and in CI this is the only reading the file ever gets.
    """
    if not NOT_PRODUCTS.exists():
        return {}
    try:
        doc = json.loads(NOT_PRODUCTS.read_text())
    except json.JSONDecodeError as e:
        problems.append(f"data/intake/not-products.json: not valid JSON — {e}")
        return {}
    rows = doc.get("bursts")
    if not isinstance(rows, list):
        problems.append("data/intake/not-products.json: 'bursts' must be a list")
        return {}
    out: dict[str, dict] = {}
    for i, row in enumerate(rows):
        rid = f"not-products[{i}]"
        if not isinstance(row, dict):
            problems.append(f"{rid}: must be an object")
            continue
        for k in row:
            if k not in NOT_PRODUCT_KEYS:
                problems.append(f"{rid}: unknown key {k!r} (allowed: "
                                f"{', '.join(sorted(NOT_PRODUCT_KEYS))})")
        bid = row.get("id")
        if not isinstance(bid, str) or not BURST_RE.match(bid):
            problems.append(f"{rid}: id must be a burst id like 'b003', got {bid!r}")
            continue
        if bid in out:
            problems.append(f"{rid}: {bid} is listed twice")
        if not isinstance(row.get("files"), int) or row["files"] < 1:
            problems.append(f"{rid} ({bid}): files must be the number of photographs "
                            "in the burst — it is the tripwire that fires when the "
                            "burst grows and nobody looked again")
        if row.get("kind") not in NOT_PRODUCT_KINDS:
            problems.append(f"{rid} ({bid}): kind must be one of "
                            f"{sorted(NOT_PRODUCT_KINDS)}")
        if not str(row.get("what", "")).strip():
            problems.append(f"{rid} ({bid}): 'what' must say what the images hold — "
                            "an exclusion with no account of what was seen is the "
                            "silence this file replaces")
        if not DATE_RE.match(str(row.get("read", ""))):
            problems.append(f"{rid} ({bid}): read must be YYYY-MM-DD")
        if not str(row.get("readBy", "")).strip():
            problems.append(f"{rid} ({bid}): readBy must name who looked")
        out[bid] = row
    return out


def read_population(photos: Path) -> dict[str, list[str]]:
    """Burst id → the photographs in it, as paths relative to intake/ingredients/.

    Delegates to `product_bursts.py`, which delegates to `intake_exif.py`. Only
    the ids and the file names are taken: that output also carries the EXIF
    lat/lng, and those coordinates sit on a private address in a public repo
    (rule 1). Nothing here reads them and nothing here prints them.
    """
    out = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "product_bursts.py"),
         "--dir", str(photos), "--json"],
        capture_output=True, text=True, cwd=ROOT)
    if out.returncode != 0:
        sys.exit(f"product_bursts.py failed:\n{out.stderr.strip()}")
    doc = json.loads(out.stdout or "{}")
    if doc.get("undated"):
        # An undated photo is in no burst at all, so it can never be reconciled.
        print(f"⚠️  {len(doc['undated'])} photograph(s) carry no EXIF "
              "DateTimeOriginal and are in no burst — they cannot be covered.")

    def rel(p: str) -> str:
        i = p.find(INGREDIENTS_SEGMENT)
        return p[i + len(INGREDIENTS_SEGMENT):] if i >= 0 else p

    return {b["id"]: [rel(f) for f in b["files"]] for b in doc.get("bursts", [])}


def coverage(records: list[dict], photos: Path, excluded: dict[str, dict],
             probe: bool) -> list[str]:
    """Reconcile the photograph population against the records. Returns the
    CONTRADICTIONS (which fail the run); gaps are printed and do not."""
    bursts = read_population(photos)
    photo_set = {f for files in bursts.values() for f in files}

    cited: dict[str, list[str]] = {}
    cited_naive: set[str] = set()
    named: set[str] = set()
    bad: list[str] = []
    for rec in records:
        src = rec.get("source") or {}
        raw = src.get("burst")
        if raw is not None:
            cited_naive.add(str(raw))
            ids = parse_burst(raw)
            if ids is None:
                bad.append(f"{rec['id']}: source.burst {raw!r} is not a burst id or a "
                           "'+'-joined list of them")
            else:
                for b in ids:
                    cited.setdefault(b, []).append(rec["id"])
        for f in src.get("files") or []:
            named.add(f)

    for b, ids in sorted(cited.items()):
        if b not in bursts:
            bad.append(f"source.burst names {b}, which is not in the population "
                       f"(cited by {', '.join(ids)})")
    for f in sorted(named - photo_set):
        bad.append(f"source.files names {f!r}, which is not in the population")
    for bid, row in sorted(excluded.items()):
        if bid not in bursts:
            bad.append(f"not-products.json excludes {bid}, which is not in the "
                       "population")
        elif len(bursts[bid]) != row.get("files"):
            bad.append(f"not-products.json says {bid} holds {row.get('files')} "
                       f"photograph(s); the burst holds {len(bursts[bid])}. Someone "
                       "added to it after it was read")
        if bid in cited:
            bad.append(f"not-products.json says {bid} is not a product, but "
                       f"{', '.join(cited[bid])} was harvested from it")

    uncited = sorted(set(bursts) - set(cited) - set(excluded))
    unnamed = sorted(f for f in photo_set - named
                     if not any(f in bursts[b] for b in excluded if b in bursts))

    print(f"\nCoverage — {len(photo_set)} photograph(s) in {len(bursts)} burst(s) "
          f"against {len(records)} product record(s).")
    print(f"  bursts harvested   {len(cited):3}")
    print(f"  bursts read, not a product   {len(excluded):3} "
          f"({sum(len(bursts.get(b, [])) for b in excluded)} photograph(s))")
    print(f"  bursts with neither          {len(uncited):3}")
    print(f"  photographs no source.files names  {len(unnamed):3}")

    if uncited:
        print("\nBursts with no product record and no entry in "
              "data/intake/not-products.json:")
        for b in uncited:
            print(f"  · {b}  {len(bursts[b])} photograph(s)")
    if unnamed:
        print("\nPhotographs inside a harvested burst that no source.files names "
              "— the burst was read, these frames were not:")
        for f in unnamed:
            owner = next((b for b, fs in bursts.items() if f in fs), "?")
            print(f"  · {f}  ({owner})")

    if probe:
        # The break-probe, kept rather than remembered. Composites are the whole
        # reason `parse_burst` exists, and a difference of two is invisible in a
        # number that nobody re-derives.
        # Deliberately computed WITHOUT the exclusions, so the two numbers move
        # only with the parse. Subtracting the read-but-not-a-product bursts
        # would fold two variables into one figure and hide the one this probe
        # is about.
        naive = sorted(set(bursts) - cited_naive)
        parsed = sorted(set(bursts) - set(cited))
        comps = sorted(c for c in cited_naive if "+" in c)
        print(f"\n--probe (before the exclusions are applied): exact-string "
              f"comparison reports {len(naive)} uncited burst(s); parsing "
              f"reports {len(parsed)}.")
        print(f"  composite source.burst fields: {', '.join(comps) or 'none'}")
        extra = sorted(set(naive) - set(parsed))
        print(f"  only the naive version calls these uncited: "
              f"{', '.join(extra) or 'none'}")

    return bad


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Validate data/products/.",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--stats", action="store_true", help="what the corpus holds")
    ap.add_argument("--reshoot", action="store_true", help="products needing another photo")
    ap.add_argument("--coverage", action="store_true",
                    help="reconcile the photograph population against the records")
    ap.add_argument("--photos", default=PHOTOS_DEFAULT,
                    help=f"the intake photo folder (default: {PHOTOS_DEFAULT}). "
                         "It is gitignored, so it is absent on a fresh clone and "
                         "in CI; --coverage says so and exits 0. A worktree has "
                         "none either — point this at the primary checkout's copy.")
    ap.add_argument("--probe", action="store_true",
                    help="with --coverage: print the naive exact-string answer "
                         "beside the parsed one (the composite-burst break-probe)")
    args = ap.parse_args()

    if not STORE.exists():
        print("data/products/ does not exist yet — nothing to validate.")
        return 0
    files = sorted(STORE.glob("*.json"))
    problems: list[str] = []
    records = [r for r in (validate(p, problems) for p in files) if r]
    excluded = load_not_products(problems)

    if args.coverage:
        photos = (ROOT / args.photos).resolve()
        if not photos.exists():
            # Not a failure. `intake/**` is gitignored by design, so this is the
            # ordinary state everywhere but the owner's own checkout.
            print(f"intake not present ({args.photos}) — coverage cannot be "
                  "computed here. The exclusions file was still shape-checked.")
        else:
            problems += coverage(records, photos, excluded, args.probe)

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
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260). Prints as the run's last line, on every
    # exit path including a refusal.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
