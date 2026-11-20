**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 71+1 -->
- [2026-07-08 · 2026-07-08 (navigation fixes + a batch of roadmap capture)](2026-07-08-archived-016-2026-07-08-navigation-fixes-a-batch-of-roadmap.md) — archived entry, verbatim in its file

- **2026-07-08 (navigation fixes + a batch of roadmap capture)**: Owner
  flagged that returning to the main list from the favourites view wasn't
  discoverable (pressing the toggle again works but isn't obvious) and
  wanted the "Faves" heading to act like an iPhone home button. Built both:
  the **"Faves" wordmark is now a home link** (`app-home-link`) — on the
  home screen it exits any open search/favourites view and smooth-scrolls
  to top (`wireHomeButton`), and it's a plain `index.html` link if JS is
  off — and the favourites panel gained an explicit **"‹ All places"** exit
  button (`favourites-done` → `open(false)`). Browser-verified at 390px:
  "All places" and the home wordmark both drop the favourites view back to
  the grid; toggle un-presses; href falls back to index.html. VERSION →
  2026-07-08.20 (no new modules). node --test 100 pass; validators clean.
  **Roadmapped a large owner brain-dump** (not built, captured with honest
  constraint analysis): dietary/allergy *preferences* + personal local
  **tag overrides** (Theme 5); **nest dishes under their venue** in the
  favourites view, an **overflow "⋯" menu** consolidating favourites +
  settings (leaving list filters as-is per owner), collapse the menu
  "needs a refresh" caveat into an **ⓘ disclosure icon**, **order-online
  buttons as a logo'd right-column** on wide screens, a more prominent
  **"← All restaurants"** back link, and a **page footer** (privacy note +
  "made by cakeIT") — plus **pick-along-a-route** (Theme 2, logged prior
  entry). Confirmed the app already ships a full favicon/icon set. Pushed
  earlier batches (702c572 etc.) to origin/main.
