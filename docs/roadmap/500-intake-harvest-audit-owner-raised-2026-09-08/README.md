# Intake harvest audit — owner-raised 2026-09-08

**His question, verbatim:** *"Can you confirm if you have harvested all the info
(content, things you can infer, metadata incl EXIF etc) from the intake i.e.
recipes, menus and in particular ingredients. Noting that ingredients holds not
only photos of food/drink products but other file types like json files with
data on food that I have collected in the past"*

**The answer is no**, and the interesting part is *where* the gap is. The
pantry-product harvest of 2026-09-06 was thorough about products. What it
missed is that `intake/ingredients/raw_food_photos/` **is not all products** —
26 of its 183 images are recipes and a restaurant menu leaflet. The harvest
treated the folder as a pantry, so a whole content class was never looked for,
and every gate stayed green because no gate asks that question.

**The audit was read-only**, run 2026-09-08 by session faves-o1. Its figures
were reproduced rather than taken from a record: the 137-of-183 GPS count and
the 73 m × 51 m bounding box in ADR 0090 both verify exactly.

**Scale.** `intake/` holds **447 files, 1.75 GB**, gitignored at
`.gitignore:19` (`intake/**`); only `README.md` and two `.gitkeep`s are tracked.
