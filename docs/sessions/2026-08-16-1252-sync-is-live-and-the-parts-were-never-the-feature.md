## 2026-08-16 12:52 UTC — sync is live, and the parts were never the feature

Owner pushed back on the previous entry's careful distinction: *"havent we just
built all that? I want the sync feature live."* **He was right to push, and the
distinction was real** — both things at once, which is why this is worth
recording rather than just fixing.

### 🔎 Everything was built, tested and green, and the feature did not exist

Checked rather than asserted, because the claim deserved evidence:

```
grep -rn "sync-merge|sync-crypto|sync-code" site/ --exclude=site/js/sync-*
  -> NOTHING imports them
grep -rn "workers.dev|faves-sync" site/
  -> NOTHING calls it
```

The merge, the crypto, the bearer code and a **deployed, live-verified Worker**
were all correct in isolation. 942 tests, four browser checks, every gate green.
**No screen could reach any of it.** The engine, the gearbox, the fuel and the
road, and no car with them bolted together.

🚩 **This is the decorative-guard family in its purest form yet.** Each part had
a test suite proving the part. Nothing had a test asking *does the feature
work*, because no test knew the feature was supposed to exist. The fix that
generalises is not "test more" — it is that **`sync-start.js` is a named file
imported by all three screens**, because an absence is far easier to notice as a
missing import than as a missing call inside an init function.

### What shipped

`sync.js` — **one operation, not two**. A push that has not first read the
server is exactly the stale-device clobber ADR 0017 warned about, so there is a
single cycle: read → merge → write under `If-Match` → *then* record the base. A
push is that cycle triggered by a local change; a pull is the same cycle on
foreground. Same code both ways, which is also what keeps the merge symmetric.

Two ordering rules that are load-bearing rather than tidy:
- **The base is written only after a write the server accepted.** A base
  describing an agreement that never happened is worse than none, because "no
  base" at least degrades in the safe direction (everything reads as an
  addition).
- **`writeSnapshot` replaces, it does not merge.** `applyPersonalData` is
  additive on purpose and using it here would throw away the deletion handling
  that is the whole reason ADR 0060 exists.

### 🚩 The one that could have hurt someone — ADR 0060 addendum 2

`resolve(decisions)` took the user's answer to the allergen conflict and used it
only to **unblock the write**. The snapshot pushed still carried the provisional
union. A person shown the question and answering *"keep this device's settings"*
would have had both devices' allergens written to both devices anyway, **having
been asked**.

Nothing was computed wrongly. The merge, the conflict, the question and the
tests were all correct. **The answer was simply never applied.** It sat exactly
on the seam between the module that decides and the module that acts — the seam
ADR 0060 created — and neither suite could see across it. Rule extracted: *a
provisional value plus a question is only half a design; the other half is the
write the answer changes.*

### Verification

942 tests (16 new for the engine) · `boot_check` 15/15 — **it caught the new
settings row and had to be updated, which is it working** · `device_check`
20/20. Engine suite verified by sabotage: making `writeSnapshot` additive fails
the two deletion tests; moving the base write before the accepted PUT fails the
race test.

🎉 **And the real proof — two devices against the LIVE deployed Worker**, not a
stub: both converge on three favourites, a 5-star rating crosses, and then
un-hearting on the phone **removes it from the laptop** instead of the laptop
putting it back. That last line is the one the original design could not have
produced at all.

### Process note worth keeping

⚠️ **"Read the current version constant and add one" walked straight into a peer
session's reserved range** (`.72`, inside their announced `.70–.79`). Caught
before commit. The lesson generalises past this repo: **a range convention that
lives in a chat message is invisible to the automation that picks the number**,
so the last step before commit has to compare the number against the announced
ranges, not merely against `main`. Moved to `.80` and re-announced. The peer had
hit the same class from the other side the same day.

---

