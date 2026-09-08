#!/usr/bin/env python3
"""Does a venue's `verified` date agree with the evidence it was read from?

    python3 tools/check_provenance.py            # the guard (CI-safe)
    python3 tools/check_provenance.py --sweep    # the full table, one row a venue
    python3 tools/check_provenance.py --rebuild  # regenerate the evidence record
    python3 tools/check_provenance.py --selftest # prove the guard still refuses

WHY THIS EXISTS, measured rather than supposed. Simmer's four intake photos are
EXIF-dated **2026-08-25**; the record `simmer.json` was written with
`verified: 2026-09-07`, because that was the day the transcribing session ran
and today is what a session knows. Thirteen days of freshness the evidence
never supported — and `verified` is not cosmetic: `refreshCaveat` ages it, so
an inflated date **delays the "needs a refresh" warning by exactly the amount
it is inflated** (ADR 0036). The guard against staleness was handed a fresher
date than the truth. ADR 0031 already said `verified`/`verifiedBy` are
*derived* from the evidence and ADR 0038 already said the derivation comes off
the file — `tools/intake_exif.py` has read that metadata since 2026-08-15.
Nothing made a session USE it, and nothing could tell afterwards that it had
not. That is the gap this closes.

## What it compares, and why the two directions are not symmetrical

A **photograph** evidences a reading *on its capture date, exactly* — the
shutter fired while somebody stood at the board.

A **PDF** does not. `/CreationDate` says when the document was written, and a
menu written in March can be read in September; it bounds the reading from
**below** and says nothing above. Treating the two the same is how a real
record fails a correct check: `spices-indian` reads `verified: 2026-07-06`
against photos from 2023, and its reading came off `menu 3.pdf` — which the
PDF's own creation date supports and the photos cannot.

So a `verified` date is **supported** when some photo was captured on that
exact day, or some PDF was created on or before it. It is **refused** only
when nothing supports it *and* it is later than the newest photograph — the
false-freshness direction, which is the one that costs a reader a stale menu.
A `verified` EARLIER than all its evidence is reported and not failed: that is
a refresh waiting to be transcribed, not a claim that overstates itself.

## Why only two of the six methods are enforced

`verifiedBy` is a closed set (ADR 0031): `in-store` · `paper-menu` ·
`official-site` · `phone` · `delivery-app` · `third-party`. Only the first two
leave a file in `intake/`. A venue read off its own website last week may still
have year-old photos in its intake folder, and bounding *that* reading by *those*
photos would fail a correct record — so the other four are listed and skipped,
by name, never silently.

## What it does when `intake/` is absent — which is a fresh clone, CI, and
## every worktree

`intake/**` is gitignored. A guard that can only run beside the raw material is
a guard that never runs where it matters, so this reads **`data/intake/menu-sources.json`**
— a committed record of what each folder held: file name, capture date and
time, device, whether the file carried GPS. Not the images: this repo is public
and ADR 0090 measured 137 product photos carrying GPS on a private address, so
what lands here is the *provenance*, never a coordinate and never a pixel.

With `intake/` present the record is additionally checked against the live
files, so a folder that gained a photo shows up as drift rather than as
silence. Without it, the comparison still happens — against the committed
record — and the output says which of the two it did.

Stdlib only (ADR 0001 binds the tools by habit if not by rule).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from intake_exif import describe  # noqa: E402  (same directory, stdlib-only)

ROOT = Path(__file__).resolve().parent.parent
RECORD = ROOT / "data" / "intake" / "menu-sources.json"
VENUES = ROOT / "site" / "data" / "restaurants"
DEFAULT_INTAKE = "intake"

# Only these two are evidenced by a file in `intake/`. See the module docstring.
LOCALLY_EVIDENCED = {"in-store", "paper-menu"}

PHOTO_SUFFIXES = {".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic"}

# Intake stores another tool already accounts for. See build_record().
OWNED_ELSEWHERE = ("intake/ingredients",)


def load_record() -> dict:
    if not RECORD.exists():
        return {"venues": {}}
    return json.loads(RECORD.read_text())


def venue_record(vid: str) -> dict | None:
    p = VENUES / f"{vid}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def scan_folder(folder: Path) -> list[dict]:
    """Provenance rows for one intake folder, in file-name order.

    Deliberately shallow on content and loud on absence: a file whose EXIF
    carries no `DateTimeOriginal` gets `captured: null` and stays in the list,
    because "we have a file and it told us nothing" and "there is no file" are
    different states and only one of them is a gap in the evidence.
    """
    rows = []
    # Non-recursive on purpose: one folder is one venue's evidence, so a
    # sub-folder is a separate row in the mapping and not a silent inheritance.
    for f in sorted(folder.glob("*")):
        if not f.is_file() or f.name.startswith("."):
            continue
        suffix = f.suffix.lower()
        if suffix not in PHOTO_SUFFIXES and suffix != ".pdf":
            continue
        d = describe(f)
        rows.append({
            "file": f.name,
            "kind": "pdf" if suffix == ".pdf" else "photo",
            "captured": d.get("captured"),
            # The time is the half that shows a VISIT: Simmer's four are two
            # pairs 24 minutes apart, which is one person working round a shop.
            "capturedAt": d.get("captured_at"),
            "device": d.get("device"),
            # Presence only. A coordinate in a public repo is the leak ADR 0090
            # exists to stop; presence is what a strip-or-refuse rule needs.
            "gps": "present" if d.get("lat") is not None else "absent",
        })
    return rows


def material_present(intake: Path) -> bool:
    """Is there anything to read — as opposed to a directory that exists?

    🛑 `intake/` ALWAYS EXISTS. `.gitignore` un-ignores `intake/README.md`,
    `intake/menus/.gitkeep` and `intake/recipes/.gitkeep`, so a fresh clone, a
    CI checkout and every worktree get the folder with three files in it and no
    material. Testing `intake.exists()` — which is what the neighbouring intake
    tool does, and gets away with because its own sub-folder is not kept — takes
    the live branch everywhere, finds nothing on disk, and reports every venue
    in the committed record as DRIFT. Measured here before it shipped: 14 false
    refusals and exit 1 on a clean worktree. Presence is MATERIAL, not a path.
    """
    for f in intake.rglob("*"):
        if f.is_file() and not f.name.startswith(".") and (
                f.suffix.lower() in PHOTO_SUFFIXES or f.suffix.lower() == ".pdf"):
            return True
    return False


def newest_photo(rows: list[dict]) -> str | None:
    dates = [r["captured"] for r in rows if r["kind"] == "photo" and r["captured"]]
    return max(dates) if dates else None


def pdf_dates(rows: list[dict]) -> list[str]:
    return sorted(r["captured"] for r in rows if r["kind"] == "pdf" and r["captured"])


def supports(rows: list[dict], verified: str) -> str | None:
    """Which piece of evidence supports this exact `verified` date, if any."""
    for r in rows:
        if r["kind"] == "photo" and r["captured"] == verified:
            return f"{r['file']} captured {r['captured']}"
    for r in rows:
        if r["kind"] == "pdf" and r["captured"] and r["captured"] <= verified:
            return f"{r['file']} created {r['captured']} (bounds from below)"
    return None


def days_between(later: str, earlier: str) -> int:
    return (date.fromisoformat(later) - date.fromisoformat(earlier)).days


def judge(vid: str, entry: dict, rows: list[dict], rec: dict | None = None) -> dict:
    """One venue's verdict.

    `rec` is injectable so the selftest can drive the decision with a synthetic
    venue rather than by mutating a module global — which is the difference
    between a test that exercises this function and one that quietly replaces
    a piece of the tool it is meant to be checking.
    """
    rec = venue_record(vid) if rec is None else rec
    out = {"venue": vid, "folder": entry.get("folder"), "files": len(rows),
           "newestPhoto": newest_photo(rows), "pdfs": pdf_dates(rows)}
    if rec is None:
        out["status"] = "error"
        out["note"] = f"no site/data/restaurants/{vid}.json — the record names a venue that is not there"
        return out

    verified, method = rec.get("verified"), rec.get("verifiedBy")
    out["verified"], out["verifiedBy"] = verified, method

    if verified is None:
        out["status"] = "gap"
        out["note"] = "record carries no `verified` — evidence exists and nothing was derived from it"
        return out
    if method not in LOCALLY_EVIDENCED:
        out["status"] = "skipped"
        out["note"] = (f"read by `{method or 'no method'}`, which leaves no file in intake/ — "
                       "this evidence cannot bound it")
        return out

    why = supports(rows, verified)
    if why:
        out["status"] = "ok"
        out["note"] = why
        return out

    np = out["newestPhoto"]
    if np and verified > np:
        out["status"] = "fail"
        out["gapDays"] = days_between(verified, np)
        out["note"] = (f"claims {verified}; the newest photograph is {np} — "
                       f"{out['gapDays']} day(s) of freshness nothing evidences")
        return out

    out["status"] = "stale-evidence" if np else "unbounded"
    out["note"] = ("evidence is newer than the record — a refresh may be owed"
                   if np and verified < np else
                   "nothing in this folder dates the reading either way")
    return out


def build_record(intake: Path, existing: dict) -> dict:
    """Regenerate the committed record from the live intake material.

    The folder→venue mapping is NOT re-derived. GPS sorts photos, it does not
    pin them (ADR 0038: four Johnsonville venues inside one 25 m error circle,
    and in this corpus The Ramen Shop's own photos read nearest to Pizza Hut),
    and the folder name does not outrank the picture. The mapping is the
    transcribing session's own claim, carried forward — a new folder is
    reported and left unmapped rather than guessed at.
    """
    venues, unmapped = {}, []
    mapped_folders = {e["folder"]: vid for vid, e in existing.get("venues", {}).items()}
    for sub in sorted(p for p in intake.rglob("*") if p.is_dir()):
        rel = str(sub.relative_to(intake.parent)) if intake.parent in sub.parents else str(sub)
        # `intake/ingredients/` is the packaged-product channel and belongs to
        # ADR 0090's store: `tools/products.py --coverage --probe` already says
        # which of those bursts were read. Two tools reporting the same gap in
        # different words is how a gap gets closed once and looks open twice.
        if any(rel == s or rel.startswith(s + "/") for s in OWNED_ELSEWHERE):
            continue
        rows = scan_folder(sub)
        if not rows:
            continue
        vid = mapped_folders.get(rel)
        if not vid:
            unmapped.append(rel)
            continue
        venues[vid] = {"folder": rel, "evidence": rows}
    for vid, e in existing.get("venues", {}).items():
        if vid not in venues:
            unmapped.append(f"{e['folder']} (mapped to {vid}, not found on disk)")
    doc = dict(existing)
    doc["venues"] = {k: venues[k] for k in sorted(venues)}
    return doc, sorted(set(unmapped))


def serialise(doc: dict) -> str:
    return json.dumps(doc, indent=2, ensure_ascii=False) + "\n"


def selftest() -> int:
    """Break the good state and require a refusal — five ways, plus a control.

    A guard that only ever passes cannot show it stopped passing the right
    thing, and this one's whole subject is a field whose wrong value looks
    exactly like its right one.
    """
    photos = [
        {"file": "IMG_1.jpeg", "kind": "photo", "captured": "2026-08-25",
         "capturedAt": "2026-08-25T09:49:44+12:00", "device": "phone", "gps": "present"},
        {"file": "IMG_2.jpeg", "kind": "photo", "captured": "2026-08-25",
         "capturedAt": "2026-08-25T10:13:29+12:00", "device": "phone", "gps": "present"},
    ]
    pdf = [{"file": "menu.pdf", "kind": "pdf", "captured": "2026-07-06",
            "capturedAt": None, "device": None, "gps": "absent"}]
    cases = [
        # (name, verified, verifiedBy, rows, expected status)
        ("the control: a photo dates the reading exactly",
         "2026-08-25", "in-store", photos, "ok"),
        ("THE MEASURED DEFECT: today's date over 2026-08-25 evidence",
         "2026-09-07", "in-store", photos, "fail"),
        ("one day later than the newest photograph",
         "2026-08-26", "in-store", photos, "fail"),
        ("a PDF bounds a paper-menu reading from below",
         "2026-09-01", "paper-menu", pdf, "ok"),
        ("a reading dated BEFORE the document it came from",
         "2026-07-05", "paper-menu", pdf, "unbounded"),
        ("an official-site reading is not bounded by old photos",
         "2026-09-07", "official-site", photos, "skipped"),
        ("a photo newer than the record is a refresh owed, not a refusal",
         "2026-08-24", "in-store", photos, "stale-evidence"),
    ]
    failures = 0
    for name, verified, method, rows, expect in cases:
        got = judge("fixture", {"folder": "intake/menus/Fixture"}, rows,
                    rec={"verified": verified, "verifiedBy": method})["status"]
        ok = got == expect
        failures += 0 if ok else 1
        print(f"  {'PASS' if ok else 'FAIL'}  {name}: expected {expect}, got {got}")

    # And the half that decides whether this tool is safe to put in CI at all.
    # `.gitignore` keeps three files inside `intake/`, so the folder exists
    # everywhere and an `exists()` test reads a bare checkout as live material.
    import tempfile
    for name, layout, expect in [
        ("a checked-out intake/ (README + two .gitkeep) is NOT material",
         ["README.md", "menus/.gitkeep", "recipes/.gitkeep"], False),
        ("…and one real photograph in it IS",
         ["README.md", "menus/.gitkeep", "menus/Somewhere/IMG_1.jpeg"], True),
    ]:
        with tempfile.TemporaryDirectory() as td:
            for rel in layout:
                f = Path(td) / rel
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(b"")
            got = material_present(Path(td))
        ok = got is expect
        failures += 0 if ok else 1
        print(f"  {'PASS' if ok else 'FAIL'}  {name}: expected {expect}, got {got}")

    total = len(cases) + 2
    print(f"\n{'OK' if not failures else 'REFUSED'} — {total - failures} passed, {failures} failed")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Check a venue's `verified` date against the evidence it was read from.",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--intake", default=DEFAULT_INTAKE,
                    help=f"where the raw material lives (default: {DEFAULT_INTAKE}). "
                         "Gitignored, so absent on a fresh clone, in CI and in every "
                         "worktree — then the committed record is used instead.")
    ap.add_argument("--sweep", action="store_true", help="print every venue's row, not only the refusals")
    ap.add_argument("--rebuild", action="store_true", help="regenerate data/intake/menu-sources.json")
    ap.add_argument("--selftest", action="store_true", help="prove the guard still refuses")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    record = load_record()
    intake = (ROOT / args.intake) if not Path(args.intake).is_absolute() else Path(args.intake)
    live = material_present(intake)

    if args.rebuild:
        if not live:
            print(f"intake not present ({args.intake}) — nothing to read. The committed "
                  "record is left exactly as it is.")
            return 0
        doc, unmapped = build_record(intake, record)
        RECORD.parent.mkdir(parents=True, exist_ok=True)
        RECORD.write_text(serialise(doc))
        n = sum(len(v["evidence"]) for v in doc["venues"].values())
        print(f"wrote {RECORD.relative_to(ROOT)} — {len(doc['venues'])} venue(s), {n} file(s)")
        for u in unmapped:
            print(f"  UNMAPPED  {u} — add it to `venues` by hand; GPS sorts, it does not pin")
        return 0

    source = "live intake/" if live else "the committed record"
    rows_by_venue = {}
    drift = []
    for vid, entry in record.get("venues", {}).items():
        if live:
            folder = intake.parent / entry["folder"]
            if not folder.exists():
                drift.append(f"{entry['folder']} is in the record and not on disk")
                rows_by_venue[vid] = entry["evidence"]
                continue
            fresh = scan_folder(folder)
            if fresh != entry["evidence"]:
                drift.append(f"{entry['folder']} no longer matches the record — "
                             f"{len(entry['evidence'])} file(s) recorded, {len(fresh)} on disk; "
                             "run --rebuild")
            rows_by_venue[vid] = fresh
        else:
            rows_by_venue[vid] = entry["evidence"]

    verdicts = [judge(vid, record["venues"][vid], rows) for vid, rows in rows_by_venue.items()]
    verdicts.sort(key=lambda v: v["venue"])

    bad = [v for v in verdicts if v["status"] in ("fail", "error")]
    show = verdicts if args.sweep else bad
    if args.sweep:
        print(f"{'venue':<26} {'evidence':<12} {'verified':<11} {'by':<14} {'gap':>5}  verdict")
        print("-" * 96)
    for v in show:
        gap = str(v.get("gapDays", "")) if v.get("gapDays") is not None else ""
        print(f"{v['venue']:<26} {v.get('newestPhoto') or '—':<12} "
              f"{v.get('verified') or '—':<11} {v.get('verifiedBy') or '—':<14} {gap:>5}  "
              f"{v['status']}: {v['note']}")

    with_gps = sum(1 for v in record.get("venues", {}).values()
                   for r in v["evidence"] if r["gps"] == "present")
    total = sum(len(v["evidence"]) for v in record.get("venues", {}).values())

    print(f"\nchecked {len(verdicts)} venue(s) against {source}; "
          f"{sum(1 for v in verdicts if v['status'] == 'ok')} evidenced, "
          f"{sum(1 for v in verdicts if v['status'] == 'skipped')} not locally evidenced, "
          f"{len(bad)} refused.")
    # Stated every run, not only when it changes: nothing has decided the size
    # rule or the strip-or-refuse rule yet (roadmap 340/250), and until both
    # exist no image may be committed. Reporting the count is what keeps that
    # from being a sentence in a document nobody opens.
    print(f"{with_gps} of {total} recorded file(s) carried GPS. No image is committed by this "
          "repo; do not start before the strip-or-refuse rule exists.")
    for d in drift:
        print(f"DRIFT  {d}")
    if not live:
        print(f"intake not present ({args.intake}) — the comparison above used the committed "
              "record, so it proves what was recorded, not what is on disk today.")
    return 1 if bad or drift else 0


if __name__ == "__main__":
    # Which tree did this actually read? ROOT — resolved from this file — and
    # never the working directory, which can have drifted out from under it
    # (ADR 0113, roadmap 340/260). Prints as the run's last line, on every
    # exit path including a refusal.
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
