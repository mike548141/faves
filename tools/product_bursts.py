#!/usr/bin/env python3
"""Group pantry photos into capture bursts — one burst is (probably) one product.

    python3 tools/product_bursts.py                  # human table
    python3 tools/product_bursts.py --json           # the worklist, machine-readable
    python3 tools/product_bursts.py --gap 45         # seconds between bursts
    python3 tools/product_bursts.py --dir intake/ingredients/raw_food_photos

WHY THIS EXISTS, and why the burst is the unit rather than the file.

`intake/ingredients/` holds a pantry photographed one item at a time: front of
pack, then back of pack, seconds apart. Read file by file, a third of them are
unharvestable — a front-of-pack shot has a brand and a net weight and nothing
else, no nutrition panel, no ingredients, no barcode. Read burst by burst, that
same front shot is the *label* for the back shot taken twelve seconds later,
and the pair yields everything.

So the worklist this prints is a list of PRODUCTS, not a list of files, and a
burst that turns out to hold only front-of-pack shots is a re-shoot request
rather than a harvest failure. That distinction is the whole point: it separates
"we could not read it" from "the data was never in the frame", and only the
second is worth the owner's time.

WHAT A BURST IS NOT. It is a heuristic on capture time, and it is wrong in two
directions that a reader of the output must expect:

  • It SPLITS one product across two bursts when the photographer paused —
    turned the jar round, found the light, was interrupted.
  • It MERGES two products into one burst when they were photographed in quick
    succession off the same shelf.

Neither is detectable from metadata, so neither is corrected here. Whoever reads
the images decides what the burst actually contains, and the burst id is only a
handle for talking about a group of files. The gap default (45 s) was chosen
because at 20 s the corpus splits obvious front/back pairs and at 90 s it starts
merging separate items off the same shelf; it is a dial, not a constant of
nature.

Timestamps come from EXIF DateTimeOriginal via `tools/intake_exif.py`, never
from mtime — copying a photo rewrites mtime, and a burst grouped on it would be
grouped on when the files were synced rather than when the shutter fired
(ADR 0038). A photo carrying no DateTimeOriginal cannot be placed in time at
all, so it is reported separately rather than silently dropped into a burst it
may not belong to; a file that vanishes from the output is the failure mode this
tool most needs to avoid, so the totals are printed and must reconcile.

Stdlib only (ADR 0001 binds the tools by habit).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = "intake/ingredients/raw_food_photos"
DEFAULT_GAP = 45


def read_exif(target: Path) -> list[dict]:
    """Provenance for every file under `target`, via the repo's own reader."""
    out = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "intake_exif.py"), "--json", str(target)],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    if out.returncode != 0:
        sys.exit(f"intake_exif.py failed:\n{out.stderr.strip()}")
    return json.loads(out.stdout or "[]")


def parse_ts(row: dict) -> datetime | None:
    """The moment the shutter fired, or None if the file cannot say.

    `captured_at` is the field to read — a full ISO timestamp with the camera's
    UTC offset. `captured` is a DATE, and reading that instead is how the first
    run of this tool reported all 183 photos as undated: every one of them
    carried a perfectly good time, one field over. The scope line at the bottom
    of the output is what surfaced it, which is the argument for printing a
    population next to every count.

    A file with only a date is genuinely unplaceable in a burst, so it comes
    back None rather than being read as midnight — midnight would collapse
    every date-only photo of a day into one enormous false burst.
    """
    raw = row.get("captured_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def group(rows: list[dict], gap: int) -> tuple[list[dict], list[dict]]:
    dated, undated = [], []
    for r in rows:
        ts = parse_ts(r)
        (dated if ts else undated).append({**r, "_ts": ts})
    dated.sort(key=lambda r: r["_ts"])

    bursts: list[dict] = []
    for r in dated:
        if bursts and (r["_ts"] - bursts[-1]["_last"]).total_seconds() <= gap:
            bursts[-1]["files"].append(r["file"])
            bursts[-1]["_last"] = r["_ts"]
        else:
            bursts.append(
                {
                    "id": f"b{len(bursts) + 1:03d}",
                    "captured": r["_ts"].isoformat(sep=" "),
                    "lat": r.get("lat"),
                    "lng": r.get("lng"),
                    "device": r.get("device"),
                    "files": [r["file"]],
                    "_last": r["_ts"],
                }
            )
    for b in bursts:
        b.pop("_last", None)
    return bursts, undated


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Group pantry photos into capture bursts (one burst ≈ one product).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("--dir", default=DEFAULT_DIR, help=f"photo folder (default: {DEFAULT_DIR})")
    ap.add_argument("--gap", type=int, default=DEFAULT_GAP,
                    help=f"seconds between bursts (default: {DEFAULT_GAP})")
    ap.add_argument("--json", action="store_true", help="emit the worklist as JSON")
    args = ap.parse_args()

    target = (ROOT / args.dir).resolve()
    if not target.exists():
        sys.exit(f"no such folder: {args.dir}")

    rows = [r for r in read_exif(target) if r.get("file")]
    bursts, undated = group(rows, args.gap)

    if args.json:
        print(json.dumps({"gap": args.gap, "bursts": bursts, "undated": undated}, indent=2))
        return 0

    for b in bursts:
        print(f"{b['id']}  {b['captured']}  {len(b['files'])} file(s)")
        for f in b["files"]:
            print(f"        {f}")
    if undated:
        print(f"\n{len(undated)} file(s) with no EXIF DateTimeOriginal — not placed in any burst:")
        for r in undated:
            print(f"        {r['file']}")

    # The population first, always. A burst count on its own cannot tell you
    # whether files were dropped; these three numbers must add up, and if they
    # ever stop, that is the bug worth finding before the harvest starts.
    placed = sum(len(b["files"]) for b in bursts)
    print(
        f"\nscope: {len(rows)} photo(s) = {placed} in {len(bursts)} burst(s) "
        f"+ {len(undated)} undated · gap {args.gap}s"
    )
    if placed + len(undated) != len(rows):
        sys.exit("BUG: files went missing between reading and grouping")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
