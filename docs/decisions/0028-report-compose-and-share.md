# 0028 — Report from where the problem is, composed on the device and shared as a message

**Status:** Accepted for the owner-ruled part (the transport). The design calls
this session made on top of it — entry-point placement, the report's format, and
which report types each entry point offers — are **proposed, pending owner
eyeball**; they are reversible and carry no data-model change.

**Date:** 2026-08-09

## Context

ROADMAP Theme 4c was parked on 2026-07-08 with a one-line gate: *"no email —
deploy first"*. The site went live 2026-07-12, so the gate had lapsed, and the
owner reactivated the theme on 2026-08-09 with the ask in his own words:
*"feedback feature to add/improve features in the app or the menus e.g. dish X is
missing an allergen or update a price."*

Two streams land in different places and are kept apart on purpose:

- **Data corrections** — a wrong price, a missing allergen, a dish that's gone.
  Destination: the `intake/` pipeline and a content session.
- **App feedback** — a bug or an idea about Faves itself. Destination: the
  roadmap.

The transport question had already been analysed pre-park (full analysis in
`ROADMAP-DONE.md`). On **2026-08-09 the owner ruled it**: compose-and-share.

## Decision

**1. A report is raised from the thing that's wrong, never from a blank form.**
This is the call the feature lives or dies on. A report raised from a dish row
arrives already carrying the venue id and name, the dish name, the price and tags
*this device is currently showing*, the venue's `verified` date, and the shell and
data version stamps read from the device's own service-worker caches
(`versions.js`) — so the owner can act on it without a conversation. Three entry
points:

| Where | Offers |
|---|---|
| ⚑ on the dish row's action cluster | wrong price · missing/wrong allergen · dish gone · something else about this dish |
| "Something wrong here?" closing the venue contact card | something wrong or out of date here · a bug or idea for the app |
| "Suggest or report" in the ⋯ menu (both shells) | suggest a place · a bug or idea for the app |

**2. Transport: compose on the device, hand to the OS share sheet or the
clipboard (owner-ruled).** `site/js/report.js` is a pure, DOM-free composer;
`report-ui.js` owns the dialog and the hand-off. `navigator.share` and
clipboard-copy are **two first-class buttons side by side**, not a path and its
fallback — `navigator.share` needs a user gesture and doesn't exist on Firefox
desktop, so a share-first design strands desktop reporters. The Share button is
shown exactly when `navigator.share` exists. A share the OS refuses chains on to
the clipboard rather than dead-ending. If both fail, the composed report is
revealed on screen as selectable text, focused and selected, with the dialog
still open — in fact the text sits in a disclosure the whole time, so it is never
*not* on screen. Zero infrastructure, no trust surface, no accounts, and it works
in flight mode like the rest of the app.

**3. No recipient is baked in.** There is no address, handle or phone number
anywhere in the feature. The repo is publication-bound, and for a
family-and-friends audience the message *is* the channel: every report closes
with "send this to whoever shared Faves with you — they'll pass it on."

**4. A report is a suggestion, never a live edit.** Non-negotiable, and the
reason the feature is acceptable at all. Nothing a reporter writes changes what
the app shows or flags; corrections reach the app only through a human editing
the data. The dialog carries the framing **always visible, not behind an ⓘ**,
opening with the allergen caveat's own words ("Always confirm for allergies"),
and `report.js` repeats it in the message itself. The reverse failure — someone
"correcting away" a peanut tag and the app acting on it — would be a safety
failure, not a data-quality one. An allergen report with no tags recorded says
"no tag means not stated, not allergen-free", never that the dish is free of
anything. Both properties are unit-tested across **every** report type, so they
cannot be lost by adding a type.

## Rejected

Neither alternative is rejected on merit — both are **not first**, and either may
return when the audience changes.

- **A pre-filled GitHub issue** (`issues/new` against a public feedback repo).
  Needs the repo public *and* a GitHub account, which most of the intended
  audience does not have and should not need. Now that the repo is public
  (2026-08-09) the first half is satisfied; the account requirement is not.
- **A Cloudflare Pages Function + spam guard.** The real front door for
  strangers, and permissible since ADR 0017 softened the no-backend stance. But
  it is a standing backend with its own operational surface, and it needs its own
  ADR. Revisit when the audience stops being people who can already message the
  owner.
- **Third-party form services** stay ✗ by default — an external request at
  runtime breaks the offline and no-third-party rules (ADR 0001).
- **Queue-and-retry (a background sync outbox).** Considered for the offline
  case and dropped: the share sheet and clipboard both work offline already, so
  there is nothing to queue, and an outbox would add storage the owner cannot see
  and the reporter cannot cancel. Composing offline and handing to a messaging
  app that does its own queuing is strictly simpler.
- **A live preview-free dialog** (compose only on tap). Rejected because keeping
  the composed text on screen at all times is what makes "never lose what was
  typed" true when both transports fail.

## Consequences

- New: `site/js/report.js` (pure, 16 unit tests in `tests/report.test.js`),
  `site/js/report-ui.js`, `.report-*` styles, a `#report-btn` ⋯ item in both
  shells, and 15 draft te reo chrome strings. Both modules join the SW shell
  precache, so the feature is offline-capable from first visit.
- The allergen report type, the safety note, all status prose and the composed
  report itself stay **English** — reo.js's safety boundary and its
  "error prose stays English" rule, inherited by having no key in the table.
- Reports arrive as free text in a messaging app. There is deliberately no
  triage tooling; the machine-readable block (`report:`/`venue:`/`dish:` lines) is
  the seam a future script would group on.
- The feature adds no data-model change and no new trust surface.
- **Pre-existing defect found, not fixed here:** `.order-head` is defined twice
  in `app.css` — once as the sheet header bar, once as the menu screen's small
  uppercase "Order online" label. The later rule wins, so the order and share
  sheets' titles render uppercase on the restaurant screen. The report sheet was
  given its own `.report-head` to sidestep it; the underlying collision is left
  for a session that owns those files.
