# Model & token economics — repo-local facts only

The doctrine lives up, not here. Billing states, seat assignment (risk
assigns the seats; billing only prices them), the hand-up ladder,
sub-agent economics and session hygiene are atelier
`docs/method/ECONOMICS.md`, read at the pin in `CLAUDE.md`; entitlement <!-- pathscan:allow: atelier cross-repo path — exists in atelier's docs/method/, not this repo's tree -->
numbers (the plan, its cap share, prices) are person-local in the estate
root. Never trust a restatement of any of that in this file: the
2026-07-08 version restated the billing model, drifted 17 days behind a
provider change, and misled a session into arguing from a falsified
fact — so it was trimmed to repo-local facts on the owner's DRY ruling
(2026-08-09). What remains is only what atelier cannot hold: this
repo's own measurements and applications.

## Applying the seats to this repo

- A small, build-less static site: nearly all work is build-tier —
  screens, menu-data transcription, the service worker, tests, docs,
  `intake/` transcription, long agentic queue runs.
- The orchestrator is the owner's per-session choice, and it may build
  with any model — match the model to the work's capability needs and
  risk (owner ruling 2026-08-09, recorded in `SESSIONS.md`), never a
  fixed model-to-role mapping.
- Reviews stay scoped and short: hand the reviewer the diff / named
  files, not the repo; ask for findings, not rewrites. `/code-review
  ultra` is a billed multi-agent cloud review — run it on a focused
  branch/diff before launch, not speculatively.

## Fixed per-session overhead (measured 2026-08-17, was 2026-07-08)

The 2026-07-08 figure below was **re-measured on 2026-08-17 and found
about 2× low** — found by the three-day cold review, checked here by
re-deriving it rather than copying either number. Byte counts are real
(`wc -c`), converted at this file's own 4 chars ≈ 1 token:

| Component | 2026-07-08 | 2026-08-17 |
|---|---:|---:|
| system prompt + tools | ~17k | ~17k (not independently re-measured here) |
| both CLAUDE.md files | ~2.6k | **~11.6k** (repo 9.5k + global 2.1k) |
| memory index | ~0.1k | **~2.1k** (8.5 KB) |
| STRATEGY.md | ~1.1k | ~1.1k (4.6 KB) |
| ARCHITECTURE.md | ~2.2k | **~16.0k** (64.1 KB) |
| DESIGN.md | ~0.8k | ~1.3k (5.3 KB) |
| WORKPLAN.md | ~2.5k | ~2.9k (11.5 KB) |
| SESSIONS.md tail | ~0.7k | ~0.7k (a tail read, not the 130k-token whole file) |
| **Total** | **~27k** | **~53k** |

The growth is not mostly `ARCHITECTURE.md` as the headline "2×" framing
suggests in isolation — that file alone accounts for +13.8k of the +26k
move, with the two `CLAUDE.md` files (+9k) and the memory index (+2k)
making up most of the rest. All three grow by accretion every session, so
**this number has the same shelf life this repo's own ADRs keep finding
in their measurements** ([0068](decisions/0068-the-home-list-ranks-on-one-blend.md),
[0080](decisions/0080-a-venue-has-menus-plural.md)): re-run it, don't cite
it forward.

A session following `CLAUDE.md` loads: system prompt + tools, both
CLAUDE.md files, the memory index, then the required doc read path —
STRATEGY + ARCHITECTURE + DESIGN + WORKPLAN + the SESSIONS tail. Roughly
**53k tokens before any work happens.**

Keep it that way. Bulk must not accumulate in the every-session read
path: session narrative goes to `docs/SESSIONS.md` (append-only,
tail-read only), completed build detail stays as terse checkmarks +
notes in `WORKPLAN.md`, deliberation goes to `docs/decisions/` (read on
demand, not every session). If `WORKPLAN.md` or `ROADMAP.md` ever bloats
the read path the way `ros`'s roadmap once did (210 KB → split into
lean + done + specs), split it the same way. The ceiling is soft — cost
is linear, not a cliff — so never sacrifice clarity to hit a number; the
real rule is that logs and completed detail don't sit in the hot path.

## Repo-local habits

- Point, don't paste: menu photos and scans go in `intake/` and get
  transcribed into the schema — never pasted into context.
- 4 characters ≈ 1 token; 1 KB ≈ 250 tokens (for sizing the read path).
