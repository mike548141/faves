# Theme 9 — Cross-device preference sync (owner-approved 2026-07-23)

The same person's hearts, ratings, and settings, kept together across
their own devices. Full deliberation → [ADR 0017]; this is the sequenced
build view. Ethos updated with the owner: a **serverless backend is now
permitted**; **accounts are not** (a bearer sync-code carries it);
**off-device data must be E2E-encrypted** — no way for Cloudflare *or*
the owner to read it.

**Through-line (owner, 2026-07-23):** the backend shifts Faves from
**device-centric to user-centric** — a person's data belongs to *them* and
follows them across devices (Theme 9) and, with consent, to people they
choose (Theme 10), rather than being trapped in one browser's storage.

- ✅ **v1 — shareable-link seed** `[S]` — **shipped 2026-08-09**
  ([ADR 0030](../../decisions/0030-personal-data-import-and-transfer.md), proposed —
  owner to ratify). Settings → Your data → "Make a transfer link": the active
  profile's hearts + ratings + settings packed into a `#xfer=` fragment, with
  copy / share-sheet / QR through the existing share dialog, and a receive flow
  on every screen that goes through the *same* applier the file import uses —
  so the profile-collision and allergen questions are asked identically either
  way. Called **transfer** throughout, never sync. ⏳ **Owner ruling
  2026-08-09: ADR 0030 stays proposed until he has walked import + transfer on
  his own phone** — ratification rides on that device pass, not on this record.
  🔎 **The QR is a bonus, not the path.** Measured against `qr.js`'s v20-M
  ceiling (666 bytes): 3 favourites + 2 ratings + settings = a 568-char URL and
  a scannable code, but 5 favourites already overflows, 30 favourites is 3,107
  chars and the whole catalogue is 79,583. So the link is the primary hand-off
  and the QR degrades with an honest message. **Scope call: active profile
  only** — whole-device backup is the file's job (12b), and carrying every
  profile multiplies the one dimension that's already binding.
  ⏳ Owner to eyeball the wording and the 390 px layout; ADR 0030 wants
  ratifying.
- **Reuse Theme 12's collector.** The push/pull blob is the same
  "gather the personal layer / apply it back" operation as data export; build
  `personal-data.js` once (Theme 12c) and encrypt its output here, rather than
  writing a second serialiser that can drift from the first.
- **May subsume queued items** — revisit when v2 is scoped: per-device
  profiles (ADR 0012) gain a cross-device dimension; the "separate
  signed-in app owns sync" assumption (Theme 6) is retired; the shareable
  shortlist links overlap v1's codec. Audit before building so nothing's
  built twice.
- **Terminology (addendum 2, ADR 0017):** once passkey sync ships, **don't
  say "no accounts"** — a passkey reads as an account to users. State what
  we *don't* collect (no email/password/identity/tracking; E2E so only you
  can read it). Lockstep: revisit the About line (`about-ui.js`) in the same
  change that ships passkey sync — it's true today (no passkey yet).
