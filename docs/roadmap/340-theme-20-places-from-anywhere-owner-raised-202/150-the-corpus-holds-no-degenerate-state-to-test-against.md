- [x] 🔎 **The corpus is uniformly healthy, so a whole class of behaviour ships
      unexercised** `[M][tools]` — found 2026-08-19 while shipping the branch
      card's closure precedence.

  **Measured:** all **55** files in `site/data/restaurants/` carry
  `lifecycle: {added: …}` and **not one** carries a `lifecycle.events` entry.
  `grep -rl "closed-permanently\|closed-temporarily" site/data/` returns
  nothing. So there is no closed venue, and by extension no temporary closure
  and no overdue reopening, anywhere in the shipped data — the branch card's
  behaviour for a shut-down chain could not be asserted against any real file,
  and the guard that was supposed to cover it had been **certifying the wreck**
  instead (it passed *"the lead is not a branch we know is closed"* on a
  permanently-closed chain).

  **What was done about it, once:** `startServer` gained an optional `overlay`
  (pathname → bytes) so a check can serve a fixture venue over one HTTP GET
  while the rest of the tree stays real. The two alternatives were both worse —
  inventing a closed venue in `site/data/` ships a fiction to every phone
  ([ADR 0047]), and stubbing `fetch` in the page tests a fake instead of the
  real load path.

  🎯 **The general question, which is what this item is for.** Closure is one
  degenerate state; there will be others (a venue with no hours anywhere, a
  dish with no price, an empty section). Options:
  1. **Leave `overlay` per-tool** — cheapest, and it drifts into three
     different fixture idioms.
  2. **A shared `tools/lib/fixtures.mjs`** of degenerate-state venues every
     check can overlay. One idiom, one place to look.
  3. **A synthetic sibling corpus** the checks serve wholesale — most thorough,
     most to keep in step with the real schema, and the most likely to rot.

  🚩 **And the standing consequence, whichever is chosen:** *"the checks are
  green"* says nothing about states the corpus does not contain. That is not a
  gap in the checks; it is a gap in the fixtures, and it looks identical from
  the outside.

[ADR 0047]: ../../decisions/0047-the-app-ships-only-what-it-renders.md

  ✅ **DELIVERED 2026-09-09 (session faves-o1)** — option **2**, a shared
  `tools/lib/fixtures.mjs`, with the drift problem the option list did not
  name. [ADR 0109]. Worktree `faves-o1-degenerate-fixtures`, branch
  `degenerate-fixtures`, landed by PR.

  **RE-MEASURED first, because the item is from 2026-08-19.** All **57**
  venue files (was 55):

  | state | in the corpus |
  | --- | --- |
  | `lifecycle.events` — any closure at all | **0 of 57** |
  | a `null` day, "never published" ([ADR 0105]) | **0** |
  | a section with no items | **0** |
  | a dish with no recorded price | **0** |
  | a venue with no hours anywhere | 12 of 57 |
  | a branch with no hours | 10 of 47 |

  So the item's headline finding still holds unchanged, and the states added
  since (a branch id, an unknown day, a hit-testing click) added two more
  holes rather than closing any.

  **The shape.** A fixture is a REAL corpus record with ONE named transform
  applied — *derive, never author*. Seven states live in
  `tools/lib/fixtures.mjs`; a check asks for one by name. The point is the
  failure mode the option list did not mention: a hand-written venue is
  frozen on the day it was typed and never grows `sectionId`, `dishId` or a
  branch id as the schema does, so the check standing on it goes on printing
  PASS against a fiction.

  🛑 **How a fixture is stopped from drifting — the load-bearing part.**
  `tools/fixture_check.mjs` builds **every state in `STATES`** (read off the
  object, never a hand-listed subset) over **two structurally different**
  venues, writes them into a sandbox copy of the tree, and runs the **real
  `tools/validate.py`** — the gate the corpus itself passes through, not a
  second copy of the schema. Zero new ERROR lines required; new warnings are
  allowed and printed. `--selftest` then breaks each fixture and demands the
  validator name **that** fixture, matching the regex the case declares.

  It caught three faults before any of it was committed, **none of them
  visible in a browser**: the empty section wrote `{id, name}` where the
  schema says `{section, sectionId}`; the unpriced dish collided on a derived
  `dishId`; and a module-level closure constant was **aliased** into every
  fixture, so one `--selftest` case's mutation leaked into the next five and
  satisfied all of them — every case green, two proving nothing. That third
  one is why each case now names its expected complaint.

  **The break-probe.** With `menu.js`'s closure precedence disabled
  (`if (false && closure)`), verbatim:

  ```
  FAIL  a permanently-closed chain: NO branch is given a posted-hours status
          closed: Closed | closed: Closed | closed: Closed | closed: Closed
  ```

  Exactly one assertion here, and 8 in `branch_check` — including
  *"every branch says exactly what the page header says, the lead included"*.
  Its paired assertion, *"the closure is SAID on the card"*, stayed green
  with 3 badges, so the two halves fail independently. Reverted; this branch
  does not touch `site/`.

  **Covered:** permanently closed · temporarily closed with an overdue
  reopening · no hours anywhere · an unknown day · a branch without hours ·
  an empty section · an unpriced dish. `branch_check` now builds its closure
  fixtures from the library, retiring the second idiom (98 passed, 0 failed
  before and after).

  🔎 **Two live facts the fixtures found, which nothing had asserted.**
  (1) An overdue temporary closure drops its stated return date — and no
  record in the corpus carries an `until`, so that branch of `closure-ui.js`
  had never been executed by anything. (2) `temporal.js` drops a section with
  no items before the page sees it, which is right, **but its comment says
  "a data error validate.py catches"** and the schema gate proves validate.py
  accepts it. The behaviour survives its wrong reason; the comment is left
  alone because changing it touches `site/`.

  🚩 **NOT covered, so this closes honestly rather than completely.**
  · `midnight_check` still stubs `fetch` in the page, deliberately — it
  toggles the SAME id patched and unpatched in one run, which an overlay
  cannot express. A stated exception, not drift.
  · No fixture reaches the HOME screen: that needs `index.json` overlaid too,
  which nothing has needed yet.
  · Composition is gated by the schema half but asserted in the browser only
  as single states.
  · `fixture_check` is not in CI, like fifteen of the seventeen browser
  checks. Its `--schema-only` half needs no browser and is the half that rots
  silently, so it is the one worth wiring first.
  · And the item's own standing consequence is **not retired and cannot be**:
  these are the states someone thought of. A state nobody has named is still
  invisible, and still looks exactly like a passing check.

[ADR 0109]: ../../decisions/0109-a-fixture-is-a-real-record-with-one-transform.md
[ADR 0105]: ../../decisions/0105-a-day-may-say-nothing-and-that-is-not-closed.md
