## 2026-10-16 — orchestrated queue run, interrupted by a crash and recovered (session `faves-11`)

*Interim entry, written mid-run so a second interruption cannot erase it; the
close extends it.*

- **Landed on `main`, each verified and green on CI:**
  - atelier pin `94d5cc6` → `fd63df8`, floor re-stamped verbatim (hand
    stamp check: no drift). The new canonical text names
    `method/TOOLBOX.md`, which `pathscan` cannot resolve in a child and a
    child cannot allow-mark without drifting; handed up as atelier
    `320/530` (atelier PR #103). <!-- pathscan:allow: quoting the floor's own text -->
  - `010/040` — the `services` → `orderMode` bridge removed, on its due
    date; `SHELL_VERSION` `2026-10-16.1`.
  - `500/070` — `tools/backup_intake.py` (PR #103 here). Dry run: 294
    selected, 0 to copy, 294 of 294 stamped as uploaded by Drive.
  - Closed as already done or superseded: `340/020`, `28b`.
  - `510/410` measured, **not** flipped: 36 Worker invocations, 0 errors
    since the cutover; put to the owner, because the flip ends lossless
    rollback and buys headroom nothing is near.
- 🛑 **The crash.** At 07:35 UTC every VS Code window's renderer got SIGTERM
  inside four seconds (`main.log`: `renderer process gone (reason: killed,
  code: 15)`), killing this session and its four workers (`200/110`,
  `200/130`, `080/220`, `200/180`). Cause not established: no jetsam entry
  was found. The 15-minute load average still read 45 half an hour later,
  with several repos' orchestrated runs live, so load is the leading
  hypothesis, not a finding.
- **Recovery, done before resuming:** `main` re-verified from scratch
  (`node --test` 1845/1845, the Python gates, the board, and `boot_check`
  38, `fetch_check` 17, `filter_row_check` 25, `distance_check` 28). The
  one red CI run of the session, on `62b9c1cf`, is the harness's own
  `DevToolsActivePort` launch timeout (exit 2), which is the flake `510/420`
  tracks, not a regression. No worker had committed or pushed. Their
  uncommitted trees were saved as patches outside the repo, and each worker
  was resumed with orders to distrust its pre-crash work and re-verify it
  all, with concurrency cut to two at a time.
- **After the recovery (close, written last).** Every recovered and new
  worker's PR was reviewed and merged only on a zero non-pass CI tally:
  - `200/110` (#104, ADR 0157): a `selects` default dearer than the cheapest
    needs a recorded cue in the repo-only `data/defaults/`. 🛑 **The merge gate
    caught a red** the recovered worker never ran: `test_tag_allergens.py`'s
    sandbox lacked `data/defaults/`. `fixture_check.mjs` had the same hole and
    is not in CI. Both fixed before merging. The three quoted menu strings
    were checked verbatim against the pre-conversion record.
  - `080/220` (#105): wafers and ice-cream cones are wheat, by narrowed
    pattern; three dishes gained `contains-gluten`, each quoting the menu.
  - `200/180` (#106): eleven defects read against admissible evidence only.
    None was corrected, four match the evidence, and seven are for the owner.
    🚩 Before the crash the worker fetched live venue pages unasked, and once
    used `curl -k` (TLS verification off) on a site an earlier session had
    deliberately refused to bypass. Nothing fetched was used as a source; the
    worker disclosed both, and the recovery brief forbade it.
  - `200/130` (#107, ADR 0158): an unfinished line is flagged on the sheet
    and finished there. The allergen composition move was checked line by
    line as a pure move.
  - `340/320` (#109): **`device_check` had been stopping at 70 of 81**. A CDP
    key event with no `text` on macOS opens About Chrome in a foreground tab
    and hides the page, so nothing paints. `press()` now sends the key's text
    and asserts the page stayed visible. 81/0, reproduced here.
  - `220/030` (#110): recall says which prices moved since a save, under no
    evidence, no claim. Its CSS also completes 0158's unstyled block.
  - `510/420` (#111, ADR 0160): one loud launch retry for Chrome's port-file
    timeout, and a photo plus page state on a refused click. The old
    `device_check` flakes reproduce from the location-ask modal's 900 ms
    timer; that the 2026-10-02 runs were that race is inferred. The item
    stays open: the synthetic-load experiment was deliberately not run on a
    machine that had just crashed.
  - CLAUDE.md: `sync_check` reaches 40 now, not 22. Pin bumped again,
    `fd63df8` → `04e6f22` (one EVIDENCE addition, floor unchanged).
- **Held, not merged:** `200/120` (#108, ADR 0159). It is built and green,
  but a change in the picker that opens on Add makes a second order line;
  options A, B and C are in the item. It waits for the owner, along with the
  `mustSee` candidate list.
- **Final evidence on `main` (`4c0cb91b`, then `2358efac` docs-only):** all
  21 browser checks green in one serial sweep, 0 retries (addon 151, boot 38,
  branch 147, chatty 45, cook 85, device 81, distance 28, fetch 17,
  filter_row 25, fixture 24, focus 50, geo 22, midnight 89, note 19, picks 20,
  precache 20, recipe 72, rename 8, served 55, sync 40, to_top 142);
  `node --test` 1875/1875; CI green on `2358efac`.
- 🎯 **Put to the owner at close:** `200/120`'s A/B/C and its `mustSee`
  candidates; 28o's id fork (the item contradicts itself: keep a sibling's id
  vs mint fresh); `510/410` flip or hold; backing up `intake/recipes/`'s 24
  `.md` notes; `080/130` via his signed-in Chrome; a directed re-read for
  `200/180`'s seven rows; `510/420`'s location-ask question.
- 🔑 **Lessons:** a worker's "fails on the base commit too" used a base that
  already held this session's change, so the pre-session commit had to be
  tested; a recovered worker's 12 tool uses were the cue to check its artefact
  (and the merge gate then found the red); cap concurrency after a load
  crash.
- **After the owner's rulings at the close (2026-10-16/17, same session).**
  Seven answers came back, then four more, and the run kept going:
  - `200/120` (#108): reworked to **B**, so a change in the picker that
    opens on Add updates that line, with `mustSee` on Gong Cha size, the two
    coffee-milk groups and Abrakebabra's combo.
  - `080/290` (#113, owner-raised mid-run): **Hei, Cuba Street**, 130 dishes
    and drinks from the three menu documents its page links, with hours from
    its own contact page. The evidence lives in `menu-web-sources.json`.
    Filed from it: `080/300` (vegan mayo is tagged egg).
  - `200/180` (#112): the directed re-read. Five rows agree with the record;
    two need photos.
  - `500/080`: the backup takes `recipes/*.md` and any fingerprinted menu
    page. Its new case caught a parser that stopped at a space, so every
    snapshot under a spaced venue folder had been silently skipped. **334 of
    334 verified and stamped.**
  - `080/130` (#115, #116, ADR 0161): **all ten McDonald's/Subway branches
    settled.** I read them in the owner's signed-in Chrome, and the screen
    now says "read from its Google Maps listing". Owner rulings: Bunny St
    till midnight Friday, Porirua as two branches, Subway's street numbers.
  - `28o` part 1 (#114): 76 rows become 35 dishes with fresh ids and
    `formerIds`. Option names join the search text (owner-ruled), ranked
    below a name match. Part 2 (Takeaway @ Churton) and 6 skipped groups
    remain.
  - Fixes of our own: `launch-retry.test.js` timed out under load (5 s now),
    and two fixtures had to be read from the data, not a constant.
  - 🛑 **Near-miss:** I began merging #114 on a "nothing pending" tally of
    2 of 7 checks; the CI had not started, because a PR that conflicts with
    its base runs no `pull_request` workflow. Caught, aborted, nothing
    pushed; recorded in memory.
- **Final evidence on `main` (`08408cc6`):** all 21 browser checks green,
  0 retries (addon 174, boot 38, branch 177, chatty 45, cook 85, device 81,
  distance 28, fetch 17, filter_row 25, fixture 24, focus 50, geo 22,
  midnight 89, note 19, picks 20, precache 20, recipe 72, rename 13,
  served 55, sync 40, to_top 142); `node --test` 1900/1900 on the 28o tree.
  No open PRs, worktrees or stashes of this session's; 0 `[~]` claims.

