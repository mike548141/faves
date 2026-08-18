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

🛑 **THIS VOCABULARY IS ATELIER'S, NOT OURS — owner-ruled 2026-08-18.** *"Changing
the standard on the roadmap content is an atelier job, not something for Faves or
any of the child repo's to change or extend."* A child raises **problems and
opportunities, with solution options**; atelier may use them, adapt them, write
its own, or decline. So the four states below are **quoted from the parent**
(`../../../atelier/docs/roadmap/README.md`) and are not to be extended, narrowed <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tree, not this repo's -->
or reinterpreted here. Anything that looks wrong about them goes **up**, by
`PROPAGATION.md` § *Pointing up*: read the parent's actual file first, then file <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
an item in **atelier's** board. Three are filed there as at 2026-08-18 —
`roadmap/310-pointing-up-the-child-to-parent-route/060` (the vocabulary is too
narrow to index by), `070` (the two divergences below), `080` (a capture that
mis-attributes a proposal to the owner).

**The bracket is a work-owed tri-state, never a disposition** (Mike's ruling in
atelier, **2026-07-23** — he chose *"Keep three"* over *"Extend to five"* when it
was put to him; 2026-07-22 is when the question was *captured*). It answers one
machine-checked question — *is work owed?* — and there is no fourth bracket. The
**disposition is said in the item's own text as a dated note**.

- `- [ ]` **work still owed.**
- `- [x]` **no more work owed** — *"delivered, superseded, or declined, with the
  disposition said in the item's own text (a dated note), never a fourth
  bracket"*.
- `- [~]` **claimed** by a live parallel session — *"don't start a `[~]` item;
  take the next open one"*.
- `- ⏳` **review queued** for a non-author to take, on the principal-named
  review tier; *"the pointer is refs only"*.

⚠️ **THIS REPO'S BOARD DIVERGES FROM THAT ON TWO MARKERS, AND THE DIVERGENCE IS
IN USE RIGHT NOW.** Stated rather than quietly repaired, because repairing it
either way is a standard change and this repo does not make those.
- **`[~]`** — items here use it for *part-done* as well as *claimed*, and treat
  a non-claim `[~]` as free to pick up. The parent says **don't start a `[~]`
  item**. A session that follows the parent literally will skip work this board
  believes is available.
- **`⏳`** — items here use it for *waiting on someone* (the owner, usually). The
  parent means **review queued under REVIEW.md rule 4**, which this repo does not
  run. Three items carry the local sense.
📌 **Until atelier rules, read a `[~]` or `⏳` item's own text before acting on
its marker** — pending-upstream, dated 2026-08-18, waiting on atelier's
`310/060` and `310/070`. This line is a **narrowing**, which a child may always
make; it is dated, addressed and self-removing, and it goes at the pin bump that
carries the answer (`PROPAGATION.md` § *Pointing up*, step 3). A <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
pending-upstream line that survives that pin bump is drift.

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
