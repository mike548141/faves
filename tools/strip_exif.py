#!/usr/bin/env python3
"""Strip an image down to its pixels and PROVE it, or refuse it (ADR 0128).

    python3 tools/strip_exif.py PATH... --out DIR           # strip, prove, write
    python3 tools/strip_exif.py intake/menus --out DIR --report   # + size table
    python3 tools/strip_exif.py PATH... --out DIR --transcode-heic  # HEIC via sips
    python3 tools/strip_exif.py --selftest

The owner ruled on 2026-09-09: *strip location, then commit* — the original
photographs are to live in this PUBLIC repo, permanently, once they are clean
(roadmap 340/250). 72 of the 72 menu photographs measured on 2026-09-28 carry a
GPS IFD, and git history cannot be edited after the fact. So this tool is
strip-or-REFUSE, never strip-and-hope:

  1. It sniffs the format from the bytes (never the extension) and refuses any
     format it does not fully parse: HEIC/HEIF, AVIF, GIF, TIFF, BMP, JPEG XL
     and PDF (a PDF can embed a photograph that carries its own EXIF).
  2. It writes a NEW file that keeps an allowlist and nothing else — the coded
     pixels byte for byte, the EXIF Orientation, and a colour profile only
     when every tag in it is a standard colour tag. Everything else is dropped:
     GPS, device, timestamps, MakerNote, XMP, IPTC, comments, thumbnails and
     the MPF secondary images Apple appends after the end of the primary one.
  3. It re-reads the WRITTEN FILE from disk and proves it clean with
     `tools/lib/imagemeta.py` — a separate reader with its own allowlist, its
     own walk and a raw signature sweep — and, for JPEG, cross-checks with
     `intake_exif.py`'s older, independently written reader that no GPS
     survives. Any finding from either deletes the output and REFUSES the
     file, loudly, with a non-zero exit.

WHY ORIENTATION IS KEPT RATHER THAN APPLIED. iPhones store pixels sideways and
say so in one EXIF tag. Applying it means re-encoding a JPEG, which is lossy —
and the owner's reason for keeping evidence at all is that the Simmer cabinet's
handwritten tags needed native resolution to read. Keeping the tag leaves the
coded pixels BYTE-IDENTICAL to the camera's, and a single SHORT with the value
1-8 cannot carry a place. The verifier allows exactly that one tag in IFD0.

WHY A COLOUR PROFILE MAY SURVIVE. Dropping it changes how the (unchanged)
pixels render — a wide-gamut photo shown as sRGB goes dull. It is kept only
when the verifier can account for every byte of it. Apple's "Wide Color
Sharing Profile" carries one private tag, `aapy`, that the verifier does not
know: `sanitise_icc` removes that tag and keeps the rest (`icc kept, private
tag removed`). A profile that still fails is DROPPED (`icc dropped`), not
refused: dropping costs colour accuracy, never evidence.

HEIC. No stdlib reader exists and its item/property boxes are where the EXIF
lives, so HEIC is refused by default. `--transcode-heic` converts it with
macOS `sips` to a JPEG first and then strips and proves THAT like any other
JPEG. It is lossy, and the report says so: the output is a copy of the
evidence, not the evidence.

WHAT THIS PROVES AND WHAT IT DOES NOT. Proven, per file, from the written
bytes: no structure outside the allowlist, no GPS by a second reader, and the
orientation matches the original's, and the coded image (JPEG tables and
scans, PNG IDAT, WebP VP8/VP8L/ALPH) is byte-identical to the original's as the
verifier walks both — so the pixels are the camera's by comparison, not by
claim. (Not by decoding: see `imagemeta.pixel_payload` for why a decode
comparison was measured and rejected.) NOT proven:
that no location is legible IN THE PICTURE (a street sign, a receipt with an
address) — no metadata tool can see that, and a human must.

Stdlib only for everything that decides (ADR 0001). `sips` is used only to
transcode HEIC on request, never for the proof.
"""

import argparse
import hashlib
import os
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import imagemeta  # noqa: E402  (the verifier)
import intake_exif  # noqa: E402  (a second, older reader: cross-check only)

REFUSE_FORMATS = {"heif", "isobmff", "gif", "tiff", "bmp", "jxl", "pdf", "ico", "svg"}


class Refused(Exception):
    """The file cannot be stripped AND proven; nothing is written for it."""


# --- The writer ----------------------------------------------------------------
# Deliberately separate code from lib/imagemeta.py: the proof is only worth
# something if the thing that wrote the bytes is not also the thing that read
# them back.

def _own_orientation(tiff):
    """IFD0 Orientation, read here and nowhere else in the writer."""
    if len(tiff) < 8 or tiff[:2] not in (b"II", b"MM"):
        return None
    e = "<" if tiff[:2] == b"II" else ">"
    try:
        (off,) = struct.unpack_from(e + "I", tiff, 4)
        (n,) = struct.unpack_from(e + "H", tiff, off)
        for k in range(n):
            tag, typ, cnt = struct.unpack_from(e + "HHI", tiff, off + 2 + 12 * k)
            if tag == 0x0112 and typ == 3 and cnt == 1:
                (v,) = struct.unpack_from(e + "H", tiff, off + 2 + 12 * k + 8)
                return v if 1 <= v <= 8 else None
    except struct.error:
        return None
    return None


def minimal_tiff(orientation):
    """A TIFF block holding IFD0 = {Orientation} and nothing else, no IFD1."""
    return (b"MM\x00*" + struct.pack(">I", 8) + struct.pack(">H", 1)
            + struct.pack(">HHIHH", 0x0112, 3, 1, orientation, 0) + struct.pack(">I", 0))


def _jseg(marker, body):
    if len(body) + 2 > 0xFFFF:
        raise Refused(f"segment 0x{marker:02X} too large to write")
    return bytes([0xFF, marker]) + struct.pack(">H", len(body) + 2) + body


def _icc_segments(profile):
    """Split a profile over APP2 chunks (65519 bytes of payload each)."""
    size = 65519
    parts = [profile[i:i + size] for i in range(0, len(profile), size)]
    if len(parts) > 255:
        raise Refused("ICC profile too large for APP2 chunking")
    return b"".join(_jseg(0xE2, b"ICC_PROFILE\x00" + bytes([k + 1, len(parts)]) + p)
                    for k, p in enumerate(parts))


def sanitise_icc(p):
    """Return a profile the verifier passes, or None.

    Apple's "Wide Color Sharing Profile" (145 of the intake photos) is standard
    colour tags plus ONE private tag, `aapy`, 14 bytes the verifier cannot
    account for. Dropping the whole profile would render a wide-gamut photo as
    sRGB; instead the private tag's table entry is removed and its bytes are
    zeroed. Every other offset is absolute, so nothing moves: the table simply
    ends 12 bytes sooner and leaves zeros behind. The header's profile ID (an
    MD5 over the profile) is zeroed too, which the ICC spec defines as "not
    computed". Whatever comes out is re-checked by the verifier; a profile it
    still refuses is dropped, never kept on the writer's word.
    """
    if not imagemeta.inspect_icc(p, "icc"):
        return p
    if len(p) < 132 or p[36:40] != b"acsp" or struct.unpack_from(">I", p, 0)[0] != len(p):
        return None
    (count,) = struct.unpack_from(">I", p, 128)
    if 132 + 12 * count > len(p):
        return None
    keep, gone = [], []
    for k in range(count):
        sig, off, sz = struct.unpack_from(">4sII", p, 132 + 12 * k)
        (keep if sig in imagemeta.ICC_TAGS else gone).append((sig, off, sz))
    if not gone:
        return None
    out = bytearray(p)
    out[84:100] = bytes(16)
    for _, off, sz in gone:
        if off + sz > len(out):
            return None
        if any(o < off + sz and off < o + z for _, o, z in keep):
            return None  # a kept tag shares these bytes; do not guess
        out[off:off + sz] = bytes(sz)
    table = b"".join(struct.pack(">4sII", *t) for t in keep)
    out[128:132 + 12 * count] = struct.pack(">I", len(keep)) + table + bytes(12 * len(gone))
    out = bytes(out)
    return out if not imagemeta.inspect_icc(out, "icc") else None


def strip_jpeg(d):
    """Return (bytes, notes). Coded segments are copied verbatim."""
    if d[:2] != b"\xff\xd8":
        raise Refused("no SOI")
    i, coded, notes = 2, [], []
    orientation, jfif, adobe, icc = None, None, None, {}
    dropped = set()
    while True:
        if i + 2 > len(d) or d[i] != 0xFF:
            raise Refused(f"lost sync at byte {i}")
        m = d[i + 1]
        if m == 0xD9:
            end = i + 2
            break
        if m in (0x01, 0xD8, 0xFF) or 0xD0 <= m <= 0xD7:
            raise Refused(f"unexpected marker 0x{m:02X} at {i}")
        (ln,) = struct.unpack_from(">H", d, i + 2)
        if ln < 2 or i + 2 + ln > len(d):
            raise Refused(f"segment 0x{m:02X} overruns the file")
        body = d[i + 4:i + 2 + ln]
        nxt = i + 2 + ln
        if m == 0xE0 and body[:5] == b"JFIF\x00" and len(body) >= 12:
            jfif = body[5:12]  # version, units, x/y density; thumbnail dropped
        elif m == 0xE1 and body[:6] == b"Exif\x00\x00":
            if orientation is None:
                orientation = _own_orientation(body[6:])
            dropped.add("exif")
        elif m == 0xE2 and body[:12] == b"ICC_PROFILE\x00" and len(body) >= 14:
            icc[body[12]] = (body[13], body[14:])
        elif m == 0xEE and body[:5] == b"Adobe" and len(body) == 12:
            adobe = body
        elif 0xE0 <= m <= 0xEF or m == 0xFE:
            dropped.add("APP%d" % (m - 0xE0) if m != 0xFE else "COM")
        elif m in (0xDB, 0xC4, 0xDD, 0xC0, 0xC1, 0xC2):
            coded.append(d[i:nxt])
        elif m == 0xDA:
            j = nxt
            while True:
                j = d.find(b"\xff", j)
                if j < 0 or j + 1 >= len(d):
                    raise Refused("scan data has no end")
                if d[j + 1] == 0x00 or 0xD0 <= d[j + 1] <= 0xD7:
                    j += 2
                    continue
                break
            coded.append(d[i:j])
            i = j
            continue
        else:
            raise Refused(f"marker 0x{m:02X} (a JPEG feature this does not strip)")
        i = nxt
    if end < len(d):
        dropped.add(f"{len(d) - end} trailing bytes")
    out = [b"\xff\xd8"]
    if jfif is not None:
        out.append(_jseg(0xE0, b"JFIF\x00" + jfif + b"\x00\x00"))
    if orientation and orientation != 1:
        out.append(_jseg(0xE1, b"Exif\x00\x00" + minimal_tiff(orientation)))
        notes.append(f"orientation {orientation} kept")
    if icc:
        whole = None
        if set(icc) == set(range(1, len(icc) + 1)) and {v[0] for v in icc.values()} == {len(icc)}:
            whole = b"".join(icc[k][1] for k in sorted(icc))
        clean = sanitise_icc(whole) if whole is not None else None
        if clean is not None:
            out.append(_icc_segments(clean))
            notes.append("icc kept" if clean == whole else "icc kept, private tag removed")
        else:
            notes.append("icc dropped")
    if adobe is not None:
        out.append(_jseg(0xEE, adobe))
    out.extend(coded)
    out.append(b"\xff\xd9")
    if dropped:
        notes.append("dropped " + ", ".join(sorted(dropped)))
    return b"".join(out), notes


PNG_KEEP = {b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB",
            b"sBIT", b"bKGD", b"pHYs"}


def _pchunk(t, data):
    return struct.pack(">I", len(data)) + t + data + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)


def strip_png(d):
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise Refused("no PNG signature")
    i, out, notes, dropped, orientation = 8, [d[:8]], [], set(), None
    while True:
        if i + 12 > len(d):
            raise Refused("PNG ends without IEND")
        (n,) = struct.unpack_from(">I", d, i)
        t = d[i + 4:i + 8]
        data = d[i + 8:i + 8 + n]
        if i + 12 + n > len(d):
            raise Refused(f"chunk {t!r} overruns the file")
        if zlib.crc32(t + data) & 0xFFFFFFFF != struct.unpack_from(">I", d, i + 8 + n)[0]:
            raise Refused(f"chunk {t!r} fails its CRC")
        i += 12 + n
        if t in (b"acTL", b"fcTL", b"fdAT", b"CgBI"):
            raise Refused(f"{t.decode()} (animated or Apple-crushed PNG)")
        if t in PNG_KEEP:
            if t == b"IDAT" and orientation and orientation != 1 and not any(
                    c[4:8] == b"eXIf" for c in out):
                out.append(_pchunk(b"eXIf", minimal_tiff(orientation)))
                notes.append(f"orientation {orientation} kept")
            out.append(d[i - 12 - n:i])
            if t == b"IEND":
                break
        elif t == b"iCCP":
            k = data.find(b"\x00")
            try:
                prof = zlib.decompress(data[k + 2:])
            except zlib.error:
                prof = None
            clean = sanitise_icc(prof) if prof is not None and 1 <= k <= 79 else None
            if clean is not None:
                out.append(_pchunk(b"iCCP", b"ICC Profile\x00\x00" + zlib.compress(clean)))
                notes.append("icc kept" if clean == prof else "icc kept, private tag removed")
            else:
                notes.append("icc dropped")
        elif t == b"eXIf":
            orientation = _own_orientation(data)
            dropped.add("eXIf")
        elif t[0] & 0x20 == 0:
            raise Refused(f"unknown critical chunk {t!r}")
        else:
            dropped.add(t.decode("latin-1"))
    if i < len(d):
        dropped.add(f"{len(d) - i} trailing bytes")
    if dropped:
        notes.append("dropped " + ", ".join(sorted(dropped)))
    return b"".join(out), notes


def _rchunk(t, data):
    return t + struct.pack("<I", len(data)) + data + (b"\x00" if len(data) & 1 else b"")


def strip_webp(d):
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        raise Refused("not RIFF/WEBP")
    (riff,) = struct.unpack_from("<I", d, 4)
    end = min(len(d), riff + 8)
    i, kept, notes, dropped, vp8x, icc = 12, [], [], set(), None, None
    while i + 8 <= end:
        t = d[i:i + 4]
        (n,) = struct.unpack_from("<I", d, i + 4)
        data = d[i + 8:i + 8 + n]
        if i + 8 + n > end:
            raise Refused(f"chunk {t!r} overruns the file")
        i += 8 + n + (n & 1)
        if t in (b"ANIM", b"ANMF"):
            raise Refused("animated WebP")
        if t == b"VP8X":
            if n != 10:
                raise Refused("VP8X is not 10 bytes")
            vp8x = bytearray(data)
        elif t in (b"VP8 ", b"VP8L", b"ALPH"):
            kept.append(_rchunk(t, data))
        elif t == b"ICCP":
            clean = sanitise_icc(data)
            if clean is not None:
                icc = _rchunk(t, clean)
                notes.append("icc kept" if clean == data else "icc kept, private tag removed")
            else:
                notes.append("icc dropped")
        else:
            dropped.add(t.decode("latin-1").strip())
    if len(d) > end:
        dropped.add(f"{len(d) - end} trailing bytes")
    body = b"WEBP"
    if vp8x is not None:
        vp8x[0] &= 0x10  # keep the alpha bit; clear ICC/EXIF/XMP/animation
        if icc:
            vp8x[0] |= 0x20
        body += _rchunk(b"VP8X", bytes(vp8x)) + (icc or b"")
    elif icc:
        raise Refused("ICCP without VP8X")
    body += b"".join(kept)
    if dropped:
        notes.append("dropped " + ", ".join(sorted(dropped)))
    return b"RIFF" + struct.pack("<I", len(body)) + body, notes


WRITERS = {"jpeg": strip_jpeg, "png": strip_png, "webp": strip_webp}
EXT = {"jpeg": ".jpg", "png": ".png", "webp": ".webp"}
SUFFIXES = {"jpeg": {".jpg", ".jpeg"}, "png": {".png"}, "webp": {".webp"}}


# --- The proof -----------------------------------------------------------------

def prove(written, original_bytes, fmt):
    """Re-read `written` FROM DISK and return a list of reasons it is unproven."""
    back = written.read_bytes()
    found = imagemeta.inspect(back, written.name)
    found.sort(key=lambda x: x.kind != imagemeta.LOCATION)  # the urgent one first
    why = [repr(x) for x in found]
    if imagemeta.sniff(back) != fmt:
        why.append(f"wrote {imagemeta.sniff(back)}, expected {fmt}")
    if fmt == "jpeg":
        second = intake_exif.read_jpeg_exif(written)
        if second.get("gps"):
            why.append("intake_exif's reader still finds GPS")
    if original_bytes is not None:
        a, b = imagemeta.pixel_payload(original_bytes), imagemeta.pixel_payload(back)
        if a is None or a != b:
            why.append("the coded pixels are not byte-identical to the original's")
    if fmt in ("jpeg", "png") and original_bytes is not None:
        a, b = imagemeta.orientation(original_bytes), imagemeta.orientation(back)
        if (a or 1) != (b or 1):
            why.append(f"orientation {a} became {b}")
    return why


# --- Driving it ---------------------------------------------------------------

def iter_inputs(paths):
    for p in paths:
        p = Path(p)
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file():
                    yield p, f
        else:
            yield p.parent, p


def group_of(rel):
    parts = rel.parts
    return "/".join(parts[:2]) if len(parts) > 2 else (parts[0] if len(parts) > 1 else ".")


def run(paths, out_dir, transcode_heic=False, quiet=False):
    """Strip everything under `paths` into `out_dir`. Returns the row list."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows, written = [], set()
    with tempfile.TemporaryDirectory(dir=out_dir) as work:
        for base, src in iter_inputs(paths):
            rel = src.relative_to(base) if base in src.parents else Path(src.name)
            label = Path(base.name) / rel
            raw = src.read_bytes()
            fmt = imagemeta.sniff(raw)
            row = {"path": str(label), "group": group_of(Path(base.name) / rel), "fmt": fmt,
                   "raw": len(raw), "out": None, "blob": None, "status": None, "notes": []}
            rows.append(row)
            if fmt is None:
                row["status"] = "skipped"
                row["notes"].append("not an image")
                continue
            source, original = raw, raw
            if fmt == "heif" and transcode_heic:
                tmp = Path(work) / (src.stem + ".transcoded.jpg")
                try:
                    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "best",
                                    str(src), "--out", str(tmp)], check=True, capture_output=True)
                except (OSError, subprocess.CalledProcessError) as exc:
                    row["status"] = "REFUSED"
                    row["notes"].append(f"sips could not transcode: {exc}")
                    continue
                source, fmt = tmp.read_bytes(), "jpeg"
                original = None  # pixels are no longer the camera's
                row["notes"].append("HEIC transcoded to JPEG by sips (LOSSY)")
            if fmt not in WRITERS:
                row["status"] = "REFUSED"
                why = " — can embed photographs with their own EXIF" if fmt == "pdf" else ""
                row["notes"].append(f"{fmt} is not a format this strips{why}")
                continue
            try:
                data, notes = WRITERS[fmt](source)
            except Refused as exc:
                row["status"] = "REFUSED"
                row["notes"].append(str(exc))
                continue
            row["notes"].extend(notes)
            # Keep the original name (it is provenance too); add an extension
            # only when the format changed or the name never had one.
            name = src.name if src.suffix.lower() in SUFFIXES[fmt] else src.name + EXT[fmt]
            dest = (out_dir / label.parent / name) if base in src.parents else out_dir / name
            if dest in written:
                row["status"] = "REFUSED"
                row["notes"].append(f"output name collides with another input: {dest.name}")
                continue
            written.add(dest)
            dest.parent.mkdir(parents=True, exist_ok=True)
            partial = dest.with_name(dest.name + ".partial")
            partial.write_bytes(data)
            os.replace(partial, dest)
            why = prove(dest, original, fmt)
            if why:
                dest.unlink()
                row["status"] = "REFUSED"
                row["notes"].append("UNPROVEN: " + "; ".join(why[:4]))
                continue
            back = dest.read_bytes()
            row["out"] = len(back)
            row["blob"] = (hashlib.sha1(b"blob %d\x00" % len(back) + back).hexdigest(),
                           len(zlib.compress(b"blob %d\x00" % len(back) + back, 6)))
            row["status"] = "clean"
            if not quiet:
                print(f"clean     {row['path']}  {row['raw']:,} → {row['out']:,} B  ({'; '.join(row['notes'])})")
        for r in rows:
            if r["status"] == "REFUSED":
                print(f"REFUSED   {r['path']}  {'; '.join(r['notes'])}")
    return rows


def mb(n):
    return f"{n / 1_000_000:,.1f}"


def report(rows):
    groups = {}
    for r in rows:
        if r["fmt"] is None:
            continue
        g = groups.setdefault(r["group"], {"n": 0, "raw": 0, "clean": 0, "out": 0, "refused": 0})
        g["n"] += 1
        g["raw"] += r["raw"]
        if r["status"] == "clean":
            g["clean"] += 1
            g["out"] += r["out"]
        else:
            g["refused"] += 1
    print()
    print(f"{'group':44} {'files':>6} {'clean':>5} {'refused':>7} {'raw MB':>9} {'stripped MB':>11}")
    tot = {"n": 0, "raw": 0, "clean": 0, "out": 0, "refused": 0}
    for name in sorted(groups):
        g = groups[name]
        for k in tot:
            tot[k] += g[k]
        print(f"{name[:44]:44} {g['n']:6} {g['clean']:5} {g['refused']:7} {mb(g['raw']):>9} {mb(g['out']):>11}")
    tops = {}
    for name, g in groups.items():
        t = tops.setdefault(name.split("/")[0], {"n": 0, "raw": 0, "clean": 0, "out": 0, "refused": 0})
        for k in t:
            t[k] += g[k]
    if len(tops) > 1:
        print("-" * 86)
        for name in sorted(tops):
            t = tops[name]
            print(f"{name + ' (subtotal)':44} {t['n']:6} {t['clean']:5} {t['refused']:7} "
                  f"{mb(t['raw']):>9} {mb(t['out']):>11}")
    print(f"{'TOTAL':44} {tot['n']:6} {tot['clean']:5} {tot['refused']:7} {mb(tot['raw']):>9} {mb(tot['out']):>11}")
    raw_clean = sum(r["raw"] for r in rows if r["status"] == "clean")
    if raw_clean:
        print(f"\nOf the images that stripped clean: {mb(raw_clean)} MB raw → {mb(tot['out'])} MB "
              f"stripped ({100 * (raw_clean - tot['out']) / raw_clean:.1f}% was metadata and appended images).")
    for top in sorted({r["group"].split("/")[0] for r in rows if r["blob"]}):
        b = {r["blob"][0]: r["blob"][1] for r in rows if r["blob"] and r["group"].split("/")[0] == top}
        print(f"  git objects for {top}/ alone: {len(b)} blob(s), {mb(sum(b.values()))} MB")
    blobs = {r["blob"][0]: r["blob"][1] for r in rows if r["blob"]}
    print(f"A git commit of the clean images would add {len(blobs)} blob(s) "
          f"({sum(1 for r in rows if r['blob']) - len(blobs)} duplicate(s) collapse), "
          f"{mb(sum(blobs.values()))} MB as zlib'd loose objects. JPEG does not compress "
          "or delta, so that is also, to within a percent, what a pack and every clone carry — "
          "permanently: history cannot shed it.")
    skipped = [r for r in rows if r["fmt"] is None]
    if skipped:
        print(f"{len(skipped)} non-image file(s) skipped (Markdown, CSS, JSON, HTML…); "
              "not measured.")


# --- Self-test -----------------------------------------------------------------

def selftest():
    from lib import image_fixtures as fx
    results = []

    def case(name, ok, detail=""):
        results.append(ok)
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  — {detail}" if detail and not ok else ""))

    coded = fx.DQT + fx.SOF0 + fx.DHT + fx.SOS + fx.SCAN
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        inputs = tmp / "in"
        inputs.mkdir()
        mess = fx.jpeg(fx.JFIF, fx.app1_exif(fx.tiff_with_gps()), fx.app1_xmp(fx.XMP_LOCATION),
                       fx.app13_iptc_city(), fx.app2_mpf(), fx.com(b"shot at home"),
                       trailing=fx.gps_jpeg())
        samples = {
            "gps.jpg": fx.gps_jpeg(),
            "thumb.jpg": fx.thumbnail_gps_jpeg(),
            "trailing.jpg": fx.trailing_gps_jpeg(),
            "everything.jpg": mess,
            "gps.png": fx.png(fx.png_exif(fx.tiff_with_gps()), fx.png_xmp(fx.XMP_LOCATION),
                              fx.png_text(b"Comment", b"GPS 0,12")),
            "gps.webp": fx.webp_exif_gps(),
            "xmp.webp": fx.webp_xmp_location(),
            "photo.heic": b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64,
            "menu.pdf": b"%PDF-1.4\n%fixture\n",
            "lossless.jpg": fx.jpeg(fx._seg(0xC3, b"\x08\x00\x10\x00\x10\x01\x01\x11\x00"))
                .replace(fx.SOF0, b""),
            "anim.png": fx.png(fx._chunk(b"acTL", b"\x00\x00\x00\x01\x00\x00\x00\x00")),
            "notes.md": b"# not an image\n",
        }
        for name, data in samples.items():
            (inputs / name).write_bytes(data)
        # Every assertion below is on the WRITTEN files, re-read from disk.
        out = tmp / "out"
        rows = {Path(r["path"]).name: r for r in run([inputs], out, quiet=True)}
        od = out / "in"  # a directory input keeps its own name under --out

        for name in ("gps.jpg", "thumb.jpg", "trailing.jpg", "everything.jpg", "gps.png",
                     "gps.webp", "xmp.webp"):
            r = rows[name]
            dest = od / name
            ok = r["status"] == "clean" and dest.exists() and not imagemeta.inspect(dest.read_bytes())
            case(f"{name} strips to a file the verifier passes", ok, f"{r['status']} {r['notes']}")
        for name in ("gps.jpg", "thumb.jpg", "trailing.jpg", "everything.jpg"):
            back = (od / name).read_bytes()
            case(f"{name}: the coded pixels are byte-identical", back.endswith(coded + fx.EOI)
                 and coded in back)
            case(f"{name}: orientation 6 survives", imagemeta.orientation(back) == 6)
            case(f"{name}: intake_exif's reader finds no GPS",
                 not intake_exif.read_jpeg_exif(od / name).get("gps"))
        case("everything.jpg: the appended second image is gone",
             (od / "everything.jpg").read_bytes().count(b"\xff\xd8") == 1)
        for name, why in (("photo.heic", "heif"), ("menu.pdf", "pdf"), ("lossless.jpg", "0xC3"),
                          ("anim.png", "acTL")):
            r = rows[name]
            case(f"{name} is REFUSED ({why}) and nothing is written",
                 r["status"] == "REFUSED" and why in " ".join(r["notes"])
                 and not any(p.stem == Path(name).stem for p in od.iterdir()), str(r))
        case("notes.md is skipped as not an image", rows["notes.md"]["status"] == "skipped")

        # A colour profile with one private tag keeps its colour tags and
        # loses the private one; the verifier, not the writer, says it passed.
        prof = fx.icc(private=True)
        cleaned = sanitise_icc(prof)
        case("an ICC profile with a private tag is refused as-is by the verifier",
             bool(imagemeta.inspect_icc(prof, "icc")))
        case("sanitise_icc removes the private tag and the verifier passes the rest",
             cleaned is not None and not imagemeta.inspect_icc(cleaned, "icc")
             and b"priv" not in cleaned and b"wtpt" in cleaned)
        case("a profile with free text is dropped, not sanitised",
             sanitise_icc(fx.icc(desc="x" * 400)) is None)

        # BREAK-PROBE 1: a writer that does nothing. The proof must refuse it,
        # and the refused file must NOT be left on disk.
        saved = dict(WRITERS)
        WRITERS["jpeg"] = lambda d: (d, ["sabotaged"])
        try:
            out2 = tmp / "out2"
            rows2 = {Path(r["path"]).name: r for r in run([inputs / "gps.jpg"], out2, quiet=True)}
        finally:
            WRITERS.clear()
            WRITERS.update(saved)
        case("BREAK-PROBE: a no-op writer is REFUSED by the proof, not trusted",
             rows2["gps.jpg"]["status"] == "REFUSED" and not (out2 / "gps.jpg").exists(),
             str(rows2["gps.jpg"]))

        # BREAK-PROBE 1b: a writer that strips perfectly but damages ONE byte
        # of scan data. Clean metadata is not enough: the evidence must be the
        # camera's pixels, so the fidelity comparison must refuse this.
        def damaging(d):
            data, notes = saved["jpeg"](d)
            at = data.rfind(fx.SCAN)
            return data[:at] + b"\x13" + data[at + 1:], notes
        WRITERS["jpeg"] = damaging
        try:
            out4 = tmp / "out4"
            rows4 = {Path(r["path"]).name: r for r in run([inputs / "gps.jpg"], out4, quiet=True)}
        finally:
            WRITERS.clear()
            WRITERS.update(saved)
        case("BREAK-PROBE: one damaged scan byte is REFUSED as not the original's pixels",
             rows4["gps.jpg"]["status"] == "REFUSED" and "byte-identical" in " ".join(rows4["gps.jpg"]["notes"]),
             str(rows4["gps.jpg"]))

        # BREAK-PROBE 2: a no-op writer AND a blinded verifier. The older
        # reader is then the only thing left standing — prove it still refuses.
        real_inspect = imagemeta.inspect
        WRITERS["jpeg"] = lambda d: (d, ["sabotaged"])
        imagemeta.inspect = lambda data, where="": []
        try:
            out3 = tmp / "out3"
            rows3 = {Path(r["path"]).name: r for r in run([inputs / "gps.jpg"], out3, quiet=True)}
        finally:
            WRITERS.clear()
            WRITERS.update(saved)
            imagemeta.inspect = real_inspect
        case("BREAK-PROBE: with the verifier blinded, the second reader still refuses GPS",
             rows3["gps.jpg"]["status"] == "REFUSED" and "intake_exif" in " ".join(rows3["gps.jpg"]["notes"]),
             str(rows3["gps.jpg"]))

    passed = sum(results)
    print(f"\nstrip_exif selftest: {passed}/{len(results)} passed")
    return 0 if passed == len(results) else 1


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="image files or directories (walked recursively)")
    ap.add_argument("--out", help="directory to write cleaned copies into (required unless --selftest)")
    ap.add_argument("--report", action="store_true", help="print the size table per group")
    ap.add_argument("--transcode-heic", action="store_true",
                    help="convert HEIC/HEIF to JPEG with macOS sips, then strip and prove (lossy)")
    ap.add_argument("--quiet", action="store_true", help="print only refusals and the report")
    ap.add_argument("--selftest", action="store_true", help="run the synthetic cases and break-probes")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if not args.paths or not args.out:
        ap.error("give PATH... and --out DIR")
    out = Path(args.out).resolve()
    for p in args.paths:
        p = Path(p).resolve()
        if out == p or p in out.parents:
            ap.error(f"--out must not be inside an input ({p}): a re-run would read its own output")
    rows = run(args.paths, out, args.transcode_heic, args.quiet)
    if args.report:
        report(rows)
    refused = [r for r in rows if r["status"] == "REFUSED"]
    clean = sum(1 for r in rows if r["status"] == "clean")
    print(f"\n{clean} image(s) stripped and proven clean, {len(refused)} REFUSED, "
          f"{sum(1 for r in rows if r['status'] == 'skipped')} not an image.")
    return 1 if refused else 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
