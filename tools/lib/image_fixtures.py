#!/usr/bin/env python3
"""Synthetic image bytes for the self-tests of strip_exif.py and check_images.py.

🛑 EVERY FIXTURE IS BUILT HERE, AT TEST TIME, FROM CONSTANTS. The real
photographs carry GPS for a private address in a PUBLIC repo whose history
cannot be edited (ADR 0128), so no test may read one and no binary fixture is
committed. The coordinates below are nonsense on purpose (0°12'34" in both
axes, which is the Gulf of Guinea) and exist only as bytes in memory.

These images are structurally complete — every segment a real decoder walks is
present with a correct length and, for PNG, a correct CRC — but the JPEG scan
data is filler, so they are fixtures for a METADATA reader, not pictures.
"""

import struct
import zlib

# ---- TIFF / EXIF ---------------------------------------------------------------


def _ifd(entries, next_off, e=">"):
    """entries: list of (tag, type, count, value_bytes_4). Returns IFD bytes."""
    out = struct.pack(e + "H", len(entries))
    for tag, typ, n, val in sorted(entries):
        out += struct.pack(e + "HHI", tag, typ, n) + val
    return out + struct.pack(e + "I", next_off)


def _short(v, e=">"):
    return struct.pack(e + "HH", v, 0)


def _long(v, e=">"):
    return struct.pack(e + "I", v)


def tiff_minimal(orientation=6):
    """What the stripper writes: IFD0 = Orientation only."""
    return b"MM\x00*" + _long(8) + _ifd([(0x0112, 3, 1, _short(orientation))], 0)


def tiff_benign():
    """What macOS writes into a PNG screenshot's eXIf (og-image.png's shape)."""
    ifd0 = _ifd([(0x8769, 4, 1, _long(26))], 0)
    exif = _ifd([(0xA001, 3, 1, _short(1)), (0xA002, 4, 1, _long(1200)),
                 (0xA003, 4, 1, _long(630))], 0)
    return b"MM\x00*" + _long(8) + ifd0 + exif


def tiff_with_gps(orientation=6, thumbnail=None, make=True):
    """IFD0 with Orientation, Make, an Exif IFD and a GPS IFD; optional IFD1 thumbnail."""
    e = ">"
    make_str = b"FixtureCam\x00\x00" if make else b""  # stored out of line
    # Layout: header(8) | IFD0 | Exif IFD | GPS IFD | data area | [IFD1 | thumb]
    n0 = 4 if make else 3
    ifd0_len = 2 + 12 * n0 + 4
    exif_off = 8 + ifd0_len
    exif_len = 2 + 12 * 1 + 4
    gps_off = exif_off + exif_len
    gps_len = 2 + 12 * 4 + 4
    data_off = gps_off + gps_len
    lat = struct.pack(e + "IIIIII", 0, 1, 12, 1, 34, 1)
    lng = lat
    make_off = data_off
    lat_off = make_off + len(make_str)
    lng_off = lat_off + len(lat)
    ifd1_off = lng_off + len(lng) if thumbnail is not None else 0
    entries0 = [(0x0112, 3, 1, _short(orientation)), (0x8769, 4, 1, _long(exif_off)),
                (0x8825, 4, 1, _long(gps_off))]
    if make:
        entries0.append((0x010F, 2, len(make_str), _long(make_off)))
    out = b"MM\x00*" + _long(8)
    out += _ifd(entries0, ifd1_off)
    out += _ifd([(0x9003, 2, 4, b"2026")], 0)  # nonsense but well-formed
    out += _ifd([(0x0001, 2, 2, b"S\x00\x00\x00"), (0x0002, 5, 3, _long(lat_off)),
                 (0x0003, 2, 2, b"E\x00\x00\x00"), (0x0004, 5, 3, _long(lng_off))], 0)
    out += make_str + lat + lng
    if thumbnail is not None:
        ifd1_len = 2 + 12 * 2 + 4
        t_off = ifd1_off + ifd1_len
        out += _ifd([(0x0201, 4, 1, _long(t_off)), (0x0202, 4, 1, _long(len(thumbnail)))], 0)
        out += thumbnail
    return out


# ---- JPEG ----------------------------------------------------------------------

def _seg(marker, body):
    return bytes([0xFF, marker]) + struct.pack(">H", len(body) + 2) + body


# The coding segments: identical in every fixture so the stripper's
# pixels-untouched proof has something to compare.
DQT = _seg(0xDB, b"\x00" + bytes(range(1, 65)))
SOF0 = _seg(0xC0, b"\x08\x00\x10\x00\x10\x01\x01\x11\x00")
DHT = _seg(0xC4, b"\x00" + b"\x01" + b"\x00" * 15 + b"\x00")
SOS = _seg(0xDA, b"\x01\x01\x00\x00\x3f\x00")
SCAN = b"\x12\x34\xff\x00\x56\xff\xd0\x78\x9a"  # includes a stuffed FF and an RST
EOI = b"\xff\xd9"
JFIF = _seg(0xE0, b"JFIF\x00\x01\x01\x00\x00\x48\x00\x48\x00\x00")


def jpeg(*meta, trailing=b""):
    """SOI + the given metadata segments + the fixed coded image + EOI."""
    return b"\xff\xd8" + b"".join(meta) + DQT + SOF0 + DHT + SOS + SCAN + EOI + trailing


def app1_exif(tiff):
    return _seg(0xE1, b"Exif\x00\x00" + tiff)


def app1_xmp(xml):
    return _seg(0xE1, b"http://ns.adobe.com/xap/1.0/\x00" + xml)


XMP_LOCATION = (b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description '
                b'photoshop:City="Nowhere" exif:GPSLatitude="0,12.5S"/></rdf:RDF></x:xmpmeta>')


def app13_iptc_city():
    iptc = b"\x1c\x02\x5a" + struct.pack(">H", 7) + b"Nowhere"
    irb = b"8BIM" + struct.pack(">H", 0x0404) + b"\x00\x00" + struct.pack(">I", len(iptc)) + iptc + b"\x00"
    return _seg(0xED, b"Photoshop 3.0\x00" + irb)


def app2_mpf():
    return _seg(0xE2, b"MPF\x00" + b"MM\x00*\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00")


def com(text):
    return _seg(0xFE, text)


def gps_jpeg():
    return jpeg(JFIF, app1_exif(tiff_with_gps()))


def clean_jpeg(orientation=6):
    return jpeg(app1_exif(tiff_minimal(orientation)))


def thumbnail_gps_jpeg():
    """The outer EXIF is clean-looking (Orientation only) but IFD1 holds a
    thumbnail whose OWN EXIF carries a GPS IFD."""
    thumb = jpeg(app1_exif(tiff_with_gps(make=False)))
    e = ">"
    ifd0_len = 2 + 12 + 4
    ifd1_off = 8 + ifd0_len
    ifd1_len = 2 + 24 + 4
    t_off = ifd1_off + ifd1_len
    tiff = (b"MM\x00*" + _long(8) + _ifd([(0x0112, 3, 1, _short(6))], ifd1_off, e)
            + _ifd([(0x0201, 4, 1, _long(t_off)), (0x0202, 4, 1, _long(len(thumb)))], 0, e)
            + thumb)
    return jpeg(app1_exif(tiff))


def trailing_gps_jpeg():
    """Apple's MPF shape: a clean primary, then a second image after EOI."""
    return jpeg(app1_exif(tiff_minimal()), trailing=gps_jpeg())


# ---- PNG -----------------------------------------------------------------------

def _chunk(t, data):
    return struct.pack(">I", len(data)) + t + data + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)


def png(*extra):
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 0, 0, 0, 0))
    idat = _chunk(b"IDAT", zlib.compress(b"\x00\x00"))
    return b"\x89PNG\r\n\x1a\n" + ihdr + b"".join(extra) + idat + _chunk(b"IEND", b"")


def png_exif(tiff):
    return _chunk(b"eXIf", tiff)


def png_xmp(xml):
    return _chunk(b"iTXt", b"XML:com.adobe.xmp\x00\x00\x00\x00\x00" + xml)


def png_text(key, value):
    return _chunk(b"tEXt", key + b"\x00" + value)


# ---- WebP ----------------------------------------------------------------------

def _riff(t, data):
    return t + struct.pack("<I", len(data)) + data + (b"\x00" if len(data) & 1 else b"")


VP8 = _riff(b"VP8 ", b"\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00" + b"\x00" * 8)


def webp(*chunks, flags=0):
    body = b"WEBP"
    if chunks:
        body += _riff(b"VP8X", bytes([flags, 0, 0, 0]) + b"\x00\x00\x00\x00\x00\x00")
    body += b"".join(chunks) + VP8
    return b"RIFF" + struct.pack("<I", len(body)) + body


def webp_exif_gps():
    return webp(_riff(b"EXIF", tiff_with_gps()), flags=0x08)


def webp_xmp_location():
    return webp(_riff(b"XMP ", XMP_LOCATION), flags=0x04)


# ---- ICC -----------------------------------------------------------------------

def icc(private=False, desc="Fixture RGB"):
    """A small, well-formed profile: desc + wtpt (+ a private 'priv' tag)."""
    text = desc.encode("latin-1")
    tags = [(b"desc", b"text\x00\x00\x00\x00" + text + b"\x00"),
            (b"wtpt", b"XYZ \x00\x00\x00\x00" + struct.pack(">iii", 63190, 65536, 54061))]
    if private:
        tags.append((b"priv", b"data\x00\x00\x00\x00\x01\x00\x00\x00\x07\x00"))
    table_end = 132 + 12 * len(tags)
    off, table, blob = table_end, b"", b""
    for sig, data in tags:
        pad = (-len(data)) % 4
        table += struct.pack(">4sII", sig, off, len(data))
        blob += data + b"\x00" * pad
        off += len(data) + pad
    size = table_end + len(blob)
    header = bytearray(128)
    header[0:4] = struct.pack(">I", size)
    header[12:24] = b"mntrRGB XYZ "
    header[36:40] = b"acsp"
    return bytes(header) + struct.pack(">I", len(tags)) + table + blob
