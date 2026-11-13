- **2026-08-09 (four-stream parallel build — Fable 5 orchestrating, Opus 4.8
  building)**: 🚀 **Four roadmap features shipped in one session** via four
  worktree-isolated Opus agents, each Fable-reviewed and merged sequentially:
  **UI-state preservation** across the safety re-render (wt: faves-ui-state —
  `ui-state.js` brackets the untouched `render()`; 23/23 CDP checks, 9/23
  against the old tree; found+fixed the `showModal()` scroll-to-0 and
  smooth-scroll-hijack bugs) · **Units** (wt: faves-units — ADR 0029, km↔mi +
  °C↔°F at render only; 459-string temp-transform audit, exactly 14 rewrites) ·
  **Report a problem** (wt: faves-report — ADR 0028, Theme 4c: ⚑ from dish/venue
  /⋯, owner-ruled compose-and-share, never-a-live-edit; found the `.order-head`
  double-definition) · **Import + transfer** (wt: faves-personal-io — ADR 0030
  *proposed*, Theme 12b + Theme 9 v1 on one `planImport`/`applyPersonalData`
  seam; collision rule widened on evidence — every device's first profile id is
  `default`, so same-name-different-id was the wrong test; QR ceiling measured
  at ~4 favourites → active-profile links). Merged main: **483/483 unit tests,
  device_check 15/15, validate/no-deps/SBOM clean**, SHELL `2026-08-09.9`,
  deploys `a06c8af` → `8b6585e` → `e92db87` → `3bf72b6`.

  **Concurrency, lived:** a parallel session merged Theme 16 + device-check +
  coord-audit into main mid-session (took ADR 0027 → personal-io renumbered to
  0030 in flight); claims in ROADMAP kept the lanes clean; every conflict
  (sw.js × 3, settings-ui, reo, menu, app.css tail, CHANGELOG, ROADMAP, ADR
  README) was both-sides-additive. ⚠️ Two lessons that cost real time:
  `git pull --rebase` **after creating a local merge commit** tries to flatten
  the merge and replays the branch into conflict — fetch + inspect + push (or
  merge origin) instead, keep `pull --rebase` for session start; and two
  sessions' dev servers collided on one port, so one agent's first headless run
  silently verified the *other session's* build — worktree runs need distinct
  ports. Two agents were killed mid-run by transient API 5xx errors; both
  resumed cleanly from a verify-your-worktree-state-first prompt with nothing
  lost. Also fixed: stray `</content></invoke>` tool artefact at the tail of
  ADR 0026 (corruption, not substance).

  ⏳ **For the owner:** ratify ADR 0030 (merge-default/replace-confirm, id+name
  collision rule, allergen keep/theirs/combine, active-profile transfer) and the
  smaller calls — ui-state chip-*delta* rule, 5°F rounding (`OVEN_STEP_F` to
  flip), redundant °F brackets in `cook-at-home.json`, report ⚑ placement/copy —
  plus ~25 new draft reo strings queued for native review (`tahua kai` and
  `hapa` flagged). Real-phone passes owed: import/transfer on iOS, a camera QR
  scan, the report share sheet on a real device.

