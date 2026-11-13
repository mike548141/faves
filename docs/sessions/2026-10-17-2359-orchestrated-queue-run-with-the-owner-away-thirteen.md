## 2026-10-18 — orchestrated queue run with the owner away: thirteen items landed (session `faves-b4`)

*Interim entry, written before the close so an interruption cannot erase it;
the close extends it.*

- **Open.** Tier stated, not asked: Opus 5.5 orchestrating, Sonnet workers.
  atelier pin `04e6f22` → `b2c53da` (3 method files moved; floor unchanged,
  hand stamp check clean). The delta's session-open prompt regresses the
  2026-09-19 tier ruling; already on atelier's board as `320/670`, so
  nothing was owed upstream. Two read-only triage agents classified all 87
  open items (A agent-doable · B owner ruling · C idea-only · D waiting ·
  E owner material · F stale).
- **Landed on `main`, each through a PR whose CI was 8 of 8 green at its head:**
  - `28r` (#117) — the intake rule for sizes and choices in ARCHITECTURE.md;
    its four unanswered cases filed for the owner as `28t` (`310/170`).
  - `28o` part 2 (#118) — Churton's Bacon & Avo merged; 28o **closed**: 36 of
    44 mechanical groups merged, the 8 left each need a ruling.
  - `37n` (#119) — the sausage vetoes narrow the match, not the row; the
    report is byte-identical (all three rows already carried gluten).
  - `17a` (#120, ADR 0162) — serves and yield shown labelled, and a
    serve-N-people stepper; follow-ups filed as `250/060`.
  - `510/420` bullet 1 (#121) — home-page checks start with the location ask
    answered; break-probe: a 1.8 s late click fails unseeded, passes seeded.
  - `080/300` (#122) — vegan mayo no longer read as egg; Hei's two rows keep
    `contains-egg` pending the owner.
  - `330/030` (#123) — hours from their own sites for three guidebook stubs.
  - `200/140` (#124, ADR 0163) — a group can ask for N picks and charge for
    extras.
  - `32a` + `32d` (#125, ADR 0164) — the per-person activity log, in the
    backup and the wipes, never synced.
  - `33a` (#126, ADR 0165) — six venues' own booking links; withheld ones
    filed as `33e` (`400/050`).
  - `200/170` (#127, ADR 0166) — minimum orders and per-unit prices; 21
    dishes; multi-buy filed as `200/190`.
  - `180/010` (#128, ADR 0167) — "Delete everything", the second Reset the
    owner ruled on 2026-08-16 and no item carried (found while closing 32d),
    propagated by sync with a deletion marker.
  - Board hygiene inline: `28j` closed (built and its last fork ruled);
    `26b` found to be an owner call (ADR 0154 kept saved orders off sync on
    purpose); the v2 sync item's self-contradiction reconciled (the passkey
    path is all that is unbuilt).
- 🔎 **Caught at the gates, not by the workers:** my 28o brief repeated the
  item's stale "re-key the price history" sentence, which ADR 0153 rejects —
  the 28r worker found it from sources and the 28o worker was corrected
  before it acted; #126 failed CI because `test_tag_allergens`' partial-corpus
  harness lacked the new `data/bookings/` store (fixed on the branch); #125
  ran no CI at all while it conflicted with main; and a gate polled straight
  after a push read the previous head's red.
- 🚩 **Load.** The 1-minute load reached 209 with four workers plus other
  repos' suites; peer `shed-d7` asked for at most two concurrent heavy runs
  under `nice`. Workers were throttled (15-minute load under 40), dispatch
  held, and the rule saved to memory.
- **After the interim entry (close, written last).**
  - `200/160` part 1 (#129, ADR 0168) — four swaps name what they replace;
    allergens still union in (`tests/swap.test.js` fails if a swap ever
    removes one). Item left open, 🎯 for the owner's call on removal.
  - Owner instruction mid-run: *"Dont claim any new work this session but
    do finish everything you have claimed."* Nothing was claimed after it.
  - **Full browser sweep on `main` at `94138b89`** (the 21 checks CI does not
    run), one at a time under `nice`: all green, 0 retries — addon 210,
    boot 38, branch 235, chatty 45, cook 85, device 91, distance 28, fetch 17,
    filter_row 25, focus 50, geo 22, midnight 89, note 19, picks 20,
    precache 20, recipe 86, rename 13, served 55, sync 47, to_top 142 — and
    **fixture 1 red**: its sandbox lacked `data/bookings/`, the same gap CI
    had caught in `test_tag_allergens`. Fixed on `main` (`218e1396`), 24/0.
    CLAUDE.md's sync_check expectation moved 40 → 47.
  - `node --test` on the final merged tree: 2016/2016.
- 🎯 **Owner calls this session left open** (each on its item): Hei's two
  vegan rows (`080/300`); may a swap remove an allergen (`200/160`); 28t's
  four intake cases (`310/170`); Abrakebabra's pizza slice (`37n`); should
  saved orders sync (`26b`); the CI screenshot upload (`510/420`). Readings
  to be aware of, each easy to narrow: Delete everything removes the
  profiles too and keeps the sync pairing (`180/010`); Regal's set menus got
  a minimum of 6 heads (`200/170`).
- 🔑 **Lessons** (saved to memory): an item's stale sentence gains authority
  when an orchestrator pastes it into a brief; a new validator rule that
  reads a new store breaks every partial-corpus harness, twice in two days,
  so briefs now say "every Python step in ci.yml"; a gate polled straight
  after a push reads the previous head; and the machine's load cap.
- **Final state:** no open PRs, worktrees, stashes or `[~]` claims of this
  session's; 13 PRs merged (#117–#129).
- **Owner's answers at the close (2026-10-18), recorded on each item, not
  built** (he had said no new claims): remove `contains-egg` from Hei's two
  vegan rows (`080/300`); a swap may remove a warning when the menu says so,
  against the recommendation (`200/160`); saved orders sync (`26b`);
  Abrakebabra's slice is Turkish pizza (`37n`). Still open with him: 28t's
  four cases (`310/170`) and the CI screenshot upload (`510/420`).

