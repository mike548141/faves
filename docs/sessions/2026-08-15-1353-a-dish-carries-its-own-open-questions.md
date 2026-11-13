## 2026-08-15 — A dish carries its own open questions (wt: dish-needs) — Opus 5

**Asked for:** turn the roadmap's "go and check this dish" items into an
indicator on the dish in the app. **Delivered:** per-dish `needs`, a `?` pill
that says what would fix it, and `tools/needs.py` — the roadmap now points at a
command instead of naming dishes. [ADR 0041](../decisions/0041-a-dish-carries-its-own-open-questions.md).

**The ask turned out to fix a data bug, not just a UI gap.** `price: null` was
carrying two incompatible meanings — *the shop prices this on application*
(1841's Fish of the Day) and *we tried to read it and couldn't* (Gold Lining's
Falafel Wrap) — and the menu rendered both as `—`. A reader could not tell the
shop's uncertainty from ours, and neither could the next transcriber. A dish with
`needs: price` now shows **`?`**; everything else keeps the `—` that has always
meant *ask*. Two admissions, finally distinguishable. 69 dishes corpus-wide have
a null price and **only two** are actually gaps, which is why this could never
have been inferred from the null.

**Where the chip is NOT.** The obvious build is a chip in the existing
`dish-tags` row. Rejected: two of those chips are allergen warnings, and the
entire design intent of that row is that a `⚠` in it means *this food could hurt
you*. A record-keeping note among them, in the same shapes, dilutes exactly the
chips that must not be diluted. It gets its own row between the description and
the tags, its own `?` glyph, and a dashed neutral pill — never the `⚠` the
allergen chips and the refresh caveat own. The headless check asserts the tag row
stays uncontaminated, so a later refactor can't quietly move it in.

**Kept in English on purpose.** `reo.js` draws an explicit safety boundary — the
allergen chips and the "needs a refresh" caveat stay English until a reo review
because a misreading could hurt someone. This says the same class of thing about
the same class of fact, and one of its kinds is literally `allergens`, so it
carries no `data-i18n` and falls through automatically.

🚩 **The closed set is now written in three files, so it got a guard.**
`site/js/needs.js` holds the labels and fix text, `validate.py` decides what is
legal, `needs.py` reports. The dangerous drift is silent: a kind the *renderer*
doesn't know is dropped from the page, so the data would claim a gap no reader
ever sees — the "decorative guard" failure this repo keeps finding. Added a
cross-file check to `test_validate.py` and **verified it by breaking it**:
injecting a `photo` kind into `validate.py` alone made it fire with all three
lists printed; restoring returned it to "in step". 21 mutations now, up from 14.

**Caught by an existing guard, worth recording.** `needs.js` is a new module and
`sw.js` precaches an explicit file list — a missing entry breaks offline for
every menu page, which is a hard constraint. `tests/sw-versioning.test.js`
already asserts every shipped module is precached, so the omission had a net
under it before I noticed. That test earned its keep today.

**Data.** Four gaps recorded, all previously prose: Gold Lining's Falafel Wrap
(price label behind the cabinet frame) and Bliss Balls (no price card in shot,
*plus* the flavours-or-ingredients question — one dish, two entries), and
Southern Cross's "Garage Project Aro Noir Pinot Gris", which is probably two
products run together with no separator to read. `validate.py` errors if a dish
carries both a price and `needs: price`, because the indicator hides itself when
a price exists — a stale claim would sit invisible while the worklist kept
reporting a finished job.

**Deliberately not done.** Section-level gaps (Gold Lining's juice fridge was
never itemised, so there is no dish to hang anything on) and venue-level ones
(1841's 2025 menu document, The Borough's third-party phone) stay in the
roadmap: the first has no anchor and the second already has ADR 0037's ⓘ/⚠ in
the venue header. A second mechanism would be the drift, not the cure.

**Verification.** `validate.py` 38 files 0 errors; `test_validate` **21/21**
including the new drift guard; no-deps, SBOM, visibility clean; `node --test`
**545** (12 new in `tests/needs.test.js`, covering malformed and unknown kinds
degrading to silence rather than a raw slug on the page); `device_check` 19;
`cook_check` 36. Driven in headless Chrome at **390 px**: 3 chips render, the
price slot reads `?` with `.is-unknown`, the accessible name opens with the
visible label (WCAG 2.5.3), tap target **156×44**, two gaps on one dish give two
chips, tapping opens a note containing the fix, a P.O.A dish still reads `—`
with no chip, and no page errors. Screenshotted in both colour schemes.
`SHELL_VERSION` and `DATA_VERSION` → `2026-08-15.7`.

