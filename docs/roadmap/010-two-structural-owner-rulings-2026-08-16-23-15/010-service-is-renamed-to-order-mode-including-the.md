- [~] 🛑 **`service` is renamed to `order-mode`, INCLUDING the shipped filter**
      `[M][js]` — owner-ruled 2026-08-16.
      **CLAIMED 2026-08-17 12:35 UTC (wt: order-mode-0817-1235)**. Not a rename: a rename
      **plus a URL compatibility path**, which is the part that must not be
      skipped. Unblocked since 2026-08-17 (37k landed), and it inherited a
      fourth filter axis while it waited.

The word means **three** different things and three sessions collided with it
independently in one day:

| # | What it is | Status |
|---|---|---|
| 1 | `filters.js` `service` — the values `all` · `takeaway` · `dine-in`, a home-screen `<select>` on 55/55 venues | **shipped** |
| 2 | Theme 30's `channel` — `dine_in`/`takeaway`/`delivery`, a **price-and-tax** axis (delivery menus run 15–30% above dine-in) | proposed |
| 3 | Theme 30's proposed `service` **axis label** on `cuisine` values ("`Cafe` is a format word") | proposed |

He was offered the cheap option — keep the shipped one, rename only the two
proposals — and **ruled the other way: rename all three, the live filter
becomes `order-mode`.** ⇒ `service` stops being overloaded entirely rather than
being left as the one survivor that future readers still have to disambiguate.

🚩 **THE COST HE IS ACCEPTING, AND IT IS THE WHOLE OF THE WORK.** The filter is
**shipped and in URLs** — `filtersFromQuery` reads it, and a saved or shared
link carries `?service=takeaway`. Renaming the key without a shim makes every
existing shared link **silently lose its filter**: no error, no notice, just a
different set of venues than the sender saw. So this is not a rename, it is a
rename **plus a compatibility path**, and the compatibility path is the part
that must not be skipped:
- read the old key, write only the new one;
- `tests/filters.test.js` must assert an old-style URL still resolves;
- and per ADR 0072, that test must be **proven to fail** without the shim,
  or it is decorative.
Also in scope: `site/index.html`'s filter markup, `app.js`'s URL sync,
`reo.js`'s gloss, and `tools/boot_check.mjs` (it reads filter element ids).
✅ **The sequencing gate is DISCHARGED 2026-08-17.** This item was held behind
37k's style filter because that work was live in `filters.js`, `app.js` and
`index.html`. **37k has landed** (`9aa6071`…`62546b4`, wt removed, claim
released) — so `order-mode` is now unblocked and takeable. ⚠️ Note what it
inherited while it waited: `filters.js` gained a **fourth** axis (`style`), so
the rename touches one more select, one more `DEFAULT_FILTERS` key and one more
URL parameter than the description above assumed.