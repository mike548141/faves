- **2026-08-09 (three-line queue run — Fable 5 orchestrating, Opus 4.8
  building)**: 🚀 **Theme 16 shipped, the device check exists, and the
  coordinate audit closed with a reversal.** Three claimed lines, each an
  Opus agent in its own worktree, Fable-reviewed and merged serially:
  **PWA updates** (wt: faves-pwa-updates — 16a resume check throttled
  through one gate; 16b "A newer version of Faves is ready" notice, never
  an auto-reload; 16c force-refresh in Settings → Your data, offline is a
  refusal and the personal layer untouchable;
  [ADR 0027](../decisions/0027-pwa-update-flow.md) drops the unconditional
  `skipWaiting()` — a new worker holds in `waiting` until the tap) ·
  **device check** (wt: faves-device-check — `tools/device_check.mjs`,
  headless Chrome over raw CDP on Node's own WebSocket, zero npm; 15/15
  assertions incl. a negative control; the live allergen re-highlight is
  now **device-confirmed**, closing the 2026-07-24 ruling) ·
  **coordinate audit** (wt: faves-coord-audit — `tools/audit_coords.py`,
  39 pins vs their own addresses via Nominatim).

  🔎 **The audit's premise was wrong, and that is the finding**: R & S's
  pin is **1 m** from 148 Cuba St — the "~100 m off" was the maps app <!-- leakscan:allow: venue business address as the worked example — same product class as site/data (ADR 0022 gate 1) -->
  reverse-geocoding our pin, which ADR 0016's address-string handoff had
  already fixed. 36/39 pins fine (33 within 2 m), **zero corrected**;
  four McDonald's branches gained house-level coords (Courtenay Place
  honestly left null — road-centreline only). Full method + drift table:
  [reviews/2026-08-09-0207-coordinate-audit.md](../reviews/2026-08-09-0207-coordinate-audit.md).

  **Concurrency, lived (the other half of the four-stream session's
  account):** claims at 0153 and 0202 partitioned two live sessions
  cleanly — zero duplicated work. The dirty-tree backstop fired once
  (mid-merge, foreign edits in the primary checkout) and resolved itself
  when the other session committed seconds later. One self-inflicted slip
  caught before push: a hand-resolved CHANGELOG conflict left its
  `<<<<<<<`/`>>>>>>>` markers in place — the floor doesn't scan for
  conflict markers, so the grep-after-resolve habit is load-bearing.
  Merged tree verified whole: 483/483 tests, device_check 15/15,
  validate/no-deps/SBOM/leakscan `--require-terms` clean, SHELL
  `2026-08-09.9` / DATA `2026-08-09.4`.

  ⏳ **For the owner:** (1) this deploy still lands the *old* way on
  installed phones (the old worker has no notice UI) — one last
  kill-and-relaunch, then every later update shows the 16b notice; the
  acceptance case (background the PWA, push a change, foreground it) is
  now testable for real. (2) The private leakscan term list collides with
  a street that ships in `site/data` (a tj-katsu branch) — same shape as
  the settled suburb trap; the audit doc worked around it by aggregating
  the row, but the standing tension is yours to resolve. (3) Queued
  16f: About's stamp can run ahead of the page under a waiting worker.
  (4) Four draft reo strings from the update notice await the reo
  review — `putanga` for software "version" is the shaky one.

  **Addendum (same session, after owner Q&A):** two rulings taken and applied
  on the faves side. (1) **Model economics**: `MODEL-ECONOMICS.md` still
  taught the falsified 2026-07-08 "Fable = usage-billed" split and misled
  this session's own challenge to the owner — corrected against atelier
  decision `2026-07-23-0001` (billing state belongs to the marginal token;
  risk assigns seats; the orchestrator is the owner's per-session choice and
  may build with any model matched to capability and risk). Atelier pin
  bumped `5ef28ae` → `4cab670` after reading both method deltas; the
  PRINCIPLES §9 retrofit ruling names this repo's bare `verified` flag, so
  Theme 13f is queued. (2) **Leakscan terms**: the owner ruled the
  published-business-address class wants **per-term scoped allowances, as
  narrow as possible** (e.g. allow "Churton Park" only against that venue's
  records, still firing anywhere else) — reversing the removal half of the
  2026-08-06 suburb settlement once the mechanism exists, and covering the
  tj-katsu street the same way. **The mechanism is an atelier build**
  (rides atelier's queued C5 term-scoping item) — deliberately *not*
  recorded or built there from this session after the owner's correction
  that faves lives within the doctrine and does not create it. Until it
  lands, docs here keep writing around those two terms.

