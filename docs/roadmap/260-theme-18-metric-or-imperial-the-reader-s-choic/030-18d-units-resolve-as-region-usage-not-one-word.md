- [x] **18d — units resolve as region × usage, not one word** `[S][js][design]`
      ✅ **SHIPPED 2026-08-17 (`2500b06`), [ADR 0087].** `localUnits()` returns a
      frozen `{distance, oven}` table; **GB = miles and yards on the road, °C in
      the oven** — the case the single word could not express. US imperial
      throughout; everything else, and no signal at all, metric. Zero new
      settings, as ruled.
      🔑 **The ruling's central claim held, and was CHECKED rather than
      assumed: zero formatter call sites changed.**
      `git diff main...branch -- app.js menu.js recipe.js cook-ui.js` is empty.
      The formatters already took a `units` argument, so this really was a change
      of what is passed.
      🔎 **One site that is NOT a formatter did change, and catching it was the
      useful part of the job.** `settings-ui.js` read `resolved.units` directly
      to find an option label; with a table that prints an **empty Settings row
      for every reader on Local** — the default population. It now calls
      `unitsLabel()`, which returns the option labels verbatim for the two pure
      tables and **describes** a mixed one (*"Miles, °C"*) rather than naming it,
      deliberately so it cannot read as a third option. That is *"UK is something
      Auto does, never a choice"* carried into the one place a reader would
      otherwise have seen it offered.
      **The interim GB → metric fix (`f253812`) is REMOVED, not left beside it.**
      It bought the °C oven by taking Britain's miles away. Two mechanisms
      answering one question is how the next session ships a third.
      **Not covered by the ruling and decided in the build, flagged not buried:**
      `settings.get().units` is now always a table, never a word-or-table union
      — a union means the next `units === "imperial"` anyone writes is silently
      false for every Local reader. `raw().units` keeps the word, so backup,
      import and sync are untouched.
      Break-proven with 8 probes. The one that matters: folding GB back into
      `IMPERIAL_USAGE` fails *"units resolve per KIND of measure, not to one
      word"* on the oven and *"the timezone wins, because it is the one that
      travels"*, and nothing else. ⚠️ One caveat carried up honestly: the freeze
      test's last line re-asserts GB's oven, so it fires under that probe too —
      redundant with the GB test, not decorative.
      1105 unit tests · `boot_check` 24/24 · `device_check` 20/20 ·
      `recipe_check` 29/29 · `cook_check` 79/79. `SHELL_VERSION` → `.125`.
      🚩 **The cost the ruling accepts is now written into the ADR** rather than
      waiting to arrive as a bug report: a reader whose region is inferred wrongly
      — travelling, a VPN, a timezone spanning countries — **has no way to say
      so**, because the ruling removes the setting that would have let them. The
      ADR also says what a green test cannot show: nothing here checks that CLDR
      is *right* about Britain.
      Original note follows —
      — ✅ **OWNER-RULED 2026-08-17: *"I agree."*** The whole shape below is
      approved: region × usage, **zero new settings**, `local` → a usage table,
      `imperial` relabelled *"US customary (miles, °F)"*, **UK an outcome and
      never a choice**, one ADR superseding [ADR 0029]. **Open and claimable
      — the design question is closed and only the build is left.** Ruled from
      the steer *"localisation, not metric vs imperial; no setting per kind of
      measure"*; the interim GB → metric (`020`, `f253812`) stands until this
      lands.

**Why one word cannot carry it.** CLDR — the localisation data every platform
uses — models units as **region × usage → unit**, and marks its own
metric/US/UK flag *deprecated*. Its `unitPreferenceData` says: length/road
**GB = miles + yards**, **US = miles + feet**, everywhere else km/m;
temperature **US = °F only**, **GB = °C**. So "imperial" is not a place on a
dial with metric — Britain sits between the two on purpose, and the current
single word is what made the oven read °F for a °C oven.

**Why it cannot be a setting either.** The owner ruled out a control per kind
of measure, and the platform agrees: **browsers expose no OS measurement-system
preference**, and `Intl`'s `usage` option is TC39 **Stage 2** — not shippable
under this repo's zero-dependency, zero-build constraint. So the signal has to
be **region**, inferred from timezone and locale, which `locale.js` already
resolves.

**The shape, with no new settings.**
- `localUnits()` returns a **usage table** from region — `{distance, oven}` —
  with GB → miles + yards / °C, US → miles + feet / °F, everywhere else
  metric.
- `units.js`'s formatters read that table. They already take a `units`
  argument, so this is a change of what is passed, not of every call site.
- Relabel the existing `imperial` option **"US customary (miles, °F)"**, which
  is what it actually is. 🔑 **"UK" is something Auto *does*, never a choice a
  reader makes** — the moment it is offered as an option, someone in Britain
  picks "imperial" and gets °F again.
- One ADR, superseding [ADR 0029] in part.

⚠️ **What this does not settle:** a reader whose region is inferred wrongly —
travelling, a VPN, a tz that spans countries — has no way to say so, and the
ruling removes the setting that would have let them. Worth naming when the ADR
is written rather than discovering it as a bug report.

*Full note: `docs/SESSIONS.md`, addendum 2026-08-17-0545.*

[ADR 0029]: ../../decisions/0029-unit-display-preference.md
[ADR 0087]: ../../decisions/0087-units-resolve-as-region-x-usage-not-one-word.md
