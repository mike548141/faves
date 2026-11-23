#!/usr/bin/env python3
"""Test `intake_exif.py`'s HEIC and JPEG readers on bytes built here.

The reader is hand-written (no exiftool, ADR 0001), it feeds `check_provenance`
— a gate that decides whether a `verified` date is believable — and until this
file existed nothing exercised the HEIC half of it: the cold review of
2026-11-15 found that the only check run on it was one phone's photographs, and
that a hostile or merely damaged file could hang or abort the whole run
(roadmap 530/060, findings F5 to F9).

Every fixture is SYNTHETIC and built in this file: a few dozen bytes of
ISO-BMFF boxes around a TIFF block that names a made-up camera and a made-up
moment. No photograph is read, none is written to disk except into a temporary
directory that is deleted on exit, and no fixture carries a location. That is
deliberate twice over: this repo is public, and a test that needs a real photo
cannot run in CI or in a worktree, where `intake/` is empty.

What each group of cases pins, and the finding behind it:

  valid        every iinf/infe/iloc version the spec allows yields the date.
  F8           an Exif item split over two or three extents is read whole; two
               Exif items, or one Exif id declared twice in iloc, read as {}.
  F5           a hostile count, an extent count or a looping/fanning IFD returns
               promptly instead of spinning. Each runs under a watchdog, so a
               regression shows as `TIMED OUT`, never as a hung CI job.
  F6           truncation at EVERY byte offset, an empty file, a cut header and
               a tag stored in the wrong type all return the documented `{}` or
               a partial dict. They never raise, and `describe()` yields a row.
  F9           the reader is chosen by the file's BYTES, in both directions.

    python3 tools/test_intake_exif.py        # run every case
    python3 tools/test_intake_exif.py -v     # also print each passing case

Exit 0 = every case held. 1 = one did not, which is a hole in the reader.
Stdlib only. Never writes outside a temporary directory.
"""

import argparse
import contextlib
import json
import signal
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import intake_exif  # noqa: E402

WHEN = "2026:11:14 10:30:00"
MAKE = "Testmake"
BUDGET_S = 4  # a fixed reader answers every hostile case in milliseconds


# --- fixture builders -----------------------------------------------------------

def tiff(date=WHEN, date_type=2, big=False):
    """A TIFF block: IFD0 {Make, ExifIFD ptr} -> ExifIFD {DateTimeOriginal}."""
    e = ">" if big else "<"
    make = MAKE.encode() + b"\0"
    ifd0_at = 8
    ifd0_len = 2 + 2 * 12 + 4
    make_at = ifd0_at + ifd0_len
    exif_at = make_at + len(make) + (len(make) & 1)  # word-align
    exif_len = 2 + 12 + 4
    date_at = exif_at + exif_len
    out = (b"MM\x00*" if big else b"II*\x00") + struct.pack(e + "I", ifd0_at)
    out += struct.pack(e + "H", 2)
    out += struct.pack(e + "HHII", 0x010F, 2, len(make), make_at)
    out += struct.pack(e + "HHII", 0x8769, 4, 1, exif_at) + struct.pack(e + "I", 0)
    out += make + b"\0" * (exif_at - make_at - len(make))
    out += struct.pack(e + "H", 1)
    if date_type == 2:
        stamp = date.encode() + b"\0"
        out += struct.pack(e + "HHII", 0x9003, 2, len(stamp), date_at)
        out += struct.pack(e + "I", 0) + stamp
    else:  # the same tag stored as a SHORT: wrong, and legal to write
        out += struct.pack(e + "HHI", 0x9003, date_type, 1) + struct.pack(e + "HH", 7, 0)
        out += struct.pack(e + "I", 0)
    return out


def box(typ, payload):
    return struct.pack(">I4s", 8 + len(payload), typ) + payload


def fullbox(typ, version, payload):
    return box(typ, bytes([version, 0, 0, 0]) + payload)


def infe(item_id, typ, version=2):
    ident = struct.pack(">H" if version == 2 else ">I", item_id)
    return fullbox(b"infe", version, ident + b"\0\0" + typ + b"\0")


def iloc(version, items, count=None, ext_count_override=None):
    """items: [(id, [(offset, length), ...])] — construction method 0, 4/4/0/0."""
    big_ids = version >= 2
    body = bytes([0x44, 0x00])
    body += struct.pack(">I" if big_ids else ">H", len(items) if count is None else count)
    for iid, exts in items:
        body += struct.pack(">I" if big_ids else ">H", iid)
        if version >= 1:
            body += struct.pack(">H", 0)  # construction method
        body += struct.pack(">H", 0)  # data reference index
        body += struct.pack(">H", len(exts) if ext_count_override is None else ext_count_override)
        for off, length in exts:
            body += struct.pack(">II", off, length)
    return fullbox(b"iloc", version, body)


FTYP = box(b"ftyp", b"heic" + b"\0\0\0\0" + b"mif1heic")


def heic(payload=None, split=1, iloc_v=1, infe_v=2, exif_ids=(1,), iloc_count=None,
         ext_count=None, dup_iloc_entry=False):
    """A minimal HEIC: ftyp, meta{iinf, iloc}, mdat holding the Exif item.

    The Exif item's payload is a 4-byte header offset (0) then the TIFF block,
    which is how the HEIF spec lays out an Exif item. `split` cuts it into that
    many consecutive extents. Offsets depend on the size of `meta`, which does
    not depend on the offsets, so it is built twice.
    """
    payload = (b"\0\0\0\0" + tiff()) if payload is None else payload
    step = -(-len(payload) // split)
    pieces = [payload[k * step:(k + 1) * step] for k in range(split)]
    infes = b"".join(infe(i, b"Exif", infe_v) for i in exif_ids) + infe(2, b"hvc1", infe_v)
    iinf = fullbox(b"iinf", 0, struct.pack(">H", len(exif_ids) + 1) + infes)

    def meta_for(base):
        exts, at = [], base
        for p in pieces:
            exts.append((at, len(p)))
            at += len(p)
        # Every Exif id gets the same bytes, so a reader that lets the last item
        # win silently still reads a date, and the test can tell.
        items = [(i, exts) for i in exif_ids] + [(2, [(base, 0)])]
        if dup_iloc_entry:
            items.append((exif_ids[0], exts))
        return fullbox(b"meta", 0, iinf + iloc(iloc_v, items, iloc_count, ext_count))

    base = len(FTYP) + len(meta_for(0)) + 8
    return FTYP + meta_for(base) + box(b"mdat", b"".join(pieces))


def jpeg(tiff_block=None):
    body = b"Exif\0\0" + (tiff() if tiff_block is None else tiff_block)
    return b"\xff\xd8" + b"\xff\xe1" + struct.pack(">H", 2 + len(body)) + body + b"\xff\xd9"


def pdf():
    return b"%PDF-1.4\n1 0 obj << /CreationDate (D:20260102030405) >> endobj\n%%EOF\n"


def loop_tiff(n=65535):
    """IFD0 of n entries, every one a 0x8769 pointer back at IFD0 itself."""
    ent = struct.pack("<HHII", 0x8769, 4, 1, 8)
    return b"II*\x00" + struct.pack("<I", 8) + struct.pack("<H", n) + ent * n


def fanout_tiff(n=4000):
    """IFD0 of n 0x8769 pointers to n DIFFERENT offsets in a 0xFF-filled buffer,
    each of which reads as an IFD claiming 65535 entries. Following each once is
    still n x (buffer / 12) work, so a `seen` set alone does not bound it."""
    table = 8 + 2 + n * 12 + 4
    out = b"II*\x00" + struct.pack("<I", 8) + struct.pack("<H", n)
    for k in range(n):
        out += struct.pack("<HHII", 0x8769, 4, 1, table + k * 2)
    return out + struct.pack("<I", 0) + b"\xff" * (n * 2 + 70000)


# --- harness --------------------------------------------------------------------

class Hang(Exception):
    pass


@contextlib.contextmanager
def watchdog(seconds=BUDGET_S):
    def fire(_sig, _frm):
        raise Hang(f"no answer within {seconds}s")
    old = signal.signal(signal.SIGALRM, fire)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


RESULTS = []


def check(name, fn, verbose):
    try:
        with watchdog():
            fn()
        RESULTS.append((name, None))
        if verbose:
            print(f"  ok    {name}")
        return
    except Hang as exc:
        why = f"TIMED OUT ({exc})"
    except AssertionError as exc:
        why = str(exc) or "assertion failed"
    except Exception as exc:  # an uncaught raise IS the F6 failure
        why = f"RAISED {type(exc).__name__}: {exc}"
    RESULTS.append((name, why))
    print(f"  FAIL  {name}\n          {why}")


def write(tmp, name, data):
    p = Path(tmp) / name
    p.write_bytes(data)
    return p


def captured_of(path):
    return intake_exif.read_heic_exif(path).get("exif", {}).get("captured")


def cases(tmp):
    t = Path(tmp)
    out = []

    def case(name):
        def deco(fn):
            out.append((name, fn))
            return fn
        return deco

    # -- valid ---------------------------------------------------------------
    for iv in (0, 1, 2):
        for fv in (2, 3):
            @case(f"valid: iloc v{iv}, infe v{fv} reads the capture time")
            def _(iv=iv, fv=fv):
                p = write(t, f"v{iv}{fv}.heic", heic(iloc_v=iv, infe_v=fv))
                r = intake_exif.read_heic_exif(p)
                assert r.get("exif", {}).get("captured") == WHEN, r
                assert r.get("ifd0", {}).get("make") == MAKE, r

    @case("valid: describe() turns it into the row check_provenance reads")
    def _():
        d = intake_exif.describe(write(t, "row.heic", heic()))
        assert d["captured"] == "2026-11-14" and d["captured_at"] == "2026-11-14T10:30:00", d
        assert d["device"] == MAKE and d["suggest_verifiedBy"] == "paper-menu", d

    @case("valid: a big-endian TIFF block reads the same")
    def _():
        assert captured_of(write(t, "be.heic", heic(b"\0\0\0\0" + tiff(big=True)))) == WHEN

    @case("valid: the JPEG reader reads the same block")
    def _():
        r = intake_exif.read_jpeg_exif(write(t, "ok.jpg", jpeg()))
        assert r["exif"]["captured"] == WHEN and r["ifd0"]["make"] == MAKE, r

    @case("valid: a file whose items are not Exif answers {}")
    def _():
        assert intake_exif.read_heic_exif(write(t, "noexif.heic", heic().replace(b"Exif", b"hvc1"))) == {}

    # -- F8: extents and duplicate items --------------------------------------
    for n in (2, 3, 7):
        @case(f"F8: an Exif item split over {n} extents is read whole")
        def _(n=n):
            p = write(t, f"split{n}.heic", heic(split=n))
            assert captured_of(p) == WHEN, intake_exif.read_heic_exif(p)

    @case("F8: two different Exif items read as {}, not as the last one")
    def _():
        assert intake_exif.read_heic_exif(write(t, "twoexif.heic", heic(exif_ids=(1, 3)))) == {}

    @case("F8: one Exif id given two iloc entries reads as {}")
    def _():
        assert intake_exif.read_heic_exif(write(t, "dupiloc.heic", heic(dup_iloc_entry=True))) == {}

    @case("F8: 64 one-MiB extents of a tiny file read as {}, with no memory fan-out")
    def _():
        meta = fullbox(b"meta", 0, fullbox(b"iinf", 0, struct.pack(">H", 1) + infe(1, b"Exif"))
                       + iloc(1, [(1, [(0, 1 << 20)] * 64)]))
        assert intake_exif.read_heic_exif(write(t, "bigext.heic", FTYP + meta + box(b"mdat", b"\0" * 64))) == {}

    @case("F8: 2000 extents that each cover the whole file are refused, not joined")
    def _():
        import tracemalloc
        pad = b"\0" * 65536

        def meta_for(size):
            return fullbox(b"meta", 0, fullbox(b"iinf", 0, struct.pack(">H", 1) + infe(1, b"Exif"))
                           + iloc(1, [(1, [(0, size)] * 2000)]))
        size = len(FTYP) + len(meta_for(0)) + 8 + len(pad)
        p = write(t, "overlap.heic", FTYP + meta_for(size) + box(b"mdat", pad))
        assert p.stat().st_size == size
        tracemalloc.start()
        try:
            r = intake_exif.read_heic_exif(p)
            peak = tracemalloc.get_traced_memory()[1]
        finally:
            tracemalloc.stop()
        assert r == {}, r
        # Joined, the extents would be 2000 x 64 KiB = 128 MiB.
        assert peak < 16 << 20, f"peak {peak >> 20} MiB allocated for a {size >> 10} KiB file"

    # -- F5: hostile counts and walks -----------------------------------------
    for label, v, cnt in (("v2 0xFFFFFFFF", 2, 0xFFFFFFFF), ("v2 0x00FFFFFF", 2, 0x00FFFFFF),
                          ("v1 0xFFFF", 1, 0xFFFF)):
        @case(f"F5: iloc item_count {label} returns promptly")
        def _(v=v, cnt=cnt):
            assert intake_exif.read_heic_exif(write(t, f"cnt{v}.heic", heic(iloc_v=v, iloc_count=cnt))) == {}

    @case("F5: an extent_count of 0xFFFF returns promptly")
    def _():
        assert intake_exif.read_heic_exif(write(t, "extcnt.heic", heic(ext_count=0xFFFF))) == {}

    @case("F5: an IFD0 of 65535 pointers back at itself returns promptly")
    def _():
        r = intake_exif.read_heic_exif(write(t, "loop.heic", heic(b"\0\0\0\0" + loop_tiff())))
        assert not r.get("exif", {}).get("captured"), r

    @case("F5: the same loop inside a JPEG returns promptly")
    def _():
        r = intake_exif.read_jpeg_exif(write(t, "loop.jpg", jpeg(loop_tiff(4000))))
        assert not r.get("exif", {}).get("captured"), r

    @case("F5: 4000 pointers to 4000 different junk IFDs returns promptly")
    def _():
        r = intake_exif.read_heic_exif(write(t, "fan.heic", heic(b"\0\0\0\0" + fanout_tiff())))
        assert not r.get("exif", {}).get("captured"), r

    # -- F6: malformed input must not raise -----------------------------------
    for label, blob in (("HEIC", heic()), ("HEIC split in 3", heic(split=3)),
                        ("HEIC iloc v2/infe v3", heic(iloc_v=2, infe_v=3))):
        @case(f"F6: {label} cut at every byte offset never raises")
        def _(blob=blob):
            bad, p = [], t / "cut.heic"
            for n in range(len(blob) + 1):
                p.write_bytes(blob[:n])
                try:
                    assert isinstance(intake_exif.read_heic_exif(p), dict)
                    intake_exif.describe(p)
                except Exception as exc:
                    bad.append(f"{n}:{type(exc).__name__}")
            assert not bad, f"{len(bad)} of {len(blob) + 1} cut points raised: {bad[:6]}"

    @case("F6: a JPEG cut at every byte offset never raises")
    def _():
        blob, bad, p = jpeg(), [], t / "cut.jpg"
        for n in range(len(blob) + 1):
            p.write_bytes(blob[:n])
            try:
                assert isinstance(intake_exif.read_jpeg_exif(p), dict)
                intake_exif.describe(p)
            except Exception as exc:
                bad.append(f"{n}:{type(exc).__name__}")
        assert not bad, f"{len(bad)} of {len(blob) + 1} cut points raised: {bad[:6]}"

    @case("F6: a TIFF block shorter than its header is {}")
    def _():
        for blob in (b"", b"II", b"II*\x00", b"MM\x00*\x00\x00"):
            assert intake_exif._parse_tiff(blob) == {}, blob

    @case("F6: an empty file and a bare ftyp are {}")
    def _():
        assert intake_exif.read_heic_exif(write(t, "empty.heic", b"")) == {}
        assert intake_exif.read_heic_exif(write(t, "bare.heic", box(b"ftyp", b"heic" + b"\0" * 4))) == {}

    @case("F6: a size==1 box header with fewer than 16 bytes left is {}")
    def _():
        blob = box(b"ftyp", b"heic\0\0\0\0") + struct.pack(">I4s", 1, b"meta") + b"\0\0"
        assert intake_exif.read_heic_exif(write(t, "short64.heic", blob)) == {}

    @case("F6: DateTimeOriginal stored as a SHORT is ignored, not a TypeError")
    def _():
        p = write(t, "short.heic", heic(b"\0\0\0\0" + tiff(date_type=3)))
        assert "captured" not in intake_exif.read_heic_exif(p).get("exif", {})
        assert intake_exif.describe(p)["captured"] is None

    @case("F6: describe() on a vanished file reports it unreadable and returns a row")
    def _():
        d = intake_exif.describe(t / "gone.heic")
        assert d.get("unreadable") and d["captured"] is None, d

    @case("F6: one damaged file does not stop the run (CLI, --json)")
    def _():
        folder = t / "run"
        folder.mkdir()
        (folder / "a-good.heic").write_bytes(heic())
        (folder / "b-cut.heic").write_bytes(heic()[:90])
        (folder / "c-good.jpg").write_bytes(jpeg())
        r = subprocess.run([sys.executable, str(HERE / "intake_exif.py"), "--json", str(folder)],
                           capture_output=True, text=True, timeout=BUDGET_S * 2)
        assert r.returncode == 0, r.stderr[-300:]
        rows = {Path(x["file"]).name: x for x in json.loads(r.stdout)}
        assert sorted(rows) == ["a-good.heic", "b-cut.heic", "c-good.jpg"], sorted(rows)
        assert rows["a-good.heic"]["captured"] == "2026-11-14" and rows["b-cut.heic"]["captured"] is None
        assert rows["c-good.jpg"]["captured"] == "2026-11-14"

    # -- F9: the bytes choose the reader --------------------------------------
    for name in ("heic.jpg", "heic.png", "heic.tif", "heic.dat"):
        @case(f"F9: HEIC bytes named {name} are dated")
        def _(name=name):
            d = intake_exif.describe(write(t, name, heic()))
            assert d["captured"] == "2026-11-14", d

    for name in ("jpeg.heic", "jpeg.png", "jpeg.jpeg"):
        @case(f"F9: JPEG bytes named {name} are dated")
        def _(name=name):
            d = intake_exif.describe(write(t, name, jpeg()))
            assert d["captured"] == "2026-11-14" and d["device"] == MAKE, d

    @case("F9: PDF bytes named .jpg are read as a PDF")
    def _():
        d = intake_exif.describe(write(t, "pdf.jpg", pdf()))
        assert d["captured"] == "2026-01-02" and d["suggest_verifiedBy"] == "paper-menu", d

    @case("F9: bytes that are no known image, named .heic, are undated and quiet")
    def _():
        d = intake_exif.describe(write(t, "text.heic", b"just some words, not a photograph"))
        assert d["captured"] is None and d["suggest_verifiedBy"] is None, d

    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    with tempfile.TemporaryDirectory(prefix="faves-intake-exif-test-") as tmp:
        for name, fn in cases(tmp):
            check(name, fn, args.verbose)
    failed = [n for n, why in RESULTS if why]
    print(f"{'OK' if not failed else 'FAILED'} — {len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    from lib.tree import announce
    announce(HERE.parent)
    raise SystemExit(main())
