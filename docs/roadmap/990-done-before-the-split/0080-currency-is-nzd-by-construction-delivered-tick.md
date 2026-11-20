- [x] ✅ **Currency is NZD by construction — DELIVERED, ticked 2026-08-16 by
  audit.** `about-ui.js` no longer claims a site currency (*"Each place's prices
  are in its own local currency"*); `place.js` carries `venueCurrency()`,
  `priceCurrency()` (per-item) and `formatMoney()`; `menu.js`'s caveat names the
  venue's own currency; and `validate.py` now **requires** `currency` on every
  non-recipe record with a rate in `fx.json` — all 55 carry it. ⚠️ The second
  half was **answered by ruling, not built**: `price.js` still holds one
  `BAND_CURRENCY = "NZD"` calibration and converts into it
  (`toBandCurrency()`), because [ADR 0045](../../decisions/0045-prices-convert-and-localisation-can-follow-you.md)
  deliberately reversed 0043's refusal — *"one calibration, in NZD, reached from
  any other currency by conversion"*. So "the bands stop being global" is not
  outstanding work; it is a decision that went the other way.
