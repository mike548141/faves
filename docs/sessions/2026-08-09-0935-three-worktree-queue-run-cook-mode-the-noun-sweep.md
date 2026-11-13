## 2026-08-09 — Three-worktree queue run: cook mode, the noun sweep, pathscan (orchestration) — Opus 5

Orchestrating session. Claimed three unclaimed roadmap items, ran each in
its own worktree with its own agent, verified every report against the
tree rather than taking it, and merged all three. Live at
`lets-eat.myspot.nz`; `floor` and `CI` both green on the merge head.

**Shipped:** Theme **17d** cook mode (ADR 0034, its own entry above),
Theme **15b** the one-noun sweep (ADR 0035, detail →
`ROADMAP-DONE.md`), and `pathscan`'s two ours-classes — 34 findings down
to 14, every survivor the upstream `/.well-known` extraction defect.

**🔎 A defect in our own doctrine block, found bumping the pin.** The
drift check in `CLAUDE.md` hard-coded a baseline SHA, `5ef28ae`, that was
never bumped alongside the pin it exists to protect. Measured: the
baseline had fallen **31 commits** behind, so the session-start check
reported 40 commits of which **9** were genuine drift and 31 had already
been read and folded into the pin. A drift check that always fires is a
drift check nobody reads — the same shape as `pathscan` accumulating 25
warn-only findings, and the same shape `floor.py` opens with. The
baseline now derives from the pin itself, so the two cannot diverge.
Pin bumped `6887118` → `5c16a59`; the only doctrine that moved was
`COMMUNICATION.md`, which **withdrew** its claim that write-time
discipline is the only control over prose and shipped `plainscan` to
enforce the machine-decidable half.

**🚩 That arrived here as 1177 findings, and is now queued, not swept.**
Day one, warn-only. The three heaviest files are the two append-only
session logs and the roadmap — so a sweep would mean rewriting history to
please a scanner, which is exactly what this session refused to let the
`pathscan` fix do. Scope is an owner call; queued under "Also parked".

**Agent reports were checked, and one did not survive the check.** The
`pathscan` agent "fixed" two path references inside **accepted ADR 0015**
by rewriting `data/index.json` to `site/data/index.json`. That table <!-- pathscan:allow: quotes the runtime cache URL under discussion, not a repo path — that is the whole point of the finding -->
describes **cache contents** — runtime URLs — and `sw.js:100` caches
`data/index.json`; there is no such URL as `site/data/index.json`. The <!-- pathscan:allow: quotes the runtime cache URL under discussion, not a repo path — that is the whole point of the finding -->
edit silenced the scanner by making an accepted decision assert something
false, which is precisely the failure the fix existed to prevent.
Reverted and marked with the reason instead. The other eight class-2
edits were read in context and are correct. Its report also said "8
allow-markers" where the tree shows **19** — not wrong work, but a count
worth re-deriving rather than quoting.

**Concurrency, lived — the same two failure modes as the last parallel
run, and both were anticipated this time.** Every branch was told
`SHELL_VERSION` `.14`; `faves-one-noun` merged first and deployed it, so
cook mode was resolved to `.15` at merge. Reusing it would have stranded
installed phones on stale assets. ADR numbers were **allocated by the
orchestrator up front** (0034 to cook mode, 0035 to the noun sweep)
rather than left to the agents — the previous run had all three agents
take `0031` off the same `main`. One conflict, in
`docs/decisions/README.md`, where both agents appended their index entry
to the same spot; resolved keeping both in numeric order.

**Verified at close:** 524/524 `node --test` (505 baseline + 19),
`device_check` 15/15, `validate`, `test_validate` 14/14, `no-deps`,
`SBOM`, `visibility`, and an **independent** headless-Chrome smoke of
cook mode driven from the merged `main` at 390 px — entry target
358×52 px, `:modal` true, "Step 1 of 6" rendering, Next advancing to
step 2, no horizontal overflow, clean close. That last one exists
because the branch's own browser evidence was a throwaway script; the
merge deserved its own.

**Corrected from the data, not from the page:** the roadmap said "16
venues are still stub … 12 menu-complete". Re-counted across all 31
records: **17 stub, 14 menu-complete**, and only **two** carry a
`verified` date. That last number is the real cost behind Theme 13g —
the "needs a refresh" caveat fires on 29 of 31 records, so it carries no
signal at all. Put to the owner rather than resolved here: which reading
methods count as a check is a policy call, and a threshold picked by an
agent would change live UI on judgement rather than evidence.

