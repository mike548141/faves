- [x] ⚑ **A shut seven-branch chain now says "Permanently closed" eight times**
      `[XS][ux]` — the deliberate consequence of `040`'s engineering half,
      shipped 2026-08-19 and raised rather than tuned on a guess.

  The header banner says it once, then every branch heading repeats it. On a
  390 px screen that is a lot of the same sentence. **It is plain and
  unmissable, which was the point** — the bug being fixed was a card that said
  "Open" on every branch of a closed chain, and under-correcting it is how that
  comes back.

  ✅ **DELIVERED 2026-09-07 (session faves-24, merged `a3e232c`).** One token
  (`--warn-soft`) and one rule: branch-row closures render at 12 px / weight 500
  / muted warn; the banner keeps 12.8 px / 600 / `--warn-ink` on a tinted block.
  **The statement stays on every row**, so `040`'s decision 2 is not pre-empted.
  `branch_check` went 72 → **84 assertions**; re-run on merged `main` to confirm
  it holds outside its own worktree.
  🔑 **Muting is size + weight + chroma, never grey** — *"red, not grey"* is the
  owner's own 2026-08-16 ruling on this same badge, so the hue stays in the warn
  family rather than draining to a neutral.
  🔎 **Contrast MEASURED, not assumed** (computed style in headless Chrome, WCAG
  relative luminance, against the first ancestor that actually paints — the
  badge's own parents are transparent): light **5.92:1**, dark **6.83:1**,
  against a 4.5:1 floor; the header banner sits at 11.11 / 12.19. Lowest ratio
  against any background the badge can land on, including the row's hover state:
  **5.09:1**. Both themes were *emulated* in the check rather than inherited from
  the machine — the first attempt silently read the operator's OS dark palette,
  which is the failure mode this note exists to stop recurring.
  ✅ **All four new assertions break-probed**, each failing only its own: removing
  the size/weight levers, doubling the lead row while keeping the card-wide total
  unchanged (proving the assertion is stricter than the pre-existing count), and
  setting `--warn-soft` to a *pleasing* 3.91:1 grey-pink in light and 3.19:1 in
  dark — each fails exactly the AA assertion and nothing else.
  🚩 **A NINTH OCCURRENCE EXISTS THAT THIS ITEM NEVER COUNTED** — the sticky
  contact bar (`site/js/menu.js`) says the same sentence at full weight. The item
  names eight. Left at full weight deliberately: it is a *different surface*, not
  one of the eight, and muting it was not what was ruled. Filed rather than
  decided — see `060` in this section.
  📌 **On the sequencing worry:** `040` says *"Do `050` **after** this, not
  before."* Read closely, `040` names **option 2** as the one that would have to
  be undone once closure is per-branch. **Option 3 is the sequencing-safe
  option** — it keeps the statement on every row, touches no JS, and is scoped to
  the two lifecycle states inside `.contact-branch`. When per-branch closure
  lands, the only question is whether to drop the muting, which is a taste call,
  not rework.

  ✅ **RULED 2026-09-06 — OPTION 3: A MUTED STYLE FOR THE REPEATS.** Full weight
  on the header banner, subdued on the branch rows. The owner took the option
  that keeps the statement on every row — so it stays correct the day closure
  becomes per-branch, and `040`'s decision 2 is not pre-empted — while stopping
  it shouting the same sentence eight times on a 390 px screen. Option 2
  (heading only) was declined precisely because a reader who scrolls into one
  branch row would see no closure at all.

  🎯 **Owner's taste, and it interacts with `040`'s decision 2.** Options:
  1. **As shipped** — say it on every row. Nobody can miss it, and it stays
     correct the day closure becomes per-branch.
  2. **State it on the "Branches" heading only**, leaving the rows bare. Quiet,
     but a reader who scrolls into one branch row sees no closure at all.
  3. **A muted style for the repeats** — full weight on the header, subdued on
     the rows. Splits the difference and costs a CSS rule.

  🔑 **Why this waits on decision 2 rather than being settled now:** if closure
  becomes per-branch, the repeats stop being repeats — each row would then be
  saying something the header cannot say. Choosing 2 now would have to be
  undone then.
