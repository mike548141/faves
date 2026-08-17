The current work plan (Phases 0–7 in `WORKPLAN.md`) takes us to a
launched, installable, offline menu browser. This is what comes **after**
— the owner's roadmap brain-dump, grouped into themes, sequenced, and
checked against the hard constraints (zero-build, offline, static, no
backend, no accounts, no personal data in the repo). Nothing here changes
v1 scope.

**Legend.** Effort **XS/S/M/L**. Checkbox: `- [ ]` open · `- [x]` / ✅ done,
harvested to [`ROADMAP-DONE.md`](../ROADMAP-DONE.md) leaving a one-line pointer ·
`- [~]` **part-done or claimed**, and the two are told apart by what the item
says, not by the marker. A **claim** names a date and a worktree
(`CLAIMED YYYY-MM-DD HH:MM UTC (wt: …)`) — leave that item alone, even if told
to take it. Everything else marked `[~]` is simply partly delivered, with the
remaining parts named inline; that one is free to pick up.
Tags: `[schema]` needs a data-model change (record in `ARCHITECTURE.md` when
built); `[design]` needs a design call; `[constraint]` sits in tension with a
hard constraint or non-goal — resolution noted inline; `[content]`/`[data]`
needs facts we don't have yet, usually from the owner or an in-store visit;
`[docs]`, `[js]`, `[css]`, `[reo]`, `[ux]` name the surface that changes.
Marks: **⚑** a decision only the owner can make · **🎯** the specific ask now
sitting with the owner · **🚩** be aware of this · **🔎** a finding ·
**⏳** waiting on someone.

**On "no backend" (owner steer, 2026-07-09; updated 2026-07-23).** The
stance softened from *never* to *not yet*: a lightweight backend (e.g. a
Cloudflare Worker) is an acceptable **future** direction — live
group-order rooms, feedback intake — but adopting one is a deliberate
step that needs its own ADR first ([ADR 0009] records the steer).
**Now gated open for sync:** [ADR 0017] adopts a Cloudflare Worker + KV
for cross-device sync and formally softens the non-goal — a *serverless
backend is permitted*; *accounts are deliberately not adopted* (a bearer
sync-code carries it); off-device data *must* be end-to-end encrypted.
Other backend-gated items (live rooms, feedback intake, the Google-rating
edge proxy) revisit against that precedent — each still its own ADR.

---
