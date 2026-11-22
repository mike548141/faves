- [ ] 🎯 **Cold review owed: ADR 0169 and the HEIC EXIF reader**
      ✅ **PASS RAN 2026-11-22 (UTC), Fable 5.1, act 1 and act 2, sibling
      folded.** Verdict: the ADR stands as the owner's model and the reader
      returns what the file holds on every real file; not yet fail-closed on
      hostile input. **Tally: 0 MAJOR · 7 MINOR · 5 NOTE.** No standing
      MAJOR, so the review cycle closes (`REVIEW.md` § *The lifecycle*).
      Verdict, findings F1–F12, the folded sibling and the reviewer's log:
      `docs/reviews/2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`.

      🎯 **Owed to the owner (asked here, not waited on), F1, MINOR:** ADR
      0169 says a provider has at least one Branch and one Menu, but 10 of
      66 venue files are stubs with an empty menu. (a) an empty Menu counts:
      the rule is on the relationship, `validate.py` checks "at least one
      menu" at stage 1, all 66 files stay valid; (b) a stub provider may have
      no Menu while it is a stub, so the rule becomes conditional; (c)
      enforce it as written and fill or retire the ten. Reviewer's
      recommendation: (a), one sentence in the ADR, because it keeps his
      rule unconditional at no data cost.

      **Routing, the author's to apply (not the owner's):** F2 (cite
      `renames.js` and the venue `formerIds` in consequence 1 before stage
      1 is briefed, or truck hearts go dark); F5, F6, F7 (bound the `iloc`
      and IFD walks, catch malformed input per file, add a fixture test:
      one small change to `intake_exif.py` plus one test); F8, F9 (partial
      multi-extent reads; format by suffix rather than bytes); NOTEs F3,
      F4, F10, F11, F12. Not yet filed as items.

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

  review: done 2026-11-22 (UTC), result above; was queued
  (`docs/reviews/2026-11-15-1855-adr-0169-and-heic-exif-reader-cold.md`,
  one pass over ADR 0169 and `426abe4e` together, with a held-back sibling).
  Brief written 2026-11-15 1855 UTC by a headless brief-writing session
  (Claude Opus 5.5, `980835bb`), started by session `21a271a5`; neither is
  an author. Barred from the pass: `1bdd7eb4`, `21a271a5`, `980835bb`.
  Tier at selection: Fable.
  **Fable-gated: the pass runs only on the owner's explicit approval.**
