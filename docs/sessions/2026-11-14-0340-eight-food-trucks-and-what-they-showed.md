# 2026-11-14 0340 UTC — eight food trucks added, and what they showed the model

**Dispatched by** the owner, on the laptop (session `1bdd7eb4`): look at the
design to see whether the data or architecture needs extending for food trucks
and temporary sites, and add the trucks from his photographs taken that
afternoon. The design conversation itself had happened earlier the same day in
a cloud session, which filed Theme 40 on branch
`claude/eloquent-archimedes-wlr13d` as PR #134 (unmerged when this began).

## What changed

- **PR #134's two commits are carried in** (this branch was cut from its head)
  after running the half of its checks the cloud session could not: `leakscan
  --require-terms` over its seven files and `namescan --require-terms` over its
  range, both clean on this machine with the private term list present. That
  closes the "term half ran nowhere" gap its own session record names.
- **Eight venue records** in `site/data/restaurants/`, ids in `index.json`, the
  no-JS fallback `<li>`s in `site/index.html` (so `SHELL_VERSION` →
  `2026-11-14.1`), summaries regenerated: `yalla-fried-chicken`,
  `nonys-coffee-and-gelato`, `rock-yard-food-truck`, `taj-on-wheels`,
  `ah-mas-kitchen`, `garuda-truck`, `baxters-catering`, `ngon-spot`. 67 dishes.
  Stated tags by hand from the boards (halal, v, vg, gf, df and their
  `-option`s); `tag_allergens.py --apply` then added 41 inferred allergen tags,
  all in these eight files, and `--explain --apply` their tips.
- **Provenance:** 19 menu photographs filed into eight `intake/menus/` folders
  (gitignored), mapped by hand in `data/intake/menu-sources.json` and rebuilt.
  All eight venues read `ok` against same-day captures.
- **`tools/intake_exif.py` reads HEIC.** It listed `.heic` as intake and read
  nothing from it, so the first rebuild called all eight "unbounded". The EXIF
  item is found through `meta`/`iinf`/`iloc`; the TIFF walk is shared with the
  JPEG path. Verified on all 19 files against macOS's own HEIC→JPEG
  conversion: capture date, time, offset, device and GPS identical. Before the
  change the same files returned no date — that is the break-probe.
- **Board:** new item `520/040` (the evidence table from the eight trucks, two
  model gaps, three owner calls); Theme 40's README marks "which real venues"
  answered for trucks. `ROADMAP.md` rebuilt.
- **CHANGELOG** line under Unreleased.

## Judgement calls, stated

- **Where the photos came from.** Not `intake/`: the owner said "my photos from
  today", so they were read from the Photos library's own database (a copy in
  the scratchpad) by capture date. 59 photographs and 2 videos that day; 19 are
  menus, the rest are not and were not used. 31 of the 59 were not
  downloaded locally (iCloud-optimised); all 19 menu shots were full originals.
  Nothing was opened in the Photos app.
- **No hours, anywhere.** One photograph is a sighting, not a timetable;
  `010`'s option 1 with a Saturday-only week would have invented a schedule.
- **Coordinates from the park, never the photos** (the ADR 0038 rule): one
  Nominatim lookup for "Frank Kitts Park, Wellington".
- **Rock Yard's truck is its own record**, not a branch of
  `rock-yard-restaurant`: its menu is shorter and priced differently, and a
  branch shares its venue's menu (ADR 0011). Put to the owner as `040` gap 2.
- **Two prices left `null` with a `needs` note**, because the truck showed two
  on the same day: Rock Yard roti rolls ($14 board, $13 counter card) and Taj's
  chicken tikka wrap ($18 and $20 on two A-frames). One allergen conflict
  recorded as the weaker claim: Rock Yard's fried rice (board "gluten free",
  counter "GF optional") is `gf-option` with a `needs: allergens` note.
- **Garuda's banner** ("Halal | Gluten Free | Dairy Free | Vegan") names no
  dish. Only halal is carried on every dish (the halal mark is also at the
  order window); GF/DF/vegan are left to the dish cards, and a section note
  says so. The tagger's inferred `contains-gluten` (sweet soya sauce) stands,
  which over-warns in the safe direction.
- **Nony's** shows only a gelato-tub poster with flavours and no price: one
  dish, `price: null` with a `needs` note, and a section note that its coffee
  menu was not photographed.
- **Garuda's phone number is not recorded**: the banner's digits are too faded
  to read with confidence.
- **"Mogu2" written as "Mogu Mogu"**, the drink the shorthand names.
- **No "Food truck" vibe added** — `vibes.js` is a closed vocabulary (ADR
  0084), so that is put to the owner as `040` call 3.

## Verification

Run in this worktree after the last data edit: `validate.py` (66 valid),
`seed_*_ids.py --check` ×4, `gen_summaries.mjs --check`, `check_fallback.py`,
`check_provenance.py` and `--selftest` (15/15), `tag_allergens.py --explain
--check`, `strip_exif.py --selftest` (31/31, because it imports
`intake_exif`), `node --test` (2016 pass), `boot_check.mjs` (38/38),
`test_validate.py` (352 mutations), `check_no_deps`, `gen_sbom --check`,
`check_visibility`, `check_precache`, `check_decisions`, `split_data
--check`, `check_records`, `check_images`, `test_tag_allergens`,
`test_tag_notes`, `recipe_estimates --check`, `fetch_fx --check`,
`check_versions --range origin/main..HEAD`, and three browser checks the data
could move: `distance_check` (28/28; eight venues share one coordinate),
`focus_check` (50/50), `addon_check` (216/216; two new required filling
groups). Both truck menu pages were also looked at in headless Chrome at
390 px. The CI result is under *Landed*.

## Landed

(filled in at merge)
