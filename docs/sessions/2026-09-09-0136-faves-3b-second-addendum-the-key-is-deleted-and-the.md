## 2026-09-09 — faves-3b second addendum: the key is deleted, and the warning that told the next session to undo a ruling

Three things landed after the close was first written, all owner-initiated.

### 🔥 The Gemini key: DELETED, not rotated

He re-authenticated `gcloud` himself, then **took the challenge** and set aside
his own earlier *rotate* ruling. Recorded as a changed mind, not as a
reinterpretation of the first one.

**Verified before the irreversible act** — both scripts carried the *same*
literal; it *was* the live *Default Gemini API Key* (compared by hashing the
file value against `get-key-string` and printing only the boolean, so no secret
entered the transcript); `uid` matched the estate registry; it was the **only
API key in the whole organisation**, all five projects enumerated. He was told
plainly first that **Google cannot regenerate a key in place** — rotate and
delete both destroy it, so "something unknown breaks" was true of both — and
offered *stop, something else uses it* as a real third option, which he
declined.

**After:** zero keys in every project. Both scripts read
`os.environ["GEMINI_API_KEY"]` and `SystemExit` with instructions when unset;
the guard was tested both ways in isolation, because `google.genai` is not
installed here and the import fails before the guard is reached. Zero `AIza`
literals anywhere under `intake/`.
🔑 **Revoke-before-edit justified itself within a minute**: the literal appeared
in a `grep` while being located, and was already dead when it did. Under the
order he declined, that same grep would have leaked a live credential.
⚠️ Both files are gitignored, so `500/010` is the only durable record.

### `500/060` closes — he meant the menus

*"I meant menus. The product photos of ingredients were probably taken at
home."* That agrees exactly with the measurement (119 GPS-bearing pantry frames,
one cluster), so the shop-case validator stays unbuilt for want of a real
instance — ADR 0080 D4. The rewording he ruled on shipped as ADR 0115. `[x]`.

### 🛑 `080/220 §3` — and the orchestrator's proposed fix was wrong

Removing the false gluten tag left `validate.py` — first on the mandatory verify
list — printing *"missing contains-gluten … run tools/tag_allergens.py"*: a
standing instruction, on the gate nobody skips, to reinstate what the owner had
just ruled out. He said fix it.

**The brief proposed narrowing on grammar** — don't read an allergen word that
is the object of *"switch the X for…"*. The delivering agent built it, measured
it, and **refused it**:

> *"Grass fed beef, cheddar, pickles. **Swap the bun for lettuce**"* is the
> identical sentence shape, on a dish that really does arrive in a bun. One row
> **is** the swap, the other **offers** it, and no grammar tells them apart.

Grammar alone would have traded the over-warning for a **miss** — the one
direction the tool may not move. The shipped guard (ADR 0116) adds a **mirror
condition**: a match is cancelled only when *the same food is named after the
pivot*, and the destination then decides. So *"…for a milk bun"* keeps its
gluten and gains dairy; *"…for lettuce"* cancels nothing.

✅ **Verified independently by the orchestrator rather than taken on report** —
which mattered, because the first probe read as a regression and was not one.
Testing `swapped_away` in isolation on the real row looks wrong until you see
that the row has **two** matches on different layers: the swap-away *"wholemeal
bun"* is cancelled by the new fix, and the destination *"gluten friendly bun"*
by ADR 0097's existing hedge. Neither layer does the job alone. End to end:
dry run **1 → 0** proposals, `validate.py` **75 → 74** warnings,
`test_tag_allergens` **81 → 90**, and with every tag in the corpus cleared the
rules make 3,213 findings before and 3,212 after — one lost, none gained.
🔑 **The lesson for the next probe: a negative result on one layer of a
multi-layer guard is not a defect.** Reproduce end to end before reporting one.

### Pin bump at close — `35912e3` → `eb6449d`

The drift check at session start reported nothing; re-run at close it reported
**10 commits**, so the bump is this session's to make rather than the next
one's to trip over.

🔎 **Read before bumping, and the reading is the point: ZERO files under
`docs/method/` changed.** The ten are atelier's instrument layer (`ccmail`,
`ccgrab`), its own roadmap and session records, and one addendum to its
ADR 0006 admitting the first instrument that holds a third-party credential.
None of it is doctrine and none of it binds this repo's practice, so there is
nothing here to apply — only a stale baseline to retire.

✅ **The pending-upstream line in `docs/roadmap/README.md` correctly SURVIVES
this bump**, checked rather than assumed. CLAUDE.md's rule is that such a line
*"goes at the pin bump that carries the answer"* and *"a pending-upstream line
that survives that pin bump is drift"* — so a bump is exactly when it must be
re-tested. Atelier's `310/060` and `310/070`, the two items the narrowing waits
on, are both still `- [ ]` open upstream. This bump does not carry their answer,
so the line stays and is not drift.

### The close audit found three more, which is why the close is audited

*"Ready to close?"* is a claim like any other. Re-running the checks rather
than repeating the earlier close found:

1. **The atelier pin was stale by 10 commits** — the start-of-session drift
   check was clean, so the movement happened *during* the session. Read (zero
   `docs/method/` files changed), bumped to `eb6449d`, and the board README's
   pending-upstream line re-tested and correctly kept.
2. **Three `faves-p1` references survived the rename sweep**, because two
   agent branches merged *after* it and carried the old name in from the claim
   notes they were reading. A one-pass rename does not hold while parallel
   branches are still in flight.
3. 🔎 **A wrong PR number, in two records.** `080/210`'s delivery note and
   `080/160`'s pointer both cited **PR #35** for ADR 0114. #35 is the
   *location-rule* PR; ADR 0114 landed in **#37**. One agent wrote it, and the
   pointer it added elsewhere copied it — so the error propagated to a second
   record before anyone read either. Both corrected.
   🔑 **The check is cheap and nobody runs it:** `gh pr view <n> --json title`
   on every `PR #n` a session's records cite. Four citations, two wrong. A
   number is the easiest thing in a record to get wrong and the hardest to
   notice, because it reads as precision.

### One more, after the close: a teardown that impersonated a test failure

The `080/220 §3` agent reported, its PR was merged on that report, and its
worktree was removed — and it then **woke and kept working**, re-running a check
it had been unable to finish at load 128. The re-run died with `cd: no such file
or directory`, which reads exactly like a failing gate and is not one.

🔑 **A completion notification is not proof an agent is finished** — the same
task can notify more than once and resume after reporting. Nothing was lost
(both commits were on `origin`, the merge was gated on green CI, and the agent
confirmed it changed nothing afterwards), but the failure mode is real: a
teardown makes a *live* agent report a phantom failure about the repository.
**Merging its branch on the report is fine and should not wait; deleting the
worktree can wait until close** — that is the only irreversible half and it
costs nothing to leave.

⚠️ This is the second time this session repeated a lesson already in the
record. It is also the second time the refinement was *"the rule as written did
not cover this shape"* rather than *"the rule was ignored"* — which is the more
useful kind of finding and the harder one to notice.

