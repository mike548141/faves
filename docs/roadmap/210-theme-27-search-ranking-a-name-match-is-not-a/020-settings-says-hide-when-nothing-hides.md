- [x] ⚑ **Settings promises to *hide* places and nothing hides** `[XS]` —
      ✅ **DELIVERED 2026-09-07 (session faves-24, ADR 0091, merged `d300fb9`).**
      The owner's 2026-08-22 ruling is built: `splitByDistanceLimit` in
      `ranking.js` removes a venue past `farKm` **before** the ranker runs, and
      `rankVenues` is untouched — the cut is added, the sort survives inside it.
      Both questions the ruling left as implementation are settled in the ADR:
      the **count is stated and named** (`#result-count` already read
      *"38 of 57 places"*; a second line names the limit, because the count alone
      says the list is short and not *what* shortened it), and the **empty state**
      carries its own reason plus a widen button whose figure rounds **up** to a
      real dial stop. The **direct link opens whole** with one quiet line, per his
      second ruling the same day. `tools/distance_check.mjs` — 19 assertions.
      🔎 **A premise the work corrected:** *on today's data the distance limit
      cannot empty the home screen on its own.* `cook-at-home` and
      `cosmic-vape-and-coffee` carry no coordinates, and a venue we cannot place
      is never cut — so one always survives. The empty state is reachable through
      a **combination** (a cuisine facet plus a tight limit), and becomes
      reachable on distance alone the day every record has coordinates. Recorded
      so a future session measuring *"can this even happen?"* does not delete it
      as dead code.
      🚩 **A dismissible ✕ was rejected, deliberately:** the chips it would
      resemble clear a *view filter* and are gone on reload; this is a *stored
      setting*, so a ✕ would either lie or silently rewrite a preference set
      elsewhere. The line widens the setting instead.
      📋 **Original filing follows.**
      found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). The copy reads *"Hide places further than…"* and *"will
      start hiding places"*. **Nothing is hidden: the ranking sinks them.** A
      reader who sets a distance and still sees a far-away venue concludes the
      setting is broken, which is worse than the setting not existing.
      🎯 **Owner's call on which side is wrong** — make the copy describe
      ranking, or make the control actually filter. They are different
      features, and the second changes what the home screen is.

      ✅ **RULED 2026-08-22 — MAKE THE CONTROL ACTUALLY FILTER.** Put to the
      owner as *"which side is wrong"* with both options costed; he chose the
      **feature**, not the copy. So the setting keeps its promise: a distance
      limit **removes** places beyond it from the home list rather than sinking
      them. The cheap reword was explicitly declined, and the option he took
      was the one labelled as changing what the home screen is — so that
      consequence is accepted, not overlooked.
      🚩 **What this ruling does NOT settle, and whoever builds it must:** the
      control can now empty the screen. Three things follow and none of them
      were part of the question — (1) an **empty state** that says why nothing
      is showing and offers the way out, because a blank home screen is
      indistinguishable from a broken app; (2) whether the count is stated
      (*"showing 12 of 55"*), which is what stops a reader thinking the
      collection shrank; (3) what the filter does to a venue reached by a
      **direct link** — filtering a list is not the same as hiding a page, and
      the honest default is that a link always works. Take these as
      implementation questions unless they turn out to need him.
      🔑 **And the ranking does not go away.** Sinking distant places was never
      wrong on its own — it is what the list does *within* the limit. This
      ruling adds a cut, it does not replace the sort.

      ✅ **RULED 2026-08-22 on the direct-link question this ruling opened —
      THE LINK WORKS, AND SAYS WHY.** A link straight to a venue beyond the
      reader's distance limit **opens normally**, carrying one quiet line
      naming the limit and offering to widen it. Blocking the link was
      explicitly rejected: the sender never knew what limit the recipient set,
      so a blocked link fails for a reason neither party can see.
      🔑 **The reasoning worth keeping:** the note is not an apology for the
      filter, it is the one moment the setting becomes legible — a reader
      wondering why a place was missing from home gets the answer on the page
      they are already looking at, next to the control that fixes it.
      📋 **Still open and treated as implementation unless he says otherwise:**
      the empty state when the limit excludes everything, and whether the list
      states its count (*"showing 12 of 55"*).
