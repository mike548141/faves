- [ ] **`picks` are empty on most venues** `[S][content]` — **44 of 55**
      (measured 2026-08-16). ⚠️ One of the two venues this line named was never
      true: Takeaway @ Churton has carried three picks since the commit that
      transcribed it, *before* this line was written — a transcription error at
      write time, not staleness, and it has been misdirecting the worklist ever
      since. Gold Lining is genuinely still empty. `picks`
      drives the "our picks" surface and `validate.py` warns on each empty
      one, so the warnings are the worklist. Owner-supplied only: these are
      *our* favourites, not a guess from the menu.
