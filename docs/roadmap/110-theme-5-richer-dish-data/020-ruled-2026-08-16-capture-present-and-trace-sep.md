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
      🎯 **[SUPERSEDED 2026-09-09 — kept for the record, see the two rulings
      below. This ask was already answered when it was written.]
      Recommend the record (`data/`)**, because ADR 0047 is accepted and
      the payload cost is paid by every phone on every visit — but flag that it
      makes the split-store rule load-bearing for safety data for the first
      time, which is a genuine escalation of what `split_data.py --check` is
      protecting. **Put this to the owner before building it.**
      🔎 **It will recur.** Every venue publishing a first-party allergen chart
      is likely to grade it this way; Subway's own NZ Allergen Web Guide is the
      next one to check.

  🛑 **CORRECTION 2026-09-09 — HE HAD ALREADY RULED THIS ON 2026-08-16, AND
  THIS ITEM NEVER RECORDED IT.** Verbatim at `docs/SESSIONS.md:6480-6488`, in
  the session headed *2026-08-16 15:40 UTC*: *"The trace tier: app tags
  unchanged, and it lives in `site/data/`. Only `P` becomes a `contains-*` tag;
  the payload gains the ability to carry `T` rather than discarding it."* And
  the premise he overruled, in his own words at `docs/SESSIONS.md:6483-6484`:
  *"In ruling 47 I said it only holds data the screen shows, **or may with
  future features**."*
  🔎 **So the 2026-09-09 ruling below is the SAME ruling, given a second time.**
  Because the item stayed silent, a session re-asked a settled question and he
  answered it identically 24 days later. That is the cost this note exists to
  stop repeating — the ask, not the answer, was the defect.
  🚩 **And his premise is checkable, not merely asserted.** ADR 0047's
  **Context** does carry the future clause — *"data the app will never render —
  now or in a future feature"* (`docs/decisions/0047-the-app-ships-only-what-it-renders.md:35-37`).
  Its own **Consequences** and `CLAUDE.md`'s restatement both drop it. Two of
  the three places a builder looks are narrower than the decision.

  ✅ **OWNER RULED 2026-09-09 — THE TRACE TIER LIVES IN `site/data/`,
  UNRENDERED.** He took the reading this item recommended AGAINST: one dish's
  allergen facts stay in one place, at the cost of precaching a field no screen
  shows.
  🚩 **This session's recommendation was the record store, and he overruled it.**
  Recorded because the reasoning was published here and a future reader should
  not mistake the recommendation for the decision. His choice buys correctness
  on refresh — the argument against `data/` was that it splits one menu reading
  across two stores and every future refresh must remember both, which is the
  kind of rule that fails quietly and is failing on safety data when it does.
  🛑 **It is a deliberate, owner-made exception to ADR 0047**, whose test is
  *name the screen that renders it*. That test now has an answer of "none, by
  ruling" for this field. ADR 0047 is accepted, so this needs a **superseding
  note on 0047 naming the exception and its reason** — never an edit — and a
  new ADR recording the trade he made. Without that, the next cold review finds
  a field nothing renders and correctly reports it as a breach.
  📋 **Also owed with it:** the payload cost measured per venue that carries a
  chart (Pizza Hut is the first), and a validator rule so a trace tag cannot be
  confused with a present one by anything that reads tags positionally.
  ⏳ **Not started this session.**

  🛑 **THE ADR 0047 SUPERSEDING NOTE IS OWED WORK, AND IT HAS BEEN OWED SINCE
  2026-08-16 — MEASURED, NOT RECALLED (2026-09-09).** The 2026-08-16 record
  closes on *"🎯 Wants a superseding note; raised, not taken"*
  (`docs/SESSIONS.md:6488`). Twenty-four days later it is **still not taken**:
  `grep -rn "0047" docs/decisions/*.md` returns 33 inbound references and **not
  one** superseding or amending record, and 0047's own header carries `Status:
  accepted` with no *Superseded by* / *Amended by* line. This is why the
  bracket on this item stays `- [ ]`: the ruling is settled twice over, but the
  work it obliges has not started.
  ✅ **NO LIVE OWNER ASK REMAINS ON THIS ITEM (2026-09-09).** Everything left is
  build and record work on a decision he has now given twice. The 🎯 above is
  marked superseded rather than deleted, so a reader can still see what was put
  to him and what he did with it.

