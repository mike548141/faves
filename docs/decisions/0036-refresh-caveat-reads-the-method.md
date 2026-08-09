# 0036 — The "needs a refresh" caveat reads the method, then ages it

- **Status:** Accepted
- **Date:** 2026-08-09
- **Builds on:** ADR [0031](0031-verified-carries-its-derivation.md), which put
  `verifiedBy` beside `verified` and explicitly left this gap open. 0031 is not
  edited by this ADR.
- **Closes:** ROADMAP Theme 13g.

## Context

The menu screen's ⓘ caveat — "Menu items and prices need a refresh" — showed
whenever `verified` was null. That made one null carry two different meanings,
which is the §9 failure ("unknown is not none") ADR 0031 named and did not fix:

- **29 of 31 records** had `verified: null`, so the caveat was on almost
  everything. A caveat that always fires carries no information.
- **TJ Katsu and Sushi Bi** were held at `verified: null` although
  `SESSIONS.md` (2026-08-08) records exactly when and how both were read —
  *"both were taken from the venues' own sites today"* — **partly because
  dating them honestly would have silently switched off a caveat**. The data
  was being distorted to steer the UI.

0031 explicitly refused to guess the policy: *"it is a content-policy call
about which methods count as a check, and guessing it would have changed live
UI on judgement rather than evidence."*

## Decision

### The owner's ruling, verbatim

A reading **counts as a check when it came from the shop itself** —
`in-store`, `paper-menu`, `official-site`, `phone` are trusted;
`delivery-app` and `third-party` always caveat. The owner's words on the
excluded pair:

> not third parties like delivereasy, uber etc

The line is *who said it*, not *how hard it was to get*. All four trusted
methods are the shop speaking: someone stood in it, held its printed card, read
its own site, or rang and was told. The two excluded ones are a middleman's
transcription of the shop — and on a delivery app the prices are commonly
marked up, which is a **biased** error, not a random one.

### The age limit — a house default, not an owner number

**`VERIFY_MAX_AGE_MONTHS = 12`**, a single exported constant in `temporal.js`
carrying its own reasoning, so a retune is one line and no other code moves.
The owner ruled *which methods*; he did not set an age. This number is the
implementing session's call and is the part of this ADR most open to being
overruled.

Why 12 and not 6: NZ hospitality menus reprice roughly annually, so a year is
the interval after which a menu is genuinely likely to have moved. Six months
would re-flag effectively the whole corpus within two refresh cycles — which
recreates the "caveat on everything" state this ADR exists to end.

### Four reasons, kept distinct

`refreshCaveat(record, asOf)` returns `{ show, reason, method, date }`:

| `reason` | Condition | `show` |
|---|---|---|
| `never` | no `verified` | true |
| `unknown-method` | a date, and no readable `verifiedBy` | true |
| `untrusted` | `delivery-app` / `third-party` | true |
| `stale` | trusted method, read longer ago than the limit | true |
| `null` | trusted method, within the limit | **false** |

They stay separate because they are four different things to tell a reader —
collapsing them would be the exact §9 error this ADR is undoing. The method is
decided **before** the age: an untrusted reading is untrusted however fresh, so
it never reaches the age test.

**Exactly at the limit is still fresh.** The caveat is for a reading older
*than* the limit, and a boundary that fires on the day itself would be an
off-by-one nobody could see. A partial `verified` widens to its **earliest**
day: "read sometime in 2025" must not borrow 2025-12-31's freshness.

### An unknown `verifiedBy` caveats — and says so distinctly

`verified` set, method absent or off the closed set → `unknown-method`, caveat
shown. Trust here is a **positive** claim ("this came from the shop") and a
record that never said how it was read cannot support one. Reading absence as
trust would render the weakest records — the ones from before we tracked
provenance — as the strongest. It keeps its own reason rather than folding into
`never`, because the record *was* read; we only lack the source. No such record
exists today (`validate.py` warns on the shape and no backfill is permitted),
so this is the safe default for one that appears, not a class being papered
over.

### Wording

Three strings, one sentence each, all ending in the same ask ("confirm with the
place when you order") because the reader's action never changes — only the
*because* does. `never` and `unknown-method` keep the wording the screen has
always shown. `untrusted` names the source, which is the whole point of the
change: *"These prices came from a delivery app, not the place itself"*. `stale`
is deliberately vague about the interval — *"It's been a while since we read
this menu"* — because `VERIFY_MAX_AGE_MONTHS` is meant to be retuned and the
header prints the actual reading date immediately below.

### Applied to the data

TJ Katsu and Sushi Bi gain `verified: "2026-08-08"`, `verifiedBy:
"official-site"` — the date and method `SESSIONS.md` states, no longer withheld
to steer the UI.

## Rejected

- **Ranking methods on a confidence scale, with a threshold.** 0031 already
  rejected a `confidence` score for the reason that still holds: we cannot
  defend the numbers, and a scale we invented is a claim stronger than its
  evidence. A two-way split the owner actually ruled on needs no scale.
- **A per-method age limit** (a phone call goes stale faster than a printed
  card; an `official-site` reading is only as fresh as the site). Genuinely
  more accurate, and rejected on evidence: we have no data on how fast each
  source class decays, so six numbers would be six guesses dressed as
  precision, and each would be a knob nobody could tune. One limit is one
  honest guess, and it is labelled as one.
- **Ageing the untrusted methods too, instead of always caveating them.** This
  is what a "freshness score" would naturally do, and it contradicts the
  ruling: a delivery app's markup does not become correct because it was
  scraped the same morning. The owner drew the line on *source*, not recency.
- **Treating an unknown `verifiedBy` as trusted** (a date is a date). Rejected
  above — it inverts the evidence ordering.
- **Backfilling `verifiedBy` onto records to control the caveat.** Forbidden by
  0031 and the reason this item existed: the data must not be shaped to get a
  UI outcome. The two records dated here are dated from the session log, not
  from a wish.
- **A wall of explanatory text in the caveat** (what we read, when, why it may
  be wrong, what to do). Rejected on the screen's own terms: the caveat lives
  behind an ⓘ precisely because a stale price costs a dollar. One sentence and
  a provenance line under the title is the whole budget.
- **Adding the new strings to `reo.js`.** `reo.js` states that the "menu needs
  a refresh" caveat is one of the strings that **stays English until a reo
  review** — safety and caution text is not shipped in uncertain te reo. The
  two new wordings are the same string in three variants, so they inherit that
  rule; splitting the family across two languages would be worse than either
  choice alone. Flagged for the Phase 7 reo review, and reversible in one
  commit if the owner wants it translated now.
- **A separate `refresh-policy.js` module.** Same reasoning 0031 used to keep
  the vocabulary in `temporal.js`: this is a rule about `verified` and
  `verifiedBy`, `temporal.js` already owns both fields and their fallback
  chain, and a second module would add a precache entry for one function.

## Consequences

- **Four places lose the caveat; 26 keep it.** Gold Lining (`in-store`) and
  Takeaway @ Churton (`paper-menu`) already had dates and were already
  caveat-free; TJ Katsu and Sushi Bi now gain honest dates and lose theirs.
  Cook at Home is a recipe collection and never had one. Everything else is
  `verified: null` and still says so — correctly, because it is true.
- **🚩 TJ Katsu's caveat switches OFF although its source site is visibly
  stale** (©2017, its own "Lunch Special" nav link 404s — `SESSIONS.md`,
  2026-08-08). The policy ages *our reading*, and we read that site on
  2026-08-08. **We have no field for how old the source document is**, and
  `official-site` is the same value whether the site was updated the same
  week or in 2017. That is a real gap this ADR exposes and does not close — the
  honest fix is a dated source document (the shape `paper-menu`'s "a 2019 scan
  and a fresh card share this method" note already describes), not a fudge in
  the policy. Raised for the owner; if he would rather TJ Katsu kept its
  caveat, the mechanism should be data (a note or a source date), not a
  special case.
- **The corpus can now earn its way out of the caveat**, which it could not
  before: refreshing a menu from the shop's own site or counter visibly turns
  the warning off, and refreshing it from Uber Eats visibly does not. That is
  the incentive pointing the right way for the first time.
- **The age limit will fire on its own.** The four dated records all pass
  through `stale` during 2027 with no code change — the first time this repo
  has a UI state that arrives by the calendar rather than by a commit. Tested
  with a fixed `asOf`, never a live clock.
