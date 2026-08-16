#!/usr/bin/env python3
"""Validate Faves restaurant data against the schema in docs/ARCHITECTURE.md.

Stdlib only, no build step. Run from the repo root or anywhere:

    python3 tools/validate.py

Exit code 0 = all good; 1 = one or more errors. Warnings never fail the
build but are printed so gaps (e.g. missing picks) stay visible.
"""

from zoneinfo import ZoneInfo
import json
import math
import re
import subprocess
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
# The time dimension (ADR 0023) allows reduced precision — "2019" and "2019-05"
# are as valid as "2019-05-21". A menu scan dated only by its year must be
# recordable as such rather than rounded up to an invented day.
PART_DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
LIFECYCLE_EVENTS = {"closed-temporarily", "reopened", "closed-permanently"}
# How a reading was obtained (ADR 0031, PRINCIPLES §9). Closed set, kept in
# step with VERIFY_METHODS in site/js/temporal.js. Each value names a SOURCE
# CLASS, never a person — the no-personal-data rule binds the schema too.
VERIFY_METHODS = {
    "in-store", "paper-menu", "official-site",
    "phone", "delivery-app", "third-party",
}
SEASONS = {"summer", "autumn", "winter", "spring"}
# How many of a group's options you may take (ADR 0048). Kept in step with
# site/js/addons.js `selectionAllowed`, which enforces the same two words.
ADD_ON_SELECT = {"one", "many"}
ADD_ON_GROUP_KEYS = {"id", "name", "select", "max", "price", "options"}
ADD_ON_OPTION_KEYS = {"name", "price", "tags"}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

errors = []
warnings = []


def _load_renames():
    """The rename table from site/js/renames.js, read as text.

    Parsing a JS object literal with a regex is crude, and right here: the table
    is a frozen list of quoted string pairs by construction, and the alternative
    is a second copy of it in JSON that could disagree with the one the browser
    actually uses — which is exactly the drift this check exists to catch."""
    src = (ROOT / "site" / "js" / "renames.js").read_text(encoding="utf-8")
    body = re.search(r"RENAMED\s*=\s*Object\.freeze\(\{(.*?)\}\)", src, re.S)
    if not body:
        return {}
    return dict(re.findall(r'"([^"]+)"\s*:\s*"([^"]+)"', body.group(1)))


RENAMED = _load_renames()


def _load_contradicts():
    """The dietary-claim contradiction table from site/js/addons.js, read as
    text — same crude technique as _load_renames above, and right for the same
    reason: the alternative is a second copy of the table in Python that could
    disagree with the one the browser actually composes tags with.

    Returns {} when the file or the table cannot be read; the check below turns
    that into an error rather than a pass, because a table that silently reads
    empty is a gate that can never fire."""
    try:
        src = (ROOT / "site" / "js" / "addons.js").read_text(encoding="utf-8")
    except OSError:
        return {}
    body = re.search(r"CONTRADICTS\s*=\s*\{(.*?)\n\};", src, re.S)
    if not body:
        return {}
    return {
        key: set(re.findall(r'"([^"]+)"', arr))
        for key, arr in re.findall(r"(\w+)\s*:\s*\[([^\]]*)\]", body.group(1))
    }


CONTRADICTS = _load_contradicts()


# BCP-47, loosely: a 2-3 letter primary subtag plus optional script/region/variant
# subtags. Deliberately a shape check, not a registry lookup — the IANA registry
# is not in the stdlib, and a shape check catches the realistic error (a language
# NAME where a tag belongs: "Thai", "Chinese") without pretending to more
# authority than it has.
BCP47_RE = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$")


def check_translations(rid, obj, where, fields):
    """`translations` on a dish or section: {field: {bcp47: text}} (ADR 0044).

    Additive by design — the canonical `name`/`desc` stays a plain string,
    because it is the dish's IDENTITY (slugs, picks, stored hearts), not just
    display text. So this validates the sidecar and never the identity."""
    tr = obj.get("translations")
    if tr is None:
        return
    if not isinstance(tr, dict):
        err(rid, f"{where}: translations must be an object")
        return
    for field, by_lang in tr.items():
        if field not in fields:
            err(rid, f"{where}: translations has no such field {field!r} (allowed: {sorted(fields)})")
            continue
        if not isinstance(obj.get(field), str) or not obj[field].strip():
            err(rid, f"{where}: translations.{field} but the record has no {field} to translate")
            continue
        if not isinstance(by_lang, dict) or not by_lang:
            err(rid, f"{where}: translations.{field} must be a non-empty object keyed by language tag")
            continue
        for tag, text in by_lang.items():
            if not BCP47_RE.match(str(tag)):
                err(rid, f"{where}: translations.{field} key {tag!r} is not a BCP-47 tag")
            if not isinstance(text, str) or not text.strip():
                err(rid, f"{where}: translations.{field}[{tag!r}] must be a non-empty string")


def _load_fx_rates():
    """Rate codes from site/data/fx.json, so a venue can't use a currency the
    app has no rate for. Read rather than hard-coded — the file is refreshed by
    a scheduled job, and a second list here would drift the first time it ran."""
    path = ROOT / "site" / "data" / "fx.json"
    try:
        return set(json.loads(path.read_text(encoding="utf-8")).get("rates", {}))
    except (OSError, json.JSONDecodeError):
        return set()


FX_RATES = _load_fx_rates()

CURRENCY_RE = re.compile(r"^[A-Z]{3}$")

def valid_timezone(tz):
    """True when `tz` is an IANA zone. Uses the stdlib's own tz database rather
    than a hand-kept list — the same source the browser's Intl consults, so a
    zone that passes here is one the app can actually format in."""
    try:
        ZoneInfo(tz)
        return True
    except Exception:
        return False

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


def check_rating(rid, obj, where):
    """Optional curated household rating on `obj` (a venue or a menu item): our
    own static 1..5 mark, distinct from the device-local personal ratings (which
    never touch the repo). When present it must be an integer 1..5 — a bool or a
    float is rejected. Absent = not rated (the field ships dormant until the
    owner supplies real values). Scale widened from 1..3 to 1..5 in ADR 0019."""
    r = obj.get("rating")
    if r is None:
        return
    if isinstance(r, bool) or not isinstance(r, int) or not (1 <= r <= 5):
        err(rid, f"{where}: rating must be an integer 1..5 or absent, got {r!r}")


def check_coords(rid, obj, where):
    """lat/lng on `obj`: optional decimal coordinates for the maps handoff and
    distance sort. If given they must be real numbers in range, both-or-neither.
    Returns True when a usable pair is present. Used for both the top-level venue
    (single location) and each branch of a multi-location venue."""
    lat, lng = obj.get("lat"), obj.get("lng")
    for field, val, lo, hi in (("lat", lat, -90, 90), ("lng", lng, -180, 180)):
        if val is None:
            continue
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            err(rid, f"{where}: {field} must be a number")
        elif not (lo <= val <= hi):
            err(rid, f"{where}: {field} {val} out of range [{lo}, {hi}]")
    if (lat is None) != (lng is None):
        err(rid, f"{where}: lat and lng must be set together")
    return lat is not None and lng is not None


def is_part_date(v):
    return isinstance(v, str) and bool(PART_DATE_RE.match(v))


def start_of(d):
    """Widen a partial date to the first day it can mean, for ordering."""
    return d if len(d) == 10 else (f"{d}-01-01" if len(d) == 4 else f"{d}-01")


def check_temporal(rid, obj, field, where, scalar_check=None):
    """A field carrying the time dimension (ADR 0023): either the plain value,
    or a dated series [{value, from?, recorded?, note?}] oldest first. Returns
    the list of values so the caller can type-check each the way it always did —
    dating a field must never weaken the checks on what it holds.

    `from` is world time (when it became true out there), `recorded` is record
    time (when we read it). An entry needs at least one of them once a series
    has more than one entry, or nothing can order it."""
    val = obj.get(field)
    if not isinstance(val, list):
        return [val] if field in obj else []

    values = []
    prev_key = None
    for i, e in enumerate(val):
        at = f"{where}: {field}[{i}]"
        if not isinstance(e, dict) or "value" not in e:
            err(rid, f"{at} must be an object with a 'value'")
            continue
        values.append(e["value"])
        for k in ("from", "recorded"):
            if k in e and e[k] is not None and not is_part_date(e[k]):
                err(rid, f"{at}: {k} must be an ISO date (YYYY[-MM[-DD]]), got {e[k]!r}")
        if "note" in e and e["note"] is not None and not isinstance(e["note"], str):
            err(rid, f"{at}: note must be a string")
        # A reading that came from somewhere other than the venue's own
        # `verifiedBy` states its own method; otherwise it inherits (ADR 0031).
        if "method" in e and e["method"] is not None and e["method"] not in VERIFY_METHODS:
            err(rid, f"{at}: method {e['method']!r} not in {sorted(VERIFY_METHODS)}")
        for k in e:
            if k not in ("value", "from", "recorded", "note", "method"):
                err(rid, f"{at}: unknown key {k!r}")
        # Ordering: a series the reader has to re-sort is a series that will be
        # read wrong by hand. Undated entries may only lead.
        key = e.get("from") or e.get("recorded")
        if key is None:
            if len(val) > 1 and i > 0:
                err(rid, f"{at}: needs a 'from' or 'recorded' — only the first entry may be undated")
        elif is_part_date(key):
            if prev_key is not None and start_of(key) < start_of(prev_key):
                err(rid, f"{at}: entries must be oldest first ({key} follows {prev_key})")
            prev_key = key
    if len(val) == 1 and not (val[0].get("from") or val[0].get("recorded")):
        warn(rid, f"{where}: {field} is a one-entry series with no date — a plain value says the same thing")
    return values


def check_available(rid, obj, where):
    """Optional availability window on a menu section or dish (ADR 0023):
    {from?, to?, offBy?, season?, note?}. `from`/`to` are world time (the days it
    was first/last on the menu); `offBy` is record time (the day we confirmed it
    was gone, for the usual case where the real removal date is unknowable);
    `season` recurs every year."""
    a = obj.get("available")
    if a is None:
        return
    if not isinstance(a, dict):
        err(rid, f"{where}: available must be an object or absent")
        return
    for k in ("from", "to", "offBy"):
        if k in a and a[k] is not None and not is_part_date(a[k]):
            err(rid, f"{where}: available.{k} must be an ISO date (YYYY[-MM[-DD]]), got {a[k]!r}")
    if "season" in a and a["season"] is not None and a["season"] not in SEASONS:
        err(rid, f"{where}: available.season must be one of {sorted(SEASONS)}, got {a['season']!r}")
    if "note" in a and a["note"] is not None and not isinstance(a["note"], str):
        err(rid, f"{where}: available.note must be a string")
    for k in a:
        if k not in ("from", "to", "offBy", "season", "note"):
            err(rid, f"{where}: available has unknown key {k!r}")
    if is_part_date(a.get("from")) and is_part_date(a.get("to")) and start_of(a["to"]) < start_of(a["from"]):
        err(rid, f"{where}: available.to {a['to']} is before available.from {a['from']}")
    if not any(k in a for k in ("from", "to", "offBy", "season")):
        err(rid, f"{where}: available must state at least one of from/to/offBy/season")


def check_revisions(rid, obj, where):
    """Optional dated log of what changed about a dish — the muffin that went
    vegan (ADR 0023). `date` is world time (when it changed), `recorded` is
    record time (when we learned); at least one, because an undated change
    answers none of the questions the log exists for."""
    revs = obj.get("revisions")
    if revs is None:
        return
    if not isinstance(revs, list):
        err(rid, f"{where}: revisions must be a list or absent")
        return
    for i, rv in enumerate(revs):
        at = f"{where}: revisions[{i}]"
        if not isinstance(rv, dict):
            err(rid, f"{at} must be an object")
            continue
        if not (isinstance(rv.get("change"), str) and rv["change"].strip()):
            err(rid, f"{at}: change must be a non-empty string")
        for k in ("date", "recorded"):
            if k in rv and rv[k] is not None and not is_part_date(rv[k]):
                err(rid, f"{at}: {k} must be an ISO date (YYYY[-MM[-DD]]), got {rv[k]!r}")
        if not (is_part_date(rv.get("date")) or is_part_date(rv.get("recorded"))):
            err(rid, f"{at}: needs a 'date' (when it changed) or 'recorded' (when we learned)")
        for k in rv:
            if k not in ("date", "recorded", "change"):
                err(rid, f"{at}: unknown key {k!r}")


# Closed set, mirroring site/js/needs.js KINDS. Kept in step by
# test_validate.py, which fails if the two drift: a kind the renderer doesn't
# know is silently dropped on the page, so the data would claim a gap the
# reader never sees.
NEED_KINDS = ("price", "ingredients", "allergens", "name", "availability")


def check_needs(rid, obj, where):
    """Optional per-dish record of what we know we DON'T know about it.

    Distinguishes "the shop prices this on application" from "we failed to read
    it" — `price: null` had been carrying both. Also the worklist: `needs.py`
    derives it, so ROADMAP.md never has to name a dish again.

    `what` is a closed set; `note` says why it is open; `since` is record time
    (the day we noticed), never world time — nothing happened in the world.
    """
    needs = obj.get("needs")
    if needs is None:
        return
    if not isinstance(needs, list):
        err(rid, f"{where}: needs must be a list or absent")
        return
    if not needs:
        err(rid, f"{where}: needs must not be empty — omit it instead")
        return
    seen = set()
    for i, n in enumerate(needs):
        at = f"{where}: needs[{i}]"
        if not isinstance(n, dict):
            err(rid, f"{at} must be an object")
            continue
        what = n.get("what")
        if what not in NEED_KINDS:
            err(rid, f"{at}: what must be one of {', '.join(NEED_KINDS)}, got {what!r}")
        elif what in seen:
            err(rid, f"{at}: duplicate what {what!r} — one entry per kind")
        else:
            seen.add(what)
        if "note" in n and n["note"] is not None:
            if not (isinstance(n["note"], str) and n["note"].strip()):
                err(rid, f"{at}: note must be a non-empty string or absent")
        if "since" in n and n["since"] is not None and not is_part_date(n["since"]):
            err(rid, f"{at}: since must be an ISO date (YYYY[-MM[-DD]]), got {n['since']!r}")
        for k in n:
            if k not in ("what", "note", "since"):
                err(rid, f"{at}: unknown key {k!r}")
    # A priced dish claiming its price is unread is a leftover: the renderer
    # shows the price and hides the "?", so the gap would sit in the data
    # forever, invisible, and needs.py would keep reporting a job that's done.
    if obj.get("price") is not None and any(
        isinstance(n, dict) and n.get("what") == "price" for n in needs
    ):
        err(rid, f"{where}: has a price but still claims needs.what='price' — drop the entry")


def check_add_on_price(rid, obj, where):
    """A price on an add-on group or one of its options (ADR 0048 §2).

    Optional, non-negative, finite, never a bool — and, unlike a dish price,
    **never null**. A dish price carries three states: a number; a `null`
    meaning "the shop prices this on application", rendered `—`; and a `null`
    plus a `needs: price` entry meaning "we failed to read it", rendered `?`
    (site/js/needs.js `priceUnknown`). An add-on must not inherit that
    ambiguity — nothing on the add-on screen can tell the three apart — so if we
    do not know what an extra costs it stays in the prose and is not structured
    yet."""
    if "price" not in obj:
        return
    p = obj["price"]
    if p is None:
        err(
            rid,
            f"{where}: price must not be null — a dish price uses null for two "
            "different unknowns (priced on application, and unread); an add-on "
            "price says a number or says nothing, and free is 0 (ADR 0048)",
        )
        return
    if isinstance(p, bool) or not isinstance(p, (int, float)):
        err(rid, f"{where}: price must be a number, got {p!r}")
    elif not math.isfinite(p):
        err(rid, f"{where}: price must be a finite number, got {p!r}")
    elif p < 0:
        err(rid, f"{where}: price must not be negative, got {p!r}")


def check_add_on_groups(rid, data):
    """`record.addOnGroups`: the venue's priced extras, defined once and named
    by id from a section or a dish (ADR 0048). Returns {id: group} so the caller
    can resolve those references once the whole menu has been read.

    The check that carries the weight is **a price must be resolvable**: absent
    on the option *and* absent on its group is an error, not a zero. The
    roadmap wanted a missing price to mean free so twelve free sauces need not
    say so twelve times; the terseness is worth having and the implication is
    not, because a transcriber who simply forgets a price would then produce a
    silently free add-on and an under-stated total with nothing to catch it.
    The group-level default gets the terseness back — `"price": 0` once for the
    whole sauce board — while leaving every option's cost answerable."""
    groups = data.get("addOnGroups")
    if groups is None:
        return {}
    if not isinstance(groups, list) or not groups:
        err(rid, "addOnGroups must be a non-empty list or absent")
        return {}

    defs = {}
    for i, g in enumerate(groups):
        where = f"addOnGroups[{i}]"
        if not isinstance(g, dict):
            err(rid, f"{where} must be an object")
            continue
        gid = g.get("id")
        if not (isinstance(gid, str) and ID_RE.match(gid)):
            err(rid, f"{where}: id must be a non-empty kebab-case string, got {gid!r}")
        else:
            where = f"add-on group {gid!r}"
            if gid in defs:
                err(rid, f"{where}: duplicate add-on group id — a reference to it is ambiguous")
            else:
                defs[gid] = g

        if not (isinstance(g.get("name"), str) and g["name"].strip()):
            err(rid, f"{where}: name must be a non-empty string (what the venue calls the group)")
        if g.get("select") not in ADD_ON_SELECT:
            err(rid, f"{where}: select must be one of {sorted(ADD_ON_SELECT)}, got {g.get('select')!r}")
        check_add_on_price(rid, g, where)

        options = g.get("options")
        if not isinstance(options, list) or not options:
            err(rid, f"{where}: options must be a non-empty list")
            options = []

        # "Choose up to 3" is a rule the venue set, so it lives in the data — but
        # only a pick-many group can have one, and a cap above the options is a
        # cap that can never bind, i.e. a rule nobody wrote.
        if g.get("max") is not None:
            m = g["max"]
            if isinstance(m, bool) or not isinstance(m, int) or m < 1:
                err(rid, f"{where}: max must be an integer >= 1, got {m!r}")
            elif g.get("select") != "many":
                err(rid, f"{where}: max only means anything when select is 'many' — a pick-one group already caps at 1")
            elif options and m > len(options):
                err(rid, f"{where}: max {m} exceeds the {len(options)} option(s) in the group")

        seen_names = set()
        for j, o in enumerate(options):
            at = f"{where}: options[{j}]"
            if not isinstance(o, dict):
                err(rid, f"{at} must be an object")
                continue
            oname = o.get("name")
            if not (isinstance(oname, str) and oname.strip()):
                err(rid, f"{at}: name must be a non-empty string")
            else:
                at = f"{where}: option {oname!r}"
                if oname in seen_names:
                    err(rid, f"{at}: duplicate option name in this group")
                seen_names.add(oname)
            check_add_on_price(rid, o, at)
            if "price" not in o and "price" not in g:
                err(
                    rid,
                    f"{at}: no price, and its group sets no default — an add-on "
                    "price must be resolvable from the data. Free is written as 0 "
                    "(ADR 0048), never left out",
                )
            # tags is REQUIRED and may be empty: an option that states nothing is
            # a real state the composer must be able to see (it degrades the
            # dish's dietary claim as "not-stated"), and it must not be
            # indistinguishable from a transcriber who never got to the field.
            tags = o.get("tags")
            if not isinstance(tags, list):
                err(rid, f"{at}: tags is required and must be a list (empty is allowed — it means 'not stated')")
            else:
                for t in tags:
                    if t not in TAGS:
                        err(rid, f"{at}: unknown tag {t!r}")
            # A mistyped key here is not a harmless no-op: `"prive": 2.5` inside
            # a group defaulting to `price: 0` validates clean and sells the
            # extra free, which is the exact under-stated total the resolvable-
            # price rule above exists to prevent. Every other nested object in
            # this file rejects unknown keys; so does this one.
            for k in o:
                if k not in ADD_ON_OPTION_KEYS:
                    err(rid, f"{at}: unknown key {k!r}")

        for k in g:
            if k not in ADD_ON_GROUP_KEYS:
                err(rid, f"{where}: unknown key {k!r}")
    return defs


def check_add_ons_only(rid, section, defs):
    """`section.addOnsOnly`: this section's rows are offered as add-ons, so the
    menu screen doesn't print them twice (owner ruling, 2026-08-16).

    The rows deliberately STAY in the data — a stored heart, a personal rating
    or a shared order link naming "Extra halloumi" all still resolve, and
    deleting them would break every one of those silently.

    The gate that earns the flag: **every dish in the section must be reachable
    as an option somewhere in this record.** Hiding a section whose rows are not
    all offered elsewhere would take real, orderable food off the menu and leave
    nothing pointing at it — the flag would be a delete wearing a nicer name.
    """
    if "addOnsOnly" not in section:
        return
    where = f"section {section.get('section')!r}"
    if section["addOnsOnly"] is not True:
        err(rid, f"{where}: addOnsOnly must be true or absent, got {section['addOnsOnly']!r}")
        return
    offered = {o.get("name") for g in defs.values() for o in (g.get("options") or []) if isinstance(o, dict)}
    missing = sorted(
        i["name"] for i in section.get("items", []) if isinstance(i.get("name"), str) and i["name"] not in offered
    )
    if missing:
        err(
            rid,
            f"{where}: addOnsOnly hides {len(missing)} dish(es) that no add-on "
            f"group offers, so nothing on the menu would reach them: "
            f"{', '.join(missing[:5])}",
        )


def collect_add_on_refs(rid, obj, where):
    """The add-on group ids `obj` names (`section.addOns` or `item.addOns`).

    Shape-checked here and returned as (id, where) pairs; resolved against the
    record's own definitions by the caller, once they are all known."""
    ids = obj.get("addOns")
    if ids is None:
        return []
    if not isinstance(ids, list) or not ids:
        err(rid, f"{where}: addOns must be a non-empty list of add-on group ids, or absent")
        return []
    out = []
    for x in ids:
        if not (isinstance(x, str) and x.strip()):
            err(rid, f"{where}: addOns entries must be non-empty group ids, got {x!r}")
        else:
            out.append((x, where))
    return out


def check_lifecycle(rid, data):
    """The venue's dated lifecycle (ADR 0023). `added` is record time and is
    REQUIRED — every venue entered Faves on a knowable day, and git knows it.
    `opened` is world time and is optional: absent means we never established
    it, which is honest, where a guess would not be. States are transitions
    with dates; there is deliberately no `closed: true` flag to go stale."""
    lc = data.get("lifecycle")
    if lc is None:
        err(rid, "lifecycle is required — at minimum {\"added\": \"<ISO date>\"} (ADR 0023)")
        return
    if not isinstance(lc, dict):
        err(rid, "lifecycle must be an object")
        return
    if not is_part_date(lc.get("added")):
        err(rid, f"lifecycle.added must be an ISO date (when it entered Faves), got {lc.get('added')!r}")
    if "opened" in lc and lc["opened"] is not None and not is_part_date(lc["opened"]):
        err(rid, f"lifecycle.opened must be an ISO date or absent, got {lc['opened']!r}")
    if is_part_date(lc.get("opened")) and is_part_date(lc.get("added")) and start_of(lc["added"]) < start_of(lc["opened"]):
        warn(rid, f"lifecycle: added {lc['added']} precedes opened {lc['opened']} — one of them is wrong")
    for k in lc:
        if k not in ("opened", "added", "events"):
            err(rid, f"lifecycle has unknown key {k!r}")

    events = lc.get("events")
    if events is None:
        return
    if not isinstance(events, list):
        err(rid, "lifecycle.events must be a list or absent")
        return
    prev = None
    state = "trading"
    for i, e in enumerate(events):
        at = f"lifecycle.events[{i}]"
        if not isinstance(e, dict):
            err(rid, f"{at} must be an object")
            continue
        if e.get("type") not in LIFECYCLE_EVENTS:
            err(rid, f"{at}: type must be one of {sorted(LIFECYCLE_EVENTS)}, got {e.get('type')!r}")
        if not is_part_date(e.get("date")):
            err(rid, f"{at}: date must be an ISO date, got {e.get('date')!r}")
        elif prev is not None and start_of(e["date"]) < start_of(prev):
            err(rid, f"{at}: events must be oldest first ({e['date']} follows {prev})")
        else:
            prev = e.get("date", prev)
        if "until" in e:
            if e["until"] is not None and not is_part_date(e["until"]):
                err(rid, f"{at}: until must be an ISO date or absent, got {e['until']!r}")
            if e.get("type") != "closed-temporarily":
                err(rid, f"{at}: only a closed-temporarily event may carry 'until'")
        if "note" in e and e["note"] is not None and not isinstance(e["note"], str):
            err(rid, f"{at}: note must be a string")
        for k in e:
            if k not in ("type", "date", "until", "note"):
                err(rid, f"{at}: unknown key {k!r}")
        # Transitions must make sense in sequence, or the fold that resolves
        # them silently reports the wrong state.
        t = e.get("type")
        if t == "reopened" and state == "trading":
            err(rid, f"{at}: 'reopened' but the venue was not closed")
        if t == "closed-temporarily" and state != "trading":
            err(rid, f"{at}: 'closed-temporarily' but the venue was already {state}")
        if state == "closed-permanently":
            err(rid, f"{at}: nothing can follow 'closed-permanently'")
        state = "trading" if t == "reopened" else (t if t in LIFECYCLE_EVENTS else state)


def check_verification(rid, data, status):
    """The record's derivation: WHEN this menu was last read and BY WHAT METHOD
    (ADR 0031; PRINCIPLES §9 — "a stored result carries how it came to be true,
    not only when"). Three states are kept distinguishable on purpose, because
    §9's "unknown is not none" says a single null that means both "never read"
    and "read, method never recorded" is a lie the next reader cannot detect.

    `verified` stays FULL date precision, unlike the partial dates allowed
    elsewhere: a reading happens on a day we know we did it. It is the menu
    *document* that may be dated loosely ("the 2019 scan"), and that date
    belongs on the price-series entry, not here."""
    verified = data.get("verified")
    by = data.get("verifiedBy")
    has_date = isinstance(verified, str) and bool(DATE_RE.match(verified))

    if verified is not None and not has_date:
        err(rid, f"verified must be null or an ISO date (YYYY-MM-DD), got {verified!r}")
    if by is not None and by not in VERIFY_METHODS:
        err(rid, f"verifiedBy {by!r} not in {sorted(VERIFY_METHODS)}")
    # A method with no date establishes nothing — §9 wants both halves or neither.
    if by is not None and verified is None:
        err(rid, "verifiedBy is set but verified is null — a method with no date is not a derivation")
    # No backfill (ADR 0031): a reading whose method we never recorded stays
    # honestly method-less. Warned, never errored — inventing the method would
    # be worse than the gap, and a warning keeps the gap loud for new records.
    if has_date and by is None:
        warn(rid, f"verified {verified} carries no verifiedBy — state how the menu was read ({sorted(VERIFY_METHODS)})")
    # `status: "verified"` is a claim that this menu is current. A claim with no
    # derivation is exactly what §9 forbids: unfalsifiable and un-ageable.
    if status == "verified" and not (has_date and by is not None):
        err(rid, "status is 'verified' but there is no dated derivation — set verified AND verifiedBy")

    # The venue's DETAILS — phone, address, opening hours — carry their own
    # reading (ADR 0037), because `verified` above dates the menu and nothing
    # else. Same shape, same closed method set, and equally optional: absent
    # means those were never checked as a distinct act, and the menu screen
    # then declines to claim they were.
    d_verified = data.get("detailsVerified")
    d_by = data.get("detailsVerifiedBy")
    d_has_date = isinstance(d_verified, str) and bool(DATE_RE.match(d_verified))

    if d_verified is not None and not d_has_date:
        err(rid, f"detailsVerified must be null or an ISO date (YYYY-MM-DD), got {d_verified!r}")
    if d_by is not None and d_by not in VERIFY_METHODS:
        err(rid, f"detailsVerifiedBy {d_by!r} not in {sorted(VERIFY_METHODS)}")
    if d_by is not None and d_verified is None:
        err(rid, "detailsVerifiedBy is set but detailsVerified is null — a method with no date is not a derivation")
    # Unlike `verified`, this one is an ERROR without its method. There is no
    # pre-ADR-0037 corpus to be gentle about: every use of the field is new,
    # so a method-less one is a gap being created now, not inherited.
    if d_has_date and d_by is None:
        err(rid, f"detailsVerified {d_verified} carries no detailsVerifiedBy — state how the details were checked ({sorted(VERIFY_METHODS)})")


def check_hours(rid, hours, where):
    """hours on `obj`: null, or a full week keyed mon..sun. Each day is a list of
    [open, close] intervals ([] = closed); multiple intervals express a
    lunch/dinner split. Times are "HH:MM" 24h; close may be null ("late"/
    open-ended). close, when given, must be after open — past-midnight is
    expressed with a null close, not a wrap (see ADR 0006). Used for both the
    top-level venue and each branch of a multi-location venue."""
    if hours is None:
        return
    if not isinstance(hours, dict):
        err(rid, f"{where}: hours must be null or an object keyed mon..sun")
        return
    if set(hours) != set(DAYS):
        err(rid, f"{where}: hours must have exactly the 7 day keys {DAYS}, got {sorted(hours)}")
        return
    for day, intervals in hours.items():
        if not isinstance(intervals, list):
            err(rid, f"{where}: hours[{day}] must be a list of intervals")
            continue
        for iv in intervals:
            if not (isinstance(iv, list) and len(iv) == 2):
                err(rid, f"{where}: hours[{day}] interval must be [open, close], got {iv!r}")
                continue
            o, c = iv
            if not (isinstance(o, str) and TIME_RE.match(o)):
                err(rid, f"{where}: hours[{day}] open {o!r} must be 'HH:MM'")
            if c is not None and not (isinstance(c, str) and TIME_RE.match(c)):
                err(rid, f"{where}: hours[{day}] close {c!r} must be 'HH:MM' or null")
            if (
                isinstance(o, str) and TIME_RE.match(o)
                and isinstance(c, str) and TIME_RE.match(c)
                and c <= o
            ):
                err(rid, f"{where}: hours[{day}] close {c} must be after open {o}")


def slug(s):
    """The dish/section slug — a Python mirror of `slug` in site/js/slug.js.

    Written twice on purpose and kept identical by hand: the browser's copy is
    an ES module and this tooling is stdlib-only Python (ADR 0001). If the two
    ever disagree the validator blesses an id the app cannot resolve, which is
    the silent failure the dish-id work exists to end."""
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def dish_id(item):
    """A dish's resolved id: `dishId` where the data gives one, `slug(name)`
    otherwise — the mirror of `dishId()` in site/js/dish-id.js (ADR 0051).

    The default is what every anchor, heart, rating and order line already
    resolved to, so a record that has never heard of dish ids keeps the exact
    identity it always had."""
    v = item.get("dishId")
    if isinstance(v, str) and v:
        return v
    n = item.get("name")
    return slug(n) if isinstance(n, str) else ""


def _former_ids(item):
    """A dish's `formerIds` as a list, tolerating the malformed shapes the
    caller has already errored on — so one bad field can't crash the resolver
    and hide every other complaint in the record."""
    v = item.get("formerIds")
    return [x for x in v if isinstance(x, str)] if isinstance(v, list) else []


def find_dish(dishes, ref):
    """Resolve `ref` against `[(section_name, item)]`, mirroring `findDish()` in
    site/js/dish-id.js: id, then slug(ref) as an id, then exact name, then a
    former id. Returns `(tier, matches)` for the FIRST tier that matched.

    The browser takes the first match and moves on, as it always did. Here the
    whole tier comes back, because ambiguity is exactly what this file is for:
    a pick that matches two dishes must be refused at the gate rather than
    silently resolving to whichever row happens to come first."""
    as_slug = slug(ref)
    tiers = (
        ("dishId", lambda i: dish_id(i) == ref),
        ("slug", lambda i: dish_id(i) == as_slug),
        ("name", lambda i: i.get("name") == ref),
        ("formerId", lambda i: ref in _former_ids(i) or as_slug in _former_ids(i)),
    )
    for tier, match in tiers:
        hits = [(s, i) for s, i in dishes if match(i)]
        if hits:
            return tier, hits
    return None, []


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

    # A venue may carry a `locations` array (multiple branches sharing one
    # name/menu/cuisine — see ADR 0011). When present, per-branch fields
    # (address/lat/lng/phone/hours) live on each branch, so the top-level
    # `address` is no longer required.
    locations = data.get("locations")
    is_multi = locations is not None

    # required string fields. name always; the location fields only make
    # sense for a real venue; a multi-location venue keeps its address per branch.
    if is_recipes:
        required_strings = ("name",)
    elif is_multi:
        required_strings = ("name", "area", "city")
    else:
        required_strings = ("name", "area", "city", "address")
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

    # locations / lat / lng / hours: either a single top-level location, or a
    # `locations` array of branches (ADR 0011). Coordinates are optional
    # (a new stub may land before it's geocoded) — that's only a warning — but
    # when given must be real numbers in range, both-or-neither. Hours likewise
    # validate per branch. When `locations` is set, the per-branch fields must
    # NOT also sit at the top level (they'd be ambiguous).
    if is_multi:
        if not isinstance(locations, list) or not locations:
            err(rid, "locations must be a non-empty list when present")
            locations = []
        for field in ("address", "lat", "lng", "phone", "hours"):
            if data.get(field) is not None:
                err(rid, f"{field} must live on each branch, not top-level, when 'locations' is set")
        seen_labels = set()
        for i, b in enumerate(locations):
            where = f"locations[{i}]"
            if not isinstance(b, dict):
                err(rid, f"{where} must be an object")
                continue
            addr = b.get("address")
            if not (isinstance(addr, str) and addr.strip()):
                err(rid, f"{where}: address must be a non-empty string")
            label = b.get("label")
            if label is not None and not (isinstance(label, str) and label.strip()):
                err(rid, f"{where}: label must be a non-empty string or null")
            elif isinstance(label, str):
                if label in seen_labels:
                    err(rid, f"{where}: duplicate branch label {label!r}")
                seen_labels.add(label)
            phone = b.get("phone")
            if phone is not None and not isinstance(phone, str):
                err(rid, f"{where}: phone must be a string or null")
            if not check_coords(rid, b, where):
                warn(rid, f"{where}: no coordinates (lat/lng) — maps opens by address only")
            check_hours(rid, b.get("hours"), where)
    else:
        if not check_coords(rid, data, "card") and not is_recipes:
            warn(rid, "no coordinates (lat/lng) set — maps opens by address only")
        check_hours(rid, data.get("hours"), "card")

    # timezone / currency: where the venue IS, as the two facts the app cannot
    # guess (ADR 0043). Both optional — absent means the collection's home,
    # New Zealand, which is what every record held when this landed. A venue
    # elsewhere MUST state them, because the failure mode is not a blank but a
    # confident wrong answer: a London venue with no `timezone` renders its
    # open/closed status against Wellington's clock and says nothing about it.
    # Hemisphere is deliberately absent: it is derived from `lat`.
    for field, where in [("timezone", "card")] + [
        ("timezone", f"locations[{i}]") for i in range(len(locations or []))
    ]:
        obj = data if where == "card" else locations[int(where[10:-1])]
        if not isinstance(obj, dict):
            continue
        tz = obj.get(field)
        if tz is None:
            continue
        if not isinstance(tz, str) or not tz.strip():
            err(rid, f"{where}: timezone must be a non-empty string or absent")
        elif not valid_timezone(tz):
            err(rid, f"{where}: timezone {tz!r} is not an IANA zone this machine knows")

    # currency is REQUIRED (ADR 0045). Every stored price must state what
    # currency it is in, or it cannot be converted into the one the reader asked
    # for — and, worse, a price of unknown currency looks exactly like a price
    # of the right one. A recipe collection has no prices, so it is exempt.
    currency = data.get("currency")
    if is_recipes:
        if currency is not None and not (isinstance(currency, str) and CURRENCY_RE.match(currency)):
            err(rid, "currency must be a 3-letter ISO 4217 code or absent on a recipe collection")
    elif not isinstance(currency, str) or not CURRENCY_RE.match(currency):
        err(rid, f"currency is required and must be a 3-letter ISO 4217 code (got {currency!r})")
    elif currency not in FX_RATES:
        # Not an error — the venue and its prices are correct, and they render
        # in its own currency. But nobody can convert them, so a reader who
        # asked for another currency silently gets this one. Say so.
        err(
            rid,
            f"currency {currency!r} has no rate in site/data/fx.json — prices could not be "
            "converted. Add it to WANTED in tools/fetch_fx.py and rerun.",
        )

    # formerIds: ids this record used to have (ADR 0011 branches arriving late,
    # a name corrected). They are not decoration — site/js/renames.js resolves an
    # old link BEFORE any fetch, so the two must agree or a shared link 404s
    # while the record cheerfully claims the id is handled.
    former = data.get("formerIds")
    if former is not None:
        if not isinstance(former, list) or not all(isinstance(x, str) and x.strip() for x in former):
            err(rid, "formerIds must be a list of non-empty strings")
        else:
            for old in former:
                if old == rid:
                    err(rid, f"formerIds lists its own current id {old!r}")
                elif RENAMED.get(old) != rid:
                    err(
                        rid,
                        f"formerIds has {old!r} but site/js/renames.js maps it to "
                        f"{RENAMED.get(old)!r} — an old link would 404",
                    )

    # language: the BCP-47 tag the record's canonical name/desc/section strings
    # are written in (ADR 0044). Absent = the collection's own, en-NZ.
    lang = data.get("language")
    if lang is not None and not (isinstance(lang, str) and BCP47_RE.match(lang)):
        err(rid, f"language must be a BCP-47 tag like 'th' or 'zh-Hant' (got {lang!r})")

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

    # status
    status = data.get("status")
    if status not in STATUSES:
        err(rid, f"status {status!r} not in {sorted(STATUSES)}")

    # verified + verifiedBy: when this menu was read, and how (ADR 0031).
    check_verification(rid, data, status)

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

    # Optional curated household rating for the venue (see site/js/ratings.js).
    check_rating(rid, data, "card")

    # The venue's dated lifecycle, and the contact fields that change over time.
    check_lifecycle(rid, data)
    for field in ("address", "phone"):
        for v in check_temporal(rid, data, field, "card"):
            if v is not None and not isinstance(v, str):
                err(rid, f"{field} must be a string or null, got {v!r}")
    for i, branch in enumerate(data.get("locations") or []):
        if not isinstance(branch, dict):
            continue
        for field in ("address", "phone"):
            for v in check_temporal(rid, branch, field, f"locations[{i}]"):
                if v is not None and not isinstance(v, str):
                    err(rid, f"locations[{i}]: {field} must be a string or null, got {v!r}")

    # Add-on groups: defined once for the venue, referenced by id from a section
    # or a dish (ADR 0048). The definitions are checked first; the references
    # are collected as the menu is read and resolved once it has been.
    add_on_defs = check_add_on_groups(rid, data)
    add_on_refs = []

    # menu + collect item names for picks check
    item_names = set()
    pairings = []  # (dish_name, ref) — validated after all names are known
    dishes = []  # (section_name, item) — every dish, in file order, for find_dish
    dish_ids = {}  # resolved id -> (section_name, dish_name); uniqueness is a gate
    former_claims = {}  # former dish id -> [(section_name, dish_name)] claiming it
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
        # A whole section may be seasonal — the winter menu (ADR 0023).
        check_available(rid, section, f"section {section.get('section')!r}")
        check_translations(rid, section, f"section {section.get('section')!r}", {"section"})
        add_on_refs += collect_add_on_refs(rid, section, f"section {section.get('section')!r}")
        check_add_ons_only(rid, section, add_on_defs)
        sec_name = section.get("section")
        for item in section.get("items", []):
            name = item.get("name")
            if not isinstance(name, str) or not name.strip():
                err(rid, "menu item missing a name")
            else:
                item_names.add(name)
            dishes.append((sec_name, item))
            check_translations(rid, item, f"item {name!r}", {"name", "desc"})
            add_on_refs += collect_add_on_refs(rid, item, f"item {name!r}")
            # price may be a plain number/null, or a dated series (ADR 0023).
            # Every value in the series is type-checked exactly as a flat price
            # always was: gaining a time dimension must not weaken the schema.
            for price in check_temporal(rid, item, "price", f"item {name!r}"):
                if price is not None and not isinstance(price, (int, float)):
                    err(rid, f"price for {name!r} must be a number or null (not a string)")
                if isinstance(price, bool):
                    err(rid, f"price for {name!r} must not be a boolean")
                # Sign, not just type. `pricePerPerson` above has always been
                # sign-checked and this one never was, so a negative price
                # validated clean and would render as "-$5.00". The bound is
                # >= 0, not > 0: a genuinely free item is a real thing a menu
                # can say, and refusing to express it would push it to null,
                # which already means "no price recorded" — a different fact.
                elif isinstance(price, (int, float)) and price < 0:
                    err(rid, f"price for {name!r} must not be negative, got {price!r}")
            check_available(rid, item, f"item {name!r}")
            check_revisions(rid, item, f"item {name!r}")
            check_needs(rid, item, f"item {name!r}")
            # code: optional venue order-number (a string, kept out of name).
            code = item.get("code")
            if code is not None and not (isinstance(code, str) and code.strip()):
                err(rid, f"code for {name!r} must be a non-empty string or absent")

            # dishId: the dish's identity, optional and defaulting to slug(name)
            # (ADR 0051). It must BE a slug, not merely resolve to one, because
            # an anchor, a stored heart and an order line all carry it verbatim —
            # `"Gold Card"` in the data would build `#dish-Gold Card`.
            did = item.get("dishId")
            if did is not None:
                if not (isinstance(did, str) and did.strip()):
                    err(rid, f"dishId for {name!r} must be a non-empty string or absent")
                elif not ID_RE.match(did):
                    suggestion = slug(did) or (slug(name) if isinstance(name, str) else "")
                    err(
                        rid,
                        f"dishId {did!r} on {name!r} is not in slug form (lower-case, "
                        f"digits, single hyphens) — write {suggestion!r}",
                    )

            # Two dishes resolving to one id is the bug this whole field exists to
            # fix: one anchor reachable, one heart shared, one price charged twice.
            # The FIRST row keeps the bare slug (that is today's behaviour), so it
            # is always the later one that needs the explicit id.
            resolved = dish_id(item)
            if resolved:
                if resolved in dish_ids:
                    prev_section, prev_name = dish_ids[resolved]
                    err(
                        rid,
                        f"two dishes resolve to the same id {resolved!r} "
                        f"({prev_section!r} and {sec_name!r}) — give the second an "
                        'explicit "dishId"',
                    )
                else:
                    dish_ids[resolved] = (sec_name, name)

            # formerIds on a dish: ids it used to answer to, so an old shared link
            # or a heart stored on a family phone still resolves (ADR 0051). Named
            # for the venue-level field it mirrors, and validated the same way —
            # a former id nothing checks is a promise nobody keeps.
            former_dish = item.get("formerIds")
            if former_dish is not None:
                if not isinstance(former_dish, list) or not all(
                    isinstance(x, str) and x.strip() for x in former_dish
                ):
                    err(rid, f"formerIds for {name!r} must be a list of non-empty strings")
                else:
                    for old in former_dish:
                        if not ID_RE.match(old):
                            err(
                                rid,
                                f"formerIds entry {old!r} on {name!r} is not in slug "
                                f"form — write {slug(old)!r}",
                            )
                        former_claims.setdefault(old, []).append((sec_name, name))
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

            # Optional curated household rating for this dish (1..3).
            check_rating(rid, item, f"item {name!r}")

            # Pairings: collect now, resolve after all names are known.
            gw = item.get("goesWith")
            if gw is not None and (
                not isinstance(gw, list) or not all(isinstance(x, str) for x in gw)
            ):
                err(rid, f"goesWith for {name!r} must be a list of strings or absent")
            elif gw:
                pairings.extend((name, ref) for ref in gw)

    # A former dish id must not be a live one. findDish tries live ids first, so
    # the old link would keep reaching the live dish and the claim would sit in
    # the data looking honoured — and two dishes claiming one former id is the
    # same failure with no right answer at all.
    for old, claimants in former_claims.items():
        if old in dish_ids:
            live_section, live_name = dish_ids[old]
            claim_section, claim_name = claimants[0]
            err(
                rid,
                f"formerIds on {claim_name!r} ({claim_section!r}) claims {old!r}, "
                f"which is the live id of {live_name!r} ({live_section!r}) — the live "
                "dish wins and the old link never arrives",
            )
        if len(claimants) > 1:
            where = " and ".join(f"{n!r} ({s!r})" for s, n in claimants)
            err(rid, f"two dishes claim the former id {old!r}: {where} — only one can answer to it")

    # status/menu consistency
    if status == "stub" and menu:
        warn(rid, "status is 'stub' but a menu is present")
    if status in ("menu-complete", "verified") and not menu:
        err(rid, f"status is '{status}' but menu is empty")

    # picks must resolve to exactly one dish. They are written as names, and a
    # name is not unique within a venue — so matching them against a set of names
    # meant a pick on a duplicated dish resolved to whichever row came first, and
    # said nothing. Resolution goes through find_dish (ADR 0051) so a pick may
    # also name a dish id, which is the only way to point at the second row.
    picks = data.get("picks", [])
    if not isinstance(picks, list):
        err(rid, "picks must be a list")
    else:
        for p in picks:
            if not isinstance(p, str):
                err(rid, f"pick {p!r} must be a string")
                continue
            tier, hits = find_dish(dishes, p)
            # A pick that names a dish id is unambiguous by construction — the
            # uniqueness gate above already refused two dishes sharing one. Every
            # other form is a NAME, and a name shared by two rows resolves to
            # whichever comes first while saying nothing, which is the bug.
            # Note it stays an error even when resolution succeeded: the first
            # row does answer, but nobody can tell whether that is the row meant.
            by_name = [(s, i) for s, i in dishes if i.get("name") == p]
            if not hits:
                err(rid, f"pick {p!r} does not match any menu item name")
            elif tier != "dishId" and len(by_name) > 1:
                where = ", ".join(repr(s) for s, _ in by_name)
                ids = ", ".join(repr(dish_id(i)) for _, i in by_name)
                err(
                    rid,
                    f"pick {p!r} matches {len(by_name)} dishes ({where}) — name the "
                    f"one you mean by its dish id ({ids})",
                )
    if status in ("menu-complete", "verified") and not picks:
        warn(rid, "no picks set yet")

    # goesWith pairings must resolve — same-record dish name or id, or "id#Dish".
    # Same-record refs go through find_dish so a pairing can point at a
    # disambiguated row by its id; a cross-record ref still resolves by name,
    # because ALL_NAMES is the pre-pass and the other record's ids are not read
    # here. Ambiguity is not an error for a pairing: it renders a suggestion,
    # not a price, so the first match is a harmless answer where a pick's is not.
    for dish, ref in pairings:
        if "#" in ref:
            ref_id, _, ref_name = ref.partition("#")
            if ref_id not in ALL_NAMES:
                err(rid, f"goesWith {ref!r} on {dish!r}: unknown restaurant id {ref_id!r}")
            elif ref_name not in ALL_NAMES[ref_id]:
                err(rid, f"goesWith {ref!r} on {dish!r}: no dish {ref_name!r} in {ref_id}")
        elif not find_dish(dishes, ref)[1]:
            err(rid, f"goesWith {ref!r} on {dish!r} does not match a dish in this menu")

    # Both directions of the add-on reference, because both are silent failures.
    # A dangling id renders nothing — groupsFor() drops it rather than throwing,
    # so the extras the venue actually sells are simply never offered. And a
    # group nobody names is precached payload no screen can reach (ADR 0047),
    # downloaded by every phone to sit there unused.
    referenced = set()
    for gid, where in add_on_refs:
        if gid in add_on_defs:
            referenced.add(gid)
        else:
            err(rid, f"{where}: addOns names {gid!r}, which is not defined in addOnGroups")
    for gid in add_on_defs:
        if gid not in referenced:
            warn(rid, f"add-on group {gid!r} is defined but no section or dish names it — nothing can offer it")

    return rid


def check_version_bump():
    """Best-effort reminder (never fails the build): if menu data changed in the
    working tree but site/sw.js didn't, DATA_VERSION was almost certainly not
    bumped — installed phones would keep serving stale menus offline (ADR 0015).
    Deliberately shallow: it doesn't parse which constant moved, just flags the
    common "forgot to bump anything" slip. Silently skips when git isn't
    available or this isn't a checkout, so the validator still runs standalone."""
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "status", "--porcelain"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return
    if out.returncode != 0:
        return
    paths = set()
    for line in out.stdout.splitlines():
        if not line:
            continue
        path = line[3:]  # strip the 2 status chars + space
        if " -> " in path:  # rename: "old -> new"
            path = path.split(" -> ", 1)[1]
        paths.add(path)
    data_dirty = any(p.startswith("site/data/") for p in paths)
    sw_dirty = "site/sw.js" in paths
    if data_dirty and not sw_dirty:
        warnings.append(
            "[version] site/data changed but site/sw.js did not — bump "
            "DATA_VERSION in site/sw.js so installed phones refetch the menus"
        )


def check_allergen_tags():
    """Warn about allergen tags a new menu should have picked up (ADR 0024).

    A warning, not an error: the tiers and the vocabulary are a judgement the
    ADR records, and a venue's own correction must always be able to win. But
    the gap this closes was created by hand-tagging record by record, so a
    transcription that reintroduces it should say so on the way past.
    """
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from tag_allergens import audit
    except ImportError:  # tool removed or renamed — not worth failing validation
        return
    for path in sorted((DATA / "restaurants").glob("*.json")):
        record = json.loads(path.read_text())
        for item, tag, tier, why in audit(record):
            warn(record.get("id", path.stem), f"{item['name']}: missing {tag} ({tier} — {why}) — run tools/tag_allergens.py")


def check_twin_allergens():
    """Warn when two rows share a name in one venue but disagree about allergens.

    Found by measurement on 2026-08-16, not by reasoning. Sprig & Fern lists
    seven dishes twice — a full-price row and a "Gold Card portion." row — and
    every Gold Card row had FEWER `contains-*` tags than its twin. One shipped
    with `tags: []` on a crumbed, mozzarella-topped chicken parmigiana whose
    $32 twin carried both gluten and dairy.

    Nothing was wrong with the inference. `tag_allergens.py` reads a row's name
    and desc, and these rows have a stub desc with no ingredients in it, so
    there was nothing to match. The gap is invisible per-row and obvious across
    the pair, which is exactly what this check is for.

    A WARNING, not an error: a kids' version really is different food — Sprig &
    Fern's kids cheeseburger has different toppings and different sides — so a
    genuine divergence must stay expressible. It is the *silence* that needs
    saying out loud.
    """
    for path in sorted((DATA / "restaurants").glob("*.json")):
        record = json.loads(path.read_text())
        rid = record.get("id", path.stem)
        by_name = {}
        for section in record.get("menu", []):
            if not isinstance(section, dict):
                continue
            for item in section.get("items", []):
                if isinstance(item.get("name"), str):
                    tags = {t for t in (item.get("tags") or []) if str(t).startswith("contains-")}
                    by_name.setdefault(item["name"], []).append((section.get("section"), tags))
        for name, rows in by_name.items():
            if len(rows) < 2:
                continue
            union = set().union(*(t for _, t in rows))
            for where, tags in rows:
                missing = sorted(union - tags)
                if missing:
                    warn(
                        rid,
                        f"{name!r} in {where!r} lacks {', '.join(missing)}, which "
                        f"another row of the same name carries — same food, or a "
                        f"stub description the allergen sweep could not read?",
                    )


def check_contradiction_tables():
    """`CONTRADICTS` (site/js/addons.js) and `CONTRADICTED_BY`
    (tools/tag_allergens.py) are the same food fact written both ways round, so
    invert either and you must get the other.

    They are used for opposite jobs and that is why they were written twice:
    the Python one stops an inferred allergen overriding curation WITHIN one
    dish; the JS one explains why a dietary claim died when a DIFFERENT item was
    added to the plate. Drift between them is a safety bug that nothing else
    would notice — the two would keep working, and quietly disagree about
    whether a dish is still vegan."""
    if not CONTRADICTS:
        err("addons", "could not read CONTRADICTS out of site/js/addons.js — the "
                      "drift check between it and tag_allergens.CONTRADICTED_BY cannot run")
        return
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from tag_allergens import CONTRADICTED_BY
    except ImportError:
        err("addons", "could not import CONTRADICTED_BY from tools/tag_allergens.py — "
                      "the drift check against site/js/addons.js cannot run")
        return
    inverted = {}
    for diet, allergens in CONTRADICTS.items():
        for allergen in allergens:
            inverted.setdefault(allergen, set()).add(diet)
    for allergen in sorted(set(inverted) | set(CONTRADICTED_BY)):
        got = inverted.get(allergen, set())
        want = set(CONTRADICTED_BY.get(allergen, set()))
        if got != want:
            err(
                "addons",
                f"contradiction tables have drifted for {allergen}: CONTRADICTS in "
                f"site/js/addons.js inverts to {sorted(got)}, but CONTRADICTED_BY in "
                f"tools/tag_allergens.py says {sorted(want)} — same food fact, two answers",
            )


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

    check_version_bump()
    check_allergen_tags()
    check_twin_allergens()
    check_contradiction_tables()

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
