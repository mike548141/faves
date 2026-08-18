- [x] 🔎 **~~The board cannot say "decided, and the decision was not to do
  it"~~ — IT CAN, AND THIS ITEM ASKED A QUESTION THE OWNER ALREADY ANSWERED**
  `[S][docs]` — filed 2026-08-17, **corrected and closed the same day.** No new
  state is owed. Kept rather than deleted because the mistake is the useful part.

  🛑 **What this item originally proposed — a `[-]` decided-against state — is
  the exact proposal Mike himself raised on 2026-07-22 and the exact one the
  builder counselled against.** Found in atelier's own record (`2cd4730`,
  *"tri-state legend, five-state question captured"*), which is where the board
  doctrine lives and where this session had not looked:

  > **Extend the checkbox grammar to five states?** (Mike, 2026-07-22,
  > mid-build) — proposal: add `[-]` declined and `[^]` superseded beside the
  > tri-state. **Builder's counsel: keep the tri-state** — the bracket answers
  > the one machine-checked question (is work owed?); declined/superseded both
  > answer "no" and need a dated note for the *why* regardless, so extra states
  > are a second copy of one fact (the point-of-use drift class). **Promote to
  > distinct states only if we find ourselves repeatedly grepping dispositions
  > apart** (the anti-slop promotion rule). Mike's call; Mike himself flagged
  > the complication risk.

  🛑 **AND THE RECORD ABOVE OVER-ATTRIBUTES IT TO HIM. Read the transcript, not
  the capture.** Chased into the live sessions at his request and verified in
  two atelier transcript files, quoted here because the difference is the whole
  point:

  **What Mike actually wrote** (session `1b189e23`, 2026-07-22 04:31:07 UTC) —
  in passing, at the end of a paragraph about harvest integrity:

  > *"…anything with `[ ]` should not be in roadmap-done I would think, unless
  > perhaps it is supersceeded, or no longer required."*

  **That is all of it.** He never typed `[-]`, never typed `[^]`, and never
  enumerated candidate states. The two brackets were the **assistant's**
  invention, and its close-out message the same day handed them back to him as
  *"Your five-state proposal (`[-]` declined, `[^]` superseded)"* — which is
  what commit `2cd4730` then wrote onto the board as *"(Mike, 2026-07-22,
  mid-build) — proposal: add…"*. 🔑 **A record that says "Mike proposed X" when
  Mike said something narrower is worse than a record that says nothing**: it is
  quoted forward with his authority behind it, and the next reader — this
  session included — argues against a position he never took.

  ✅ **The RULING is real, and it is dated 2026-07-23, not 07-22.** It was put to
  him properly as a choice and he took it (session `64f68104`, 2026-07-23
  02:16:54 UTC): *"① Keep the three checkbox states, or extend to five (add
  'declined' and 'superseded')?"* → **"Keep three (Recommended)"**. So the
  tri-state binds; only its provenance was mis-stated.

  📤 **Owed UPSTREAM to atelier, not fixable here:** its board README and the
  `2cd4730` capture both attribute the five-state proposal to him. The
  correction is one line in each and the evidence is above.

  🔑 **So the rule already exists and this repo was not applying it.** Atelier's
  board README states it plainly and faves' did not: *"a **work-owed tri-state**,
  never a disposition (Mike, 2026-07-22): `[ ]` work still owed · `[x]` **no more
  work owed** — delivered, superseded, or declined, with the disposition said in
  the item's own text (a dated note), **never a fourth bracket**."* Our legend
  said only `[x]` **done** — the disposition clause was dropped in the copy. **A
  parked item is `[x]`, and always was.**

  🔑 **And the promotion bar was already written, which is what makes today's
  evidence answerable rather than arguable:** *promote only if we find ourselves
  repeatedly grepping dispositions apart.* Today's fault was **not** that. It
  was six items left on `[ ]` because the legend a session read had lost the
  clause that told it what `[x]` covers. **A dropped clause is not a missing
  state**, and adding one would have shipped a second copy of a fact the dated
  note already carries — the drift class the counsel names.

  ⚠️ **The six were also not one shape, and the original filing overstated
  them.** Re-read against the tri-state: `460/060` (costToMake parked) and
  `300/010` (the order pill, ruled *leave it*) are plainly `[x]`; `470/020`
  (superseded claim note) is `[x]`; `470/010` (37k, *"what remains is OWNER DATA
  ENTRY"*) is **⏳ waiting on him**, not declined at all; and `370/010` (30g,
  no instance in the corpus) and `270/020` (Pandan's pin, a standing re-check)
  are **genuinely still `[ ]`** — work may yet be owed the day a venue or an OSM
  house number arrives. So "six items need a new state" was really *three
  mis-marked, one mis-stated, two correct as they were.*

  ✅ **What actually shipped instead**, 2026-08-17: faves'
  [`roadmap/README.md`](../README.md) legend now carries the tri-state rule and
  the disposition clause verbatim from the source, and names the one real
  residual — 🚩 **the index renders every `[x]` as `✅`, which reads as
  "delivered"**, so an item closed any other way must say so in its **first
  line**, where a reader who followed the tick lands. That residual is the only
  thing that could ever meet the 2026-07-22 promotion bar, and it does not meet
  it yet: it is a *rendering* problem with a *wording* remedy, not a state we
  are grepping apart.

  🔑 **The transferable lesson, which outlives the item:** this session proposed
  a change to inherited doctrine **without reading the inherited doctrine's own
  record of the same question**. The board rules live in atelier; the session
  searched only faves and found nothing, and "nothing found here" felt like
  "never decided". It was decided, weeks earlier, by the owner, with the
  reasoning written down — and the owner remembered it when the proposal was put
  to him. **Before proposing a change to a rule, search the repo the rule comes
  FROM.**
