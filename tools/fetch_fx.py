#!/usr/bin/env python3
"""Refresh `site/data/fx.json` — the exchange rates Faves ships and reads offline.

Faves converts a menu price into the currency you asked to see it in. It cannot
call an FX API to do it: the app must work in flight mode after first visit
(CLAUDE.md), and a runtime API would be a third-party dependency in the shipped
artefact, which ADR 0001 forbids outright. So the rates are *data* — fetched
here, committed, served from the same cache as the menus, and refreshed when
someone runs this.

That makes staleness the honest cost, and the file carries its own `asOf` so the
app can say how old its rates are rather than implying they're live. See
ADR 0045 for why a dated approximation beats both a live API and no conversion.

    python3 tools/fetch_fx.py            # fetch and write
    python3 tools/fetch_fx.py --check    # exit 1 if the file is missing/malformed
    python3 tools/fetch_fx.py --dry-run  # print what would be written
    python3 tools/fetch_fx.py --force    # write even if no rate moved

Stdlib only, no build step. Network is used HERE, at authoring time, never by
the site.
"""

import argparse
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.net import build_ssl_context  # noqa: E402  (needs the path line above)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "fx.json"

BASE = "NZD"
SOURCE_URL = "https://open.er-api.com/v6/latest/NZD"
SOURCE_NAME = "open.er-api.com (exchangerate-api.com, free tier)"

# The currencies Faves offers, not every currency that exists. A short list is
# reviewable by a human, and each entry here is one a NZ household plausibly
# spends in — home, the places they travel, and the places the menus come from.
# Adding one is a one-line change plus a rerun; it is not a schema decision.
WANTED = [
    "NZD",  # base — always 1.0
    "AUD", "USD", "GBP", "EUR", "JPY", "SGD", "THB", "CAD", "FJD",
    "CNY", "HKD", "TWD", "KRW", "IDR", "MYR", "VND", "PHP", "INR",
    "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "MXN", "BRL", "ZAR",
    "AED", "TRY", "ILS", "WST", "TOP", "PGK", "XPF",
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "faves/1.0 (menu app; data refresh)"})
    with urllib.request.urlopen(req, timeout=30, context=build_ssl_context()) as r:
        return json.loads(r.read().decode("utf-8"))


def build():
    payload = fetch(SOURCE_URL)
    if payload.get("result") != "success":
        raise SystemExit(f"source did not return success: {payload.get('result')!r}")
    raw = payload.get("rates") or {}

    rates = {}
    missing = []
    for code in WANTED:
        v = raw.get(code)
        if code == BASE:
            rates[code] = 1.0
        elif isinstance(v, (int, float)) and v > 0:
            # Six significant figures is far more than a menu price needs and
            # keeps the file honest about being a reference rate, not a quote.
            rates[code] = float(f"{v:.6g}")
        else:
            missing.append(code)

    # The source dates its own snapshot; prefer that over "when I ran this",
    # because the rate is as old as the snapshot, not as young as the fetch.
    stamp = payload.get("time_last_update_utc")
    try:
        as_of = datetime.strptime(stamp, "%a, %d %b %Y %H:%M:%S %z").date().isoformat()
    except (TypeError, ValueError):
        as_of = date.today().isoformat()

    doc = {
        "base": BASE,
        "asOf": as_of,
        "fetched": datetime.now(timezone.utc).date().isoformat(),
        "source": SOURCE_NAME,
        "note": (
            "Daily reference rates, not transaction rates. What a card actually "
            "charges includes the issuer's margin, so a converted price here is "
            "an estimate — the menu price in the venue's own currency is the "
            "only figure the shop will honour."
        ),
        "rates": dict(sorted(rates.items())),
    }
    return doc, missing


SW = ROOT / "site" / "sw.js"


def current_doc():
    try:
        return json.loads(OUT.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def current_as_of():
    return current_doc().get("asOf", "never")


def rates_changed(doc):
    """True when any RATE differs from the committed file.

    Compares rates only — never `fetched`, and never `asOf` on its own. The
    source restamps its snapshot daily whether or not a number moved, and a
    commit that changes nothing a reader can see still costs every installed
    phone a re-download of the data cache.
    """
    return current_doc().get("rates") != doc.get("rates")


def bump_data_version():
    """Bump DATA_VERSION in sw.js, because fx.json lives under site/data/.

    The lockstep rule (CLAUDE.md) is that a change under `site/data/` must bump
    `DATA_VERSION` or installed phones keep serving the cached copy — here, the
    old rates. Doing it in the same tool that writes the file is the only way a
    scheduled job can honour a rule a human would otherwise have to remember.
    Same-day reruns get `.1`, `.2`, … so two refreshes in a day are distinct.
    """
    text = SW.read_text()
    today = date.today().isoformat()
    m = re.search(r'const DATA_VERSION = "([^"]+)";', text)
    if not m:
        raise SystemExit("could not find DATA_VERSION in site/sw.js")
    old = m.group(1)
    if old.startswith(today):
        tail = old[len(today):].lstrip(".")
        nxt = f"{today}.{int(tail) + 1}" if tail.isdigit() else f"{today}.1"
    else:
        nxt = f"{today}.1"
    SW.write_text(text.replace(f'const DATA_VERSION = "{old}";', f'const DATA_VERSION = "{nxt}";', 1))
    return f"DATA_VERSION {old} -> {nxt}"


def check():
    if not OUT.exists():
        print(f"missing {OUT.relative_to(ROOT)} — run tools/fetch_fx.py", file=sys.stderr)
        return 1
    try:
        doc = json.loads(OUT.read_text())
    except json.JSONDecodeError as e:
        print(f"{OUT.relative_to(ROOT)} is not valid JSON: {e}", file=sys.stderr)
        return 1
    problems = []
    if doc.get("base") != BASE:
        problems.append(f"base is {doc.get('base')!r}, expected {BASE!r}")
    if doc.get("rates", {}).get(BASE) != 1.0:
        problems.append(f"the base currency's own rate must be exactly 1.0")
    for code, v in (doc.get("rates") or {}).items():
        if not (isinstance(v, (int, float)) and v > 0):
            problems.append(f"rate for {code} is {v!r}")
    if not isinstance(doc.get("asOf"), str):
        problems.append("asOf must be an ISO date — the app tells readers how old the rates are")
    if problems:
        for p in problems:
            print(f"fx.json: {p}", file=sys.stderr)
        return 1
    print(f"fx.json OK — {len(doc['rates'])} rates, base {doc['base']}, as at {doc['asOf']}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="validate the committed file; no network")
    ap.add_argument("--dry-run", action="store_true", help="fetch and print, but don't write")
    ap.add_argument(
        "--force",
        action="store_true",
        help="write even when no rate moved. Only for proving the scheduled job can "
        "actually commit — a routine run must not, or every phone re-downloads the "
        "data cache for a file whose numbers are identical.",
    )
    ap.add_argument(
        "--bump",
        action="store_true",
        help="also bump DATA_VERSION in site/sw.js when the rates actually changed "
        "(what the daily job uses — see .github/workflows/fx.yml)",
    )
    args = ap.parse_args()

    if args.check:
        return check()

    doc, missing = build()
    if missing:
        # Not fatal: a currency the source doesn't carry simply isn't offered.
        # Saying so is the point — a silently absent rate becomes a currency the
        # settings list quietly drops with no explanation.
        print(f"warning: source has no rate for {', '.join(missing)} — omitted", file=sys.stderr)
    text = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
    if args.dry_run:
        print(text)
        return 0

    if not rates_changed(doc) and not args.force:
        # The daily job runs whether or not the rates moved. Rewriting the file
        # with only a new `fetched` stamp would produce a commit a day that
        # changes no rate, and every one of those would invalidate the data
        # cache on every installed phone for nothing.
        print(f"rates unchanged since {current_as_of()} — nothing to write")
        return 0

    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)} — {len(doc['rates'])} rates, as at {doc['asOf']}")
    if args.bump:
        print(bump_data_version())
    return 0


if __name__ == "__main__":
    sys.exit(main())
