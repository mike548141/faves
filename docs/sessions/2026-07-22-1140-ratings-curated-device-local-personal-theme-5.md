## 2026-07-22 — Ratings: curated + device-local personal (Theme 5) — Opus 4.8

Built ROADMAP Theme 5 "Ratings / feedback" as the recorded recommendation
**(a)+(b), not public** (ADR 0013). **(b) local personal ratings — full:** a new
per-profile store `ratings.js` (`faves.ratings.v1`, `{key:1..3}` keyed like
favourites, clamped/0-clears on read+write, added to `SCOPED_BASE_KEYS`) + a
keyboard-operable ☆☆☆ control `ratings-ui.js` (three `<button>` toggles, 44px,
`aria-pressed`=filled, a polite live summary, its own ✕ clear) on the venue
header and every dish row. **(a) curated household rating — schema+render only:**
optional integer `rating: 1..3` on venue + menu items, `validate.py` enforced
(`check_rating`), rendered where picks render + on the header as a static "Our
rating" pill. **No rating data invented** — (a) ships dormant. Curated vs
personal kept visually distinct: personal = interactive, label-free, cool
`--personal` violet; curated = static `--accent` pill with an "Our rating" label
(colour + chrome + interactivity, never colour alone). Reo: `rating.our` (draft).

**Verified:** `node --test` **239 pass** (new `tests/ratings.test.js`: clamp/
clear/idempotence, corrupt-payload sanitise, subscribe, and a per-profile
isolation test over the `scopeKey` seam); `validate.py`, `check_no_deps`,
`gen_sbom --check` all green; `check_rating` exercised via import over accept/
reject cases + an end-to-end fixture run (inject `2`+dish`3` → pass; `5` →
rejected) reverted with **no data committed** (validate has no test seam); every
changed module `node --check`ed; module graph import-smoke-tested; served
locally — `restaurant.html`, `js/ratings.js`, `js/ratings-ui.js`, `css/app.css`
all 200, rating CSS present. **SW VERSION `.70 → .71`** (bumped once in the final
site commit; both new modules added to SHELL). **NOT browser-exercised** (no
headless browser here): the control's tap/keyboard interaction, `aria-pressed`/
live-region announcements, dark-mode + reduced-motion, and the curated pill's
dormant render are logic-/syntax-/served-verified only — worth a real mobile pass
before launch. **Owner calls outstanding:** ⚑ (1) **ratify the (a)+(b)-not-public
direction** — still owed; (2) **supply curated `rating` values** — (a) shows
nothing until then; (3) the live-Google-rating edge function stays separate +
owner-gated on billing (out of scope here). Commits: store `+profiles`, UI+menu+
css+reo, validate+ARCHITECTURE, sw bump, this docs close.

