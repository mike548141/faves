## 2026-09-09-1102 — faves-c1: Delivery joins the Dining filter, and the empty list it would have shipped

**The ask, in full:** *"The All dining drop down on the main page needs Delivery
added as an option, it currently only has Takeaway and Dine-in"*.

Shipped in `f31b561` — `SHELL_VERSION`/`DATA_VERSION` → `2026-09-09.4`,
[ADR 0117](../decisions/0117-a-door-is-declared-never-derived.md), pushed to `main`
(which is the deploy).

### The one-line change that was not one

Adding the `<option>` takes thirty seconds. It would also have shipped a control
that returns **an empty list on all 57 records**: `validate.py`'s `SERVICES` did
not permit the value, so not one venue's `services` array could carry it. A
filter that can only ever say *"no places match"* reads as a broken app rather
than as a gap in the data, and nothing on the mandatory verify list would have
said a word — every gate passes on an empty result.

🔑 **The failure has a shape worth naming: a control whose vocabulary is
enforced in one file and whose data is enforced in another.** Neither half is
wrong on its own. `filters.js` would have been right, `validate.py` would have
been right, and the screen would have been useless.

### Three sources of an answer, and only one of them is the answer

| Source | What it actually says | Venues |
|---|---|---|
| `services[]` | the doors this venue opens | 0 (the value was not permitted) |
| a dish's `prices.delivery` (ADR 0089) | what this dish costs through that door | 1 |
| `ordering[].platform` | a link we hand the reader | 19, of which 10 name a courier |

**Deriving from `prices.delivery` was the tempting wrong answer** — it needs no
data edit at all and it was already in the tree. It fails silently in the
direction that matters: a venue that delivers *at counter prices* has nothing to
derive from, which is **nine of the ten** venues that qualify, so the derived
filter offers **one** place and looks, to a reader, like a complete answer.

`ordering[]` is the better evidence and still not a rule: it mixes couriers with
**pickup** links. `rock-yard-restaurant`'s ends `/order-pickup`. A rule reading
that list at runtime tells a reader a place delivers because it has a website.

So: read once by hand, write the declaration down. Ten venues marked, nine
deliberately left unmarked, 38 with no link at all — the open half is
`080/230`.

### Two counts in my own records were wrong, and I wrote them by hand

The ADR and the roadmap item said **20** venues carry an `ordering` link and
**37** carry none. The true figures are **19** and **38**. I had the correct
list printed in front of me and counted it by eye; the error survived into two
files before a scripted recount caught it, and it was caught only because I went
back to re-derive the roadmap item's title.

🔑 **A count in a record is worth exactly the command that produced it.** Both
files are corrected. This is the same lesson as *a symptom count is not an
enumeration*, arriving from the opposite direction: there the enumeration was
never run, here it was run and then paraphrased from memory one step later.

### What was verified

1304 unit tests (`filters.test.js` 52 → 61) · `validate.py` 57 valid / **74**
warnings, unchanged · `test_validate` 147/147 · every other Python gate ·
`boot_check` 24/24 · `filter_row_check` 25/25 · and the real browser at 390 px,
which is the only thing that could show the option **painted**: four options,
Delivery reads *"10 of 57 places"*, Takeaway 43 and Dine-in 45 unchanged.

**Two new tests join `ORDER_MODES` to `index.html`'s `<option>` list**, which
nothing in the repo read together before. Each half is right alone while broken:
a mode with no `<option>` is unreachable, and an `<option>` with no vocabulary
entry resolves to `"all"` — so the control reads **"Delivery"** over the
**unfiltered** list, which is the fault `filtersFromQuery`'s doc comment
describes for a bad URL, arriving through the markup where no validation stands.
Break-probed three ways: dropping the vocabulary entry fails 3, dropping the
`<option>` fails 2, dropping the `data-i18n` fails 1.

### Findings this session did not cause

- 🔎 **`check_provenance.py` reports DRIFT on `intake/menus/Simmer Cafe`** — 4
  files recorded, 13 on disk, wants `--rebuild`. Pre-existing, in local
  gitignored material, untouched by this work, and left alone: `--rebuild`
  rewrites a provenance record and that is its own decision.
- ⚠️ **`?order-mode=delivery` was the unknown-value test fixture** and had to
  stop being one. Replaced with `?order-mode=courier` plus a note saying why,
  because *"a test whose fixture became valid"* is the one shape that turns
  green by meaning less.
- The te reo gloss is `Hīkawekawe`, the owner-nominated dictionary's own
  headword for *"(goods) deliveries"*, taken whole and marked draft. It is the
  `tāera` case, not the *"dining"* case — an attested entry, not a composition.
  The caveat is real and written beside it: the entry is the logistics sense.

