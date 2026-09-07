- [x] 🛑 **An unresolved merge conflict shipped to a PUBLIC `main` and stood
      for a day — no gate in the estate looks for conflict markers**
      `[S][tools]` — found 2026-09-08 (session faves-o1) by a sub-agent
      appending an ADR entry, which is the only reason anyone opened the file.

  **What was there.** `docs/decisions/README.md` carried a live three-way
  conflict — `<<<<<<< HEAD` at line 1037, `=======` at 1053, `>>>>>>> 6cb391d`
  at 1074 — wrapping the index entries for ADR 0096 and ADR 0097. It arrived
  in the merge of PR #11 (`35ed34e`, 2026-09-07) and was on `main` for about a
  day. The repo is public, so it was public.

  ✅ **FIXED 2026-09-08 (session faves-o1), and the fix was the boring one:**
  both entries belong — 0096 and 0097 are separate accepted records whose
  files both exist — so the resolution is to keep both in numeric order and
  delete the three markers. Nothing was lost; `check_decisions.py` reports
  `96 record(s), all indexed` before and after.

  🛑 **THE FINDING IS THAT NOTHING CAUGHT IT, and four things could have.**
  - `check_decisions.py` passed throughout. It asks *is every ADR file named
    in the index* — a question the conflict does not disturb, because both
    entries were present, just fenced. ADR 0072's shape exactly: the guard's
    output was identical whether or not the file was broken.
  - **CI was 8/8 green on PR #11**, floor included, and stayed green on every
    commit after.
  - The **floor's fifteen scanners** include none for this. A sweep of
    atelier's `tools/*scan.py` finds `datescan`, `wrapscan`, `linkscan`,
    `spellscan`, `plainscan`, `pathscan`, `sizescan` and the rest — nothing
    reads a line as a conflict marker, and `wrapscan` would not fire because
    `<<<<<<< HEAD` is 14 columns.
  - **A human read the file** to write the 0097 entry and did not see it.

  🔎 **Swept, not sampled** (the house rule: a symptom count is not an
  enumeration). `grep -rn -E '^(<<<<<<< |=======$|>>>>>>> )'` across the whole
  worktree, excluding `.git/`, returns **exactly this one file** — so the
  incident is one file, and the *class* is unguarded everywhere.

  🚩 **Points up: the gate belongs to atelier, not here.** A conflict marker
  committed to a tracked text file is true of every git repository in the
  estate and beyond, which is the house's own test for whose rule it is. This
  repo can add a local grep, and that fixes one clone of eleven. Filed as a
  hand-up rather than fixed locally: **offered, never recommended** —
  (1) a `conflictscan` in the floor registry, enforced, ~15 lines, reaching
  every hook and every CI run at once; (2) fold the check into an existing
  scanner (`plainscan` reads every line already) at the cost of muddling its
  subject; (3) rely on review, which is what was relied on here.

  📌 **What this repo owes**: nothing further once the hand-up is filed. The
  local incident is fixed and recorded above.
