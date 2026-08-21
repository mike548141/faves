- [~] 🎯 **A closed "If it's your first time, try…" block has no way back**
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

✅ **RULED 2026-08-22 — OPTION 2: A RESET IN SETTINGS.** Asked a third time, with
both options and their costs in front of him, the owner chose the **Settings
reset** over the `⋯` menu item this item recommended. Recorded plainly: the
recommendation was **not** taken, and the trade-off it named — *"it puts the undo
three screens away from the ✕ that caused it"* — was put to him in those terms
and accepted. Do not re-propose the `⋯` menu; it has now been declined on the
record.

📋 **What to build.** The Settings panel already has a reset group, so this is a
control that clears `settings.picksClosed` (the id list) wholesale — one action,
all venues, not a per-venue picker. Word it so it says what it restores rather
than what it deletes.

⚠️ **`tools/picks_check.mjs` needs the reopen path asserted**, and its existing
assertions must survive: the block must still stay closed across a reload, and
still be remembered **per venue**. The reset is the one thing allowed to bring
every venue's block back at once — which means the check has to prove the reset
clears **all** of them, since a global flag would pass a single-venue test.

✅ **SHIPPED 2026-08-22, the same day it was ruled.** Settings → *Refresh & reset*
carries **"Show suggestions again"**: it states how many places the block is
closed on, clears `settings.picksClosed` wholesale, and is disabled with a
different sentence when there is nothing to restore. It sits **above** "Start
over" and takes **no confirm step** — it restores rather than destroys, and
dressing it in Reset's red would teach the reader that both are dangerous.

🔑 **Focus was the trap, and it is the fault this item's own tool already guards
elsewhere.** The button disables itself the instant it works, so focusing it
afterwards drops a keyboard reader to `<body>`. Focus goes to the status
sentence instead (`tabIndex: -1`), which also announces what happened.

⚠️ **`picks_check.mjs` grew from 14 to 20 assertions**, and the design point is
that it now closes a **second** venue first: with only one closed, *"clears
all"* and *"clears the last one"* are the same observation, and a control that
quietly fixed only the last would pass every single-venue assertion while
leaving the other 54 silent. **Break-probed** — making the button clear only the
last entry fails *"the reset empties the whole list"* and *"cook-at-home's
suggestions are back"*, while the-ramen-shop's assertion still passes, which is
exactly the asymmetry that proves the two-venue setup is load-bearing.
