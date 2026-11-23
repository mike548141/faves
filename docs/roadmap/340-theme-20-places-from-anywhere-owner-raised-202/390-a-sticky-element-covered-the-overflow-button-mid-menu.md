- [x] 🔎 **A sticky element covered `#overflow-btn` while scrolled down a menu**
      `[S][css]` — seen 2026-11-23 by a queue-run worker (f9ee6733) building
      `tools/activity_check.mjs`.

  (claimed 2026-11-23-1523, session f9ee6733, worktree faves-qr-f9ee-sticky)

  **What was seen.** Driving the real page, the harness's hit-test reported
  `#overflow-btn` covered by a sticky element while the menu was scrolled
  down; the worker scrolled to the top first and went on, and did not
  investigate. The harness's `UNREACHABLE ELEMENT` is built to mean exactly
  this (`CLAUDE.md`, the click paragraph): *"a control with something painted
  over it is the defect `to_top_check` exists for"*.
  **Unknown:** whether a person at 390 px can hit it, or only the harness's
  scroll position; which sticky element it was. **Next:** reproduce at 390 px
  mid-menu, read the FAIL line's `page state:` and screenshot, and either fix
  the stacking or record why a reader cannot reach that state.

  ✅ **Done 2026-11-23 (queue run f9ee6733).** Verdict: harness-only. A
  person cannot hit it, and no site change was made. Measured on the real
  page, 390 px and 1200 px, three menus (thai-tara-express,
  rs-satay-noodle-house, regal-chinese-restaurant), light scheme, a settled
  state (200 ms after each instant scroll) at 1-6 px steps through the first
  120 px and every 400 px to 6000.
  The ⋯ is in the non-sticky header, so it is ON screen only in the first
  ~36 px of scroll. Mid-menu it is 1384 px above the viewport and nothing
  sticky can cover what is not there; the sticky stack (compact contact bar
  z-index 7, toolbar 6, ↑ 12) sits at the top and bottom edges, not over it.

  | Case | ⋯ on screen? | Covered? |
  |---|---|---|
  | rest, y 0-36, 390 px, 3 menus | yes (7 depths each) | no, 0 of 21 |
  | rest, y 0-36, 1200 px, 3 menus | yes (7 depths each) | no, 0 of 21 |
  | rest, y 120-6000 (both widths) | no (btnTop -1384 at y 1400) | n/a |
  | smooth scroll up from 1500 / 4000 (finger, the ↑) | from ~470 ms | never |
  | instant jump to top / `scrollIntoView` (harness) | frame 0 | frames 0-1, ≤ 13 ms |

  **Cause of the harness sighting.** `menu.js` un-hides the contact bar from
  an IntersectionObserver, which reports a frame or so after a scroll. After
  an INSTANT jump to the top the bar is still up for that one frame, over the
  ⋯. `driver.click` scrolls the target into view (`behavior: "instant"`),
  waits one frame for the box to stay put, and hit-tests: it lands in that
  window and, by ADR 0108, fails on the spot rather than waiting for the
  cover to clear. A person cannot tap in 13 ms, and a person's own routes
  (finger scroll, the ↑, a key press) are all smooth, which was never covered.
  `tools/to_top_check.mjs` already says this in its header and bounds it
  (`ARRIVE_AT_TOP`); it hit-tests the ⋯ at every on-screen swept position and
  asserts a jump back to the top becomes reachable and stays so. Nothing to
  add there. The worker's workaround was right: **to press the ⋯ from
  mid-menu, `driver.scrollTo(0)` and `driver.settle()` first, then click.**
  The probe could not screenshot the covered frames (`captureScreenshot`
  waits a frame, by which time the bar has gone); the mid-menu sticky stack
  and the cleared state a frame after a jump were captured instead.
  **Not done:** making the harness's click tolerate that one frame (it would
  weaken ADR 0108's "covered fails on the spot") or un-hiding the bar
  synchronously from a scroll listener (ADR-level cost for a 13 ms window).
  Neither is warranted by a state a person cannot reach.
