## 2026-08-15 — Drinks, and the price band they quietly broke (wt: drinks) — Opus 5

**Owner ruling:** add all drinks. **Delivered:** 166 drinks — The Borough 81,
Southern Cross 85. **1841 has none, and that is the finding, not an omission:**
its site publishes a food menu PDF and a kids menu PDF and no beverage list at
all; the daily deals reference "any tap beer" and "tap beer and wine by the
glass" without naming or pricing one. Nothing to transcribe. Logged.

🚩 **The regression the drinks caused, caught before it shipped.** `priceBand`
is a median over the venue's priced items, and ~90 drinks at $5–15 dragged both
pubs from a ~$24 median to **exactly $14.00** — under the `$` band's inclusive
$15 ceiling. Two gastropubs would have displayed as cheap as a takeaway, on the
home list and in the ranking, with nothing in the diff to suggest it. Fixed with
a curated `priceBand: "$$"` plus a `pricePerPerson` taken from the food-only
median (23 and 24), which is what the chip showed before drinks arrived.
`price.js` then suppresses the contradictory derived figure by itself.
**Verified by breaking it** — the same records with the curated fields deleted
return `{"band":"$","perPerson":14}`, with them `{"band":"$$","perPerson":24}`.
This is exactly the case `priceBand`'s own header comment describes, and it will
recur on **any** venue that gains a drinks list.

**The tag rule I widened, and the two false positives it bought.** A beer →
`contains-gluten` rule already existed but matched only spelled-out styles
(`beer|lager|ale|stout|pilsner`), so a tap list of "Interstellar IPA" and
"Adapt APA" went untagged. Adding `ipa|apa|porter` fixed that and immediately
mis-fired on **Schweppes Ginger Ale** at both venues — "ale" was newly reachable
from every soft-drink line. The existing exclude already covered ginger *beer*
for the same reason, so it widened to `(ginger|root|sarsaparilla)\s?(beer|ale)`.
It also fired on **Hell Pizza's NZ BBQ Pork Ribs** — which turned out to be a
**true** positive picked up in passing: the sauce is literally named "APA".
Applied. Net: 3 rules touched, 2 tags added corpus-wide, 0 false positives left.

**Serving sizes: recorded where labelled, refused where not.** Southern Cross's
wine columns are labelled (Reg/Lrg/Btl) and its sparkling (Flute/Btl), so those
are stated plainly. Its **taps carry three unlabelled price columns** in a 1:2:4
ratio, and The Borough's carry two at 1:2 — the PDF has no drinks pages and the
HTML has no headers, so there is nothing to read a size off. Those say "Also
$28.00 and $56.00; the menu doesn't label the larger sizes" rather than inventing
a pint or a jug. The Borough's *wine* columns are also unlabelled, but its
three-column shape and values match the template Southern Cross labels, so those
are written as large glass / bottle — an inference across a shared template,
disclosed here rather than caveated on fifteen rows.

**Two transcription judgements, both recorded.** The Borough's sparkling block
renders with its price column offset one row up (the numbers begin on the section
heading), which would silently mis-assign every price; the shift was confirmed
against Southern Cross's independently-published prices for the same three wines
(110 → Brut, 135 → Rosé, 50 → De Bortoli) before being read. And its
**"Nga Waka"** is stored as **"Ngā Waka"**, the winery's actual name — the same
call as the "Vension" → "Venison" fix earlier on 2026-08-15, and required by
the macron rule.
🤔 One line resisted: Southern Cross lists **"Garage Project Aro Noir Pinot
Gris $13.00"**, with no separator in the raw HTML. Aro Noir is a stout; a Garage
Project pinot gris is a different thing. It is stored verbatim with a note that
it may be two products run together, and **left untagged** — "no tag = not
stated" is the honest answer when we cannot tell whether a line is a beer.

**Verification.** `validate.py` 38 files, 0 errors, 14 warnings (all pre-existing
"no picks"); `test_validate` 14/14; no-deps, SBOM, visibility clean;
`node --test` **533**; `device_check` **19**; `cook_check` **36**. Both pages
driven in headless Chrome at 390 px: **132 and 141 rows**, every drink section
present, `⚠ CONTAINS GLUTEN` on the tap rows, **no page errors**, and the home
list showing `$$ ~$24pp` / `$$ ~$23pp`. `DATA_VERSION` → `2026-08-15.6`
(`SHELL_VERSION` untouched — nothing outside `site/data/` changed).

