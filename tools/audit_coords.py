#!/usr/bin/env python3
"""Audit every stored lat/lng in site/data against its own street address.

Coordinates in this repo are dev-time geocodes (ARCHITECTURE.md, "lat/lng"):
nothing verifies them after the day they were written, and a wrong pin is
worse than no pin — it silently skews the Near-me distance sort and the
along-a-route detour maths. This tool re-geocodes every address in the corpus
and reports how far the stored coordinate sits from the answer.

It is a REPORTER, not a gate: it always exits 0. It never writes site data —
what to do about a drift is a judgement call, made by a human against the
report. The conservative rule the 2026-08-09 audit used:

    drift > 100 m AND the geocode resolved to house-number level
        → a correction (we recorded it wrong): overwrite, no history entry
    drift 30-100 m, or any match coarser than house-number
        → review by hand; a street-centroid geocode is not evidence
    drift < 30 m
        → fine, leave it

Geocoding is OpenStreetMap Nominatim, whose usage policy caps automated use at
one request per second and requires an identifying User-Agent. Both are
honoured below, and every response is cached to disk so a re-run costs the API
nothing. The cache is scratch — keep it out of the repo.

    python3 tools/audit_coords.py                 # audit, cached
    python3 tools/audit_coords.py --refresh       # ignore the cache, re-geocode
    python3 tools/audit_coords.py --cache /tmp/x.json
    python3 tools/audit_coords.py --min-drift 30  # only the interesting rows
"""

import argparse
import json
import math
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESTAURANTS = ROOT / "site" / "data" / "restaurants"

ENDPOINT = "https://nominatim.openstreetmap.org/search"
# Nominatim's policy requires an identifying agent with a contact URL, and
# caps automated clients at 1 req/s. Both are conditions of use, not tuning.
USER_AGENT = "faves-coord-audit/1.0 (https://github.com/mike548141/faves)"
RATE_LIMIT_S = 1.1
DEFAULT_CACHE = Path("/tmp/faves-coord-audit-cache.json")

# Thresholds in metres. 30 m is roughly the width of a Wellington CBD block
# frontage — inside it, stored-vs-geocoded disagreement says more about which
# corner of the building OSM picked than about the data being wrong.
FINE_M = 30.0
CORRECT_M = 100.0

# "7/9 Courtenay Place" = unit 7 of number 9; "B2/69 Lakewood Avenue" likewise.  # leakscan:allow: venue business addresses from site/data as the worked example — same product class (ADR 0022 gate 1)
# OSM stores the street number, so the part after the slash is what to ask for.
UNIT_SLASH = re.compile(r"^\s*[0-9A-Za-z]{1,4}\s*/\s*(?=\d)")
HOUSE_NUMBER = re.compile(r"^\s*(\d+[A-Za-z]?)\b")


def build_ssl_context():
    """A fully verifying context, working around an empty Python trust store.

    A python.org build on macOS ships no CA bundle until someone runs its
    `Install Certificates.command`, so every HTTPS call dies with
    CERTIFICATE_VERIFY_FAILED. Rather than make the tool unusable there — or,
    far worse, disable verification — fall back to the OS bundle that macOS
    and most Linux distros already ship. Verification stays fully on; only
    the source of the trusted roots changes.
    """
    context = ssl.create_default_context()
    if context.cert_store_stats()["x509_ca"]:
        return context
    for bundle in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
        if Path(bundle).exists():
            context.load_verify_locations(cafile=bundle)
            return context
    return context


def haversine_m(lat1, lng1, lat2, lng2):
    """Great-circle distance in metres (mean Earth radius, WGS84 degrees)."""
    r = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def query_variants(address):
    """The strings worth asking Nominatim for this address, best guess first.

    Most addresses need only themselves. The awkward ones carry an interior
    prefix or a unit-slash number that no gazetteer holds, so each stripped
    form is offered as a fallback — a hit on a fallback is still reported
    against the original address, and its match level is judged the same way.
    """
    variants = [address]
    parts = [p.strip() for p in address.split(",")]
    # Peel leading components off until one carries a street number. The
    # `len(parts) > 3` floor is what stops this degenerating into a suburb
    # lookup: "Khandallah, Wellington 6035" would answer confidently with a
    # centroid a suburb wide, which is worse than admitting no match.
    while len(parts) > 3 and not HOUSE_NUMBER.match(parts[0]):
        parts = parts[1:]
        candidate = ", ".join(parts)
        if candidate not in variants:
            variants.append(candidate)
    if parts:
        stripped = UNIT_SLASH.sub("", parts[0])
        if stripped != parts[0]:
            candidate = ", ".join([stripped] + parts[1:])
            if candidate not in variants:
                variants.append(candidate)
    return variants


def our_house_number(address):
    """The street number we claim, normalised — a unit-slash prefix is dropped
    so only the part OSM actually stores, the street number, is compared.

    Scans the comma components rather than assuming the first one is the
    street line: Charley Noble's address opens "Ground Floor, Huddart Parker
    Building, 1 Post Office Square", and reading only the first component
    would conclude we claim no number at all and downgrade a perfectly good
    house-level match to "street".
    """
    for part in address.split(","):
        hit = HOUSE_NUMBER.match(UNIT_SLASH.sub("", part.strip()))
        if hit:
            return hit.group(1).upper()
    return None


def match_level(address, result):
    """How precisely the geocode landed: 'house', 'house-approx' or 'street'.

    Only 'house' is strong enough to overwrite stored data on. 'house-approx'
    means OSM holds 39 where we say 39A (same building strip, probably fine,
    but "probably" is not evidence). Anything else is a street or suburb
    centroid, which can sit a hundred metres from the door quite legitimately.
    """
    theirs = (result.get("address") or {}).get("house_number")
    ours = our_house_number(address)
    if not theirs or not ours:
        return "street"
    theirs = theirs.strip().upper()
    if theirs == ours:
        return "house"
    if re.sub(r"[A-Z]", "", theirs) == re.sub(r"[A-Z]", "", ours):
        return "house-approx"
    return "street"


# A request that never got an answer, as distinct from an answer of "no such
# place". The difference matters twice: a failure must not be cached (the next
# run has to retry it), and it must not be reported as "this address doesn't
# geocode" — that would be a finding we haven't earned.
FAILED = object()


class Geocoder:
    """Nominatim client with an on-disk cache and the policy rate limit."""

    def __init__(self, cache_path, refresh=False):
        self.cache_path = cache_path
        self.refresh = refresh
        self.cache = {}
        self.live_calls = 0
        self.errors = []
        self.context = build_ssl_context()
        self._last_call = 0.0
        if cache_path.exists() and not refresh:
            try:
                self.cache = json.loads(cache_path.read_text())
            except (OSError, ValueError):
                # A corrupt scratch cache is not worth failing over; refetch.
                self.cache = {}

    def _fetch(self, query):
        # The rate limit is a condition of use, so it is enforced around the
        # socket call itself rather than left to the caller's loop shape.
        wait = RATE_LIMIT_S - (time.monotonic() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        params = urllib.parse.urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "countrycodes": "nz",
                "addressdetails": "1",
                "limit": "1",
            }
        )
        req = urllib.request.Request(
            f"{ENDPOINT}?{params}", headers={"User-Agent": USER_AGENT}
        )
        try:
            with urllib.request.urlopen(req, timeout=30, context=self.context) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, ValueError, TimeoutError, OSError) as exc:
            self.errors.append(f"{query!r}: {exc}")
            print(f"  ! geocode request failed for {query!r}: {exc}", file=sys.stderr)
            return FAILED
        finally:
            self._last_call = time.monotonic()
            self.live_calls += 1
        return body[0] if body else None

    def lookup(self, query):
        if query in self.cache and not self.refresh:
            return self.cache[query]
        result = self._fetch(query)
        if result is FAILED:
            return None  # deliberately uncached, so a re-run retries it
        self.cache[query] = result
        return result

    def save(self):
        try:
            self.cache_path.write_text(json.dumps(self.cache, indent=1))
        except OSError as exc:
            print(f"  ! could not write cache {self.cache_path}: {exc}", file=sys.stderr)


def inventory():
    """Every coordinate slot in the corpus, venue-level and per branch.

    A slot with a null lat/lng is included deliberately — an address with no
    pin is exactly what the audit is meant to surface (McDonald's had five).
    """
    slots = []
    for path in sorted(RESTAURANTS.glob("*.json")):
        record = json.loads(path.read_text())
        rid = record["id"]
        branches = record.get("locations")
        if branches:
            for branch in branches:
                label = branch.get("label") or "(unlabelled)"
                slots.append(
                    {
                        "rid": rid,
                        "where": f"{rid} / {label}",
                        "address": branch.get("address"),
                        "lat": branch.get("lat"),
                        "lng": branch.get("lng"),
                    }
                )
        elif record.get("address"):
            slots.append(
                {
                    "rid": rid,
                    "where": rid,
                    "address": record["address"],
                    "lat": record.get("lat"),
                    "lng": record.get("lng"),
                }
            )
    return slots


def classify(slot, result, level, drift):
    if result is None:
        return "no-geocode"
    if slot["lat"] is None or slot["lng"] is None:
        return "fill" if level == "house" else "fill-review"
    if drift is None:
        return "no-geocode"
    if drift < FINE_M:
        return "fine"
    if drift > CORRECT_M and level == "house":
        return "correct"
    return "review"


def audit(geocoder):
    rows = []
    for slot in inventory():
        address = slot["address"]
        if not address:
            continue
        # Keep asking until a variant answers at house-number level. An early
        # variant answering at *street* level is not a reason to stop: for a
        # unit-slash address the full string yields a road centroid while the
        # bare street number yields the building, and only the latter is
        # strong enough to act on.
        result, used, level = None, None, "—"
        for query in query_variants(address):
            candidate = geocoder.lookup(query)
            if not candidate:
                continue
            candidate_level = match_level(address, candidate)
            if result is None or candidate_level == "house":
                result, used, level = candidate, query, candidate_level
            if candidate_level == "house":
                break
        drift, glat, glng = None, None, None
        if result:
            glat, glng = float(result["lat"]), float(result["lon"])
            if slot["lat"] is not None and slot["lng"] is not None:
                drift = haversine_m(slot["lat"], slot["lng"], glat, glng)
        rows.append(
            {
                **slot,
                "geo_lat": glat,
                "geo_lng": glng,
                "level": level,
                "drift": drift,
                "verdict": classify(slot, result, level, drift),
                "query": used,
                "display": (result or {}).get("display_name"),
            }
        )
    # Worst first; slots with no stored pin sort to the end of the drift run
    # because they have nothing to be wrong *by* — they are a separate story.
    rows.sort(key=lambda r: (r["drift"] is None, -(r["drift"] or 0)))
    return rows


ORDER = ["correct", "review", "fine", "fill", "fill-review", "no-geocode"]


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--cache",
        type=Path,
        default=DEFAULT_CACHE,
        help=f"geocode cache file (default: {DEFAULT_CACHE}); never commit it",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="ignore cached responses and re-geocode everything",
    )
    parser.add_argument(
        "--min-drift",
        type=float,
        default=0.0,
        metavar="M",
        help="only print rows drifting at least this many metres",
    )
    args = parser.parse_args()

    geocoder = Geocoder(args.cache, refresh=args.refresh)
    try:
        rows = audit(geocoder)
    finally:
        geocoder.save()

    print(f"{'venue / branch':<40} {'drift':>9}  {'match':<12} verdict")
    print("-" * 84)
    for row in rows:
        if row["drift"] is not None and row["drift"] < args.min_drift:
            continue
        if row["drift"] is not None:
            drift = f"{row['drift']:.0f} m"
        elif row["lat"] is None:
            drift = "no pin"  # nothing stored to be wrong by
        else:
            drift = "—"  # stored, but nothing to compare it against
        print(f"{row['where']:<40} {drift:>9}  {row['level']:<12} {row['verdict']}")

    counts = {}
    for row in rows:
        counts[row["verdict"]] = counts.get(row["verdict"], 0) + 1
    print(f"\n{len(rows)} coordinate slot(s); {geocoder.live_calls} live geocode(s)")
    for verdict in ORDER:
        if verdict in counts:
            print(f"  {verdict:<12} {counts[verdict]}")
    if geocoder.errors:
        # Say so loudly: an incomplete audit read as a complete one is the
        # one way this tool could actively mislead.
        print(
            f"\n!! {len(geocoder.errors)} geocode request(s) FAILED — this report"
            f" is incomplete, and\n   'no-geocode' rows above may be network"
            f" failures rather than findings."
        )

    for row in rows:
        if row["verdict"] in ("correct", "fill"):
            print(
                f"\n{row['where']}\n  address  {row['address']}"
                f"\n  stored   {row['lat']}, {row['lng']}"
                f"\n  geocode  {row['geo_lat']:.5f}, {row['geo_lng']:.5f}"
                f"\n  matched  {row['display']}"
            )
    # Always 0: this reports, it does not gate. A drift is a question for a
    # person, not a build failure.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
