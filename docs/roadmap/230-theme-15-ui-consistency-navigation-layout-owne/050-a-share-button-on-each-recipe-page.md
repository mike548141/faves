- [ ] 💡 **A share button on each recipe page** `[S][ux]` — owner-raised
      2026-11-18, for later.

  **Owner, verbatim:** *"Consider adding a share button on each recipe page,
  and maybe on a dish but I think if we have a share button per restaurant dish
  it will be too cluttered. Recipes should be ok as they have a dedicated page
  per"*. So: recipes yes; restaurant dishes probably not, on clutter grounds.

  **What shipped as at 2026-11-18 (read at `961875fc`).** The recipe page has no
  share control of its own. The ⋯ menu's "Share" (`site/js/share-app.js`)
  shares the app, not the page. The share plumbing already exists:
  `share-core.js` uses the phone's native share sheet where there is one and
  falls back where there is not, and `share-ui.js` builds on it.

  **For whoever takes it.**
  - Your own recipes (the `u:mine` collection, roadmap `510/300`) live only on
    your device, so their link opens nothing for anyone else. Hide the button
    there, or share the recipe's text instead. Sharing the recipe itself, with
    a grant, is Theme 11's `11c` (`170-…`), a different and larger thing.
  - The recipe URL already survives a rename through `formerIds` (ADR 0153), so
    a shared link stays good.
