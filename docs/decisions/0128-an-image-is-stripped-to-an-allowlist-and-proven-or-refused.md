# 0128 — An image is stripped to an allowlist and proven clean, or refused

**Status:** accepted
**Date:** 2026-09-28

## Context

Roadmap `340/250`. The owner ruled on 2026-09-09 — *strip location, then
commit* — that the original evidence photographs are to live in this repo,
permanently, once they are clean. The repo is public, a push is publication,
and git history cannot be edited after the fact: an image committed once is in
every clone for ever. The item fixed the order — (1) a stripper with a refusal
path and a byte-level verification pass, (2) a gate, (3) a measured size
report, (4) only then the import — and named the shape: *strip-or-REFUSE, not
strip-and-hope*, with the image keeping **nothing** the repo does not need,
because the provenance it wants is already committed in
`data/intake/menu-sources.json` ([ADR 0107](0107-the-evidences-provenance-is-committed-and-the-evidence-is-not.md)).

Measured 2026-09-28 against the primary checkout's `intake/` (read in place,
nothing copied): 410 image-like files by their bytes — 378 JPEG, 25 PNG, 1
WebP, 2 HEIC, 4 PDF. **236 carry a location** (all 72 menu JPEGs, 163 of 285
ingredient JPEGs, 1 recipe JPEG; HEIC not parsed). The structures are wider
than GPS: 270 JPEGs carry an Apple MPF secondary image **after the end of the
primary one**, with its own metadata; 267 carry XMP; 62 carry a Photoshop/IPTC
block; 145 carry a colour profile with a private Apple tag (`aapy`). Four files
lie about their format in their name (two `.png` that are JPEGs, a `.webp`
that is a PNG, a `.txt` that is a WebP).

The 51 images already tracked (42 WebP, 7 PNG, 1 ICO, 1 SVG) were checked
first: **none carries a location**. `og-image.png` carries a 68-byte `eXIf`
holding only ColorSpace and pixel dimensions (the macOS screenshot shape).

## Decision

1. **One strict reader decides, and it is an allowlist.**
   `tools/lib/imagemeta.py` walks JPEG, PNG, WebP, ICO and SVG and reports
   every structure that is not on its list as a finding; formats it does not
   parse are findings too. Location is *named* where it can be (GPS IFD, XMP,
   IPTC, in the image, its thumbnail, or an appended image) but a file is clean
   only with **zero findings of any kind**. A raw signature sweep runs after
   the structural walk, so a mis-walked structure cannot hide an XMP packet,
   an IRB, an MPF index, a second `Exif` header or an embedded JPEG. The list:
   coded pixels; PNG rendering chunks; a thumbnail-free JFIF; Adobe APP14;
   EXIF of exactly Orientation (+ ColorSpace / PixelX / PixelY, one number
   each, every byte accounted for); a colour profile whose every tag is a
   standard colour tag with short printable text; plain SVG.
2. **The stripper writes a new file and proves it from disk.**
   `tools/strip_exif.py` copies the coded pixels verbatim, keeps Orientation
   and a sanitised colour profile, drops everything else, then re-reads the
   written file and refuses it (deleting the output, exit 1) unless: the
   verifier finds nothing; `intake_exif.py`'s older, separately written reader
   finds no GPS; the orientation matches; and the coded image is
   byte-identical to the original's. HEIC is refused unless `--transcode-heic`
   (macOS `sips`, lossy, fidelity not claimed). PDF is refused.
3. **Orientation is kept, not applied.** Applying it means a lossy re-encode,
   and the reason to keep evidence at all is that handwritten cabinet tags
   needed native resolution. One SHORT valued 1–8 cannot carry a place.
4. **A private colour-profile tag is removed, not the profile.**
   `sanitise_icc` drops the `aapy` entry, zeroes its bytes and the profile ID,
   and the verifier re-checks the result; a profile it still refuses is
   dropped (colour accuracy lost, evidence not).
5. **The gate is `tools/check_images.py`**, run in CI's `guard` job over every
   tracked file (sniffed by bytes; a name/bytes mismatch fails), with
   `--selftest` carrying break-probes. It reads the tree, so it cannot refuse
   an image *before* a direct push publishes it — that is the pre-commit
   hook's job, which is atelier's registry to change, so it is recommended
   there rather than wired here (`--staged` exists for it).

## Rejected

- **A GPS detector (denylist).** It answers "no GPS found" about a structure
  it cannot read — the MPF appended image is exactly that structure.
- **Proving fidelity by decoding.** Measured on IMG_7255: identical coded
  bytes decoded up to 8 levels apart per sample through `sips`, because
  macOS ImageIO picks a different JPEG decoder when Apple's JFIF carries its
  `AMPF` hint. The comparison would refuse every file for a reason not in the
  file. Byte identity of the coded segments is the stronger claim anyway.
- **Using `sips`/ImageIO to strip.** A tool that was called is not a proof;
  and the gate must run on CI's Ubuntu runner, where `sips` does not exist.
- **Keeping nothing, not even Orientation or colour.** Sideways evidence and
  dulled wide-gamut photos, to exclude two structures the verifier can account
  for byte by byte.
- **Copying `.leakscanignore`'s exemption precedent.** The item said not to:
  that exemption moved a guard into a tool; here the guard *is* the tool.

## Consequences

- Size, measured by `strip_exif.py --report` over all of `intake/`: see the
  report output, not this record — numbers written here go stale. On
  2026-09-28: 1,937.8 MB raw → 1,855.4 MB stripped (404 clean, 6 refused),
  ~1.84 GB of git objects, because JPEG neither compresses nor deltas.
  Stripping saves under 5%: the size question in `340/250` part (4) is not
  answered by stripping and remains the owner's.
- Not provable by any metadata tool: a location legible **in the picture**, and
  an image embedded as text (`data:` URI). Both need a human.
- Adding a format means teaching `imagemeta.py` to read it; until then it is
  refused, by design.
