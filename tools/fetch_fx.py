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

**A scheduled job runs this weekly** (`.github/workflows/fx.yml`), opening a
pull request that merges itself once the required checks pass. Running it by
hand alongside your own work is equally fine and needs no coordination, because
the tool guards itself so it cannot become noise:

  • already fetched today  → does nothing
  • no rate actually moved → does nothing
  • otherwise              → writes, and `--bump` moves DATA_VERSION with it

So running it on every commit is harmless, and the rates change in the repo at
most once a day — whether it is you running it or the schedule.

    python3 tools/fetch_fx.py            # fetch if due
    python3 tools/fetch_fx.py --bump     # ...and bump DATA_VERSION if it wrote
    python3 tools/fetch_fx.py --check    # exit 1 if the file is missing, malformed,
                                         #   short a WANTED currency, or holding a
                                         #   rate outside its plausibility band
    python3 tools/fetch_fx.py --dry-run  # print what would be written
    python3 tools/fetch_fx.py --force    # ignore the guards and write anyway

Stdlib only, no build step. Network is used HERE, at authoring time, never by
the site — and NEVER by `--check`, which reads the committed file and nothing
else, so it is the same check in flight mode, in CI and on a dead link.
"""

import argparse
import json
import math
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

# Roughly what one NZD bought on 2026-08-16, to 3 significant figures. These
# are ANCHORS, not expected values: a rate is checked against a band a factor
# of BAND_FACTOR wide either side of its anchor, which is far too loose to
# police the market and exactly tight enough to catch the ways this file
# actually goes wrong — a decimal slip, a source that starts quoting the
# inverse (JPY would fall from 93 to 0.011), a base currency swapped out from
# under us, or a placeholder written where a number belongs.
#
# WHY FOUR. A band that tracked the market would fire on ordinary movement, and
# a check that cries wolf is switched off within a week; this repo has written
# that down more than once. Four was measured against the failures, not chosen
# for roundness: a misplaced decimal point is a factor of TEN, so a ×10 band
# lands the slip exactly on its own edge and passes it — probed, and it did.
# Four refuses that while leaving a 30% move (or a doubling) untouched.
#
# THE COST, stated: a currency that genuinely loses three quarters of its value
# against the dollar — a hyperinflating one over several years — will eventually
# fall out of its band and fail this check. That is the right failure. The fix
# is a human re-anchoring the entry with a new date, which reads like the
# decision it is, and the message says so rather than leaving it to be guessed.
#
# WHAT THIS CANNOT DO is tell you whether the anchors themselves were right on
# 2026-08-16. They came from the file they now guard, so they inherit whatever
# it held that day. The band catches DRIFT away from a known-good snapshot; it
# is not an independent valuation.
BAND_FACTOR = 4
ANCHORS = {
    "NZD": 1.0,
    "AED": 2.16, "AUD": 0.831, "BRL": 3.05, "CAD": 0.817, "CHF": 0.478,
    "CNY": 3.96, "CZK": 12.3, "DKK": 3.80, "EUR": 0.509, "FJD": 1.30,
    "GBP": 0.435, "HKD": 4.62, "IDR": 10500.0, "ILS": 1.74, "INR": 56.2,
    "JPY": 93.7, "KRW": 832.0, "MXN": 10.0, "MYR": 2.40, "NOK": 5.56,
    "PGK": 2.58, "PHP": 36.2, "PLN": 2.19, "SEK": 5.60, "SGD": 0.752,
    "THB": 19.5, "TOP": 1.40, "TRY": 28.2, "TWD": 18.8, "USD": 0.589,
    "VND": 15200.0, "WST": 1.57, "XPF": 60.7, "ZAR": 9.52,
}


def rate_problems(rates):
    """Every complaint about a `{code: rate}` table, as a list of strings.

    Shared by `--check` (the committed file) and the write path (a freshly
    fetched one), because a bad rate is equally bad in both places and the
    write path is the cheaper of the two to catch it in — nothing has shipped
    yet. Pure: no network, no git, no clock.
    """
    problems = []
    for code in WANTED:
        if code not in rates:
            problems.append(
                f"{code} is in WANTED but has no rate. A currency the source "
                f"quietly stops publishing used to vanish from the settings "
                f"list with nothing said — if it is genuinely gone, take it "
                f"out of WANTED in tools/fetch_fx.py and say why")
    for code, v in sorted(rates.items()):
        if not (isinstance(v, (int, float)) and not isinstance(v, bool)
                and math.isfinite(v) and v > 0):
            problems.append(f"rate for {code} is {v!r} — not a positive finite number")
            continue
        anchor = ANCHORS.get(code)
        if anchor is None:
            problems.append(
                f"{code} has a rate but no anchor in ANCHORS — a rate nothing "
                f"bounds is a rate no check can refuse")
        elif not (anchor / BAND_FACTOR <= v <= anchor * BAND_FACTOR):
            problems.append(
                f"rate for {code} is {v} — outside the plausibility band "
                f"[{anchor / BAND_FACTOR:g}, {anchor * BAND_FACTOR:g}] around "
                f"its {anchor:g} anchor. Either the source is wrong or the "
                f"anchor in tools/fetch_fx.py has aged out; decide which")
    return problems


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


def fetched_today():
    """True when the committed file was already refreshed today.

    The owner's ceiling: the rates move in the repo at most once a day
    (2026-08-16). Enforcing it in the TOOL rather than in whoever runs it is
    what makes "run this every session" a safe instruction — a busy day of ten
    commits still produces at most one rate change, so the guard is what lets
    the habit be mindless.
    """
    return current_doc().get("fetched") == date.today().isoformat()


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
        problems.append("the base currency's own rate must be exactly 1.0")
    problems += rate_problems(doc.get("rates") or {})
    if not isinstance(doc.get("asOf"), str):
        problems.append("asOf must be an ISO date — the app tells readers how old the rates are")
    if problems:
        for p in problems:
            print(f"fx.json: {p}", file=sys.stderr)
        return 1
    # Say the POPULATION, not just the verdict: "35 rates" is only reassuring
    # beside the number wanted, and a rate the source stopped publishing used
    # to show up here as a smaller number nobody was comparing against anything.
    print(f"fx.json OK — {len(doc['rates'])} of {len(WANTED)} wanted rates, all "
          f"inside a ×{BAND_FACTOR} band, base {doc['base']}, as at {doc['asOf']}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="validate the committed file; no network")
    ap.add_argument("--dry-run", action="store_true", help="fetch and print, but don't write")
    ap.add_argument(
        "--force",
        action="store_true",
        help="ignore the two NOISE guards (already-fetched-today, and no-rate-moved) "
        "and write anyway. Rarely wanted: a write with identical numbers costs every "
        "installed phone a re-download of the data cache for nothing. It does NOT "
        "bypass the plausibility band — that one is about correctness, not noise.",
    )
    ap.add_argument(
        "--bump",
        action="store_true",
        help="also bump DATA_VERSION in site/sw.js when the rates actually changed "
        "— pair it with a normal run so the two land in one commit",
    )
    args = ap.parse_args()

    if args.check:
        return check()

    # Cheapest guard first: skip the network entirely when we already looked
    # today. This is the one that makes the tool safe to run on every commit.
    if fetched_today() and not args.force:
        print(f"already refreshed today ({current_as_of()}) — nothing to do")
        return 0

    doc, missing = build()
    if missing:
        print(f"warning: source has no rate for {', '.join(missing)} — omitted", file=sys.stderr)
    # The band applies to what we are about to WRITE, not only to what is
    # already committed. Catching it here costs nothing and catches it before
    # it ships; catching it in --check catches it after. Previously a missing
    # currency was a stderr warning nobody reads in a scheduled job's log, and
    # the file was written without it.
    # NOT bypassed by --force, deliberately. --force exists to defeat the two
    # NOISE guards (fetched-today, no-rate-moved); this is a CORRECTNESS guard,
    # and a flag whose stated purpose is "write anyway" must not double as a
    # licence to ship a corrupt rate. When an anchor has genuinely aged out the
    # escape is to re-anchor it in ANCHORS above — an edit a reviewer can see,
    # which is the point.
    bad = rate_problems(doc.get("rates") or {})
    if bad:
        for p in bad:
            print(f"refusing to write fx.json: {p}", file=sys.stderr)
        print("\nNothing was written. The committed rates stay as they are, "
              "which is the safe side of this: stale beats wrong.", file=sys.stderr)
        return 1
    text = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
    if args.dry_run:
        print(text)
        return 0

    if not rates_changed(doc) and not args.force:
        # The scheduled job runs whether or not the rates moved. Rewriting the file
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
