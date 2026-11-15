# Held back — angles for the ADR 0169 and HEIC reader pass

For `2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`. **Open only
after your own findings are durably written in the brief** (`REVIEW.md`
rule 1). Then fold this in below the verdict and delete this file.

Written by the brief-writing session (Claude Opus 5.5, `980835bb`) from the
ADR, the reader's diff, the item and one comparison run. Hypotheses,
unproven; none was driven beyond the brief's re-run lines. Answer each:
confirmed, damaged, or already covered by your finding N.

**ADR 0169**

- **D1 — homes as branches and the absolute rule.** Stage 5 makes Cook at
  Home's private homes Branches, and a branch today carries an address.
  `CLAUDE.md` says no home address of a person, anywhere, absolutely. Does
  the ADR say how a home branch exists without one, or does it set up a
  stage that cannot be built as written?
- **D2 — a sighting is about a person.** "Seen there, when, on whose
  evidence" records who was where and when. Is that personal data under the
  hard constraints, and does it ship (ADR 0047), or belong in `data/` under
  ADR 0046's provenance rule? The ADR is silent.
- **D3 — the invariant against today's data.** "A Provider has at least one
  Branch and at least one Menu." Does every current record satisfy it: the
  recipe collection, an "Anywhere" branch (ADR 0155), a venue with no menu
  yet (the degenerate-state fixtures)? If not, C3 ("every file stays
  valid") and the invariant cannot both hold.
- **D4 — `formerIds` for a venue.** The consequence says folding Rock
  Yard's truck keeps every heart through `formerIds` (ADR 0153). Is that
  mechanism dish-scoped? Hearts on a venue, a branch id (ADR 0103) and
  deep links to the old venue id may have no such path.
- **D5 — "refines" while it contradicts.** ADR 0011 nests branches and
  shares one menu; ADR 0169 rejects exactly that and is accepted. Does
  "refines, neither superseded yet" leave two accepted records that disagree
  about the target, and which one does a session building today follow?
- **D6 — the date.** The ADR is dated 2026-11-15 (UTC) and quotes words
  dated 2026-11-16 (New Zealand time). Is that two conventions meeting, or
  a record that says it was accepted before the correction it quotes?
- **D7 — attributions.** Item 4 says "owner-ruled 2026-11-15" on
  `520/010`; item 7 "ruled 2026-09-08" on `470/050`; *Rejected* cites
  `520/010`'s option 3. Open each: is it the owner's ruling in his words, or
  an answer to options offered, and does the ADR carry it wider than it was
  given?

**The HEIC reader**

- **D8 — the oracle shares the parser.** C6 compared the HEIC read with a
  `sips` JPEG read through the same `_parse_tiff`/`_read_tiff`. If `sips`
  copies the EXIF block, agreement proves only that the box walk found the
  item, never that the dates are read right. Is there an oracle independent
  of this TIFF walk (`mdls`, `exiftool` if installed, Photos)?
- **D9 — only the first extent.** `extents[iid] = ext[0]`: an `Exif` item
  split across extents is read truncated. Does truncation return `{}`, raise,
  or return a partial dict with a date from the wrong place?
- **D10 — a misnamed file.** Dispatch is by suffix. `check_images.py` notes
  intake files whose names lie about their format. A JPEG named `.heic`
  returns `{}` (undated); a HEIC named `.jpg` goes to the JPEG reader. Is
  either silent, and what does `check_provenance.py` conclude from it?
- **D11 — hostile and malformed bytes.** Truncated boxes, `size` 0 or 1 at
  odd places, an `iloc` count larger than the box, a negative or huge TIFF
  header offset. `struct.unpack_from` raises on short buffers: does a crash
  surface loudly in every caller, and can any input loop or allocate
  without bound? Is there any test of this reader at all (none found by the
  brief-writer under `tests/` or `tools/test_*.py`)?
- **D12 — mirror sites.** `tools/strip_exif.py`'s header still says no
  stdlib HEIC reader exists and refuses HEIC by default. Now one exists in a
  sibling tool: is that header stale, and does `check_images.py` or
  `products.py` (which also reads intake photos) need the same reader or the
  same refusal?
