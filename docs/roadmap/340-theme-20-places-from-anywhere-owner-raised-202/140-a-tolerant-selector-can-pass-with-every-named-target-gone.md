- [ ] 🚩 **A tolerant OR-list selector can pass with every named target gone**
      `[S][tools]` — found 2026-08-19 by the `070` sweep, filed rather than
      fixed because the right answer differs per assertion.

  `boot_check` matches `".dish-price, .item-price, [class*='price']"`. If both
  named classes were removed the catch-all still matches, so the assertion
  keeps passing while the thing it names has gone. That is the
  decorative-guard shape ([ADR 0072]) with **no missing id for a sweep to
  find** — `070`'s method cannot see this one, which is why it is its own item.

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
