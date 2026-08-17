# 0087 — Units resolve as region × usage, not one word

**Status:** accepted — supersedes
[0029](0029-unit-display-preference.md) **in part** (its one-word preference
and its "guessing from the browser locale" rejection; everything else stands)
**Date:** 2026-08-17

## Context

[ADR 0029](0029-unit-display-preference.md) gave the reader one word — `metric`
or `imperial` — and every surface read that word. [ADR
0045](0045-prices-convert-and-localisation-can-follow-you.md) then added
`local`, which resolves the word from the device's region, so a phone that
lands somewhere starts answering as that place does.

Britain breaks the word. A device resolving to GB got `imperial`, and
`imperial` rewrites every oven temperature in a recipe to °F. **UK ovens are
°C.** So a London phone read `Bake at 355°F` for a 180°C bake — a real defect,
patched on 2026-08-17 (`f253812`) by resolving GB to `metric` instead. That
patch was labelled interim in its own message, because it bought the °C oven by
taking away the miles: British road distance is miles and yards, and the fix
made a London reader measure the walk to dinner in metres.

The word is the fault, not the table it is looked up in. CLDR — the
localisation data every platform ships — models units as **region × usage →
unit**, and marks its own metric/US/UK flag *deprecated*. Its
`unitPreferenceData` says length/road **GB = miles + yards**, **US = miles +
feet**, everywhere else km/m; temperature **US = °F only**, **GB = °C**.
Britain is not a point on a dial between metric and imperial — it sits in two
places on purpose.

Two things are not available to fix it. Browsers expose **no OS
measurement-system preference**, and `Intl`'s `usage` option — which would
answer this question properly — is TC39 **Stage 2**, so it is not shippable
under this repo's zero-dependency, zero-build constraint (ADR 0001). And the
owner ruled out the obvious product answer: **no setting per kind of measure.**
His steer was *"localisation, not metric vs imperial"*; the shape below was put
to him in full and ruled **2026-08-17: "I agree."**

## Decision

**Units are a table of usages, and region fills it in. There are zero new
settings.**

**1 · `localUnits()` returns `{distance, oven}`, not a word.** Each field is
`"metric"` or `"imperial"`, and each is answered independently:

| Region | `distance` | `oven` |
| --- | --- | --- |
| GB | imperial (miles, yards) | metric (°C) |
| US | imperial (miles, yards) | imperial (°F) |
| everywhere else, and no signal | metric | metric |

The table lists only the two usages Faves actually renders. A third entry
would be a claim no screen exercises and nothing checks (ADR 0047's rule,
applied to code rather than data).

**2 · `units.js`'s formatters read the table, and every call site is
unchanged.** They already took a `units` argument, so this is a change of what
is *passed*, not of who passes it: `formatDistance`, `dialSpec`, `dialValue`,
`dialKm` and `formatDial` read `.distance`; `convertTemperatures` reads
`.oven`. One new function, `unitUsage()`, normalises whatever arrives — a
table, one of the two stored words, or junk — so an unrecognised value still
reads metric instead of throwing, exactly as the string version did.

**3 · `settings.get().units` is ALWAYS a usage table, whether or not the
reader chose `local`.** `raw().units` keeps the word, and the word is what is
stored, exported and synced. Letting the word through for a reader who picked
one would leave a union type flowing across the app, and the next `units ===
"imperial"` anyone writes would then be silently false for every reader on
Local — which is the whole population by default, since `local` is the default.

**4 · The `imperial` option is relabelled "US customary (miles, °F)".** That
is what it has always been. °F ovens are a US usage, not a British one, and a
reader in Britain who sees the word *Imperial* picks it and gets the original
bug back by hand.

**5 · 🔑 "UK" is something Local *does*, and never a choice on the picker.**
The vocabulary stays two words. A GB reader on Local sees the Settings row read
`Miles, °C (local)` — described, not named, precisely so it does not read as a
third option they could go and select. The moment a UK entry appears in that
list, someone in Britain has to be trusted to know that *Imperial* means
Fahrenheit and *UK* does not, and that is the confusion this record removes.

**6 · The interim GB fix is removed, not left beside this.** `f253812`'s
`IMPERIAL_COUNTRIES` set is gone; GB's row in the usage table is the whole
mechanism. Two mechanisms answering one question is how the next session ships
the third.

## Rejected

- **A setting per kind of measure** ("distance: miles · oven: °C"). Owner-ruled
  out explicitly, and rightly: it turns a question nobody wants to be asked
  into two, and the answer is knowable from where you are.
- **A third `uk` option on the picker.** The cheap-looking fix, and it
  reintroduces the defect through the front door — see Decision 5.
- **Waiting for `Intl` `usage`.** TC39 Stage 2 with no shipping engine. Under
  ADR 0001 a polyfill is not available either.
- **Geolocation as the region signal.** Rejected for the same reason
  `locale.js` already rejects it for currency: the app asks for location for
  "Near me", and turning a permission granted for one purpose into a second,
  unasked one is not a trade worth making — for a guess this good.
- **Keeping the single word and special-casing GB inside
  `convertTemperatures`.** It works for exactly today's two usages and hides
  the region in the formatter, where nothing names it. The next usage (recipe
  quantities — 18b, still blocked on 17a) would need the same special case
  written a second time, in a second file.
- **Leaving `settings.get().units` as a union of word-or-table.** Smaller diff,
  and it makes the app's most-read setting have two shapes with no gate saying
  which you have. Normalising at the store costs one object spread on a path
  that already spread for the default reader.

## Consequences

- ⚠️ **A reader whose region is inferred wrongly has no way to say so, and this
  record removes the setting that would have let them.** Someone travelling,
  behind a VPN, or in a timezone that spans countries gets the region's usages
  and cannot correct just the wrong half. They can still pick `Metric` or `US
  customary` outright, but that is the one-word choice again: a New Zealander
  living in London who wants °C and miles has to accept whichever half is
  wrong. This is the honest cost of "zero new settings" and it is named here so
  it arrives as a known trade rather than as a bug report. If it does arrive,
  the smallest answer is a per-usage override, which is the thing the owner
  ruled out — so it goes back to him, not into a patch.
- Britain gets both halves right for the first time: miles and yards on the
  road, °C in the oven. Before `f253812` it had miles and °F; after it, metres
  and °C.
- `settings.get().units` changes shape. Every consumer inside `site/` passes it
  straight to `units.js` and needed no edit; `settings-ui.js`'s index row is the
  one place that read it directly, and it now calls `unitsLabel()`.
  `raw().units` — the value `personal-data.js`, `sync-merge.js` and the picker
  read — is untouched, so backups, imports and cross-device sync carry exactly
  what they carried before.
- The usage tables are frozen. They are shared constants handed to every caller
  on the page, so a caller that wrote to one would change what every other
  reader sees; a test asserts the write throws.
- What a passing test cannot tell you: **nothing here checks that CLDR is
  right about Britain.** The table is transcribed from `unitPreferenceData` and
  from the owner's own ruling, and a wrong region entry is a wrong answer that
  every gate calls green.
- 18b (recipe quantities) is still blocked on 17a, and now has somewhere to
  land: a third field on the usage table, whose GB value is the interesting one
  — a UK cook measures in grams and a US one in cups, which is again not the
  same axis as the road sign.
