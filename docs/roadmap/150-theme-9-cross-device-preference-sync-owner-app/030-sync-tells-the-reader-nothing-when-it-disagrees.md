- [~] **Sync resolves conflicts and tells the reader nothing** `[M][js]` —
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
