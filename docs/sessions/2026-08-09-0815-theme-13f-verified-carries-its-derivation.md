- **2026-08-09 (Theme 13f — `verified` carries its derivation — Opus 5,
  wt: faves-verified-derivation)**: PRINCIPLES §9's retrofit ruling, applied
  to the flag §9 names. ADR **0031**.
  **The queued framing was challenged and half-rejected, deliberately.** The
  roadmap wanted `verified` to *become* date + method, at a granularity its
  own text pushed toward per-price ("a date alone cannot distinguish an
  owner-confirmed price from a scraper's guess"). Both halves changed:
  🔎 **Granularity stays at the record, and the argument is evidential, not
  economic.** Acquisition here is a *session* act — one person reads one
  source and transcribes a whole menu — so the method belongs to the reading.
  And where a menu genuinely has two readings, this schema **already**
  separates them: they are two price-series entries with their own `recorded`
  dates (ADR 0023). So the finer method got its home there — an optional
  per-entry `method` that inherits the venue's when absent — while the
  primary level stayed the record. Per-price as the primary level would have
  shipped 100% empty under the no-backfill mandate, which §9 itself calls a
  defect ("more dimension than the questions justify").
  🔎 **`verified` did not become an object.** It is read as a bare string in
  four live places (`temporal.js` `defaultRecorded`, `menu.js`, `report.js`,
  `report-ui.js`) on a site installed on phones; an object reaching any
  pre-change renderer prints `[object Object]` into a bug report. A sibling
  **`verifiedBy`** is invisible to old JSON and old JS alike. §9 says
  "alongside", not "nested".
  **The vocabulary was derived from this repo's own records, not invented.**
  `SESSIONS.md` and WORKPLAN batch 3 already state how every menu was
  obtained, and the spread forced the enum: Gold Lining photographed in the
  shop; Churton from a printed menu; KC Cafe a 2015 scan; Thai Tara an
  undated PDF; R & S a board photo with no prices; TJ Katsu and Sushi Bi off
  the venues' own sites; Subway's hours contradicted across four aggregators.
  Six source classes, closed set, never a person: `in-store` · `paper-menu` ·
  `official-site` · `phone` · `delivery-app` · `third-party`. `delivery-app`
  is kept separate from `third-party` because batch 3 drew that line itself
  ("prices from paper menus, **not** delivery apps") and the error there is
  *biased* (markup), not merely stale. No `inferred`/`guess` value — we do
  not store prices we inferred, and adding one would need its own decision.
  **Enforcement**: `validate.py` errors on an off-vocabulary method, a method
  with no date, and `status: "verified"` without both halves (zero records
  affected — nothing has that status). It **warns** on a date with no method,
  which is how "no backfill" and "keep the gap loud" coexist.
  **Applied, twice, from evidence.** Gold Lining → `in-store`, Churton →
  `paper-menu` — the only two records with a `verified` date at all, so the
  warning now fires on nothing. Recording a method the records *state* is not
  backfill; none was invented.
  🚩 **The gap this exposed and did not close (queued 13g, owner call).** The
  "needs a refresh" caveat keys off `!verified`. TJ Katsu and Sushi Bi sit at
  `verified: null` although we know exactly when and how both were read —
  partly *because* setting a date would silently switch off a caveat that is
  right (TJ Katsu's source site is ©2017 with a 404ing nav). That is §9's
  "unknown is not none" still live here: one null meaning both "never read"
  and "read from a source we don't trust". Fixing it needs a stated policy on
  which methods count as a check; an agent picking that threshold would move
  live UI on judgement rather than evidence.
  Verified: `node --test` **491 pass** (483 before; 8 new, 1 existing shape
  assertion updated); validate 31 files, 11 warnings, none about derivation;
  no-deps; SBOM check; `device_check.mjs` 15 pass after the `menu.js` touch;
  and the render browser-checked at 390 px in headless Chrome on a fresh
  `--user-data-dir` — Gold Lining "Read in store, 7 Aug 2026", Churton "Read <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  from a paper menu, 8 Aug 2026", KK Malaysian no line and its caveat intact. <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  ⏳ **ADR number 0031 may collide** with a parallel agent; note that `0025`
  is already duplicated in `docs/decisions/`. Not merged, not pushed —
  the orchestrator integrates.

