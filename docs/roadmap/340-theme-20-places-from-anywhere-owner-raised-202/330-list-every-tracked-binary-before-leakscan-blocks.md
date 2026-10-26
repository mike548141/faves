- [ ] 🚩 **List every tracked binary in `.leakscanbinaries` before leakscan
      starts blocking on 2026-11-18** `[M][tools]` — found 2026-10-26
      (session `6cdb3fe0`) reading the atelier delta at the pin bump to
      `0a2b7a7`.

  **What changed upstream.** atelier `020/150` (CHANGELOG, *Added
  2026-10-18 — leakscan gates binary files*): `leakscan` no longer skips a
  tracked binary in silence. Each one needs a line in `.leakscanbinaries` at
  the repo root matching its exact bytes by SHA-256 prefix, with a reason, and
  each metadata set it carries (`exif`, `icc`, `xmp`…) needs its own
  `<digest>:<set>` line whose reason is that set's own need. Until
  2026-11-18 the four findings print as warnings; **from 2026-11-18 they block
  the hook and CI like a leak**, and the date has no flag to move it.
  atelier `020/440` (2026-10-19) lets one reason name several sets.

  **Measured 2026-10-26 at `cb506d97`** with
  `python3 <atelier>/tools/leakscan.py --root . --binary-entries`: this repo
  has no `.leakscanbinaries`, and the tool prints **50 unlisted binaries**
  (41 under `site/img/mcdonalds/`, 7 under `site/icons/`, 1 under
  `site/img/cook-at-home/`, 1 at `site/`), carrying **42 `icc` sets and 1
  `exif` set** (`site/icons/og-image.png`).
  Re-run it rather than trusting these numbers; they move with every image
  added.

  **What the item owes.**
  1. Look at each file; strip every metadata set nothing needs, then re-run
     (stripping changes the hash). `tools/strip_exif.py` and
     `tools/check_images.py` (ADR 0128) are this repo's own instruments.
  2. Write a reason per file, and a need-specific reason per kept set.
  3. Commit `.leakscanbinaries`. Stripping a file under `site/` changes the
     shipped shell, so it bumps `SHELL_VERSION` (lockstep rule) and wants
     `check_precache.py` and `check_images.py` green.

  🎯 **One call the item cannot take alone:** whether to strip the 42 `icc`
  colour profiles or keep them with a reason. Stripping is the smaller
  record and usually renders the same for sRGB images; keeping avoids any
  colour shift on wide-gamut screens. Look at a stripped copy beside the
  original before deciding; if they differ visibly, that is the reason to
  keep the set.
