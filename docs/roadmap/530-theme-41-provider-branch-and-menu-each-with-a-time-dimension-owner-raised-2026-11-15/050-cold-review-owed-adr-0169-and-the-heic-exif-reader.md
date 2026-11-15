- [ ] ⏳ **Cold review owed: ADR 0169 and the HEIC EXIF reader**
      `[M][review]` — filed 2026-11-15 at the close of session `1bdd7eb4`.
      ⏳ **Waits on the owner's Fable approval** (his standing ruling: no Fable
      work, reviews included, without it). No brief written yet.

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
