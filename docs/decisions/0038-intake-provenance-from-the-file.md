# 0038 — Intake provenance comes off the file, never off the import

**Status**: accepted
**Date**: 2026-08-15
**Builds on**: [0031](0031-verified-carries-its-derivation.md)

## Context

ADR 0031 made every reading carry *how* it was obtained. It did not say where
that answer comes from, and in practice it came from whoever was transcribing
— they knew the photos were theirs, taken at the counter, so they wrote
`in-store` and moved on. That works right up until it doesn't:

- The file's **mtime is not the reading date.** Copying a photo off a phone,
  syncing it, or moving it between folders rewrites mtime. Dating a reading by
  it silently claims a *fresher* check than the evidence supports — the exact
  direction of error the whole `verified` machinery exists to prevent.
- **Folder names are a guess.** The 2026-08-15 intake had 20 of 29 photos
  loose in `intake/menus/` with camera-default names, and the foldered ones
  were sorted by hand afterwards. A wrong folder silently attaches one shop's
  prices to another shop's record.
- **`in-store` was asserted, never evidenced.** It is the strongest method in
  the set and the one that suppresses the refresh caveat for a year. It
  deserved better than a habit.

The owner asked for this to be standing practice, 2026-08-15:

> *"Ensure you also use embedded metadata/EXIF and file data for things like
> the time and date the information was collected, by who (the principal/me),
> how (photo of menu onsite) GPS location details and anything else that is
> useful. Take note to do that everytime you import menus via any channel
> e.g. website, photo. PDF etc"*

## Decision

**Read the provenance off the source file before transcribing it**, with
`tools/intake_exif.py` — stdlib only, no `exiftool` dependency.

| Field | Source | What it settles |
|---|---|---|
| `verified` | EXIF `DateTimeOriginal` (+ `OffsetTimeOriginal`) | the day the shutter fired — **never** mtime |
| `verifiedBy` | GPS presence + camera make/model | GPS at a shopfront is *evidence* for `in-store`, not an assertion |
| which venue | GPS, cross-referenced against stored venue coordinates | sorts loose files without trusting filenames |
| confidence | IFD0 `DateTime` later than `DateTimeOriginal` | a re-save can strip or rewrite everything above |

For a PDF, the trailer's `/CreationDate` bounds the document's age from below
and the method is `paper-menu`. For a website, the method is `official-site`
and the date is the day it was read; there is nothing embedded to consult.

**Two limits, stated so they are not forgotten.**

*The tool suggests; the importer decides.* `suggest_verifiedBy` is a column in
a report. Nothing writes `verifiedBy` automatically. A photo of a laminated
card taken inside the shop is genuinely `in-store`; a photo of the same card
on someone's kitchen table is `paper-menu`, and only a human reading the
image can tell those apart.

*GPS sorts, it does not pin.* The 2026-08-15 batch put four different
Johnsonville Road venues inside a 25 m circle — that spread is the phone's
error, not real separation. It is ample to say "these photos are the
Johnsonville shops" and useless for saying which shopfront. Venue coordinates
keep coming from the geocoded street address (`tools/audit_coords.py`), whose
own audit rule already says a wrong pin is worse than an imprecise one. A new
venue whose street number we cannot evidence gets a street-level address and a
null coordinate, not a coordinate borrowed from where someone stood.

**Content still outranks both.** GPS and folder name are sorting aids; what
the photograph actually shows is the evidence. The 2026-08-15 import was
assigned by reading each board, then checked against GPS and folders — and the
loose 20 resolved to three venues that no filename would have revealed.

## Consequences

- Every import now starts with `python3 tools/intake_exif.py --near intake/menus`
  and the transcription follows the report. `intake/README.md` says so.
- **We can be caught out.** A date that came off EXIF can be checked against
  the file by anyone with the original; a date someone typed cannot. That is
  the point.
- The tool is dev-only and ships nothing into `site/` — the zero-dependency
  invariant (ADR 0001) is untouched, and `check_no_deps.py` still passes.
- **Stripped metadata degrades honestly**: a screenshot or a re-saved export
  has no `DateTimeOriginal`, the tool reports `(no date)`, and the importer
  must then establish the date some other way or leave `verified` null. The
  failure mode is a gap, never a confident wrong answer.
- GPS of a *venue* is a public fact about a business and already in the data.
  The tool prints what the file holds so the importer can judge; nothing
  beyond the venue-level date and method reaches `site/`. The
  no-personal-data rule (CLAUDE.md) binds here as everywhere.
