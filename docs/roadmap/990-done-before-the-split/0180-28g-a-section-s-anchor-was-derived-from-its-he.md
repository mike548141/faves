- [x] **28g — a section's anchor was derived from its heading** `[M][schema]` —
  🔎 **found by 28f firing it, then owner-ruled and built**, ADR 0058
  (`2f0da85`). Renaming those eleven headings invalidated every deep link to
  them in the same commit, because the anchor was `slug(section.section)`. Same
  fault as ADR 0051 one level up, where the ruling was *"identity must be
  immutable"*.
  🎯 **The owner was given three options and took the most expensive one,
  against the recommendation** — record-the-finding was recommended; he chose
  the schema change. Do not re-propose deferring it.
  `sectionId` is now stored, immutable and unique per venue; `validate.py`
  refuses a duplicate (valid HTML that silently makes the second section
  unreachable) and a non-slug id; `tools/seed_section_ids.py` seeded 210 of 235
  sections with nothing moving on the day it ran.
