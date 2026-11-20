- [x] **f. `verified` must carry its derivation** `[M][schema]` — shipped
  2026-08-09 (ADR 0031). `verified` keeps its shape and gains a sibling
  **`verifiedBy`** naming one of six **source classes**: `in-store` ·
  `paper-menu` · `official-site` · `phone` · `delivery-app` ·
  `third-party`. Granularity is the **record**, argued rather than assumed —
  acquisition here is a session act (one person, one source, a whole menu),
  and where a menu genuinely has two readings the schema already separates
  them as two price-series entries, so an optional per-entry `method`
  override ships too and inherits the venue's when absent. Per-price as the
  primary level was rejected: with no backfill it would ship 100% empty
  (§9's own "more dimension than the questions justify"). `verified` as an
  object was rejected too — four live consumers read it as a bare string on
  installed phones. `validate.py` errors on an off-vocabulary method, a
  method with no date, and `status: "verified"` without both; it **warns**
  on a date with no method, so nothing is invented. Applied to the only two
  records with a date, from provenance `SESSIONS.md` states: Gold Lining
  `in-store`, Churton `paper-menu`. Menu header reads "Read from a paper
  menu, 8 Aug 2026". Verified: node --test 491 pass, validate 31 files, <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->
  headless-Chrome check on the two records at 390 px.
