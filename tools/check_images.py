#!/usr/bin/env python3
"""Refuse any tracked image that carries a location — or anything we cannot vouch for.

    python3 tools/check_images.py             # every image git tracks (CI)
    python3 tools/check_images.py --list      # …and a line per file
    python3 tools/check_images.py --staged    # the images staged for commit
    python3 tools/check_images.py PATH...     # these files
    python3 tools/check_images.py --selftest  # prove it still refuses (break-probes)

This repo is PUBLIC and a push is publication: an image committed once is
published for ever, because history cannot be edited after the fact and a
file deleted later is still in every clone (ADR 0128, roadmap 340/250). The
owner ruled on 2026-09-09 that evidence photographs WILL be committed, once
they are clean, and 72 of the 72 menu photographs measured on 2026-09-28 carry
a GPS IFD. So this gate stands between `tools/strip_exif.py` and `main`, and
it does not trust the stripper either: it reads every tracked image with
`tools/lib/imagemeta.py` and fails on ANY finding —

  location     a GPS IFD, an XMP packet or IPTC field naming a place, in the
               image, its thumbnail, or an image appended after it
  disallowed   any structure outside the allowlist, harmless or not
  malformed    bytes that are not what their format says (including a file
               whose extension names one image format and whose bytes are
               another — a `.png` that is really an iPhone JPEG)
  unsupported  a format this does not parse: HEIC/HEIF/AVIF, GIF, TIFF, BMP,
               JPEG XL, and PDF (which can embed a photograph with its own
               EXIF). A gate that passes a format it did not read has not
               checked it, so these fail until someone teaches the reader.

The allowlist and the reasoning for every item on it live in
`tools/lib/imagemeta.py`'s docstring, not here, so there is one copy of it.

WHY IT READS EVERY TRACKED FILE, NOT JUST ONES NAMED LIKE IMAGES. The format
is sniffed from the bytes. The extension is only used to catch a mismatch.

WHAT IT CANNOT SEE: a location that is legible IN THE PICTURE (a street
sign, a receipt, a letterbox), and an image embedded inside another file type
as text (a `data:` URI in HTML, CSS or JSON). Both are out of scope for a
metadata gate and are said so here rather than implied.

Stdlib only (ADR 0001) — it runs on CI's Ubuntu runner, where there is no
`sips`. Exit 0 = clean, 1 = a finding (or nothing to check), 2 = could not run.
"""

import argparse
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import imagemeta  # noqa: E402

IMAGE_EXT = {".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp", ".ico": "ico",
             ".svg": "svg", ".gif": "gif", ".heic": "heif", ".heif": "heif", ".avif": "heif",
             ".tif": "tiff", ".tiff": "tiff", ".bmp": "bmp", ".jxl": "jxl", ".pdf": "pdf"}


def check(name, data):
    """(format, findings) for one file, or None when it is not an image at all."""
    fmt = imagemeta.sniff(data)
    want = IMAGE_EXT.get(Path(name).suffix.lower())
    if fmt is None and want is None:
        return None
    findings = imagemeta.inspect(data, name) if fmt else []
    if want and fmt != want:
        findings.insert(0, imagemeta.Finding(
            imagemeta.MALFORMED, name,
            f"the name says {want}, the bytes say {fmt or 'not an image this reads'}"))
    return fmt or want, findings


def _git(*args):
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode(errors="replace").strip() or f"git {args[0]} failed")
    return r.stdout


def tracked():
    for raw in _git("ls-files", "-z").split(b"\0"):
        if raw:
            p = ROOT / raw.decode()
            if p.is_file():
                yield raw.decode(), p.read_bytes()


def staged():
    """The INDEX content of every added/changed path — what the commit will
    publish, which is not necessarily what is in the working tree."""
    for raw in _git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR").split(b"\0"):
        if raw:
            yield raw.decode(), _git("show", f":{raw.decode()}")


def run(items, listing=False):
    kinds, locations, failing, n = Counter(), 0, 0, 0
    for name, data in items:
        res = check(name, data)
        if res is None:
            continue
        fmt, findings = res
        n += 1
        kinds[fmt] += 1
        if findings:
            failing += 1
            loc = [f for f in findings if f.kind == imagemeta.LOCATION]
            locations += bool(loc)
            head = "LOCATION" if loc else "REFUSED "
            print(f"{head}  {name} ({fmt})")
            for f in sorted(findings, key=lambda f: f.kind != imagemeta.LOCATION)[:12]:
                print(f"    {f.kind}: {f.where}: {f.detail}")
            if len(findings) > 12:
                print(f"    … and {len(findings) - 12} more")
        elif listing:
            print(f"ok        {name} ({fmt})")
    formats = ", ".join(f"{v} {k}" for k, v in sorted(kinds.items()))
    print(f"{n} image(s) checked ({formats or 'none'}): {locations} carry a location, "
          f"{failing} refused in all.")
    return n, failing


# --- Self-test -----------------------------------------------------------------

def cases():
    """(name, bytes, expectation). Expectation: 'pass', 'refuse', or
    'location' (refused AND named as a location)."""
    from lib import image_fixtures as fx
    ico_png = fx.png(fx.png_exif(fx.tiff_with_gps()))
    import struct
    ico = (struct.pack("<HHH", 0, 1, 1) + struct.pack("<BBBBHHII", 1, 1, 0, 0, 1, 32, len(ico_png), 22)
           + ico_png)
    return [
        ("clean.jpg", fx.clean_jpeg(), "pass"),
        ("gps.jpg", fx.gps_jpeg(), "location"),
        ("xmp-location.jpg", fx.jpeg(fx.app1_xmp(fx.XMP_LOCATION)), "location"),
        ("thumbnail-gps.jpg", fx.thumbnail_gps_jpeg(), "location"),
        ("appended-gps.jpg", fx.trailing_gps_jpeg(), "location"),
        ("iptc-city.jpg", fx.jpeg(fx.app13_iptc_city()), "location"),
        ("comment.jpg", fx.jpeg(fx.com(b"hello")), "refuse"),
        ("mpf.jpg", fx.jpeg(fx.app2_mpf()), "refuse"),
        ("slack-in-exif.jpg", fx.jpeg(fx.app1_exif(fx.tiff_minimal() + b"hide")), "refuse"),
        ("clean.png", fx.png(), "pass"),
        ("og-shaped.png", fx.png(fx.png_exif(fx.tiff_benign())), "pass"),
        ("gps.png", fx.png(fx.png_exif(fx.tiff_with_gps())), "location"),
        ("xmp.png", fx.png(fx.png_xmp(fx.XMP_LOCATION)), "location"),
        ("text.png", fx.png(fx.png_text(b"Comment", b"hello")), "refuse"),
        ("clean.webp", fx.webp(), "pass"),
        ("icc.webp", fx.webp(fx._riff(b"ICCP", fx.icc()), flags=0x20), "pass"),
        ("private-icc.webp", fx.webp(fx._riff(b"ICCP", fx.icc(private=True)), flags=0x20), "refuse"),
        ("gps.webp", fx.webp_exif_gps(), "location"),
        ("xmp.webp", fx.webp_xmp_location(), "location"),
        ("gps-inside.ico", ico, "location"),
        ("clean.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>', "pass"),
        ("metadata.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><metadata>'
                         b'<geo:lat xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">0</geo:lat>'
                         b'</metadata></svg>', "location"),
        ("comment.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><!-- hi --></svg>', "refuse"),
        ("photo.heic", b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic" + b"\x00" * 64, "refuse"),
        ("menu.pdf", b"%PDF-1.4\n%fixture\n", "refuse"),
        ("really-a-jpeg.png", fx.clean_jpeg(), "refuse"),
    ]


def run_cases(quiet=False):
    results = []
    for name, data, want in cases():
        res = check(name, data)
        findings = res[1] if res else []
        refused = bool(findings)
        named = any(f.kind == imagemeta.LOCATION for f in findings)
        ok = (not refused) if want == "pass" else refused and (named or want == "refuse")
        results.append((name, want, ok, findings))
        if not quiet:
            print(f"{'PASS' if ok else 'FAIL'}  {name}: expected {want}"
                  + ("" if ok else f" — got {findings[:3]}"))
    return results


def selftest():
    main_results = run_cases()
    ok = all(r[2] for r in main_results)
    n_refusals = sum(1 for r in main_results if r[1] != "pass")
    n_location = sum(1 for r in main_results if r[1] == "location")
    print()

    real = imagemeta.inspect
    # BREAK-PROBE A: the detector switched off. Every refusal case must now
    # FAIL — if any still "passes", that case was not testing the detector.
    imagemeta.inspect = lambda data, where="": []
    try:
        blind = run_cases(quiet=True)
    finally:
        imagemeta.inspect = real
    failed = [r[0] for r in blind if not r[2]]
    # Of the refusal cases only the extension-mismatch one survives, because
    # it is decided here and not by the reader. Say so, not "all".
    expect_fail = n_refusals - 1
    probe_a = len(failed) == expect_fail and "really-a-jpeg.png" not in failed
    print(f"{'PASS' if probe_a else 'FAIL'}  BREAK-PROBE: with the reader disabled, "
          f"{len(failed)} of {n_refusals} refusal cases fail (expected {expect_fail}: all but "
          "the name/bytes mismatch, which this file decides itself)")

    # BREAK-PROBE B: location NAMING switched off, everything else intact.
    # The files must still be REFUSED — the allowlist is the guard and the
    # location label is only the urgency — and exactly the naming cases fail.
    imagemeta.inspect = lambda data, where="": [f for f in real(data, where)
                                                if f.kind != imagemeta.LOCATION]
    try:
        unnamed = run_cases(quiet=True)
    finally:
        imagemeta.inspect = real
    still_refused = all(bool(r[3]) for r in unnamed if r[1] != "pass")
    naming_failed = sum(1 for r in unnamed if not r[2])
    probe_b = still_refused and naming_failed == n_location
    print(f"{'PASS' if probe_b else 'FAIL'}  BREAK-PROBE: with location naming disabled, every "
          f"refusal case is STILL refused by the allowlist, and exactly the {n_location} "
          f"location-naming cases fail ({naming_failed})")

    total = len(main_results) + 2
    passed = sum(1 for r in main_results if r[2]) + probe_a + probe_b
    print(f"\ncheck_images selftest: {passed}/{total} passed")
    return 0 if ok and probe_a and probe_b else 1


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", help="check these files instead of the tracked tree")
    ap.add_argument("--staged", action="store_true", help="check the index content of staged paths")
    ap.add_argument("--list", action="store_true", help="print a line for every clean image too")
    ap.add_argument("--selftest", action="store_true", help="run synthetic cases and break-probes")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    try:
        if args.paths:
            items = ((p, Path(p).read_bytes()) for p in args.paths)
        elif args.staged:
            items = staged()
        else:
            items = tracked()
        n, failing = run(items, args.list)
    except (OSError, RuntimeError) as exc:
        print(f"check_images could not run: {exc}")
        return 2
    if n == 0 and not args.staged:
        print("no images found — a gate that read nothing has proved nothing.")
        return 1
    return 1 if failing else 0


if __name__ == "__main__":
    from lib.tree import announce
    announce(ROOT)
    raise SystemExit(main())
