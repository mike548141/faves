## 2026-09-24-0335 — session `26e43c41` (faves-62) close: the owed merge landed, by a peer, in the same checkout, at the same minute

Closing addendum to the 2026-09-20-2254 record. Asked "ready to close?" on
2026-09-24, the honest answer was no — `spicy-option-chip` was still owed —
so this session started the merge in the primary checkout at 15:25 NZST.
Peer session `faves-1b` (Opus), picking the same handover up, started the
same merge in the **same** checkout at the same minute. It aborted the merge
it found live, redid it from scratch, and its `3db205f` landed first; this
session's commit failed on a missing `MERGE_HEAD`. Its commit is correct
(SHELL `2026-09-24.1` + DATA `2026-09-20.2`, README 0119 → 0120 → 0121,
index rebuilt) and is on `origin/main`, verified by the remote ref. It also
removed the last worktree and the branch. **Neither session was wrong; the
checkout was the seam** — one primary checkout with two live finishers is the
hazard `CONCURRENCY.md` names, and "finish an owed merge" is exactly the small
job a session does *without* taking a worktree.

🔎 **The finding, faves-1b's, recorded here with credit because it is about the
floor's own rule.** Its `git add site/sw.js` picked up **this session's**
re-resolution of that file (written at 15:26, seconds after finding the first
one reverted by the peer's abort), so the peer committed a value it had not
chosen and did not notice. It *had* read the staged index first — as
`git diff --cached --stat`, which showed `site/sw.js | 3 +-`, byte-identical
to what its own resolution would show. **`--stat` cannot distinguish a peer's
resolution of a file you also touched from your own; only `git diff --cached`
shows the content.** This session read `--stat` before every commit here too
and would have said it had read the index. The floor says "read the whole
staged index"; both sessions satisfied the letter with the one form that
cannot catch this.

Owed and reassigned by agreement over the peer channel: the corroboration to
atelier `320/160` goes to `faves-1b` after its `470/030` allergen work. CI
on `3db205f` was in progress at close; cited pending. Nothing else open:
tree clean, no stash, no branch but `main`, one worktree and it is the peer's.
