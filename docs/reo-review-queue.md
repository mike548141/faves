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

## Queue: undrafted keys the app is shipping in English

Not drafts awaiting correction — these have **no te reo at all**. `translate()`
captures the English on its first pass, so each falls back safely and reads in
English whichever language the toggle is on. Listed here so the gap is a queue
item rather than a silence.

| Key | English | Why it is undrafted |
|---|---|---|
| `geo.use` | **Use my location** | Opened deliberately on 2026-08-17, with the owner asked and agreeing, against his own 2026-08-16 parking of this queue. It first shipped as `toggle.nearMe` ("E tata ana") specifically to open nothing — he overrode that. This is the only button in Faves whose tap raises a browser permission prompt, and "Near me" names the *result* where "Use my location" names the *action*; a reader surprised by a permission prompt taps Block, which is sticky ([ADR 0069](decisions/0069-the-location-ask-is-primed-not-sprung.md)). 🚩 For the reviewer: this is an **imperative offered to the reader**, not a label — closer to a "let us…" than to a noun phrase, and it should not read as a claim that the app already has the location. |
| `geo.title` · `geo.why` | **See what’s closest?** / the sentence explaining what location buys | Added 2026-08-17 with the location dialog ([ADR 0083](decisions/0083-the-location-ask-explains-itself.md)), a feature the owner asked for — so these arrive with the work rather than opening a new front on the parked queue. 🚩 For the reviewer: the title is a **question offered**, not an instruction. |
| `geo.private` | **Your location never leaves your device. Faves has no accounts and no servers to send it to.** | 🛑 **Look at this one first.** It is a **privacy claim**, on the screen that asks for the permission. A mistranslation is not cosmetic — it is an untrue promise. If there is any doubt about the te reo, leave it English: English-only indefinitely beats approximately translated here. |
| `geo.never` | **Don’t ask me about this again** | The tickbox. 🚩 It must read as a **promise the app is making**, binding both the dialog and the banner and lasting for good — not as a "hide this for now". The English was chosen to say "again", and that word is load-bearing. |
| `geo.skip` · `geo.banner.dismiss` | **Not now** | The decline on the dialog and on the banner. Deliberately the same words in both places, because they do the same thing; keep them identical in te reo too or the two surfaces will read as different offers. |
| `geo.banner` | **Share your location to see what’s closest — it never leaves your phone.** | The quieter second ask. Carries a **shortened form of the same privacy claim** as `geo.private`, so the two must agree — if one is translated and the other is not, the app makes the promise in two languages with two strengths. |
| `menu.opensNewWindow` | *(the WCAG G201 new-window warning)* | Appended by `menu.js` to every off-site link (ROADMAP 31d). |
| `cook.notifyBlocked` | *(the line saying notifications are blocked for this site)* | Added 2026-08-16 with the cook-mode timer's alarm ([ADR 0071](decisions/0071-an-alarm-has-three-channels-and-only-one-of-them-asks.md)); owner ruled it to this queue at the close. It appears **only** under a long timer on a browser that has already denied notifications, so it is seen rarely and by someone who is mid-cook. 🚩 For the reviewer: it states a **fact about the browser the reader can act on**, not a refusal by Faves and not an error — the English is deliberately matter-of-fact and must not read as a nag or as an apology. `reo.js` falls back to English until it is drafted, so nothing is broken meanwhile. |

🔎 **`toggle.nearMe` / "E tata ana" was retired 2026-08-17, not re-queued.** The
pill, then the "Sort by" select's second option, then nothing — its last
renderer went with the SORT BY group
([ADR 0068](decisions/0068-the-home-list-ranks-on-one-blend.md)).
A translated string no screen shows is not an asset held in reserve; it is a
claim that something is covered, and it will read as coverage to whoever counts
this file next.

## `filter.style` / `filter.allStyles` — the style filter (37k, 2026-08-16)

Drafts, **not reviewed by a speaker**: `filter.style` → *"Tāera kai"*,
`filter.allStyles` → *"Ngā tāera kai katoa"*. Both render today, on the fourth
select in the home screen's "Narrow to" row.

Flagged rather than quietly shipped because *tāera* ("style") is doing work here
it may not carry: the English axis is **style of dining** — how the meal happens,
from counter-order to fine dining — and a gloss that reads as "style of food"
would name the cuisine filter sitting beside it. If the right phrase is closer to
manner-of-eating than to style-of-food, this wants replacing rather than tidying.
