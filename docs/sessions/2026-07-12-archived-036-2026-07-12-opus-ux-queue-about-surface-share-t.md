- **2026-07-12 (Opus: UX queue — About surface, Share this app, Pick-FAB
  auto-hide)**: Cleared the rest of the queued UX block. **About surface**
  (`about-ui.js`): the footer's inline privacy paragraph moved into an About
  dialog (Settings-sheet pattern) covering what Faves is, "Private by design",
  and "Works offline"; opened from a new ⋯ menu item and a footer "About &
  privacy" link. Progressive-enhanced — the privacy note still ships as static
  footer HTML for no-JS, and JS swaps it for the link. **Share this app**
  (`share-app.js` + reusable `toast.js`): a ⋯ item that hands the branded
  canonical URL to `navigator.share`, falling back to clipboard-copy + a toast
  on desktop; kept separate from the shortlist share in `share-ui.js`.
  **Pick-FAB auto-hide** (`picker.js`): the "Pick for us" button slides off the
  bottom on scroll-down and back on scroll-up (rAF-throttled, `.is-tucked`
  transform so it never fights the search/favourites display rules; reduced
  motion drops the slide). All verified over CDP at 390px (dialog open/close
  from both entry points; native-share payload + clipboard/toast fallback; FAB
  tuck/untuck across repeated passes — no console errors); full verify suite
  green. Three new reo keys (all draft). SW `.56→.58`. The whole UX queue block
  (contact bar + these three) is now shipped.
