## 2026-09-20-1114 — sync-surfacing: an allergen flag cleared by the act of syncing, and an error screen with no door

Worker in an orchestrated queue run, on roadmap `150/030` — the 2026-08-17 cold
review's *"sync resolves conflicts and tells the reader nothing"*. Briefed to
take **two of its four findings** (the engineering ones) and leave the
rating/setting-conflict and profile-identity surfacing alone, because those need
a ruling on what the reader is shown. Worktree `faves-sync-surfacing`, branch
`sync-surfacing`. [ADR 0118](../decisions/0118-an-allergen-key-a-build-cannot-name-is-carried-not-dropped.md).

### The filed suspicion was real, and the reason it survived is the interesting part

An older build drops an allergen key it has never heard of; the newer device's
merge then reads the stripped list as a deletion and clears its own flag.
Reproduced end to end in two real browsers: device A's stored list went from
`["contains-peanuts","contains-zzz-future"]` to
`["contains-peanuts","contains-nuts"]` across one round trip.

🛑 **Not one link in that chain is a bug.** `sanitiseDiet` is right to distrust
input. `createSettings` is right to commit the state it holds. `mergeSettings`
is right to propagate a deletion — ADR 0060 exists so that un-ticking works at
all. The loss lives in the **seam**, across two devices, two stores and a round
trip, which is why 1,311 unit tests stayed green over it and why the assertion
that catches it had to be in `sync_check` and nowhere else.

🔎 The non-obvious step, and the one that made the check work: `writeSnapshot`
writes the pulled settings object **raw**, unknown key and all. The older device
does not lose the key on arrival — it loses it on the **next `set()`**, when
`read()`'s stripped in-memory copy is committed back over the top. So the check
has to make device B *tap a real allergen chip*; without that the bug cannot
appear at all and the assertion would have passed against the broken code.

### The fix is eleven lines because there was exactly one gate

Every path that touches a diet value goes through `sanitiseDiet`: the settings
store's read and its write, `planImport`'s comparison, the apply, and
`mergeSettings`'s union branch. So `avoid` now carries an unrecognised
`contains-*` key rather than dropping it — bounded by namespace, length and a
cap of 20, sorted after the known keys so two devices cannot disagree on array
order and ping-pong writes against ADR 0017's scarce KV budget.

The tables walked before believing that, because *a whitelist sheds the field
added after it* has shipped twice here already: `settings.js` `sanitise` (drops
an unknown settings FIELD — same class, reported not fixed), `personal-data.js`
`MERGE_SETTINGS_FIELDS`, `EXCLUDED` + the catch-all sweep, `normaliseProfile`,
`sanitiseFavourites`, `sanitiseRatings`, the cart line whitelist, `sync-merge`'s
three mergers, `sync.js` `writeSnapshot`/`sameSnapshot`, `sync-crypto`'s codec,
`profiles.js` `sanitiseRegistry`/`SCOPED_BASE_KEYS`, and `sw.js`'s precache.

### What was deliberately NOT built, and why it is in the ADR rather than the code

The direct fix for the *symptom* — teach the merge to refuse any narrowing of
`diet` — was rejected. It cannot tell a stripped key from a deliberate un-tick,
so it would ask the safety question every time somebody un-ticked an allergen on
their other phone, and *"keep mine"* would re-ask forever. It also changes what
the reader is **shown**, which is the half of this item that is the owner's call.

🚩 **The residual is stated rather than papered over:** a build cached before
today still strips. Closing that needs the blob to declare each client's
vocabulary — offered and rejected as disproportionate, and recorded as the next
step if an allergen key is ever added while pre-2026-09-20 clients are live.

### A held value with no door

Carrying a key this build cannot name creates a flag nothing can show, name or
clear — the defect class this repo keeps finding under a different name each
time. So the Food preferences panel carries one hint line when the list is
non-empty, and `dietSummary`'s count (which includes carried keys, and is
therefore true) has something explaining it. Hidden for every reader today.

### The error view

It offered Retry and nothing else. The panel shows exactly one view and `ERROR`
outranks all of them (`computeViewKey`), so `sync.disable()` — the one verb that
ends a broken pairing — was reachable from every state **except the one that
needed it**. Same control and same confirmation as the "on" view, factored into
one `turnOffControl()`: the confirmation's wording is ADR 0060's addendum ruling
and a rule with two implementations is one this repo has watched go out of step.

### Evidence

`sync_check` 16 → 22 assertions, `OK — 22 passed, 0 failed` on the first run.
**Break-probed:** reverting `sanitiseDiet` fails *"an allergen flag on A is NOT
cleared…"* and nothing else (21 passed, 1 failed). Its neighbours are what make
that mean anything — the precondition (the key reaches B's store at all) still
passes, so the probe is not a delivery failure, and the control (B's ordinary
allergen still crossed back) still passes, so a merge that had stopped accepting
anything from B could not have satisfied it. `node --test` 1311, `boot_check`
24, `device_check` 25, and the five Python gates, all naming this worktree.

### Left open

`150/030` released to `[ ]` rather than left claimed: the two design findings
are still owed and no worker should take them off a queue. ADR 0060's
*"provisional union"* claim is still unverified — untouched by this session too.
