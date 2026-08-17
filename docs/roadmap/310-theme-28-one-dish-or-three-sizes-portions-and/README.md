# Theme 28 — one dish or three? sizes, portions and conditional prices (owner-raised 2026-08-16)

<!-- Numbered 28: 25/26/27 were taken by parallel sessions. Checked with
     `grep '^## Theme' ROADMAP.md` at write, per the note on Theme 19. -->

**The ask, raw (owner):** *"$28 (Mains), $21 (Gold Card) should be one dish… a
discount offered for gold card. However the $15 (Kids) dish is very likely
actually a different dish… Perhaps on each dish we could have (a) a serving
size e.g. kids vs adults, and (b) discounts available by dish, by menu, by
branch or restaurant chain?"*

🔎 **Measured before answering, and the measurement changes the answer.**

**The Gold Card rows are not a discount — they are a smaller dish.** Four of
the seven say exactly `"Gold Card portion."` and nothing else; the Sirloin says
`"150g."` against the Mains row's `"230g cooked to your liking"`. The price
ratios run 66%–79%, not one percentage — consistent with re-portioning, not a
card discount. Calling it a discount would tell a reader they get the 230g
steak for $27.

**There are no discounts in the corpus at all.** Across all 48 records: zero
occurrences of `%` off, `$X off`, "discount", "happy hour", "early bird",
"senior", "student", "member", "loyalty", or any dine-in/takeaway price
difference. The word "discount" does not appear once. A discount model would
be invented rather than observed — and the standing rule from 2026-08-16 is
that scope comes from what the owner hands over, not from a taxonomy drawn in
advance.

**The real pattern is size, and it is 13× bigger than the Gold Card case.**
- **41 variant groups · 96 rows · 13 venues** where a name collides exactly or
  near-exactly at a different price.
- **81 rows · 5 venues** carry a *second price inside the `desc` string* —
  **153 discrete price points** with nowhere to live, because `item.price` is a
  scalar. `"Regular $17.00; large $25.00; bottle $73.00."`
- **72 of those 81 are drinks** — wine by glass/bottle, beer pours, coffee cup
  sizes. This is overwhelmingly a *drinks* problem that food happens to share.
- Deduplicated, a size dimension touches **~210–230 of 1,755 rows (12–13%)**,
  ~70% of it in five venues.

🚩 **Collapsing on name would be actively wrong for 29 of those 96 rows.**
- `Heineken` at The Borough is on-tap 5% $15, bottle 5% $11, **and `Heineken
  0.0` alcohol-free $10**. A size ladder merges an alcohol-free drink into a
  beer.
- `sushi-bi`'s `Sushi Platter 1`–`9` are nine different compositions at
  $70–$90, not a ladder. Hell's `Splatter Platter 1` and `2` are **the same
  price** with different contents.
- Only **33 of 96 rows** collapse cleanly (pure quantity, no divergence).

🚩 **And the tags would not survive it.** 11 of the 41 groups carry divergent
allergen tags, and **5 have an empty intersection** — there is no safe tag to
keep. Union-merging would wrongly put `contains-shellfish` on two Sushi Bi
platters; intersection-merging would strip it off three rows that really do
contain shellfish.

**What that leaves.**

- ✅ **28c — a section's serving window** — **done 2026-08-16**, [ADR 0081](../../decisions/0081-a-serving-window-annotates-it-never-filters.md).
  `served` on a section, in the shape of a venue's `hours`; it **annotates,
  it never filters**, because a filtered section breaks a link someone was
  *sent* as a function of the clock. Full write-up, including the two
  decorative assertions found inside the new check itself, in
  [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **28d, 28f, 28g — the section heading, its qualifier and its identity** —
  **done 2026-08-16** (`82ddb4b`, `b391f1b`, `2f0da85`), ADRs 0057 and 0058.
  The qualifier came out of eleven headings into a `note`; the anchor stopped
  being derived from the heading and became a stored `sectionId`. Full write-up,
  including the owner ruling that went against the recommendation, in
  [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).
- ✅ **28g-tail — the last 25 sections, and the field made required** —
  **done 2026-08-16.** The six files landed (`9cae14e`), the seed finished the
  job — burgerfuel 9, hell-pizza 11, noodle-canteen 5 — and `validate.py` now
  **requires** `sectionId`. Every section carries its own id;
  `seed_section_ids.py --check` is in the CLAUDE.md verify list. Proved by
  breaking it: a section with its id removed is refused (79 mutations).
  ⚠️ **This line said "All 235 sections" until 2026-08-17, when the corpus held
  374** — the menu fetch added 139 sections and the hand-typed tally did not
  follow. The number is **removed rather than corrected**, because the claim
  that matters ("every section, no exceptions") is the one the gate actually
  enforces, and a count re-typed here goes stale on the next intake exactly as
  this one did. Derive it if you need it — the same lesson as the stub count,
  which went stale three times before its heading dropped its number too.
