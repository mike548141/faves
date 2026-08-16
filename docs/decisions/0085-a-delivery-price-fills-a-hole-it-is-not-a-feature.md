# 0085 — A delivery-app price fills a hole in the data; it is not a feature

**Status:** Accepted. Supersedes the **channel half only** of
[ADR 0080](0080-a-venue-has-menus-plural.md) — its Decision 5 and the
admission-test result that reads *"`channel`'s test is MET"*. The rest of 0080
stands.

**Date:** 2026-08-16

## Context

[ADR 0080](0080-a-venue-has-menus-plural.md) recorded a menu-model shape and held
its build, with one exception: it found the **channel** dimension already
exercised by the corpus and therefore admitted. The evidence was real —
`pizza-pomodoro` sells `Margherita - Large` at **$29.00** and `Large Margherita
(Online Deal)` at **$17.00**, a 41% spread on identical ingredients with the
channel encoded in a parenthetical in the dish *name*; `pizza-hut` repeats the
shape across five *"…Delivered"* rows. Read as a modelling problem, the obvious
next step is a channel-aware price so one dish carries both figures.

**The owner ruled against that step, and the reason reframes the problem rather
than deciding a detail of it.** Put to him as four options — model it in the
payload, record it in `data/` only, rename the rows, or park it — he answered
none of them and stated the goal instead:

> *"Our goal is to show only in-store pricing, but if we don't have any other
> data to hand then we will at least show the app store pricing until an in-store
> menu can be collected. I do not want Faves to show both the in-store and in-app
> pricing as a feature, it's a way to fill a hole in the data not a feature."*

## Decision

**1. Faves shows ONE price per dish: the in-store price.** That is the price a
reader pays at the counter, and it is the only price the app is trying to tell
them.

**2. A delivery-app or online price is a FALLBACK, used only where no in-store
price is held.** It is a stopgap against an empty field, and it carries the
caveat that says where it came from — the machinery ADR 0031 and ADR 0037 already
built, and which `verifiedBy: delivery-app` fires today.

**3. Faves never shows both prices for one dish.** Not side by side, not as a
toggle, not as a channel picker. Two prices on one dish is the feature the owner
declined, and declining it is what makes `channel` unnecessary in the payload.

**4. So `channel` is NOT admitted to `site/data/`, and ADR 0080's finding to the
contrary is superseded.** The evidence 0080 cited was sound and the inference
from it was wrong: **a duplicated row is a data-collection gap wearing the
clothes of a modelling gap.** The corpus exhibits two prices because two readings
were taken, not because the product needs to express two.

**5. Where the record store keeps a channel note, it keeps it as provenance, not
as a price axis.** `data/` may say which reading came from where — that is what a
record is for — but nothing in `site/data/` gains a channel field on the strength
of it.

## Rejected

**A channel-aware price in the payload.** The technically correct model, endorsed
by every commercial schema surveyed in 0080 (Square, Toast, Uber Eats all carry
it), and the thing 0080's own admission test appeared to authorise. It loses
because it would *productise* a data gap: the reader would be shown a choice the
app exists to spare them, and every venue would then owe two prices instead of
one. **An industry consensus is evidence about what POS systems must model, not
about what this app should show.**

**Recording `channel` in `data/` as originally greenlit.** Still permitted under
Decision 5 as provenance, but not as the price axis the earlier greenlight
imagined. Measured: only 2 venues hold any price history at all, 212 entries,
none delivery-sourced — so as a price axis it would have landed on rows that do
not need it.

**Parking it until more venues exhibit it.** Consistent with 0080's own hold on
`menus[]`, and wrong here: waiting implies the shape is still open. It is not —
the owner closed it.

## Consequences

**The two Pizza Pomodoro rows are now a defect with a name.** They show an
in-store price *and* an online price for one pizza, which Decision 3 forbids.
Under Decision 2 the in-store price ($29.00) is the one Faves should carry, and
the Online Deal rows belong in the record store. ⚠️ **Not done here** — menu
content is owner-supplied or owner-directed, and removing rows is a content
decision, not a schema one. Flagged for his direction.

**The Pizza Hut `…Delivered` rows are a different case and must not be swept up
with them.** Those are meal deals — bundles that genuinely exist only for
delivery — not a second price for a dish sold in store. Decision 3 is about *one
dish, two prices*; a delivery-only product is one product.

**KK Malaysian and KC Cafe are now correct rather than incomplete.** They hold a
delivery-sourced price because no in-store reading exists — exactly Decision 2 —
and since 2026-08-16 they say so, carrying `verifiedBy: delivery-app` and the
caveat *"These prices came from a delivery app, not the place itself"*. **The
fix for them is not a schema change; it is an in-store menu**, at which point the
fallback is replaced and the caveat retires itself.

**ROADMAP 30d is closed as a schema item.** What survives of it is a content
task: collect in-store prices where only app prices are held.

## What this record does not settle

**Whether a venue's own online-only promotion is a "channel" at all.** Pizza
Pomodoro's $17 comes from the venue's own website, not a third-party app, so it
is a *promotion* rather than a marked-up relisting. This record treats both the
same because the owner's rule is about what the reader is shown, not about who
set the price — but a future venue running a genuine in-house online tier may
make the distinction matter.
