- [x] ✅ **The "Call to order" button looked cut off** — **fixed 2026-08-16**.
  Pinned at the top of a long menu, the 44px button sat in a 49px bar, leaving
  3px under it, so its rounded bottom read as clipped and merged with whatever
  scrolled past. `padding-block` on `.contact-bar-inner`; `menu.js` measures
  that element and feeds the height back into `--contact-bar-h`, so the sticky
  toolbar's offset followed on its own. Measured in a real browser before and
  after: 3px → 11.5px of clearance, toolbar offset correct in both.
  🔎 The sticky search toolbar had *already* been fixed for the identical
  mistake on its rounded top edge; the same trap, sprung twice.
