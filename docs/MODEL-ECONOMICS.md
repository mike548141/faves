# Model & token economics — working policy

How to split work between Claude models on this repo, and how to keep
sessions token-efficient. Adopted from the `ros`/`tiki` repo's policy
(2026-07-08) and adapted to a small, build-less static site. Prices are
public API list prices — re-check them if this is more than a few months
old.

## The two billing pools

| Pool | Models | Marginal cost of a token |
|---|---|---|
| Plan-included | Opus 4.8 (and Sonnet/Haiku) | Zero dollars, but draws down plan usage limits |
| Usage-billed | Fable 5 | Real money: $10/M input, $50/M output (thinking bills as output and is always on) |

Reference prices (per M tokens, in/out): Fable 5 $10/$50 · Opus 4.8
$5/$25 · Sonnet 5 $3/$15 · Haiku 4.5 $1/$5. Cache reads ≈ 0.1× input
price; cache writes ≈ 1.25× (5-minute TTL).

## Who does what

- **Opus 4.8 (plan)** — the workhorse. Building screens, menu-data
  transcription, the service worker, tests, docs, exploration, long
  agentic sessions — anything mechanical or high-volume. This is a small
  static site: almost all of the work lives here. Burning plan quota on
  iteration is fine; burning Fable dollars on it is not.
- **Fable 5 (usage-billed)** — the reviewer and hard-problem solver:
  pre-launch code/doc review, accessibility and performance sign-off,
  and debugging Opus is stuck on. **Keep Fable sessions short and
  pre-scoped** — hand it the diff / specific files, not the repo. Ask for
  findings, not rewrites; apply the fixes back on Opus. A scoped review
  (~100k in, ~20k out) is ≈ $2; an unscoped repo-walk costs several times
  that for no extra insight.
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
