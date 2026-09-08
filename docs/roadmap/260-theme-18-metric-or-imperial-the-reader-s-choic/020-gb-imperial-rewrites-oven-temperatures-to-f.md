- [ ] ⚑ **GB → imperial rewrites oven temperatures to °F, and UK ovens are
      °C** `[XS]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). The unit preference treats Great Britain as
      one imperial bucket, so a reader there is shown oven temperatures in
      Fahrenheit that their oven does not have. **Britain is metric for
      temperature and imperial for some distances**, which is why one axis
      cannot carry both. 🎯 **Owner's call, two shapes:** map GB → metric
      outright, or split the preference so distance and temperature are chosen
      separately. The second is more honest and more work.

  ✅ **OWNER RULED 2026-09-09 — MAP GREAT BRITAIN TO METRIC.** He declined
  splitting the preference into separate distance and temperature axes (the
  more honest and more expensive shape) and declined leaving it.
  🔑 **What the ruling accepts, said so it is a choice and not an oversight:**
  road distances in Britain really are in miles, so a British reader will see
  metres and kilometres for a unit they do not use that way. He traded that for
  an oven temperature their oven can actually be set to — the direction that
  can spoil food rather than merely read oddly.
  📋 **The work is small and its test is the point:** the country-to-units map
  gains Britain on the metric side, and a unit test pins **both halves** — that
  a British reader gets Celsius, and that the distance consequence is the one
  chosen rather than a regression someone later "fixes". Check whether any
  other country in the map has the same split (Ireland and Canada are the
  obvious candidates) and report rather than widening the ruling.
  ⏳ **Not started this session.**

