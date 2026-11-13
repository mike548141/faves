## 2026-08-16-2240 — Schema & model: Theme 30's shape, 28c's serving windows, 14b's classifier

Owner handed a four-theme block (28 · 30 · 14 · 34), copied from a catalogue
another session had written. **He said explicitly that the catalogue was not his
own instruction** — it scoped *which* work, not analysis to accept. That framing
turned out to be the session: **four of the block's premises did not survive
measurement**, and one of my own corrections had to be corrected in turn.

### Delivered

- **[ADR 0080](../decisions/0080-a-venue-has-menus-plural.md)** — discharges the
  owner's *"hold the build, write the ADR now"* on Theme 30a. Adopts the survey's
  three convergences as binding constraints, allows overlapping availability
  resolved by priority (against Deliveroo, with Simphony — the owner's instinct
  was right and the tidier model wrong), and records the candidate shape **as a
  candidate**. 🔑 Its operative half is an **admission test**: a shape recorded
  before its first instance is a hypothesis, and the session that builds it must
  re-derive against a real venue rather than transcribe the record.
- **[ADR 0081](../decisions/0081-a-serving-window-annotates-it-never-filters.md)** +
  the 28c build — `served` on a section, `tools/served_check.mjs` on a frozen
  clock, 4 venues, `hours.js` reused rather than duplicated.
- **`tools/find_addons.py`** — 12-class prose classifier, 44 cases, 17 breakers,
  a `validate.py` warning.
- **`tag_allergens.py`'s all-clear made falsifiable** — it now prints
  `Swept 55 record(s), 3059 dish(es).`

### What measurement overturned

| Claim | Reality |
|---|---|
| 28c: six sections bury a window in the section NAME | **Zero.** ADR 0057 moved them all, and 28d/28f are marked done **eleven lines below** the claim |
| 28b: 81 prose-price rows in 5 venues, "overwhelmingly drinks" | **122 in 10.** Drinks read is right; the extent is not |
| 34e: the item the theme's viability rests on | **Mostly built** — `share-core.js` is a complete two-transport share with four callers |
| `tag_allergens.py` writes nothing on `addOnGroups` records | **Fixed** in `e42b343`; the roadmap described it in the present tense |
| Theme 28: "no discounts in the corpus at all" | True on its **word list**, false in substance |

### 🔑 The finding that corrected me

I wrote that 30d should not be built because nothing exercises the channel
dimension — reasoning only from the record store, where the owner's greenlight
pointed. Re-testing the *unrelated* discounts claim then turned up
**`pizza-pomodoro` selling `Margherita - Large` at $29.00 and `Large Margherita
(Online Deal)` at $17.00** — 41% apart, one section, one file, the channel
encoded in a parenthetical in the dish **name**. Corrected in place, not
rewritten away. I also checked the obvious next worry and it was **negative**:
the price band is $14.50 either way, so it is a modelling defect and not
something misleading a reader today. **Both halves are recorded — a negative
result that stays in one session's head gets re-derived by the next.**

### The generalisation, which came from a peer and beats my own framing

> **A measurement that names its own method expires when the corpus grows, and
> nothing tells you.** (faves-38)

It covers all five rows of the table above, and it caught this session too: I
measured the ADR ceiling at 0075 and treated it as durable — 0076/0077 landed
**ten minutes later**. Which produced the second protocol lesson, from
faves-cook2: **a broadcast is not a reservation either.** Nothing on disk
enforces a message. Only a pushed commit reserves a number, because
`check_decisions.py` is the allocator and it sees only what is committed. I
stamped and pushed 0080 within ten minutes of reading that, before its prose was
finished.

### Where I was wrong, twice

- I endorsed a peer's diagnosis that our claiming rule mistranslated atelier's,
  and **added confirming evidence**. A third session read the source: our copy is
  faithful, the defect is upstream. My "three independent readers stalled"
  argument was sound and **cannot distinguish a local wording bug from an
  upstream one** — I ran those two together.
- I nearly filed `check_decisions.py` as ungated. It is not: it is a *step*
  inside the job displayed as **"zero dependencies"**, which is required. 🔑 Not a
  decorative guard — a **decorative label**, and the damage lands on the auditor.

### Concurrency

Four peer sessions live. Broadcast ADR numbers to **all four** rather than
settling bilaterally, after the 0076 near-miss proved a two-party agreement is
not evidence. Caught a live `SHELL_VERSION` collision: my build had jumped to
`2026-08-17.1`, which would have made a **peer's** push read as going backwards
and serve stale files — their bug to debug, my fault. Moved to `2026-08-16.105`,
above their reserved range, on the correct UTC date.

### Left open, all with the owner

🎯 **30d's placement** — the need is in `site/data/`, not `data/`, and ADR 0047
says the payload ships only what it renders · **KK Malaysian / KC Cafe carry no
verification reading at all** while `STRATEGY.md` records their prices as
Delivereasy's and marked up; `delivery-app` exists as a value and is used by
**zero** venues, and 27 of 55 have no reading · **the two advisory CI jobs**, and
above them `bypass_actors: RepositoryRole 5 → always`, which makes even the
required four advisory for the person who pushes most · **28e eligibility**,
which would be the first thing the app asks a reader about themselves beyond
diet · **`df-option` does not exist** while `gf-option` and `v-option` do, so the
dairy half of the diet-substitution axis has nothing to filter on.

