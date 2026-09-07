#!/usr/bin/env python3
"""Validate the two record stores nothing was checking: `data/images/` and
`data/withdrawn/`.

WHY THIS EXISTS. The Theme 38 cold review (2026-09-07) found three stores under
`data/` that no document described and two that no tool validated. An unvalidated
store is not a small gap here, because of what these two hold:

  • `data/images/` is the PROVENANCE of every photograph the app ships. This is a
    public repo and the shipped images are the venue's own product photography,
    used under a rights basis the owner authorised by name (ADR 0090's sibling
    reasoning; `data/images/mcdonalds.json` states the basis and the take-down
    route). A photo that ships with no row here is a published image nobody can
    say where we got. That is the direction this checks hardest — every dish
    image in the payload must have a row, not merely every row a file.
  • `data/withdrawn/` holds rows PULLED FROM THE PAYLOAD BY POLICY (ADR 0085),
    not by the shop. Its own note explains why it is deliberately NOT
    `data/history/dishes/`: `split_data.py --check` reconstructs the pre-split
    corpus from that store, so a row in both would be restored twice. Nothing
    enforced that separation until this file.

WHAT IT DELIBERATELY DOES NOT DO. It says nothing about whether a rights basis is
sound, or whether a withdrawal was the right call. Those are the owner's, and a
tool that appeared to answer them would be worse than one that does not.

    python3 tools/check_records.py             # validate both stores
    python3 tools/check_records.py --selftest  # break a good fixture 14 ways;
                                               # every break must be caught

Exit 0 = clean. 1 = at least one problem. Stdlib only; reads `site/` and `data/`,
writes nothing outside a temporary tree in `--selftest`.
"""

import argparse
import copy
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENUES = ROOT / "site" / "data" / "restaurants"
IMAGES = ROOT / "data" / "images"
WITHDRAWN = ROOT / "data" / "withdrawn"
DEPARTED = ROOT / "data" / "history" / "dishes"

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def text(value):
    return value if isinstance(value, str) and value.strip() else None


def load(path):
    try:
        return json.loads(path.read_text()), None
    except (OSError, json.JSONDecodeError) as exc:
        return None, f"{path.name}: unreadable — {exc}"


def dish_ids(doc):
    """Every id a dish in this venue answers to, live ids and `formerIds` alike,
    mapped to the section that holds it."""
    out = {}
    for section in doc.get("menu") or []:
        if not isinstance(section, dict):
            continue
        for item in section.get("items") or []:
            if not isinstance(item, dict):
                continue
            for key in [item.get("dishId")] + list(item.get("formerIds") or []):
                if text(key):
                    out.setdefault(key, section)
    return out


def payload(vid):
    f = VENUES / f"{vid}.json"
    return json.loads(f.read_text()) if f.is_file() else None


def check_images(root=ROOT):
    """Provenance for every shipped photograph, in both directions."""
    problems, rows = [], 0
    images, venues = root / "data" / "images", root / "site/data/restaurants"
    covered = {}
    for f in sorted(images.glob("*.json")) if images.is_dir() else []:
        doc, err = load(f)
        if err:
            problems.append(err)
            continue
        vid = doc.get("venue")
        if vid != f.stem:
            problems.append(f"{f.name}: `venue` is {vid!r}, filename says "
                            f"{f.stem!r} — the store keys on the venue id")
        pay = json.loads((venues / f"{f.stem}.json").read_text()) \
            if (venues / f"{f.stem}.json").is_file() else None
        if pay is None:
            problems.append(f"{f.name}: no venue record in site/data/restaurants/")
            continue
        if not ISO_DATE.match(str(doc.get("retrieved", ""))):
            problems.append(f"{f.name}: `retrieved` must be an ISO date")
        rights = doc.get("rights")
        if not isinstance(rights, dict):
            problems.append(f"{f.name}: no `rights` — a published photograph "
                            f"with no stated basis is the whole risk here")
            rights = {}
        for field in ("holder", "licence", "basis"):
            if not text(rights.get(field)):
                problems.append(f"{f.name}: rights.{field} is missing or empty")
        known = dish_ids(pay)
        seen = set()
        for row in doc.get("images") or []:
            rows += 1
            did, rel = text(row.get("dishId")), text(row.get("file"))
            if not did:
                problems.append(f"{f.name}: an image row has no `dishId`")
                continue
            if did in seen:
                problems.append(f"{f.name}: two rows claim the dish {did!r}")
            seen.add(did)
            if did not in known:
                problems.append(f"{f.name}: {did!r} is no dish in "
                                f"{f.stem}.json, live id or former")
            if not rel:
                problems.append(f"{f.name}: {did!r} names no `file`")
                continue
            want = f"site/img/{f.stem}/"
            if not rel.startswith(want):
                problems.append(f"{f.name}: {did!r} claims {rel!r}, outside "
                                f"{want} — a record may only speak for its "
                                f"own venue's files")
                continue
            path = root / rel
            if not path.is_file():
                problems.append(f"{f.name}: {rel} does not exist")
                continue
            covered[rel] = f.name
            size = row.get("bytes")
            if isinstance(size, int) and size != path.stat().st_size:
                problems.append(f"{f.name}: {rel} records {size} bytes, the "
                                f"file is {path.stat().st_size}")
    # The direction that matters. A row with no file is a stale record; a FILE
    # with no row is a photograph published with nothing saying where it came
    # from, and this repo is public.
    for vf in sorted(venues.glob("*.json")):
        pay = json.loads(vf.read_text())
        for section in pay.get("menu") or []:
            for item in (section or {}).get("items") or []:
                img = text((item or {}).get("image"))
                if img and f"site/{img}" not in covered:
                    problems.append(
                        f"{vf.stem}: {item.get('name')!r} ships site/{img} "
                        f"with no row in data/images/{vf.stem}.json — a "
                        f"published photograph with no recorded provenance")
    return problems, rows


def check_withdrawn(root=ROOT):
    """Rows pulled by policy: still real, still absent from the payload, and
    never also in the departed-dishes store."""
    problems, rows = [], 0
    store = root / "data" / "withdrawn"
    venues, departed = root / "site/data/restaurants", root / "data/history/dishes"
    for f in sorted(store.glob("*.json")) if store.is_dir() else []:
        doc, err = load(f)
        if err:
            problems.append(err)
            continue
        if doc.get("venue") != f.stem:
            problems.append(f"{f.name}: `venue` is {doc.get('venue')!r}, "
                            f"filename says {f.stem!r}")
        vf = venues / f"{f.stem}.json"
        if not vf.is_file():
            problems.append(f"{f.name}: no venue record in site/data/restaurants/")
            continue
        pay = json.loads(vf.read_text())
        if not ISO_DATE.match(str(doc.get("withdrawn", ""))):
            problems.append(f"{f.name}: `withdrawn` must be an ISO date")
        for field in ("reason", "note"):
            if not text(doc.get(field)):
                problems.append(
                    f"{f.name}: `{field}` is missing or empty — a row pulled "
                    f"by policy is unreadable without the policy")
        sections = {text(s.get("sectionId")): s for s in pay.get("menu") or []
                    if isinstance(s, dict)}
        live = dish_ids(pay)
        df = departed / f"{f.stem}.json"
        gone = {text((r.get("key") or {}).get("dishId"))
                for r in (json.loads(df.read_text()).get("rows", [])
                          if df.is_file() else [])}
        for row in doc.get("rows") or []:
            rows += 1
            item = row.get("item") or {}
            did = text(item.get("dishId"))
            if not text(item.get("name")) or not did:
                problems.append(f"{f.name}: a row's item has no name or dishId")
                continue
            if not text(row.get("sectionId")):
                problems.append(f"{f.name}: {did!r} carries no `sectionId` — "
                                f"this store is the one that always has")
            elif row["sectionId"] not in sections:
                problems.append(f"{f.name}: {did!r} names the section "
                                f"{row['sectionId']!r}, which {f.stem}.json "
                                f"no longer has")
            if did in live:
                problems.append(
                    f"{f.name}: {did!r} is recorded as withdrawn AND is live "
                    f"in the payload — one of the two is wrong")
            if did in gone:
                problems.append(
                    f"{f.name}: {did!r} is in this store AND in "
                    f"data/history/dishes/ — split_data.py reconstructs from "
                    f"that one, so the dish would come back twice")
    return problems, rows


# --selftest. Each entry breaks the fixture in exactly one way and must be
# caught. Written as mutations rather than assertions for the reason
# test_validate.py gives: a validator's failure mode is silence, and a suite of
# clean-data assertions cannot tell a working gate from a deleted one.
GOOD_VENUE = {
    "id": "test-venue",
    "menu": [{
        "section": "Mains", "sectionId": "mains",
        "items": [
            {"name": "Pictured Dish", "dishId": "pictured-dish", "price": 10.0,
             "image": "img/test-venue/pictured-dish.webp", "alt": "A dish"},
            {"name": "Plain Dish", "dishId": "plain-dish", "price": 8.0},
        ],
    }],
}
GOOD_IMAGES = {
    "venue": "test-venue", "note": "provenance", "retrieved": "2026-09-08",
    "rights": {"holder": "Test Venue Ltd", "licence": "none — all rights "
               "reserved", "basis": "the venue's own product photography"},
    "images": [{"dishId": "pictured-dish", "dish": "Pictured Dish",
                "file": "site/img/test-venue/pictured-dish.webp", "bytes": 5}],
}
GOOD_WITHDRAWN = {
    "venue": "test-venue", "note": "pulled by policy, not by the shop",
    "withdrawn": "2026-09-08", "reason": "policy-adr-0085",
    "rows": [{"section": "Mains", "sectionId": "mains",
              "item": {"name": "Online Deal", "dishId": "online-deal",
                       "price": 9.0}}],
}

CASES = [
    ("a photograph shipped with no provenance row",
     lambda v, i, w: i["images"].clear()),
    ("an image row for a dish the venue does not have",
     lambda v, i, w: i["images"][0].update(dishId="ghost-dish")),
    ("an image row naming a file that is not there",
     lambda v, i, w: i["images"][0].update(file="site/img/test-venue/no.webp")),
    ("an image row reaching into another venue's folder",
     lambda v, i, w: i["images"][0].update(file="site/img/elsewhere/x.webp")),
    ("a byte count that disagrees with the file",
     lambda v, i, w: i["images"][0].update(bytes=999999)),
    ("two rows claiming the same dish",
     lambda v, i, w: i["images"].append(dict(i["images"][0]))),
    ("no rights block at all", lambda v, i, w: i.pop("rights")),
    ("a rights block with no basis",
     lambda v, i, w: i["rights"].update(basis="")),
    ("a venue id that disagrees with the filename",
     lambda v, i, w: i.update(venue="other-venue")),
    ("a withdrawn row that is also live in the payload",
     lambda v, i, w: v["menu"][0]["items"].append(
         {"name": "Online Deal", "dishId": "online-deal", "price": 9.0})),
    ("a withdrawn row with no sectionId",
     lambda v, i, w: w["rows"][0].pop("sectionId")),
    ("a withdrawn row naming a section the venue no longer has",
     lambda v, i, w: w["rows"][0].update(sectionId="gone")),
    ("a withdrawal with no reason",
     lambda v, i, w: w.update(reason="  ")),
    ("a non-ISO withdrawal date",
     lambda v, i, w: w.update(withdrawn="8 September")),
]


def build(tree, venue, images, withdrawn, departed=None):
    for d in ("site/data/restaurants", "site/img/test-venue", "data/images",
              "data/withdrawn", "data/history/dishes"):
        (tree / d).mkdir(parents=True, exist_ok=True)
    (tree / "site/img/test-venue/pictured-dish.webp").write_bytes(b"webp!")
    (tree / "site/data/restaurants/test-venue.json").write_text(
        json.dumps(venue, indent=2))
    (tree / "data/images/test-venue.json").write_text(json.dumps(images, indent=2))
    (tree / "data/withdrawn/test-venue.json").write_text(
        json.dumps(withdrawn, indent=2))
    if departed is not None:
        (tree / "data/history/dishes/test-venue.json").write_text(
            json.dumps(departed, indent=2))


def selftest(verbose):
    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        tree = Path(tmp) / "repo"
        (tree / "tools").mkdir(parents=True)
        shutil.copy(ROOT / "tools" / "check_records.py", tree / "tools")

        def run():
            r = subprocess.run([sys.executable, "tools/check_records.py"],
                               cwd=tree, capture_output=True, text=True)
            if verbose:
                print("    " + r.stdout.strip().replace("\n", "\n    "))
            return r

        build(tree, copy.deepcopy(GOOD_VENUE), copy.deepcopy(GOOD_IMAGES),
              copy.deepcopy(GOOD_WITHDRAWN))
        if run().returncode != 0:
            print("✗ the unmutated fixture does not pass — the test is wrong, "
                  "not the gate")
            run()
            return 1
        print("✓ clean fixture passes")

        # Asserted separately because it needs a fourth file: a dish recorded
        # both as withdrawn-by-policy and as departed-by-the-shop.
        extra = [("a dish in BOTH the withdrawn and departed stores", {
            "venue": "test-venue", "note": "departed", "rows": [{
                "key": {"section": "Mains", "sectionId": "mains",
                        "name": "Online Deal", "code": None,
                        "dishId": "online-deal"},
                "item": {"name": "Online Deal", "dishId": "online-deal",
                         "available": {"offBy": "2026-08-08"}}}]})]

        for name, mutate in CASES:
            v, i, w = (copy.deepcopy(GOOD_VENUE), copy.deepcopy(GOOD_IMAGES),
                       copy.deepcopy(GOOD_WITHDRAWN))
            mutate(v, i, w)
            build(tree, v, i, w)
            if run().returncode == 0:
                failures.append(name)
                print(f"  ✗ SLIPPED THROUGH: {name}")
            elif verbose:
                print(f"  ✓ caught: {name}")
        for name, departed in extra:
            build(tree, copy.deepcopy(GOOD_VENUE), copy.deepcopy(GOOD_IMAGES),
                  copy.deepcopy(GOOD_WITHDRAWN), departed)
            if run().returncode == 0:
                failures.append(name)
                print(f"  ✗ SLIPPED THROUGH: {name}")
            elif verbose:
                print(f"  ✓ caught: {name}")

    total = len(CASES) + len(extra)
    print(f"{'✓' if not failures else '✗'} record-store gate: "
          f"{total - len(failures)}/{total} mutations caught")
    return 1 if failures else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--selftest", action="store_true",
                    help="break a good fixture one way at a time and assert "
                         "every break is caught")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest(args.verbose)

    img_problems, img_rows = check_images()
    wd_problems, wd_rows = check_withdrawn()
    problems = img_problems + wd_problems
    # The population before the verdict — "clean" over nothing reads exactly
    # like "clean" over everything (ADR 0072).
    n_img = len(list(IMAGES.glob("*.json"))) if IMAGES.is_dir() else 0
    n_wd = len(list(WITHDRAWN.glob("*.json"))) if WITHDRAWN.is_dir() else 0
    print(f"  scope: data/images/ {n_img} file(s), {img_rows} row(s) · "
          f"data/withdrawn/ {n_wd} file(s), {wd_rows} row(s)")
    if problems:
        print(f"✗ check_records: {len(problems)} problem(s).")
        for x in problems:
            print(f"  {x}")
        return 1
    print("✓ check_records clean — every shipped photograph has its provenance, "
          "every policy-withdrawn row is absent from the payload and from the "
          "departed-dish store.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
