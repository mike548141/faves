- [x] **Ranking and "Open now" ignore lifecycle closure** `[XS][js]`
      ✅ **SHIPPED 2026-08-17 (`64b516d`).** `rankVenues` demotes a closed-down
      venue to tier 3; "Open now" disqualifies it outright. The two answers
      DIFFER on purpose and the asymmetry is in both code comments: ranking's
      scale answers *"can you eat there right now?"*, which is one answer for a
      refit, a permanent closure and a shop shut till 6pm — while the filter
      promises *somewhere I can eat now*, and leaving the venue in puts a card
      reading "Permanently closed" inside a list the reader asked to be open.
      The unfiltered list is unchanged and never hides it, which is the whole
      reason the badge exists.
      🔑 **The root cause was a DUPLICATED rule, not a missing one**, and that is
      worth more than the fix. `availabilityTier` has carried
      `if (!isTrading(r)) return 3;` all along and the dice reads it;
      `rankVenues` had its own cheaper inline copy of the tier rule, written
      before the clause existed, so it never met it. A duplicated rule does not
      read as a bug in a diff — **both copies look right**. And `isTrading`'s own
      docstring asserted *"Ranking and the 'Pick for us' shuffle read this"*, of
      which half was false: the docstring was the thing a reader would have
      trusted instead of checking.
      Break-proven: restoring the inline copy fails 3 of the 4 new assertions and
      nothing else; deleting the filter guard fails the 4th and nothing else. The
      fixture runs a raw `lifecycle` block through the real `resolveRecord` fold
      rather than hand-writing a `closure` object, because a hand-written one
      keeps passing the day the fold changes. 1096 unit tests; `SHELL_VERSION` →
      `2026-08-17.123`.
      🛑 **Honest limit, and nothing else in the repo says it: this is
      unit-level only.** No browser check exercises a closed venue, because the
      corpus holds none. `boot_check` and `device_check` prove nothing was
      broken; they do not prove the new behaviour, and CI never will.
      🎯 **One question left for the owner, deliberately not decided.** A
      permanently closed venue now sits on tier 3, tied with a shop shut until
      6pm. Whether it should sink *below* those, below stubs, or leave the home
      list entirely is a product call, and it trades against the reason the badge
      exists. The code comment says it is undecided rather than settled.
      —
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). `rankVenues` and the "Open now" filter both read opening
      hours and neither reads whether the venue has *closed down*. The card
      badges it and the dice already refuses to pick it, so three surfaces
      disagree about the same venue. **Latent today — the corpus holds no
      closed venue** — which is exactly why it is worth fixing before one
      arrives rather than after somebody is sent to a shut shop.
