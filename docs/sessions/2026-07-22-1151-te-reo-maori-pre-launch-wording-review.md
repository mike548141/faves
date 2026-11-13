## 2026-07-22 — Te reo Māori pre-launch wording review — Opus 4.8

Ran the reo **wording review** owed since 2026-07-09 (worktree
`faves-wave5-reo-review`, branch not merged). Reviewed **all 68** shipped te reo
strings (`reo.js` `MI` table) + the language-option labels. Record:
[`docs/reviews/2026-07-22-1148-reo-wording-review.md`](../reviews/2026-07-22-1148-reo-wording-review.md).

**Findings:** macrons/tohutō **clean across the board** (zero fixes — the first
pass was careful); standard UI terms match attested mi-NZ localisation
(*Tautuhinga*, *Tāpirihia*, *Muku*, *Tiaki*, *Whakakore*, *Katia*). **59 kept,
0 wording changes, 9 flagged** for a fluent speaker (`app.sub` tagline,
`search.clear`, `service.takeaway`, `makau` for Favourites, `pick.empty`
*panoni*-vs-*kōwhiri* calque, **`rating.our` *whakatauranga* noun uncertain**,
`profile.choose`, `profile.browsingAs` *hei*-frame). Made **no** speculative
changes — honesty floor: I'm an AI, not a fluent speaker.

**One real code fix (a11y):** the engine flipped `<html lang>` to `mi` wholesale,
so screen readers mispronounced all the English fall-through (menu/venue/safety
text) as Māori. Now WCAG 2.2 SC 3.1.2 *Language of Parts* — root stays `en-NZ`,
`translate()` stamps `lang="mi"` per translated element, lossless revert. Also
reinforced the safety-boundary comment at the `MI` table head.

**Verified:** `validate.py`, `check_no_deps`, `gen_sbom --check`, `node --test`
(239 pass), `node --check reo.js` — all green. **SW VERSION `.71 → .72`** (bumped
once in the site-touching commit). **NOT browser-exercised** (no headless
browser): the lang stamping + switch-back are logic/syntax-verified only — worth
a VoiceOver/TalkBack pass at 390 px before launch.

🎯 **Owner option outstanding:** a fluent-speaker review of the 9 flagged strings
before the public push. This pass raises the floor; it is **not** a reo sign-off.
Branch pushed, **not merged**. Commits: a11y+reo mechanics (+sw bump), docs close.

