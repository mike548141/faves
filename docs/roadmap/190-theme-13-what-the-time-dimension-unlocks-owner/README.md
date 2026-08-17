# Theme 13 — What the time dimension unlocks (owner-raised 2026-08-08)

The data model landed 2026-08-08 (ADR 0023): prices, menus, dishes and venues
all carry dates now, and `temporal.js` resolves them to "today" before the UI
sees anything.

**Owner's framing, 2026-08-09 (read this before building any of it).** Capturing
price history is **not a core function of this app** — Faves exists to answer
*what do I eat tonight*. The history is **valuable data gathered as a by-product** <!-- datescan:allow: product vocabulary — "eat tonight" is the question this app answers, not a dated claim -->
of work we do anyway: every menu refresh is already a dated reading. It accrues
at zero extra cost, and it is the one thing that **cannot** be added later —
hence the model now, the features whenever they earn their place.

The eventual use splits in two, and they are different products with different
bars:

| | Surface | Bar it must clear |
|---|---|---|
| **A** | A **dedicated section** — the research/analysis basis (trends, comparisons, what's risen fastest) | Opt-in, off the main path. Free to be denser, because nobody lands there by accident |
| **B** | **Inline in the primary flow**, where it helps the eat-tonight decision — the owner's example: *coffee is $6 from tomorrow* | Must earn its pixels against the core job. If it doesn't change what you order, it doesn't belong on the card | <!-- datescan:allow: owner's verbatim example of the feature ("$6 from tomorrow") — quoted product vocabulary, not a dated claim -->


🛑 **RULED 2026-08-16 — THERE IS NO SURFACE. Not "not yet": not ever.** Owner,
verbatim, noting he has said this repeatedly: *"The trends data will never be
shown in the faves app as I've told you a couple of times before in other
sessions. It is for analysis etc outside of the faves app, faves is just what
builds up the data over time."*
`data/history/prices/` and `data/history/dishes/` keep accruing exactly as ADR
0047 describes — that machinery is **wanted, correct and already shipped**. Out
of scope permanently: a trends screen, a "was $X" chip on a dish, any in-app
rendering of `data/history/*`. The analysis happens outside Faves.
⚠️ **Why this keeps being re-proposed, which is the useful part:** the wording
below reads as a *sequencing* gate ("not enough data yet"), and the
1-venue-of-31 stat invites "revisit when it grows". Read cold, it looks like it
is waiting. **It is not waiting.** Kept only as the record of what was measured.
~~⚑ Owner's call, deliberately deferred: when there is enough data to be worth
using, and which surface goes first.~~ Baseline at adoption (2026-08-08):
**1 venue of 31** has more than one price reading (Churton, 174 dishes), and
only **2 of 31** carry a `verified` date at all. So: not yet, by a distance.

**What makes it accrue — the one operational rule.** A menu refresh must
**append** a price reading, never overwrite. This is not hypothetical: the
Churton refresh discarded seven years of prices in a single commit, and they
were only recoverable because git happened to hold them. Recorded in
`ARCHITECTURE.md` ("Refreshing a menu") and `CLAUDE.md`. Every refresh done that
way adds a reading to the corpus for free; every one done the old way silently
destroys one.

**a. Upcoming price changes (surface B)** — *owner's example: "coffee will be $6
from Wednesday".* Already a working data fact: an entry with a future `from`
resolves correctly (the current day keeps its price) and `pending()` returns the
announced one. Nothing renders it. Open design calls, the owner's:
- Where it shows — a quiet "→ $6 from Wed" beside the price, or only on the
  dish page? The dinner-choosing UX must not turn into a pricing dashboard.
- Does the order tally warn when a pending change lands before you'd collect?
- Who supplies the dates — a shop's posted notice is the honest source; we
  never extrapolate a rise we were not told about.

**b. Price trends (surface A)** — `priceSeries` already rides on every resolved
dish that has history. Churton is the proof case: 174 dishes with a 2019 and a
2026 price, median rise **50%** (mean 54%, range 16–120%). Possible shapes,
cheapest first: a per-dish "was $10.50 in 2019" line · a sparkline on the dish
page · a venue-level "prices up ~50% since 2019" · a cross-venue view of what
has risen fastest. **Honesty constraint, non-negotiable:** two readings seven
years apart is not a trend line — it is two points. Nothing drawn from them may
imply we watched the intervening years, and a `recorded`-dated entry ("we read
it then") must never render as a `from`-dated one ("it changed then").

**c. Menu seasons in the UI** — the model supports recurring NZ seasons on any
section or dish, so a winter menu is one fact that returns every year. Nothing
surfaces it yet: a "summer menu" badge, or a "back in winter" note on an
out-of-season favourite, would both read well. Needs real seasonal data first —
no venue in the corpus has any.

**d. Dish revisions on the page** — the `revisions` log (the muffin that went
vegan) is recorded but never rendered. A "changed 1 Aug: now vegan" note on a
dish is genuinely useful to a returning diner, and doubly so when the change is
an *allergen* one. Deliberately not shipped with the model: it is new UI, and
the owner's brief was that choosing dinner should look exactly as it did.

**e. Venue history** — `lifecycle` holds `opened` (world) and `added` (record).
`added` is populated for all 31 venues from git; **`opened` is empty everywhere**
because we have never established it for any venue. Filling it is content work
(the owner or a venue's own site), not a build. It would unlock "in Faves since
July 2026" and "trading since 1998" lines, and an honest "new to Faves" badge.

✅ **f. `verified` carries its derivation** — shipped 2026-08-09
(ADR [0031](../../decisions/0031-verified-carries-its-derivation.md)): a sibling
**`verifiedBy`** naming one of six source classes, at **record** granularity
with an optional per-reading `method` override on a price-series entry.
Per-price as the primary level, an object-valued `verified` and a confidence
score all rejected — reasoning in the ADR. No backfill; applied to the two
records whose provenance `SESSIONS.md` evidences. Design record →
[`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

✅ **g. The "needs a refresh" caveat reads the method, not the date** — shipped
2026-08-09 (ADR [0036](../../decisions/0036-refresh-caveat-reads-the-method.md)).
Owner ruled the split: a reading counts as a check when it came from the shop
itself (`in-store` · `paper-menu` · `official-site` · `phone`), and *"not third
parties like delivereasy, uber etc"*. A **12-month** age limit rides on top —
a house default, flagged as such in `temporal.js` and retunable on one line.
`refreshCaveat()` returns four distinct reasons (`never` · `unknown-method` ·
`untrusted` · `stale`), so one null stops standing for two things, and the
untrusted wording names its source. TJ Katsu and Sushi Bi now carry the honest
`2026-08-08` / `official-site` the session log evidences.
🚩 **Owner call left open:** TJ Katsu's caveat switches *off*, because the
policy ages *our reading* (2026-08-08) and we have no field for how old the
*source document* is — its site is ©2017 with a 404ing nav. See the ADR's
consequences; the fix, if he wants one, is data, not a special case.

<details><summary>The item as raised by 13f, and the owner's ruling on it</summary>

- **g. The "needs a refresh" caveat should read the method, not the
  date** `[S][ux][content]` — raised 2026-08-09 by 13f, deliberately not
  fixed there. The menu screen shows its ⓘ "menu items and prices need a
  refresh" caveat when `verified` is null. Now that a reading states its
  method, the bare presence of a date is the weaker signal — a
  `third-party` or `delivery-app` reading should arguably still caveat,
  and a freshly dated `in-store` one should not. The concrete cost as
  things stand: **TJ Katsu and Sushi Bi sit at `verified: null`** although
  `SESSIONS.md` (2026-08-08) records exactly when and how both were read
  (`official-site`), *partly because* setting a date would silently switch
  off a caveat that is right — TJ Katsu's source site is visibly stale
  (©2017, its own nav 404s). That is §9's "unknown is not none" still live
  in this corpus: one null standing for "never read" and "read from a
  source we don't fully trust". The fix is a stated policy on which methods
  count as a check (and whether age enters it), then the two records gain
  honest dates. **Owner call, not a build call** — a threshold picked by an
  agent would change live UI on judgement rather than evidence.

</details>
