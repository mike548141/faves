# 0019 — Ratings: 1–5 star scale on a tap/drag slider, placed by the name

**Status**: accepted
**Date**: 2026-07-23

## Context

ADR 0013 shipped personal + curated ratings on a **1–3** scale rendered as
**three toggle buttons** (☆☆☆). On owner review of the live site (2026-07-23),
three problems:

1. **Scale too small / unclear.** "They don't make an obvious scale — they could
   be read as 3 hollow stars in a line rather than a 1–3 rating." The owner wants
   **1–5**.
2. **Too much space.** Three 44px button targets are bulky on a dish row.
3. **Confused with the heart.** On a dish row the rating sat immediately beside
   the ♥, and "the rating and the heart next to each other is confusing."

ADR 0013 had *rejected* 1–5 ("false precision on a gut call") and chosen three
buttons. The owner has now overridden both calls. This ADR supersedes ADR 0013's
**scale (1–3)** and **control shape (three buttons)** decisions; everything else
in ADR 0013 stands — curated-vs-personal distinctness, per-profile local-only
storage, no averaging/sharing, public/crowd ratings still rejected.

## Decision

**(a) 1–5 scale**, shared by personal and curated marks (one vocabulary:
Poor / OK / Good / Great / Best). `ratings.js` `MAX` 3 → 5; `validate.py` curated
`rating` 1..3 → 1..5. Old stored 1..3 marks stay valid (within 1..5) — **no
migration**. Curated `rating` ships dormant still (no data), so nothing to
re-key.

**(b) A slider, not five buttons.** The personal control is one `role="slider"`
star track — a single 44px-tall target you **tap or drag** across to set 1–5:

- Five 44px button targets (220px+) don't fit a 390px dish row beside ♥ + Add,
  and read as five separate toggles, not one scale. A slider is compact
  (~140px), unmistakably a star scale, and natively supports the tap-*or*-drag
  gesture the owner suggested.
- **Pointer:** tap a star or drag across the track; live preview under the
  cursor/finger, commit on release. `touch-action: none` so a horizontal drag
  rates rather than scrolls.
- **Keyboard:** ←/↓ step down (past 1 clears), →/↑ step up, Home/End = 1/5, digit
  keys 1–5 set directly, Backspace/Delete clears. `aria-valuenow` /
  `aria-valuetext` ("3 of 5 — Good" / "Not rated") + a polite live region.
- **Clear** stays a discoverable ✕, shown once a rating exists.
- A light scale-up on hover/focus is the "expand on interact" cue; suppressed
  under reduced motion.

**(c) Placement: rating by the name, not by the heart.** On dish rows the rating
moves to its own line **directly under the dish name** (`.dish-rating`); the ♥
and Add stepper stay together as the action cluster. The rating is an identity
mark on the dish, so it belongs with the name — and the ♥/rating confusion goes
away. The venue header already carried its rating under the title
(`.menu-rating-row`), unchanged.

## Rejected

- **Keep 1–3 / three buttons (ADR 0013).** The owner reviewed the live UI and
  rejected both. This ADR is that override.
- **Five individual star buttons at 1–5.** Fails the ≥44px-target rule on width
  in a dish row (5 × 44 = 220px) and still reads as separate toggles. The slider
  is one target and reads as a scale.
- **A single star that expands to a slider popover** (an option floated to the
  owner). More novel and more moving parts (popover, focus trap) than the inline
  slider, for no clearer result. The inline track already gives a compact idle +
  tap/drag.
- **A segmented 1–5 number pill.** Reads as a scale but is more utilitarian and
  loses the star affordance people already parse instantly.
- **1–10 scale.** Even more false precision on a household gut call (ADR 0013's
  reasoning, still sound at the top end).

## Consequences

- `ratings.js` `MAX = 5`; `ratings-ui.js` rewritten from three `aria-pressed`
  buttons to a `role="slider"` track (pointer + keyboard). `curatedRating`
  renders five glyphs. `menu.js` lifts the dish rating to a `.dish-rating` row
  under the name and drops it from `.dish-actions`.
- Docs/tests updated: `ARCHITECTURE.md` schema `1..5`, `validate.py` range,
  `ratings.test.js` upper-range coverage. `reo.js` "Our rating" label unchanged
  (scale words are interpolated English, per the reo boundary).
- Reversibility unchanged from ADR 0013 (two JS files + one field check + one CSS
  block). The store change is backward-compatible; a rollback to 1–3 would only
  need to clamp any new 4/5 marks down.
- The curated feature stays **dormant** until the owner supplies real 1–5 values
  (honesty floor — no fabricated ratings).
