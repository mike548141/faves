- [x] 🚩 **The data gates accept what their own comments say they reject**
      `[M][tools]`
      ✅ **ALL FOUR SHIPPED 2026-08-17 (`93f4580`).** Re-run independently by the
      merging session, not taken on the builder's report: `test_validate`
      **124/124** · `split_data --check` **55/55** · `validate.py` 55 files, the
      same 70 warnings · `fetch_fx --check` 35 of 35 rates in band ·
      `test_tag_allergens` 18/18 · `node --test` 1105/0. **Corpus fallout: none**
      — zero empty cuisines, zero overlapping hours, zero unknown keys, and no
      venue's menu facts touched.
      🔎 **One of this item's own claims did not survive measurement, and the
      truth is worse.** It said `validate.py` *"tracebacks rather than failing
      cleanly"* on a `NaN` price. It did not — it accepted `NaN` **silently**,
      exit 0, 55 files valid. And the browser's `JSON.parse` refuses the token
      outright, so the venue would not carry a *wrong price*, it would **fail to
      load at all**. A real traceback did exist, on a different input: a dish
      with no `name` raised `KeyError` inside
      `tag_allergens.ingredient_text` and killed `validate.py` **before it
      printed a single line** — exit 1, no message, indistinguishable from the
      gate working.
      🔑 **`split_data --check` covered 2 of 55 for the worst possible reason:**
      a venue with no history file was skipped, and *that is exactly the state a
      deleted history file leaves behind*. The check was blind to the one thing
      [ADR 0023] built it for. It now checks 55, **prints its own scope line**,
      and adds two independent halves — every history row must point at a real
      dish, and the record must hold at least as much history as at `HEAD`.
      🔑 **The decorative mutations are now PROVEN structurally, not argued.** On
      `main`, a warn-expecting case asserted `rc == 0 and "warning" in
      out.lower()` (`test_validate.py:704`) while the unmutated baseline emits
      **seventy** warnings — so **every** warn-expecting mutation passed
      unconditionally, whatever the guard did. No sabotage run was needed to show
      it; reading the harness was enough. The new harness subtracts the
      baseline's lines first and requires each case to match **its own message
      regex**; a no-op mutation and a case with no expectation are now both hard
      failures. 113 → 124 cases.
      🎯 **Item 5 — which of these belong in CI — is NOT done and is the owner's.**
      The builder's recommendation, recorded and not acted on: **add**
      `split_data --check` (2.9 s, and now the only thing that can see a
      destroyed history row), `test_registry` and `test_find_addons` (pure Python,
      fast); **lower priority** `test_tag_allergens` (guards a tool, not the
      shipped data); ❌ **do not add** `fetch_fx --check` — `fx.yml` writes that
      file weekly on its own PR, so putting the check in the main job turns
      *every unrelated PR* red the day the source drops a rate. It belongs in the
      fx workflow, gating its own PR.
      🚩 **Also found, out of scope, reported not fixed:** `ARCHITECTURE.md`'s
      schema block omits two fields `validate.py` validates — `translations`
      ([ADR 0044], on sections and items) and `attribution` (37e, on items).
      Nothing *documented* is refused; the doc is short of the code.
      Original filing follows — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), measured rather than read:
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

[ADR 0023]: ../../decisions/0023-time-dimension-in-the-data.md
[ADR 0044]: ../../decisions/0044-a-menu-can-be-written-in-another-language.md
