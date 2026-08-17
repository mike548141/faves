- [ ] ✅ **RULED 2026-08-16 — capture PRESENT and TRACE separately in the data,
      but keep tagging only PRESENT.** `[M][schema]` Owner's call, and it split
      the question in two rather than answering it as asked.
      **The case that raised it:** Pizza Hut publishes its own allergen PDF
      grading each allergen `P` (present) against `T` (*"stored or used to
      manufacture other items at the site"*). `T` is near-universal across the
      whole pizza line for nuts, peanuts, sesame and shellfish. [ADR 0025]'s
      *"when unsure, tag"* points at tagging it — but this is **not**
      uncertainty, it is the venue stating two different things, and a warning
      that fires on every item carries no information (the decorative-guard
      shape, [ADR 0072]).
      **His ruling:** the displayed tag stays `P`-only — so nothing about the
      current screens changes — **and the data model gains the ability to hold
      the trace tier**, so the venue's own graded statement stops being thrown
      away at intake. Re-reading 55 menus to recover it later is the expensive
      alternative this avoids.
      🚩 **The design question this has to answer first, and it is not a
      detail: WHERE does the trace tier live?** [ADR 0047] is explicit —
      `site/data/` is a **precached payload**, so a field added there is
      downloaded by every phone whether a screen reads it or not, and *"before
      adding a field to a venue file, name the screen that renders it"*. Under
      the same ruling no screen renders trace. The two readings:
      - **`data/` (the repo-only record)** — obeys ADR 0047 as written, costs
        the phone nothing, and is where "kept forever, not rendered" already
        lives. ⚠️ But it splits one menu reading across two stores, and every
        future refresh has to remember to update both.
      - **`site/data/`, unrendered for now** — keeps one dish's allergen facts
        in one place, at the cost of precaching a field nothing shows, which is
        the exact thing ADR 0047 was written to stop.
      🎯 **Recommend the record (`data/`)**, because ADR 0047 is accepted and
      the payload cost is paid by every phone on every visit — but flag that it
      makes the split-store rule load-bearing for safety data for the first
      time, which is a genuine escalation of what `split_data.py --check` is
      protecting. **Put this to the owner before building it.**
      🔎 **It will recur.** Every venue publishing a first-party allergen chart
      is likely to grade it this way; Subway's own NZ Allergen Web Guide is the
      next one to check.
