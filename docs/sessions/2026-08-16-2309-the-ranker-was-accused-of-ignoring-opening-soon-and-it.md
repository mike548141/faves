## 2026-08-16-2309 — the ranker was accused of ignoring "opening soon", and it wasn't

**Report:** a screenshot of the live home list (`lets-eat.myspot.nz`), with
"Takeaway @ Churton · 450 m · ❤️ · Closed · opens Tue 11am" sitting 25th while
four venues 10 km away showing "Opens in 3 min" sat above it. The claim: the
ranking never considers opening-soon venues at all, or the 450 m one would lead.

**Verdict: no defect.** The ranker does exactly what ADR 0068 specifies, and the
data it was fed was right — the owner confirmed the shop is genuinely shut
Mondays. No code or data changed.

### How that was established rather than argued

Ranked the **real 55-venue corpus** through `rankVenues` with a frozen clock
(`makeClock(new Date("2026-08-16T22:57:00Z"))` = Mon 10:57 NZST, the instant the
screenshot's "Opens in 3 min" / "Opens in 33 min" pair pins it to) and an origin
in Churton Park. The output's rows 15–16 are **The Catch Sushi Bar, Satay
Kingdom Cafe** — the screenshot's first fully-visible row, in order. Reproducing
the artefact is what turns "looks right" into evidence; it also localises the
fault in one step when there *is* one.

Then flipped the one field under suspicion — `hours.mon` from `[]` to
`[["11:00","20:30"]]` — in memory only, and re-ranked: Takeaway @ Churton moves
**25th → 9th, top of the opening-soon group**, above Pizza Hut at 2.1 km. So the
tier-then-bucket order already produces precisely the placement the report
wanted; the only thing standing between the venue and 9th place was a weekday
the shop does not trade.

🔑 **A ranking complaint is a claim about a comparator, but its evidence is
always one venue's data.** Flip the suspect field and re-rank before touching
the comparator: it separates "the order is wrong" from "the input says
something you didn't expect" without a single edit landing.

### Favourites, checked because it was asked about and not assumed

The heart is a within-band tiebreak (ADR 0068), so "is it working?" needs a pair
in the same band. Measured: at `FAV_TIE_KM` = 0.4 km, **38 of 55 venues share a
band with at least one other**, so the heart has somewhere to act far more often
than the narrow constant suggests. Fired it three ways over the real corpus —
no heart, heart on Takeaway, heart on Spices Indian — and the two swapped
places 24/25 each time the heart moved. ✅ Working as designed.

### Left standing, not actioned

Three venues carry `"mon": []` with **no `verified` date and no `verifiedBy`**:
`kk-malaysian`, `marigold-takeaway`, `rs-satay-noodle-house`. That is the same
shape as the record just examined, minus the provenance that let this one be
settled — an unverified closed-weekday silently sinks a venue for a whole day.
Flagged to the owner; not changed, because inventing hours is the one failure
this data cannot afford.

### Concurrency

`docs/ROADMAP.md` and `docs/ROADMAP-DONE.md` were **staged by another live
session** mid-way through this one (the tree was clean at open). Per
`CONCURRENCY.md` they were left untouched and nothing was taken off the queue;
this entry is the only file staged, by explicit path.

---

