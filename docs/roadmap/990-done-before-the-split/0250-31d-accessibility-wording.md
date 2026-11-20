- [x] ✅ **31d — accessibility wording** — **DONE 2026-08-16** (`cfc9309`).
  Every off-site link the menu screen renders — ordering, the venue's own
  website and the pickup/maps link — now carries a visually-hidden
  " (opens in a new window)": the literal **WCAG G201** wording, naming only the
  guaranteed behaviour and never the app switch, exactly as this item argued.
  Guarded by a **source** test (`tests/menu-link-warning.test.js`) because
  `menu.js` touches `document` at module load and cannot be imported under
  `node --test` in a zero-dependency repo — the same reasoning that made 15y's
  guard a source test. Proved by deleting the warning and watching it fail.
  Original text: WCAG **G201** advises warning
  before a link opens a new window; there is **no** technique for "may switch to
  a native app" — the standard predates it. The defensible reading: warn about
  the guaranteed behaviour (leaving the site), never promise the app switch.
  Also note both platforms let the user permanently choose "open in browser"
  (Apple documents that iOS *"examines the user's recent choices"*), so **two
  people with identical phones can correctly get different behaviour.**
