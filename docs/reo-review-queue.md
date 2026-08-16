# Te reo Māori — the fluent-speaker review queue

<!-- sizescan:budget=400 — a queue file grows with each string family drafted
     and shrinks when a reviewer clears one; length here is throughput, not rot -->

Drafted te reo Māori strings **waiting on a fluent speaker**, held here and
nowhere else. Nothing in this file is wired to anything. A string leaves this
file in one of two directions: corrected and moved into `site/js/reo.js`'s live
`MI` dictionary, or discarded.

## Why this file exists at all

The queue was named in [ADR 0037](decisions/) and in the roadmap for weeks
before anyone looked for it, and on 2026-08-16 it turned out **not to exist
anywhere** — not as a file, not as a code convention, not as a list. Drafts were
going into `MI` itself with a `// draft` comment. That is safe for ordinary
chrome and unsafe for anything else, for a reason worth stating once:

> 🚩 **An `MI` entry marked `// draft` is not inert.** `translate()` renders it
> live the instant a reader flips the language toggle. For a nav label that is a
> fair trade — a clumsy word is a clumsy word. For **caution and confidence
> copy** it is not: those strings tell a reader how much to trust a price and
> when it was last checked, and an unreviewed draft that reads slightly wrong
> there can cost someone money or a wasted trip. `reo.js`'s own header carries
> the safety boundary that forbids it.

### And why it is a document rather than a module

The first attempt at a home was an inert `CONFIDENCE_NOTE_DRAFTS` export at the
end of `site/js/reo.js` — never imported, never called. Correct on safety, wrong
on cost: measured at **+2,171 bytes gzipped**, downloaded by every phone that
installs the app, for content that nothing renders and that by definition is not
ready to render. That is [ADR 0047](decisions/0047-the-app-ships-only-what-it-renders.md)'s
rule ("the app ships only what it renders") meeting a JavaScript module instead
of a data file, and the rule wins in both places.

The deciding argument is not the bytes, though — it is the reader. **A fluent
speaker reviewing te reo is not going to open a JavaScript module.** A queue
whose reviewers cannot read it is a queue that never drains, which is exactly
how this one came to be empty and unnoticed at the same time.

## How to use it

- Source for lookups: **maoridictionary.co.nz**, the owner's nomination. Cite the
  headword you used for anything not obvious.
- Where a phrase is **assembled from parts** rather than being a headword in its
  own right, say so on its line. An assembled compound is a weaker claim than a
  looked-up word and the reviewer needs to see which is which.
- Where drafting a string honestly would overstate what a dictionary can give
  you, **leave it undrafted and say why**. A whole sentence carrying a legal-ish
  nuance is not the sum of its looked-up words.
- Reuse a root already drafted elsewhere in `reo.js` in preference to minting a
  second word for the same idea — that is the file's existing practice.

---

## Queue: the confidence-note family (ⓘ)

Added 2026-08-16 (ROADMAP Theme 19). Scope is the **ⓘ confidence** family only:
`confidenceNote()`, `CHECKED_PHRASE` and `caveatDisclosure()`'s info-tone
aria-label, all in `site/js/menu.js`. The **⚠ caution** family (`caveatText`) is
named and excluded by `reo.js`'s header and is not repeated here.

🚩 **A note for whoever wires these, not for the reviewer:** `CHECKED_PHRASE`
slots a verb phrase into `"Menu and prices {phrase} on {date}."`, and the
translation engine swaps **whole strings only**. So the phrases below are
vocabulary for the reviewer, not drop-in replacements — wiring them needs a
template change `menu.js` does not have today.

### The disclosure's accessible name

`caveatDisclosure()`, the `warn ? … : "When we last checked this menu"` branch.

| English | Draft | Notes |
|---|---|---|
| When we last checked this menu | **Nāhea tēnei tahua kai i tirohia ai** | `tirohia` is the passive of `tiro` (to look at, examine) — common and unambiguous. Chosen over `hihira` ("to go over carefully, check"), which reads more like an audit than a glance. |

### The note's lead-in

`confidenceNote()`, the bold "✅ Up to date." opener.

| English | Draft | Notes |
|---|---|---|
| Up to date | **Kua whakahoutia** | "(has been) updated / brought current". Reuses `whakahou` — already drafted live above as `update.refresh`: "Whakahoutia" — rather than minting a second root for one idea. |

### `CHECKED_PHRASE` — one verb phrase per method

| Method | English sense | Draft | Headwords |
|---|---|---|---|
| `in-store` | checked at the shop | **i tirohia i te toa** | `toa` = shop/store |
| `paper-menu` | read from the shop's own menu | **i pānuitia mai i te tahua kai a te toa** | `pānui` = to read |
| `official-site` | checked against their own website | **i tirohia ki tō rātou pae tukutuku ake** | `pae tukutuku` = website |
| `phone` | confirmed by phone | **i whakaūhia mā te waea** | `whakaū` = to confirm/make firm; `waea` = phone |
| `delivery-app` | taken from a food-delivery app | **i tangohia mai i tētahi taupānga kawe kai** | ⚠️ `kawe kai` (kawe = to carry/convey + kai = food) is **assembled from parts, not a headword**. |
| `third-party` | taken from a trade/directory listing | **i tangohia mai i tētahi rārangi ringarehe** | `rārangi ringarehe` = trade directory |

### `currencyLine` — the same-currency case only

| English | Draft | Notes |
|---|---|---|
| Prices are in {currency} | **Kei te {currency} ngā utu** | `utu` = price/cost, already in live use above as `toggle.cheapEats`: "Kai utu-iti". `{currency}` marks a placeholder; it is not live template syntax. |

### ⛔ Deliberately not drafted

`currencyLine`'s **converting** case — *"This place charges in X. You're seeing
about what that comes to in Y as of {date} — the shop will take the X price."*

Three linked clauses carrying a specific nuance: that the figure is an estimate
and not a quote, and which amount is actually owed. Assembling that from a
handful of looked-up headwords would be a claim considerably stronger than the
evidence supports, and wrong in precisely the way that matters. **Recommend the
reviewer compose this one as a whole sentence** rather than receive parts.
