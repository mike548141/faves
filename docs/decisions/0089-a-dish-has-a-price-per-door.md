# 0089 — A dish has a price per door; `price` is the counter

**Status**: accepted • **Date**: 2026-09-06

## Context

The owner photographed the in-store card at KK Malaysian on 2026-08-26. It did
not agree with what Faves was showing, and not slightly:

| Dish | Faves showed | The counter card says |
|---|---|---|
| Chicken Satay | $24.00 | **$19.00** |
| Chicken Curry | $26.00 | **$21.00** |
| Roti Chanai | $19.00 | **$15.50** |
| Nasi Goreng | $25.00 | **$20.00** |

The record was not stale and it was not sloppy. It carried
`verifiedBy: "delivery-app"` and said so honestly — it was a faithful reading of
Delivereasy's menu. **It was reading a different price list.**

The same shape, worse, at R & S Satay Noodle House: `verified: null`, and
**21 of 24 comparable dishes sat between 1.647× and 1.651×** the printed price —
Chicken Rice $18.50 on the card, $30.50 in the record. The stored values carry
cents no menu prints ($37.10, $32.80, $26.40), which is what a uniform
multiplier leaves behind. That is not drift; it is arithmetic.

**This breaks the refresh rule's own test.** `ARCHITECTURE.md` asks *"did the
shop change it, or did we?"* and the answer here is **neither**:

- Appending the counter price as a **change** would write a 20–40% price *cut*
  into the history that never happened, permanently, into the one store this
  repo keeps forever.
- Overwriting it as a **correction** would throw away a true reading of a real
  price that real people really pay when they order through the app.

Both readings were correct. The model was wrong. The owner ruled on 2026-09-06
to build the thing itself rather than pick a side.

## Decision

**`price` is what you pay at the counter. Every other door hangs off `prices`.**

```jsonc
// on the venue — declared ONCE
"priceChannels": {
  "delivery": {
    "platform": "Delivereasy",
    "recorded": "2026-07-06",
    "method": "delivery-app"
  }
},
// on the dish
"price": 19,
"prices": { "delivery": 24 }
```

- `channel` is a **DOOR, not a brand** — closed set `{delivery, online}`. A
  second platform is another entry under the same door, not a new key.
- The venue declares each door once rather than repeating a platform name and a
  date on all seventy dishes. That is both the honest shape — one reading of one
  platform's menu on one day — and why this costs the payload almost nothing.
- Each channel carries a **`method`** from the existing `VERIFY_METHODS` set,
  because a channel reading is a reading: it says how it was obtained or it is
  an assertion (ADR 0031).
- The dish row renders a quiet second line: *"$24 on Delivereasy — about 26%
  more"*. The percentage is spelled out because *"$24 on Delivereasy"* invites a
  shrug and *"about 26% more"* does not. It is never phrased as a saving —
  "save 20%" is a claim about what someone would otherwise have done, and this
  app does not know that.

## Consequences

**KK Malaysian is the worked example, and it grew by eighteen dishes.** The
delivery app carries a **subset** of the shop's menu: the card numbers 35 dishes
and the record held 30 of a different 30. Deep Fried Tofu, Sweet Corn Soup,
Achar, Prawn Sambal, Seafood Curry, Lamb Curry, Hokkien Mee, Wat Tan Hor, Teo
Chew Noodle Soup, three vegetarian mains and the entire beverage block existed
only in the shop. **A platform-derived menu should be assumed incomplete, not
merely marked up.**

**The venue's own order numbers came with it** (1–34), which the schema always
had a field for and no venue used. A guest can now read "two number 14s" off the
board and find them.

**Nasi Lemak split into chicken ($21) and beef ($23)** because the card prices
them apart. This follows the record's own precedent — it already splits Kung Po
that way — and the original `dishId` stays on the chicken row so no heart,
rating or shared link moves (ADR 0051).

**`verified` is now `2026-08-26` / `in-store`**, which takes KK out of the amber
caution tone for the first time. That immediately broke `boot_check`, which had
pinned KK as its example of a venue *in* the caution tone: the assertion failed
on correct behaviour. Re-pinned to a venue that genuinely has `verified: null`,
with a comment saying to choose on that field rather than on whichever venue
happens to be amber today.

**Seven mutations were added to `test_validate.py`** (124 → 131). The one that
carries the weight is *a dish pricing a channel the venue never declared* —
without it, a typo produces a price on a door nobody can see, which is precisely
the class of silent wrongness this ADR exists to end.

**What this does NOT do.** Channel prices carry no dated series: history for a
channel is not modelled, and a channel price is a single current reading. The
cart, the share codec and the ranking all still read `price` and are unchanged,
because `price` kept its meaning for every venue that has only one door — which
is 56 of 57.

**Still owed:** R & S Satay Noodle House is diagnosed but not yet refreshed; its
70 dishes and their 1.65× website prices are the next application of this.

## Alternatives rejected

- **Treat the counter reading as a correction** (overwrite, no history). Cheap,
  and it discards a true reading of a price people pay. Put to the owner and
  declined in favour of modelling both.
- **Treat it as a price change** (append to history). Fabricates a price cut.
  Never seriously on the table once the multiplier was measured.
- **Leave the record and note it in prose.** Zero risk to the shipped app, and
  it leaves Faves telling the owner satay is $24 when the board says $19 — the
  defect he would be most annoyed to hit while standing in the shop.
