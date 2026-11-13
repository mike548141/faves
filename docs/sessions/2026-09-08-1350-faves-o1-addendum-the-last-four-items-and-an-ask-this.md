## 2026-09-09 — faves-o1 addendum: the last four items, and an ask this session got wrong

**Session `faves-o1`, continuing the entry above.** Four more items landed after
that record was written, and one correction belongs at the front of this one.

### 🛑 This session put a stale item to the owner and he ruled on a false premise

`260/020` said a British reader is shown Fahrenheit oven temperatures. **They
are not, and have not been since 2026-08-17.** `site/js/locale.js:131` reads
`GB: {distance: "imperial", oven: "metric"}`, pinned by
`tests/locale.test.js:68-69`. ADR 0087 delivered the region × usage split this
item called *"more honest and more work"* and **explicitly supersedes the
interim GB → metric patch (`f253812`)** — which is the option this session
offered him and which he chose. Acting on his answer would have reinstated a
known regression.
🔑 **The fault is the session's, not his.** It put a three-week-old item to him
as a live choice without opening the file — the exact failure it spent the day
catching in sub-agents' reports, and what `PROPAGATION.md` means by reading the
source rather than the summary. **An ask is a claim like any other and every
fact in it is supposed to be verified.** His ruling is recorded unactioned with
its premise refuted rather than applied or quietly dropped; the item is closed
as delivered by ADR 0087. What survives is a genuinely open question nobody has
measured: Ireland and Canada are absent from that two-entry exception table and
therefore read fully metric.

### The last four items

| Item | What landed |
|---|---|
| `210/010` | Search ranks a facet match above a text match (ADR 0106) |
| `340/250` | The evidence's provenance is committed and the evidence is not (ADR 0107) |
| `340/190` | A click hit-tests the point it dispatches at (ADR 0108) — the item closes |
| `340/150` | A fixture is a real record with one named transform (ADR 0109) |
| `080/160` | A rule word may end a compound, never start one (ADR 0110) |

### 🔎 Three more items whose own account did not survive measurement

- **`080/160`'s headline cause was wrong.** It said 13 BurgerFuel burgers lack
  gluten because the bun rule cannot match *"Cheeseburger"*. The 13 are real;
  the cause is not — their descriptions **never name a bun**, and the
  lightweight twins carry gluten because theirs end *"On a smaller wholemeal
  bun"*. No regex reaches a word the record does not contain. It is a data gap,
  not a tagging fault.
- **`340/190`(a) was three wrong diagnoses deep** and is not an animation:
  measured inside the failing click, the target centre is at `y=40` on frame 0
  and `y=-11` one frame later, so the settle loop calls the box stable and
  dispatches at a negative coordinate. The failure then surfaces on the *next*
  element — wrong element, wrong line, wrong cause.
- **`210/010` was NOT delivered by ADR 0068**, checked rather than assumed: that
  rebuilt the home-list ranker and search has never used it. The same
  disconnection means search still ignores lifecycle closure (`210/080`), which
  sibling `030` reads as if it covers and does not.

### 🔑 Two guards that caught their own author

- **The fixture anti-drift gate caught its own fixtures three times** before
  anything was committed — wrong key names, a derived-id collision, and a
  module-level constant **aliased** into every fixture so one self-test's
  mutation leaked into the next five and satisfied all of them. Every case
  green, two proving nothing. None was visible in a browser: the page renders
  *something* for each and the assertions would have measured it and passed.
- **The compound-word dry run withdrew a token its author had already
  accepted.** `katsu` passed every false-positive check and still reached
  *tonkatsu sauce*, proposing tags whose printed reason was untrue of the dish.
  **A tail can be clean on the word list and still make the tool lie about its
  reason.**

### Owner rulings recorded this session, none of them started

`500/010` rotate the API key and read it from the environment — **his to do**,
and only one order is safe (revoke, then edit; editing first is the option he
declined). `340/250` strip location then commit, recorded as strip-or-**refuse**
with a byte-level verification pass, because git history cannot be edited
afterwards. `110/020` the trace tier ships in `site/data/` unrendered — he
**overruled** this session's recommendation of the record store, so it is a
deliberate owner-made exception to ADR 0047 and owes that record a superseding
note, or the next cold review correctly reports a breach.

### Close

✅ Tree clean, `HEAD` = `origin/main`, one worktree, no branches, no PRs, no
stashes. ✅ CI and floor green on `main` at `1b9580e`, verified at close rather
than assumed. Board **70 open / 14 claimed**, re-counted at close — every one of
the 14 is a long-standing part-done item and none is this session's.

🛑 **Two errors in this session's OWN close record, found by auditing the claim
instead of repeating it.**
1. **The board figures above were wrong twice** — written as 69/16 and 69/9,
   measured at close as **70/14**. Both were written from a count taken before
   the last merges and filings landed. A board total is a measurement and goes
   stale at the speed the session itself works.
2. **"No orphan Chromes" was FALSE, and the attribution was false too.** A
   `pgrep` at close found 8 matching processes. The delivering agent had
   reported them as *"peer sessions', not mine; my probe's harness reaped its
   own"*. Tracing the parent shows the Chrome's `ppid` is
   `node .../scratchpad/mcd_probe.mjs` — **this session's own scratchpad**,
   running since 01:45 and still holding a browser at 09:29, nearly eight
   hours. A hand-rolled probe script does not inherit the harness's reaping;
   only `tools/lib/browser.mjs` does. Reaped at close, verified 0 remaining.
   🔑 Two lessons, and the second is the sharper: a bare `pgrep` count invites
   the wrong answer because one browser shows as several helper processes, so
   the useful check is the **parent**, not the count. And an agent's claim that
   a process is somebody else's is a claim like any other.
🚩 **Three item-number collisions and five ADR collisions** happened across the
two entries. Every agent checked the allocator and every one was right when it
looked; the collision is invisible from a branch and visible only at the merge.
Filed upstream as atelier `320/200`'s closing note.


