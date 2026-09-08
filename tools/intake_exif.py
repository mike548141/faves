#!/usr/bin/env python3
"""Read the provenance embedded in intake source files.

Every menu that lands in `intake/` arrives with evidence attached: a photo
knows when and where it was taken, a PDF knows when it was written. That
evidence is what lets `verified` / `verifiedBy` be a *derivation* rather than
a guess (ADR 0031) — so it gets read off the file, never inferred from when
the file happened to be copied onto this machine.

    python3 tools/intake_exif.py                     # everything under intake/
    python3 tools/intake_exif.py intake/menus/foo    # one folder or file
    python3 tools/intake_exif.py --json              # machine-readable
    python3 tools/intake_exif.py --near site/data    # name the closest venue
    python3 tools/intake_exif.py --for simmer        # the answer, for ONE venue

🎯 `--for <venue-id>` is the mode to reach for before writing a record. The
other modes report on files; this one reports on the **fields you are about to
type** — the `verified` date and the `verifiedBy` method this venue's evidence
supports, printed as a block to copy. It exists because reading the metadata
was never the hard part: `--near` has printed the capture date since
2026-08-15, and on 2026-09-07 a session still wrote `verified: 2026-09-07`
over evidence dated 2026-08-25, because the answer was in a report nobody was
looking at while they typed. `tools/check_provenance.py` is the guard that
catches that afterwards; this is what stops it happening. It reads the live
files when `intake/` is at hand and `data/intake/menu-sources.json` when it is
not, so it answers in a worktree too.

Stdlib only (ADR 0001 binds the tools too, by habit if not by rule): the JPEG
APP1/TIFF walk below is a few dozen lines and saves an exiftool dependency.

What it reports per file, and why each matters:

  captured   EXIF DateTimeOriginal (+ OffsetTimeOriginal when present). This
             is `verified` — the day someone stood there and read the board.
             The file's mtime is NOT this: copying a photo rewrites mtime and
             would silently claim a fresher reading than the evidence supports.
  gps        Where the shutter fired. Two jobs: it sorts loose photos to the
             right venue without trusting the filename, and it is positive
             evidence of `verifiedBy: in-store` — you cannot stand at the
             counter by accident.
  device     Make/model/software. Weak, but it separates "photographed by the
             principal on his phone" from "screenshot of someone's website".
  edited     DateTime (IFD0) later than DateTimeOriginal means the file was
             re-saved. A re-save can strip or rewrite the rest, so it lowers
             confidence in everything above it.

GPS coordinates of a *venue* are public facts and already in the data. GPS of
a *person* is not — this tool prints what the file holds so the importer can
judge, and nothing it prints is copied into `site/` beyond the venue-level
date and method. See CLAUDE.md's no-personal-data rule.
"""

import argparse
import json
import math
import re
import struct
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / "intake"

# TIFF tag numbers we care about, per IFD. Everything else is skipped rather
# than parsed — this is a provenance reader, not an EXIF library.
IFD0_TAGS = {0x010F: "make", 0x0110: "model", 0x0131: "software", 0x0132: "edited"}
EXIF_TAGS = {
    0x9003: "captured",  # DateTimeOriginal — when the shutter fired
    0x9004: "digitised",  # DateTimeDigitized
    0x9011: "offset",  # OffsetTimeOriginal — the UTC offset at the scene
    0xA002: "width",
    0xA003: "height",
}
GPS_TAGS = {
    0x0001: "lat_ref", 0x0002: "lat",
    0x0003: "lng_ref", 0x0004: "lng",
    0x0005: "alt_ref", 0x0006: "alt",
    0x0007: "gps_time", 0x001D: "gps_date",
}
# Byte width per TIFF type code; 0 marks a type we don't decode.
TYPE_SIZE = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8}


def _read_tiff(buf, base, tag_map, out, endian, ifd_offset, follow=None):
    """Walk one IFD, pulling the tags named in tag_map into out.

    `follow` maps a tag number to (tag_map, out_dict) for sub-IFDs (Exif, GPS)
    whose value is a pointer rather than data.
    """
    try:
        (count,) = struct.unpack_from(endian + "H", buf, base + ifd_offset)
    except struct.error:
        return
    for i in range(count):
        entry = base + ifd_offset + 2 + i * 12
        try:
            tag, typ, n = struct.unpack_from(endian + "HHI", buf, entry)
        except struct.error:
            return
        size = TYPE_SIZE.get(typ, 0) * n
        if not size:
            continue
        # Values of 4 bytes or fewer sit inline in the entry; larger ones are
        # a file offset. This is the one genuinely fiddly part of TIFF.
        pos = entry + 8 if size <= 4 else base + struct.unpack_from(endian + "I", buf, entry + 8)[0]
        if pos + size > len(buf):
            continue
        if follow and tag in follow:
            sub_map, sub_out = follow[tag]
            _read_tiff(buf, base, sub_map, sub_out, endian, struct.unpack_from(endian + "I", buf, pos if size > 4 else entry + 8)[0])
            continue
        if tag not in tag_map:
            continue
        name = tag_map[tag]
        if typ == 2:  # ASCII, NUL-terminated
            out[name] = buf[pos:pos + size].split(b"\x00")[0].decode("utf-8", "replace").strip()
        elif typ == 5:  # RATIONAL — GPS coordinates arrive as three of these
            vals = []
            for j in range(n):
                num, den = struct.unpack_from(endian + "II", buf, pos + j * 8)
                vals.append(num / den if den else 0.0)
            out[name] = vals if n > 1 else vals[0]
        elif typ in (3, 4):
            fmt = "H" if typ == 3 else "I"
            vals = list(struct.unpack_from(endian + str(n) + fmt, buf, pos))
            out[name] = vals if n > 1 else vals[0]
        elif typ == 1:
            out[name] = buf[pos] if n == 1 else list(buf[pos:pos + n])


def read_jpeg_exif(path):
    """Return {ifd0, exif, gps} for a JPEG, or {} when it carries no EXIF."""
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8":
        return {}
    i = 2
    while i < len(data) - 4:
        if data[i] != 0xFF:
            i += 1
            continue
        marker, seglen = data[i + 1], struct.unpack_from(">H", data, i + 2)[0]
        if marker == 0xE1 and data[i + 4:i + 10] == b"Exif\x00\x00":
            buf = data[i + 10:i + 2 + seglen]
            if buf[:2] not in (b"II", b"MM"):
                return {}
            endian = "<" if buf[:2] == b"II" else ">"
            (ifd0_off,) = struct.unpack_from(endian + "I", buf, 4)
            ifd0, exif, gps = {}, {}, {}
            _read_tiff(buf, 0, IFD0_TAGS, ifd0, endian, ifd0_off,
                       follow={0x8769: (EXIF_TAGS, exif), 0x8825: (GPS_TAGS, gps)})
            return {"ifd0": ifd0, "exif": exif, "gps": gps}
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        i += 2 + seglen
    return {}


PDF_DATE_RE = re.compile(rb"/(?:Creation|Mod)Date\s*\(D:(\d{4})(\d{2})(\d{2})")


def read_pdf_dates(path):
    """Creation/mod dates out of a PDF trailer. A menu PDF's creation date is
    weak evidence — it dates the *document*, not our reading of it — but it
    bounds the menu's age from below, which beats nothing."""
    head = path.read_bytes()
    found = sorted({f"{y.decode()}-{m.decode()}-{d.decode()}" for y, m, d in PDF_DATE_RE.findall(head)})
    return found


def dms_to_deg(vals, ref):
    """EXIF stores coordinates as [deg, min, sec] plus a N/S/E/W reference."""
    if not isinstance(vals, list) or len(vals) != 3:
        return None
    deg = vals[0] + vals[1] / 60 + vals[2] / 3600
    return -deg if str(ref).upper() in ("S", "W") else deg


def parse_exif_dt(s, offset=None):
    """EXIF dates are 'YYYY:MM:DD HH:MM:SS'. Returns (iso_date, iso_datetime)."""
    if not s:
        return None, None
    m = re.match(r"^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})", s)
    if not m:
        return None, None
    y, mo, d, h, mi, sec = m.groups()
    stamp = f"{y}-{mo}-{d}T{h}:{mi}:{sec}"
    if offset:
        stamp += offset
    return f"{y}-{mo}-{d}", stamp


def haversine(a, b):
    """Metres between two (lat, lng) pairs. Only used to name the nearest
    known venue, so the spherical approximation is far more than enough."""
    lat1, lng1, lat2, lng2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def known_venues():
    """Every (lat, lng) already in the data, with its venue name — including
    per-branch coordinates for multi-location venues (ADR 0011)."""
    out = []
    for f in sorted((ROOT / "site" / "data" / "restaurants").glob("*.json")):
        try:
            r = json.loads(f.read_text())
        except json.JSONDecodeError:
            continue
        name = r.get("name", f.stem)
        if r.get("lat") is not None and r.get("lng") is not None:
            out.append((r["lat"], r["lng"], name, r.get("id", f.stem)))
        for b in r.get("locations") or []:
            if b.get("lat") is not None and b.get("lng") is not None:
                label = f"{name} — {b.get('name', 'branch')}"
                out.append((b["lat"], b["lng"], label, r.get("id", f.stem)))
    return out


def describe(path, venues=None):
    """One file's provenance, as a plain dict."""
    rec = {"file": str(path.relative_to(ROOT) if ROOT in path.parents else path)}
    suffix = path.suffix.lower()

    if suffix in (".jpg", ".jpeg", ".tif", ".tiff"):
        ex = read_jpeg_exif(path)
        ifd0, exif, gps = ex.get("ifd0", {}), ex.get("exif", {}), ex.get("gps", {})
        date, stamp = parse_exif_dt(exif.get("captured"), exif.get("offset"))
        rec["captured"] = date
        rec["captured_at"] = stamp
        dev = " ".join(x for x in (ifd0.get("make"), ifd0.get("model")) if x)
        rec["device"] = dev or None
        rec["software"] = ifd0.get("software")
        lat = dms_to_deg(gps.get("lat"), gps.get("lat_ref"))
        lng = dms_to_deg(gps.get("lng"), gps.get("lng_ref"))
        if lat is not None and lng is not None:
            rec["lat"], rec["lng"] = round(lat, 6), round(lng, 6)
        # A re-save after capture can strip or rewrite everything above.
        edited, _ = parse_exif_dt(ifd0.get("edited"))
        if edited and date and edited != date:
            rec["edited"] = edited
        if exif.get("width"):
            rec["pixels"] = f"{exif.get('width')}x{exif.get('height')}"
    elif suffix == ".pdf":
        dates = read_pdf_dates(path)
        rec["pdf_dates"] = dates
        rec["captured"] = dates[0] if dates else None
    else:
        rec["captured"] = None

    st = path.stat()
    rec["file_mtime"] = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d")
    rec["bytes"] = st.st_size

    if venues and rec.get("lat") is not None:
        near = sorted(((haversine((rec["lat"], rec["lng"]), (v[0], v[1])), v) for v in venues), key=lambda t: t[0])
        if near:
            dist, v = near[0]
            rec["nearest"] = {"name": v[2], "id": v[3], "metres": round(dist)}

    # The suggested derivation. GPS + a camera says someone was standing there;
    # anything less is a document read away from the venue, and the importer
    # decides. Never silently promoted — this is a suggestion in a report, and
    # `verifiedBy` is still written by hand.
    if rec.get("lat") is not None and rec.get("device"):
        rec["suggest_verifiedBy"] = "in-store"
    elif suffix == ".pdf":
        rec["suggest_verifiedBy"] = "paper-menu"
    elif rec.get("captured"):
        rec["suggest_verifiedBy"] = "paper-menu"
    else:
        rec["suggest_verifiedBy"] = None
    return rec


def collect(targets):
    files = []
    for t in targets:
        p = Path(t)
        if not p.is_absolute():
            p = (ROOT / p) if (ROOT / p).exists() else p.resolve()
        if p.is_dir():
            files += [f for f in sorted(p.rglob("*")) if f.is_file() and not f.name.startswith(".")]
        elif p.is_file():
            files.append(p)
        else:
            print(f"skip (not found): {t}", file=sys.stderr)
    return [f for f in files if f.suffix.lower() in (".jpg", ".jpeg", ".tif", ".tiff", ".pdf", ".png", ".heic")]


SOURCES = ROOT / "data" / "intake" / "menu-sources.json"


def _rows_for(vid, base=None):
    """(folder, rows, live) for one venue — live files if present, else the record.

    The committed record carries the same four facts per file that the live
    read produces (name, capture date/time, device, GPS presence), which is
    what makes this mode answerable in a worktree. It carries no coordinate:
    this repo is public.
    """
    if not SOURCES.exists():
        return None, [], False
    doc = json.loads(SOURCES.read_text())
    entry = doc.get("venues", {}).get(vid)
    if entry is None:
        return None, sorted(doc.get("venues", {})), False
    # `base` lets a worktree point at the checkout that actually holds the
    # material — intake/** is gitignored, so it lives in exactly one tree.
    folder = (Path(base) if base else ROOT) / entry["folder"]
    if folder.is_dir():
        rows = []
        for f in sorted(folder.glob("*")):
            if not f.is_file() or f.name.startswith("."):
                continue
            if f.suffix.lower() not in (".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic", ".pdf"):
                continue
            d = describe(f)
            rows.append({"file": f.name,
                         "kind": "pdf" if f.suffix.lower() == ".pdf" else "photo",
                         "captured": d.get("captured"), "capturedAt": d.get("captured_at"),
                         "device": d.get("device"),
                         "gps": "present" if d.get("lat") is not None else "absent"})
        if rows:
            return entry["folder"], rows, True
    return entry["folder"], entry.get("evidence", []), False


def report_for(vid, base=None):
    """Print the `verified` / `verifiedBy` this venue's evidence supports."""
    folder, rows, live = _rows_for(vid, base)
    if folder is None:
        if rows:
            print(f"no evidence recorded for `{vid}`. Known: {', '.join(rows)}")
        else:
            print(f"{SOURCES.relative_to(ROOT)} does not exist — run "
                  "`python3 tools/check_provenance.py --rebuild` beside the intake material.")
        return 1
    if not rows:
        print(f"{vid}: {folder} is recorded and holds no readable evidence.")
        return 1

    print(f"{vid} — {folder} ({'live files' if live else 'the committed record'}, {len(rows)} file(s))\n")
    if live:
        # Text intake — Apple Notes recipe exports, .txt, .md — carries NO
        # embedded provenance of any kind. Saying so is the point: an empty
        # report on a folder holding 24 recipes reads like an empty folder.
        mute = [f.name for f in sorted(((Path(base) if base else ROOT) / folder).glob("*"))
                if f.is_file() and not f.name.startswith(".")
                and f.suffix.lower() not in (".jpg", ".jpeg", ".tif", ".tiff",
                                             ".png", ".heic", ".pdf")]
        if mute:
            print(f"  ({len(mute)} further file(s) here carry no embedded provenance at all — "
                  f"text\n   exports have none to carry: {', '.join(mute[:3])}"
                  f"{' …' if len(mute) > 3 else ''})\n")
    for r in rows:
        print(f"  {r['file']:<28} {r['kind']:<6} {r.get('capturedAt') or r.get('captured') or '(no date)':<28} "
              f"{r.get('device') or '—':<22} gps:{r['gps']}")

    photos = [r for r in rows if r["kind"] == "photo" and r["captured"]]
    pdfs = [r for r in rows if r["kind"] == "pdf" and r["captured"]]
    newest = max((r["captured"] for r in photos), default=None)

    # The VISIT, which is the fact nobody was recording. Two clusters 24
    # minutes apart is one person working round a shop, not two readings — and
    # a genuine second visit is what a session must not average away.
    stamps = sorted(r["capturedAt"] for r in photos if r.get("capturedAt"))
    if len(stamps) > 1:
        days = sorted({s[:10] for s in stamps})
        print(f"\n  spans {len(days)} day(s): {', '.join(days)}"
              f" — first {stamps[0][11:16]}, last {stamps[-1][11:16]} on its own day")

    # What the venue record says today, so a disagreement is visible here
    # rather than discovered by the guard afterwards.
    vfile = ROOT / "site" / "data" / "restaurants" / f"{vid}.json"
    if vfile.exists():
        rec = json.loads(vfile.read_text())
        print(f"\n  the record today: verified {rec.get('verified') or '—'}, "
              f"verifiedBy {rec.get('verifiedBy') or '—'}")

    print()
    photo_method = "in-store" if any(r["gps"] == "present" and r["device"] for r in photos) else "paper-menu"
    if newest and pdfs:
        # 🛑 The tool must NOT pick here, and this is not caution for its own
        # sake — it got `spices-indian` wrong on its first run. That folder
        # holds 2023 photographs beside a 2026 PDF, and the record's reading
        # came off the PDF; a rule of "newest photograph wins" would have
        # printed 2023-11-28 for a session to copy over a correct date.
        print("  🛑 TWO SOURCES IN ONE FOLDER — nothing here can tell you which you read.\n")
        print(f"  If the reading came off the PHOTOGRAPHS:")
        print(f'      "verified": "{newest}",  "verifiedBy": "{photo_method}",')
        print(f"  If it came off the PDF ({', '.join(r['file'] for r in pdfs)}):")
        print(f'      "verified": "<the day YOU read it>",  "verifiedBy": "paper-menu",')
        print(f"      — created {min(r['captured'] for r in pdfs)}, which bounds the reading from "
              f"BELOW\n        only; a menu written in March is still read in September.")
        print("\n  A record may legitimately be a MIX of the two. Say which source each part "
              "came\n  from in the session log; the two dates are not interchangeable.")
    elif newest:
        print(f'  "verified": "{newest}",')
        print(f'  "verifiedBy": "{photo_method}",')
        print(f"\n  ← the newest photograph's capture date. NOT today's date, and never the "
              f"file's\n    modification date (ADR 0038): copying a photo rewrites mtime and would "
              f"claim\n    a fresher reading than the evidence supports.")
        print(f"  ← `{photo_method}` is a SUGGESTION and the tool cannot settle it. GPS at a "
              f"shopfront is\n    evidence somebody stood there; the same laminated card "
              f"photographed on a kitchen\n    table is `paper-menu`, and only a human looking at "
              f"the image can tell those apart.")
    elif pdfs:
        earliest = min(r["captured"] for r in pdfs)
        print('  "verifiedBy": "paper-menu",')
        print(f"\n  ← no photograph dates a reading here. The PDF was created {earliest}, which "
              f"bounds\n    the reading from BELOW and says nothing above it: `verified` is the day "
              f"YOU read\n    it, and it must not be earlier than {earliest}.")
    else:
        print("  ← nothing here dates a reading. Leave `verified` absent rather than "
              "borrowing a date;\n    ADR 0031 makes the absent field the honest one.")
    print("\n  Then: python3 tools/check_provenance.py   (it refuses a date the evidence "
          "does not support)")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", default=[str(INTAKE)], help="files or folders (default: intake/)")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    ap.add_argument("--near", action="store_true", help="name the nearest venue already in the data")
    ap.add_argument("--for", dest="venue", metavar="VENUE-ID",
                    help="print the `verified`/`verifiedBy` one venue's evidence supports")
    ap.add_argument("--base", metavar="CHECKOUT",
                    help="with --for: the checkout holding intake/ (a worktree has none; "
                         "without this the committed record answers instead)")
    args = ap.parse_args()

    if args.venue:
        return report_for(args.venue, args.base)

    venues = known_venues() if args.near else None
    rows = [describe(f, venues) for f in collect(args.paths or [str(INTAKE)])]

    if args.json:
        json.dump(rows, sys.stdout, indent=2)
        print()
        return 0

    for r in rows:
        loc = f"{r['lat']},{r['lng']}" if r.get("lat") is not None else "—"
        near = f"  ~{r['nearest']['metres']}m from {r['nearest']['name']}" if r.get("nearest") else ""
        print(f"{Path(r['file']).name:<34} {r.get('captured') or '(no date)':<12} {loc:<22} "
              f"{r.get('device') or '—':<22} {r.get('suggest_verifiedBy') or '—'}{near}")
        if r.get("edited"):
            print(f"{'':<34} ⚠ re-saved {r['edited']} — metadata may have been rewritten")
    return 0


if __name__ == "__main__":
    sys.exit(main())
