- **2026-07-12 (Opus: the #7 cleanup block from the Fable review)**: Cleared the
  quality/dedup set the review deferred, in five focused commits (each verified
  over CDP with the SW bypassed so tests hit current files, not stale cache — a
  trap the first run fell into). **1 Shared `el()`** (`dom.js`): retired 11
  private copies (5 the naive `Object.assign` form that drops aria-*/data-*) for
  one imported hyphen-aware helper; fixed the latent bug the review predicted —
  the Settings dialog's `aria-labelledby` was inert, so it had no accessible
  name (now does). **2 Shared `<dialog>` lifecycle** (`dialog.js`): one
  `wireDialog()` (✕ + backdrop; Escape native) + `closeButton()` across
  Settings/About/picker; Settings' ✕ gained `data-i18n-aria`; About now builds
  its DOM on first open (not every boot) and `translate()`s the fresh subtree
  (verified in te reo: Made by→Nā, Close→Katia). `sw` cacheFirst reuses
  `fetchClean`. **3 Share primitives** (`share-core.js`): `tryNativeShare`
  (shared/dismissed/unavailable) + `copyText` so share-app and share-ui stop
  hand-rolling the AbortError/clipboard dance; share-ui adopts `wireDialog`.
  **4 Search-clear** (`search-clear.js`): one `wireSearchClear()` for the home
  and in-menu ✕. **5 Perf**: rAF-throttle to-top's scroll and settings' resize;
  scroll-spy batches class writes before the rect read and reuses one
  reduced-motion mq; contact bar measures its inner's real height into
  `--contact-bar-h` (measuring the *inner*, not the bar, dodges a safe-area
  feedback loop) so the toolbar can't overlap at large fonts. Four new tiny
  modules added to the SW shell. **Verified over CDP** at 390px + desktop: all
  three dialogs open/close via ✕/backdrop/Escape; About lazy + translated; both
  share flows fall back cleanly; search ✕ clears + refocuses on both screens;
  to-top tracks real scrollY; `--contact-bar-h` measured to 48px with no
  overlap; settings latch still returns; zero console errors throughout. SW
  `.59→.65` across the session; static suite green (validate 27, no-deps, SBOM,
  176 tests). The unrelated in-flight edits noted above remain untouched.

