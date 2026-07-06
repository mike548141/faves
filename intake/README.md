# Intake — raw menus, board photos, and recipes

Drop source material here and I'll transcribe it into the JSON schema in
`docs/ARCHITECTURE.md`. **Nothing in this folder ships** — the raw files
are git-ignored and never copied into `site/`; only the structured JSON
they become gets committed.

## Where to put things

- `intake/menus/` — PDF menu scans and photos of menu boards.
  - Board photos: leave the **original files with their metadata intact**
    (don't screenshot or re-save them). The GPS + timestamp let me match
    each board to the right venue and stamp an honest "as seen on" date —
    extracted with `mdls`/`sips`, no extra tools needed.
  - Name files loosely if you can (e.g. `spices-indian-board.jpg`), but
    it's not essential — geotags do most of the sorting.
- `intake/recipes/` — recipes exported from Apple Notes.
  - Apple Notes → select the notes → **Share / Export as PDF**, or copy
    the text into `.txt`/`.md` files, one recipe per file ideally.

## What happens next

1. You drop files here and tell me the folder is ready.
2. I transcribe each into `site/data/restaurants/<id>.json`:
   - Menus → the venue's `menu` (sections, items, prices, and only the
     allergen/dietary/heat tags the menu actually states).
   - Recipes → `cook-at-home.json` (`serves`, `time`, `ingredients`,
     `steps`, tags).
3. Prices may be dated: I capture what's on the scan, set `verified` to
   the photo/scan date, and keep `status: "menu-complete"` (not
   `verified`) until you confirm prices are current. Anything ambiguous
   gets flagged, not guessed.
4. `python3 tools/validate.py` gates it; you eyeball; we commit.
