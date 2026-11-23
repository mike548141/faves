- [x] **Apply the author-side findings of the 2026-11-01 swap cold review:
      F2, F6, F7, F12** `[S][js]` — filed 2026-11-23 by queue run f9ee6733
      from [`160`](160-a-swap-is-not-an-extra.md), whose routing names *"one
      follow-ups item"* and says *"The follow-ups item is not yet filed."*

  (claimed 2026-11-23-1443, session f9ee6733, worktree faves-qr-f9ee-swap)

  **The findings** (review
  `docs/reviews/2026-11-02-1214-dish-configuration-obligations-and-allergens-cold.md`):
  F2, F7 and F12 are fixes with tests; F6 is one harness assertion. The
  sheet's "finished" check must resolve the options it counts (F2, in the
  verdict's own words). **Not here:** F1 (MAJOR), F3 and F4 are the owner's
  rulings on 160; F11 (ADR 0168 stale against the 2026-10-18 answer) needs a
  record beside the accepted ADR; F5, F8, F9, F10 are record only.

  **Done 2026-11-23 (queue run f9ee6733).** Each finding was checked against
  the code as it stands before anything changed; the review is three weeks old.

  - **F2: verified real, applied.** `unfinishedOf` counted the stored options
    in a required group, so a line whose one pick had left the menu read as
    finished while `planRecall` called it "no longer offered". It now counts
    only options the live group still offers (`resolvingOptions`), and the
    sheet flags the line. Finishing replaces the stale pick instead of leaving
    it beside the new one, and its stored price leaves the line with it
    (21 − 3 + 2 = 20 in the test). Tests: two cases in
    `tests/order-finish.test.js`, and a sheet assertion in `addon_check`
    block (aa). Break-probe: counting stored options again fails both unit
    cases and the sheet assertion (the flag never appears).
  - **F6: verified real, applied as the harness assertion.** The caption
    fires on a failed load only, and nothing staged one. Block (aa) now
    stages a venue with no record and asserts the caption is shown and says
    "Couldn't load every menu". Break-probe: hiding the caption fails it.
    **Left:** the reviewer's second half, a caption while the fetch is still
    pending. "Couldn't load" would be untrue then, so it needs a new
    sentence, and nothing makes the window longer than a sub-second wait on a
    working network. A wording choice for the owner if he wants it.
  - **F7: verified real, applied.** `order-finish-ui.js` passed the stored
    line to `owedSentence`, so one of two cheeses ticked in the draft still
    read "choose 2". New pure `pendingSelection(info, picks)` (stored picks
    plus the draft's, each on offer once) feeds it. Tests: one case in
    `tests/pick-counts.test.js`, one in `tests/order-finish.test.js`, and a
    sheet assertion on a choose-two fixture ("choose 2" becomes "choose 1
    more"). Break-probes: reverting the call site fails the sheet assertion
    alone; neutering `pendingSelection` fails both unit cases.
  - **F12a: verified real, applied.** `ensureRecords` fetched a record for
    every `venueId` an order holds, and a share link's is only length-clipped.
    It now asks `isVenueId` (new, `renames.js`, the one definition that
    `settings.js` now shares) and treats a non-id as an unloadable venue
    without a request. Tests: `tests/renames.test.js`, and a sheet
    assertion that the request log holds the failed real-shaped id (the
    control) and never the malformed one. Break-probe: removing the check
    fails the sheet assertion. **Left:** an id of the right shape that no
    venue has still costs one same-origin GET each. Checking against the
    index would close it, but the sheet does not load the index.
  - **F12b: verified real, applied in code.** A group id of `constructor`
    passes the id shape, and `draft.picks["constructor"]` is `Object`, so the
    finish control died on `.includes`. Every read of a groupId-keyed picks
    map now goes through `own()` (own property or undefined). Test: a
    `constructor` group in `tests/order-finish.test.js`. Break-probe:
    reading `map?.[key]` fails it. **Not done:** refusing reserved words in
    `validate.py` as well. No record has such a group, and the code is now
    safe without it.
  - **F12c: verified real, applied.** `check_replaces_stated` was a substring
    test, so `replaces: "bun"` passed on a desc containing "bundle". It is
    now a whole-word match. The corpus validates unchanged (66 files). Tests:
    three cases in `tools/test_validate.py`. Break-probe: restoring the
    substring test fails the "bundle" case.
  - **Not touched, as briefed:** F1, F3, F4, F11, and the record-only F5,
    F8, F9, F10.
  - **Owner:** nothing is blocked on him. The F6 pending-state caption (above)
    is his if he wants it.
