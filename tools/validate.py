#!/usr/bin/env python3
"""Validate Faves restaurant data against the schema in docs/ARCHITECTURE.md.

Stdlib only, no build step. Run from the repo root or anywhere:

    python3 tools/validate.py

Exit code 0 = all good; 1 = one or more errors. Warnings never fail the
build but are printed so gaps (e.g. missing picks) stay visible.
"""

from zoneinfo import ZoneInfo
import json
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

CURRENCY_RE = re.compile(r"^[A-Z]{3}$")

# Currencies price.js has band thresholds for. Kept in step by hand — a short
# list that changes when someone sits down with a country's menus and chooses
# its two numbers, which is not something a script can derive.
PRICE_BANDED_CURRENCIES = {"NZD"}


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

    currency = data.get("currency")
    if currency is not None:
        if not isinstance(currency, str) or not CURRENCY_RE.match(currency):
            err(rid, "currency must be a 3-letter ISO 4217 code (e.g. 'GBP') or absent")
        elif currency not in PRICE_BANDED_CURRENCIES:
            # Not an error: the venue is still correct and its prices still
            # render in its own currency. But price.js will show no derived
            # $/$$/$$$ chip, because a band is a calibration against local
            # prices and nobody has made one — worth saying out loud rather
            # than leaving someone to wonder where the chip went.
            warn(
                rid,
                f"currency {currency!r} has no price-band calibration in site/js/price.js — "
                "the venue will show no derived price band (a curated `priceBand` still works)",
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
        # A whole section may be seasonal — the winter menu (ADR 0023).
        check_available(rid, section, f"section {section.get('section')!r}")
        check_translations(rid, section, f"section {section.get('section')!r}", {"section"})
        for item in section.get("items", []):
            name = item.get("name")
            if not isinstance(name, str) or not name.strip():
                err(rid, "menu item missing a name")
            else:
                item_names.add(name)
            check_translations(rid, item, f"item {name!r}", {"name", "desc"})
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
