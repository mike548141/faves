- [ ] **36e — one place to look, not two** `[M][ux]`

A recipe currently renders **twice**, through two code paths: expanded inside
the Cook at Home list (`menu.js` `<details>`) and on its own page (`recipe.js`).
The owner's screenshots show near-identical content in both. That is why the
cook button had to be fixed in two places, and why it had to be given two
weights. Decide what the list row is *for* — a preview that makes you choose, or
the whole recipe — and let the other path be the one that owns the detail.
