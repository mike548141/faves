# 0009 — Group ordering shares picks as URLs, not connections

**Status**: accepted
**Date**: 2026-07-09

## Context

The owner's real scenario: five people at the house, each picking their
own dishes in Faves on their own phone, with everything landing on the
host's order list so one person phones it in and does the pickup. The
first instinct was a live local link — "Bluetooth, WiFi maybe?" Hard
constraints in play: no backend, no accounts, offline-capable, and an
all-Apple household (so iOS Safari/WebKit is the floor). Theme 1 shipped
the order tally with "multi-person local profiles" explicitly deferred.

## Decision

Guests share their **finished picks**, not a live session. A "send to
the orderer" action encodes the guest's order (venue id, dish, qty) into
a **URL fragment** and hands it to the OS share sheet — AirDrop or
Messages in practice — with a QR code as the show-me-your-screen
fallback. Opening the link on the host's phone merges those lines into
the existing `cart.js` order, grouped by venue as today. The fragment
never reaches a server, so nothing is logged anywhere; the same codec
serves the parked "shareable shortlist links" idea.

Separately, the owner softened the backend stance (2026-07-09): **a
lightweight backend (e.g. a Cloudflare Worker) is an acceptable future
direction** — live rooms, feedback intake — but it is a deliberate step
that needs its own ADR before anything assumes it. Until that ADR
exists, "no backend" remains the working constraint.

## Rejected

- **Web Bluetooth** — does not exist in iOS Safari (the whole
  household), and where it does exist a browser can only act as a
  central connecting to peripherals: browser-to-browser phone pairing is
  simply not a thing.
- **WebRTC data channels over the LAN with QR signalling** — genuinely
  serverless and offline-capable, but the handshake is manual: roughly
  two QR scans per guest per direction before anyone picks a dish, and
  iOS suspends the page (killing the connection) every time a phone
  locks mid-browse. Live-state resync after every wake is real
  complexity for a five-minute session. The party trick that fails at
  the party.
- **A backend room now (Worker + Durable Object, join-by-code)** — the
  best UX and the obvious shape *if* a backend existed, but it breaks
  the standing no-backend/no-accounts posture for a feature the
  share-sheet flow covers. Deferred, not refused: this is exactly what
  the future backend ADR would revisit.

## Consequences

- Not live: the host sees each person's picks when they send them, not
  as they tap. For "everyone choose, then one person phones it in",
  that's the honest shape of the job.
- Failure degrades gracefully — a link that never arrives means one
  person reads their picks off their own phone; there is no half-synced
  state to debug.
- One URL codec to design once (compact, versioned, order + shortlist),
  bounded by practical URL length — fine for a family order, and the
  fragment keeps it out of server logs by construction.
- Receiving is a merge into `cart.js`, which already models multi-venue
  orders; a device-local "whose picks" label can ride along (typed by
  the guest, never stored in the repo — same personal-data posture as
  favourites).
- Guests need Faves loaded once (first visit needs internet; after that
  the PWA works offline at the house).
