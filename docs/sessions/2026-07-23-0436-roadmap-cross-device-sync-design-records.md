- **2026-07-23 (roadmap: cross-device sync design + records)**: Owner asked
  whether iCloud/similar could sync a person's prefs across devices without
  standing up backend infra (flagged as a likely future enhancement). Verdict
  captured: no web app can reach iCloud/CloudKit, and web storage is never
  OS-synced, so infra-free options are all *manual transfer*. Landed a design
  with the owner over Q&A: **v1** = shareable-link seed (reuse `share-codec.js`
  + `favourites.merge()`, no infra); **v2** = continual bidirectional sync via a
  Cloudflare Worker + KV holding **one E2E-encrypted blob per user**, keyed by a
  machine-generated **bearer sync-code** (QR *or* word-code), **no accounts**,
  writes **debounced 5–30 s**, merge client-side. Owner steers recorded: willing
  to soften the ethos to allow a **serverless backend** (accounts *not* adopted —
  the sync-code carries it), and the hard requirement that **no one but the user
  (not Cloudflare, not the owner) can decrypt** off-device data. Cost verified
  against Cloudflare's live pricing: **≈ $0** on the free tier (1k writes/day is
  the only tight limit; debounce keeps it clear), $5/mo soft floor if it outgrows
  free. Records written: **ADR 0017** (full deliberation + rejected alts +
  honest on-device-encryption limit), decisions README index line, **ROADMAP
  Theme 9** + the "no backend" note updated to gated-open, and ADR 0012's
  "sync out of scope / needs a signed-in app" stance struck through as
  superseded. Docs-only session — no `site/` change, so no SW version bump and
  no CHANGELOG entry. ⚠️ v2 build is **owner-gated** (first standing backend);
  a pre-build audit should check what Theme 9 subsumes (profiles cross-device
  dimension, shortlist-link codec overlap, Theme 6's retired identity/sync role).

