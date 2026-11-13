## 2026-08-22-0000 — four rulings, and two of them declined the recommendation

The owner answered the four questions this session put to him. **Two went
against the item's own recommendation**, which is the part worth recording —
a recommendation carried forward as though it had been accepted is how a record
gets stronger than its source.

- **Settings' distance control: make it actually FILTER**, not reword. The cheap
  copy fix was explicitly declined, and the option he took is the one this repo
  had labelled *"changes what the home screen is"*. 🚩 Three things now need
  answering that were **not** part of the question, because the control can
  empty the screen: an empty state, whether the count is stated, and what a
  **direct link** to a filtered-out venue does. Filtering a list is not the same
  as hiding a page.
- **The picks undo goes in Settings, NOT the `⋯` menu** the item recommended.
  Declined on the record so nobody re-proposes it. **Shipped the same day.**
- **14h: tag the 93 options, then collapse the remainder** — the full fix, not
  the wording-only one. So the data gap gets closed rather than papered over,
  under the standing rule that we never assert an allergen's ABSENCE.
- **The cook_check wedge stays its own item**, not folded into `010`. 🔑 The
  ruling's real content: four green runs are enough to kill the *"deterministic"*
  claim and **not** enough to kill the *fault*. An item nobody can currently
  reproduce stays open, deliberately, as the price of keeping the thread.

✅ **Shipped from the rulings, same session:** Settings → *Refresh & reset* now
carries **"Show suggestions again"** — it states how many places are affected,
clears `picksClosed` wholesale, disables itself with a different sentence when
there is nothing to restore, and takes **no confirm step** because it restores
rather than destroys.
🔑 **Two things a unit test could not have caught, both asserted.** Focus: the
button disables itself the instant it works, so focusing it afterwards drops a
keyboard reader to `<body>` — it goes to the status sentence instead. And
**scope**: `picks_check` now closes a **second** venue before resetting, because
with one closed *"clears all"* and *"clears the last"* are the same observation.
Break-probed — clearing only the last entry fails two assertions and leaves the
third passing, which is the asymmetry proving the two-venue setup is
load-bearing. 14 → 20 assertions.

**Close state:** `main` clean, no worktrees, no branches. Board **62 open · 21
done · 14 part-done · 3 waiting**. `SHELL_VERSION` `2026-08-17.134`. Pin
`atelier@f2104f0`, verified equal to atelier's `origin/main`.

---

