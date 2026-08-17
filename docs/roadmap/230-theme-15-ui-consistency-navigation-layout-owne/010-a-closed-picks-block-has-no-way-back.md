- [ ] 🎯 **A closed "If it's your first time, try…" block has no way back**
      `[S][ux]` — **shipped that way deliberately 2026-08-17 (`c573035`), with
      the owner told twice and no answer yet. This item exists so the question
      does not live only in a session log.**

**What ships today.** The ✕ on the picks block closes it for that venue and
remembers it (`settings.picksClosed`, an id list, sanitised and capped). Closing
one place leaves every other place's block alone — that much was decided rather
than left open, because the alternative (the one global flag `ingredientsFolded`
uses) answers a question asked about one venue by silencing all 55.

🔑 **What is NOT decided: whether permanent is the right answer.** An ingredient
fold reopens in one tap on the page it was closed on. This does not reopen at
all. That is a real asymmetry between two controls that look like siblings, and
it was left standing rather than guessed at.

**The two cheap fixes, either of which is `[S]`:**
1. **A `⋯` menu item that appears only when the block is closed** — "Show
   suggestions". Discoverable in the one place a reader already looks for
   per-page chrome, costs a `hidden` toggle in `initChrome` and one static
   `<button>` in `restaurant.html`. Recommended if he wants an undo at all.
2. **A reset in Settings** — cheaper still (the panel already has a reset
   group), but it puts the undo three screens away from the ✕ that caused it.

⚠️ **Do not "fix" this by making the close session-only.** That trades a missing
undo for a control that forgets — the block would return on every visit, which
is the behaviour the ✕ was asked for to stop. `tools/picks_check.mjs` asserts
the persistence across a reload precisely so this cannot be undone by accident.

📋 **Whoever takes it:** `site/js/menu.js` (`renderPicks`/`closePicks`),
`restaurant.html`'s `⋯` menu if it is option 1, and `tools/picks_check.mjs`
needs the reopen path asserted — the check currently proves the block stays
closed, which is exactly the assertion an undo has to be written around.
