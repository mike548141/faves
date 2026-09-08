- [x] ⚑ **GB → imperial rewrites oven temperatures to °F, and UK ovens are
      °C** `[XS]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). The unit preference treats Great Britain as
      one imperial bucket, so a reader there is shown oven temperatures in
      Fahrenheit that their oven does not have. **Britain is metric for
      temperature and imperial for some distances**, which is why one axis
      cannot carry both. 🎯 **Owner's call, two shapes:** map GB → metric
      outright, or split the preference so distance and temperature are chosen
      separately. The second is more honest and more work.

  🛑 **THE ASK WAS PUT TO HIM ON A STALE PREMISE, AND THE ANSWER IS A
  REGRESSION. THE DEFECT THIS ITEM DESCRIBES DOES NOT EXIST.** Read the code
  before acting on anything below.

  **Verified 2026-09-09 in `site/js/locale.js:131`:**
  `GB: Object.freeze({ distance: "imperial", oven: "metric" })`, with
  `tests/locale.test.js:68-69` pinning both halves. A British reader already
  gets **°C in the oven and miles on the road**. ADR 0087 (2026-08-17,
  accepted) delivered exactly the split this item called *"more honest and more
  work"*, and its own text says it **supersedes the interim GB → metric of
  2026-08-17 (`f253812`), which fixed the °F oven by giving Britain metres as
  well.**

  🚩 **So the option the owner chose on 2026-09-09 is the patch that was
  already tried and already replaced**, and the option he declined is what
  ships today. Acting on his answer would reinstate a known regression.
  🔑 **The fault is this session's, not his.** It put a 2026-08-17 item to him
  as a live choice without opening the file first — the exact failure it spent
  the day catching in sub-agents' work, and the reason
  `PROPAGATION.md` says to read the source rather than the summary. An ask is a
  claim like any other, and every fact in it is supposed to be verified.
  ⏳ **Nothing is owed unless he says otherwise.** His ruling stands as a
  ruling; it is recorded here unactioned because its premise is refuted, and
  re-briefing him before acting is what the floor requires at exactly this
  point. If he still wants Britain metric throughout, that is a *new* decision
  against ADR 0087 and needs to be taken on the real trade-off, which is losing
  the miles.

  ⛔️ **The superseded ruling, kept verbatim for the record:**
  **OWNER RULED 2026-09-09 — MAP GREAT BRITAIN TO METRIC.** He declined
  splitting the preference into separate distance and temperature axes (the
  more honest and more expensive shape) and declined leaving it.
  🔑 **What the ruling accepts, said so it is a choice and not an oversight:**
  road distances in Britain really are in miles, so a British reader will see
  metres and kilometres for a unit they do not use that way. He traded that for
  an oven temperature their oven can actually be set to — the direction that
  can spoil food rather than merely read oddly.
  📋 **The one thing genuinely worth doing here, and it is small:** the map is
  an exception list of two (`GB`, `US`), so **Ireland and Canada are the
  obvious untested cases** — Ireland is metric with imperial road signage in
  the North, Canada is metric with imperial in the kitchen. Neither is in the
  table, so both currently read fully metric. Whether that is right is a
  question worth asking; it is not this item's, and it is not a defect until
  someone measures it.

