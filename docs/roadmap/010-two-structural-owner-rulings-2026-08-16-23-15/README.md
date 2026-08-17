# 🎯 TWO STRUCTURAL OWNER RULINGS — 2026-08-16 23:15 UTC

Taken by wt `faves-cook2` and recorded here rather than in a theme because both
cut across every session. **Neither is claimed by this session; both need an
owner of their own.** Rulings do not cross between sessions by themselves —
this block is how they cross.

### 1. 🛑 `service` is renamed to `order-mode`, INCLUDING the shipped filter

The word means **three** different things and three sessions collided with it
independently in one day:

| # | What it is | Status |
|---|---|---|
| 1 | `filters.js` `service` — the values `all` · `takeaway` · `dine-in`, a home-screen `<select>` on 55/55 venues | **shipped** |
| 2 | Theme 30's `channel` — `dine_in`/`takeaway`/`delivery`, a **price-and-tax** axis (delivery menus run 15–30% above dine-in) | proposed |
| 3 | Theme 30's proposed `service` **axis label** on `cuisine` values ("`Cafe` is a format word") | proposed |

He was offered the cheap option — keep the shipped one, rename only the two
proposals — and **ruled the other way: rename all three, the live filter
becomes `order-mode`.** ⇒ `service` stops being overloaded entirely rather than
being left as the one survivor that future readers still have to disambiguate.

🚩 **THE COST HE IS ACCEPTING, AND IT IS THE WHOLE OF THE WORK.** The filter is
**shipped and in URLs** — `filtersFromQuery` reads it, and a saved or shared
link carries `?service=takeaway`. Renaming the key without a shim makes every
existing shared link **silently lose its filter**: no error, no notice, just a
different set of venues than the sender saw. So this is not a rename, it is a
rename **plus a compatibility path**, and the compatibility path is the part
that must not be skipped:
- read the old key, write only the new one;
- `tests/filters.test.js` must assert an old-style URL still resolves;
- and per ADR 0072, that test must be **proven to fail** without the shim,
  or it is decorative.
Also in scope: `site/index.html`'s filter markup, `app.js`'s URL sync,
`reo.js`'s gloss, and `tools/boot_check.mjs` (it reads filter element ids).
✅ **The sequencing gate is DISCHARGED 2026-08-17.** This item was held behind
37k's style filter because that work was live in `filters.js`, `app.js` and
`index.html`. **37k has landed** (`9aa6071`…`62546b4`, wt removed, claim
released) — so `order-mode` is now unblocked and takeable. ⚠️ Note what it
inherited while it waited: `filters.js` gained a **fourth** axis (`style`), so
the rename touches one more select, one more `DEFAULT_FILTERS` key and one more
URL parameter than the description above assumed.

### 2. 🛑 The roadmap is SPLIT — one file per item

**This one is unsatisfiable-rule surgery, and it is the deeper of the two.**
Our claiming rule says *"if `ROADMAP.md` is dirty, another session is
queue-active — take the next open item, touch nothing."* That is a paraphrase of
atelier's *"if **the item's file** is dirty"*, and it is self-consistent
upstream **because atelier runs a split board**: item A's file dirty ⇒ go to
item B ⇒ B's file is clean ⇒ claim normally. We compressed "the item's file"
into "`ROADMAP.md`" — and with **one 5,300-line file holding ~53 claimable
items**, "the next item" lives in the file "touch nothing" just forbade. With
five sessions live somebody holds it nearly always, so read literally **nobody
can ever claim anything**. 🔎 Not theoretical: three sessions were blocked
simultaneously at open on 2026-08-16.

He was offered the cheap fix — reword the rule so the unit is the item's
**line**, which is what atelier itself says two paragraphs further down — and
**ruled the other way: adopt the structure, split the board.** ⇒ the inherited
rule becomes correct **as written** instead of correct-once-reworded, and the
two repos stop diverging.

🛑 **STATE: OWNER-RULED · UNCLAIMED · BLOCKED ON QUIESCENCE.** Those are three
different things and the third is not an invitation — `faves-hygiene` declined
it deliberately, on the ruling's own precondition, and was right to.
**Do NOT pick this up as free work.**

🎯 **THE PRECONDITION, in checkable terms:** *no other session holds a claim in
the monolith.* (`faves-hygiene`'s wording, adopted over "when the board is
quiet", because "quiet" is a judgement and this is a `grep` for `- [~]`.)
- A split executed while sessions hold claims in `ROADMAP.md` **will lose
  claims** — the one failure the ruling names. Announce, wait for peers to land
  and confirm, then migrate.
- ⚖️ **It also wants a FRESH session.** This is delicate, wide-blast-radius
  surgery — `ROADMAP.md`, `ROADMAP-DONE.md`, the harvest convention,
  `sizescan`'s special case, every cross-reference in `SESSIONS.md` and the
  ADRs, **and `CLAUDE.md`'s safety floor**. Two sessions have now declined it at
  the tail of a long run rather than do it badly, which is `ECONOMICS.md`
  working as intended and not a lack of takers.
- `tools/` already assumes the monolith: `sizescan` special-cases `ROADMAP.md`,
  and the floor's `board` gate currently reports *"not in scope — no
  `docs/roadmap/` directory (this repo does not use the split board)"*. **That
  gate is already written and waiting** — the split is what switches it on,
  which is a strong sign the upstream shape was always intended here.
  🔑 **And that gate is a THIRD FACE of ADR 0072's pattern, named by
  `faves-hygiene`: a LATENT guard.** Its verdict is perfectly honest — unlike a
  decorative guard, it is not lying — and it carries **zero information**,
  because its subject does not exist and never has. It has run clean in every
  commit since it was wired and would have run clean forever. *The tell is
  different: a decorative guard needs probing to expose; a latent one announces
  itself in plain text and nobody reads it.*
  🔎 **A fourth face turned up the same hour, from the other direction —
  DEGRADED.** 37k's vibe migration renamed `craft beer` → `craft-beer`, and
  `tools/drinks_gap.py` held `DEFINITE_VIBE = {"craft beer", "beer garden",
  "garden bar"}`. It did not fail. It did not warn. It **silently matched
  nothing**, and its derived worklist quietly lost 7 hits. Not decorative (it
  worked until the data moved) and not latent (its subject existed) — its
  correctness was coupled to a literal in another file with **nothing asserting
  the coupling**. Caught only because an agent went looking.
  🎯 **All three share one root and it is worth writing up as its own record:
  nothing asserts that the guard's SUBJECT is still real.**
- `CLAUDE.md`'s inlined floor quotes the compressed rule and must change **with**
  the split, not after it. That file is the safety floor: it is the owner's edit
  to approve, and this ruling is that approval for this specific change.
- ⚠️ `ROADMAP-DONE.md`, the harvest convention, and every `docs/ROADMAP.md`
  cross-reference in `SESSIONS.md` and the ADRs are all downstream. `linkscan`
  is enforced, so a half-done split fails the floor — which is the good outcome.
