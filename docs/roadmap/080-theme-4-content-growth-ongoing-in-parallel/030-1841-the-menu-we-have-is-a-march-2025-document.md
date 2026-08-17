- [ ] **1841 — the menu we have is a March 2025 document** `[S][content]`. The
      only published menu is a PDF on the venue's own site whose embedded
      `/CreationDate` is **2025-03-27**, and the prices are stored as a dated
      series carrying that date (ADR 0023). `verified` is the day we *read*
      it, so `refreshCaveat` treats it as fresh and shows no caveat — which is
      the known weakness of `paper-menu` (ADR 0031: "as old as the document").
      One in-store price check clears it. 🚩 The general gap — a freshly-read
      but staledly-dated document reads as current — is raised under Theme 13
      rather than patched for one venue.
