- **2026-07-22 (Fable orchestrator + Opus build agents: the seven-wave
  queue run)**: First orchestrated queue run on faves — Fable orchestrating
  (claims, merges, verification, deploys), sequential Opus agents building in
  worktrees (sequential because every wave touches `sw.js`'s lockstep VERSION;
  parallel waves would conflict). Per-item close throughout: claim `[~]` on
  main → worktree → build → verify → merge --no-ff → full suite on main →
  push (= deploy) → worktree/branch deleted. Shipped: **wave 0** atelier pin
  d371169→9e7e031 + floor-block refresh; **wave 1** maps directions handoff +
  ~drive-time hint (ADR 0010) + Cook-at-Home grid position; **wave 2**
  multi-location schema (ADR 0011) + the owner's nearest-first sort bug (root
  cause: key order, not text compare) + serve.py --help; **wave 3**
  device-local profiles (ADR 0012); **wave 4** per-profile 1–3 ratings +
  dormant curated schema (ADR 0013, ⚑ ratification owed); **wave 5** reo
  wording review ran (0 macron fixes, 9 flags for a fluent speaker, real
  lang-of-parts a11y fix); **wave 6** pick-along-a-route (ADR 0014);
  **wave 7** split shell/data SW versioning (ADR 0015, owner's idea same-day).
  Tests 176→266, all invariants green after every merge, SW `.67`→`.74`
  (split). Owner's two mid-run notes captured raw and actioned/queued same
  session. Post-run harvest: seven ✅ blocks → ROADMAP-DONE (367→316 lines).
  ⚠️ Common caveat across waves: agents had no headless browser — DOM/AT
  behaviour is logic/serve-verified only; a real-device pass on profiles,
  ratings, along-route and the SW upgrade is the standing owner acceptance.
  ⚠️ Atelier drifted again mid-run (its own orchestrated run + a queue-run
  doctrine cold pass, cycle open on a MAJOR) — pin left at 9e7e031
  deliberately; next session's drift check picks it up. Remaining queue is
  owner-gated (decisions/intake) except personal tag overrides `[M]`, left
  for a fresh session on economics.

