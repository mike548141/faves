#!/usr/bin/env python3
"""Validate Faves restaurant data against the schema in docs/ARCHITECTURE.md.

Stdlib only, no build step. Run from the repo root or anywhere:

    python3 tools/validate.py

Exit code 0 = all good; 1 = one or more errors. Warnings never fail the
build but are printed so gaps (e.g. missing picks) stay visible.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"
RESTAURANTS = DATA / "restaurants"

SERVICES = {"dine-in", "takeaway"}
STATUSES = {"stub", "menu-complete", "verified"}
PRICE_BANDS = {"$", "$$", "$$$"}
KINDS = {"venue", "recipes"}
TAGS = {
    "v", "vg", "gf", "df",
    "contains-nuts", "contains-peanuts", "contains-shellfish",
    "contains-egg", "contains-dairy", "contains-gluten",
    "contains-soy", "contains-sesame",
    "spicy-1", "spicy-2", "spicy-3",
    "gf-option", "v-option",
}
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

errors = []
warnings = []
# {id: set(dish names)} for the whole dataset — populated before checks so
# cross-record `goesWith` ("id#Dish") references can be resolved.
ALL_NAMES = {}


def err(rid, msg):
    errors.append(f"[{rid}] {msg}")


def warn(rid, msg):
    warnings.append(f"[{rid}] {msg}")


def check_image(rid, obj, where):
    """image is an optional self-hosted path; alt is required when set."""
    img = obj.get("image")
    if img is not None and not (isinstance(img, str) and img.strip()):
        err(rid, f"{where}: image must be a non-empty string path or null")
    if isinstance(img, str) and img.strip():
        alt = obj.get("alt")
        if not (isinstance(alt, str) and alt.strip()):
            err(rid, f"{where}: alt text is required when image is set (a11y)")


def check_restaurant(path):
    rid = path.stem
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(rid, f"invalid JSON: {e}")
        return None

    # id matches filename
    if data.get("id") != rid:
        err(rid, f"id {data.get('id')!r} does not match filename")
    if not ID_RE.match(rid):
        err(rid, "filename is not kebab-case")

    # kind: "venue" (default) or "recipes" (the cook-at-home collection).
    # Recipes have no address/phone/service, so their contact fields relax.
    kind = data.get("kind", "venue")
    if kind not in KINDS:
        err(rid, f"kind {kind!r} not in {sorted(KINDS)}")
    is_recipes = kind == "recipes"

    # required string fields. name always; the location fields only make
    # sense for a real venue.
    required_strings = ("name",) if is_recipes else ("name", "area", "city", "address")
    for field in required_strings:
        if not isinstance(data.get(field), str) or not data.get(field).strip():
            err(rid, f"{field} must be a non-empty string")
    # when present on a recipe collection, location fields may be null but
    # must still be strings if given.
    if is_recipes:
        for field in ("area", "city", "address"):
            v = data.get(field)
            if v is not None and not isinstance(v, str):
                err(rid, f"{field} must be a string or null")

    # cuisine
    cuisine = data.get("cuisine")
    if not isinstance(cuisine, list) or not all(isinstance(c, str) for c in cuisine):
        err(rid, "cuisine must be a list of strings")

    # services — a non-empty subset of SERVICES for venues; recipes carry
    # none (they're neither dine-in nor takeaway), so an empty list is fine.
    services = data.get("services")
    if not isinstance(services, list):
        err(rid, "services must be a list")
    elif not services and not is_recipes:
        err(rid, "services must be a non-empty list")
    else:
        for s in services:
            if s not in SERVICES:
                err(rid, f"unknown service {s!r} (allowed: {sorted(SERVICES)})")

    # phone / website: string or null
    for field in ("phone", "website"):
        v = data.get(field)
        if v is not None and not isinstance(v, str):
            err(rid, f"{field} must be a string or null")

    # lat / lng: optional decimal coordinates for the maps handoff and
    # (later) distance sort. If given they must be real numbers in range;
    # both-or-neither. A venue without them is only a warning — a new stub
    # may land before it's geocoded.
    lat, lng = data.get("lat"), data.get("lng")
    for field, val, lo, hi in (("lat", lat, -90, 90), ("lng", lng, -180, 180)):
        if val is None:
            continue
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            err(rid, f"{field} must be a number")
        elif not (lo <= val <= hi):
            err(rid, f"{field} {val} out of range [{lo}, {hi}]")
    if (lat is None) != (lng is None):
        err(rid, "lat and lng must be set together")
    elif lat is None and not is_recipes:
        warn(rid, "no coordinates (lat/lng) set — maps opens by address only")

    # image / alt: optional self-hosted card photo; alt required when set.
    check_image(rid, data, "card image")

    # ordering: optional list of {platform, url}
    ordering = data.get("ordering")
    if ordering is not None:
        if not isinstance(ordering, list):
            err(rid, "ordering must be a list")
        else:
            for o in ordering:
                if (
                    not isinstance(o, dict)
                    or not isinstance(o.get("platform"), str)
                    or not isinstance(o.get("url"), str)
                    or not o["url"].startswith("http")
                ):
                    err(rid, f"ordering entry malformed: {o!r}")

    # hours: null, or a full week keyed mon..sun. Each day is a list of
    # [open, close] intervals ([] = closed); multiple intervals express a
    # lunch/dinner split. Times are "HH:MM" 24h; close may be null ("late"/
    # open-ended). close, when given, must be after open — past-midnight is
    # expressed with a null close, not a wrap (see ADR 0006).
    hours = data.get("hours")
    if hours is not None:
        if not isinstance(hours, dict):
            err(rid, "hours must be null or an object keyed mon..sun")
        elif set(hours) != set(DAYS):
            err(rid, f"hours must have exactly the 7 day keys {DAYS}, got {sorted(hours)}")
        else:
            for day, intervals in hours.items():
                if not isinstance(intervals, list):
                    err(rid, f"hours[{day}] must be a list of intervals")
                    continue
                for iv in intervals:
                    if not (isinstance(iv, list) and len(iv) == 2):
                        err(rid, f"hours[{day}] interval must be [open, close], got {iv!r}")
                        continue
                    o, c = iv
                    if not (isinstance(o, str) and TIME_RE.match(o)):
                        err(rid, f"hours[{day}] open {o!r} must be 'HH:MM'")
                    if c is not None and not (isinstance(c, str) and TIME_RE.match(c)):
                        err(rid, f"hours[{day}] close {c!r} must be 'HH:MM' or null")
                    if (
                        isinstance(o, str) and TIME_RE.match(o)
                        and isinstance(c, str) and TIME_RE.match(c)
                        and c <= o
                    ):
                        err(rid, f"hours[{day}] close {c} must be after open {o}")

    # status
    status = data.get("status")
    if status not in STATUSES:
        err(rid, f"status {status!r} not in {sorted(STATUSES)}")

    # verified: null or ISO date
    verified = data.get("verified")
    if verified is not None and not (isinstance(verified, str) and DATE_RE.match(verified)):
        err(rid, f"verified must be null or an ISO date (YYYY-MM-DD), got {verified!r}")

    # Curated price override (see site/js/price.js). Both optional; when set
    # they win over the median derived from the menu prices.
    price_band = data.get("priceBand")
    if price_band is not None and price_band not in PRICE_BANDS:
        err(rid, f"priceBand {price_band!r} not in {sorted(PRICE_BANDS)}")
    price_pp = data.get("pricePerPerson")
    if price_pp is not None and not (
        isinstance(price_pp, (int, float)) and not isinstance(price_pp, bool) and price_pp > 0
    ):
        err(rid, f"pricePerPerson must be a positive number, got {price_pp!r}")

    # menu + collect item names for picks check
    item_names = set()
    pairings = []  # (dish_name, ref) — validated after all names are known
    menu = data.get("menu")
    if not isinstance(menu, list):
        err(rid, "menu must be a list")
        menu = []
    for section in menu:
        if not isinstance(section, dict):
            err(rid, f"menu section malformed: {section!r}")
            continue
        if not isinstance(section.get("section"), str):
            err(rid, "menu section missing 'section' name")
        for item in section.get("items", []):
            name = item.get("name")
            if not isinstance(name, str) or not name.strip():
                err(rid, "menu item missing a name")
            else:
                item_names.add(name)
            price = item.get("price")
            if price is not None and not isinstance(price, (int, float)):
                err(rid, f"price for {name!r} must be a number or null (not a string)")
            if isinstance(price, bool):
                err(rid, f"price for {name!r} must not be a boolean")
            # code: optional venue order-number (a string, kept out of name).
            code = item.get("code")
            if code is not None and not (isinstance(code, str) and code.strip()):
                err(rid, f"code for {name!r} must be a non-empty string or absent")
            tags = item.get("tags", [])
            if not isinstance(tags, list):
                err(rid, f"tags for {name!r} must be a list")
            else:
                for t in tags:
                    if t not in TAGS:
                        err(rid, f"unknown tag {t!r} on {name!r}")

            # Recipe-only item fields (all optional). Validated whenever
            # present so a stray field on a venue item is also caught.
            for field in ("ingredients", "steps"):
                v = item.get(field)
                if v is not None and (
                    not isinstance(v, list) or not all(isinstance(x, str) for x in v)
                ):
                    err(rid, f"{field} for {name!r} must be a list of strings or absent")
            serves = item.get("serves")
            if serves is not None and (not isinstance(serves, int) or isinstance(serves, bool)):
                err(rid, f"serves for {name!r} must be an integer or absent")
            time = item.get("time")
            if time is not None and not isinstance(time, str):
                err(rid, f"time for {name!r} must be a string or absent")

            # Dish photo (optional, self-hosted); alt required when set.
            check_image(rid, item, f"item {name!r}")

            # Pairings: collect now, resolve after all names are known.
            gw = item.get("goesWith")
            if gw is not None and (
                not isinstance(gw, list) or not all(isinstance(x, str) for x in gw)
            ):
                err(rid, f"goesWith for {name!r} must be a list of strings or absent")
            elif gw:
                pairings.extend((name, ref) for ref in gw)

    # status/menu consistency
    if status == "stub" and menu:
        warn(rid, "status is 'stub' but a menu is present")
    if status in ("menu-complete", "verified") and not menu:
        err(rid, f"status is '{status}' but menu is empty")

    # picks must exist in menu exactly
    picks = data.get("picks", [])
    if not isinstance(picks, list):
        err(rid, "picks must be a list")
    else:
        for p in picks:
            if p not in item_names:
                err(rid, f"pick {p!r} does not match any menu item name")
    if status in ("menu-complete", "verified") and not picks:
        warn(rid, "no picks set yet")

    # goesWith pairings must resolve — same-record dish name, or "id#Dish".
    for dish, ref in pairings:
        if "#" in ref:
            ref_id, _, ref_name = ref.partition("#")
            if ref_id not in ALL_NAMES:
                err(rid, f"goesWith {ref!r} on {dish!r}: unknown restaurant id {ref_id!r}")
            elif ref_name not in ALL_NAMES[ref_id]:
                err(rid, f"goesWith {ref!r} on {dish!r}: no dish {ref_name!r} in {ref_id}")
        elif ref not in item_names:
            err(rid, f"goesWith {ref!r} on {dish!r} does not match a dish in this menu")

    return rid


def main():
    if not RESTAURANTS.is_dir():
        print(f"error: {RESTAURANTS} not found", file=sys.stderr)
        return 1

    index = json.loads((DATA / "index.json").read_text(encoding="utf-8"))
    if not isinstance(index, list):
        err("index", "index.json must be an array of ids")
        index = []

    files = sorted(RESTAURANTS.glob("*.json"))
    file_ids = {p.stem for p in files}

    for rid in index:
        if rid not in file_ids:
            err("index", f"id {rid!r} in index.json has no matching file")
    for fid in file_ids:
        if fid not in index:
            warn("index", f"file {fid}.json is not listed in index.json")

    # Pre-pass: collect every dish name per id so cross-record `goesWith`
    # references can be resolved during the checks below.
    for path in files:
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        names = set()
        for section in d.get("menu", []) or []:
            for item in (section.get("items", []) if isinstance(section, dict) else []):
                n = item.get("name")
                if isinstance(n, str):
                    names.add(n)
        ALL_NAMES[path.stem] = names

    for path in files:
        check_restaurant(path)

    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"ERROR:   {e}")

    n = len(files)
    if errors:
        print(f"\n{len(errors)} error(s) across {n} restaurant file(s). FAILED.")
        return 1
    print(f"\nAll {n} restaurant file(s) valid ({len(warnings)} warning(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
