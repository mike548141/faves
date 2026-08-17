- [~] 🚩 **The data gates accept what their own comments say they reject**
      `[M][tools]`
      **CLAIMED 2026-08-17 13:20 UTC (wt: data-gates-0817-1320)** — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), measured rather than read:
      **`validate.py`** accepts **unknown keys** at top level, section, item and
      `locations[]` — its own comment says it does not — plus an empty
      `cuisine`, overlapping hours, and a `NaN` price (which tracebacks rather
      than failing cleanly).
      **`split_data.py --check`** skips **53 of 55 venues**, so it cannot see a
      row deleted from `data/history` — the one thing it exists to catch
      (ADR 0023's guarantee that a refresh cannot silently destroy history).
      **`test_validate.py`**: **5 of its 113 mutations pass whatever the guard
      does**, because the harness asserts an exit code or *any* warning rather
      than *which* warning. A mutation test that cannot fail is a decorative
      test of a real guard.
      **`fetch_fx.py`** has no plausibility band: a rate the source silently
      drops vanishes and the check stays green.
      🔑 **And CI runs none of `split_data --check`, `fetch_fx --check`,
      `test_tag_allergens`, `test_registry`, `test_find_addons`** — so four of
      the five faults above sit in tools that only run when a human types
      them.
