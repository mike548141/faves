## 2026-08-17-2200 — a stale handover, 2.6 GB of debris, and four claims that had to be proved

Opened on a handover note from a previous session warning that `sync_check.mjs`
was unclaimed and its trace pointed at a real product hazard: the ⋯ button
reporting two open/close cycles from one click. **The warning was already
overtaken** — the item had been fixed the day before, and its "a real person
could hit this" hazard retired as the check's own bug. Re-ran it: `OK — 16
passed, 0 failed`, N still 16.

**The one residue got closed, structurally rather than by re-running.** The old
trace's third observation was recorded as *"unexplained rather than disproved"*.
It now has nowhere to live: `overflow-ui.js`'s `setOpen()` returns early on
`open === isOpen()`, so one activation cannot move `aria-expanded` twice, and
two cycles need **two** click listeners. There is exactly one binding, reachable
once per page. The mechanism the original diagnosis named is specifically ruled
out — `menu.js`'s `reapply()` is a settings subscriber that never re-runs
`initChrome()`. 🔑 **"Unexplained" and "a hazard" are not the same claim**: an
unreproduced reading with no possible mechanism is a tooling question.

### The debris was real and larger than anyone had measured

**265 leftover Chrome profile dirs, 2.6 GB**, plus 4 orphan browser trees (30
processes, 391 MB RSS, ~10 hours old). All deleted on the owner's authority;
zero headless Chrome left. **128 of the 265 were `faves-boot-check`** — the
cheapest check, so the most-typed, so the biggest leaker, and the one about to
be wired into CI on every push. That evidence changed `faves-hygiene`'s
sequencing: the reaper lands **before** the CI wiring, not after.

- 🔑 **The happy path was never broken.** A clean run removes its own dir —
  proved, not assumed: this session's `sync_check` run left nothing behind
  (`sync_check.mjs:908`). So every one of the 265 was from a killed or crashed
  run, which is exactly the scope of the fix.
- ⚠️ **`ppid=1` is a sound orphan discriminator but not a stable target.** The
  four orphans died on their own between measurement and kill — the kill matched
  nothing, before a signal was sent. A reaper must treat "already gone" as the
  normal case.
- ⚠️ **The held-dir guard written for the deletion did not work** (shell
  expansion produced junk). Nothing was at risk — zero Chrome had been verified
  seconds earlier — but the guard didn't earn the credit, and saying so is the
  point. 🔑 `faves-hygiene` named its class exactly: it is a **decorative guard
  pointing the most dangerous way** (ADR 0072) — its output would have been
  identical had a live run been present. That volunteered failure is now a
  required test in the reaper: start a check, leave its Chrome live, sweep, and
  assert the held dir survives.
- 🔑 **Two sessions counted the same debris and got 189 and 265** — because one
  pattern matched `faves-*-check` and the other included `domsnap-*` and
  `faves-sync-smoke-*`. About 16 of the gap is definitional; the rest is
  unexplained and left that way. **Neither of us stated our pattern when we
  stated our count**, which is what made a definitional difference
  indistinguishable from a real one. State the pattern with the number.

### Four stale claims — and the owner would not take existence as evidence

Four `CLAIMED` markers from 2026-08-16 whose worktrees were gone and whose work
had landed. The first report offered file-existence as proof. The owner's reply:
*"ensure you can prove that each of those stale claims is 100% completed."*
🔑 **He was right, and the re-verification found the difference between the two
standards.** `kinds.js` existing proves nothing; **`isRecipes` being gone from
executable code** — ~20 branches down to one comment about its own removal — is
the measure that proves the refactor. Likewise the ticks item: the file had the
exclusion, but what proves it is the **suffix** match (a base-key match would
have excluded *nothing at all while reading as complete*) plus the test the item
itself demanded, across two profile ids.

One item contradicted itself — header `"Ruled, not yet built"` above its own
body's `"✅ BUILT"`. Marking it `[x]` then tripped **sizescan's cold-content
gate**, so 36g was harvested whole to `ROADMAP-DONE.md` behind a pointer.
🔑 **The gate was right**: de-claiming alone would have left the contradiction
outliving the claim that explained it.

### 🛑 Five parallel sessions: the index is a shared surface too

Two sessions were live in the **primary checkout**, both editing `ROADMAP.md`.
We collided **in the git index** — for about a minute it held both work sets,
and a commit from either side would have landed the other's half under the wrong
message. `faves-f1` caught it and reversed out; neither `git status` nor a clean
working tree would have shown it.

- 🔑 **The check that works, and it is not `git status`:**
  `git diff --cached -U0 | grep '^@@'` immediately before every commit.
  It caught a *self*-inflicted case minutes later too, when a harvest left this
  session's own staged content stale against its own working tree.
- `git add -p` is interactive and blocked in this harness, so hunk selection
  goes through `git apply --cached --unidiff-zero` on a filtered patch, `-R` to
  undo. **A filter has to match wrapped prose** — the first attempt keyed on a
  phrase that line-wrapping had split, and silently staged one hunk of four.
- 🔑 From `faves-hygiene`, one step earlier in the same sequence: **a clean
  `git status` at session open is not a clean status now.** With five sessions
  live the window is minutes; the check belongs in the same breath as the edit.
- 🔑 **Two peers corrected this session and both were right**, which is the
  argument for the channel: `faves-f1` read the code where this session had
  reasoned from a test name (`needs: price` needed no schema change at all), and
  caught the index collision. Peer review beat solo care twice in one session.

