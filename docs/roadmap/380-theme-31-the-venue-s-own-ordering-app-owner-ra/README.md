# Theme 31 — the venue's own ordering app (owner-raised 2026-08-16)

> *"Where there is a specialised app to order from, like McDonalds has, Faves
> should have a link to open that app the same way we open uber, delivereasy
> etc"*

🎉 **The research turned this from a feature into a two-line data change, and
found that a third of it already works.**

**There is no such thing as an "app URL" to store.** The only mechanism safe
from a static, zero-dependency site is the **universal link / Android App
Link**: an ordinary `https://` URL that the OS silently routes to the installed
app, falling back to the website when it is absent. We do not "add an app link"
— we write `<a href="https://…">` and the OS upgrades it. Everything else was
checked and rejected:

- **Custom schemes (`mcdonalds://`) are unusable.** With the app absent, Safari
  shows *"cannot open the page because the address is invalid"* — a dead-end
  error dialog with a venue's name attached. Chrome doesn't navigate them at
  all. And Apple states there will never be an API to test one first, *"due to
  privacy concerns."*
- **`intent://` with a fallback works but is Android-Chrome-only** and buys
  nothing over a verified App Link.
- **We can never detect whether an app is installed.**
  `navigator.getInstalledRelatedApps()` requires a *mutual, cryptographically
  verified* relationship between our origin and the app — McDonald's would have
  to add our domain to their asset links. Safari has never supported it in any
  version. 🚩 **So no button may ever say "Open in app"**: it would be a claim
  we cannot back, and wrong for the majority of readers.

✅ **Three of our four aggregators already open their native apps today**, with
the plain URLs we already ship — verified against Apple's own AASA CDN and
Google's Digital Asset Links API, not against blog posts:

| Platform | Opens the app from our existing link? |
|---|---|
| Uber Eats | ✅ `/??/store/*/*` is claimed, so `/nz/store/…` matches |
| DoorDash | ✅ `*/store/*` claimed |
| Delivereasy | ✅ all paths claimed — but use the `www.` host; the apex 502s on `assetlinks.json` |
| Easy Eats | ❌ their `.well-known` serves an HTML redirect stub, so neither platform can verify |

**Of the chains, only KFC NZ has a clean, verified association** (both iOS and
Android, all paths but `/_/*`). The rest are worse than absent:

- 🛑 **Subway is actively dangerous.** `www.subway.com` claims **all paths** for
  the *global* Subway app, but NZ ordering lives in a completely different app
  (`nz.co.subcard.app`, published by Simplicity Technologies, not Subway). A
  `subway.com` link may hand an iPhone to the wrong app entirely. `subway.co.nz`
  does not resolve.
- ❌ **McDonald's NZ has no association at all** — `mcdonalds.co.nz` returns
  "Not Found" from Apple's CDN, and the `www.mcdonalds.com` file scopes only US
  paths to US apps, declaring a package that isn't even the one on the NZ Play
  listing. **The owner's own example is the one chain where this cannot work
  today.** Worth telling him plainly.
- ❌ **Domino's** has store pages on `www.dominos.co.nz/store/<id>` but the
  association lives only on `order.dominos.co.nz` and has **no `/store/`
  component** — no verifiable per-store deep link exists.
- ❌ **Hell Pizza** claims only `/password-reset/*` and `/voucher/*`; its
  `assetlinks.json` returns SPA HTML. Pizza Hut, Starbucks and BurgerFuel have
  no association files on any host probed.

### What to actually build

- **31a — a first-party ordering *category*, not a new mechanism** `[S][schema]`.
  `ordering[]` keeps its `{platform, url}` shape; add an optional
  `kind: "first-party" | "aggregator" | "app-store"` so the render can group
  "Order direct" above the aggregators. Where the OS can upgrade the link it
  silently will; where it can't, the reader gets the ordering site, which is the
  only thing we promised. **Label by brand and service — "Order from KFC" — not
  by mechanism.**
- **31b — the app-only case** `[S][design]`. Starbucks NZ ordering is in-app
  only, and McDonald's NZ may be (unverified — its site blocks scripted fetches;
  do not assert either way without checking in a browser). There a store link
  *is* the real entry point, but it must be worded as one — "Get the Starbucks
  NZ app" — never as ordering. That is `kind: "app-store"`.
- **31c — an association re-check** `[S][ci]` 💡. These are plain files on other
  people's servers and change without notice; two `curl` calls per domain
  confirm them. A cheap scheduled job in the mould of `fx.yml` would stop a
  silently-rotted link. Optional, and only worth it once we ship more than one.
- ✅ **31d — accessibility wording — DONE 2026-08-16** (`cfc9309`). Every
  off-site link the menu screen renders now carries a visually-hidden
  " (opens in a new window)" — the literal WCAG G201 wording, naming only the
  guaranteed behaviour. Detail → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

🚩 **Do not publish** any per-store Domino's link, `order.subway.com/en-nz/menu`,
`subway.co.nz`, `easyeats.nz`, or `hellpizza.com` — none verified or resolving.
Re-check `kfc.co.nz/find-a-kfc/<slug>` in a real browser first; a scripted fetch
gets 403 from its bot protection.

⚠️ **One unresolved unknown, flagged rather than papered over.** An installed
iOS PWA renders out-of-scope links in an in-app browser view, and no
authoritative Apple documentation says whether a universal link tapped *there*
still hands off to a third-party app. Community reports conflict and behaviour
has shifted across iOS versions. **This is the most likely place the feature
quietly does nothing, and it needs a real-device test on the owner's phone** —
not a headless check.

---
