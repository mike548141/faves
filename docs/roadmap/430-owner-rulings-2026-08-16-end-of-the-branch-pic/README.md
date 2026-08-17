# Owner rulings — 2026-08-16 (end of the branch-picker session)

Four decisions taken at close, all put to him with a recommendation. **He went
against the recommendation on two of them, and both are recorded here as ruled,
not as argued.**

- 🎯 **Reset becomes TWO gated controls.** "Reset preferences" keeps today's
  narrow scope (one profile's dietary needs, flagged allergens, distance, units,
  language, maps app) and a second **"Delete everything"** wipes all profiles,
  favourites, ratings and the order tally. Each behind its own typed
  confirmation with *different* wording, so the two can never be confused at the
  moment of tapping. This resolves the mismatch flagged when the "I agree" gate
  shipped: his original wording asked the phrase to acknowledge the destruction
  of all personal data, and now there is a control for which that is true.
- 🎯 **Once sync exists, Reset propagates to every device.** *"Everywhere,
  always."* ⚠️ **Recommendation was device-only and was declined** — recorded so
  the next session does not re-propose it. The consequence is stated once and
  then built to: a mistap on a phone destroys allergen flags on every synced
  device at once, and sync cannot re-populate what no device still holds. So the
  confirmation on a propagating reset must **name the number of devices it will
  reach**, and Theme 9 must not ship sync before that wording exists. The
  ruling stands; the guard-rail is ours to build.
  ⚠️ **The "name the number" half was AMENDED by the owner the same day
  (2026-08-16, later), on evidence that it could not be met.** *"Everywhere,
  always"* is untouched and still governs. Building the merge established that
  an E2E blob **cannot count devices**: every device shares one bearer code, the
  server holds one opaque ciphertext, and asking the Worker to log arrivals is
  the tracking ADR 0017 refuses. A roster inside the blob is the only possible
  home, and a device that syncs once and is never opened again never leaves it —
  so any number is an **upper bound, not a count**, and a confidently wrong
  number on a destructive confirmation is worse than none (ADR 0060's last
  consequence). Put to him with three options; he chose **drop the number, name
  the scope**: the confirmation says it erases the data on *every device signed
  in with this sync code*, with no count. **Always true, never a wrong number.**
  So the gate on Theme 9 is now that *this* wording exists, not a device tally —
  and the roster the tally would have needed is no longer required at all.
- 🎯 **Activity history: honest log, no escape hatch.** Nothing can be erased
  short of wiping the whole log — removals appear as removals, and there is no
  per-entry "forget this". ⚠️ **Recommendation included the escape hatch and was
  declined.** Simplifies Theme 32a: no per-entry deletion, no tombstones. The
  screen must still state the rule in one sentence, because "remove" meaning
  "recorded as removed" is a surprise unless it is said.
- 🎯 **Theme 30a: hold the build, write the ADR now.** No venue in the corpus has
  two menus, so building it would ship a schema nothing exercises. The shape gets
  recorded while the survey is fresh; the build waits for a real two-menu venue.
  The cheap independent pieces (cuisine axis, allergen regime field, `channel` on
  a price record in `data/`) can proceed meanwhile.

✅ **And one loose end closed:** the dead Filters button was a stale service
worker, confirmed by the owner after a Refresh. It was never a code fault — the
mechanism is ADR 0056's precache reading the browser's HTTP cache.

---
