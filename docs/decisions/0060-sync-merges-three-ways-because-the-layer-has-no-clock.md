# 0060 — Sync merges three ways, because the personal layer has no clock

**Status:** accepted
**Date:** 2026-08-16
**Supersedes in part:** [ADR 0017](0017-cross-device-sync-encrypted-blob-bearer-code.md)'s
merge bullet — *"union for additive sets like hearts; last-write-wins per scalar
setting; a read-merge-write on push"*. Everything else in 0017 stands: the
E2E-encrypted blob, the bearer sync-code, the pluggable claim, no accounts, the
Cloudflare Worker + KV shape and the debounced write.

## Context

The owner directed this session at cross-device sync — *"so my iphone and laptop
show the same favourites, ratings etc"*. ADR 0017 had already designed it and
named the merge rules, so the client half looked like transcription. It was not:
**both halves of that merge bullet are wrong against the code as it actually
stands**, and neither fault is visible until you try to write the function.

Measured against the real modules, not recalled:

- **`favourites.merge()` never removes.** `site/js/favourites.js:167-181` — it
  builds a `present` set and appends what's missing. Its own docstring says
  *"Never removes or duplicates"*, which is correct for its built purpose
  (receiving a shared shortlist).
- **The ratings merge is yours-win.** `site/js/personal-data.js:637` —
  `if (mineRatings[k]) continue;`, commented *"a restore is not grounds to
  overwrite the newer one you're living with"*. Again correct for a restore.
- **Nothing in the personal layer carries a timestamp.** Not favourites (an
  array of entry objects), not ratings (a bare `{key: 1..5}` map), not settings
  (seven scalar fields), not the profile registry. Verified across all five
  modules.

So "union hearts" applied continually means **un-hearting is impossible**: device
A drops a heart, device B still has it, the next pull puts it back on A, and the
heart cannot be killed from any device. And "last-write-wins per scalar" **cannot
be implemented at all**, because there is no write time to compare.

The deeper reason is that ADR 0017 reached for the import path — *"reuse Theme
12's collector"* — and the collector half of that is right while the applier half
is not. Import runs **once, with a human watching, in one direction**.
`applyPersonalData` is built for exactly that and is additive on purpose. Sync
runs **unattended, continually, and symmetrically**: both devices run the same
code against each other. Those are different problems that happen to move the
same bytes.

## Decision

**Merge three ways against the snapshot the two devices last agreed on.**
`site/js/sync-merge.js` — pure, DOM-free, no storage, 26 unit tests.

`mergePersonal(base, mine, theirs)` where all three are `collectPersonalData()`
snapshots and `base` is the state as of the last successful sync. The rules:

- **Sets (hearts), keyed by `favKey`.** An entry on one side only is an
  *addition* when `base` never held it and a *deletion* when `base` did. That
  single distinction is what the additive path cannot make, and it needs **no
  schema change and no tombstones** — the base snapshot already carries the
  information, we simply were not keeping it.
- **Maps (ratings) and scalars (settings).** Same three-way test: if only one
  side moved, that side wins; if both moved, it is a genuine conflict. Absence
  is treated as a value, so a cleared rating flows through the same rules as a
  changed one.
- **Symmetry is the load-bearing property, above correctness of any individual
  tie-break.** Both devices merge the same pair, so every rule must give the same
  answer whichever way round the arguments arrive. *"Prefer theirs"* is the
  natural reading of a pull and is exactly wrong — each device would take the
  other's value and the pair would swap forever. Tie-breaks are therefore
  functions of the **values alone**: higher number, then lexicographically first.
  Arbitrary, deterministic, and — the point — convergent.
- **Order is part of the convergence, not presentation.** Two devices that agree
  on the *set* of hearts but not the array order serialise to different JSON, so
  each pull sees a changed blob and pushes a new one, forever, against the one
  resource ADR 0017 names as scarce (KV writes, 1k/day free). The merged order is
  a function of the inputs: base's order for what base knew, then everything new
  sorted by key.
- **Diet is never resolved quietly, and the provisional value is the union.**
  ADR 0030 already holds that an imported file's allergen difference is asked,
  never guessed; that applies with more force to an unattended pull. A two-sided
  diet change is reported as a blocking conflict — and while the question is
  pending the value is the **superset of both sides**, so no device is left
  without an allergen warning it had a moment ago. Over-warning is an
  inconvenience; under-warning is the one failure in this app that can hurt
  someone.
- **The settings field list is derived, never a whitelist.** It is the union of
  the keys present. A whitelist in this exact position has already rotted once —
  see the two bugs below.
- **Two things are deliberately not synced.** The **order tally** is one live
  order for the table (ADR 0012), not a preference; `planImport` already refuses
  to bulk up an order someone is midway through, and syncing it would do that on
  every pull. **Which profile is active** is a property of the device in the
  hand; syncing it would switch profiles under someone mid-tap.
- **Profile identity is a pairing-time question, asked once.** Every device mints
  its first profile as `default` (`profiles.js:42`), so an id match across two
  never-paired devices is guaranteed rather than evidence — the same trap
  `planImport` names. With no base, an id match with differing names is reported
  as a conflict. Once base carries the answer it is never asked again.

## Two shipped bugs found on the way, both fixed here

Neither was the object of the search; both sit directly in the sync path.

1. **A transfer link destroyed the "follow me" localisation preference.**
   `personal-io-ui.js` `activeSlice()` sent `settings.get()`, which resolves
   `lang: "local"` and `units: "local"` to the *device's current* values
   (`settings.js:172-179`). So a link made in Wellington carried hard
   `lang:"en", units:"metric"`, and the receiving device's "follow me wherever I
   am" preference (ADR 0045, ADR 0029) was permanently replaced by a snapshot of
   where the sender was standing. It bit hardest on transfer-to-a-new-device —
   the primary use — because a new profile is written whole. Now sends
   `settings.raw()`.
2. **A merge import silently dropped `units` and `currency`.**
   `applyPersonalData`'s settings patch was built from the hardcoded list
   `["favBoostKm", "farKm", "lang", "mapsApp"]`, written before `units` (ADR
   0029) and `currency` (ADR 0045) existed and never updated. A *new*-profile
   import restored them, which is why nobody saw it. The list is now derived from
   the settings module's own defaults.

Both were caught by writing the failing test first; both tests are in the suite.

## Rejected

- **Reusing `applyPersonalData` as the merge** — the reach ADR 0017 made. It is
  additive by design and refuses to proceed on unanswered questions, which is
  right for a watched import and unusable for an unattended pull that must not
  stop to ask on every foreground.
- **Timestamping every entry in the feature stores** — the obvious way to get
  last-write-wins. Rejected: it changes the stored shape of three stores, needs a
  migration, and `FORMAT_VERSION` is gated with strict failure in *both*
  directions (`personal-data.js:329-337`), so it is a format-2 change with no
  backward path as currently written. Three-way merge gets deletion propagation
  for free without touching a single stored byte.
- **Wall-clock last-write-wins stamped by the pushing device** — cheaper than
  per-entry timestamps, and still rejected for now: two devices that disagree
  about the time produce a confident wrong winner, which is the "guesses dressed
  as precision" ADR 0036 rejected one level up. It remains the right *next* step
  if a real conflict rate justifies it, and it layers on top of this design
  rather than replacing it: a clock would only improve the tie-break, which is
  the one part deliberately arbitrary today.
- **Grow-only sets plus a tombstone set** — the standard CRDT answer. It works,
  but it adds a second store that grows forever and must itself be synced,
  pruned and version-gated. Base gives the same deletion semantics with no new
  state, because we were going to have to keep the last-synced snapshot anyway.
- **"Prefer theirs" on conflict** — recorded because it is the reading a pull
  invites and it does not converge. See Symmetry above.

## Consequences

- **The client keeps a third copy: the base snapshot.** Local, plain (it is the
  same data already in `localStorage`), one per sync code. Without it the merge
  degrades to the additive behaviour this ADR exists to replace, so losing it
  must be treated as "never synced" — everything looks like an addition, which is
  the safe direction.
- **`site/js/sync-merge.js` ships before anything imports it.** The repo enforces
  that every module under `site/js/` is precached (`tests/sw-versioning.test.js`),
  so it costs every phone **5.9 KB gzipped** for a feature that is not yet
  reachable. Taken deliberately: the merge is the load-bearing correctness piece,
  it is claim-agnostic and backend-agnostic, and a module outside the tree gets
  none of this repo's checks. 🎯 **Flagged to the owner** — it comes back out in
  one commit if he would rather hold it until the Worker lands.
- **The Worker is not built and is not claimed.** Standing one up is a new trust
  surface and ADR 0017 marks v2 as the owner's go. The client half is what ADR
  0017's own build shape says to do first, and it is finished and tested.
- 🚩 **The owner's Reset ruling now has a problem this design exposes.** He ruled
  (2026-08-16) that once sync exists, Reset propagates everywhere, and that *"the
  confirmation on a propagating reset must name the number of devices it will
  reach"*. Under ADR 0017 the server is a dumb ciphertext store and every device
  shares one bearer code, so **it cannot tell you how many devices there are** —
  and asking the Worker to log that is exactly the tracking the design refuses.
  The count can only live *inside* the encrypted blob, as a roster each device
  writes itself into. A device that syncs once and is never opened again then
  stays on the roster forever, so the number is an **upper bound, not a count** —
  a confidently wrong number on a destructive confirmation, which is worse than
  no number. This is raised, not resolved: the shape of the answer is his.

## Addendum — 2026-08-16: the owner ruled on all three things this ADR raised

Put to him at the close of the session that wrote this record, each with its
impact stated. Recorded here rather than only in `SESSIONS.md`, because two of
them change what the next session is allowed to do.

1. **The Worker is authorised.** *"Yes — stand it up."* The ⚑ owner's-go that
   ADR 0017 put on v2 is **discharged**: a Cloudflare Worker plus a KV namespace
   may be created for the encrypted blob store. He was briefed that this creates
   a new public HTTPS endpoint on his Cloudflare account — a new trust surface —
   that it can only ever hold ciphertext neither Cloudflare nor he can read, and
   that it costs ~$0 on the free tier. 🚩 **It cannot be deployed from this
   machine**: no `wrangler`, no Cloudflare credential, and no token file. So the
   Worker's source and config are buildable now and **publishing it is a
   separate act needing either a token or his own hands in the dashboard.**
2. **`sync-merge.js` stays precached.** The 5.9 KB was put to him against the
   alternative of holding the module out of the tree until sync ships; he kept
   it, on the reasoning that code outside the tree loses the repo's checks.
   The "reversible in one commit" flag in the Consequences above is **spent** —
   do not re-propose it.
3. **The Reset confirmation drops the device count.** This one **amends his own
   ruling from earlier the same day** (ROADMAP Theme 32's rulings block), which
   had required the confirmation to *"name the number of devices it will reach"*.
   The finding in the last consequence above — that an E2E blob with a bearer
   code cannot count devices, and a roster can only ever be an upper bound —
   was put to him with three wordings. He chose **name the scope, not a number**:
   *every device signed in with this sync code*. Always true, never a wrong
   number on a destructive confirmation. *"Everywhere, always"* is untouched.
   **Consequence worth having: the device roster is no longer needed at all**,
   which removes the one piece of per-device state the blob would have had to
   carry, and with it the age-out guess that state would have needed.

## Addendum 2 — 2026-08-16: an answer that is asked for and then discarded

Found while wiring the engine, and recorded because it is a *class* of bug this
ADR's own design invites.

`mergePersonal` resolves a two-sided allergen change to the **union** and reports
it as blocking (see the Decision above). The engine's `resolve(decisions)` then
took the user's answer and used it only to **unblock the write** — the snapshot
it pushed still carried the provisional union. So a person shown the allergen
question and choosing *"keep the settings on this device"* would have had **both
devices' allergens written to both devices anyway**, silently, having been asked.

Nothing was computed wrongly. The merge was correct, the conflict was correct,
the question was correct, the tests were green. **The answer was simply never
applied.** The gap sat exactly on the boundary between the module that decides
(`sync-merge.js`) and the module that acts (`sync.js`) — which is the boundary
this ADR created by separating them, and neither one's test suite could see it.

Fixed by `applyDietDecision()`, which rewrites the merged snapshot from the
user's choice before it is sealed, and is tested on all three of ADR 0030's
values. The generalisable rule, worth more than the fix:

> **A provisional value plus a question is only half a design. The other half is
> the write that the answer changes** — and if asking and applying live in
> different modules, one test must span both.

This is the third time in one day that building the thing disproved the spec, and
the only one of the three that could have hurt somebody.
