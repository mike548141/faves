- [x] **Add Hei, on Cuba Street, Wellington** `[M][data]` — owner-raised
  2026-10-16, mid-run to session `faves-11`:

  > *"I also want you to add the restaurant Hei on Cuba St in Wellington to
  > Faves. The menu is here https://hei.co.nz/menu/"*

  An owner-directed fetch of that menu, so the menu is in scope as he handed
  it over. A new venue file, its id in `site/data/index.json`, a no-JS
  fallback `<li>`, and the three generated files, per CLAUDE.md's lockstep
  rules.

  ✅ **Done 2026-10-16 (faves-11 worker).** `site/data/restaurants/hei.json`
  (id `hei`) added with its index entry, its no-JS fallback card and the three
  generated files; `SHELL_VERSION` 2026-10-16.7; CHANGELOG line. 130 dishes and
  drinks over 20 sections, read from the menu page's own three linked documents
  (dinner PDF dated 09.11.2025, drinks PDF 21.03.2026, lunch DOCX 26_03_2026)
  and nothing beyond them. Address, phone and hours from hei.co.nz's own
  contact page (`detailsVerifiedBy: official-site`); pin is a house-number-level
  Nominatim geocode of its street address. Evidence (the menu page, contact page
  and the three documents, with sha256) is recorded under `hei` in
  `data/intake/menu-sources.json`; the files themselves are in the primary
  checkout's gitignored `intake/menus/Hei/web/`.
  Left out or open: the venue's 15% public-holiday surcharge (no field holds
  it); the lunch set is "weekly special", so A to D are the four on the menu as
  read; the lunch and dinner menus price some dishes differently, so each is its
  own dish (`-lunch` ids). Verified: validate.py, test_validate.py
  (273 mutations), node --test (1875 pass), seed_*_ids --check,
  tag_allergens --explain --check, test_tag_notes, gen_summaries --check,
  check_fallback, check_provenance, check_precache,
  split_data --check, boot_check --id hei (38 passed, 0 failed).
  🚩 `check_provenance.py --intake <primary>/intake` reports DRIFT for the Hei
  folder (5 rows recorded, 2 scanned) because its scan reads only photo and
  PDF suffixes; fingerprints all verify, and the default (no intake) run is
  clean.
