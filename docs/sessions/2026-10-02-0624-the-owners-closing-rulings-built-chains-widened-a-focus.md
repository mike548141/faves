## 2026-10-02 — the owner's closing rulings built, chains widened, a focus bug found twice (session `faves-77`)

An orchestrated queue run (CONCURRENCY § *Orchestrated queue runs*) on Opus,
workers on Sonnet. Session id `6716bbef-2a69-4b21-9692-68034652b2ef`.

- **Pin bumped** `86da02c` → `94d5cc6`: one atelier commit, a board item
  (`420`, when to ask) touching no doctrine; stamp hand-check clean.
- **Shipped (PRs #93–#98, every merge gated on zero non-pass checks, CI 8
  of 8 each):**
  - `010/010` (#93): the venue field `services` is `orderMode`, with a
    two-sided one-release bridge (generator mirror + `readOrderMode`),
    break-probed. Search note reads "Matched: dining" (changed at review
    from the worker's "order mode", a term nothing on screen uses).
    Removal filed as `010/040`, on or after 2026-10-16.
  - `510/430` (#94): a banner on every screen while sync waits for an
    answer; in flow, never fixed; announced only when it appears mid-page.
  - `230/020` (#95, new): closing Settings stranded focus on `<body>` on
    every page and every close path (18 of 18, measured). Found while
    reviewing #94, where the same fault had a narrower fix; now one
    `openSheet()` parks focus on ⋯ before `showModal()`. `device_check`
    69 → 81, break-probed (12 fail without the fix).
  - `28n` (#97): 82 unlabelled size rungs at four venues become choices,
    per the owner's ruling; closed.
  - `080/120` (#96): Pizza Hut 1 → 15 branches, BurgerFuel 4 → 9, Gong Cha
    1 → 3, Hell Pizza 14 → 15, each with address, OSM pin, phone and hours
    from the chain's own site or API. Still open for Noodle Canteen (no
    per-store hours) and two refused stores.
  - `14b` batch two (#98): 39 named choices on 16 venues become add-on
    groups; eight option tags added by hand from the menus' own words.
- **`340/310` parts 2–3 done:** 294 originals copied to the owner's Drive
  and verified (294/294 equal to source, 89/89 committed fingerprints, and
  294/294 uploaded by Drive's own item-id stamp, three cross-checked through
  the API). The transcript's 105 saved-page images were excluded by an
  allow-list. 🛑 **Part 4's `rm -rf evidence-stripped/` was refused by the
  permission system and not routed around** — owed to the owner.
- **Post-merge sweep of all 21 browser checks on `main` (`58a73d8`):** 20
  green; `device_check` stopped on an unstable `#favourites-toggle`, then
  passed 81/0 on the very next run. Recorded on `510/420` with the day's
  other `device_check` flake.
- **Filed:** `010/040` (bridge removal), `230/020` (closed), `200/090` (a
  required "choice of" still offers None; a schema question).
- 🚩 **Honesty notes.** A worker `pkill`ed a duplicate test run and took its
  own background jobs with it (rerun; no harm seen to the others). The
  chain worker's Sushi Bi "Saturday" discrepancy was checked and the site
  contradicts itself, so the record is unchanged.
- **Stopped because** the queue holds nothing more buildable without the
  owner: every remaining open item waits on a ruling, a standing re-check,
  or a date (`410` mirror off from 2026-10-09; `010/040` from 2026-10-16).
- **Allergen hole closed (`dc4c0b1`):** the Ramen Shop curry bowl offered
  "ebi" with no shellfish tag, before and after #98; the same menu calls ebi
  katsu "prawn katsu", so the option now carries `contains-shellfish`.
- **Open with the owner (put at the close):** delete `evidence-stripped/`;
  `200/090` required choices;
  `080/130` McDonald's and Subway hours (an interactive browser may now
  make option (b) cheap).

### Addendum, 2026-10-03 (session `faves-77`): three rulings, two more items

- **Owner ruled at the close** (AskUserQuestion): he deletes
  `evidence-stripped/` himself; `200/090` option (a), a `required` flag;
  `080/130` option (b), then — asked again at his request — option (c),
  Google Maps named as the source, for hours only on McDonald's and Subway.
- **Shipped:** `200/090` (#100, ADR 0156): 33 groups on 19 venues are
  required; no None, Add waits, the reason is in words; recalling a saved
  order that now lacks a compulsory choice skips that line and says so.
  Four groups were left optional as unsure and are listed on the item.
- **`080/130` wrote nothing (#99, note only):** an unauthenticated browser
  gets Maps' limited view, today's line only, for all ten branches; Google
  Search refused automated traffic. The ruling stands, waiting on a
  browser Maps shows the full week to. 🚩 The listings read McDonald's
  Courtenay Place permanently closed and Lambton Quay temporarily closed;
  two Subway street numbers differ from ours. Not acted on.
- **All 21 browser checks green on `main` after #100**, plus CI 8 of 8 on
  every merge. No worktrees, branches or claims left.
- **Then ruled: trust Google Maps for closures too** (these two chains).
  McDonald's Lambton Quay now carries `closed-temporarily` (`f3bb2d7`),
  matched by phone as well as address. Courtenay Place is NOT closed: the
  *permanently closed* listing is a different store in Courtenay Central.
  Not checked visually; `branch_check`, `boot_check`, `distance_check` green.

