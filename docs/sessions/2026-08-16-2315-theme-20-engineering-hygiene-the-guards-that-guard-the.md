## 2026-08-17 — Theme 20 engineering hygiene: the guards that guard the guards

Worktrees `faves-hygiene` (`hygiene-20`) and `faves-hyg-ci` (`hygiene-ci`, since
removed). Five faves sessions live throughout, plus an atelier session. Owner's
brief: the Theme 20 hygiene block — *"the item that undermines every other
item's 'done'"*.

### What shipped

**`boot_check` runs in CI** (`344adfb`), implementing the owner's 2026-08-16
ruling. Chrome 151 is **preinstalled** on `ubuntu-24.04` — measured on the
runner with a throwaway probe job, not read from documentation — so no
marketplace action, no download and **no new trust surface in a public repo's
workflow**. No `--no-sandbox` / `--disable-dev-shm-usage` either: that advice is
container folklore and these runners are VMs (`/dev/shm` 7.9 GB, headless
launches clean as unprivileged `runner`). A preflight step asserts the browser
exists *before* the check runs, so an image that drops Chrome reads as *"the
runner lost its browser"* rather than *"a screen failed to boot"*.
**Burn-in: 7 runs, 7 green, 0 failures**, 8–12 s each, **0 s added wall-clock**
(parallel job, finishes before the longest existing one) and **nil Actions
minutes** (public repo). **Proven non-decorative** by reintroducing the exact
2026-08-16 bug — `venueTimezone` dropped from `app.js`'s imports: every other
job stayed green and the boot job alone went red, naming the symbol, file, line
and call chain into `init()`.

**The harness reaps its own browser, names its tree, and stops lying about
transport failures** (`ecbc82e`, [ADR 0078](../decisions/0078-a-harness-owns-its-own-lifecycle-and-a-transport-failure-is-not-a-test-failure.md)).
All three in `tools/lib/browser.mjs`, covering all ten checks. `SIGTERM`/`SIGINT`
leaked 9–10 Chromes and a profile dir on every rep before, and zero after;
`SIGKILL` still leaks both and always will, which is what the startup sweep is
for. Every check now prints a second line naming the served tree, its
`SHELL_VERSION` and its `branch@sha`, with the `OK — N passed` first line
byte-identical. A CDP timeout aborts as `HARNESS ERROR` with exit 2 instead of
`FAIL <assertion name>` with exit 1.

**Doctrine and upstream:** the stamped-copy check done properly (`9bf5b8b`,
`eb225db`), `linkscan`'s blind spot queued upstream and **accepted into atelier
as item 020/320** (`f71a0cf`), `CLAUDE.md` corrected twice (`4fcb05e`,
`bab1188`), and the `cook_check` flakiness item re-filed with its diagnosis
struck (`1974b2e`).

### The five things worth carrying

🔑 **The leak rate tracks how often a check is TYPED, not how heavy it is.**
128 of 189 orphaned profile dirs were `boot_check`'s — the cheapest check, so
the most typed. That made the reaper a **prerequisite** of the CI wiring rather
than a sibling: wiring first would have multiplied the leak by the push rate.
A peer supplied the framing; it is the non-obvious part of the ordering.

🔑 **And the bigger half of that leak was never abnormal exit at all.**
`boot_check`, `to_top_check` and `filter_row_check` never removed their profile
directory **on a fully successful run** — 178 of the 189. A per-tool patch would
have fixed it twice and missed it once, which is the argument for the shared
library restated as evidence.

🛑 **CI reports; it does not block, and everyone including this session had been
claiming otherwise.** `protect-main` lets a repository admin bypass required
checks, and **the last 100 ruleset evaluations on `main` were 100 bypasses** —
measured, not one anecdote. A push to `main` *is* the Cloudflare Pages deploy,
so the sequence is **push → deploy → red afterwards**. A peer cleared the change
with *"if I ship a change that makes a screen's JS throw, I want the push to
fail"*. It will not fail. That limitation is now written into the workflow file
itself, so nobody re-derives the wrong belief from a green badge.

🛑 **The flakiness was never `cook_check`'s.** The 30-second timeout is in the
**transport**, shared by all ten checks; a peer measured `boot_check` failing
**2 of 4** and `recipe_check` aborting **4 of 8** on the same timeout, from two
tools that are not this one. The owner's ruling picked `boot_check` because it
*"makes no timing assumptions"* — true of its **assertions**, and the timeout is
in the transport, so a body with zero timing assumptions inherits the flakiness
anyway. What mechanism could fix is fixed; the contention stays open.

🔑 **A guard must be proven to DISCRIMINATE, not merely proven not to fire.** A
peer's cleanup guard passed while guarding nothing — a shell expansion produced
junk — and looked identical to a working one, which it volunteered rather than
banked. So the sweep here was tested both ways: with its age guard neutralised
so the process-table test stood alone, the **same directory** survived while its
check was live and was removed once its Chrome was killed.

### Where this session was wrong

❌ **I claimed our inlined claiming rule was a MISTRANSLATION of atelier's. It is
not.** A peer read `CONCURRENCY.md` rather than take the claim on trust and
corrected me; I then read it myself before accepting. Atelier's parenthetical —
*"the item's file, and **on a split board** the generated index with it"* —
contemplates both board shapes, so on a monolithic board the item's file **is**
`ROADMAP.md` and our copy is faithful. **The defect is upstream, in the yield
branch**, which assumes the next open item lives in a different file.

**Getting that right was the whole practical difference:** filed as a local
wording bug it would have sent the owner to edit the wrong file and left every
other monolithic-board adopter in the trap. It is filed in atelier as 030/140.

🔑 **Two failures of evidence came out of that, both now upstream at 200/090.**
*Agreement is not corroboration when the second party never opened the source* —
one session asserted, a second backed it with fresh evidence, a third read the
source and refuted both; two-of-three agreement felt like confirmation and was
one unread claim with an echo. And *a symptom count locates a fault's existence,
never its site* — "three independent readers all stalled" is strong evidence the
**deadlock is real** and no evidence at all about **which file** the defect lives
in, yet it was offered and received as settling both.

⚠️ **A near-miss on the queue file.** I checked `git status` at session open,
found it clean, and edited a claim line on the strength of that. By then the
porcelain read `MM docs/ROADMAP.md` — a peer's index **and** working tree loaded,
with my edit in the unstaged half. Backed out with a **reverse `Edit`, never a
git command** (`checkout`/`restore`/`stash` would each have hit the peer's work),
then *proved* the retreat rather than assuming it: `git log -S` on the claim
string returned nothing. **A clean status seconds ago is not a clean status now** —
with five sessions live the window is minutes, so the check belongs in the same
breath as the edit.

### Concurrency

Broadcast the file set and the intended gate-strictness change to all four faves
peers before starting; all four cleared it. Three research/build agents ran with
disjoint file territories and **no git write commands at all** — the orchestrator
did every commit, staging by explicit path, with
`git diff --cached -U0 | grep '^@@'` before each. Every roadmap and `CLAUDE.md`
edit landed by cherry-pick onto a *clean* primary checkout, which was left clean
after each. The harvest of the Chrome-leak item was checked by item count
(54 → 53) so exactly one item moved and no adjacent open item went with it.

### Left open, all with the owner

🎯 `FX_TOKEN` (a credential, only he can mint it) · the monolithic-board
claiming rule, where the honest proposal is **conditional** — the item's line as
the unit **plus a compulsory pre-commit index check**, because hunk-staging
demonstrably did *not* prevent an index collision · whether `every screen boots`
and `service-worker version lockstep` join the required-checks list (**being put
to him by the session holding the live version-bump instance, deliberately not
by this one**) · and whether to migrate off the monolithic roadmap to atelier's
split board, whose merge-conflict resolution is *rebuilding the index* rather
than a hand-merge — which is what killed the same collision class upstream.

---

