- [x] **Apply the author-side findings of the ADR 0169 / HEIC reader cold
      review: F5–F9** `[S][tools]` — filed 2026-11-23 by queue run f9ee6733
      from [`050`](050-cold-review-owed-adr-0169-and-the-heic-exif-reader.md),
      whose routing says they are *"the author's to apply (not the owner's)"*
      and *"Not yet filed as items"*.

  (claimed 2026-11-23-1419, session f9ee6733, worktree faves-qr-f9ee-heic)

  **The findings** (review
  `docs/reviews/2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`):
  F5 bound the `iloc` and IFD walks; F6 catch malformed input per file, as
  the docstring promises; F7 a fixture test for the HEIC reader; F8 read a
  multi-extent Exif item; F9 choose the reader by bytes, not by suffix. All in
  `tools/intake_exif.py` plus a test.
  **Not here:** F1 is the owner's (on 050). F2 asks for text in consequence 1
  of ADR 0169, which is accepted and so is never edited; it needs a
  superseding or amending record when stage 1 is briefed. The NOTEs (F3, F4,
  F10–F12) are left as the review records them.

  ✅ **Done 2026-11-23 (queue run f9ee6733).** All five findings were checked
  against the reader first and were real: each reproduced on `tools/intake_exif.py`
  as it stood, from fixtures built in the new `tools/test_intake_exif.py`
  (27 of 43 cases failed on the old reader, 43 of 43 pass now; none of the
  fixtures is a photograph or carries a location). Changed, per finding:
  - **F5** `iloc` counts are checked against the bytes left in the box before
    they drive a loop, and every field read is bounded by its own box (the old
    `take()` ran on past it). The three bounds are layered, so only removing
    all three brings the hang back; each was probed. The TIFF walk reads each
    IFD once (a `seen` set) and shares one budget of 4096 declared entries per
    parse, because a `seen` set alone leaves the fan-out to many different
    junk IFDs quadratic. The 0xFFFFFFFF `iloc` count and the 65535-pointer
    loop both timed out before; both answer in milliseconds now.
  - **F6** both readers return `{}` on malformed bytes, a tag is accepted only
    in its expected TIFF type (the SHORT `DateTimeOriginal` no longer reaches a
    regex), `_parse_tiff` refuses a block shorter than its header, and
    `describe()` returns a row with `unreadable` set for a file it cannot open.
    Before, 14 of 239 byte-offset truncations of one valid HEIC raised.
    I deliberately do not catch `TypeError` or `KeyError`: those would be a
    bug in this reader, and hiding one as "no EXIF" is how it goes wrong
    everywhere at once.
  - **F7** `tools/test_intake_exif.py`, stdlib only, in the verify list in
    `CLAUDE.md` and in CI. Break-probes: with the seen-set gone, 3 F5 cases
    time out; with the budget gone, the fan-out times out; with the type table
    gone, the SHORT case fails; with the extent join cut to the first extent,
    the 3 split cases fail; with the one-Exif-item rule gone, its case fails.
  - **F8** an Exif item over several extents is joined in order and read whole.
    More than one Exif item, or an item id declared twice in `iloc`, reads as
    `{}` rather than letting the last one win. Extents running past the file,
    or summing to more than the file, read as `{}`; without that cap, 2000
    extents of a 64 KiB file joined to 128 MiB (probed).
  - **F9** `describe()` takes the reader from `lib/imagemeta.sniff()` on the
    first 32 bytes. HEIC named `.jpg`, `.png`, `.tif` or nothing, JPEG named
    `.heic` or `.png`, and PDF named `.jpg` are all read now. The suffix is
    only a fallback where the bytes name nothing (a PDF with junk ahead of its
    header). With dispatch put back on the suffix, 7 cases fail.
  Not run on real files: `intake/` is empty in this worktree, so the reader's
  behaviour on the owner's photographs is unconfirmed beyond what
  `strip_exif.py --selftest` (31 of 31) and `check_provenance.py --selftest`
  (15 of 15) exercise. The one behaviour change a real file could show: a
  `.png` whose bytes are a JPEG (two exist in the products store) now reads
  as dated, which is the intent. Left alone as the review records them: F1,
  F2 and the NOTEs.
