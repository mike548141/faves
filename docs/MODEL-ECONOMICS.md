# Model & token economics — working policy

How to split work between Claude models on this repo, and how to keep
sessions token-efficient. Adopted from the `ros`/`tiki` repo's policy
(2026-07-08) and adapted to a small, build-less static site. Prices are
public API list prices — re-check them if this is more than a few months
old.

## Billing states — corrected 2026-08-09

The 2026-07-08 version of this file claimed a two-pool split with "Fable =
usage-billed, real money". **That was falsified in July 2026** when the
provider moved Fable into the operator's plan; the correction is atelier
decision `2026-07-23-0001` and the reworked `atelier docs/method/ECONOMICS.md`,
which this section now follows rather than restates in full:

- **Billing state belongs to the marginal token, not the model.** Three
  states — plan-included · plan-included-capped · usage-billed. As of
  2026-07, Fable is **plan-included under a capped share** and draws the
  shared allowance faster than other models (premium draw); past the cap
  its next token becomes usage-billed. Read the state off the *current
  plan* (entitlements live in the estate root), never off habit or this
  file.
- **The cap is a stop-or-pay boundary, never a down-tier trigger.**
  Quality never decays because the tank is low: stop/delay the work, or
  the owner chooses to pay. (Owner ruling, quoted in the atelier
  decision.)

Reference API list prices (per M tokens, in/out — for sizing, not billing
state): Fable 5 $10/$50 · Opus 4.8 $5/$25 · Sonnet 5 $3/$15 · Haiku 4.5
$1/$5. Cache reads ≈ 0.1× input; cache writes ≈ 1.25×.

## Who does what — risk assigns the seats; billing only prices them

- **The orchestrator is the owner's choice per session** (often Fable; his
  call, 2026-08-09), and it may build with **any** model — the rule is to
  use the model that is *capable of* and *matched to the risk of* the work,
  per atelier ECONOMICS/AUTONOMY, not a fixed mapping.
- **Building** — screens, menu transcription, the service worker, tests,
  docs, exploration, long agentic sessions — belongs on the cheapest-
  drawing tier that genuinely does it (usually Opus here; Sonnet/Haiku are
  the third seat for fan-out reads and routine well-floored items).
- **Review and hard problems** belong to the capable tier, whatever its
  current billing state. **Keep reviews short and pre-scoped** — hand over
  the diff / specific files, not the repo; ask for findings, not rewrites;
  apply fixes back on the building model.
- **Hand-ups are noisy.** A model past its depth states what exceeded it
  and routes up (workhorse → capable tier → owner). Silent stalls and
  quietly degraded attempts are the forbidden failure mode.
- **`/code-review ultra`** is a billed, multi-agent cloud review — treat
  it like a Fable session: run it on a focused branch/diff before launch,
  not speculatively.
- **Subagents (Explore, etc.)** — use them for fan-out reading/searching
  so the expensive main context stays small. Matters most in Fable
  sessions (e.g. sweeping all 13 menu files, or the CSS, for one fact).

## Session hygiene (both models)

1. **One task per session.** Context is resent (cached) every turn; a
   pivoted session drags the old task's tokens along. Wrap up (append a
   `docs/SESSIONS.md` entry), start fresh.
2. **Never switch model mid-session.** The prompt cache is per-model — a
   switch re-processes the whole context at full input price and loses
   thinking continuity. Switch at session boundaries.
3. **Cache TTL is 5 minutes.** During active work, gaps longer than that
   re-write the cache (full input re-read). Matters most on usage-billed
   sessions.
4. **Watch context growth.** When a session feels long, log it in
   `docs/SESSIONS.md` and restart.
5. **Heavy skills are episodic costs.** A skill invocation (e.g. the
   claude-api or deep-research reference) can inject 50–100k tokens.
   Fine when needed; don't invoke speculatively, especially not in Fable
   sessions.
6. **Point, don't paste.** Give file paths and line ranges rather than
   pasting content the model can read itself — reads are targeted; pastes
   live in context forever. (This is also why menu photos go in `intake/`
   and get transcribed, not pasted.)

## Fixed per-session overhead (measured 2026-07-08)

A session following `CLAUDE.md` loads: system prompt + tools (~17k
tokens), both CLAUDE.md files (~2.6k), the memory index (~0.1k), then the
required doc read path — STRATEGY (~1.1k) + ARCHITECTURE (~2.2k) + DESIGN
(~0.8k) + WORKPLAN (~2.5k) + the SESSIONS tail (~0.7k). Roughly **27k
tokens before any work happens**.

Keep it that way. Bulk must not accumulate in the every-session read
path: session narrative goes to `docs/SESSIONS.md` (append-only,
tail-read only), completed build detail stays as terse checkmarks +
notes in `WORKPLAN.md`, deliberation goes to `docs/decisions/` (read on
demand, not every session). If `WORKPLAN.md` or `ROADMAP.md` ever bloats
the read path the way `ros`'s roadmap once did (210 KB → split into
lean + done + specs), split it the same way. The ceiling is soft — cost
is linear, not a cliff — so never sacrifice clarity to hit a number; the
real rule is that logs and completed detail don't sit in the hot path.

## Rules of thumb

- 4 characters ≈ 1 token; 1 KB ≈ 250 tokens.
- Fable output (incl. thinking) is 5× Fable input — keep a Fable session
  cheap by asking narrow questions of a lean context.
- VS Code vs terminal makes no difference to token economics; the levers
  are session scope, context size, and model choice.
