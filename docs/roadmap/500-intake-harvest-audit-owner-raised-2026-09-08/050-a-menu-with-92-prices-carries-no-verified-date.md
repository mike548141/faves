- [~] 🔎 **A complete menu carries no `verified` date, and three older menu
      photo sets have no price history** `[S][data]` — found 2026-09-08 by the
      intake audit (session faves-o1).

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — owner
  authorised this one directly. Delivered by a sub-agent in its own
  worktree (`faves-o1-spices-verified`, branch `spices-verified`), landing by PR.

  **(a) `spices-indian.json` has `verified: null` and `verifiedBy: null`**,
  with `status: "menu-complete"` and **92 priced items**. Its intake
  photographs are EXIF-dated 2023-11-28 and 2026-07-06. Every other venue with
  intake photographs got its date stamped, and the audit matched capture date
  to `verified` date exactly on **12 of 13** venues — this is the thirteenth.
  A menu with no date cannot age, so `refreshCaveat` says nothing about it.

  **(b) Three older photo sets have no `data/history/prices/` file:** KC Cafe
  (9 photos, 2015), R&S (1, 2017), Spices (2, 2023). Whether those prices were
  ever read and found unchanged, or simply never read, is **unknown** — nothing
  records either. Churton's 2019 pair ✅ *was* recovered (174 rows, `816cb7e`),
  which is the proof the recovery is possible and worth doing.
  🚩 KC Cafe's menu was restructured between its first commit and now — only
  **10 of 169** items share a section-plus-name key — so the missing layer
  cannot be recovered by diffing the record. It has to come off the photographs.
