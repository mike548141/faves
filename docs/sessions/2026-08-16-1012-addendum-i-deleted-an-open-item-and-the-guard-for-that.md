## 2026-08-16 10:12 UTC — addendum: I deleted an open item, and the guard for that exact failure was out of scope

Correcting the entry above rather than leaving it to read as a clean close.

🛑 **`caa588d` deleted ROADMAP item 15y — an unfixed WCAG 2.2 AA failure — while
it was still open.** It reached neither `ROADMAP-DONE.md` nor a fix and survived
only as prose in `SESSIONS.md`, which is the record and not the worklist. Found
by a peer session going to add a 🎯 marker to it and discovering it was gone;
restored verbatim at `e410d42`. **It had been the item I told that session was
the most important one to keep visible, and it was already gone when I said so.**

**Mechanism, stated so it is fixable rather than moralised about:** the harvest
replaced a *block* of `ROADMAP.md` by index between two markers, and 15y sat
inside that range because it was adjacent to 15x, which genuinely was done. A
block replacement takes everything between its endpoints; the three items either
side of it moved correctly. **A harvest moves `[x]` items and nothing else — and
an open item next to a closed one is the easiest thing in that file to lose.**

Swept properly afterwards rather than trusting the one that was noticed: across
all eight of this session's `ROADMAP.md` commits, exactly **five** open items were
deleted — the `tag_allergens` item (genuinely done, harvested), 15x, back-to-top
and the fixed/sticky audit (all three genuinely done and in `ROADMAP-DONE.md`),
and 15y. One loss in five. 🔎 A naive grep for the titles produces **false
alarms**, because the harvest rewords items into the past tense as it moves them
("covers" → "covered") — **diff the deleted lines, don't grep the titles.**

### 🔎 The ninth instance of the day's shape, and this one is upstream

**A guard for precisely this failure already exists and never ran.** Atelier's
`harvestscan` opens by naming it: *"an item REMOVED from ROADMAP.md that arrives
nowhere… a roadmap item that vanishes means the work does not get done."* It is
gated on a commit shedding **50+ net lines** from `ROADMAP.md`
(`NET_BULK_DELETE_LINES`, ruled 2026-07-29, the number taken from the 185-line
incident that prompted the guard). `caa588d` was **+82 −71, net +11**. Out of
scope. It is also wired **warn-only** in this repo, so even in scope it could not
have blocked the commit.

> 🎯 **Raised, not changed** — the threshold is the principal's own recorded
> ruling and the tool is atelier's. **A bulk deletion is the loudest case of this
> failure, not the only one**, and a single open item lost inside a net-positive
> commit is the quietest and the hardest to notice. The ruling was made from the
> one incident that had happened; there is now a second with the opposite shape.

Four house rules came out of the day, all paid for, and the peer put them in
`CONTRIBUTING.md` rather than leaving them in commit messages — which is the
difference between a rule and an anecdote:

1. Any control that hides or disables itself **while focused** drops focus to
   `<body>`, and every keyboard handler scoped to a subtree goes dead with it.
2. When a commit's area prefix and its file list disagree, **believe the file
   list** — the gates read paths, not subject lines.
3. A roadmap harvest moves `[x]` items and nothing else. **Diff the harvest.**
4. Grep `docs/decisions/` — especially the **Rejected** lists — before proposing
   an option. A theme is a more inviting read than a decision record: newer,
   narrative, full of measurements, and silent about the older document that
   already closed the question.

