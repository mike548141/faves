- [~] ⏳ **Cold review owed: ADR 0169 and the HEIC EXIF reader**
      **Review pass claimed 2026-11-22T20:16Z** by a headless per-pass
      orchestrator (Claude Opus 5.5; an off-tier orchestrator under rule
      4, which holds the context partition, forms no finding and writes no
      severity),
      started by drain session `eca14b23` (Opus 5.5) in the owner's weekly
      Fable drain. The reviewer is one Fable 5.1 sub-agent, tier checked at
      selection. Neither session wrote the brief, built either subject or
      is barred by it. The ⏳ wait below is met by the owner's drain order
      of 2026-11-23 08:26 NZDT, verbatim: *"Start a fable drain or whatever
      it is called now. Target 100% of weekly budget by 11.30am NZT todat"*
      (it lapses at the reset, 2026-11-23 12:00 NZDT; a pass already
      running may finish). The verdict is recorded here.
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
