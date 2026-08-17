# Theme 4c — User contributions (request a place, report an update)

⚑ **Parked (owner, 2026-07-08): no email — deploy first.** A public front door to
the `intake/` pipeline (suggest a place / report a change). When revisited, the
honest candidates within the constraints: **GitHub Issues** (pre-filled
`issues/new` to a public `faves-feedback` repo) or a **Cloudflare Pages form + edge
function** (R2 photo uploads, adds serverless + a spam guard); third-party forms
stay ✗-by-default. Full pre-decision analysis → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

### Reactivated 2026-08-09 (owner) — "tell us what's wrong or missing"

**The ask, raw (owner):** *"feedback feature to add/improve features in the app
or the menus e.g. dish X is missing an allergen or update a price."* The
**park reason has lapsed** — "deploy first" was the 2026-07-08 gate, and the site
went live 2026-07-12. This is now open work, not a parked idea.

Two streams, deliberately separated because they land in different places:

- **Data corrections** — "this price is wrong", "this dish is missing an
  allergen", "they've stopped doing this". Destination: the `intake/` pipeline
  and a content session.
- **App feedback** — a bug or a feature idea about Faves itself. Destination:
  the roadmap / an issue.

- **4c-i — Report from where the problem is** `[M][design]` — ✅ done 2026-08-09
  ([ADR 0028](../../decisions/0028-report-compose-and-share.md)). A report raised **from
  the dish or venue itself** arrives with the venue id, dish name, the price and
  tags we're currently showing, the `verified` date and the device's own version
  stamps already attached — so the owner can act without a conversation. Three
  entry points shipped: a ⚑ on the dish row's action cluster, a "Something wrong
  here?" row closing the venue contact card, and "Suggest or report" in the ⋯ menu
  of both shells (home included). Recipes carry no dish ⚑ — nothing there has a
  price or a venue to correct. Entry-point placement and the report's format are
  **this session's calls, ⚑ owner eyeball**; the transport under them is ruled.
- **Transport — ✅ RULED 2026-08-09, shipped 2026-08-09: compose-and-share**
  `[M]` ([ADR 0028](../../decisions/0028-report-compose-and-share.md)). Built as ruled:
  `report.js` composes (pure, 16 unit tests), `report-ui.js` hands off. Share… and
  Copy are **two first-class buttons side by side** — Share shows exactly when
  `navigator.share` exists, a refused share chains on to the clipboard, and if both
  miss the composed text is revealed, focused and selected with the dialog still
  open. It sits in a disclosure the whole time, so it is never *not* on screen. No
  recipient is baked in. The owner
  took the recommendation: build the report client-side and hand it to the OS
  share sheet / clipboard (`navigator.share`, clipboard fallback) so it arrives
  as a message. **Zero infra, offline-capable, no trust surface, no accounts** —
  and for a family-and-friends audience the message *is* the channel. The other
  two are **not rejected, just not first**: a **pre-filled GitHub issue** needs
  the repo public (Theme 8) *and* a GitHub account most intended users don't
  have; a **Cloudflare Pages Function + spam guard** is the real front door for
  strangers, now permissible under [ADR 0017]'s softened stance, but it's a
  standing backend and needs its own ADR. Revisit (c) when the audience stops
  being people who can already message the owner. **Build note:**
  `navigator.share` needs a user gesture and isn't everywhere (no Firefox
  desktop), so clipboard-plus-visible-confirmation is a first-class path, not an
  afterthought — and the report has to stay on screen if both fail.
- **Safety rule, non-negotiable** — ✅ done 2026-08-09. The dialog carries the
  framing **always visible, not behind an ⓘ**, opening with the allergen caveat's
  own words ("Always confirm for allergies"), and every composed report repeats
  it. An allergen report with no tags says "no tag means not stated, not
  allergen-free". Both are unit-tested across *every* report type, so adding a
  type cannot lose them. As specified:
  an allergen correction is **a suggestion
  to the owner, never a live edit**. Nothing a reporter submits may change what
  the app flags; corrections land in the repo through a human. The reverse
  failure — someone "correcting away" a peanut tag — is a safety failure, not a
  data-quality one. Inherit the existing allergen framing verbatim.
- **Offline behaviour** — ✅ done 2026-08-09. Both modules join the SW shell
  precache and the feature makes no fetch at all, so composing and handing off
  work in flight mode. Verified with the network cut in headless Chrome: the menu
  renders, the ⚑ opens, and the report composes with full context and live version
  stamps. **No outbox** — the share sheet and clipboard both work offline, so
  there is nothing to queue, and a queue would add storage the owner can't see and
  the reporter can't cancel (rationale in ADR 0028).
