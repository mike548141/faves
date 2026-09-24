- [x] **Our inlined floor is a stamped copy nothing watches** `[S][docs]`
  ✅ **DONE 2026-09-21 (session `3e87e0bf`, branch `floor-restamp`,
  [ADR 0120](../../decisions/0120-the-inlined-floor-is-a-verbatim-stamp-and-our-enrichments-live-beneath-it.md))
  — the owner's ruling is executed in full. 🛑 AND THE ITEM'S OWN TITLE IS
  STILL TRUE: nothing watches it, and now we know it cannot.** What changed is
  that the block is *worth* watching and the check that can pass it is written
  down. The detail is below the claim record.
  📌 **CLAIMED 2026-09-21 (session `3e87e0bf`) — AND THE OWNER RULED THE OPEN
  FORK QUESTION.** atelier ruled `115/030` on 2026-09-19: *"A child's copy of
  the `floor` region is the canonical text word for word — no compression, no
  declared narrowing — and `narrow=` on a `region=floor` stamp reds instead of
  excusing anything."* That collides head-on with **(c)**, which this repo's
  owner ruled on 2026-08-17 as *the two forks: KEPT*. Put to him 2026-09-21
  with the collision stated and three options; **his ruling: re-stamp the floor
  region VERBATIM and relocate every faves-specific enrichment into the
  repo-specific onramp directly beneath it** — nothing is lost, `stampscan`
  can finally watch the block, and the `Source & drift` fork's original
  justification is already fixed upstream (atelier `54201e0` now carries the
  `fetch` and reads `origin/main`). Two floor bullets also moved in the delta
  and arrive with the re-stamp: **Asking** (the account must have *reached* the
  principal before the choice is put) and **Concurrency** (read `git status`
  first; never autostash a stranger's work).

  ⚠️ **One clause of that claim paragraph is WRONG and is corrected here rather
  than edited away: *"`stampscan` can finally watch the block"*.** It cannot,
  and the reasons are structural. Measured 2026-09-21 in this worktree, both
  numbers from the tool rather than from its documentation:

  - `python3 …/stampscan.py --root /Users/mike/worktrees/faves-floor CLAUDE.md`
    → `CLAUDE.md:3 [missing-source] canonical source does not resolve:
    docs/method/PROPAGATION.md`, **exit 2**. That is atelier's **ST3**, and it <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
    is **still open**: `resolve_source()` in `stampscan.py` resolves `source=`
    against `--root` and returns `unconfined-source` for anything outside it,
    with no parent-path or pin-aware escape hatch anywhere in the tool; the
    module docstring still says a scaffolded child running it would exit 2;
    and atelier's board carries `320/160` and `020/110` as `- [ ]`.
  - 🛑 **And ST3 is not the binding obstacle.** Staging a copy of the canonical
    `PROPAGATION.md` beside a copy of our `CLAUDE.md` so `source=` *does*
    resolve gives **exit 1, drift** — first offending line the filled pin,
    the heading carrying `atelier@09cd4d2` where canonical has `<SHA>`. Every
    child must fill four placeholders; substitution **rewords**; `stampscan`
    reds on anything not obtainable by pure deletion. **A fully compliant child
    reds by construction**, and no fix to ST3 touches that.
  - 🔎 **A third, smaller one found on the way, worth a line because it is the
    decorative-guard shape:** `stampscan`'s default scope is `<root>/docs`, and
    a child's stamped floor lives in `CLAUDE.md` at the **root**. Run with no
    path argument it prints *"✓ stampscan clean — no stamped blocks found"* and
    **exit 0**. The one invocation an adopter is most likely to type is the one
    that cannot see the thing.
    ⚠️ **THAT LAST SENTENCE PAIR DOES NOT REPRODUCE, re-measured 2026-09-24 at
    `3db205f` with the exit code captured clear of any pipe.** The scope claim
    is right and is confirmed by the tool's own `--help`; **the symptom is
    wrong**. The bare run **exits 2**, not 0, because ADR 0120 — written *about*
    this very problem — **quotes the `stamp:begin` marker syntax**, and that
    quotation lives under `docs/`, inside the default scope. So the bare run
    trips on the ADR and never scans `CLAUDE.md` at all: grepping its output for
    `CLAUDE.md` returns **zero**.
    🔑 **And the corrected shape is worse than the one first written down.** A
    stable false pass is at least learnable. What actually happens is that both
    invocations exit 2 with near-identical messages while **only one of them
    looked at the floor** — so the exit code gives a reader no way to tell the
    difference, and the symptom depends on whether anything under `docs/`
    happens to mention a marker. The same defect therefore presents two
    different ways in two children.
    🚩 **This is the repo's own lesson landing on the repo:** *a check's
    description is not evidence about the check* — and here the description was
    a worker's report, published into an item, an ADR and a hand-up before
    anyone ran the command clear of a pipe. Corrected upstream in the same pass
    (atelier PR #87 carries the corrected version, not the original).

  🔑 **So the consequence atelier's `320/160` draws is adopted here: the hand
  check is not a stopgap.** It is the only instrument that can pass a compliant
  child, it runs **every pin bump**, and `CLAUDE.md`'s onramp now carries it
  with its command — filling the placeholders **by script** so "verbatim" is a
  property of the construction rather than a claim about care. Run against
  `937eea6` it reports zero drift outside the six placeholder-bearing canonical
  lines, zero residual placeholders, and no line at or over 86 columns.

  🚩 **Owed upstream, and it is a CORROBORATION not a new item** — atelier
  `320/160` already carries both obstacles, filed by a private child on
  2026-09-06 and corroborated by a second on 2026-09-20. This is the **third**,
  and the first from a **public** child, which adds only two things: the
  default-scope blind spot above, and the observation that the two obstacles
  have different owners — ST3 is a tool fix, the placeholder problem is a
  *doctrine* question about what a stamped copy even means when the house
  itself instructs the child to reword four of its lines. Hand it over the peer
  channel or append to `320/160`; do **not** open a duplicate.

  📋 **What the re-stamp moved, so nothing is lost by accident.** Every passage
  below that used to live inside the doctrine block now lives under a named
  heading in `CLAUDE.md`'s onramp: the three `00-APEX` practice clauses →
  *Above the apex*; BS1 and the whole dirty-checkout history →
  *Concurrency — BS1*; the staged-index provenance note → the same section;
  the CI-result clause and the cancelled-run sub-clause → *Session rhythm*; the
  `5ef28ae` baseline history, the `origin/main` reasoning and the worktree trap
  → *Source & drift*; the two forks and their reasoning → *The two deliberate
  forks — retired 2026-09-21*; the 2026-08-18 owner quotation and its five-step
  route → *A house rule is not ours to write*; the publication-bound wording →
  *Estate resources*. The heading's *"owner-ratified 2026-07-25, bumped
  2026-09-09"* is **not** carried into the stamp — the canonical heading has no
  date and an addition reds like a reword — and lives in ADR 0120 instead.

  **The record as it stood before that ruling is kept below, unchanged.**
  **Claim DISCHARGED 2026-08-17: the copy-vs-source check was done properly**
  (results below). The item stays open on **three owner decisions** and on
  atelier's ST3, not on a session; there is nothing to claim. —
  found 2026-08-09 bumping the pin to `atelier@6887118`. `CLAUDE.md`'s
  doctrine block is the sanctioned *stamped copy* shape (it names atelier,
  carries a pin, and compresses without contradicting), but it is stamped in
  **prose only** — atelier's `stampscan` finds "no stamped blocks" here,
  because the machine-readable `<!-- stamp:begin source=… region=… -->`
  markers are absent. Atelier's own doctrine calls an unwatched convention
  "rung 1 territory, not rung 2". **We cannot fix this from here yet**: the
  markers pin `source=docs/method/PROPAGATION.md`, a path that exists only in <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
  atelier, so a child running the scanner exits 2 — and the child-side,
  pin-aware `source=` resolution is atelier's open ST3, already queued in its
  own roadmap (D2 residue). Nothing to deliver upstream. When ST3 lands,
  adopt the markers here. Until then the check is by hand.
  ⚠️ **Re-verified 2026-08-16 at the `atelier@1408d98` pin, and this time the
  source DID move** — `git diff bde4928..1408d98` over the four canonical floor
  files: `00-APEX` −42/+30, `CONCURRENCY` −5/+18, `RECORD` −21/+30, `ECONOMICS`
  unchanged. So the earlier all-clears were reporting "source unchanged", which
  is only the same thing as "copy has not drifted" while the source is still.
  **The check that matters is copy-versus-source, not source-versus-itself.**
  Done properly this time, clause by clause:
  - `00-APEX`'s two real changes — *the principal's authority is **absolute**,
    with the informed condition moved off the authority and onto the **ruling***,
    and *surface a genuine dilemma, never silently resolve it* — are **both
    already in our inlined block**, correctly. They arrived with the `1408d98`
    pin bump. No drift.
  - The Laws section was **removed** from `00-APEX`; we never inlined it. No
    drift.
  - 🔎 **`CONCURRENCY` gained a rule we do NOT carry, and a session hit the gap
    the same day.** Claiming at a *dirty primary checkout*: if the stranger's
    uncommitted edits don't touch the queue file, you stage and commit the claim
    line alone — explicitly the one sanctioned touch inside another session's
    tree. Our compressed copy said only "never work around or absorb them", so
    the session that found a foreign stage in the main checkout on 2026-08-16
    read it conservatively, declined to commit its claim there at all, and its
    claims went unpublished for the rest of the run while four sessions were
    live. **Compression dropped the one clause that tells you what you MAY do.**
    Now inlined.
  🚩 **The generalisable failure:** a hand-check whose recorded evidence is
  "the source did not move" degrades to nothing the moment the source moves —
  it never says whether the *copy* is right, only whether the question was easy.
  (First verified 2026-08-09; re-verified 2026-08-15 at `bde4928`.)
  ⚠️ **Re-checked 2026-08-17 at `atelier@1408d98` — pin CLEAN, copy is NOT.**
  Drift check run independently: `HEAD == main == origin/main == 1408d98`, so
  the stale-checkout confound was excluded before the range was believed, and
  `1408d98..origin/main` is genuinely empty. **The source did not move; the
  copy was still wrong** — which is the point the item exists to make, now
  demonstrated rather than asserted.
  🔑 **The comparison was being made against the wrong artefact.** The
  canonical thing a stamped copy copies is not the four method docs — it is the
  **floor region in `PROPAGATION.md`**, shipped between `floor:begin` /
  `floor:end` markers and the exact text `stampscan` would diff us against.
  Read that way the block splits three ways, and only the middle group is ours:
  - **Faithful to the region:** the floor stop-list, the informed-confirmation
    triple, the principal's-authority-is-absolute wording (the 2026-08-15
    correction), record naming, estate-resources, visibility. No drift.
  - 🚩 **Ours, and diverging from the region — three places.** (1) The apex
    bullet substitutes three `00-APEX` practice clauses for the region's
    *ordering rationale* ("adaptation runs on evidence, and honesty is what
    makes the evidence trustworthy"). Richer, not wrong — but it is a fork, and
    `stampscan` will red on it the day ST3 lands. (2) The
    **dirty-primary-checkout passage is not in the region at all** — we inlined
    it from `CONCURRENCY.md`'s body on 2026-08-16. (3) `Source & drift`
    rewrites the region's command.
  - **Absent from the region too, so inherited faithfully and owed UPSTREAM,
    not here:** `RECORD`'s *boundary is the balance* (a mid-sequence pause
    carries no close-obligation), `RECORD`'s *bulk deletion from a record store
    is show-first regardless of who made the mess*, `ECONOMICS` item 1 (*a task
    is a coherent line of work*). All three are dropped-MAY clauses; none is
    our fault.
  🛑 **The dirty-checkout rule DEADLOCKED THREE SESSIONS AT ONCE on
  2026-08-17 — and the defect is UPSTREAM, not in our copy.** Atelier's rule
  keys on the **item's file**: *"If the item's file itself is dirty: that is
  positive proof the other session is queue-active — sync, take the next open
  item, touch nothing."* This board is **monolithic** — `docs/ROADMAP.md`,
  5,402 lines, 53 claimable items, one file, no `docs/roadmap/`, no
  `board.py` — so the item's file simply **is** `ROADMAP.md`, and our inlined
  line is a *faithful* application. **The yield branch is what does not
  generalise:** "take the next open item, touch nothing" silently assumes the
  next open item lives in a *different* file, which is true on a split board
  and false on ours. So both halves point at one file and the rule collapses —
  *take the next open item* names the file *touch nothing* just forbade, and a
  session can claim nothing at all while any peer holds the queue file, which
  is most of the time at five live sessions.
  🔑 **An initial reading of this as "we mistranslated it" was WRONG and was
  corrected by a peer who went and read the source rather than taking the
  claim on trust.** Atelier's parenthetical — *"(the item's file, and **on a
  split board** the generated index with it)"* — is a conditional that
  contemplates both board shapes; it never completes the thought for the
  monolithic one. **Getting the attribution right is the whole practical
  difference:** filed as a local wording bug it sends the fix to the wrong
  file and leaves every other monolithic-board adopter in the same trap.
  🔎 **The strongest form of the argument is that atelier is internally
  inconsistent, not merely silent.** Its *first* branch already sanctions
  hunk granularity in as many words — *"stage and commit the claim alone,
  nothing else … safe because it stages only your own hunks"* — and its rebase
  guidance is line-granular (*"put the `[~]` on the item's checkbox line so a
  same-item collision always fires on one line"*). The yield branch is the one
  place the passage jumps to **file** granularity. ⚠️ That checkbox-line
  sentence is about *rebase-collision granularity*, not about whether a dirty
  file bars a write — it is evidence that the unit is coherent, not a
  statement of the yield rule. Say so when putting it up; it is an
  extrapolation, and a good one, but not a quotation.
  🔎 **Empirical, from the same day, and it cuts BOTH ways — neither half may
  be dropped.** *For* the line-level unit: a peer did exactly this, twice,
  writing four claim releases into `ROADMAP.md` while another session's hunks
  sat in the same file, staging its own alone via
  `git apply --cached --unidiff-zero`; the stranger's work was untouched and
  `78bd39e` landed clean. **Against it:** an index collision happened *anyway*
  — for about a minute the index held both sessions' work sets, and
  hunk-staging did not prevent it. What caught it was
  `git diff --cached -U0 | grep '^@@'`, and nothing else; `git status` looked
  normal throughout.
  🛑 **So the honest proposal is CONDITIONAL and weaker than "the line is the
  unit": the relaxation is safe only if a pre-commit index check ships WITH
  it.** The file-level rule was accidentally doing that protective work —
  crudely, by keeping everyone out. Relax it without making the index check
  compulsory and five sessions will land each other's half-written hunks under
  the wrong commit message. And make the test **mechanical, not spatial**:
  `git diff -U0 docs/ROADMAP.md`, then check whether any hunk header's line
  range intersects your item's line range. "Nowhere near" degrades as the file
  grows and gives different readers different answers; an intersection test
  gives every reader the same one, which is the property the current clause
  lacks.
  🔑 **The generalisation that matters more upstream than our instance does.**
  The yield branch's hidden assumption is not *"split board"* — it is *"the
  next open item lives in a different file"*. Read the first way it sounds like
  a niche gap; read the second it is universal, because an adopter comparing
  itself against the words "split board" may not recognise itself. 🚩 **And the
  timing is the trap:** a repo is most likely to be monolithic **early**, when
  it has one file, few items and one session — exactly when the rule looks
  theoretical and costs nothing to adopt. It bites when they scale to parallel
  work, the worst possible moment to find the concurrency rule does not close.
  This repo is that story: the clause was inlined 2026-08-16 and deadlocked
  three sessions the next morning, its first day under real parallel load.
  🔑 **Two method failures from the same episode, recorded because they are
  about how corroboration broke rather than about CF3.** (1) *Two sessions
  agreeing is not corroboration when the second never opened the source.* The
  mistranslation claim was asserted by one session, backed with fresh evidence
  by a second, and refuted by a third that actually read `CONCURRENCY.md`.
  Two-of-three agreement felt like confirmation and was one unread claim with
  an echo. (2) *A symptom count locates a fault's existence, never its site.*
  "Three independent readers all stalled on this clause" is strong evidence the
  deadlock is **real** — and no evidence at all about **which file** the defect
  lives in. It was offered, and received, as settling both.
  🤔 **And the framing to put to the owner honestly: the monolith is the root
  cause.** Every claim collision, the `SHELL_VERSION` collisions, the
  ADR-number collisions and this deadlock are one shape — a shared mutable
  file with no per-item granularity. A line-level patch makes the monolith
  *survivable*; it does not fix the rule. The split board is the fix atelier
  already has.
  🔎 **We also inlined half of `RECORD`'s CI rule.** Our close clause ("the
  all-clear cites the pushed CI result, or flags it pending") is beyond the
  region and faithful — but it drops the sub-rule that makes it work: *a
  cancelled run is not a result, and a concurrent session cancels yours as a
  matter of routine*. Under five parallel sessions that is the routine case,
  not the exotic one, so the clause we kept can be satisfied by evidence the
  source explicitly rejects. Enriching past the region means owning the whole
  clause.
  ✅ **`00-APEX`: no drift.** Both 2026-08-15 changes are correctly carried,
  and the removed Laws section left no residue (grepped: zero hits).
  🎯 **Three decisions, all the owner's — raised 2026-08-17, none actioned.**
  (a) Re-word the dirty-checkout clause for a monolithic board so claiming
  stays possible; the honest reading is that the *item's line* is the unit, not
  the file — which matches atelier's own instruction to put the `[~]` on the
  item's checkbox line. (b) Add the cancelled-run sub-clause, or drop our CI
  clause back to the region's wording. (c) Decide whether we keep forking the
  apex and `Source & drift` wording deliberately (and record why) or
  re-converge before ST3 lands and `stampscan` starts reding it.
  🚩 **ST3 is still OPEN** — re-checked 2026-08-17: atelier's own roadmap
  carries it as `- [ ]` (D2 residue), corroborated by its own tool
  documentation ("that is ST3, still open") and its changelog. Markers still
  cannot be adopted here; the hand-check remains the only mechanism.
  🛑 **And the documented drift command is INOPERABLE from a worktree, which is
  this repo's default mode for all write-heavy work.** `git -C "../atelier"`
  resolves to `/Users/mike/.pets/atelier` from the primary checkout and to
  `/Users/mike/worktrees/atelier` — which does not exist — from any worktree.
  It fails **loudly** (`fatal:`, rc=128) rather than silently, so it is not a
  textbook decorative guard; but **both** readings of its output are wrong.
  Read as stdout only — the commit list the instruction tells you to read — it
  is *empty*, byte-identical to a genuine clean run. Read as all output, the
  `fatal:` line trips the stated rule that *"any output means the house
  doctrine moved"*, a false positive. Worktrees live at `~/worktrees/`,
  outside the tree, by deliberate decision. Nothing automates this: there is no
  pin or drift script in `tools/` at all.
  🚩 **Three findings owed upstream to atelier** (queue-never-deliver; nothing
  to fix here), handed to the live atelier session 2026-08-17: the region's own
  `Source & drift` command is `git -C <path> log --oneline <SHA>..HEAD` — **no
  fetch, and `HEAD` not `origin/main`** — so every child on the floor ships the
  exact stale-checkout silent-pass this repo diagnosed and fixed locally on
  2026-08-09; the region's *"Everything recoverable — commit/push/PR included —
  just proceed"* sits against `RECORD.md`'s *"Recoverability of bytes is the
  wrong test for a record store"* with no boundary drawn between them; and CF3
  itself may want an explicit monolithic-board branch.
  🚩 **A FOURTH, queued 2026-08-17 — atelier's branch-protection check is
  specified to catch the wrong failure, and this repo is the counterexample.**
  AP1's open "machine-check half" (`docs/roadmap/140-…/010-the-machine-check-half…`)
  owes *"a parent-row check reading branch-protection/ruleset state and going
  **RED when absent**"*, on the reasoning that *"nothing would notice if the
  ruleset were deleted"*. **On faves that check would report GREEN today.**
  `protect-main` is present and `active` — so a presence test passes — while
  the **last 100 ruleset evaluations on `main` were 100 bypasses**, because
  `bypass_actors` carries `RepositoryRole 5 → always`. 🔑 **Present is not
  enforcing, and absence is the failure mode that already raises its hand** —
  a deleted ruleset is loud, a permanently-bypassed one is silent and looks
  identical to a working one from outside. The absences-raise-their-hands
  doctrine needs its second limb: **a control that exists but cannot change any
  outcome is the same defect as one that is gone**, which is ADR 0072's
  decorative-guard rule arriving at the branch-protection layer.
  ⚠️ **The interaction is the other half, and neither end records it.** C4
  (*"make the local bypass visible"*) reasons about `--no-verify` on the stated
  premise *"with CI as backstop rather than gate"* — and here CI is not a
  backstop either, since two of its six jobs could not block a push until this
  was found. **Two bypass layers, each of whose write-ups assumes the other one
  holds.** Evidence is this repo's own state on 2026-08-17, measured by three
  independent sessions, not testimony.

✅ **THE DEBT BELOW IS DISCHARGED — pin bumped `19eb0e2` → `0af3006` with the
re-inline in the same commit, 2026-08-17.** The floor region's diff across that
range was taken directly (`floor:begin`/`floor:end` extracted at both SHAs and
diffed, rather than reading the method files and hoping), and it is exactly two
edits: the always-confirm floor gains *re-brief **before** the irreversible
action, never after*, and the concurrency bullet gains the three channel
sentences. Both are now inlined verbatim. **And the owner ruled the two open
decisions the same day:**
- **(b) the cancelled-run sub-clause: ADDED.** Our close clause enriches past
  the region, and enriching means owning the whole clause — without it, ours
  was satisfiable by exactly the evidence the source rejects.
- **(c) the two forks: KEPT, with the reason recorded in `CLAUDE.md` itself.**
  `Source & drift` is ours and is the *better* text (the region's command has no
  fetch and reads bare `HEAD` — the stale-checkout silent pass this repo already
  diagnosed), so converging would adopt a known defect; the apex substitution is
  richer rather than corrective and is kept for the same reason it was written.
  Recorded at the point of use so `stampscan`'s future red has an answer waiting
  instead of an argument.
- **(a) the dirty-checkout wording: MOOT.** The split board landed 2026-08-17,
  so the inherited rule is correct *as written* and needs no local re-wording —
  which is what the owner ruled when he chose the structure over the reword.

✅ **Second bump, `0af3006` → `e2fddc5`, 2026-08-17 (`8d38afc`) — re-inline in
the same commit, as this item instructs.** 18 commits; three touch
`docs/method/`, one binds. **BS1** (atelier `431f1f7`) corrects the very clause <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
(a) was raised about, and the correction runs *opposite* to the direction this
item argued for: not "the line is the unit, relax it", but **"a dirty item state
line anywhere under `docs/roadmap/` stops claiming from that checkout"**. The
reason is one our own analysis missed — a claim on a split board is never the
claim line alone, it carries the regenerated index, and `board.py rebuild` reads
the *worktree*, so a sibling's uncommitted state line is absorbed into the index
you commit and published under your name. 🔑 **The `board` hook check cannot see
it, because worktree and index agree** — which is precisely the conditional
index check this item proposed as the price of relaxation, shown to be
insufficient at the plane it runs on. Verified the seam is ours and not
inherited prose: `.githooks/pre-commit` runs atelier's `floor.py --plane hook`,
so faves gets exactly the check BS1 describes.
🚩 **The other two method changes are NOT inlined, deliberately** — `GUARDS.md`'s
fourth requirement (*every guard declares whether it makes the failure cheap or
forbids the act*) and `PRINCIPLES.md` §10 *Posture*. Atelier queued its own
board pass rather than sweeping in the sitting that wrote the rule; the same
holds here, and this repo has ~20 guards on the verify list plus
[ADR 0072](../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)
already standing next to the question. Queued as its own item, not smuggled into
a pin bump. **Neither is in the canonical floor region**, so this is not new
drift in the stamped copy — it is inherited doctrine owed a local application.

⏳ **The debt as it stood (2026-08-17), kept because the shape is the lesson:**
atelier added a clause to the **canonical floor region** at
`46dd5a0`, so this repo's inlined block gains **three sentences** the next time
the pin moves. Two sessions relayed it independently and both confirmed the same
thing: **nothing reds a commit today**, because the pin here is `19eb0e2`, which
predates the clause — verified by atelier in `stampscan` rather than assumed.
🎯 **Whoever bumps the pin: re-inline and re-stamp in the same commit.** That is
exactly the failure this item exists to name — a stamped copy drifts silently,
and a bump that moves the pin without moving the text converts a known debt into
an invisible one.

🔎 **And the reason the clause exists is this repo's own incident.** faves'
parallel-session practice is now atelier doctrine (`CONCURRENCY.md` § The
channel, `46dd5a0`): a message reserves nothing, only a pushed artefact does ·
the closing check runs **after** the push · a repair is itself a claim and needs
a tie-break both parties compute identically (fewer inbound references moves —
cheapest repair, not precedence). It was ratified because the session
*broadcasting* that rule collided anyway, and then both parties politely
renumbered to the same next number. **A rule learned by the party already
following it is worth more than one reasoned out** — and the corollary for this
item is that our inlined copy is now downstream of doctrine we wrote.
