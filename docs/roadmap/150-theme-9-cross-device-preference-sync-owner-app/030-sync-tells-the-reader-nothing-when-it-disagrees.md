- [ ] **Sync resolves conflicts and tells the reader nothing** `[M][js]` —
      📌 **PART-DONE 2026-09-20 (session `3e87e0bf`, orchestrated queue run,
      branch `sync-surfacing`).** The two findings that were engineering rather
      than design are **fixed and shipped** — the error view's missing turn-off,
      and the silent allergen-flag loss when an older client drops unknown keys
      (ADR 0118, full account below). Released back to open rather than left
      claimed, because what remains is a different job: **the rating/setting
      conflict and profile-identity surfacing need a ruling on what the reader
      is shown**, and no worker should take that off a queue.
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), four findings that share a shape:
      the error view offers no way to **turn sync off**; **rating and setting
      conflicts, and profile-identity mismatches, are reported by the merge and
      surfaced nowhere**; an **older app version drops unknown allergen keys**
      and the deletion rule then un-flags them on the newer device — a silent
      *loss of an allergen flag*, which is the highest-consequence direction
      this bug could run; and the Worker's comment claims **128-bit `blobId`
      entropy when it is 65** — [ADR 0061](../../decisions/0061-the-sync-code-is-split-into-a-name-and-a-key.md)
      leans on that number, so the record overstates the guarantee.
      🔑 Also: ADR 0060's *"provisional union"* describes a value **nothing
      renders**; the copy was made true and the ADR was not.

  ✅ **THE ENTROPY FINDING IS CONFIRMED, IS THREE TIMES WIDER THAN FILED, AND
  IS FIXED — 2026-08-19.** It was real and it was worth fixing precisely,
  because a security comment that names the wrong parameter is how the right
  one stops being defended.

  **The mechanism, stated so nobody has to re-derive it.** `blobId` is
  `HKDF(sync code)` under `INFO_BLOB_ID`, taken 128 bits wide. HKDF is
  deterministic: it cannot manufacture entropy its input does not have. The
  sync code is **65 bits** (ADR 0061, Crockford base32 + mod-29 check symbol).
  So the keyspace an attacker actually sweeps is **2^65**, by enumerating codes
  and deriving ids — never the 2^128 hex space. Width is not entropy.

  🔑 **No vulnerability, and this is not a hedge.** 2^65 ≈ 3.7 × 10^19 online
  guesses is far beyond sweeping, and ADR 0061 chose 65 bits *deliberately*
  against ADR 0017's ~44-bit floor, with the reasoning written down. Nothing
  needs re-keying and no user is exposed. **Only the number was wrong** — and
  it was wrong in the direction that flatters the design, which is the
  direction that gets believed.

  **Filed as one surface; found on three.** The item named the Worker's
  comment. The same overstatement stood in:
  - `worker/sync-worker.js` — *"128 bits keeps blobIds unguessable"* and
    *"The blobId's 128 bits of entropy is therefore load-bearing security"*;
  - `worker/README.md` § *Other honest limits* — the no-rate-limiting case
    rests on *"`blobId`'s 128 bits of entropy"*, so the wrong number was
    carrying an operational decision;
  - `site/js/sync-crypto.js` — *"the keyspace must be far too large to
    sweep"* beside the literal `128`, where the next reader trusts it most.

  All three now name 65 as the load-bearing figure, say why width is not
  entropy, and are dated so the correction is visible as a correction.

  ⚠️ **THE ADR HALF IS REFUTED — [ADR 0061] does NOT overstate anything.** The
  finding said the ADR *"leans on that number, so the record overstates the
  guarantee"*. Read directly, it states **both** numbers and states them
  correctly: *"a 128-bit `blobId` rendered as hex"* is a shape claim and is
  true, and *"The code is 65 bits"* is the security claim and is also true. It
  never calls 128 the security parameter. **So no supersession is owed and none
  was made** — editing an accepted ADR would have been wrong twice over. What
  the ADR does not do is *reconcile* the two figures in one place, which is how
  a reader could carry 128 forward; that is a findability gap, not an
  overstatement, and the corrected comments above now close it.

  🚩 **THREE FINDINGS IN THIS ITEM REMAIN OWED, and one of them outranks the
  one just fixed:** the error view offers no way to turn sync off; conflicts
  and profile-identity mismatches are surfaced nowhere; and an **older app
  version drops unknown allergen keys**, after which the deletion rule un-flags
  them on the newer device — a silent **loss of an allergen flag**. That is a
  safety-consequence bug in a repo whose whole allergen doctrine is that it
  never asserts an absence. It needs `sync_check` (two real browsers) and was
  deliberately not started here rather than half-started. ADR 0060's
  *"provisional union"* claim is untouched and unverified by this session.

  ✅ **TWO OF THE THREE ARE DONE — 2026-09-20
  ([ADR 0118](../../decisions/0118-an-allergen-key-a-build-cannot-name-is-carried-not-dropped.md)).**
  The two that are engineering rather than design; the conflict and
  profile-identity surfacing is untouched and still needs a ruling on what the
  reader is shown.

  🛑 **THE ALLERGEN LOSS IS CONFIRMED, and the mechanism is written down here so
  nobody has to re-derive it.** Reproduced end to end in two real browsers on
  `sync-surfacing`: device A's stored list went from
  `["contains-peanuts","contains-zzz-future"]` to
  `["contains-peanuts","contains-nuts"]` across one round trip. The chain, and
  **every link in it is individually correct** — which is why 1,311 unit tests
  stayed green over it:
  1. `settings.js` `sanitiseDiet` filtered `avoid` through `cleanKeys(…,
     ALLERGEN_KEYS)` — this build's vocabulary. Right for a hand-edited file.
  2. The older device pulls. `writeSnapshot` writes the raw settings object,
     unknown key included — but `createSettings.read()` strips it in memory and
     **the next `set()` commits the stripped state back over the top**. One tap
     on any preference does it.
  3. Its `collectPersonalData` now reads the stripped list and pushes it.
  4. On the newer device `mergeSettings` finds `same(mine, base)` with `theirs`
     different and takes the *"only they moved"* branch — a **deletion**,
     applied **before** the `DIET_FIELD` special case, so no `CONFLICT_DIET` is
     raised and nothing is reported.

  Fixed at `sanitiseDiet`, the single gate every diet value passes (store read
  and write, import comparison, import apply, merge union): an unrecognised
  `contains-*` key is **carried**, bounded by namespace + length + a cap of 20,
  sorted after the known keys so two devices cannot disagree on array order and
  ping-pong writes. The Food preferences screen now says when it is holding
  one — a flag nothing can show, name or clear is a held value with no door.

  🚩 **Residual, stated rather than papered over:** a build cached *before*
  2026-09-20 still strips, so the loss can still happen if an allergen key is
  added while one is in the field. Closing that needs the blob to declare each
  client's vocabulary; offered and rejected as disproportionate in ADR 0118's
  *Rejected*, and recorded there as the next step if it is ever needed.

  ✅ **The error view has a way out.** It offered Retry and nothing else, and
  the panel shows exactly one view with `ERROR` outranking all of them
  (`computeViewKey`) — so `sync.disable()`, the one verb that ends a broken
  pairing, was reachable from every state **except the one that needed it**.
  Same control and same confirmation as the "on" view, factored into one
  `turnOffControl()` so ADR 0060's addendum ruling (name the scope, never a
  device count) has one home rather than two copies.

  🔑 **`sync_check` 16 → 22 assertions, and the break-probe is the evidence.**
  Reverting `sanitiseDiet` fails *"an allergen flag on A is NOT cleared by
  syncing with a device that has no chip for that key"* and **nothing else**
  (21 passed, 1 failed). Its two neighbours are what make that mean anything:
  the precondition (*the key reaches B's store at all*) still passes, so the
  probe is not a delivery failure, and the control (*the ordinary allergen B
  flagged still crossed back to A*) still passes, so a merge that had simply
  stopped accepting anything from B — a worse bug — cannot satisfy it.
