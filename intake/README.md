# Intake — raw menus, board photos, and recipes

Drop source material here and I'll transcribe it into the JSON schema in
`docs/ARCHITECTURE.md`. **Nothing in this folder ships** — the raw files
are git-ignored and never copied into `site/`; only the structured JSON
they become gets committed.

## Where to put things

- `intake/menus/` — PDF menu scans and photos of menu boards.
  - Board photos: leave the **original files with their metadata intact**
    (don't screenshot or re-save them). The GPS + timestamp are what let
    each reading be *evidenced* rather than asserted — see below.
  - Folders per restaurant help, but aren't essential: photos get sorted
    by what they show, cross-checked against GPS. Loose files are fine.
- `intake/recipes/` — recipes exported from Apple Notes.
  - Apple Notes → select the notes → **Share / Export as PDF**, or copy
    the text into `.txt`/`.md` files, one recipe per file ideally.

## Provenance comes off the file, every time (ADR 0038)

**This runs before any transcribing, for every channel — photo, PDF,
website, anything:**

```sh
python3 tools/intake_exif.py --near intake/menus
```

It reads each file's own embedded metadata and prints what the evidence
supports:

| Reported | Where it comes from | What it decides |
|---|---|---|
| `captured` | EXIF `DateTimeOriginal` | the `verified` date |
| `lat`/`lng` | EXIF GPS | which venue, and evidence for `in-store` |
| `device` | EXIF make/model/software | first-party photo vs someone's screenshot |
| `edited` | a re-save after capture | lowers confidence in all of the above |
| `nearest` | GPS vs venue coordinates already in the data | sorts loose files |

**The file's modification date is never used.** Copying or syncing a photo
rewrites it, so dating a reading by it would claim a *fresher* check than
the evidence supports — the one direction of error that matters most.

Three things the tool deliberately does **not** do:

1. **It suggests a method; it never writes one.** A photo taken inside the
   shop is `in-store`; the same card photographed on a kitchen table is
   `paper-menu`, and only a human looking at the image can tell.
2. **GPS sorts, it doesn't pin.** Neighbouring shops land inside one
   phone-GPS error circle — four Johnsonville venues within 25 m on
   2026-08-15. Venue coordinates still come from the geocoded street
   address (`tools/audit_coords.py`).
3. **It doesn't outrank the picture.** What the board actually says wins
   over both the folder name and the GPS.

## What happens next

1. You drop files here and tell me the folder is ready.
2. I run the provenance report above and sort by what each photo shows.
3. I transcribe each into `site/data/restaurants/<id>.json`:
   - Menus → the venue's `menu` (sections, items, prices, and the
     allergen/dietary/heat tags — stated ones by hand, then
     `tools/tag_allergens.py --apply` for the high-confidence inferences,
     ADR 0025).
   - Recipes → `cook-at-home.json` (`serves`, `time`, `ingredients`,
     `steps`, tags).
4. **A refresh appends, it never overwrites** (ADR 0023). A changed price
   gains a dated entry beside the old one; a departed dish gains
   `available.offBy`; a renamed dish carries its history over. Only a
   *correction* — we recorded it wrong — overwrites.
5. `verified` + `verifiedBy` record the menu reading. If the source also
   established the venue's **details**, those get their own
   `detailsVerified` + `detailsVerifiedBy` (ADR 0037) — a takeaway card
   with the hours printed on it does; a board photo usually doesn't, and
   then the fields stay absent rather than borrowing the menu's credit.
6. `status` stays `menu-complete` (not `verified`) until you confirm
   prices are current.
7. **Anything ambiguous gets flagged, not guessed.** A handwritten price
   sticker that could be two different numbers is reported to you and
   left out — a missing price is recoverable, a wrong one isn't.
8. `python3 tools/validate.py` gates it; you eyeball; we commit.
