- **2026-07-08 (cheap-eats picker mode, Theme 5)**: Finished the last open
  piece of the price work — a **💸 "Cheap eats" toggle inside "Pick for us"**
  that narrows the shuffle to the **$** band. New pure predicate
  `isCheapEats(record)` in `price.js` (`priceBand()?.band === "$"`, so it's
  self-consistent with the card chip; a null-band venue is deliberately *not*
  cheap — "no tag = not stated", we can't vouch it is). The `initPicker`
  candidate closure now takes `{ cheapOnly }` and filters the *filtered* set
  before the availability preference, so a closed cheap place still beats an
  open pricey one within the mode; flipping the toggle re-rolls immediately;
  an empty cheap set gets its own "turn off Cheap eats or widen" nudge.
  Reused `.list-toggle` styling (aria-pressed) — one small `.picker-opts` row,
  positioned to clear the absolute close button. Against real data the cheap
  set is 3 venues (Khandallah Trading Co, Takeaway @ Churton, Thai Tara
  Express); 18 signal-less stubs correctly excluded. Browser-verified via CDP
  at 390px (reduced-motion for deterministic instant lands): toggle ≥44px and
  clear of the close button; 40 rolls with cheap ON landed *only* on $ venues
  (the open ones), 60 rolls with it OFF spread across 21. node --test
  108→110 pass; validate + check_no_deps clean. VERSION → 2026-07-08.27
  (price.js/picker.js/app.js/css/html). CHANGELOG + ROADMAP updated (item
  done; curated price override still open).
