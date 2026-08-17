- [ ] 🔎 **The board cannot say "decided, and the decision was not to do it"**
  `[S][docs]` — found 2026-08-17 by the sweep that flipped four stale items, and
  it is the reason those four went stale rather than a coincidence of four
  sessions forgetting.

  **The legend has four states and none of them fits a live category.** `[ ]`
  open · `[x]` done · `[~]` part-done-or-claimed · `⏳` waiting on someone. What
  is missing is **parked / decided-against / standing re-check** — an item where
  the thinking is finished, the answer was *no* or *not yet*, and no session
  should take it. Today those are written as `[ ]`, because `[x]` would say the
  work happened and it did not.

  🚩 **The cost is not tidiness — it is that a session takes work the owner
  already declined.** A cold reader picking from the index sees a checkbox that
  means *open, takeable*, opens the file, and finds a ruling. That reader has
  spent the read; the next one spends it again. On a 69-open board this is the
  single largest source of wasted first reads.

  **The instances, verified in the item bodies rather than inferred from
  titles** — six as at 2026-08-17, ~9% of everything the index calls open:

  | Item | What its own body says |
  |---|---|
  | `460/060` 36f `costToMake` | *"✅ RULED 2026-08-16: park `costToMake` … ⚑ discharged"* |
  | `300/010` the order pill | *"RULED 2026-08-16 … leave it, record it — deliberately deferred, not unnoticed"* |
  | `470/010` 37k | *"Build complete; what remains is OWNER DATA ENTRY, not open work"* |
  | `470/020` 37k claim note | superseded by its own title; *"do NOT treat it as open work"* |
  | `370/010` 30g delivery fee | owner said *"I would consider"*, not build it — and *"NOTHING IN THE CORPUS EXERCISES IT … ZERO true pairs"* |
  | `270/020` Pandan's pin | *"this stays open as a standing re-check, not as work"* |

  ⚠️ **`300/010` shows the second-order damage: an item with no state for its
  answer contradicts itself.** Its ruling (*leave it*) sits at the top and an
  earlier 🎯 *"Left for the owner"* survives further down, so the file argues
  both ways and a reader's verdict depends on how far they read. That is what
  happens when the decision has nowhere structural to live and has to be carried
  in prose.

  🔑 **These are not all one kind, and a single new marker would flatten a
  distinction worth keeping.** At least three shapes are in the table:
  *decided-against* (36f, the order pill), *built and waiting on the owner's own
  data* (37k), and *no instance exists yet* (30g, Pandan). The first is closed
  unless he reopens it; the second is his to finish; the third reopens by itself
  the day a venue arrives. 💡 One workable answer is a **`[-]` decided-against**
  state plus using the ⏳ that already exists for the second, and leaving the
  third as `[ ]` with the instance-count in the title — but that is a proposal,
  not a finding.

  ✅ **`⏳` is now proven to work end-to-end**, which removes the obvious
  objection that adding a state means changing the generator. It sat in the
  legend unused across every item on this board until `340/030` took it on
  2026-08-17; `board.py rebuild` renders it correctly with no tool change. So the
  cost of this is a legend edit and six item edits, not a tooling change.

  🎯 **What is owed to the owner is one small decision** — whether to add a
  decided-against state at all, and if so whether one marker or two. Everything
  after that is mechanical. Worth raising *with* the instance table above rather
  than as a principle: this board's own record shows a named incident moves him
  and an abstract argument does not (`340/030`'s "what moved this, worth
  reusing").
