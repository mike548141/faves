- [ ] **How many you may pick, and what the extras beyond that cost**
  `[M][schema][data]` — **owner-ruled 2026-10-03:**

  > *"Some addons might have a list of things and the user may be forced to
  > select a certain number of them, like the sauces on a kebab or iskender.
  > The number range may change between dishes for example kebabs are often
  > "not more than 3" i.e. 0-3 are fine, after that is disallowed. Some allow
  > more but charge an additional fee"*

  and the boundary (ruling 4): *"Some addons are purely optional and what we
  have today is perfect for those"*. Every new field is optional, and leaving
  it out keeps today's behaviour exactly.

  **What exists (ADR 0048):** `max` on a pick-many group, as a hard cap. That
  covers "not more than 3".

  **Not expressible today:**
  - **A minimum** ("pick at least 1", "choose 2"). ADR 0156 explicitly left
    pick-many minimums undone, because no wording then asked for one.
  - **A free allowance, then a fee.** For example, Charley Noble's grill
    note: *"served with a choice of sauce … or butter …; additional sauce or
    butter $4"*. That is one included, then $4 each, and it is still prose.
  - **Per-group counts inside one build.** For example, Hell Pizza's
    build-your-own: *"up to 8 toppings — … plus 1 meat, 1 vegetable and 1
    sauce. Extra toppings priced individually."*

  How often each shape occurs is `200/100`'s survey to measure, before the
  schema is designed. Lands in: an ADR, `ARCHITECTURE.md`, `validate.py`,
  `addons.js` (`selectionAllowed`, `configuredPrice`), the picker's words
  ("2 included, then $1 each"), the recall cap check (`saved-recall.js`), and
  `addon_check`.
