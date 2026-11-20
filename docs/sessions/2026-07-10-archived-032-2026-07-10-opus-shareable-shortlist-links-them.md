**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 103+1 -->
- [2026-07-10 · 2026-07-10 (Opus: shareable shortlist links — Theme 1b fully closed)](2026-07-10-archived-032-2026-07-10-opus-shareable-shortlist-links-them.md) — archived entry, verbatim in its file

- **2026-07-10 (Opus: shareable shortlist links — Theme 1b fully closed)**:
  Built the last parked Theme 1b piece — sharing a shortlist of favourites. The
  "codec already carries the type" turned out optimistic: the order shape
  (name/price/qty triples) can't represent a *whole-venue* favourite or the
  recipe flag a received favourite needs to deep-link correctly, so the codec
  got a real second payload. `share-codec.js` now has `encodeShortlist` (groups
  of `{venueId, venueName, isRecipe, sub, venueFav, dishes[]}`) and a
  type-branched `decodeShare` returning flat favourites entries; `encodeShare`
  is now explicitly **order-only** (throws on other types, pointing at
  encodeShortlist) so the two wire shapes can never cross. Every field is still
  re-sanitised on decode. `favourites.js` gained a pure `groupForShare(items)`
  (venue-grouped, mirrors the Favourites view's own grouping) and a store
  `merge(entries)` (adds only absent, dedupes the incoming list, commits once,
  returns the count added).

  **Refactor to avoid duplication:** the order send dialog (name → share sheet /
  copy link / QR) was inline in cart-ui.js. Rather than clone ~80 lines for the
  shortlist, extracted it to **`site/js/share-ui.js`** as `openShareDialog({
  heading, blurb, buildUrl(name), … })` — created-on-demand, removed on close,
  with the QR renderer moved along too. cart-ui's order send and app.js's
  shortlist send both call it. cart-ui's receive path now branches by
  `decoded.type`: an order merges into the cart as before; a shortlist shows
  "Add Ruth's N favourites?" (grouped, recipe/venue-heart shown) and merges into
  the favourites store on confirm, then swaps to an "Added / already had these"
  result. Send entry point: a **Share these** button under the favourites
  summary (hidden when empty; `fav.share` te reo key added). sw VERSION → `.45`,
  `js/share-ui.js` in the precache shell.

  Verified: `node --test` **172 pass** (+5 shortlist codec, +3 favourites
  merge/group; one stale test that encoded a shortlist via `encodeShare` updated
  to assert the new order-only guard). validate + check_no_deps + gen_sbom clean.
  **Real-browser headless CDP, all three flows, zero console errors:** (A) order
  send still works through the extracted dialog — QR paints, decodes back to the
  order (no regression); (B) Favourites → Share these → dialog decodes to a
  shortlist of 3 with venue-heart + recipe flag intact; (C) opening a shortlist
  link on a fresh load shows "Add Ruth's 3 favourites?", confirm merges 3 into
  an empty favourites set, and the recipe favourite deep-links to recipe.html
  (proving isRecipe survived the URL). Committed on `main` (not pushed).

  **Next session:** Theme 1b is done. **Phase 7 (deploy)** is now the main
  unblocked track — needs two owner calls: host (Cloudflare Pages) + hostname
  (OG tags baked for `lets-eat.myspot.nz`). Everything else queued is owner-
  blocked (menu photos/prices, picks, promoting venues to `verified`) or wants
  reo-engine string interpolation (order-sheet/favourites-share te reo).
