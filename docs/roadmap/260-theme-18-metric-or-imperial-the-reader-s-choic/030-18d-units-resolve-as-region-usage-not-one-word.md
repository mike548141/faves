- [~] **18d — units resolve as region × usage, not one word** `[S][js][design]`
      **CLAIMED 2026-08-17 14:40 UTC (wt: units-region-0817-1440)**
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
