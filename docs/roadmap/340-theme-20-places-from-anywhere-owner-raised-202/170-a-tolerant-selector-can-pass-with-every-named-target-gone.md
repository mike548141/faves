- [x] 🚩 **A tolerant OR-list selector can pass with every named target gone**
      `[S][tools]` — found 2026-08-19 by the `070` sweep, filed rather than
      fixed because the right answer differs per assertion.

  `boot_check` matches `".dish-price, .item-price, [class*='price']"`. If both
  named classes were removed the catch-all still matches, so the assertion
  keeps passing while the thing it names has gone. That is the
  decorative-guard shape ([ADR 0072]) with **no missing id for a sweep to
  find** — `070`'s method cannot see this one, which is why it is its own item.

  🔎 **MEASURED 2026-09-06 (session faves-24) — the population is SEVEN, and
  only ONE of them has the shape this item describes.** Grepping the 13 check
  tools for a multi-target selector returns seven call sites:

  | site | selector | can it pass with every named target gone? |
  |---|---|---|
  | `boot_check.mjs:83` | `.dish-price, .item-price, [class*='price']` | **YES** — the wildcard is the catch-all |
  | `boot_check.mjs:530` | `.settings-versions, .about-versions` | no — both named |
  | `device_check.mjs:136` | `.tag-allergen.is-muted, .tag-diet.is-muted` | no — both named |
  | `focus_check.mjs:103` | `.diet-chip, .diet-chips` | no — both named |
  | `picks_check.mjs:286` | `.settings-sheet[open], #settings-sheet[open]` | no — class-or-id, deliberate |
  | `filter_row_check.mjs:121` | `select, .list-toggle, #filters-clear` | no — enumerates a control row |
  | `filter_row_check.mjs:128` | `select, .list-toggle, #filters-clear` | no — same row, second read |

  🔑 **This changes the size of the question, not its substance.** Six of the
  seven name real alternatives, so deleting all of them *does* fail the
  assertion — which is the behaviour the item wants. The decorative shape is
  **one line**, and it is the very line the item quotes. So "the right answer
  differs per assertion" is true in principle and, on today's corpus, resolves
  to a single decision about `boot_check.mjs:83`.

  🚩 **What this measurement does NOT settle**, said plainly so it is not
  over-read: it looks only at selectors with a comma. It says nothing about the
  111 single-target `querySelector(` calls the note below describes, where the
  failure shape is *taking the first of several matches* rather than *matching a
  catch-all*. That audit is still unrun and is still the bigger job.

  ✅ **DELIVERED 2026-09-07 (session faves-24, merged `85880ee`).**
  `boot_check` now reports `matchedBy` — which of the named classes actually
  matched — so a silent migration is visible instead of being absorbed by the
  wildcard. Proven by breaking: with both named classes made unmatchable while
  `[class*='price']` still matched 187 elements, the **base commit PASSED**
  (`{"prices":187}` — the decorative pass, exactly as filed) and the fixed
  version **FAILS** naming the gap: *"187 priced element(s), but NONE of
  .dish-price / .item-price matched any of them — only the [class*='price']
  catch-all did."*
  🔎 **And it immediately said something nobody knew:** on today's corpus
  `matchedBy` prints `[".dish-price"]` **only** — `.item-price` is **dead
  markup**. That is a fact this assertion was structurally incapable of stating
  before, and it is the clearest possible demonstration of why option 2 beat
  option 3.
  📌 **The other six multi-target selectors were left alone**, as ruled — they
  name real alternatives and would correctly fail if all were removed. Changing
  them was out of scope.

  ✅ **RULED 2026-09-06 — OPTION 2: ASSERT WHICH ALTERNATIVE MATCHED.** Taken on
  the measurement above, which reduced the question from an audit to a single
  line. The tolerance stays, so legitimately two-form markup still passes; what
  changes is that the check now reports **which** class it actually found, so a
  silent migration becomes visible instead of being absorbed by the wildcard.
  Options 1 and 3 were both declined — naming one class was judged too brittle,
  and commenting the tolerance leaves the decorative shape ADR 0072 exists to
  remove.

  🎯 **Options, per assertion and not globally:**
  1. **Name one class and let it fail loudly.** Strongest signal; brittle if
     the markup legitimately offers two forms.
  2. **Assert WHICH alternative matched.** Keeps the tolerance and makes a
     silent migration visible — probably the best default.
  3. **Keep the tolerance and comment why**, where the alternatives really are
     interchangeable.

  🔎 **Related shape, measured on a different tool the same day** (recorded in
  `210-…/040`): a snapshot helper reading `querySelector(".hours-badge")` took
  the FIRST match of several and silently exempted every later one — a draft
  fix passed its own break-probe because of it. There are **111
  `querySelector(` calls across the 13 check tools** (boot 32, sync 16, recipe
  12, branch 11, served 10, device 9…). Most target genuinely unique elements
  and are fine; **nobody has audited them**, so that is a shape and not a count
  of defects. A sweep asserting each snapshot selector is unique in the
  rendered DOM would settle it, and is a bigger job than this item.

[ADR 0072]: ../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
