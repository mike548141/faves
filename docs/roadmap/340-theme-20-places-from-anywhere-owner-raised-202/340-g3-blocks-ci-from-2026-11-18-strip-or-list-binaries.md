- [x] 🔥 **G3 blocks this repo's CI from 2026-11-18: strip or list 93 binaries.**
      DUE 2026-11-18, firm. Filed 2026-11-09 by atelier queue run 722ac2e2.

      **What.** atelier's `leakscan` rule G3 gates personal data inside tracked
      binary files (image metadata: GPS location, device owner, dates). This
      repo runs atelier's floor at `floor.yml@main`, so it takes atelier's
      current rules at its next CI run. G3 has been warn-only under a grace
      period. **From 2026-11-18 every unlisted, or metadata-carrying, tracked
      binary BLOCKS this repo's hook and CI.**

      **Count.** 93 G3 findings measured 2026-11-09 (a finding is an unlisted
      binary or a metadata set it carries, so one image can count twice or
      more). Re-run the scan; the number moves with every image added.

      **The date is firm.** The principal's answer of 2026-11-08, to options a
      session offered, was that the date stays at 2026-11-18 for every child.
      That is an *answer*, not a standing ruling; do not cite it as one.

      **Two ways to clear a file** (the format and command are in atelier's
      tools README, § *Binary files (G3)*, in the atelier checkout):
      1. **Strip the metadata**, for example `exiftool -all= <file>` or
         re-export the image. Stripping changes the file's hash, so re-run.
      2. **List it in `.leakscanbinaries`** at the repo root: the first 16+ hex
         characters of its SHA-256, then the repo-relative path, with a reason,
         and a `<digest>:<set>  path` line (own reason) for each metadata set
         you want kept (`exif`, `icc`, `xmp`, ...). Since 2026-11-09 each line's
         comment also carries who allowed it and when:
         `by=<principal-ruled|principal-answer|agent> session=<id|human>
         on=<YYYY-MM-DD>`. `principal-ruled` is his own words,
         `principal-answer` a pick he made from your options, `agent` your own
         judgement; `session` is `$CLAUDE_CODE_SESSION_ID` or `human`. Old
         reason-only lines still load and warn; they never block.

      **An ignore glob no longer hides a tracked binary.** Since 2026-11-09 G3
      runs BEFORE `.leakscanignore` for tracked binaries, so a glob there does
      not clear one. Strip it or list it.

      **To list the findings.** From this repo's root, with `<atelier>` the
      sibling atelier checkout:
      `python3 <atelier>/tools/leakscan.py --root . .` (shows G3 as warnings
      until the date) and
      `python3 <atelier>/tools/leakscan.py --root . --binary-entries` (prints
      the manifest lines still needed, with `by=` pre-filled for a Claude
      session; it never writes the file). Check `--help` if either has moved.

      **Judgement for the session that takes this.** An image that *is* the
      repo's content may be listed, with a reason. An incidental screenshot or
      photo should be stripped. **Never list a file whose metadata identifies
      a third party without the principal.** Keep only the metadata sets a file
      needs (an `icc` colour profile can be a real need; GPS almost never is).

      **Supersedes the numbers in `340/330`** (50 unlisted binaries at
      2026-10-26; this repo is public, so a leaked tag here is published).
      Same job, firmer date and a fuller recipe; fold `330` into this one when
      you take it.

      **Done when** `leakscan.py --root . .` reports no G3 findings, the
      manifest is committed alongside any stripped files, and CI is green.

      ✅ **Done 2026-11-13** by an estate health sweep session (orchestrator
      session e820bff5), before the date. `.leakscanbinaries` lists all 50
      tracked binaries, each with a reason and `by=agent` (the session's own
      judgement, not the owner's): 7 icons, the share card, 1 recipe photo and
      41 dish photos. Nothing was stripped, so nothing under `site/` changed.
      Kept sets: the 456-byte sRGB `icc` profile on the 42 WebP photos (it
      carries no text), and three EXIF fields on the share card (colour space
      and pixel size), named at field level so the 2026-12-18 type-level cut
      does not reach them. Every file's metadata was read; four were viewed by
      eye, and each line says which. `leakscan --root .` then reported 0 G3
      findings. `330`'s open question (strip the `icc` profiles, or keep them)
      was not decided here: keeping is the no-change default, and `330` stays
      open for that call alone.
