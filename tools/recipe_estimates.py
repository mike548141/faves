#!/usr/bin/env python3
"""Check and report the recipe time/serving estimates in `data/estimates/`.

WHY THIS EXISTS. The owner ruled on 2026-08-16 that per-step times, recipe
totals and serving sizes may be *estimated*, provided they are labelled as
estimates. An estimate with no working is a number nobody can argue with, so
every one of them is recorded in `data/estimates/recipes.json` beside the
reasoning that produced it, in the repo-only research store rather than in the
precached payload (ADR 0047). This tool is what stops that record drifting away
from the recipes it describes.

THE SAFETY INVARIANT, AND WHY IT IS A HARD FAILURE. Stated durations drive the
per-step timers (`stepDuration` in site/js/cook.js). An *estimated* duration
must never drive one: an invented "simmer 20 min" on chicken thighs is a
food-safety failure, not a disappointing dinner. So every step estimate carries
`timerSafe`, true only where the duration came from the recipe's own text, and
`--check` exits 1 the moment those two disagree. A guard nobody has watched fail
is decoration — the three corruptions this was proved against are listed in
`data/estimates/README.md`.

WHAT "STATED" MEANS, MECHANICALLY. The recipe text says it — in digits ("for 35
minutes") or in words ("for a minute"). `--check` re-parses the text and rejects
any `stated` value the text does not support, and any `estimated` step whose
text does state a time. A RANGE TAKES ITS LOWER BOUND, matching cook.js: the
timer exists to bring you back to the oven, and coming back early to look is
right while coming back at 8 may already be too late.

    python3 tools/recipe_estimates.py --check    # gate: structure, alignment, safety
    python3 tools/recipe_estimates.py --report   # counts by source and by phase
    python3 tools/recipe_estimates.py --report --venue cook-at-home

Exit 0 = clean; 1 = one or more failures (safety breaches included, and printed
first). Stdlib only, no build step.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"
ESTIMATES = ROOT / "data" / "estimates" / "recipes.json"

SOURCES = {"stated", "estimated"}
PHASES = {"prep", "cook", "wait"}

UNIT_MINUTES = {"sec": 1 / 60, "second": 1 / 60, "min": 1, "minute": 1, "hr": 60, "hour": 60}

# Mirrors DURATION in site/js/cook.js: the number must be followed by a time
# unit, so oven temperatures ("180°C"), tin sizes ("20cm") and yields
# ("makes 21") can never be read as a duration. A range keeps its lower bound.
DIGIT_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:[–—-]\s*\d+(?:\.\d+)?\s*)?(sec|second|min|minute|hr|hour)s?\b",
    re.I,
)
# cook.js cannot see these, but the cook can: "cook the garlic for a minute" is
# the recipe stating a time, not us inventing one. `second` is deliberately
# absent — this corpus contains "a second layer of biscuits", and a unit list
# that reads that as a duration would mislabel an estimate as stated.
WORD_RE = re.compile(r"\b(?:a|an|one)\s+(min|minute|hr|hour)s?\b", re.I)

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def durations(text):
    """[{quote, minutes}] the text itself states, in reading order. Pure.

    Quoted by sentence rather than by matched phrase, because the working note
    has to be re-checkable by a human: "Chill in the fridge for 5–10 minutes."
    argues for itself in a way that "5–10 minutes" does not.
    """
    found = []
    for sentence in SENTENCE_RE.split(str(text or "").strip()):
        minutes = 0.0
        hits = 0
        for match in list(DIGIT_RE.finditer(sentence)):
            minutes += float(match.group(1)) * UNIT_MINUTES[match.group(2).lower()]
            hits += 1
        for match in WORD_RE.finditer(sentence):
            minutes += UNIT_MINUTES[match.group(1).lower()]
            hits += 1
        if hits:
            found.append({"quote": sentence.strip(), "minutes": round(minutes)})
    return found


def stated_minutes(text):
    """Total minutes the text states, or None if it states nothing."""
    found = durations(text)
    return sum(f["minutes"] for f in found) if found else None


def load_recipes(venue_id):
    """{dishId: item} for a venue, in menu order, plus the venue name."""
    path = VENUES / f"{venue_id}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    items = {}
    for section in data.get("menu") or []:
        for item in section.get("items") or []:
            items[item.get("dishId")] = item
    return items


def load_estimates():
    return json.loads(ESTIMATES.read_text(encoding="utf-8"))


def check_step(errs, dish_id, item, index, est):
    """One step's estimate against the recipe's own step text."""
    where = f"{dish_id} step {index}"
    steps = item.get("steps") or []
    text = steps[index] if index < len(steps) else ""

    if est.get("index") != index:
        errs.append((False, f"{where}: index field says {est.get('index')!r}"))
    phase = est.get("phase")
    if phase not in PHASES:
        errs.append((False, f"{where}: phase {phase!r} is not one of {sorted(PHASES)}"))
    if not (est.get("working") or "").strip():
        errs.append((False, f"{where}: no working — a number with no working is not a record"))

    minutes, source, safe = est.get("minutes"), est.get("source"), est.get("timerSafe")

    # THE SAFETY INVARIANT. Checked before anything else about this step, and
    # phrased so the failure names the food risk rather than the schema.
    if safe is True and source != "stated":
        errs.append((
            True,
            f"SAFETY: {where} is timerSafe with source {source!r} — an estimated "
            f"duration may never drive a timer (see this tool's header)",
        ))
    if safe is not True and source == "stated":
        errs.append((False, f"{where}: stated but timerSafe {safe!r}; stated times are the ones that may drive a timer"))
    if not isinstance(safe, bool):
        errs.append((False, f"{where}: timerSafe {safe!r} is not a boolean"))

    if minutes is None:
        if source is not None:
            errs.append((False, f"{where}: minutes is null so source must be null, not {source!r}"))
        return
    if source not in SOURCES:
        errs.append((False, f"{where}: source {source!r} is not one of {sorted(SOURCES)}"))
        return
    if not isinstance(minutes, int) or minutes <= 0:
        errs.append((False, f"{where}: minutes {minutes!r} is not a positive whole number"))
        return

    said = stated_minutes(text)
    if source == "stated":
        if said is None:
            errs.append((False, f"{where}: marked stated, but its text states no duration: {text!r}"))
        elif said != minutes:
            errs.append((False, f"{where}: marked stated as {minutes} min, but its text says {said} min"))
    elif said is not None:
        errs.append((False, f"{where}: marked estimated, but its text states {said} min — that is a stated value"))


def check_recipe(errs, dish_id, item, rec):
    steps = item.get("steps") or []
    ests = rec.get("steps")
    if not isinstance(ests, list):
        errs.append((False, f"{dish_id}: steps is not a list"))
        return
    if len(ests) != len(steps):
        errs.append((
            False,
            f"{dish_id}: {len(ests)} step estimate(s) against {len(steps)} recipe step(s) — "
            "the recipe changed under the record",
        ))
        return
    for index, est in enumerate(ests):
        check_step(errs, dish_id, item, index, est)

    # serves: the payload's own value wins, always. 36c's ruling was to estimate
    # what is missing, never to restate what the data already knows.
    serves, source = rec.get("serves"), rec.get("servesSource")
    stated = item.get("serves")
    if serves is None:
        if source is not None:
            errs.append((False, f"{dish_id}: serves is null so servesSource must be null, not {source!r}"))
    elif source not in SOURCES:
        errs.append((False, f"{dish_id}: servesSource {source!r} is not one of {sorted(SOURCES)}"))
    if stated is not None and (source != "stated" or serves != stated):
        errs.append((
            False,
            f"{dish_id}: the recipe states serves {stated}; the record says {serves!r} ({source!r})",
        ))
    if stated is None and source == "stated":
        errs.append((False, f"{dish_id}: servesSource is stated, but the recipe has no serves field"))
    if serves is not None and not (rec.get("servesWorking") or "").strip():
        errs.append((False, f"{dish_id}: serves {serves} with no working"))

    # yield: free text ("21 cakes"), stated only if every number in it is in the
    # recipe's own words. This is what keeps "makes 21" from becoming a guess.
    yielded, ysource = rec.get("yield"), rec.get("yieldSource")
    if yielded is None:
        if ysource is not None:
            errs.append((False, f"{dish_id}: yield is null so yieldSource must be null, not {ysource!r}"))
    elif ysource not in SOURCES:
        errs.append((False, f"{dish_id}: yieldSource {ysource!r} is not one of {sorted(SOURCES)}"))
    elif ysource == "stated":
        haystack = " ".join([str(item.get("desc") or ""), *steps])
        words = set(re.findall(r"\d+", haystack))
        missing = [n for n in re.findall(r"\d+", yielded) if n not in words]
        if missing:
            errs.append((
                False,
                f"{dish_id}: yield {yielded!r} is marked stated, but {missing} appears nowhere in its text",
            ))

    total, tsource = rec.get("timeTotal"), rec.get("timeTotalSource")
    said = stated_minutes(item.get("time")) if item.get("time") else None
    if total is None:
        if tsource is not None:
            errs.append((False, f"{dish_id}: timeTotal is null so timeTotalSource must be null, not {tsource!r}"))
    elif tsource not in SOURCES:
        errs.append((False, f"{dish_id}: timeTotalSource {tsource!r} is not one of {sorted(SOURCES)}"))
    elif not isinstance(total, int) or total <= 0:
        errs.append((False, f"{dish_id}: timeTotal {total!r} is not a positive whole number"))
    if said is not None:
        if tsource != "stated":
            errs.append((False, f"{dish_id}: the recipe states time {item['time']!r}; the record marks the total {tsource!r}"))
        elif total != said:
            errs.append((False, f"{dish_id}: the recipe's time {item['time']!r} reads as {said} min, the record says {total!r}"))
    elif tsource == "stated":
        errs.append((False, f"{dish_id}: timeTotalSource is stated, but the recipe has no time field"))
    if total is not None and not (rec.get("timeTotalWorking") or "").strip():
        errs.append((False, f"{dish_id}: timeTotal {total} with no working"))


def check(venue_id):
    """[(is_safety, message)] — empty means clean."""
    errs = []
    try:
        data = load_estimates()
    except (OSError, ValueError) as exc:
        return [(False, f"{ESTIMATES}: {exc}")]

    if not isinstance(data.get("safety"), dict) or not data["safety"].get("rule"):
        errs.append((False, "the file carries no `safety.rule` — the timer rule must travel with the data"))

    recipes = load_recipes(venue_id)
    records = data.get("recipes")
    if not isinstance(records, dict):
        return errs + [(False, "`recipes` is not an object keyed by dishId")]

    for dish_id in records:
        if dish_id not in recipes:
            errs.append((False, f"{dish_id}: no such dish in {venue_id}.json — renamed, or a typo"))
    for dish_id in recipes:
        if dish_id not in records:
            errs.append((False, f"{dish_id}: in {venue_id}.json with no estimate recorded"))

    for dish_id, rec in records.items():
        if dish_id in recipes:
            check_recipe(errs, dish_id, recipes[dish_id], rec)
    return errs


def report(venue_id):
    data = load_estimates()
    recipes = load_recipes(venue_id)
    records = data.get("recipes", {})

    def tally(values):
        out = {"stated": 0, "estimated": 0, "null": 0}
        for v in values:
            out["null" if v is None else v] += 1
        return out

    serves = tally(r.get("servesSource") for r in records.values())
    totals = tally(r.get("timeTotalSource") for r in records.values())
    steps = tally(s.get("source") for r in records.values() for s in r.get("steps", []))
    phases = {p: 0 for p in sorted(PHASES)}
    risky = 0  # an estimated duration on a step where heat is on the food
    for rec in records.values():
        for s in rec.get("steps", []):
            if s.get("phase") in phases:
                phases[s["phase"]] += 1
            if s.get("phase") == "cook" and s.get("source") == "estimated":
                risky += 1

    print(f"# {venue_id} — {len(records)} recipes, {sum(steps.values())} steps\n")
    for label, t in (("serves", serves), ("total time", totals), ("steps", steps)):
        print(f"{label:<12} stated {t['stated']:>3}   estimated {t['estimated']:>3}   none {t['null']:>3}")
    print("\nphases       " + "   ".join(f"{p} {n}" for p, n in phases.items()))
    print(f"estimated durations on a `cook` step: {risky} — none of them may drive a timer")

    fully, mostly = [], []
    for dish_id, rec in sorted(records.items()):
        ss = [s.get("source") for s in rec.get("steps", [])]
        if ss and all(s == "stated" for s in ss):
            fully.append(dish_id)
        elif ss and sum(1 for s in ss if s == "stated") / len(ss) < 0.25:
            mostly.append(dish_id)

    print(f"\nevery step stated ({len(fully)}): {', '.join(fully) or '—'}")
    print(f"\nunder a quarter of steps stated ({len(mostly)}):")
    for dish_id in mostly:
        print(f"  {dish_id}")

    empty = [d for d, r in records.items() if not r.get("steps") and d in recipes]
    if empty:
        print(f"\nno method recorded at all ({len(empty)}): {', '.join(empty)}")
    nulls = [
        (d, s["index"])
        for d, r in records.items()
        for s in r.get("steps", [])
        if s.get("minutes") is None
    ]
    print(f"\nsteps left with no number ({len(nulls)}): " + ", ".join(f"{d}[{i}]" for d, i in nulls))


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--check", action="store_true", help="gate: structure, alignment with the recipes, and the timer safety invariant")
    ap.add_argument("--report", action="store_true", help="readable summary — counts by source and by phase")
    ap.add_argument("--venue", default="cook-at-home", help="venue id to check against (default: cook-at-home)")
    args = ap.parse_args()

    if not args.check and not args.report:
        ap.error("nothing to do — pass --check or --report")

    failed = False
    if args.check:
        errs = check(args.venue)
        # Safety first, literally: a breach of the timer rule prints above the
        # structural noise it may be buried in.
        for is_safety, message in sorted(errs, key=lambda e: not e[0]):
            print(("🛑 " if is_safety else "  ") + message, file=sys.stderr)
        if errs:
            print(f"\n{len(errs)} failure(s).", file=sys.stderr)
            failed = True
        else:
            print("estimates check: clean.")
    if args.report:
        report(args.venue)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
