#!/usr/bin/env python3
"""A strict, allowlist reader for the metadata an image file carries.

This is the VERIFIER half of ADR 0128. `tools/strip_exif.py` writes cleaned
images and `tools/check_images.py` gates the tracked tree; both ask this
module one question — *does this file carry anything outside the allowlist?* —
and both believe only its answer, read off bytes on disk.

🛑 WHY AN ALLOWLIST AND NOT A GPS DETECTOR. The repo is public and git history
cannot be edited, so the failure that matters is the one nobody sees: a file
whose location lives somewhere the reader did not think to look — an XMP
packet, an IPTC city, a thumbnail's own EXIF, a second image appended after
the first one ends (Apple's MPF gain maps do exactly this, on 270 of the 378
intake JPEGs measured 2026-09-28). A detector answers "I found no GPS", which
is also what it answers about a structure it cannot read. So the rule here is
the other way round: every structure in the file must be one this module
UNDERSTANDS and has put on the allowlist, and anything else is a finding —
even if it is harmless. Location is still named specifically where it can be
(`kind == "location"`), because "your file has a GPS IFD" is a different
urgency from "your file has a comment", but a file is clean only when there
are NO findings of any kind.

WHAT IS ON THE ALLOWLIST, and why each item is safe to keep:

  pixels      the coded image itself (JPEG DQT/DHT/DRI/SOF/SOS + scan data,
              PNG IHDR/PLTE/IDAT/tRNS, WebP VP8/VP8L/ALPH, ICO's embedded
              PNG or plain DIB bitmaps).
  rendering   PNG gAMA cHRM sRGB sBIT bKGD pHYs; JPEG APP0 JFIF with no
              thumbnail; JPEG APP14 Adobe (12 bytes, colour transform only).
  EXIF        exactly: IFD0 Orientation (SHORT, 1 value, 1–8) and the Exif
              IFD pointer; inside it ColorSpace, PixelXDimension and
              PixelYDimension (each one number). No IFD1, so no thumbnail.
              Every byte of the EXIF block must be accounted for — slack
              bytes are a place to hide data, so they are a finding.
  ICC         a colour profile whose every tag signature is a standard colour
              tag, whose text tags are short and printable, and whose unused
              bytes are zero. A profile carrying a private tag (Apple's
              `aapy`, measured on 145 intake photos) is not on the list:
              not because it is known to be harmful but because it is not
              known to be harmless.
  SVG         SVG-namespace elements with no <metadata>, <foreignObject>,
              comment, processing instruction or DOCTYPE.

Everything else — XMP, IPTC/Photoshop IRB, MakerNote, MPF, COM, any other
APPn, PNG text chunks, EXIF outside the list above, bytes after the end of the
image — is a finding. Formats this module does not parse (HEIC/HEIF/AVIF,
GIF, TIFF, BMP, JPEG XL, PDF) are `unsupported`, which is also a finding:
a gate that passes a format it did not read has not checked it.

Belt and braces: after the structural walk, a raw byte sweep looks for the
signatures of metadata that no allowed structure contains (an XMP packet
header, a Photoshop IRB, an MPF index, an extra `Exif\\0\\0`, an embedded
JPEG). A structural parser can be fooled by a structure it mis-walks; a
signature sweep cannot be fooled the same way, so the two disagreeing is
itself a finding.

Stdlib only (ADR 0001). Pure Python so it runs on CI's Ubuntu runner.
"""

import re
import struct
import zlib
import xml.etree.ElementTree as ET

# --- Findings -----------------------------------------------------------------

LOCATION = "location"      # a structure that holds, or is built to hold, a place
DISALLOWED = "disallowed"  # understood, but not on the allowlist
MALFORMED = "malformed"    # not what the format says it must be
UNSUPPORTED = "unsupported"  # a format or feature this module does not read


class Finding:
    __slots__ = ("kind", "where", "detail")

    def __init__(self, kind, where, detail):
        self.kind, self.where, self.detail = kind, where, detail

    def __repr__(self):
        return f"{self.kind}: {self.where}: {self.detail}"


def is_clean(findings):
    return not findings


# --- Sniffing -----------------------------------------------------------------

HEIF_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1",
               b"msf1", b"avif", b"avis", b"mif2"}


def sniff(data):
    """Name the format from its magic bytes, never from the file name."""
    h = data[:32]
    if h[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if h[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if h[:4] == b"RIFF" and h[8:12] == b"WEBP":
        return "webp"
    if h[4:8] == b"ftyp":
        return "heif" if h[8:12] in HEIF_BRANDS else "isobmff"
    if h[:4] == b"\x00\x00\x01\x00":
        return "ico"
    if h[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if h[:4] in (b"II*\x00", b"MM\x00*"):
        return "tiff"
    if h[:4] == b"%PDF":
        return "pdf"
    if h[:2] == b"BM":
        return "bmp"
    if h[:2] == b"\xff\x0a" or h[:12] == b"\x00\x00\x00\x0cJXL \r\n\x87\n":
        return "jxl"
    head = data[:512].lstrip(b"\xef\xbb\xbf \t\r\n")
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in data[:4096]):
        return "svg"
    return None


# --- Location vocabulary --------------------------------------------------------

# Used to NAME a finding as location, never to decide cleanliness: XMP, IPTC and
# the rest are findings whether or not these match.
LOCATION_TEXT = re.compile(
    rb"(?i)gps|latitude|longitude|geo:|georss|wgs84_pos|photoshop:(city|state|country)"
    rb"|iptc4xmp(core|ext):(location|countrycode|city|sublocation)"
    rb"|locationcreated|locationshown|sublocation")

# IPTC-IIM record 2 datasets that name a place.
IPTC_LOCATION = {26: "Content Location Code", 27: "Content Location Name",
                 90: "City", 92: "Sub-location", 95: "Province/State",
                 100: "Country Code", 101: "Country Name"}

# --- ICC ------------------------------------------------------------------------

ICC_TAGS = {b"desc", b"cprt", b"wtpt", b"bkpt", b"rXYZ", b"gXYZ", b"bXYZ",
            b"rTRC", b"gTRC", b"bTRC", b"kTRC", b"chad", b"chrm", b"lumi",
            b"meas", b"tech", b"vued", b"view", b"dmnd", b"dmdd", b"A2B0",
            b"A2B1", b"A2B2", b"B2A0", b"B2A1", b"B2A2", b"gamt", b"cicp"}
ICC_TEXT_TAGS = {b"desc", b"cprt", b"dmnd", b"dmdd", b"vued"}
ICC_TEXT_MAX = 128


def _icc_text(blob):
    """Decode an ICC text-type tag (desc / mluc / text); None if not text."""
    t = blob[:4]
    if t == b"text":
        return blob[8:].split(b"\x00")[0].decode("latin-1")
    if t == b"desc" and len(blob) >= 12:
        (n,) = struct.unpack_from(">I", blob, 8)
        return blob[12:12 + n].split(b"\x00")[0].decode("latin-1")
    if t == b"mluc" and len(blob) >= 16:
        count, rec = struct.unpack_from(">II", blob, 8)
        out = []
        for k in range(count):
            base = 16 + k * rec
            if base + 12 > len(blob):
                return None
            ln, off = struct.unpack_from(">II", blob, base + 4)
            out.append(blob[off:off + ln].decode("utf-16-be", "replace"))
        return " | ".join(out)
    return None


def inspect_icc(p, where):
    """An ICC profile is kept only when every part of it is colour data."""
    f = []
    if len(p) < 132:
        return [Finding(MALFORMED, where, f"ICC profile of {len(p)} bytes is shorter than its header")]
    (size,) = struct.unpack_from(">I", p, 0)
    if size != len(p):
        f.append(Finding(MALFORMED, where, f"ICC declares {size} bytes, holds {len(p)}"))
    if p[36:40] != b"acsp":
        return f + [Finding(MALFORMED, where, "ICC profile has no 'acsp' signature")]
    (count,) = struct.unpack_from(">I", p, 128)
    if 132 + 12 * count > len(p):
        return f + [Finding(MALFORMED, where, f"ICC tag table of {count} entries overruns the profile")]
    covered = bytearray(len(p))
    covered[:132 + 12 * count] = b"\x01" * (132 + 12 * count)
    for k in range(count):
        sig, off, sz = struct.unpack_from(">4sII", p, 132 + 12 * k)
        name = sig.decode("latin-1")
        if off + sz > len(p):
            f.append(Finding(MALFORMED, where, f"ICC tag {name!r} overruns the profile"))
            continue
        covered[off:off + sz] = b"\x01" * sz
        if sig not in ICC_TAGS:
            f.append(Finding(DISALLOWED, where, f"ICC tag {name!r} is not a standard colour tag"))
            continue
        if sig in ICC_TEXT_TAGS:
            text = _icc_text(p[off:off + sz])
            if text is None:
                f.append(Finding(DISALLOWED, where, f"ICC tag {name!r} is not a text type this reads"))
            elif len(text) > ICC_TEXT_MAX or not text.isprintable():
                f.append(Finding(DISALLOWED, where, f"ICC tag {name!r} carries {len(text)} chars of free text"))
            elif LOCATION_TEXT.search(text.encode("utf-8")):
                f.append(Finding(LOCATION, where, f"ICC tag {name!r} text names a place"))
    # Padding between tags must be empty; otherwise it is room to hide bytes.
    stray = sum(1 for i, c in enumerate(covered) if not c and p[i])
    if stray:
        f.append(Finding(DISALLOWED, where, f"ICC profile has {stray} non-zero byte(s) outside every tag"))
    return f


# --- EXIF (TIFF) -----------------------------------------------------------------

TYPE_SIZE = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8,
             13: 4, 16: 8, 17: 8, 18: 8}
TAG_NAMES = {0x0100: "ImageWidth", 0x0101: "ImageLength", 0x010E: "ImageDescription",
             0x010F: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x011A: "XResolution",
             0x011B: "YResolution", 0x0128: "ResolutionUnit", 0x0131: "Software",
             0x0132: "DateTime", 0x013B: "Artist", 0x0201: "JPEGInterchangeFormat",
             0x0202: "JPEGInterchangeFormatLength", 0x0213: "YCbCrPositioning",
             0x02BC: "XMP", 0x8298: "Copyright", 0x83BB: "IPTC", 0x8769: "ExifIFD",
             0x8825: "GPSInfo", 0x9003: "DateTimeOriginal", 0x9010: "OffsetTime",
             0x927C: "MakerNote", 0x9286: "UserComment", 0xA001: "ColorSpace",
             0xA002: "PixelXDimension", 0xA003: "PixelYDimension", 0xA005: "Interop",
             0xA420: "ImageUniqueID", 0xA430: "CameraOwnerName", 0xA431: "BodySerialNumber",
             0xA434: "LensModel", 0xA435: "LensSerialNumber", 0xC4A5: "PrintIM"}
# (tag -> allowed TIFF types). Each must hold exactly one number.
ALLOW_IFD0 = {0x0112: (3,), 0x8769: (4, 13)}
ALLOW_EXIF = {0xA001: (3,), 0xA002: (3, 4), 0xA003: (3, 4)}
SUB_IFD_TAGS = {0x8769, 0x8825, 0xA005, 0x014A}


def _tag(t):
    return f"0x{t:04X} {TAG_NAMES.get(t, '')}".rstrip()


def inspect_tiff(buf, where):
    """Walk a TIFF/EXIF block. Returns (findings, orientation_or_None)."""
    f = []
    if len(buf) < 8 or buf[:2] not in (b"II", b"MM"):
        return [Finding(MALFORMED, where, "EXIF has no TIFF byte-order mark")], None
    e = "<" if buf[:2] == b"II" else ">"
    if struct.unpack_from(e + "H", buf, 2)[0] != 42:
        return [Finding(MALFORMED, where, "EXIF TIFF magic is not 42")], None
    covered = bytearray(len(buf))
    covered[:8] = b"\x01" * 8
    state = {"orientation": None}
    seen = set()

    def value_bytes(entry, typ, n):
        size = TYPE_SIZE.get(typ, 0) * n
        if size <= 4:
            return entry + 8, size
        (off,) = struct.unpack_from(e + "I", buf, entry + 8)
        return off, size

    def walk(off, label, allow, depth):
        if off in seen or depth > 4:
            f.append(Finding(MALFORMED, where, f"{label} IFD loops or nests too deep"))
            return 0
        seen.add(off)
        if off + 2 > len(buf):
            f.append(Finding(MALFORMED, where, f"{label} IFD offset {off} is outside the EXIF block"))
            return 0
        (count,) = struct.unpack_from(e + "H", buf, off)
        end = off + 2 + 12 * count + 4
        if end > len(buf):
            f.append(Finding(MALFORMED, where, f"{label} IFD of {count} entries overruns the block"))
            return 0
        covered[off:end] = b"\x01" * (end - off)
        thumb = {}
        for k in range(count):
            entry = off + 2 + 12 * k
            tag, typ, n = struct.unpack_from(e + "HHI", buf, entry)
            if typ not in TYPE_SIZE:
                f.append(Finding(MALFORMED, where, f"{label} {_tag(tag)} has unknown type {typ}"))
                continue
            pos, size = value_bytes(entry, typ, n)
            if pos + size > len(buf):
                f.append(Finding(MALFORMED, where, f"{label} {_tag(tag)} value overruns the block"))
                continue
            if size > 4:
                covered[pos:pos + size] = b"\x01" * size
            if tag == 0x8825:
                sub = struct.unpack_from(e + "I", buf, pos)[0] if size >= 4 else None
                n_gps = struct.unpack_from(e + "H", buf, sub)[0] if sub is not None and sub + 2 <= len(buf) else "?"
                f.append(Finding(LOCATION, where, f"{label} carries a GPS IFD ({n_gps} entries)"))
                if sub is not None:
                    walk(sub, "GPS", {}, depth + 1)
                continue
            if tag == 0x02BC:
                blob = buf[pos:pos + size]
                kind = LOCATION if LOCATION_TEXT.search(blob) else DISALLOWED
                f.append(Finding(kind, where, f"{label} embeds an XMP packet"))
                continue
            if tag == 0x83BB:
                f.extend(_iptc(buf[pos:pos + size], where))
                continue
            if tag in (0x0201, 0x0202):
                thumb[tag] = struct.unpack_from(e + ("H" if typ == 3 else "I"), buf, pos)[0]
            if tag in allow and typ in allow[tag] and n == 1:
                if tag == 0x0112:
                    v = struct.unpack_from(e + "H", buf, pos)[0]
                    if 1 <= v <= 8:
                        state["orientation"] = v
                    else:
                        f.append(Finding(MALFORMED, where, f"Orientation {v} is not 1-8"))
                elif tag == 0x8769:
                    walk(struct.unpack_from(e + "I", buf, pos)[0], "Exif", ALLOW_EXIF, depth + 1)
                continue
            kind = DISALLOWED
            if tag in SUB_IFD_TAGS and size >= 4:
                walk(struct.unpack_from(e + "I", buf, pos)[0], TAG_NAMES.get(tag, _tag(tag)), {}, depth + 1)
            f.append(Finding(kind, where, f"{label} tag {_tag(tag)} is not on the allowlist"))
        # A thumbnail carries its own metadata: read it so a location in it is
        # NAMED, on top of the thumbnail itself being a finding.
        if 0x0201 in thumb and 0x0202 in thumb:
            t0, tn = thumb[0x0201], thumb[0x0202]
            if t0 + tn <= len(buf):
                covered[t0:t0 + tn] = b"\x01" * tn
                sub = inspect_jpeg(buf[t0:t0 + tn], f"{where} {label} thumbnail")
                f.extend(sub)
        (nxt,) = struct.unpack_from(e + "I", buf, end - 4)
        return nxt

    (ifd0,) = struct.unpack_from(e + "I", buf, 4)
    nxt = walk(ifd0, "IFD0", ALLOW_IFD0, 0)
    if nxt:
        f.append(Finding(DISALLOWED, where, "EXIF has an IFD1 (a thumbnail image and its tags)"))
        walk(nxt, "IFD1", {}, 1)
    stray = covered.count(0)
    if stray:
        f.append(Finding(DISALLOWED, where, f"EXIF has {stray} byte(s) no IFD accounts for"))
    return f, state["orientation"]


def _iptc(blob, where):
    """IPTC-IIM datasets: name the place-bearing ones; the block is a finding regardless."""
    f = [Finding(DISALLOWED, where, "IPTC-IIM block")]
    i = 0
    while i + 5 <= len(blob) and blob[i] == 0x1C:
        rec, ds, ln = blob[i + 1], blob[i + 2], struct.unpack_from(">H", blob, i + 3)[0]
        if ln & 0x8000:
            break
        if rec == 2 and ds in IPTC_LOCATION:
            f.append(Finding(LOCATION, where, f"IPTC 2:{ds} {IPTC_LOCATION[ds]}"))
        i += 5 + ln
    return f


def _photoshop_irb(body, where):
    """APP13 'Photoshop 3.0' image resource blocks; 0x0404 is IPTC."""
    f = [Finding(DISALLOWED, where, "Photoshop IRB (APP13)")]
    i = 14
    while i + 12 <= len(body) and body[i:i + 4] == b"8BIM":
        (rid,) = struct.unpack_from(">H", body, i + 4)
        nlen = body[i + 6]
        j = i + 7 + nlen + ((nlen + 1) & 1)
        if j + 4 > len(body):
            break
        (sz,) = struct.unpack_from(">I", body, j)
        data = body[j + 4:j + 4 + sz]
        if rid == 0x0404:
            f.extend(_iptc(data, where))
        i = j + 4 + sz + (sz & 1)
    return f


def _ident(body):
    """The NUL-terminated identifier a segment or text chunk starts with."""
    return body[:24].split(b"\x00")[0]


# --- JPEG -------------------------------------------------------------------------

XMP_SIG = b"http://ns.adobe.com/xap/1.0/\x00"
XMP_EXT_SIG = b"http://ns.adobe.com/xmp/extension/\x00"
SCAN_END = re.compile(rb"\xff[^\x00\xd0-\xd7]")
SOF_OK = {0xC0, 0xC1, 0xC2}
SOF_OTHER = {0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def inspect_jpeg(d, where="jpeg"):
    f = []
    if d[:2] != b"\xff\xd8":
        return [Finding(MALFORMED, where, "no SOI marker")]
    i, exif_n, sof_n, icc = 2, 0, 0, {}
    eoi = None
    while i < len(d):
        if i + 2 > len(d) or d[i] != 0xFF:
            f.append(Finding(MALFORMED, where, f"expected a marker at byte {i}"))
            return f
        m = d[i + 1]
        if m == 0xD9:
            eoi = i + 2
            break
        if m == 0xFF:
            f.append(Finding(DISALLOWED, where, f"fill bytes before a marker at {i}"))
            return f
        if m in (0x01, 0xD8) or 0xD0 <= m <= 0xD7:
            f.append(Finding(MALFORMED, where, f"standalone marker 0x{m:02X} outside a scan at {i}"))
            return f
        if i + 4 > len(d):
            f.append(Finding(MALFORMED, where, "truncated segment header"))
            return f
        (ln,) = struct.unpack_from(">H", d, i + 2)
        if ln < 2 or i + 2 + ln > len(d):
            f.append(Finding(MALFORMED, where, f"segment 0x{m:02X} at {i} overruns the file"))
            return f
        body = d[i + 4:i + 2 + ln]
        seg = f"{where} APP{m - 0xE0}" if 0xE0 <= m <= 0xEF else f"{where} 0x{m:02X}"
        if m == 0xE0:
            if not (body[:5] == b"JFIF\x00" and len(body) == 14 and body[12] == 0 and body[13] == 0):
                f.append(Finding(DISALLOWED, seg, "APP0 that is not a thumbnail-free JFIF header"))
        elif m == 0xE1:
            if body[:6] == b"Exif\x00\x00":
                exif_n += 1
                sub, _ = inspect_tiff(body[6:], seg + " Exif")
                f.extend(sub)
                if exif_n > 1:
                    f.append(Finding(DISALLOWED, seg, "a second EXIF block"))
            elif body.startswith(XMP_SIG) or body.startswith(XMP_EXT_SIG):
                kind = LOCATION if LOCATION_TEXT.search(body) else DISALLOWED
                f.append(Finding(kind, seg, "XMP packet" + (" naming a place" if kind == LOCATION else "")))
            else:
                f.append(Finding(DISALLOWED, seg, f"APP1 {body[:16]!r}"))
        elif m == 0xE2 and body[:12] == b"ICC_PROFILE\x00" and len(body) >= 14:
            icc[body[12]] = (body[13], body[14:])
        elif m == 0xE2 and body[:4] == b"MPF\x00":
            f.append(Finding(DISALLOWED, seg, "MPF index (secondary images carry their own EXIF)"))
        elif m == 0xED and body[:14] == b"Photoshop 3.0\x00":
            f.extend(_photoshop_irb(body, seg))
        elif m == 0xEE and body[:5] == b"Adobe" and len(body) == 12:
            pass
        elif 0xE0 <= m <= 0xEF:
            f.append(Finding(DISALLOWED, seg, f"APP{m - 0xE0} {_ident(body)!r}"))
        elif m == 0xFE:
            f.append(Finding(DISALLOWED, seg, f"COM comment of {len(body)} bytes"))
        elif m in (0xDB, 0xC4, 0xDD):
            pass
        elif m in SOF_OK:
            sof_n += 1
        elif m in SOF_OTHER:
            f.append(Finding(UNSUPPORTED, seg, "a JPEG coding process this does not read"))
        elif m == 0xDA:
            i += 2 + ln
            hit = SCAN_END.search(d, i)
            if not hit:
                f.append(Finding(MALFORMED, where, "scan data runs to the end of the file with no EOI"))
                return f
            i = hit.start()
            continue
        else:
            f.append(Finding(DISALLOWED, seg, f"marker 0x{m:02X}"))
        i += 2 + ln
    if eoi is None:
        f.append(Finding(MALFORMED, where, "no EOI marker"))
        return f
    if sof_n != 1:
        f.append(Finding(MALFORMED, where, f"{sof_n} frame headers (expected 1)"))
    if icc:
        total = {v[0] for v in icc.values()}
        if total != {len(icc)} or set(icc) != set(range(1, len(icc) + 1)):
            f.append(Finding(MALFORMED, where, "ICC_PROFILE chunks are not a complete 1..N sequence"))
        else:
            f.extend(inspect_icc(b"".join(icc[k][1] for k in sorted(icc)), where + " ICC"))
    if eoi < len(d):
        tail = d[eoi:]
        f.append(Finding(DISALLOWED, where, f"{len(tail)} byte(s) after the end of the image"))
        at = tail.find(b"\xff\xd8\xff")
        if at >= 0:
            f.extend(inspect_jpeg(tail[at:], where + " trailing image"))
    f.extend(_sweep(d, where, exif_allowed=exif_n, jpeg=True))
    return f


# --- PNG ---------------------------------------------------------------------------

PNG_OK = {b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB",
          b"sBIT", b"bKGD", b"pHYs"}
PNG_TEXT = {b"tEXt", b"zTXt", b"iTXt"}
PNG_UNSUPPORTED = {b"acTL", b"fcTL", b"fdAT", b"CgBI"}


def _png_text(t, data):
    """Return the decoded payload of a PNG text chunk (for naming only)."""
    try:
        if t == b"tEXt":
            return data
        if t == b"zTXt":
            k = data.index(b"\x00")
            return data[:k] + b" " + zlib.decompress(data[k + 2:])
        k = data.index(b"\x00")
        flag = data[k + 1]
        rest = data[k + 3:]
        rest = rest[rest.index(b"\x00") + 1:]
        rest = rest[rest.index(b"\x00") + 1:]
        return data[:k] + b" " + (zlib.decompress(rest) if flag else rest)
    except (ValueError, zlib.error):
        return data


def inspect_png(d, where="png"):
    f = []
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        return [Finding(MALFORMED, where, "no PNG signature")]
    i, first, ended = 8, True, False
    while i < len(d):
        if i + 12 > len(d):
            f.append(Finding(MALFORMED, where, f"truncated chunk at {i}"))
            return f
        (n,) = struct.unpack_from(">I", d, i)
        t = d[i + 4:i + 8]
        if i + 12 + n > len(d):
            f.append(Finding(MALFORMED, where, f"chunk {t!r} overruns the file"))
            return f
        data = d[i + 8:i + 8 + n]
        (crc,) = struct.unpack_from(">I", d, i + 8 + n)
        name = t.decode("latin-1")
        if zlib.crc32(t + data) & 0xFFFFFFFF != crc:
            f.append(Finding(MALFORMED, where, f"chunk {name} fails its CRC"))
        if first and t != b"IHDR":
            f.append(Finding(MALFORMED, where, "first chunk is not IHDR"))
        first = False
        i += 12 + n
        if t in PNG_OK:
            if t == b"IEND":
                ended = True
                break
        elif t == b"iCCP":
            k = data.find(b"\x00")
            try:
                if not 1 <= k <= 79 or data[k + 1] != 0:
                    raise ValueError
                prof = zlib.decompress(data[k + 2:])
            except (ValueError, IndexError, zlib.error):
                f.append(Finding(MALFORMED, where, "iCCP does not decode"))
                continue
            label = data[:k]
            if not all(32 <= c < 127 for c in label):
                f.append(Finding(DISALLOWED, where, "iCCP profile name is not plain text"))
            f.extend(inspect_icc(prof, where + " iCCP"))
        elif t == b"eXIf":
            sub, _ = inspect_tiff(data, where + " eXIf")
            f.extend(sub)
        elif t in PNG_TEXT:
            text = _png_text(t, data)
            kind = LOCATION if LOCATION_TEXT.search(text) else DISALLOWED
            f.append(Finding(kind, where, f"{name} text chunk {_ident(data)!r}"))
        elif t in PNG_UNSUPPORTED:
            f.append(Finding(UNSUPPORTED, where, f"{name} (animated or Apple-crushed PNG)"))
        elif t[0] & 0x20 == 0:
            f.append(Finding(UNSUPPORTED, where, f"unknown critical chunk {name}"))
        else:
            f.append(Finding(DISALLOWED, where, f"chunk {name} is not on the allowlist"))
    if not ended:
        f.append(Finding(MALFORMED, where, "no IEND chunk"))
    elif i < len(d):
        f.append(Finding(DISALLOWED, where, f"{len(d) - i} byte(s) after IEND"))
    f.extend(_sweep(d, where))
    return f


# --- WebP --------------------------------------------------------------------------

def inspect_webp(d, where="webp"):
    f = []
    if len(d) < 12 or d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return [Finding(MALFORMED, where, "not a RIFF/WEBP file")]
    (riff,) = struct.unpack_from("<I", d, 4)
    if riff + 8 != len(d):
        f.append(Finding(DISALLOWED if riff + 8 < len(d) else MALFORMED, where,
                         f"RIFF declares {riff + 8} bytes, file holds {len(d)}"))
    i, chunks, vp8x = 12, [], None
    end = min(len(d), riff + 8)
    while i < end:
        if i + 8 > end:
            f.append(Finding(MALFORMED, where, f"truncated chunk at {i}"))
            break
        t = d[i:i + 4]
        (n,) = struct.unpack_from("<I", d, i + 4)
        if i + 8 + n > end:
            f.append(Finding(MALFORMED, where, f"chunk {t!r} overruns the file"))
            break
        data = d[i + 8:i + 8 + n]
        chunks.append(t)
        name = t.decode("latin-1")
        if t in (b"VP8 ", b"VP8L", b"ALPH"):
            pass
        elif t == b"VP8X":
            if len(chunks) != 1 or n != 10:
                f.append(Finding(MALFORMED, where, "VP8X is not the 10-byte first chunk"))
            vp8x = data[0] if data else 0
        elif t == b"ICCP":
            f.extend(inspect_icc(data, where + " ICCP"))
        elif t == b"EXIF":
            blob = data[6:] if data[:6] == b"Exif\x00\x00" else data
            sub, _ = inspect_tiff(blob, where + " EXIF")
            f.append(Finding(DISALLOWED, where, "EXIF chunk"))
            f.extend(sub)
        elif t == b"XMP ":
            kind = LOCATION if LOCATION_TEXT.search(data) else DISALLOWED
            f.append(Finding(kind, where, "XMP chunk"))
        elif t in (b"ANIM", b"ANMF"):
            f.append(Finding(UNSUPPORTED, where, f"{name} (animated WebP)"))
        else:
            f.append(Finding(DISALLOWED, where, f"chunk {name!r} is not on the allowlist"))
        i += 8 + n + (n & 1)
    if not chunks or chunks[0] not in (b"VP8 ", b"VP8L", b"VP8X"):
        f.append(Finding(MALFORMED, where, "first chunk is not VP8/VP8L/VP8X"))
    if vp8x is not None:
        if vp8x & 0x08:
            f.append(Finding(DISALLOWED, where, "VP8X flags an EXIF chunk"))
        if vp8x & 0x04:
            f.append(Finding(DISALLOWED, where, "VP8X flags an XMP chunk"))
        if vp8x & 0x02:
            f.append(Finding(UNSUPPORTED, where, "VP8X flags animation"))
    f.extend(_sweep(d, where))
    return f


# --- ICO ---------------------------------------------------------------------------

def inspect_ico(d, where="ico"):
    f = []
    if len(d) < 6:
        return [Finding(MALFORMED, where, "shorter than an ICO header")]
    _, typ, count = struct.unpack_from("<HHH", d, 0)
    if typ != 1:
        return [Finding(UNSUPPORTED, where, f"ICO type {typ} (only icons are read)")]
    if 6 + 16 * count > len(d):
        return [Finding(MALFORMED, where, "directory overruns the file")]
    covered = bytearray(len(d))
    covered[:6 + 16 * count] = b"\x01" * (6 + 16 * count)
    for k in range(count):
        size, off = struct.unpack_from("<II", d, 6 + 16 * k + 8)
        if off + size > len(d):
            f.append(Finding(MALFORMED, where, f"image {k} overruns the file"))
            continue
        covered[off:off + size] = b"\x01" * size
        img = d[off:off + size]
        sub = f"{where} image {k}"
        if img[:8] == b"\x89PNG\r\n\x1a\n":
            f.extend(inspect_png(img, sub))
        elif len(img) >= 4 and struct.unpack_from("<I", img, 0)[0] == 40:
            pass  # BITMAPINFOHEADER: pixels and masks, nowhere to put metadata
        else:
            f.append(Finding(UNSUPPORTED, sub, "neither PNG nor a 40-byte-header bitmap"))
    stray = covered.count(0)
    if stray:
        f.append(Finding(DISALLOWED, where, f"{stray} byte(s) no directory entry accounts for"))
    return f


# --- SVG ---------------------------------------------------------------------------

SVG_NS = "http://www.w3.org/2000/svg"
SVG_ATTR_NS = {"http://www.w3.org/1999/xlink", "http://www.w3.org/XML/1998/namespace"}


def inspect_svg(d, where="svg"):
    f = []
    if re.search(rb"<!DOCTYPE|<!ENTITY", d):
        return [Finding(DISALLOWED, where, "DOCTYPE or ENTITY declaration")]
    try:
        parser = ET.XMLParser(target=ET.TreeBuilder(insert_comments=True, insert_pis=True))
        parser.feed(d)
        root = parser.close()
    except ET.ParseError as exc:
        return [Finding(MALFORMED, where, f"does not parse as XML: {exc}")]
    for el in root.iter():
        if el.tag is ET.Comment:
            f.append(Finding(DISALLOWED, where, "XML comment"))
            continue
        if el.tag is ET.ProcessingInstruction:
            f.append(Finding(DISALLOWED, where, "processing instruction"))
            continue
        ns, _, local = el.tag[1:].partition("}") if el.tag.startswith("{") else ("", "", el.tag)
        if ns != SVG_NS:
            f.append(Finding(DISALLOWED, where, f"element {el.tag} is not SVG"))
        elif local == "metadata":
            text = ET.tostring(el)
            kind = LOCATION if LOCATION_TEXT.search(text) else DISALLOWED
            f.append(Finding(kind, where, "<metadata> element"))
        elif local == "foreignObject":
            f.append(Finding(DISALLOWED, where, "<foreignObject> element"))
        for a in el.attrib:
            if a.startswith("{") and a[1:].partition("}")[0] not in SVG_ATTR_NS:
                f.append(Finding(DISALLOWED, where, f"attribute {a} in a foreign namespace"))
    return f


# --- The raw sweep -----------------------------------------------------------------

SWEEP = (b"<x:xmpmeta", b"<?xpacket", b"http://ns.adobe.com/", b"Photoshop 3.0\x00",
         b"8BIM", b"GPSLatitude", b"GPSLongitude")


def _sweep(d, where, exif_allowed=0, jpeg=False):
    """Signatures no allowed structure holds. Independent of the walk above."""
    f = []
    for sig in SWEEP:
        at = d.find(sig)
        if at >= 0:
            f.append(Finding(DISALLOWED, where, f"raw sweep: {sig!r} at byte {at}"))
    n_exif = d.count(b"Exif\x00\x00")
    if n_exif > exif_allowed:
        f.append(Finding(DISALLOWED, where, f"raw sweep: {n_exif} 'Exif' header(s), {exif_allowed} accounted for"))
    if jpeg:
        n_soi = d.count(b"\xff\xd8\xff")
        if n_soi > 1:
            f.append(Finding(DISALLOWED, where, f"raw sweep: {n_soi - 1} embedded JPEG start(s)"))
        if d.find(b"MPF\x00") >= 0:
            f.append(Finding(DISALLOWED, where, "raw sweep: an MPF index"))
    return f


# --- Entry points ------------------------------------------------------------------

INSPECTORS = {"jpeg": inspect_jpeg, "png": inspect_png, "webp": inspect_webp,
              "ico": inspect_ico, "svg": inspect_svg}


def inspect(data, where="file"):
    """Every finding for one file's bytes. [] means clean."""
    fmt = sniff(data)
    if fmt in INSPECTORS:
        return INSPECTORS[fmt](data, where)
    if fmt is None:
        return [Finding(UNSUPPORTED, where, "not an image format this reads")]
    why = " (can embed photographs with their own EXIF)" if fmt == "pdf" else ""
    return [Finding(UNSUPPORTED, where, f"{fmt} is not read by this module{why}")]


def orientation(data):
    """EXIF Orientation of a JPEG/PNG/WebP, or None. Read by the verifier's walk."""
    fmt = sniff(data)
    blob = None
    if fmt == "jpeg":
        i = 2
        while i + 4 <= len(data) and data[i] == 0xFF and data[i + 1] not in (0xDA, 0xD9):
            (ln,) = struct.unpack_from(">H", data, i + 2)
            if data[i + 1] == 0xE1 and data[i + 4:i + 10] == b"Exif\x00\x00":
                blob = data[i + 10:i + 2 + ln]
                break
            i += 2 + ln
    elif fmt == "png":
        i = 8
        while i + 12 <= len(data):
            (n,) = struct.unpack_from(">I", data, i)
            if data[i + 4:i + 8] == b"eXIf":
                blob = data[i + 8:i + 8 + n]
                break
            i += 12 + n
    if blob is None:
        return None
    return inspect_tiff(blob, "orientation")[1]


def pixel_payload(data):
    """The coded image and nothing else, as the verifier walks it.

    The stripper's fidelity proof: this must be byte-identical before and
    after, so "the pixels are the camera's" is a comparison, not a claim.
    (A decode-and-compare was tried and REJECTED, 2026-09-28: macOS ImageIO
    picks a different JPEG decoder when Apple's JFIF carries its `AMPF` hint,
    so identical coded bytes decoded up to 8 levels apart per sample —
    measured on IMG_7255 — and the comparison would have refused every file
    for a reason that is not in the file.)
    """
    fmt = sniff(data)
    parts = []
    if fmt == "jpeg":
        i = 2
        while i + 2 <= len(data) and data[i] == 0xFF:
            m = data[i + 1]
            if m == 0xD9:
                return b"".join(parts)
            if i + 4 > len(data):
                return None
            (ln,) = struct.unpack_from(">H", data, i + 2)
            nxt = i + 2 + ln
            if m == 0xDA:
                hit = SCAN_END.search(data, nxt)
                if not hit:
                    return None
                nxt = hit.start()
            if not (0xE0 <= m <= 0xEF or m == 0xFE):
                parts.append(data[i:nxt])
            i = nxt
        return None
    if fmt == "png":
        i = 8
        while i + 12 <= len(data):
            (n,) = struct.unpack_from(">I", data, i)
            t = data[i + 4:i + 8]
            if t in (b"IHDR", b"PLTE", b"tRNS", b"IDAT"):
                parts.append(data[i + 4:i + 8 + n])
            if t == b"IEND":
                return b"".join(parts)
            i += 12 + n
        return None
    if fmt == "webp":
        i = 12
        while i + 8 <= len(data):
            t = data[i:i + 4]
            (n,) = struct.unpack_from("<I", data, i + 4)
            if t in (b"VP8 ", b"VP8L", b"ALPH"):
                parts.append(t + data[i + 8:i + 8 + n])
            i += 8 + n + (n & 1)
        return b"".join(parts)
    return None
