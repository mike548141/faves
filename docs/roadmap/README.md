# Faves ROADMAP — the board

**One file per item** (owner-ruled 2026-08-16; atelier's board-store ADR
2026-08-15 is the shape). Each item lives in `<NNN>-<section>/<NNN>-<slug>.md`:
its checkbox line first, detail beneath, its own `git log` as provenance —
which commit flipped its state, and what work that commit carried. Each
section's narrative lives in that section's `README.md`.
[`../ROADMAP.md`](../ROADMAP.md) is the **generated index** — never hand-edited.
Edit an item, then rebuild:
`python3 "${ATELIER_TOOLS:-$(git config hooks.atelierTools)}"/board.py rebuild`
— the tool is atelier's and this repo does not vendor a copy of it, so the
command resolves it the same way `.githooks/pre-commit` does. It is the same
line the index's own banner prints, so either one can be pasted.
The `board` floor check blocks a commit whose index is stale, and
after a merge conflict on the index **rebuilding _is_ the resolution**. The
session-start read is the index; open item files on demand.

The current work plan (Phases 0–7 in [`../WORKPLAN.md`](../WORKPLAN.md)) takes
us to a launched, installable, offline menu browser. This board is what comes
**after** — the owner's roadmap brain-dump, grouped into themes, sequenced, and
checked against the hard constraints (zero-build, offline, static, no backend,
no accounts, no personal data in the repo). Nothing here changes v1 scope.

## Legend

Effort **XS/S/M/L**. Checkbox states:

- `- [ ]` **open** — work still owed.
- `- [x]` **done** — no more work owed. A done item **stays in its own file**;
  there is no harvest step and nothing moves. The index renders it `✅`.
- `- [~]` **part-done or claimed**, and the two are told apart by what the item
  says, not by the marker. A **claim** names a date and a worktree
  (`CLAIMED YYYY-MM-DD HH:MM UTC (wt: …)`) — leave that item alone, even if told
  to take it. Everything else marked `[~]` is simply partly delivered, with the
  remaining parts named inline; that one is free to pick up.
- `- ⏳` **waiting on someone** — the pointer names the delta and the intent
  record, nothing evaluative.

**Claiming, now that the store is split.** The claim edits **the item's own
file** on `main` before the worktree, and is pushed immediately. Two sessions on
different items touch different files and cannot collide; two sessions on the
*same* item collide on the same line, which git shows you. If an item's file is
dirty, that item is taken — go to the next open one. (Before the split this rule
read "if `ROADMAP.md` is dirty", which with one file and ~53 claimable items
made every claim unreachable while any session held it; three sessions were
blocked simultaneously on 2026-08-16. The split is what makes the inherited rule
correct as written.)

**Where the pre-split archive lives.** [`../ROADMAP-DONE.md`](../ROADMAP-DONE.md)
is **frozen** as the verbatim record of everything harvested before the split.
Nothing is added to it again.

Tags: `[schema]` needs a data-model change (record in `ARCHITECTURE.md` when
built); `[design]` needs a design call; `[constraint]` sits in tension with a
hard constraint or non-goal — resolution noted inline; `[content]`/`[data]`
needs facts we don't have yet, usually from the owner or an in-store visit;
`[docs]`, `[js]`, `[css]`, `[reo]`, `[ux]` name the surface that changes.

Marks: **⚑** a decision only the owner can make · **🎯** the specific ask now
sitting with the owner · **🚩** be aware of this · **🔎** a finding ·
**⏳** waiting on someone.

## On "no backend" (owner steer, 2026-07-09; updated 2026-07-23)

The stance softened from *never* to *not yet*: a lightweight backend (e.g. a
Cloudflare Worker) is an acceptable **future** direction — live group-order
rooms, feedback intake — but adopting one is a deliberate step that needs its
own ADR first ([ADR 0009] records the steer).
**Now gated open for sync:** [ADR 0017] adopts a Cloudflare Worker + KV
for cross-device sync and formally softens the non-goal — a *serverless
backend is permitted*; *accounts are deliberately not adopted* (a bearer
sync-code carries it); off-device data *must* be end-to-end encrypted.
Other backend-gated items (live rooms, feedback intake, the Google-rating
edge proxy) revisit against that precedent — each still its own ADR.

[ADR 0009]: ../decisions/0009-group-orders-share-urls-not-connections.md
[ADR 0017]: ../decisions/0017-cross-device-sync-encrypted-blob-bearer-code.md
