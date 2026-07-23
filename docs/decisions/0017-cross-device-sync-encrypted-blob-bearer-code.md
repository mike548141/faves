# 0017 — Cross-device sync: E2E-encrypted blob, bearer sync-code, no accounts

**Status**: accepted
**Date**: 2026-07-23

## Context

The same person wants their hearts, ratings, and settings on more than
one device — phone and iPad, phone and laptop. Today the personal layer
(`favourites.js`, `ratings.js`, `cart.js`, profile settings) is
`localStorage` only, so it is per-device by construction. The web
platform never syncs `localStorage`/`IndexedDB` across devices, and
iCloud's sync (CloudKit) is a native-app capability a web page cannot
reach without an Apple Developer account, an app container, and
server-to-server tokens — i.e. backend/config infra, Apple-account-bound.

ADR 0012 (device-local profiles) parked this: *"Cross-device sync stays
out of scope — the same person's hearts syncing across different devices
needs an account + backend… That belongs to a separate signed-in app
(the health app, Theme 6)."* ADR 0009 softened the no-backend stance
from *never* to *not yet*, and required a dedicated ADR before any
backend item unblocks. This is that ADR — and it finds the "needs an
account" half of 0012's stance to be wrong: continual sync is reachable
*without* accounts.

The owner steered (2026-07-23): willing to allow a backend and, if
warranted, accounts, given enough value at manageable cost — "which I
do" (for sync). Absolute requirement: **no way for Cloudflare or the
owner to read a user's data** — off-device data must be end-to-end
encrypted.

## Decision

Ship in two stages; the first needs zero infra and is the foundation for
the second.

**v1 — shareable-link seed (no backend).** Reuse the existing share
codec (`share-codec.js`) and `favourites.merge()` to encode a person's
hearts+settings into a link/QR they open on a second device to seed it.
Manual, one-shot, offline — a portable payload, not sync.

**v2 — continual sync via a Cloudflare Worker + Workers KV.** A tiny
Worker reads/writes **one end-to-end-encrypted blob per user** in KV.
The design rules, each load-bearing:

- **Continual bidirectional sync, not a one-off migrate.** Every device
  keeps its local copy (offline-first, unchanged). On change it pushes a
  **debounced** write (batch a flurry of hearts/ratings into one write on
  a **5–30 s** idle/blur window — never one write per tap); on
  open/foreground it pulls and **merges client-side**. The KV blob is the
  shared mirror, not the system of record.
- **Bearer sync-code, no accounts.** The key is a **machine-generated
  high-entropy code** (~44+ bits, rendered as friendly word-codes),
  exchanged device→device by **QR *or* word-code**. Whoever holds the code
  can read/write that blob — a bearer capability, not an identity. No
  email, no password, no account record, no PII.
- **End-to-end encrypted; the server is a dumb ciphertext store.** The
  blob is encrypted client-side (`crypto.subtle`) with a key derived from
  the sync code. Cloudflare and the owner store and see only ciphertext —
  the honesty requirement is met by construction, and because the server
  can't read the blob, **all merge logic is client-side** (union for
  additive sets like hearts; last-write-wins per scalar setting; a
  read-merge-write on push to avoid a stale device clobbering a newer one).
- **Ethos formally softened.** The "no backend / no accounts" non-goal is
  updated: a **serverless backend is now permitted** (this ADR is the
  gate ADR 0009 required); **accounts are deliberately *not* adopted** —
  the sync-code delivers the value without identity, and keeps the public
  "no accounts" promise (About screen) literally true. Accounts remain a
  *permitted future option* under a later ADR only if a feature genuinely
  needs identity (recovery, named cross-person sharing).

## Rejected

- **iCloud / CloudKit sync** — not reachable from a web app; CloudKit JS
  needs an Apple Developer account + container + tokens (backend infra,
  Apple-locked), and web storage is never OS-synced. Native-only.
- **Accounts / sign-in** — unnecessary given the bearer sync-code, and
  they add a liability (PII, auth, recovery, moderation surface) and break
  the "no accounts" promise for no gain: under E2E the server can't
  personalise on the data anyway. Deferred to a future ADR if ever needed.
- **User-chosen passphrase as the key** — low entropy → KV keys become
  enumerable, exposing strangers' (albeit encrypted) blobs and inviting
  offline attack. A system-generated high-entropy code is friendly *and*
  unguessable.
- **Server-side merge / plaintext blob** — impossible under the E2E
  requirement and pointless: merge is cheap client-side. Rejected on the
  honesty requirement, not just cost.
- **Write-on-every-change** — writes are the one scarce KV resource
  (1k/day free); a debounce costs nothing and removes the ceiling. The
  5–30 s window is the accepted trade between write cost and data-loss
  exposure on an unexpected close.
- **A separate signed-in app as the *only* path to sync** (ADR 0012's
  parked stance) — superseded: sync does not require accounts, so it need
  not wait for the Theme 6 health app. The health app remains its own
  project for *personal/health* data; it simply loses "owns identity/sync"
  as its justification.

## Consequences

- **Supersedes** the cross-device-sync consequence of ADR 0012 (the
  "out of scope / needs an account + separate app" line) — for sync only;
  0012's profiles design stands. Also discharges the "needs its own ADR"
  gate in ADR 0009 / the ROADMAP "no backend" note, for the sync case.
- **Cost ≈ $0.** Cloudflare's free tier (1 GB, 100k reads/day, **1k
  writes/day**) covers this at Faves' scale — blobs are a few KB, writes
  only on change. The only tight limit is writes, which the debounce
  keeps far below the cap. If it ever outgrows free, the Workers Paid
  floor is **$5/month** (10M reads + 1M writes) — a soft ceiling, not a
  bill cliff.
- **Public promises mostly hold.** "No accounts" and "no tracking" stay
  literally true; "no third-party scripts" stays true — the Worker is a
  same-origin backend endpoint, not a script in the page, and the shipped
  `site/` artifact stays zero-dependency (sync is runtime + optional, and
  degrades to local-only when offline or when the user never opts in).
- **On-device at-rest encryption is largely the platform's job — honest
  limit.** Off-device E2E fully meets the "no one but the user can read
  it" bar. But a web app *cannot* meaningfully encrypt its own
  `localStorage` at rest against someone holding the unlocked device: the
  decryption key must be usable by the page on load, or the user is
  prompted for the code every open (killing offline-instant UX). Real
  on-device protection is the OS full-disk encryption (iOS data
  protection, FileVault). A non-extractable `crypto.subtle` key in
  IndexedDB is defence-in-depth against raw-key exfiltration, not against
  device access. We will not overclaim on-device encryption.
- **Opt-in and disposable.** Sync is off until a user creates/enters a
  code; losing the code loses nothing (data lives on each device) — they
  mint a fresh one and re-seed. No recovery flow, no support burden.
- **Unblocks the backend fleet.** With a Worker + KV pattern established,
  the other backend-gated ROADMAP items (live group-order rooms, feedback
  intake, the Google-ratings edge proxy) revisit against a real precedent
  — each still its own decision.

## Addendum — 2026-07-23: claim mechanism (passkey + PRF preferred, code as fallback)

Owner follow-up: *would using the user's existing Google/Apple account
remove the need for the word-code/QR?* Refines the Decision above without
reversing it — the E2E store, no-OIDC-accounts, and bearer-code all stand;
this specifies **how a user claims their blob**, which is now **pluggable
over the one E2E store**.

The insight: the sync-code did **two** jobs — *claim* ("which blob is
mine") and *encryption key* (the E2E secret). A conventional **OIDC "Sign
in with Google/Apple"** replaces only *claim*; it authenticates but hands
over **no encryption secret**, so under our no-decrypt requirement it would
force either a server that can read the data (❌ breaks the requirement) or
a user passphrase (re-introduces a secret). OIDC therefore does **not**
remove the need for a user-held secret — **rejected** for this use.

**Passkey + WebAuthn PRF extension** does both jobs and is preferred:
- *Identity*: the passkey is the claim — sign in on device 2, matched.
- *E2E key*: the PRF extension derives a stable secret **on-device that the
  server never sees** — true E2E, no password, no code.
- *Cross-device*: the platform syncs the passkey — **iCloud Keychain**
  (Apple), Google Password Manager (Android/Chrome). This *is* "use their
  existing Apple/Google", at the credential layer.
- Cheaper/cleaner than OIDC: **no OAuth app registration** (your domain is
  the relying party), **no Apple Developer Program fee**, **no email/global
  identity collected** (domain-scoped, opaque) — so the "no accounts /
  nothing personal" posture stays largely intact.

Verified current (Q1 2026): Safari 18+ derives PRF from iCloud Keychain
passkeys; Chrome/Edge/Android solid; **Firefox** is the gap. For the
owner's all-Apple household it works today.

**Resulting build shape:** implement the **E2E blob store + client-side
merge claim-agnostic first**, then layer claim paths on the same store —
**passkey + PRF as the headline path**, **bearer sync-code as the universal
fallback** (Firefox, non-passkey devices, "just give me a code"). So the
answer to "account or code?" is *both, over one store*.

Honest caveat: passkey + PRF is a full WebAuthn ceremony (more code) and
needs platform passkey sync enabled — so the sync-code stays the *fastest*
thing to ship and the passkey path is the *nicest*, landing once verified
on the owner's real devices.
