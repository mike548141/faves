## 2026-08-17-0530 — the board split: one 6,274-line file becomes 102

Taken on a direct instruction from the owner, on the ruling he made 2026-08-16
and on its own stated precondition. Two commits — the store (`672ad17`), then
the doctrine that store makes true (`d57e359`) — plus [ADR 0086].

🎯 **The precondition was checked, not assumed.** The ruling names one: *no other
session holds a claim in the monolith*. Measured before anything moved — zero
`CLAIMED` lines on any item, one worktree, one branch, every peer session closed
and its branches deleted. Two earlier sessions had declined this work at the tail
of a long run rather than do it badly; this one was taken for it.

✅ **What landed.** 6,274 lines → 48 sections, 54 item files, a 271-line
generated index. The session-start read drops **96%**. The `board` floor check —
wired since the day it was written and reporting *"not in scope"* on every commit
since — is live for the first time.

🔑 **The cut was the monolith's own grammar, which is why it needed no
judgement.** An item is a column-0 checkbox line plus the indented continuations
beneath it; that is how the file was already written, so nothing decided where an
item's prose stops. Losslessness was verified as a **multiset over every
non-heading source line**, not by eye — a line moved between files is fine, a
line lost is not, and the check cannot tell the difference between "I read it
carefully" and "I read it carelessly", which is the point of using it.

🔎 **The links were the real work, and the first pass was wrong in a way that
looked right.** Every link in `ROADMAP.md` was written relative to `docs/`;
moving two directories deeper broke all of them. The first repointer used a
negative lookbehind for a backtick before `](`, to skip prose *about* a link —
and 62 of 102 links are written ``[`ROADMAP-DONE.md`](ROADMAP-DONE.md)``, where
the character before `]` is the closing backtick of the link **text**. It
repointed 40 and reported success. `linkscan` (enforced) is what caught it. 🔑
**A guard on the wrong side of a delimiter passes silently and looks like a clean
run** — the fix was to match the whole link and test *both* sides for a code
span.

🚩 **Three things the split forced, each a hole in a boundary, each reasoned in
the file that opens it.** `.wrapscanignore` and `.pathscanignore` for the
generated index (its banner is 115 columns; its link *text* is path-shaped and
produced 49 false pathscan findings per commit), and a `tools/board.py` **shim — <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
explicitly not a copy**, because children do not vendor the floor's scanners but
the generated banner names `python3 tools/board.py rebuild`, which is true in <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
atelier and false in every child. 🔑 **A generated file that instructs the reader
must name a path that exists in the repo it was generated into** — otherwise the
one instruction at the top of a file nobody may hand-edit is wrong.

⏳ **Owed upstream to atelier**, all three from the same root — the generator was
written for the repo it lives in: the rebuild banner hard-codes `tools/board.py`; <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
that banner is 115 columns where the house limit is 85; and the index renders
link text as a path-shaped string. `ros` (5,213-line board) and `shed` (3,125)
will hit all three when the fleet rollout reaches them.

⚖️ **The one judgement call, made narrowly.** The two structural owner rulings
became item files because their prose already carried explicit state
(*"STATE: OWNER-RULED · UNCLAIMED · BLOCKED ON QUIESCENCE"*), so a checkbox
asserts nothing new. Every **other** `###` subsection carrying work — 32a, 33b,
36e and their neighbours — stayed narrative. Those are unmistakably work, with
sizes and surface tags, and it was tempting to lift them; but the monolith never
gave them a state, and assigning one would be a claim stronger than its evidence.
Which of them become items is a later, deliberate pass, and it is now a cheap
one.

[ADR 0086]: ../decisions/0086-the-board-is-one-file-per-item.md

### Addendum — the second pass, and a number that had a shelf life

🎯 **The owner authorised the pass ADR 0086 deferred**, so the 15 lettered
sub-items in themes 32, 33 and 36 became item files. The criterion is checkable
rather than a judgement — a letter id **and** either a size/surface tag or an
explicit `✅ SHIPPED` in the heading — and the first run of it was **wrong in
one direction that matters**: size-tag-alone excluded `36d`, because a shipped
item loses its size tag when its heading is rewritten to ✅ SHIPPED. It would
have been the one item present in the narrative and absent from the index, which
is exactly the drift the split exists to stop. 🔑 **A rule derived from how open
items are written will systematically miss the closed ones** — closing an item
changes its shape.

⚠️ **And a figure in the record above was wrong: the pre-split file was 6,274
lines, not 6,233.** Both readings were honest; 6,233 was taken hours earlier and
peers added 41 lines to the monolith in between. An atelier session caught it by
re-measuring at the actual parent commit while writing faves into its own
rollout record. 🔑 **Cite the revision you measured, not the file you read** —
`git show 672ad17^:docs/ROADMAP.md | wc -l` cannot go stale, and
`wc -l docs/ROADMAP.md` was already stale when it was written down. Corrected in
[ADR 0086], the decisions index, this entry and the split's own item file. The
same session corrected three of its own figures the same way, including one that
had faves at 1,853 lines — out by 4,421.

⏳ **Handed upstream and now filed there**: `060` (the generator hard-codes
`tools/board.py` into three child-facing strings) and `070` (the generated index <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
cannot pass `wrapscan` or `pathscan` in a repo without a `scope` block — a
115-column banner and path-shaped link *text*, 49 false findings a commit).
Both under atelier's board-store section; `070` is in faves' words at that
session's request. 🚩 `ros` and `shed` began migrating within minutes of the
filing, so the generator fix is racing two more children paying the same cost.

### Addendum 2 — the exemptions were deleted the same day they were written

The split opened two holes in the floor's boundary (`.wrapscanignore` and
`.pathscanignore` on the generated index) and added a third file, the
`tools/board.py` shim, to stop the generated banner naming a file no child has. <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
**All three are gone as of `f8faabb`, hours later**, because the upstream cause
was reported rather than lived with and atelier fixed it. Measured with the
ignore files **deleted**, not in place: `wrapscan` on the index **15 → 0**,
`pathscan` **49 → 0**, raw lines over 85 columns 128 → 78. 🔑 **An exemption
written with its reason is one somebody can come back and delete** — the reason
is what made the round trip possible, and neither the count nor the cause would
have survived a bare `.wrapscanignore` entry with no comment.

🔎 **The cause was not the file's shape, and my report of it was wrong in an
instructive way.** An item line ends in a store path, so its overflow is a
single unbreakable token and `wrapscan` exempts it — **unless something follows
it**. A trailing eye-flag adds a space after the path, the overflow gains a legal
wrap point, and the exemption lapses. 13 of the 15 findings were exactly the
flag-bearing lines. I had reported *"every item line is flagged"*, generalising
from the flagged lines in front of me to a population whose flagless members are
structurally different. 🎯 **That is the same class this session had named an
hour earlier — it caught its own author while he was actively holding it in
mind, which is evidence that attention is the wrong instrument for it.** A rule
you can only obey by remembering it at the moment of writing will be broken by
the person best placed to know it.

⏳ **One residual, held deliberately.** Deleting the shim meant the rebuild
command had to live somewhere true, so `CLAUDE.md` and `CONTRIBUTING.md` carry
the hook's own resolution order —
`python3 "${ATELIER_TOOLS:-$(git config hooks.atelierTools)}"/board.py rebuild`
— with a note saying why it differs from the banner the generator emits. The
generator emits only the **first** branch of that chain, and `ATELIER_TOOLS` is
unset on this machine, so its banner expands to `python3 /board.py`. 🔑 **A
fallback chain is one fact; emitting its first branch is a partial truth that
reads as a whole one** — the same defect as naming a file only atelier has, one
layer in, and it fails at the moment the check fails and a reader is least able
to guess. Fixed upstream in atelier's PR #24; **when that merges, rebuild the
index and delete the note** — three lines in `docs/roadmap/README.md` and the
tail of the `CLAUDE.md` verify entry.

📋 `pathscan` is now scoped away from this repo's record stores
(`.atelier-floor.json`), adopting atelier's PS4 ruling verbatim. It arrived from
the opposite direction to PS4's own argument: nothing was ever wrong, but four
honest session-log mentions of `tools/board.py` became permanent findings **the <!-- pathscan:allow: historic mention of a path that is atelier's or was removed — annotation only, the record's words are unchanged -->
moment the file was deleted** — the tree moved under a true record.

