# 2026-11-21 0526 UTC — one family name neutralised, and a re-sweep since August

**Dispatched by** the docker-heap queue run (session 346cea8d), headless, on
the owner's answer of 2026-11-21, verbatim: *"Neutralise and re-sweep faves"*.
The option he picked was one line changed to a neutral name, plus a check of
every faves doc written since August for other family names that slipped back
in. Session 45386cdd, primary checkout, no peer live in faves (`cclive`).

**The standing ruling** is the owner's of 2026-08-06, recorded in
`docs/reviews/2026-07-28-1138-family-texture-review.md` § Rulings: live docs
take neutral names (Alex, Sam, Jo), closed records keep their text, test
fixtures carry no family names, and there is no history rewrite. The approved
attributions in site data (the recipe-title attributions and two friends'
first names) stay, and `site/` was not touched.

## What changed

| Commit | What |
|---|---|
| `c6b4e222` | claimed 510/300 on the board |
| this session's close commit | item 510/300: the example user, a family first name, became "Sam"; three test files: a family first name used as a profile fixture became "Alex" (10 lines); the claim released |

`node --test` on the three test files read 130 pass, 0 fail.

## The sweep

**Method.** Every file `git log --since=2026-08-06 --name-only` lists that
still exists, minus `site/` (1,058 files), searched with `git grep -w` for the
four family first names and the one surname the task named. 54 hits, all on
two of the first names. The other two first names and the surname returned
none.

| Bucket | Hits | Disposition |
|---|---|---|
| Live, fixed | 11 | 510/300 line 63 (1); a family first name used as a fixture profile in `tests/sync-merge.test.js` (7), `tests/sync.test.js` (2), `tests/shopping.test.js` (1) |
| Closed record, left | 29 | the family-texture review (10), `990-done-before-the-split` (5), archived session files (7), ADR 0070 (3), and done items 460/030 (1), 500/040 (1), 510/050 (2) |
| Approved recipe title, live, left | 9 | the dish whose approved title carries a family attribution, named in `CHANGELOG.md`, `CLAUDE.md` (the approved exception itself), `data/estimates/README.md` (3), the theme 11 README, and comments in `tests/cook.test.js`, `tools/cook_check.mjs`, `tools/move_recipes.mjs` |
| Product data, left | 3 | `data/estimates/recipes.json`, `data/history/dishes/cook-at-home.json` (2): the same title |
| Functional, left | 2 | `tools/intake_index.py` REDACTIONS keys. They match the exact string the private food export carries, so renaming them would stop the redaction |

**Why the title references were left.** The title is the approved attribution
(`CLAUDE.md` exception 1) and a document naming the dish has to use its real
title, or it misdescribes the data. This is a reading of the ruling, not a new
ruling. 🎯 If the owner wants those 9 doc and comment mentions neutralised
too, they would then name a dish differently from the data.

**What slipped back.** Only the three test files. The 2026-08-06 rename
(`ea4ccde`) cleared `tests/`, and the name came back in sync and shopping
tests written afterwards (2026-08-16 to 2026-09-28). No live doc other than
510/300 carried a family first name used as a person.

**Scope.** The names were searched as whole words,
case-sensitive, in files changed since the date. A file untouched since before
2026-08-06 was not searched, and neither was a variant spelling.

## Not done here

The floor pin (`2a6d7a4`) is 259 commits behind atelier `origin/main`. The
bump is its own session's work and was not started.
