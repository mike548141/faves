- [x] 📤 **FILED UPSTREAM — the board's state vocabulary is atelier's, and three
  findings now sit in its board** `[S][docs]` — closed here 2026-08-18. Nothing
  further is owed *in this repo*; the work is atelier's to do or decline.

  🛑 **THE OWNER'S RULING, 2026-08-18, and it governs this whole class:**

  > *"changing the standard on the roadmap content is an atelier job, not
  > something for Faves or any of the child repo's to change or extend. I
  > support the idea of adding more status for the brackets on a job item to
  > make indexing them easier to understand the state of work (e.g. not done,
  > done, claimed, in-flight, declined, supersceeded etc etc) but that is not
  > something Faves or any child repo should try to fix. Faves and any child
  > repo can add problems and opportunities like these with solution options for
  > atelier to consider and remedy as it sees fit or not at all. To be clear
  > atelier may use or adapt any option a child repo gives it, or create its own
  > options, or adapt the problem/opportunity."*

  🔑 **So the "keep the tri-state" counsel is NOT the end of it.** He supports
  richer states. What he ruled is **where the change is made**, not whether. This
  item spent two revisions getting that backwards — first proposing a `[-]`
  bracket locally, then closing itself on the grounds that the question was
  already settled. Both were the same error wearing opposite conclusions: **a
  child deciding a house question.**

  **What is filed in atelier's board, per `PROPAGATION.md` § *Pointing up*** —
  which landed upstream 2026-08-18 and is the route this should have taken from
  the start. Its opening check is the one that would have caught the first
  revision: *read the parent's actual file, never your own inlined summary.*
  1. **The state vocabulary is too narrow to index work by** — carrying the
     owner's own list (*not done · done · claimed · in-flight · declined ·
     superseded*), the measured instance from this board (three items mis-marked
     because the copy had dropped a clause), and options **offered, not
     recommended**.
  2. **`2cd4730` mis-attributes the five-state proposal to him.** He wrote one
     clause — *"unless perhaps it is supersceeded, or no longer required"*; the
     `[-]`/`[^]` brackets were the assistant's, handed back as *"your five-state
     proposal"*. The ruling is real and dated **2026-07-23**; the capture is
     dated 07-22 and conflates a question captured with a question answered.
  3. **`board.py` renders every `[x]` as `✅`**, which reads as *delivered*, so a
     declined or superseded item wears a green tick in the index. Generator and
     vocabulary are one question, and both are atelier's.

  ⚠️ **And this repo's own copy diverges on two markers** — `[~]` (used here for
  part-done *and* claimed, where the parent says don't start one) and `⏳` (used
  here for *waiting on someone*, where the parent means *review queued* under
  REVIEW rule 4). **Not repaired locally**, because repairing it either way is a
  standard change. Flagged in [`../README.md`](../README.md) with a dated
  pending-upstream line that removes itself at the pin bump carrying the answer.

  ✅ **What legitimately stayed local**, because it is applying the standard
  rather than changing it: three items that had a finished ruling and an open
  checkbox are now `[x]` with the disposition in their own text — `460/060`
  (parked), `300/010` (ruled not to fix), `470/020` (superseded). `370/010` and
  `270/020` stay `[ ]`; work may yet be owed when a venue or an OSM house number
  arrives.

  🔑 **The transferable rule, and it is the reason this file is kept rather than
  deleted: a child repo does not get to decide a house question, in EITHER
  direction.** Proposing a local fix and closing the question as settled are both
  the same overreach. The route is: read the parent's file, then file a finding
  in the parent's board with options, and hold at most one dated, self-removing
  line locally. And a child's exhaustive
  search of its **own** transcripts is not evidence about a house rule: the first
  revision searched faves, found nothing, and read that as *"never decided"*.
