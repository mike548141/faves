- [ ] ⏳ **Cold review owed: ADR 0169 and the HEIC EXIF reader**
      `[M][review]` — filed 2026-11-15 at the close of session `1bdd7eb4`.
      ⏳ **Waits on the owner's Fable approval** (his standing ruling: no Fable
      work, reviews included, without it). Briefed 2026-11-15 (below); a
      brief is not that approval.

  **What earns a review (REVIEW.md § calibrate to risk):**
  - **ADR 0169** — a design every later stage of Theme 41 builds to, and it
    forecloses the hierarchy. A cold reader should check it against his two
    messages (Theme 41 README) for anything stronger than his words, and
    against ADR 0011, 0003 and 0047 for collisions.
  - **`tools/intake_exif.py`'s HEIC reader** (session `2026-11-14-0340`) — a
    hand-written ISO-BMFF box walk feeding `check_provenance.py`, a
    silent-failure surface: a wrong date makes a stale menu read fresh.
    Verified then against macOS's own conversion on 19 photos, which is one
    device and one iOS version.

  **Not owed, and why:** `tools/gen_summaries.mjs` changed only a comment;
  `docs/decisions/README.md` only gained the 0169 index line, which
  `check_decisions.py` gates.

  review: queued
  (`docs/reviews/2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`,
  one pass over ADR 0169 and `426abe4e` together, with a held-back sibling).
  Brief written 2026-11-15 1855 UTC by a headless brief-writing session
  (Claude Opus 5.5, `980835bb`), started by session `21a271a5`; neither is
  an author. Barred from the pass: `1bdd7eb4`, `21a271a5`, `980835bb`.
  Tier at selection: Fable.
  **Fable-gated: the pass runs only on the owner's explicit approval.**
