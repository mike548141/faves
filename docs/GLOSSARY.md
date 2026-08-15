# Glossary

Acronyms and short-form terms used in this repo's docs, defined in the sense
they carry *here* — not generic dictionary definitions. A term listed below
counts as expanded everywhere in the repo's prose: this file is `plainscan`'s
designed escape for its "acronym never expanded" finding. The rule lives in
atelier's `docs/method` <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tree, not this repo's -->
and is enforced by atelier's `tools/plainscan.py`, <!-- pathscan:allow: atelier cross-repo path — exists in atelier's tree, not this repo's -->
whose `_load_glossary` reads this file. Entries are alphabetical; each
`**TERM**` heading is what the scanner matches, so keep new entries in that
exact bold form.

- **AA** — the WCAG conformance level this site targets (see **WCAG**), the
  mid tier of that standard's three-level scale.
- **BP** — Lighthouse's "Best Practices" audit category, one of the four
  scores tracked in the quality bar alongside Performance, Accessibility
  and SEO.
- **CA** — certificate authority. Used here for the local Python install's
  missing CA certificate bundle, which breaks TLS verification in
  `tools/deploy.py` (see `docs/DEPLOY.md`).
- **CBD** — central business district. Used as a reference point (Wellington
  CBD) when describing distance-ranking behaviour.
- **CDN** — content delivery network. The site has no CDN dependency in the
  shipped artefact; where a host's own CDN appears, it is the hosting
  platform's edge network, not a third party the site depends on.
- **CDP** — Chrome DevTools Protocol. Used by this repo's dev tooling
  (`tools/device_check.mjs`) to drive real headless Chrome for live-safety
  checks, via Node's built-in WebSocket client rather than a package.
- **CMS** — content management system. This repo treats git itself as the
  CMS for restaurant data: history, review and rollback come for free from
  version control, with no database or admin UI.
- **CNAME** — a DNS record type ("canonical name") that points one domain
  at another. Relevant to attaching `lets-eat.myspot.nz` to Cloudflare
  Pages (see `docs/DEPLOY.md`).
- **CSP** — Content Security Policy, an HTTP header that restricts what a
  page may load or connect to. Raised here for a proposed `connect-src`
  relaxation to allow the Nominatim/OSM lookup (see **OSM**).
- **CSRF** — cross-site request forgery, an attack where a third-party site
  tricks a browser into making an unwanted request. Named in
  `SECURITY.md` as out of scope because the site has no session/login
  surface for it to target.
- **D1** — an atelier doctrine reference (`atelier D1`), not the Cloudflare
  D1 database product; it cites a specific ruling in atelier's own
  numbering (see `docs/decisions/0022-publish-safety-review.md`). Meaning
  beyond "a citation into atelier's doctrine" is not established in-repo.
- **DOM** — Document Object Model, the browser's live in-memory tree of a
  page. Used here to describe code structured to be testable without one
  (e.g. "DOM-free" model code) and to describe visual stacking order.
- **DRY** — "don't repeat yourself", the software principle used here to
  justify trimming a fact to one repo-local source rather than restating
  it (an owner ruling in `docs/MODEL-ECONOMICS.md`).
- **ES** — ECMAScript, the language standard behind JavaScript. This repo's
  hard constraint is vanilla ES-module JavaScript — native `import`/
  `export`, no bundler, no framework.
- **ETA** — estimated time of arrival, as returned by a driving-directions
  handoff (e.g. the address-tap-to-directions flow).
- **EXIF** — Exchangeable Image File Format, the metadata block a camera or
  phone embeds in a photo (timestamp, GPS). This repo reads EXIF fields
  such as `DateTimeOriginal` during menu-photo intake for provenance.
- **FAB** — floating action button, a circular button pinned above page
  content. Used here for the shuffle action (🎲) and the injected order
  action.
- **GF** — gluten-free, one of the dietary-filter chip values shown alongside
  vegetarian, vegan and dairy-free.
- **GPS** — Global Positioning System. This repo reads GPS coordinates from
  photo EXIF data as one signal (not the only one) for sorting intake
  photos by venue.
- **JS** — JavaScript, this site's only scripting language (see **ES**;
  the shipped code is vanilla ES-module JS with no build step).
- **KV** — Cloudflare Workers KV, a key-value store. Proposed (ADR 0017)
  as the backing store for one E2E-encrypted sync blob per user, behind a
  Cloudflare Worker.
- **LAN** — local area network. Raised and rejected as a sync transport
  (WebRTC data channels over the LAN) in `docs/decisions/
  0009-group-orders-share-urls-not-connections.md`.
- **MFA** — multi-factor authentication. Named as one axis of credential
  hardening not yet assessed for the estate's shared accounts (ADR 0026).
- **OIDC** — OpenID Connect, a "Sign in with Google/Apple" style identity
  protocol. Considered and rejected for cross-device sync because it
  proves identity but does not supply the encryption key sync needs.
- **OSM** — OpenStreetMap. Paired with the Nominatim address-lookup
  service as the chosen provider for destination search, chosen for
  needing no API key.
- **PAT** — a GitHub Personal Access Token. This repo's PAT is tracked as
  a credential to refresh (currently classic-scoped and broader than
  needed; see `docs/decisions/0026-pat-prerequisite-discharged.md`).
- **PII** — personally identifiable information. The standing constraint
  is none, anywhere in the shipped site, with the one owner-approved
  recipe-attribution exception in `CLAUDE.md`.
- **POI** — point of interest. Used when a street-address search returns
  no matching POI in the OSM/Nominatim data (see **OSM**).
- **PRF** — the WebAuthn PRF (pseudo-random function) extension, which
  lets a passkey derive a stable secret on-device. Chosen as the
  preferred way to derive the end-to-end sync key with no server-held
  secret.
- **PWA** — Progressive Web App. This site installs as one: manifest,
  icons, offline-capable service worker (see **SW**).
- **QR** — Quick Response code. Used here as a zero-dependency, self-hosted
  encoder (`site/js/qr.js`) for sharing group orders and sync codes
  without a server round-trip.
- **R2** — Cloudflare R2, an object-storage product. Raised as the storage
  target if photo uploads move server-side, traded off against the added
  serverless code and spam-guard cost.
- **S3** — AWS Simple Storage Service (Amazon's object storage). Named as
  the host-agnostic fallback if the site ever needed to leave Cloudflare
  Pages, fronted by CloudFront for HTTPS.
- **SEO** — search engine optimisation, one of the four Lighthouse
  categories in the quality bar.
- **SLSA** — Supply-chain Levels for Software Artifacts, its official name <!-- spellscan:allow: official framework name, not house prose -->
  (US spelling as published). A framework for build provenance/attestation,
  noted as not applicable today because Cloudflare Pages does not expose a
  build-provenance mechanism to hook into.
- **SPA** — single-page application. Named as a rejected alternative
  architecture (a framework like React, Vue or Svelte) in ADR 0001, ruled
  out by the zero-build-step constraint.
- **SW** — service worker, the browser API this site's offline support and
  install-to-PWA behaviour are built on (see **PWA**).
- **TTS** — text-to-speech. Planned for the Cook Mode recipe screen
  (reading steps aloud alongside checklists and scaling).
- **WCAG** — Web Content Accessibility Guidelines. This site targets WCAG
  2.2 at level **AA**.
- **WGS84** — World Geodetic System 1984, the coordinate reference frame
  behind ordinary `lat`/`lng` decimal-degree pairs. Named explicitly on
  venue records so a future reader knows which frame the numbers use.
- **XS** — the smallest effort size in `ROADMAP.md`'s legend (XS/S/M/L),
  for an item that is one edit or one fact. Sits below **S**.
