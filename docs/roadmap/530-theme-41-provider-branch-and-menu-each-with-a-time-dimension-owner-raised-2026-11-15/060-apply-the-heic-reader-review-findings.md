- [~] **Apply the author-side findings of the ADR 0169 / HEIC reader cold
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
