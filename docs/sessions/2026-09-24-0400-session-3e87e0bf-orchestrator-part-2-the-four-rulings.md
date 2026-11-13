## 2026-09-24-0400 — session `3e87e0bf` (orchestrator, part 2): the four rulings, the 68 rows, and a probe that refused the feature

Continuation of `2026-09-20-1053`. Between the two, a peer (`26e43c41` /
faves-62) cold-reviewed and merged two of this run's three worker branches and
bumped the pin; this half picks up from its handover.

### Delivered

| item | what landed |
|---|---|
| `200/080` | heat becomes **one vocabulary** (`site/js/heat.js`), ADR 0121 |
| `470/030` | **four owner rulings** executed — report 44 rows → 1, ADR 0122 |
| `470/060` | **67 dishes gain a gluten warning**, ADR 0123 |
| atelier **PR #87** | corroboration filed on `320/160` |

🛑 **The `470/060` probe REFUSED the feature, and that is the result, not a
failure.** The owner ruled *"the data pass now, the tool change behind its own
break-probe"*. The data pass tagged 67 of 68 rows on the heading the shop
itself wrote. Then the probe ran **before** the feature, and a 57-record dry
run found ~48 false positives in two classes **no hedge can reach**:
- a **disjunctive** heading — `Beer & Cider` → gluten on an apple cider;
  `Chicken & Fish` → fish on Chicken McNuggets; `Sushi & Sashimi` → fish on an
  avocado roll;
- a heading **not about food** — `Bun swaps` → `contains-gluten` on
  BurgerFuel's ***Gluten friendly bun*** and on a ***lettuce*** bun.

🔑 **Those last two are the exact rows ADR 0097 and ADR 0116 exist to protect.**
A writing tier would have undone two accepted records with one line, on the one
item a coeliac is hunting for. So `SECTION` is a fourth tier that is **read and
reported and never written**. Putting the probe first is what caught it; the
ruling's own sequencing did the work.

🔎 **The single declined row is the finding.** `hell-pizza`'s *Lamb Shank and
Mash* sits under **`Anti Pizza`** — Hell's own word for the part of its menu
that is not a pizza. The heading is evidence **against**. One row is what
stopped a writer shipping.

### 🛑 Three things this session got wrong

1. **A claim about `stampscan` that does not reproduce.** We recorded the bare
   run as *"✓ clean, no stamped blocks found"*, exit 0 — the decorative-guard
   shape. It exits **2**, tripping on the ADR that *quotes* the marker syntax,
   and never scans `CLAUDE.md` at all. The scope claim was right; the symptom
   was wrong, and **the corrected shape is worse**: both invocations exit 2
   with near-identical messages while only one looked at the floor. It had
   already travelled into an item, an ADR and an upstream hand-up before anyone
   ran the command clear of a pipe. *A check's description is not evidence
   about the check* — arriving from a new direction: the description was a
   worker's report.
2. ⚠️ **`--stat` is not reading the staged index.** Mid-merge in the shared
   primary checkout, `git add site/sw.js` picked up a **live peer's**
   resolution of a file this session had just written. The peer and this
   session both read `git diff --cached --stat` before committing and both
   would have said they had read the index. **The stat line is byte-identical
   for either resolution; only `git diff --cached` shows content.** Neither
   session was wrong — the shared file was the seam. The value that landed was
   the peer's and was the better one.
3. ⚠️ **A claim went in after its worker was dispatched.** Releasing `470/030`
   when the sweep delivered left it open while a worker was live on it. No peer
   took it in the window; recorded because a near miss that goes unwritten is
   how the rule erodes.

### 🔑 And one about asking

The owner was asked whether `17e` is buildable work or an idea-only research
record. **That was a bad question**: three of its bullets are struck as
shipped, so sessions have been building from that list since 2026-08-16. The
item's own history answered it, and he was made to parse a summary instead.
His reply said so. **An ask is a claim, and "I could not tell" is a claim about
the record that has to be true before it is put to him.**

### Verified on the merged tree

`validate` 57 valid / 74 warnings · `test_validate` 147 · `test_tag_allergens`
**105** · `test_allergen_disagreements` 20 · `split_data --check` ·
`test_split_data` 8/8 · `check_fallback` · `check_precache` 97/2/57 ·
`check_decisions` **122** · `check_stashes` · `check_versions --range` ·
`node --test` **1318/0** · `boot_check` 24 · `focus_check` 26.
`DATA_VERSION` → `2026-09-24.1`, `SHELL_VERSION` → `2026-09-24.1`.

### 🎯 Left for the owner

- **Should the tagger EVER write from a heading?** This delivery answers *"not
  on this evidence"*; it does not answer *"never"*.
  `python3 tools/tag_allergens.py --tier SECTION` prints the 70 rows with each
  finding's basis, which is what that call would be taken on.
- **ADR 0121 centralises heat** into one vocabulary, beside his 2026-09-07
  `340/230` ruling that one shared source of truth for tag labels was
  *"declined for today"*. Heat only; dietary and allergen mirrors untouched.
  Reverting is a local copy in `addons-ui.js` and one test.
