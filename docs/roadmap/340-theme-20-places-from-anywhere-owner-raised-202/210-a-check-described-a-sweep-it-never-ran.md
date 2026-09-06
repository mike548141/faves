- [x] 🛑 **`to_top_check` described a sweep it never ran, and its key assertion
      enforced the bug the owner later reported** `[S][tools]` — found
      2026-09-07 (session faves-24) while building `300/020`. ✅ **Fixed in the
      same change** (`4e64fc1`); filed because the *shape* outlives the fix.

  **What CLAUDE.md said**, and what a roadmap item and an ADR both quoted
  forward: *"sweeps the **whole document** in 37 px steps at two widths and two
  text sizes … It caught the back-to-top button owning the tap on a dish price
  at 100% of its width, mid-scroll, at **96 of 547 scroll positions**."*

  **What the shipped tool actually did:** sampled **five fixed depths —
  700, 1400, 2500, 4000, 6000 — at 390 px only.** No 37 px step, no second
  width, no second text size. "96 of 547 scroll positions" describes a sweep the
  committed code never performed.

  🛑 **And the part that did real harm.** Its down-scroll assertion read
  `showedWhileDescending.length === 0` — it asserted the button was **NOT**
  shown while descending. So when the owner asked on 2026-09-07 for the arrow to
  appear on the way down, **the check was actively defending the behaviour he
  was complaining about**, and any session that "just made it show" would have
  been met with a red check telling it the site was wrong.

  🔑 **The class, which is why this is filed rather than just fixed.** A check's
  *description* is not evidence about the check — and this description was
  load-bearing in three places (CLAUDE.md, the roadmap, an ADR), each of which
  quoted the previous one. **Nobody opened the file.** That is
  [ADR 0072]'s decorative-guard pattern one level up: not a guard whose verdict
  is independent of what it guards, but a guard whose *reputation* is
  independent of what it does.
  🚩 It also means the historical figure **"96 of 547 (17.6%)" cannot be
  reproduced** and should stop being quoted. The rebuilt sweep measures **151 of
  537** occluded positions on the menu at 390 px / 16 px — a different and
  genuinely swept number, on a corpus that has itself moved (21,330 px of
  document where the old note said 21,667 px).

  ✅ **What it is now:** a real sweep — **8 combinations (390/1200 px × 16/24 px
  text × menu/home), 3,452 positions**, run inside the page so it stays
  affordable, **64 assertions**. The direction assertion is inverted to match
  the new ruling and was break-probed by reintroducing the old tuck: 24
  failures across all three direction-sensitive assertions in all 8
  combinations, while **the occlusion assertion stayed green** — which is itself
  the proof that the old check was satisfiable by deleting the feature.

  📋 **The general remedy is not obvious and is not proposed here.** Options a
  future session might weigh: have each check *print* its own sweep parameters
  in the summary line so the description can be checked against a run; or treat
  any prose count in CLAUDE.md as needing a reproducing command beside it. Both
  are house-shaped questions rather than ours — see the pointing-up route.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
